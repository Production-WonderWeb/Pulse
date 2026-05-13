import React, { useState, useRef, useEffect, useMemo } from 'react';
import { differenceInDays, parseISO, addDays, format, startOfDay, min as minDateFn, max as maxDateFn } from 'date-fns';
import { ProjectTask } from '../types';
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface GanttChartProps {
  tasks: ProjectTask[];
  onUpdateTasks?: (updatedTasks: ProjectTask[]) => void;
}

export const GanttChart: React.FC<GanttChartProps> = ({ tasks, onUpdateTasks }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewWindow, setViewWindow] = useState({ start: 0, width: 0 });
  const [isReady, setIsReady] = useState(false);

  // Initialize dates
  const { startDate, endDate, totalDays, dates } = useMemo(() => {
    if (!tasks.length) return { startDate: new Date(), endDate: new Date(), totalDays: 0, dates: [] };
    
    const taskDates = tasks.flatMap(t => [parseISO(t.startDate), parseISO(t.endDate)]);
    const start = startOfDay(minDateFn(taskDates));
    const end = startOfDay(maxDateFn(taskDates));
    
    // Add small padding to the timeline
    const timelineStart = addDays(start, -2);
    const timelineEnd = addDays(end, 5);
    const diff = differenceInDays(timelineEnd, timelineStart) + 1;
    
    const days = Array.from({ length: diff }, (_, i) => addDays(timelineStart, i));
    
    return { startDate: timelineStart, endDate: timelineEnd, totalDays: diff, dates: days };
  }, [tasks]);

  useEffect(() => {
    if (containerRef.current) {
      setViewWindow({ start: 0, width: containerRef.current.offsetWidth });
      setIsReady(true);
    }
  }, []);

  const DAY_WIDTH = 40; // Pixels per day
  const ROW_HEIGHT = 44;
  const HEADER_HEIGHT = 40;

  const getX = (dateStr: string) => {
    const d = parseISO(dateStr);
    return differenceInDays(d, startDate) * DAY_WIDTH;
  };

  const [dragging, setDragging] = useState<{ id: string; type: 'move' | 'resize-start' | 'resize-end' | 'progress'; initialX: number; initialStart: string; initialEnd: string; initialProgress: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState<string>('');

  const handlePointerDown = (e: React.PointerEvent, taskId: string, type: 'move' | 'resize-start' | 'resize-end' | 'progress') => {
    e.stopPropagation();
    const task = tasks.find(t => t.id === taskId);
    if (!task || !onUpdateTasks) return;
    
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging({
      id: taskId,
      type,
      initialX: e.clientX,
      initialStart: task.startDate,
      initialEnd: task.endDate,
      initialProgress: task.progress
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging || !onUpdateTasks) return;

    const deltaX = e.clientX - dragging.initialX;
    
    if (dragging.type === 'progress') {
      const taskWidth = (differenceInDays(parseISO(dragging.initialEnd), parseISO(dragging.initialStart)) + 1) * DAY_WIDTH - 8;
      const progressDelta = (deltaX / taskWidth) * 100;
      let newProgress = Math.round(Math.max(0, Math.min(100, dragging.initialProgress + progressDelta)));
      
      const updatedTasks = tasks.map(t => t.id === dragging.id ? { ...t, progress: newProgress } : t);
      const currentTask = tasks.find(t => t.id === dragging.id);
      if (currentTask?.progress !== newProgress) {
        onUpdateTasks(updatedTasks);
      }
      return;
    }

    const daysDelta = Math.round(deltaX / DAY_WIDTH);
    if (daysDelta === 0 && dragging.type !== 'progress') return;

    const updatedTasks = tasks.map(t => {
      if (t.id !== dragging.id) return t;

      let newStart = parseISO(dragging.initialStart);
      let newEnd = parseISO(dragging.initialEnd);

      if (dragging.type === 'move') {
        newStart = addDays(newStart, daysDelta);
        newEnd = addDays(newEnd, daysDelta);
      } else if (dragging.type === 'resize-start') {
        newStart = addDays(newStart, daysDelta);
        if (differenceInDays(newEnd, newStart) < 0) newStart = newEnd;
      } else if (dragging.type === 'resize-end') {
        newEnd = addDays(newEnd, daysDelta);
        if (differenceInDays(newEnd, newStart) < 0) newEnd = newStart;
      }

      return {
        ...t,
        startDate: format(newStart, 'yyyy-MM-dd'),
        endDate: format(newEnd, 'yyyy-MM-dd')
      };
    });

    const currentTask = tasks.find(t => t.id === dragging.id);
    const updatedTask = updatedTasks.find(t => t.id === dragging.id);
    if (currentTask?.startDate !== updatedTask?.startDate || currentTask?.endDate !== updatedTask?.endDate) {
      onUpdateTasks(updatedTasks);
    }
  };

  const handleProgressInputSubmit = (taskId: string) => {
    if (!onUpdateTasks) return;
    const value = parseInt(inputValue);
    if (!isNaN(value)) {
      const progress = Math.max(0, Math.min(100, value));
      const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, progress } : t);
      onUpdateTasks(updatedTasks);
    }
    setEditingId(null);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragging) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      setDragging(null);
    }
  };

  if (!tasks.length) return null;

  return (
    <div className="space-y-2">
      <div 
        ref={containerRef}
        className="w-full bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-inner relative"
        style={{ height: tasks.length * ROW_HEIGHT + HEADER_HEIGHT + 20 }}
      >
        <div className="overflow-x-auto h-full scrollbar-hide">
          <div 
            className="relative h-full"
            style={{ width: totalDays * DAY_WIDTH, minWidth: '100%' }}
          >
            {/* Header Dates */}
            <div className="flex border-b border-[var(--border-color)] bg-[var(--bg-primary)]/50 backdrop-blur sticky top-0 z-10">
              {dates.map((date, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "flex-shrink-0 border-r border-[var(--border-color)] flex flex-col items-center justify-center",
                    [0, 6].includes(date.getDay()) ? "bg-[var(--bg-secondary)]/50" : ""
                  )}
                  style={{ width: DAY_WIDTH, height: HEADER_HEIGHT }}
                >
                  <span className="text-[7px] font-black uppercase text-[var(--text-secondary)] leading-none mb-1">
                    {format(date, 'eee')}
                  </span>
                  <span className={cn(
                    "text-[10px] font-black leading-none",
                    format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? "text-brand-blue" : "text-[var(--text-primary)]"
                  )}>
                    {format(date, 'd')}
                  </span>
                </div>
              ))}
            </div>

            {/* Grid & Bars */}
            <div className="relative" style={{ height: tasks.length * ROW_HEIGHT }}>
              {/* Vertical Grid Lines */}
              <div className="absolute inset-0 flex pointer-events-none">
                {dates.map((_, i) => (
                  <div key={i} className="flex-shrink-0 border-r border-[var(--border-color)]/30 h-full" style={{ width: DAY_WIDTH }} />
                ))}
              </div>

              {/* Today line */}
              <div 
                className="absolute top-0 bottom-0 border-l-2 border-brand-orange/40 z-0 pointer-events-none"
                style={{ left: getX(format(new Date(), 'yyyy-MM-dd')) }}
              />

              {/* Tasks */}
              {tasks.map((task, idx) => {
                const x = getX(task.startDate);
                const w = (differenceInDays(parseISO(task.endDate), parseISO(task.startDate)) + 1) * DAY_WIDTH;
                const isDragging = dragging?.id === task.id;

                return (
                  <div 
                    key={task.id} 
                    className="group relative"
                    style={{ height: ROW_HEIGHT, top: idx * ROW_HEIGHT }}
                  >
                    {/* Background handle / hover state */}
                    <div className="absolute inset-0 group-hover:bg-brand-blue/5 transition-colors pointer-events-none" />

                    <motion.div
                      className={cn(
                        "absolute rounded-lg shadow-sm flex items-center justify-between px-2 group/bar",
                        onUpdateTasks ? "cursor-grab active:cursor-grabbing" : "cursor-default",
                        task.progress === 100 ? "bg-brand-green/20 border border-brand-green/30" : 
                        task.progress > 0 ? "bg-brand-blue/20 border border-brand-blue/30" : 
                        "bg-[var(--border-color)]/50 border border-[var(--border-color)]"
                      )}
                      style={{ 
                        left: x + 4, 
                        width: w - 8, 
                        top: 8, 
                        height: 28,
                        zIndex: isDragging ? 20 : 1
                      }}
                      onPointerDown={(e) => onUpdateTasks && handlePointerDown(e, task.id, 'move')}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                    >
                      {/* Left Resize Handle */}
                      {onUpdateTasks && (
                        <div 
                          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-black/5 rounded-l-lg z-10"
                          onPointerDown={(e) => handlePointerDown(e, task.id, 'resize-start')}
                        />
                      )}

                      {/* Progress Bar background */}
                      <div 
                        className="absolute left-0 top-0 bottom-0 bg-current opacity-10 pointer-events-none rounded-lg" 
                        style={{ width: `${task.progress}%` }} 
                      />

                      {/* Progress Resize Handle (Draggable fill level) */}
                      {onUpdateTasks && (
                        <div 
                          className="absolute top-0 bottom-0 w-1.5 bg-current opacity-30 cursor-ew-resize z-20 hover:opacity-60 transition-opacity"
                          style={{ left: `calc(${task.progress}% - 0.75px)` }}
                          onPointerDown={(e) => handlePointerDown(e, task.id, 'progress')}
                        />
                      )}
                      
                      <div className="flex items-center gap-2 z-0 pointer-events-none w-full truncate">
                        <span className="text-[9px] font-black uppercase text-[var(--text-primary)] truncate">
                          {task.name}
                        </span>
                        {editingId === task.id ? (
                          <input
                            autoFocus
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onBlur={() => handleProgressInputSubmit(task.id)}
                            onKeyDown={(e) => e.key === 'Enter' && handleProgressInputSubmit(task.id)}
                            className="w-8 bg-white/80 border border-brand-blue rounded text-[8px] font-bold px-1 py-0 pointer-events-auto"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span 
                            className="text-[8px] font-black text-brand-blue/60 pointer-events-auto cursor-pointer hover:text-brand-blue"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(task.id);
                              setInputValue(task.progress.toString());
                            }}
                          >
                            {task.progress}%
                          </span>
                        )}
                      </div>

                      {/* Right Resize Handle */}
                      {onUpdateTasks && (
                        <div 
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-black/5 rounded-r-lg z-10"
                          onPointerDown={(e) => handlePointerDown(e, task.id, 'resize-end')}
                        />
                      )}
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between items-center px-2">
        <p className="text-[8px] font-black text-[var(--text-secondary)] uppercase tracking-widest leading-relaxed">
          Grab center to reschedule • Drag edges to scale duration • Drag vertical line inside bar to set progress • Click % to input value
        </p>
        <div className="flex items-center gap-1">
           <AlertCircle size={10} className="text-brand-orange" />
           <span className="text-[8px] font-bold text-brand-orange uppercase">Real-time Persistence</span>
        </div>
      </div>
    </div>
  );
};
