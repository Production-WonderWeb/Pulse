import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Project, LeaveRequest, ProjectResourceAssignment } from '../types';

interface Props {
  projects: Project[];
  leaveRequests: LeaveRequest[];
  assignments: ProjectResourceAssignment[];
}

export const CalendarView: React.FC<Props> = ({ projects, leaveRequests, assignments }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const getEventsForDay = (day: Date) => {
    const events: { title: string; type: 'project' | 'leave' | 'assignment' }[] = [];
    
    projects.forEach(p => {
        const start = new Date(p.startDate);
        const end = new Date(p.endDate);
        if (day >= start && day <= end) {
            events.push({ title: p.name, type: 'project' });
        }
    });

    leaveRequests.filter(l => l.status === 'APPROVED').forEach(l => {
        const start = new Date(l.startDate);
        const end = new Date(l.endDate);
        if (day >= start && day <= end) {
            events.push({ title: 'Leave', type: 'leave' });
        }
    });

    return events;
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black">{format(currentMonth, 'MMMM yyyy')}</h2>
        <div className="flex gap-2">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft /></button>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="text-center text-xs font-bold">{day}</div>)}
        {days.map(day => {
            const events = getEventsForDay(day);
            return (
                <div key={day.toISOString()} className="h-20 bg-[var(--bg-secondary)] rounded-lg p-2 overflow-y-auto">
                    <p className="text-xs font-bold">{format(day, 'd')}</p>
                    {events.map((e, i) => (
                        <div key={i} className={`text-[8px] p-1 rounded mb-1 truncate ${e.type === 'project' ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'}`}>
                            {e.title}
                        </div>
                    ))}
                </div>
            )
        })}
      </div>
    </div>
  );
};
