import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, User as UserIcon, Users } from 'lucide-react';
import { Project, LeaveRequest, ProjectResourceAssignment, CalendarConfig, User } from '../types';

interface Props {
  projects: Project[];
  leaveRequests: LeaveRequest[];
  assignments: ProjectResourceAssignment[];
  calendarConfig: CalendarConfig;
  user: User;
}

export const CalendarView: React.FC<Props> = ({ projects, leaveRequests, assignments, calendarConfig, user }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'all' | 'mine'>(user.role === 'Staff' ? 'mine' : 'all');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({
    start: monthStart,
    end: monthEnd,
  });

  const startOffset = monthStart.getDay(); // 0 for Sunday, 1 for Monday, etc.

  const getEventsForDay = (day: Date) => {
    const events: { title: string; type: 'project' | 'leave' | 'assignment' | 'holiday' | 'weekend' }[] = [];
    const dateStr = format(day, 'yyyy-MM-dd');
    const isForcedWorking = (calendarConfig.forcedWorkingDates || []).includes(dateStr);

    // Check for Weekend
    const isWeekendDays = (calendarConfig.workingWeekends && calendarConfig.workingWeekends.length > 0) 
      ? calendarConfig.workingWeekends 
      : [0, 6];
    if (isWeekendDays.includes(day.getDay()) && !isForcedWorking) {
      events.push({ title: 'Weekend', type: 'weekend' });
    }

    if (isForcedWorking) {
      events.push({ title: 'Working Weekend', type: 'assignment' }); // Use assignment type color or similar
    }

    // Check for Holiday
    const holiday = (calendarConfig.publicHolidays || []).find(h => dateStr >= h.startDate && dateStr <= h.endDate);
    if (holiday) {
      events.push({ title: holiday.name, type: 'holiday' });
    }
    
    // Filter projects
    const visibleProjects = viewMode === 'mine' 
      ? projects.filter(p => 
          (p.assignedStaff || []).includes(user.id) || 
          assignments.some(a => a.projectId === p.id && a.resourceId === user.id && a.resourceType === 'staff')
        )
      : projects;

    visibleProjects.forEach(p => {
        if (dateStr >= p.startDate && dateStr <= p.endDate) {
            events.push({ title: p.name, type: 'project' });
        }
    });

    // Filter leaves
    const visibleLeaves = viewMode === 'mine'
      ? (leaveRequests || []).filter(l => l.staffId === user.id)
      : (leaveRequests || []);

    visibleLeaves.filter(l => l.status === 'APPROVED').forEach(l => {
        if (dateStr >= l.startDate && dateStr <= l.endDate) {
            events.push({ title: viewMode === 'mine' ? (l.staffId === user.id ? 'My Leave' : 'Leave') : `Leave (${l.staffId})`, type: 'leave' });
        }
    });

    return events;
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-black">{format(currentMonth, 'MMMM yyyy')}</h2>
          <div className="flex gap-2">
              <button 
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-1 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors border border-transparent hover:border-[var(--border-color)]"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-1 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors border border-transparent hover:border-[var(--border-color)]"
              >
                <ChevronRight size={20} />
              </button>
          </div>
        </div>
        
        <div className="flex bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-color)] self-start md:self-auto">
          <button
            onClick={() => setViewMode('mine')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              viewMode === 'mine' 
                ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' 
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <UserIcon size={14} />
            My Calendar
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              viewMode === 'all' 
                ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' 
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Users size={14} />
            Everyone
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-[10px] font-black uppercase text-[var(--text-secondary)] py-2">{day}</div>
        ))}
        {/* Placeholder for days of the week before the 1st of the month */}
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} className="h-24 bg-transparent border border-transparent rounded-lg" />
        ))}
        {days.map(day => {
            const events = getEventsForDay(day);
            return (
                <div key={day.toISOString()} className="h-24 bg-[var(--bg-secondary)] rounded-xl p-2 border border-[var(--border-color)] overflow-y-auto hover:border-brand-blue/30 transition-all flex flex-col">
                    <p className="text-[10px] font-black text-[var(--text-secondary)] mb-1">{format(day, 'd')}</p>
                    <div className="space-y-0.5">
                      {events.map((e, i) => (
                          <div key={i} className={`text-[7px] font-black uppercase p-1 rounded-md truncate leading-none ${
                              e.type === 'project' ? 'bg-blue-500 text-white' : 
                              e.type === 'leave' ? 'bg-green-500 text-white' :
                              e.type === 'holiday' ? 'bg-red-500 text-white' :
                              e.type === 'weekend' ? 'bg-gray-100 text-gray-400 border border-gray-200' : 
                              'bg-gray-500 text-white'
                          }`}>
                              {e.title}
                          </div>
                      ))}
                    </div>
                </div>
            )
        })}
      </div>
    </div>
  );
};
