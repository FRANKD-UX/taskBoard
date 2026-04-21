// GanttView.tsx
import * as React from 'react';
import { useMemo, useState } from 'react';

import type { Task, TaskStatus } from './TaskTypes';
import { THEME } from './theme';

export interface IGanttViewProps {
  tasks: Task[];
  statuses: TaskStatus[];
  onTaskClick?: (taskId: string) => void;
}

interface ITimelineTask {
  task: Task;
  status: TaskStatus;
  start: Date;
  end: Date;
}

// ---------------------------------------------------------------------------
// Pure date helpers
// ---------------------------------------------------------------------------

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const toUtcStartOfDay = (value: Date): Date =>
  new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));

const parseDate = (value?: string): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return toUtcStartOfDay(parsed);
};

const formatLabel = (value: Date): string =>
  value.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const GanttView: React.FC<IGanttViewProps> = ({ tasks, statuses, onTaskClick }): React.ReactElement => {
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);

  const timelineTasks = useMemo<ITimelineTask[]>(() => {
    return tasks
      .map((task) => {
        const end = parseDate(task.dueDate);
        if (!end) return null;

        const status = statuses.indexOf(task.status) > -1 ? task.status : 'Unassigned';
        const start = parseDate(task.createdAt) || new Date(end.getTime() - 3 * DAY_IN_MS);

        return {
          task,
          status,
          start: start <= end ? start : end,
          end,
        };
      })
      .filter((item): item is ITimelineTask => item !== null);
  }, [statuses, tasks]);

  const groupedByStatus = useMemo<Record<TaskStatus, ITimelineTask[]>>(() => {
    const grouped = statuses.reduce<Record<TaskStatus, ITimelineTask[]>>((acc, status) => {
      acc[status] = [];
      return acc;
    }, {} as Record<TaskStatus, ITimelineTask[]>);

    timelineTasks.forEach((item) => { grouped[item.status].push(item); });
    return grouped;
  }, [statuses, timelineTasks]);

  const timelineRange = useMemo(() => {
    if (timelineTasks.length === 0) {
      const today = toUtcStartOfDay(new Date());
      return { minDate: today, maxDate: new Date(today.getTime() + 14 * DAY_IN_MS) };
    }

    let min = timelineTasks[0].start;
    let max = timelineTasks[0].end;

    timelineTasks.forEach((item) => {
      if (item.start < min) min = item.start;
      if (item.end > max) max = item.end;
    });

    return { minDate: min, maxDate: max };
  }, [timelineTasks]);

  const totalDays = Math.max(
    1,
    Math.round((timelineRange.maxDate.getTime() - timelineRange.minDate.getTime()) / DAY_IN_MS) + 1
  );

  const ticks = useMemo<Date[]>(() => {
    const points: Date[] = [];
    const step = Math.max(1, Math.ceil(totalDays / 8));

    for (let index = 0; index < totalDays; index += step) {
      points.push(new Date(timelineRange.minDate.getTime() + index * DAY_IN_MS));
    }

    if (
      points.length === 0 ||
      points[points.length - 1].getTime() !== timelineRange.maxDate.getTime()
    ) {
      points.push(timelineRange.maxDate);
    }

    return points;
  }, [timelineRange.maxDate, timelineRange.minDate, totalDays]);

  const getTaskBarStyle = (item: ITimelineTask): React.CSSProperties => {
    const startOffsetDays = Math.round(
      (item.start.getTime() - timelineRange.minDate.getTime()) / DAY_IN_MS
    );
    const durationDays = Math.max(
      1,
      Math.round((item.end.getTime() - item.start.getTime()) / DAY_IN_MS) + 1
    );
    const isHovered = hoveredTaskId === item.task.id;

    return {
      position: 'absolute',
      left: `${(startOffsetDays / totalDays) * 100}%`,
      width: `${(durationDays / totalDays) * 100}%`,
      minWidth: '10px',
      top: '5px',
      bottom: '5px',
      borderRadius: '999px',
      backgroundColor: THEME.statusColors[item.status],
      color: '#ffffff',
      border: '1px solid rgba(0, 0, 0, 0.1)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 10px',
      fontSize: '12px',
      fontWeight: 600,
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
      cursor: onTaskClick ? 'pointer' : 'default',
      transform: isHovered ? 'translateY(-1px)' : 'translateY(0)',
      boxShadow: isHovered ? '0 6px 14px rgba(0, 0, 0, 0.15)' : '0 2px 6px rgba(0, 0, 0, 0.08)',
      transition: 'transform 120ms ease, box-shadow 120ms ease, filter 120ms ease',
      filter: isHovered ? 'brightness(1.06)' : 'none',
    };
  };

  return (
    <div
      style={{
        backgroundColor: THEME.colors.background,
        color: THEME.colors.textPrimary,
        padding: '16px',
        display: 'grid',
        gap: '14px',
      }}
    >
      {/* Timeline header row */}
      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '12px', alignItems: 'center' }}>
        <div style={{ color: THEME.colors.textSecondary, fontSize: '12px', fontWeight: 600 }}>
          Timeline
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: THEME.colors.textSecondary,
            fontWeight: 600,
          }}
        >
          {ticks.map((tick) => (
            <span key={tick.toISOString()}>{formatLabel(tick)}</span>
          ))}
        </div>
      </div>

      {/* One row per status */}
      {statuses.map((status) => (
        <div
          key={status}
          style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '12px', alignItems: 'start' }}
        >
          {/* Status label */}
          <div
            style={{
              color: THEME.colors.textPrimary,
              fontSize: '12px',
              fontWeight: 600,
              paddingTop: '10px',
            }}
          >
            {status}
          </div>

          {/* Task bars */}
          <div style={{ display: 'grid', gap: '10px' }}>
            {groupedByStatus[status].length === 0 ? (
              <div
                style={{
                  height: '34px',
                  borderRadius: '8px',
                  border: `1px dashed ${THEME.colors.border}`,
                  backgroundColor: THEME.colors.panel,
                }}
              />
            ) : (
              groupedByStatus[status].map((item) => (
                <div
                  key={item.task.id}
                  style={{
                    position: 'relative',
                    height: '34px',
                    borderRadius: '8px',
                    backgroundColor: THEME.colors.panel,
                    border: `1px solid ${THEME.colors.border}`,
                    overflow: 'hidden',
                  }}
                >
                  {/* Vertical tick guide lines */}
                  {ticks.map((tick) => {
                    const leftPct =
                      ((tick.getTime() - timelineRange.minDate.getTime()) /
                        (timelineRange.maxDate.getTime() - timelineRange.minDate.getTime() || 1)) *
                      100;

                    return (
                      <span
                        key={`${item.task.id}-${tick.toISOString()}`}
                        style={{
                          position: 'absolute',
                          top: 0,
                          bottom: 0,
                          left: `${leftPct}%`,
                          width: '1px',
                          backgroundColor: THEME.colors.border,
                          pointerEvents: 'none',
                        }}
                      />
                    );
                  })}

                  {/* Task bar button */}
                  <button
                    type="button"
                    onClick={() => onTaskClick && onTaskClick(item.task.id)}
                    onMouseEnter={() => setHoveredTaskId(item.task.id)}
                    onMouseLeave={() => setHoveredTaskId(null)}
                    disabled={!onTaskClick}
                    style={{ ...getTaskBarStyle(item), appearance: 'none', textAlign: 'left' }}
                  >
                    {item.task.title}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default GanttView;