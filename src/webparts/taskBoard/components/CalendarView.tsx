// CalendarView.tsx
import * as React from 'react';
import { useMemo, useState } from 'react';

import type { Task, TaskStatus } from './TaskTypes';
import { THEME } from './theme';

export interface ICalendarViewProps {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
}

const weekDays: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeTaskDueDateKey = (value: string): string | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return formatDateKey(parsed);
  const dateOnly = value.split('T')[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(dateOnly) ? dateOnly : null;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CalendarView: React.FC<ICalendarViewProps> = ({ tasks, onTaskClick }): React.ReactElement => {
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const todayKey = formatDateKey(today);

  const tasksByDate = useMemo<Record<string, Task[]>>(() => {
    return tasks.reduce<Record<string, Task[]>>((grouped, task) => {
      if (!task.dueDate) return grouped;
      const dueDateKey = normalizeTaskDueDateKey(task.dueDate);
      if (!dueDateKey) return grouped;
      if (!grouped[dueDateKey]) grouped[dueDateKey] = [];
      grouped[dueDateKey].push(task);
      return grouped;
    }, {});
  }, [tasks]);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const monthLabel = new Date(currentYear, currentMonth, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const cells = Array.from({ length: 42 }, (_, index) => {
    const dayNumber = index - firstDayIndex + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) return null;

    const dateKey = formatDateKey(new Date(currentYear, currentMonth, dayNumber));
    const dayTasks = tasksByDate[dateKey] || [];
    const isToday = dateKey === todayKey;

    return (
      <div
        key={dateKey}
        style={{
          minHeight: '132px',
          backgroundColor: isToday ? THEME.colors.primarySoft : THEME.colors.panel,
          border: isToday ? `1px solid ${THEME.colors.primary}` : `1px solid ${THEME.colors.border}`,
          borderRadius: '8px',
          padding: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: isToday ? `0 0 0 1px ${THEME.colors.primary}40` : 'none',
        }}
      >
        {/* Day number + task count badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span
            style={{
              color: isToday ? THEME.colors.primary : THEME.colors.textStrong,
              fontSize: '12px',
              fontWeight: isToday ? 700 : 600,
            }}
          >
            {dayNumber}
          </span>
          <span
            style={{
              color: THEME.colors.textSecondary,
              backgroundColor: THEME.colors.background,
              border: `1px solid ${THEME.colors.border}`,
              borderRadius: '999px',
              padding: '2px 7px',
              fontSize: '11px',
              lineHeight: 1.2,
            }}
          >
            {dayTasks.length}
          </span>
        </div>

        {/* Task pills */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {dayTasks.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => onTaskClick(task.id)}
              onMouseEnter={() => setHoveredTaskId(task.id)}
              onMouseLeave={() => setHoveredTaskId(null)}
              style={{
                backgroundColor: THEME.statusColors[task.status as TaskStatus] ?? THEME.statusColors.Unassigned,
                border: 'none',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '11px',
                textAlign: 'left',
                padding: '5px 7px',
                cursor: 'pointer',
                opacity: hoveredTaskId === task.id ? 1 : 0.88,
                filter: hoveredTaskId === task.id ? 'brightness(1.08)' : 'none',
                transition: 'filter 120ms ease, opacity 120ms ease',
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
    <div style={{ padding: '16px', backgroundColor: THEME.colors.background }}>

      {/* Month label */}
      <div style={{ color: THEME.colors.textStrong, marginBottom: '12px', fontWeight: 700 }}>
        {monthLabel}
      </div>

      {/* Weekday headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gap: '10px',
          marginBottom: '10px',
        }}
      >
        {weekDays.map((day) => (
          <div
            key={day}
            style={{
              color: THEME.colors.textSecondary,
              fontSize: '12px',
              textAlign: 'center',
              fontWeight: 600,
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Day cells grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gap: '10px',
        }}
      >
        {cells}
      </div>
    </div>
  );
};

export default CalendarView;