import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { differenceInDays, parseISO } from 'date-fns';
import { ProjectTask } from '../types';
import { AlertCircle } from 'lucide-react';

interface GanttChartProps {
  tasks: ProjectTask[];
}

export const GanttChart: React.FC<GanttChartProps> = ({ tasks }) => {
  const minDate = new Date(Math.min(...tasks.map(t => new Date(t.startDate).getTime())));
  
  const formattedTasks = tasks.map(task => ({
    ...task,
    startOffset: differenceInDays(parseISO(task.startDate), minDate),
    duration: differenceInDays(parseISO(task.endDate), parseISO(task.startDate)) + 1,
    fill: task.progress === 100 ? '#10b981' : task.progress > 0 ? '#3b82f6' : '#94a3b8'
  }));

  return (
    <div className="h-64 w-full bg-[var(--bg-secondary)] p-4 rounded-3xl border border-[var(--border-color)]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={formattedTasks} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" hide />
          <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
          <Tooltip content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload as any;
              return (
                <div className="bg-[var(--bg-primary)] p-2 rounded-lg border border-[var(--border-color)] text-xs">
                  <p className="font-bold">{data.name}</p>
                  <p>{data.startDate} - {data.endDate}</p>
                  <p>Progress: {data.progress}%</p>
                  {data.dependencies && data.dependencies.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 text-orange-500">
                      <AlertCircle size={10} />
                      <span className="text-[10px]">Depends on: {data.dependencies.join(', ')}</span>
                    </div>
                  )}
                </div>
              );
            }
            return null;
          }} />
          <Bar dataKey="duration" stackId="a" fill="transparent" />
          <Bar dataKey="duration" stackId="a" fillOpacity={0.8}>
            {formattedTasks.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
