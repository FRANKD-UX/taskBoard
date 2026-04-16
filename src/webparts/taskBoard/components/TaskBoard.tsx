import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import type { DropResult } from 'react-beautiful-dnd';

import type { ITaskBoardProps } from './ITaskBoardProps';
import BoardView from './BoardView';
import TaskPanel from './TaskPanel';
import TableView from './TableView';
import CalendarView from './CalendarView';
import ChartView from './ChartView';
import GanttView from './GanttView';
import type { Task, TaskStatus } from './TaskTypes';
import { TaskService } from '../../../services/TaskService';
import { getSP } from '../../../pnpjsConfig';
import { getUserRole } from '../../../services/UserRoleService';

type ViewKey = 'board' | 'table' | 'calendar' | 'gantt' | 'chart';

const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Fix network issue',
    status: 'InProgress',
    priority: 'High',
    assignedTo: 'Frank Ndlovu',
    dueDate: '2026-04-15',
    createdAt: '2026-04-01',
    requestType: 'Incident',
    department: 'IT',
    description: 'Intermittent WAN drop on branch edge router.',
    createdBy: 'Frank Ndlovu'
  },
  {
    id: '2',
    title: 'Update billing system',
    status: 'Backlog',
    priority: 'Medium',
    assignedTo: 'Jacobus Coetzee',
    dueDate: '2026-04-18',
    createdAt: '2026-04-02',
    requestType: 'Task',
    department: 'Finance',
    description: 'Apply tax rule updates for April release.',
    createdBy: 'Jacobus Coetzee'
  },
  {
    id: '3',
    title: 'Deploy new router config',
    status: 'Completed',
    priority: 'Low',
    assignedTo: 'Nhalnhla Mkhithi',
    dueDate: '2026-04-10',
    createdAt: '2026-04-03',
    requestType: 'Task',
    department: 'Operations',
    description: 'Roll out approved QoS profile to regional hubs.',
    createdBy: 'Nhalnhla Mkhithi'
  }
];

const taskStatuses: TaskStatus[] = ['Unassigned', 'Backlog', 'ThisWeek', 'InProgress', 'Completed'];

const toTaskStatus = (value?: string): TaskStatus => {
  if (value && taskStatuses.indexOf(value as TaskStatus) > -1) {
    return value as TaskStatus;
  }

  return 'Unassigned';
};

const viewTabs: Array<{ key: ViewKey; label: string }> = [
  { key: 'board', label: 'Board' },
  { key: 'table', label: 'Table' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'gantt', label: 'Gantt' },
  { key: 'chart', label: 'Chart' }
];

const groupTasksByStatus = (tasks: Task[]): Record<TaskStatus, Task[]> => {
  const grouped: Record<TaskStatus, Task[]> = {
    Unassigned: [],
    Backlog: [],
    ThisWeek: [],
    InProgress: [],
    Completed: []
  };

  tasks.forEach((task) => {
    if (taskStatuses.indexOf(task.status) > -1) {
      grouped[task.status].push(task);
    } else {
      grouped.Unassigned.push(task);
    }
  });

  return grouped;
};

const reorderTasksAfterDrag = (items: Task[], result: DropResult): Task[] => {
  const { source, destination } = result;

  if (!destination) {
    return items;
  }

  const sourceStatus = source.droppableId as TaskStatus;
  const destinationStatus = destination.droppableId as TaskStatus;

  if (
    taskStatuses.indexOf(sourceStatus) === -1 ||
    taskStatuses.indexOf(destinationStatus) === -1 ||
    (sourceStatus === destinationStatus && source.index === destination.index)
  ) {
    return items;
  }

  const grouped = groupTasksByStatus(items);
  const sourceTasks = grouped[sourceStatus].slice();
  const destinationTasks = sourceStatus === destinationStatus ? sourceTasks : grouped[destinationStatus].slice();

  const [movedTask] = sourceTasks.splice(source.index, 1);
  if (!movedTask) {
    return items;
  }

  destinationTasks.splice(destination.index, 0, {
    ...movedTask,
    status: destinationStatus
  });

  grouped[sourceStatus] = sourceTasks;
  grouped[destinationStatus] = destinationTasks;

  return taskStatuses.reduce<Task[]>((acc, status) => {
    return acc.concat(grouped[status]);
  }, []);
};

const TaskBoard: React.FC<ITaskBoardProps> = (): React.ReactElement => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ViewKey>('board');
  const [displayedView, setDisplayedView] = useState<ViewKey>('board');
  const [isViewVisible, setIsViewVisible] = useState<boolean>(true);
  const [hoveredTab, setHoveredTab] = useState<ViewKey | null>(null);
  const [canAssign, setCanAssign] = useState<boolean>(false);
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<number | undefined>(undefined);

  useEffect(() => {
    const loadTasks = async (): Promise<void> => {
      const service = new TaskService();
      const sp = getSP();
      const currentUser = await sp.web.currentUser();
      setCurrentUserName(currentUser.Title || currentUser.Email || '');
      setCurrentUserId(currentUser.Id);
      const roleData = await getUserRole(currentUser.Email);
      console.log('CURRENT USER:', currentUser);
      console.log('ROLE DATA:', roleData);
      const hasAssignPermission = roleData?.canAssign === true;
      setCanAssign(hasAssignPermission);

      const loadedTasks = await service.getTasks();
      console.log('TASK DATA:', loadedTasks);

      (window as any).taskBoardDebug = {
        currentUser,
        roleData,
        loadedTasks,
        canAssign: hasAssignPermission,
        loadError: null
      };

      setTasks(
        loadedTasks.map((task) => ({
          id: task.id.toString(),
          title: task.title || 'Untitled Task',
          status: toTaskStatus(task.status),
          priority: task.priority === 'High' || task.priority === 'Low' ? task.priority : 'Medium',
          assignedTo: task.assignedTo || '',
          assignedToId: task.assignedToId,
          dueDate: task.dueDate || '',
          createdAt: task.startDate || new Date().toISOString(),
          requestType: task.requestType || 'Task',
          department: task.department || 'IT',
          description: task.description || '',
          createdBy: currentUser.Title || currentUser.Email || ''
        }))
      );
    };

    loadTasks().catch((error) => {
      console.error('Failed to load tasks from SharePoint.', error);
      (window as any).taskBoardDebug = {
        loadError: error,
        loadedTasks: [],
        fallbackTasks: mockTasks,
        canAssign: false
      };
      setTasks(mockTasks);
    });
  }, []);

  useEffect(() => {
    console.log('TASK DATA:', tasks);
  }, [tasks]);

  useEffect(() => {
    (window as any).taskBoardDebug = {
      ...(window as any).taskBoardDebug,
      tasks,
      canAssign,
      selectedTaskId
    };
  }, [tasks, canAssign, selectedTaskId]);

  useEffect(() => {
    if (activeView === displayedView) {
      return;
    }

    setIsViewVisible(false);
    const timeout = setTimeout(() => {
      setDisplayedView(activeView);
      setIsViewVisible(true);
    }, 120);

    return () => clearTimeout(timeout);
  }, [activeView, displayedView]);

  const selectedTask = useMemo<Task | null>(() => {
    if (selectedTaskId === null) {
      return null;
    }

    return tasks.find((task) => task.id === selectedTaskId) || null;
  }, [selectedTaskId, tasks]);

  const handleDragEnd = async (result: DropResult): Promise<void> => {
  const { source, destination, draggableId } = result;

  if (!destination) return;

  const newStatus = destination.droppableId as TaskStatus;

  try {
    const service = new TaskService();

    // Persist to SharePoint FIRST
    await service.updateTask(Number(draggableId), {
      status: newStatus
    });

    // Then update UI
    setTasks((currentTasks) =>
      reorderTasksAfterDrag(currentTasks, result)
    );

  } catch (error) {
    console.error("DRAG UPDATE FAILED:", error);
  }
};

  const updateTask = async (id: string, updates: Partial<Task>): Promise<void> => {
  try {
    const service = new TaskService();

    const safeUpdates: Partial<Task> = { ...updates };

    // Enforce permissions
    if (!canAssign && safeUpdates.assignedTo !== undefined) {
      delete safeUpdates.assignedTo;
    }

    if (!canAssign && safeUpdates.assignedToId !== undefined) {
      delete safeUpdates.assignedToId;
    }

    //Persist to SharePoint
    await service.updateTask(Number(id), {
      title: safeUpdates.title,
      status: safeUpdates.status,
      priority: safeUpdates.priority,
      assignedToId: safeUpdates.assignedToId,
      dueDate: safeUpdates.dueDate,
      description: safeUpdates.description,
      requestType: safeUpdates.requestType,
      department: safeUpdates.department
    });

    // Then update UI
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === id ? { ...task, ...safeUpdates } : task
      )
    );

  } catch (error) {
    console.error("UPDATE TASK FAILED:", error);
  }
};

    const createTask = async (task: Task): Promise<Task | null> => {
  try {
    const service = new TaskService();

    const defaultAssignee = currentUserName || task.assignedTo || '';

    const payload = {
      ...task,
      assignedTo:
        !canAssign
          ? defaultAssignee
          : task.requestType === 'Incident'
          ? defaultAssignee
          : task.assignedTo,
      assignedToId:
        !canAssign
          ? currentUserId
          : task.requestType === 'Incident'
          ? currentUserId
          : task.assignedToId,
      requestType: task.requestType || 'Task',
      department: task.department || 'IT',
      description: task.description || '',
      createdBy: task.createdBy || currentUserName
    };

    // SAVE TO SHAREPOINT
    const created = await service.createTask(payload);
    if (!created) {
       console.error("Create returned null — stopping UI update");
       return null;
    }
    // MAP RESPONSE BACK TO UI MODEL
    const newTask: Task = {
      id: created.id.toString(),
      title: created.title || 'Untitled Task',
      status: toTaskStatus(created.status),
      priority:
        created.priority === 'High' || created.priority === 'Low'
          ? created.priority
          : 'Medium',
      assignedTo: created.assignedTo || '',
      assignedToId: created.assignedToId,
      dueDate: created.dueDate || '',
      createdAt: created.startDate || new Date().toISOString(),
      requestType: created.requestType || 'Task',
      department: created.department || 'IT',
      description: created.description || '',
      createdBy: created.createdBy || currentUserName
    };

    // UPDATE STATE WITH REAL DATA
    setTasks((current) => current.concat(newTask));

    return newTask;
  } catch (error) {
    console.error('CREATE TASK FAILED:', error);
    return null;
  }
};

  const deleteTask = async (id: string): Promise<void> => {
  try {
    const service = new TaskService();

    await service.deleteTask(Number(id)); // 🔥 convert string → number

    setTasks((currentTasks) =>
      currentTasks.filter((task) => task.id !== id)
    );
  } catch (error) {
    console.error("DELETE TASK FAILED:", error);
  }
};

  const handleTaskClick = (taskId: string): void => {
    setSelectedTaskId(taskId);
  };
  
  const handleClosePanel = (): void => {
    setSelectedTaskId(null);
  };

  const renderPlaceholderView = (label: string): React.ReactElement => {
    return (
      <div
        style={{
          width: '100%',
          padding: '20px 16px',
          color: '#e2e8f0',
          backgroundColor: '#171c33'
        }}
      >
        {label} view coming soon.
      </div>
    );
  };

  const renderActiveView = (view: ViewKey): React.ReactElement => {
    if (view === 'board') {
      return <BoardView tasks={tasks} statuses={taskStatuses} onTaskClick={handleTaskClick} createTask={createTask} />;
    }

    if (view === 'table') {
      return <TableView tasks={tasks} statuses={taskStatuses} updateTask={updateTask} deleteTask={deleteTask} canAssign={canAssign} />;
    }

    if (view === 'calendar') {
      return <CalendarView tasks={tasks} onTaskClick={handleTaskClick} />;
    }

    if (view === 'gantt') {
      return <GanttView tasks={tasks} statuses={taskStatuses} onTaskClick={handleTaskClick} />;
    }

    return <ChartView tasks={tasks} statuses={taskStatuses} />;
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div style={{ width: '100%', backgroundColor: '#171c33' }}>
        <div style={{ display: 'flex', gap: '8px', padding: '12px 16px 0 16px' }}>
          {viewTabs.map((tab) => (
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
                transform: hoveredTab === tab.key ? 'translateY(-1px)' : 'translateY(0)'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          style={{
            transition: 'opacity 180ms ease, transform 180ms ease',
            opacity: isViewVisible ? 1 : 0,
            transform: isViewVisible ? 'translateY(0)' : 'translateY(4px)'
          }}
        >
          {renderActiveView(displayedView)}
        </div>
      </div>

      <TaskPanel selectedTask={selectedTask} onClose={handleClosePanel} updateTask={updateTask} deleteTask={deleteTask} canAssign={canAssign} />
    </DragDropContext>
  );
};

export default TaskBoard;
