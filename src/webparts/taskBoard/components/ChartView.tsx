import * as React from 'react';
import { useMemo } from 'react';

import type { Task, TaskStatus } from './TaskTypes';
import { THEME } from './theme';

export interface IChartViewProps {
  tasks: Task[];
  statuses: TaskStatus[];
}

type PriorityKey = Task['priority'];

interface IPieSlice {
  label: string;
  value: number;
  color: string;
}

const ChartView: React.FC<IChartViewProps> = ({ tasks, statuses }): React.ReactElement => {
  const statusCounts = useMemo<Record<TaskStatus, number>>(() => {
    const initial = statuses.reduce<Record<TaskStatus, number>>((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {} as Record<TaskStatus, number>);

    tasks.forEach((task) => {
      const status = task.status;
      if (status in initial) {
        initial[status] += 1;
      }
    });

    return initial;
  }, [statuses, tasks]);

  const priorityOrder: PriorityKey[] = ['High', 'Medium', 'Low'];

  const priorityCounts = useMemo<Record<PriorityKey, number>>(() => {
    const initial: Record<PriorityKey, number> = {
      High: 0,
      Medium: 0,
      Low: 0
    };

    tasks.forEach((task) => {
      initial[task.priority] += 1;
    });

    return initial;
  }, [tasks]);

  const buildPieBackground = (slices: IPieSlice[]): string => {
    const total = Math.max(1, slices.reduce((sum, slice) => sum + slice.value, 0));
    let currentAngle = 0;

    const segments = slices.map((slice) => {
      const startAngle = currentAngle;
      const angle = (slice.value / total) * 360;
      currentAngle += angle;
      return `${slice.color} ${startAngle}deg ${currentAngle}deg`;
    });

    return `conic-gradient(${segments.join(', ')})`;
  };

  const statusSlices: IPieSlice[] = statuses.map((status) => ({
    label: status,
    value: statusCounts[status],
    color: THEME.statusColors[status]
  }));

  const prioritySlices: IPieSlice[] = priorityOrder.map((priority) => ({
    label: priority,
    value: priorityCounts[priority],
    color: THEME.priorityColors[priority]
  }));

  const renderLegend = (slices: IPieSlice[]): React.ReactElement => {
    return (
      <div style={{ display: 'grid', gap: '10px' }}>
        {slices.map((slice) => (
          <div
            key={slice.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              border: `1px solid ${THEME.colors.border}`,
              borderRadius: '8px',
              padding: '6px 8px',
              backgroundColor: 'rgba(15, 23, 42, 0.25)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: THEME.colors.textPrimary }}>
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: slice.color,
                  display: 'inline-block'
                }}
              />
              <span>{slice.label}</span>
            </div>
            <span style={{ color: THEME.colors.textStrong, fontWeight: 700 }}>{slice.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: THEME.colors.background,
        color: THEME.colors.textPrimary,
        display: 'grid',
        gap: '20px'
      }}
    >
      <section style={{ backgroundColor: THEME.colors.panel, borderRadius: '12px', padding: '18px' }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '14px', color: THEME.colors.textStrong }}>Status Distribution</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr)', justifyItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '170px',
              height: '170px',
              borderRadius: '50%',
              background: buildPieBackground(statusSlices),
              border: `1px solid ${THEME.colors.border}`
            }}
          />
          <div style={{ width: '100%', maxWidth: '360px' }}>{renderLegend(statusSlices)}</div>
        </div>
      </section>

      <section style={{ backgroundColor: THEME.colors.panel, borderRadius: '12px', padding: '18px' }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '14px', color: THEME.colors.textStrong }}>Priority Distribution</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr)', justifyItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '170px',
              height: '170px',
              borderRadius: '50%',
              background: buildPieBackground(prioritySlices),
              border: `1px solid ${THEME.colors.border}`
            }}
          />
          <div style={{ width: '100%', maxWidth: '360px' }}>{renderLegend(prioritySlices)}</div>
        </div>
      </section>
    </div>
  );
};

export default ChartView;
