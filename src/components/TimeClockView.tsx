import React, { useState } from 'react';
import { differenceInDays } from 'date-fns';
import { Clock, Calendar, CheckCircle } from 'lucide-react';
import { AttendanceRecord, LeaveRequest, User, LeaveType, LeaveStatus, CalendarConfig } from '../types';

interface Props {
  user: User;
  attendance: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  calendarConfig: CalendarConfig;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onRequestLeave: (request: Omit<LeaveRequest, 'id'>) => void;
}

export const TimeClockView: React.FC<Props> = ({ user, attendance, leaveRequests, calendarConfig, onCheckIn, onCheckOut, onRequestLeave }) => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'leave'>('attendance');

  const approvedAnnualLeave = leaveRequests.filter(l => l.staffId === user.id && l.status === LeaveStatus.APPROVED && l.type === LeaveType.ANNUAL);
  const usedAnnualLeaveDays = approvedAnnualLeave.reduce((sum, leave) => {
    let days = 0;
    let d = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    while (d <= end) {
      if (!calendarConfig.publicHolidays.includes(d.toISOString().split('T')[0])) {
        days++;
      }
      d.setDate(d.getDate() + 1);
    }
    return sum + days;
  }, 0);
  const leaveBalance = 30 - usedAnnualLeaveDays;

  return (
    <div className="p-4 space-y-6 pb-24 h-full overflow-y-auto">
      <div className="bg-[var(--bg-secondary)] p-6 rounded-3xl border border-[var(--border-color)]">
        <h2 className="text-lg font-black text-[var(--text-primary)] mb-4">Clock In / Out</h2>
        <div className="flex gap-4">
          <button 
           onClick={onCheckIn}
           disabled={user.checkInStatus === 'in'}
           className="flex-1 py-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)]"
          >
            Check In
          </button>
          <button 
           onClick={onCheckOut}
           disabled={user.checkInStatus === 'out'}
           className="flex-1 py-3 bg-brand-orange text-white rounded-xl border border-[var(--border-color)]"
          >
            Check Out
          </button>
        </div>
      </div>

      <div className="bg-[var(--bg-secondary)] p-6 rounded-3xl border border-[var(--border-color)]">
        <h2 className="text-lg font-black text-[var(--text-primary)]">Leave Balance</h2>
        <p className="text-4xl font-black text-brand-blue">{leaveBalance} <span className="text-sm">/ 30 days available</span></p>
      </div>

      <div className="flex gap-2 p-1 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)]">
        <button onClick={() => setActiveTab('attendance')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl ${activeTab === 'attendance' ? 'bg-brand-blue text-white' : ''}`}>Attendance</button>
        <button onClick={() => setActiveTab('leave')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl ${activeTab === 'leave' ? 'bg-brand-blue text-white' : ''}`}>Leave</button>
      </div>

      {activeTab === 'attendance' && (
        <div className="space-y-3">
          {attendance.filter(a => a.staffId === user.id).map(a => {
            const overtime = Math.max(0, a.hoursWorked - 9);
            return (
              <div key={a.id} className="p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] flex justify-between items-center">
                <div>
                  <p className="font-black text-sm">{a.date}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{a.checkIn} - {a.checkOut || 'Active'}</p>
                </div>
                <div className="text-right">
                  <p className="font-black">{a.hoursWorked} hrs</p>
                  {overtime > 0 && <p className="text-xs text-brand-orange font-bold">+{overtime} OT</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'leave' && (
        <div className="space-y-3">
          {leaveRequests.filter(l => l.staffId === user.id && new Date(l.startDate) > new Date()).map(l => (
            <div key={l.id} className="p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] flex justify-between">
              <div>
                <p className="font-black">{l.type}</p>
                <p className="text-xs">{l.startDate} to {l.endDate}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-black ${l.status === LeaveStatus.APPROVED ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>{l.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
