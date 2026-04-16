import * as React from 'react';
import { useMemo, useState } from 'react';

import type { Task, TaskStatus } from './TaskTypes';

export interface ICalendarViewProps {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
}

const weekDays: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getStatusColor = (status: TaskStatus): string => {
  switch (status) {
    case 'Unassigned':
      return '#6b7280';
    case 'Backlog':
      return '#7c3aed';
    case 'ThisWeek':
      return '#0ea5e9';
    case 'InProgress':
      return '#f59e0b';
    case 'Completed':
      return '#22c55e';
    default:
      return '#6b7280';
  }
};

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeTaskDueDateKey = (value: string): string | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return formatDateKey(parsed);
  }

  const dateOnly = value.split('T')[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(dateOnly) ? dateOnly : null;
};

const CalendarView: React.FC<ICalendarViewProps> = ({ tasks, onTaskClick }): React.ReactElement => {
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const todayKey = formatDateKey(today);

  const tasksByDate = useMemo<Record<string, Task[]>>(() => {
    return tasks.reduce<Record<string, Task[]>>((grouped, task) => {
      if (!task.dueDate) {
        return grouped;
      }

      const dueDateKey = normalizeTaskDueDateKey(task.dueDate);
      if (!dueDateKey) {
        return grouped;
      }

      if (!grouped[dueDateKey]) {
        grouped[dueDateKey] = [];
      }

      grouped[dueDateKey].push(task);
      return grouped;
    }, {});
  }, [tasks]);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const monthLabel = new Date(currentYear, currentMonth, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric'
  });

  const cells = Array.from({ length: 42 }, (_, index) => {
    const dayNumber = index - firstDayIndex + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) {
      return null;
    }

    const dateKey = formatDateKey(new Date(currentYear, currentMonth, dayNumber));
    const dayTasks = tasksByDate[dateKey] || [];
    const isToday = dateKey === todayKey;

    return (
      <div
        key={dateKey}
        style={{
          minHeight: '132px',
          backgroundColor: '#1f2a44',
          border: isToday ? '1px solid #60a5fa' : '1px solid #334155',
          borderRadius: '8px',
          padding: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: isToday ? '0 0 0 1px rgba(96, 165, 250, 0.25)' : 'none'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#f8fafc', fontSize: '12px', fontWeight: isToday ? 700 : 600 }}>{dayNumber}</span>
          <span
            style={{
              color: '#e2e8f0',
              backgroundColor: '#334155',
              borderRadius: '999px',
              padding: '2px 7px',
              fontSize: '11px',
              lineHeight: 1.2
            }}
          >
            {dayTasks.length}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {dayTasks.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => onTaskClick(task.id)}
              onMouseEnter={() => setHoveredTaskId(task.id)}
              onMouseLeave={() => setHoveredTaskId(null)}
              style={{
                backgroundColor: getStatusColor(task.status),
                border: 'none',
                borderRadius: '6px',
                color: '#f8fafc',
                fontSize: '11px',
                textAlign: 'left',
                padding: '5px 7px',
                cursor: 'pointer',
                opacity: hoveredTaskId === task.id ? 1 : 0.92,
                filter: hoveredTaskId === task.id ? 'brightness(1.08)' : 'none',
                transition: 'filter 120ms ease, opacity 120ms ease'
              }}
            >
              {task.title}
            </button>
          ))}
        </div>
      </div>
    );
  });

  return (
    <div style={{ padding: '16px', backgroundColor: '#171c33' }}>
      <div style={{ color: '#f8fafc', marginBottom: '12px', fontWeight: 700 }}>{monthLabel}</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '10px', marginBottom: '10px' }}>
        {weekDays.map((day) => (
          <div key={day} style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center', fontWeight: 600 }}>
            {day}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '10px' }}>{cells}</div>
    </div>
  );
};

export default CalendarView;
