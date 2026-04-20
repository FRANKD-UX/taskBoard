import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import type { DropResult } from 'react-beautiful-dnd';

import type { ITaskBoardProps } from './ITaskBoardProps';
import BoardView from './BoardView';
import TaskModal from './TaskModal';
import TableView from './TableView';
import CalendarView from './CalendarView';
import ChartView from './ChartView';
import GanttView from './GanttView';
import type { Task, TaskStatus } from './TaskTypes';
import { TaskService } from '../../../services/TaskService';
import { getSP } from '../../../pnpjsConfig';
import { getUserRole } from '../../../services/UserRoleService';


// Types


type ViewKey = 'board' | 'table' | 'calendar' | 'gantt' | 'chart';


// Constants


const TEMP_ID_PREFIX = 'temp_';

const TASK_STATUSES: TaskStatus[] = ['Unassigned', 'Backlog', 'ThisWeek', 'InProgress', 'Completed'];

const VIEW_TABS: Array<{ key: ViewKey; label: string }> = [
  { key: 'board',    label: 'Board'    },
  { key: 'table',   label: 'Table'    },
  { key: 'calendar',label: 'Calendar' },
  { key: 'gantt',   label: 'Gantt'    },
  { key: 'chart',   label: 'Chart'    },
];


// Pure helpers


const toTaskStatus = (value?: string): TaskStatus => {
  if (value && TASK_STATUSES.indexOf(value as TaskStatus) > -1) {
    return value as TaskStatus;
  }
  return 'Unassigned';
};

const getTodayIso = (): string => {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
};

const groupTasksByStatus = (tasks: Task[]): Record<TaskStatus, Task[]> => {
  const grouped: Record<TaskStatus, Task[]> = {
    Unassigned: [], Backlog: [], ThisWeek: [], InProgress: [], Completed: [],
  };
  tasks.forEach((task) => {
    if (TASK_STATUSES.indexOf(task.status) > -1) {
      grouped[task.status].push(task);
    } else {
      grouped.Unassigned.push(task);
    }
  });
  return grouped;
};

const reorderTasksAfterDrag = (tasks: Task[], result: DropResult): Task[] => {
  const { source, destination } = result;
  if (!destination) return tasks;

  const srcStatus = source.droppableId as TaskStatus;
  const dstStatus = destination.droppableId as TaskStatus;

  if (
    TASK_STATUSES.indexOf(srcStatus) === -1 ||
    TASK_STATUSES.indexOf(dstStatus) === -1 ||
    (srcStatus === dstStatus && source.index === destination.index)
  ) {
    return tasks;
  }

  const grouped = groupTasksByStatus(tasks);
  const srcTasks = grouped[srcStatus].slice();
  const dstTasks = srcStatus === dstStatus ? srcTasks : grouped[dstStatus].slice();

  const [moved] = srcTasks.splice(source.index, 1);
  if (!moved) return tasks;

  dstTasks.splice(destination.index, 0, { ...moved, status: dstStatus });
  grouped[srcStatus] = srcTasks;
  grouped[dstStatus] = dstTasks;

  return TASK_STATUSES.reduce<Task[]>((acc, s) => acc.concat(grouped[s]), []);
};

const resolveSharePointUserId = async (email: string, loginName: string): Promise<number | null> => {
  const sp = getSP();

  const normalizedEmail = (email || '').trim();
  const normalizedLoginName = (loginName || '').trim();
  const tryEnsure = async (value: string): Promise<number | null> => {
    if (!value) {
      return null;
    }

    try {
      const ensured = await sp.web.ensureUser(value);
      const ensuredAny = ensured as any;
      return ensuredAny?.Id ?? ensuredAny?.data?.Id ?? null;
    } catch {
      return null;
    }
  };

  if (normalizedEmail) {
    try {
      const user = await sp.web.siteUsers.getByEmail(normalizedEmail)();
      if (user?.Id) return user.Id;
    } catch { /* fall through to loginName */ }

    const claimId = await tryEnsure(`i:0#.f|membership|${normalizedEmail}`);
    if (claimId) return claimId;
  }

  if (normalizedLoginName) {
    const ensuredLoginId = await tryEnsure(normalizedLoginName);
    if (ensuredLoginId) return ensuredLoginId;

    const lower = normalizedLoginName.toLowerCase();
    if (lower.indexOf('@') > -1 && lower.indexOf('|') === -1) {
      const claimId = await tryEnsure(`i:0#.f|membership|${normalizedLoginName}`);
      if (claimId) return claimId;
    }

    const maybeEmail = lower.indexOf('|') > -1 ? normalizedLoginName.split('|').pop()?.trim() || '' : '';
    if (maybeEmail) {
      try {
        const user = await sp.web.siteUsers.getByEmail(maybeEmail)();
        if (user?.Id) return user.Id;
      } catch { /* no-op */ }
    }
  }

  return null;
};


// Component


const TaskBoard: React.FC<ITaskBoardProps> = ({ context }): React.ReactElement => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [modalTask, setModalTask] = useState<Task | null>(null);
  const [activeView, setActiveView] = useState<ViewKey>('board');
  const [displayedView, setDisplayedView] = useState<ViewKey>('board');
  const [isViewVisible, setIsViewVisible] = useState<boolean>(true);
  const [hoveredTab, setHoveredTab] = useState<ViewKey | null>(null);
  const [canAssign, setCanAssign] = useState<boolean>(false);
  const [canAssignAcrossDepartments, setCanAssignAcrossDepartments] = useState<boolean>(false);
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const taskService = useMemo(() => new TaskService(), []);

  // Make the SPFx context available on window so PeoplePicker's
  // getSPHttpClient() helper can reach it without prop-drilling.
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).spfxContext = context;
  }, [context]);

 
  // Initial data load
 

  useEffect(() => {
    const loadTasks = async (): Promise<void> => {
      try {
        setIsLoading(true);
        const sp = getSP();

          const user = await sp.web.currentUser();
          setCurrentUserName(user.Title || '');
          setCurrentUserEmail(user.Email || '');

          try {
              const role = await getUserRole(user.Email || '');
              setCanAssign(role?.canAssign === true);
              setCanAssignAcrossDepartments(role?.canAssignAcrossDepartments === true);
          } catch (roleError) {
              console.warn('TaskBoard: role lookup failed; continuing with read-only assignment mode', roleError);
              setCanAssign(false);
              setCanAssignAcrossDepartments(false);
          }

        const data = await taskService.getTasks();

        setTasks(
          data.map((t: any) => ({
            id: t.id.toString(),
            title: t.title,
            status: toTaskStatus(t.status),
            priority: t.priority,
            assignedTo: t.assignedTo,
            assignedToId: t.assignedToId,
            assignedToEmail: t.assignedToEmail,
            assignedToLoginName: t.assignedToLoginName,
            startDate: t.startDate,
            dueDate: t.dueDate,
            createdAt: new Date().toISOString(),
            requestType: t.requestType,
            department: t.department,
            description: t.description,
            createdBy: user.Title,
          }))
        );
      } catch (error) {
        console.error('TaskBoard: load failed', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTasks();
  }, [taskService]);

 
  // View transition fade
 

  useEffect(() => {
    if (activeView === displayedView) return;
    setIsViewVisible(false);
    const timer = setTimeout(() => {
      setDisplayedView(activeView);
      setIsViewVisible(true);
    }, 120);
    return () => clearTimeout(timer);
  }, [activeView, displayedView]);


  // Drag and drop


  const handleDragEnd = async (result: DropResult): Promise<void> => {
    const { destination, draggableId } = result;
    if (!destination) return;

    const newStatus = destination.droppableId as TaskStatus;
    try {
      await taskService.updateTask(Number(draggableId), { status: newStatus });
      setTasks((current) => reorderTasksAfterDrag(current, result));
    } catch (error) {
      console.error('TaskBoard: drag update failed', error);
    }
  };


  // Modal triggers
 

  /**
   * Opens the modal for an EXISTING task (card click, calendar click, etc.)
   */
  const handleTaskClick = (task: Task): void => {
    setModalTask(task);
  };

  /**
   * Opens the modal in NEW TASK mode.
   * We build a minimal temp Task so TaskModal gets a properly shaped object.
   */
  // Replace the existing handleNewTask function:
    const handleNewTask = (status: TaskStatus): void => {
    const today = getTodayIso();
    const draft: Task = {
        id: `${TEMP_ID_PREFIX}${Date.now()}`,
        title: '',
        status,
        priority: 'Medium',
        startDate: today,
        dueDate: undefined,
        createdAt: new Date().toISOString(),
        requestType: 'Task',
        department: 'IT',
        description: '',
        // If this user cannot assign tasks, default the assignee to themselves.
        // Managers/Owners/TeamLeads leave it blank so they can pick anyone.
        assignedTo: canAssign ? '' : currentUserName,
        assignedToEmail: canAssign ? undefined : currentUserEmail,
        createdBy: currentUserName,
    };
    setModalTask(draft);
};

  const handleCloseModal = (): void => {
    setModalTask(null);
  };

  
  // Save — handles both create and update via TaskModal's onSave prop
  

  const handleSaveTask = async (task: Task): Promise<Task | null> => {
    try {
        const isNew = task.id.startsWith(TEMP_ID_PREFIX);

        // Enforce self-assignment for users without assignment permission.
        // This runs on both create and update so the rule is airtight.
        const effectiveTask: Task = !canAssign
            ? {
                  ...task,
                  assignedTo: currentUserName,
                  assignedToEmail: currentUserEmail,
                  assignedToId: undefined,
                  assignedToLoginName: undefined,
              }
            : task;

        let finalAssigneeId: number | null = effectiveTask.assignedToId ?? null;
        let finalAssigneeName = effectiveTask.assignedTo || '';

        if (
            (!finalAssigneeId || finalAssigneeId <= 0) &&
            (effectiveTask.assignedToEmail || effectiveTask.assignedToLoginName)
        ) {
            const resolved = await resolveSharePointUserId(
                effectiveTask.assignedToEmail || '',
                effectiveTask.assignedToLoginName || ''
            );
            if (resolved) finalAssigneeId = resolved;
        }

        if (!finalAssigneeId || finalAssigneeId <= 0) {
            if (effectiveTask.assignedToEmail || effectiveTask.assignedToLoginName || effectiveTask.assignedTo) {
                const message = 'Could not resolve selected user to a SharePoint account. Select a valid user and try again.';
                console.warn('TaskBoard: could not resolve selected assignee to a SharePoint user ID.', {
                    email: effectiveTask.assignedToEmail,
                    loginName: effectiveTask.assignedToLoginName,
                    name: effectiveTask.assignedTo,
                });
                throw new Error(message);
            }
            finalAssigneeId = null;
            finalAssigneeName = '';
        }

        const normaliseDate = (value?: string): string => {
            if (!value) return '';
            if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
            const parsed = new Date(value);
            return isNaN(parsed.getTime()) ? '' : parsed.toISOString().split('T')[0];
        };

        const payload = {
            title: effectiveTask.title,
            status: effectiveTask.status,
            priority: effectiveTask.priority,
            assignedToId: finalAssigneeId,
            startDate: normaliseDate(effectiveTask.startDate) || getTodayIso(),
            dueDate: normaliseDate(effectiveTask.dueDate),
            description: effectiveTask.description || '',
            requestType: effectiveTask.requestType || 'Task',
            department: effectiveTask.department || 'IT',
        };

        if (isNew) {
            const created = await taskService.createTask(payload);

            const returnedId: string | undefined = created?.id != null
                ? created.id.toString()
                : undefined;

            if (!returnedId) {
                console.warn(
                    'TaskBoard: createTask response did not include an ID — ' +
                    'item was saved successfully. Reloading task list.',
                    created
                );

                const refreshed = await taskService.getTasks();
                setTasks(
                    refreshed.map((t: any) => ({
                        id: t.id.toString(),
                        title: t.title,
                        status: toTaskStatus(t.status),
                        priority: t.priority,
                        assignedTo: t.assignedTo,
                        assignedToId: t.assignedToId,
                        assignedToEmail: t.assignedToEmail,
                        assignedToLoginName: t.assignedToLoginName,
                        startDate: t.startDate,
                        dueDate: t.dueDate,
                        createdAt: new Date().toISOString(),
                        requestType: t.requestType,
                        department: t.department,
                        description: t.description,
                        createdBy: currentUserName,
                    }))
                );

                return { ...effectiveTask, id: `recovered_${Date.now()}` };
            }

            const persisted: Task = {
                ...effectiveTask,
                id: returnedId,
                assignedTo: finalAssigneeName,
                assignedToId: finalAssigneeId ?? undefined,
                startDate: payload.startDate,
                dueDate: payload.dueDate,
                createdBy: currentUserName,
            };

            setTasks((prev) => [...prev, persisted]);
            return persisted;

        } else {
            await taskService.updateTask(Number(effectiveTask.id), payload);

            const updated: Task = {
                ...effectiveTask,
                assignedTo: finalAssigneeName,
                assignedToId: finalAssigneeId ?? undefined,
                startDate: payload.startDate,
                dueDate: payload.dueDate,
            };

            setTasks((prev) => prev.map((t) => (t.id === effectiveTask.id ? updated : t)));
            return updated;
        }

    } catch (error) {
        console.error('TaskBoard: saveTask failed', error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Could not save task to SharePoint.');
    }
};


  // Delete
 

  const handleDeleteTask = async (id: string): Promise<void> => {
    try {
      if (!id.startsWith(TEMP_ID_PREFIX)) {
        await taskService.deleteTask(Number(id));
      }
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      console.error('TaskBoard: delete failed', error);
    }
  };


  // TableView still uses the old per-field updateTask signature — keep it
 

  const handleUpdateTask = (id: string, updates: Partial<Task>): void => {
    if (!canAssign && updates.assignedTo !== undefined) {
      const { assignedTo, assignedToId, assignedToEmail, assignedToLoginName, ...rest } = updates;
      updates = rest;
    }
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  // Render helpers


  const renderActiveView = (view: ViewKey): React.ReactElement => {
    if (isLoading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: '#f8fafc' }}>
          Loading tasks...
        </div>
      );
    }

    switch (view) {
      case 'board':
        return (
          <BoardView
            tasks={tasks}
            statuses={TASK_STATUSES}
            onTaskClick={handleTaskClick}
            onNewTask={handleNewTask}
          />
        );
      case 'table':
        return (
          <TableView
            tasks={tasks}
            statuses={TASK_STATUSES}
            updateTask={handleUpdateTask}
            deleteTask={handleDeleteTask}
            canAssign={canAssign}
          />
        );
      case 'calendar':
        return (
          <CalendarView
            tasks={tasks}
            onTaskClick={(id) => {
              const task = tasks.find((t) => t.id === id);
              if (task) handleTaskClick(task);
            }}
          />
        );
      case 'gantt':
        return (
          <GanttView
            tasks={tasks}
            statuses={TASK_STATUSES}
            onTaskClick={(id) => {
              const task = tasks.find((t) => t.id === id);
              if (task) handleTaskClick(task);
            }}
          />
        );
      case 'chart':
        return <ChartView tasks={tasks} statuses={TASK_STATUSES} />;
      default:
        return <></>;
    }
  };

 
  // Render
 

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div style={{ width: '100%', backgroundColor: '#171c33' }}>

        {/* View tab bar */}
        <div style={{ display: 'flex', gap: '8px', padding: '12px 16px 0 16px' }}>
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveView(tab.key)}
              onMouseEnter={() => setHoveredTab(tab.key)}
              onMouseLeave={() => setHoveredTab(null)}
              style={{
                backgroundColor: activeView === tab.key ? '#334155' : hoveredTab === tab.key ? '#27324f' : '#1f2a44',
                color: activeView === tab.key ? '#f8fafc' : '#e2e8f0',
                border: '1px solid #475569',
                borderRadius: '8px',
                padding: '8px 12px',
                cursor: 'pointer',
                fontWeight: activeView === tab.key ? 700 : 500,
                transition: 'background-color 160ms ease, color 160ms ease, transform 120ms ease',
                transform: hoveredTab === tab.key ? 'translateY(-1px)' : 'translateY(0)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* View content */}
        <div style={{
          transition: 'opacity 180ms ease, transform 180ms ease',
          opacity: isViewVisible ? 1 : 0,
          transform: isViewVisible ? 'translateY(0)' : 'translateY(4px)',
        }}>
          {renderActiveView(displayedView)}
        </div>
      </div>

      {/* Single unified modal for both create and edit */}
      <TaskModal
        task={modalTask}
        canAssign={canAssign}
        siteUrl={context.pageContext.web.absoluteUrl}
        currentUserName={currentUserName}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        onClose={handleCloseModal}
      />
    </DragDropContext>
  );
};

export default TaskBoard;
