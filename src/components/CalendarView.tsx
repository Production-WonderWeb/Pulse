import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, User as UserIcon, Users } from 'lucide-react';
import { Project, LeaveRequest, ProjectResourceAssignment, CalendarConfig, User, Task } from '../types';
import { cn } from '../lib/utils';

interface Props {
  projects: Project[];
  leaveRequests: LeaveRequest[];
  assignments: ProjectResourceAssignment[];
  calendarConfig: CalendarConfig;
  user: User;
  staff: User[];
  tasks: Task[];
}

export const CalendarView: React.FC<Props> = ({ projects, leaveRequests, assignments, calendarConfig, user, staff, tasks }) => {
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
    const events: { title: string; type: 'project' | 'leave' | 'assignment' | 'holiday' | 'weekend' | 'task' }[] = [];
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
        const staffName = staff.find(s => s.id === l.staffId)?.name || l.staffId;
        events.push({ 
          title: viewMode === 'mine' ? 'My Leave' : `Leave: ${staffName}`, 
          type: 'leave' 
        });
      }
    });

    // Filter tasks
    const visibleTasks = viewMode === 'mine' 
      ? (tasks || []).filter(t => t.assignedTo?.includes(user.id))
      : (tasks || []);

    visibleTasks.forEach(t => {
      // Due date is ISO, extract YYYY-MM-DD
      const taskDate = t.dueDate.split('T')[0];
      if (taskDate === dateStr) {
        events.push({ title: `Task: ${t.title}`, type: 'task' });
      }
    });

    return events;
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 h-full overflow-y-auto">
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tight">{format(currentMonth, 'MMMM yyyy')}</h2>
          <p className="text-[10px] text-[var(--text-secondary)] font-black uppercase tracking-[0.2em] mt-1">Operational Timeline Matrix</p>
        </div>
        
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex bg-[var(--bg-secondary)] p-1 rounded-2xl border border-[var(--border-color)]">
            <button
              onClick={() => setViewMode('mine')}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                viewMode === 'mine' 
                  ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' 
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <UserIcon size={14} />
              My View
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                viewMode === 'all' 
                  ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' 
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Users size={14} />
              Unified
            </button>
          </div>

          <div className="flex gap-2">
              <button 
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="w-10 h-10 flex items-center justify-center bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-brand-blue transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="w-10 h-10 flex items-center justify-center bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-brand-blue transition-all"
              >
                <ChevronRight size={20} />
              </button>
          </div>
        </div>
      </div>

      <div className="bg-[var(--bg-secondary)] rounded-[2.5rem] border border-[var(--border-color)] overflow-hidden shadow-2xl">
        <div className="grid grid-cols-7 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-[10px] font-black uppercase text-[var(--text-secondary)] py-4 tracking-widest">{day}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-[1px] bg-[var(--border-color)]">
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="h-32 bg-[var(--bg-primary)]/30" />
          ))}
          {days.map(day => {
              const events = getEventsForDay(day);
              const isToday = isSameDay(day, new Date());
              return (
                  <div key={day.toISOString()} className={cn(
                    "h-32 bg-[var(--bg-secondary)] p-3 flex flex-col gap-2 transition-all hover:bg-[var(--bg-primary)]/50",
                    isToday && "ring-2 ring-inset ring-brand-blue/30"
                  )}>
                      <div className="flex justify-between items-center">
                        <span className={cn(
                          "text-[10px] font-black",
                          isToday ? "text-brand-blue" : "text-[var(--text-secondary)]"
                        )}>{format(day, 'd')}</span>
                        {isToday && <div className="w-1.5 h-1.5 rounded-full bg-brand-blue" />}
                      </div>
                      
                      <div className="flex-1 space-y-1 overflow-y-auto scrollbar-hide">
                        {events.map((e, i) => (
                            <div key={i} className={cn(
                                "text-[7px] font-black uppercase p-1.5 rounded-lg truncate leading-none flex items-center gap-1.5",
                                e.type === 'project' ? 'bg-brand-blue/10 text-brand-blue border border-brand-blue/20' : 
                                e.type === 'leave' ? 'bg-brand-green/10 text-brand-green border border-brand-green/20' :
                                e.type === 'task' ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20' :
                                e.type === 'holiday' ? 'bg-brand-orange/10 text-brand-orange border border-brand-orange/20' :
                                e.type === 'weekend' ? 'bg-[var(--bg-primary)] text-[var(--text-secondary)] opacity-40' : 
                                'bg-brand-grey/10 text-brand-grey border border-brand-grey/20'
                            )}>
                                <div className={cn(
                                  "w-1 h-1 rounded-full shrink-0",
                                  e.type === 'project' ? 'bg-brand-blue' : 
                                  e.type === 'leave' ? 'bg-brand-green' :
                                  e.type === 'task' ? 'bg-brand-purple' :
                                  e.type === 'holiday' ? 'bg-brand-orange' : 'bg-[var(--text-secondary)]'
                                )} />
                                {e.title}
                            </div>
                        ))}
                      </div>
                  </div>
              )
          })}
        </div>
      </div>
    </div>
  );
};
