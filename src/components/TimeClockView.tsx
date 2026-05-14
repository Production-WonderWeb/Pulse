// Force Vite reload
import React, { useState } from 'react';
import { format } from 'date-fns';
import { Clock, Plus, Send, Edit3, Check, X, Shield, Settings, Trash2, Download } from 'lucide-react';
import { AttendanceRecord, LeaveRequest, User, LeaveType, LeaveStatus, CalendarConfig } from '../types';

interface Props {
  user: User;
  users?: User[];
  attendance: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  calendarConfig: CalendarConfig;
  onCheckIn: (staffId?: string) => void;
  onCheckOut: (staffId?: string) => void;
  onRequestLeave: (request: Omit<LeaveRequest, 'id'>) => void;
  onUpdateAttendance?: (id: string, data: Partial<AttendanceRecord>) => void;
  onAddAttendance?: (data: Omit<AttendanceRecord, 'id' | 'createdAt'>) => void;
  onDeleteAttendance?: (id: string) => void;
  onUpdateLeave?: (id: string, data: Partial<LeaveRequest>) => void;
  onDeleteLeave?: (id: string) => void;
  onUpdateUser?: (id: string, data: Partial<User>) => void;
}

export const TimeClockView: React.FC<Props> = ({ user, users = [], attendance, leaveRequests, calendarConfig, onCheckIn, onCheckOut, onRequestLeave, onUpdateAttendance, onAddAttendance, onDeleteAttendance, onUpdateLeave, onDeleteLeave, onUpdateUser }) => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'leave'>('attendance');
  const [isRequestingLeave, setIsRequestingLeave] = useState(false);
  const [newLeave, setNewLeave] = useState<Omit<LeaveRequest, 'id' | 'staffId' | 'status'>>({
    type: LeaveType.ANNUAL,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: ''
  });

  const isAdminView = ['Administrator', 'Admin', 'Manager'].includes(user.role);
  const [selectedUserId, setSelectedUserId] = useState<string>(user.id);
  const latestSelf = users.find(u => u.id === user.id) || user;
  const targetUser = isAdminView ? (users.find(u => u.id === selectedUserId) || latestSelf) : latestSelf;

  const [editingAttendanceId, setEditingAttendanceId] = useState<string | null>(null);
  const [editingAttendanceForm, setEditingAttendanceForm] = useState<Partial<AttendanceRecord>>({});
  const [isAddingAttendance, setIsAddingAttendance] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [addingForm, setAddingForm] = useState({ date: new Date().toISOString().split('T')[0], checkIn: '09:00', checkOut: '18:00', hoursWorked: 9, standardHours: 9 });
  const [bulkForm, setBulkForm] = useState({ fromDate: new Date().toISOString().split('T')[0], toDate: new Date().toISOString().split('T')[0], applyToAll: false, standardHours: 9 });

  const [isEditingLimits, setIsEditingLimits] = useState(false);
  const [limitsForm, setLimitsForm] = useState({
    yearlyLeaveDays: targetUser.yearlyLeaveDays ?? 30,
    remainingCompOff: targetUser.remainingCompOff ?? 0,
    standardWorkingHours: targetUser.standardWorkingHours ?? 9
  });

  // Sync limits form when target user changes
  React.useEffect(() => {
    setLimitsForm({
      yearlyLeaveDays: targetUser.yearlyLeaveDays ?? 30,
      remainingCompOff: targetUser.remainingCompOff ?? 0,
      standardWorkingHours: targetUser.standardWorkingHours ?? 9
    });
  }, [targetUser.id, targetUser.yearlyLeaveDays, targetUser.remainingCompOff, targetUser.standardWorkingHours]);

  const myAttendance = attendance
    .filter(a => a.staffId === targetUser.id)
    .sort((a, b) => a.date.localeCompare(b.date));

  const visibleAttendance = myAttendance.filter(a => a.checkIn !== 'OVERRIDE');
  const myLeaves = leaveRequests.filter(l => l.staffId === targetUser.id);

  // Stats calculations
  const targetStdHours = targetUser.standardWorkingHours || 9;
  
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  const getExpectedHours = (dateStr: string, record?: AttendanceRecord) => {
    // Robust date parsing to avoid timezone-shifted day-of-week checks
    const [y, m, day] = dateStr.split('-').map(Number);
    const d = new Date(y, m - 1, day);
    const dayOfWeek = d.getDay();
    
    const isPublicHoliday = (calendarConfig.publicHolidays || []).some(h => 
      dateStr >= h.startDate && dateStr <= h.endDate
    );
    const isWeekendDays = (calendarConfig.workingWeekends && calendarConfig.workingWeekends.length > 0) 
      ? calendarConfig.workingWeekends 
      : [0, 6];
    const isWeekend = isWeekendDays.includes(dayOfWeek);
    const isForcedWorking = (calendarConfig.forcedWorkingDates || []).includes(dateStr);
    const onLeave = myLeaves.some(l => 
      l.status === LeaveStatus.APPROVED && dateStr >= l.startDate && dateStr <= l.endDate
    );
    
    if (onLeave) return 0;

    const isBasicWorkDay = !isPublicHoliday && !isWeekend;
    // Overridden to work if forced working date OR if admin manually set standard hours > 0 on a non-work day
    const isOverriddenToWork = (isPublicHoliday || isWeekend) && (isForcedWorking || (record?.standardHours ?? 0) > 0);

    if (isBasicWorkDay) {
      // For a normal work day, return the override or target std hours
      return record?.standardHours ?? targetStdHours;
    }
    
    if (isOverriddenToWork) {
      return record?.standardHours ?? targetStdHours;
    }

    return 0; // Weekend or Holiday without override
  };

  let expectedMonthHours = 0;
  let expectedActuallyWorkedHoursTotal = 0;
  let dIterFull = new Date(startOfMonth);
  while (dIterFull <= endOfMonth) {
    const dateStr = format(dIterFull, 'yyyy-MM-dd');
    const record = myAttendance.find(a => a.date === dateStr);
    
    expectedMonthHours += getExpectedHours(dateStr, record);
    
    if (record && record.checkIn !== 'OVERRIDE') {
       expectedActuallyWorkedHoursTotal += getExpectedHours(dateStr, record);
    }
    
    dIterFull.setDate(dIterFull.getDate() + 1);
  }

  const currentMonthAttendance = myAttendance.filter(a => {
    const [y, m] = a.date.split('-');
    return parseInt(y) === now.getFullYear() && parseInt(m) === (now.getMonth() + 1);
  });

  const visibleMonthAttendance = currentMonthAttendance.filter(a => a.checkIn !== 'OVERRIDE');

  const extraHours = visibleMonthAttendance.reduce((sum, a) => sum + Math.max(0, (a.hoursWorked || 0) - getExpectedHours(a.date, a)), 0);
  const lessHours = visibleMonthAttendance.reduce((sum, a) => sum + (a.checkOut && a.checkOut !== 'OVERRIDE' ? Math.max(0, getExpectedHours(a.date, a) - (a.hoursWorked || 0)) : 0), 0);
  const netHours = extraHours - lessHours;

  const actualMonthHours = visibleMonthAttendance.reduce((sum, a) => sum + (a.hoursWorked || 0), 0);

  const handleDownloadAttendance = () => {
    const headers = [
      'Date', 
      'Day', 
      'Check In', 
      'Check Out', 
      'Hours Worked', 
      'Standard Hours', 
      'Difference', 
      'Overtime', 
      'Status'
    ];
    
    const rows: string[][] = [];
    const d = new Date(startOfMonth);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    while (d <= end) {
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
      const record = myAttendance.find(a => a.date === dateStr);
      const leave = myLeaves.find(l => dateStr >= l.startDate && dateStr <= l.endDate && l.status === LeaveStatus.APPROVED);
      const isPublicHoliday = (calendarConfig.publicHolidays || []).some(h => 
        dateStr >= h.startDate && dateStr <= h.endDate
      );
      const isWeekendDays = (calendarConfig.workingWeekends && calendarConfig.workingWeekends.length > 0) 
        ? calendarConfig.workingWeekends 
        : [0, 6];
      const isWeekend = isWeekendDays.includes(d.getDay());
      const isForcedWorking = (calendarConfig.forcedWorkingDates || []).includes(dateStr);
      
      let status = 'Working Day';
      if (isPublicHoliday) status = 'Public Holiday';
      else if (isWeekend && !isForcedWorking) status = 'Weekend';
      else if (isForcedWorking) status = 'Working Weekend (Forced)';
      if (leave) status = `Leave (${leave.type})`;

      const isRealAttendance = record && record.checkIn !== 'OVERRIDE';
      const std = getExpectedHours(dateStr, record);
      const actualHours = isRealAttendance ? (record.hoursWorked || 0) : 0;
      const diff = isRealAttendance ? (actualHours - std) : (std > 0 ? -std : 0);
      
      rows.push([
        dateStr,
        dayName,
        isRealAttendance ? record.checkIn : '-',
        isRealAttendance ? (record.checkOut || 'Active') : '-',
        actualHours.toFixed(1),
        std.toFixed(1),
        diff.toFixed(1),
        Math.max(0, diff).toFixed(1),
        status
      ]);
      
      d.setDate(d.getDate() + 1);
    }

    const totalExpectedHours = rows.reduce((sum, r) => sum + parseFloat(r[5]), 0);
    const totalActualWorked = rows.reduce((sum, r) => sum + parseFloat(r[4]), 0);
    const totalExtra = rows.reduce((sum, r) => sum + parseFloat(r[7]), 0);
    const netBalance = totalActualWorked - totalExpectedHours;

    const summaryRows = [
      [],
      ['SUMMARY'],
      ['Total Expected Hours', totalExpectedHours.toFixed(2)],
      ['Total Actual Worked', totalActualWorked.toFixed(2)],
      ['Total Extra (OT)', totalExtra.toFixed(2)],
      ['Net Balance', netBalance.toFixed(2)],
      ['Approved Leaves (Days)', usedAnnualLeaveDays]
    ];

    const csvContent = [
      `Attendance Report - ${targetUser.name} - ${format(now, 'MMMM yyyy')}`,
      headers.join(','),
      ...rows.map(r => r.map(c => `"${c}"`).join(',')),
      ...summaryRows.map(r => r.map(c => `"${c}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Attendance_${targetUser.name.replace(/\s+/g, '_')}_${format(now, 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const approvedLeaves = myLeaves.filter(l => l.status === LeaveStatus.APPROVED);
  const earlyLeaveCount = approvedLeaves.filter(l => l.type === LeaveType.EARLY_LEAVE).length;
  const compOffCalculated = approvedLeaves.filter(l => l.type === LeaveType.COMP_OFF).length;

  const yearlyLeaveDaysBase = targetUser.yearlyLeaveDays ?? 30;
  const compOffBalance = targetUser.remainingCompOff ?? compOffCalculated;

  const approvedAnnualLeave = approvedLeaves.filter(l => l.type === LeaveType.ANNUAL);
  const usedAnnualLeaveDays = approvedAnnualLeave.reduce((sum, leave) => {
    let days = 0;
    let d = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    while (d <= end) {
      const dateStr = d.toISOString().split('T')[0];
      const isPublicHoliday = (calendarConfig.publicHolidays || []).some(h => 
        dateStr >= h.startDate && dateStr <= h.endDate
      );
      const isWeekendDays = (calendarConfig.workingWeekends && calendarConfig.workingWeekends.length > 0) 
        ? calendarConfig.workingWeekends 
        : [0, 6];
      const isWeekend = isWeekendDays.includes(d.getDay());
      const isForcedWorking = (calendarConfig.forcedWorkingDates || []).includes(dateStr);
      
      if (!isPublicHoliday && (!isWeekend || isForcedWorking)) {
        days++;
      }
      d.setDate(d.getDate() + 1);
    }
    return sum + days;
  }, 0);
  const totalGrantedLeaves = yearlyLeaveDaysBase + compOffBalance;
  const leaveBalance = totalGrantedLeaves - usedAnnualLeaveDays;

  const handleRequestLeave = () => {
    onRequestLeave({
      ...newLeave,
      staffId: user.id, // always request for oneself, unless maybe admin requesting for someone else? Keep simple for now
      status: LeaveStatus.PENDING
    });
    setIsRequestingLeave(false);
    setNewLeave({
      type: LeaveType.ANNUAL,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      reason: ''
    });
  };

  const handleSaveAttendance = () => {
    if (editingAttendanceId && onUpdateAttendance) {
      onUpdateAttendance(editingAttendanceId, editingAttendanceForm);
      setEditingAttendanceId(null);
    }
  };

  const handleAddAttendance = () => {
    if (onAddAttendance) {
      onAddAttendance({
        staffId: targetUser.id,
        date: addingForm.date,
        checkIn: addingForm.checkIn,
        checkOut: addingForm.checkOut,
        hoursWorked: addingForm.hoursWorked,
        standardHours: addingForm.standardHours
      });
      setIsAddingAttendance(false);
    }
  };

  const handleBulkUpdateStandardHours = () => {
    // Generate dates between fromDate and toDate
    const d = new Date(bulkForm.fromDate);
    const end = new Date(bulkForm.toDate);
    const dateStrings: string[] = [];
    while (d <= end) {
      dateStrings.push(d.toISOString().split('T')[0]);
      d.setDate(d.getDate() + 1);
    }

    const targetUsers = bulkForm.applyToAll ? (users || []) : [targetUser];
    
    // For every user and every date, if they have an attendance record, update it.
    // If not, maybe create one? The prompt says "change working hour ... from date to date".
    // We'll update their 'standardWorkingHours' via user limits if applyToAll is requested,
    // but the prompt is specifically about from-to dates, so updating records is safest.
    dateStrings.forEach(dateStr => {
      const dCheck = new Date(dateStr);
      const isWeekendDays = (calendarConfig.workingWeekends && calendarConfig.workingWeekends.length > 0) 
        ? calendarConfig.workingWeekends 
        : [0, 6];
      const isWeekend = isWeekendDays.includes(dCheck.getDay());
      const isPublicHoliday = (calendarConfig.publicHolidays || []).some(h => 
        dateStr >= h.startDate && dateStr <= h.endDate
      );

      // Only apply bulk update to normal work days, or if the target hours is 0 (to clear overrides)
      if ((!isWeekend && !isPublicHoliday) || bulkForm.standardHours === 0) {
        targetUsers.forEach(u => {
          const existing = attendance.find(a => a.staffId === u.id && a.date === dateStr);
          if (existing && onUpdateAttendance) {
            onUpdateAttendance(existing.id, { standardHours: bulkForm.standardHours });
          } else if (onAddAttendance && bulkForm.standardHours !== targetStdHours) {
            // Create a "standard hours override" record even if they haven't clocked in yet
            // Use 'OVERRIDE' as a marker so it doesn't count as a real attendance check-in
            onAddAttendance({
              staffId: u.id,
              date: dateStr,
              checkIn: 'OVERRIDE',
              checkOut: 'OVERRIDE',
              hoursWorked: 0,
              standardHours: bulkForm.standardHours
            });
          }
        });
      }
    });
    setIsBulkUpdating(false);
  };

  const handleSaveLimits = () => {
    if (onUpdateUser) {
      onUpdateUser(targetUser.id, limitsForm);
      setIsEditingLimits(false);
    }
  };

  // Ensure clock actions are disabled if we view someone else
  const isViewingSelf = targetUser.id === user.id;

  return (
    <div className="p-4 space-y-6 pb-24 h-full overflow-y-auto">
      {/* Admin View Selector */}
      {isAdminView && (
        <div className="bg-[var(--bg-secondary)] p-3 rounded-2xl border border-brand-blue/30 flex items-center gap-3">
          <Shield className="text-brand-blue shrink-0" size={16} />
          <div className="flex-1">
            <select 
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full bg-transparent text-sm font-black text-[var(--text-primary)] focus:outline-none"
            >
              <option value={user.id}>My Dashboard (You)</option>
              {users.filter(u => u.id !== user.id).map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Attendance Header & Quick Bio */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 flex items-center justify-center">
            <Clock className="text-brand-blue" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight">Time Clock</h1>
            <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">{targetUser.name}</p>
          </div>
        </div>
        {isViewingSelf && (
          <button 
            onClick={() => setIsRequestingLeave(true)}
            className="p-3 bg-brand-blue text-white rounded-2xl shadow-lg shadow-brand-blue/20 hover:scale-105 transition-all"
          >
            <Plus size={20} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Monthly Summary Box */}
        <div className="bg-[var(--bg-secondary)] p-5 rounded-3xl border border-[var(--border-color)] flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h2 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-1">Target Summary</h2>
              <p className="text-sm font-black text-[var(--text-primary)] uppercase">{format(now, 'MMMM')}</p>
            </div>
            <div className="p-2 bg-brand-blue/10 rounded-xl text-brand-blue">
              <Clock size={16} />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center py-1 border-b border-[var(--border-color)]/30">
              <span className="text-[8px] font-black text-[var(--text-secondary)] uppercase">Target</span>
              <span className="text-xs font-black">{expectedMonthHours.toFixed(1)} hrs</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-[var(--border-color)]/30">
              <span className="text-[8px] font-black text-[var(--text-secondary)] uppercase">Worked</span>
              <span className="text-xs font-black text-brand-blue">{expectedActuallyWorkedHoursTotal.toFixed(1)} hrs</span>
            </div>
             <div className="flex justify-between items-center py-1">
              <span className="text-[8px] font-black text-[var(--text-secondary)] uppercase">Diff</span>
              <span className={`text-xs font-black ${expectedActuallyWorkedHoursTotal >= expectedMonthHours ? 'text-green-500' : 'text-brand-orange'}`}>
                {(expectedActuallyWorkedHoursTotal - expectedMonthHours).toFixed(1)} hrs
              </span>
            </div>
          </div>
        </div>

        {/* Leave Balance Box */}
        <div className="bg-[var(--bg-secondary)] p-5 rounded-3xl border border-[var(--border-color)] flex flex-col justify-between group relative">
          {isAdminView && (
            <button 
              onClick={() => setIsEditingLimits(!isEditingLimits)}
              className="absolute top-3 right-3 text-[var(--text-secondary)] hover:text-brand-blue opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Edit3 size={14} />
            </button>
          )}

          {isEditingLimits ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[8px] font-black uppercase text-[var(--text-secondary)]">Yearly</span>
                <input 
                  type="number" 
                  value={limitsForm.yearlyLeaveDays} 
                  onChange={(e) => setLimitsForm(prev => ({...prev, yearlyLeaveDays: Number(e.target.value)}))}
                  className="w-12 bg-[var(--bg-primary)] text-xs font-black p-1 rounded text-center border border-[var(--border-color)]"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[8px] font-black uppercase text-[var(--text-secondary)]">Comp Off</span>
                <input 
                  type="number" 
                  value={limitsForm.remainingCompOff} 
                  onChange={(e) => setLimitsForm(prev => ({...prev, remainingCompOff: Number(e.target.value)}))}
                  className="w-12 bg-[var(--bg-primary)] text-xs font-black p-1 rounded text-center border border-[var(--border-color)]"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[8px] font-black uppercase text-[var(--text-secondary)]">Std Hours</span>
                <input 
                  type="number" 
                  step="0.5"
                  value={limitsForm.standardWorkingHours} 
                  onChange={(e) => setLimitsForm(prev => ({...prev, standardWorkingHours: Number(e.target.value)}))}
                  className="w-12 bg-[var(--bg-primary)] text-xs font-black p-1 rounded text-center border border-[var(--border-color)]"
                />
              </div>
              <button 
                onClick={handleSaveLimits}
                className="w-full py-1 bg-brand-blue text-white text-[8px] font-black uppercase tracking-widest rounded transition-all"
              >
                Save
              </button>
            </div>
          ) : (
            <>
              <div>
                <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-1">
                  Leave Balance
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-brand-blue">{leaveBalance}</span>
                  <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase">/ {totalGrantedLeaves} days</span>
                </div>
              </div>
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-[var(--border-color)]">
                <div>
                  <p className="text-[8px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Early</p>
                  <p className="text-xs font-black text-brand-orange">{earlyLeaveCount}</p>
                </div>
                <div>
                   <p className="text-[8px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Comp Off</p>
                   <p className="text-xs font-black text-green-500">{compOffBalance}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Clock Actions - Only functional for self or admin */}
      {(isViewingSelf || isAdminView) && (
        <div className="bg-[var(--bg-secondary)] p-6 rounded-3xl border border-[var(--border-color)]">
          <h2 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-4">
            Clock Actions {isAdminView && !isViewingSelf && `for ${targetUser.name}`}
          </h2>
          <div className="flex gap-4">
            <button 
             onClick={() => onCheckIn(targetUser.id)}
             disabled={targetUser.checkInStatus === 'in'}
             className="flex-1 py-4 bg-[var(--bg-primary)] text-[10px] font-black uppercase tracking-widest rounded-2xl border border-[var(--border-color)] hover:border-brand-blue/30 transition-all disabled:opacity-50"
            >
              Check In
            </button>
            <button 
             onClick={() => onCheckOut(targetUser.id)}
             disabled={targetUser.checkInStatus === 'out'}
             className="flex-1 py-4 bg-brand-orange text-white text-[10px] font-black uppercase tracking-widest rounded-2xl border border-transparent shadow-lg shadow-brand-orange/20 hover:scale-105 transition-all disabled:opacity-50"
            >
              Check Out
            </button>
            {isAdminView && (
              <button 
                onClick={() => onUpdateUser?.(targetUser.id, { checkInStatus: 'out' })}
                className="p-4 bg-[var(--bg-primary)] text-[var(--text-secondary)] rounded-2xl border border-[var(--border-color)] hover:text-brand-blue transition-all"
                title="Reset Status"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      {isRequestingLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-[var(--bg-secondary)] w-full max-w-md p-6 rounded-3xl border border-[var(--border-color)] shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-black text-[var(--text-primary)] uppercase tracking-tight">Request Leave</h2>
              <button onClick={() => setIsRequestingLeave(false)} className="text-[var(--text-secondary)]">Cancel</button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Leave Type</label>
                <select 
                  value={newLeave.type}
                  onChange={(e) => setNewLeave({ ...newLeave, type: e.target.value as LeaveType })}
                  className="w-full p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] text-xs font-black uppercase tracking-wider focus:outline-none focus:border-brand-blue h-12"
                >
                  {Object.values(LeaveType).map(type => (
                    <option key={type} value={type}>{type.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Start Date</label>
                  <input 
                    type="date"
                    value={newLeave.startDate}
                    onChange={(e) => setNewLeave({ ...newLeave, startDate: e.target.value })}
                    className="w-full p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] text-xs focus:outline-none focus:border-brand-blue"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">End Date</label>
                  <input 
                    type="date"
                    value={newLeave.endDate}
                    onChange={(e) => setNewLeave({ ...newLeave, endDate: e.target.value })}
                    className="w-full p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] text-xs focus:outline-none focus:border-brand-blue"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Reason</label>
                <textarea 
                  value={newLeave.reason}
                  onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                  placeholder="Why are you taking this leave?"
                  className="w-full p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] text-xs focus:outline-none focus:border-brand-blue h-24 resize-none"
                />
              </div>

              <button 
                onClick={handleRequestLeave}
                className="w-full py-4 bg-brand-blue text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/20 hover:scale-105 transition-all"
              >
                <Send size={16} />
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 p-1.5 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)]">
        <button 
          onClick={() => setActiveTab('attendance')} 
          className={`flex-1 py-3 text-[9px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${activeTab === 'attendance' ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' : 'text-[var(--text-secondary)]'}`}
        >
          Attendance
        </button>
        <button 
          onClick={() => setActiveTab('leave')} 
          className={`flex-1 py-3 text-[9px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${activeTab === 'leave' ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' : 'text-[var(--text-secondary)]'}`}
        >
          Leave
        </button>
      </div>

      {activeTab === 'attendance' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button 
              onClick={handleDownloadAttendance}
              className="flex-1 py-3 text-[9px] font-black uppercase tracking-[0.2em] rounded-xl border border-brand-blue text-brand-blue hover:bg-brand-blue hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <Download size={14} /> Download Sheet
            </button>
            {isAdminView && (
              <button 
                onClick={() => setIsAddingAttendance(!isAddingAttendance)}
                className="flex-1 py-3 text-[9px] font-black uppercase tracking-[0.2em] rounded-xl border border-brand-blue/30 text-brand-blue hover:bg-brand-blue/10 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={14} /> Add Record
              </button>
            )}
          </div>

          {isAdminView && (
            <div className="flex gap-2">
              <button 
                onClick={() => setIsBulkUpdating(!isBulkUpdating)}
                className="flex-1 py-3 text-[9px] font-black uppercase tracking-[0.2em] rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-brand-blue hover:text-brand-blue transition-all flex items-center justify-center gap-2"
              >
                <Settings size={14} /> Bulk Update Hours
              </button>
            </div>
          )}

          {isAddingAttendance && (
            <div className="p-4 bg-brand-blue/5 rounded-2xl border border-brand-blue/20 space-y-4">
              <div className="flex justify-between items-center">
                <p className="font-black text-[10px] uppercase tracking-widest text-brand-blue">New Record</p>
                <button onClick={() => setIsAddingAttendance(false)} className="text-[var(--text-secondary)]"><X size={14}/></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Date</label>
                  <input type="date" value={addingForm.date} onChange={(e) => setAddingForm({...addingForm, date: e.target.value})} className="w-full bg-[var(--bg-primary)] p-2 rounded-lg text-xs font-black border border-[var(--border-color)]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Check In</label>
                  <input type="time" value={addingForm.checkIn} onChange={(e) => {
                    const checkIn = e.target.value;
                    const checkOut = addingForm.checkOut;
                    let hoursWorked = addingForm.hoursWorked;
                    if(checkIn && checkOut) {
                       const [h1, m1] = checkIn.split(':').map(Number);
                       const [h2, m2] = checkOut.split(':').map(Number);
                       let diff = (h2 - h1) + (m2 - m1) / 60;
                       if(diff < 0) diff += 24;
                       hoursWorked = Math.round(diff * 10) / 10;
                    }
                    setAddingForm({...addingForm, checkIn, hoursWorked});
                  }} className="w-full bg-[var(--bg-primary)] p-2 rounded-lg text-xs font-black border border-[var(--border-color)]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Check Out</label>
                  <input type="time" value={addingForm.checkOut} onChange={(e) => {
                    const checkOut = e.target.value;
                    const checkIn = addingForm.checkIn;
                    let hoursWorked = addingForm.hoursWorked;
                    if(checkIn && checkOut) {
                       const [h1, m1] = checkIn.split(':').map(Number);
                       const [h2, m2] = checkOut.split(':').map(Number);
                       let diff = (h2 - h1) + (m2 - m1) / 60;
                       if(diff < 0) diff += 24;
                       hoursWorked = Math.round(diff * 10) / 10;
                    }
                    setAddingForm({...addingForm, checkOut, hoursWorked});
                  }} className="w-full bg-[var(--bg-primary)] p-2 rounded-lg text-xs font-black border border-[var(--border-color)]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Total Hours</label>
                  <input type="number" step="0.5" value={addingForm.hoursWorked} onChange={(e) => setAddingForm({...addingForm, hoursWorked: Number(e.target.value)})} className="w-full bg-[var(--bg-primary)] p-2 rounded-lg text-xs font-black border border-[var(--border-color)]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Standard Hours</label>
                  <input type="number" step="0.5" value={addingForm.standardHours} onChange={(e) => setAddingForm({...addingForm, standardHours: Number(e.target.value)})} className="w-full bg-[var(--bg-primary)] p-2 rounded-lg text-xs font-black border border-[var(--border-color)]" />
                </div>
                <button onClick={handleAddAttendance} className="col-span-2 py-3 bg-brand-blue text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
                  Save Attendance
                </button>
              </div>
            </div>
          )}

          {isBulkUpdating && (
            <div className="p-4 bg-brand-blue/5 rounded-2xl border border-brand-blue/20 space-y-4">
              <div className="flex justify-between items-center">
                <p className="font-black text-[10px] uppercase tracking-widest text-brand-blue">Bulk Update Standard Hours</p>
                <button onClick={() => setIsBulkUpdating(false)} className="text-[var(--text-secondary)]"><X size={14}/></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 flex items-center gap-2 mb-2">
                  <input type="checkbox" checked={bulkForm.applyToAll} onChange={e => setBulkForm({...bulkForm, applyToAll: e.target.checked})} id="applyAll" />
                  <label htmlFor="applyAll" className="text-xs font-black">Apply to Everyone (not just {targetUser.name})</label>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-widest text-[var(--text-secondary)]">From Date</label>
                  <input type="date" value={bulkForm.fromDate} onChange={(e) => setBulkForm({...bulkForm, fromDate: e.target.value})} className="w-full bg-[var(--bg-primary)] p-2 rounded-lg text-xs font-black border border-[var(--border-color)]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-widest text-[var(--text-secondary)]">To Date</label>
                  <input type="date" value={bulkForm.toDate} onChange={(e) => setBulkForm({...bulkForm, toDate: e.target.value})} className="w-full bg-[var(--bg-primary)] p-2 rounded-lg text-xs font-black border border-[var(--border-color)]" />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Expected Standard Hours</label>
                  <input type="number" step="0.5" value={bulkForm.standardHours} onChange={(e) => setBulkForm({...bulkForm, standardHours: Number(e.target.value)})} className="w-full bg-[var(--bg-primary)] p-2 rounded-lg text-xs font-black border border-[var(--border-color)]" />
                </div>
                <button onClick={handleBulkUpdateStandardHours} className="col-span-2 py-3 bg-brand-blue text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
                  Execute Update
                </button>
              </div>
            </div>
          )}

          {visibleAttendance.map(a => {
            const overtime = Math.max(0, a.hoursWorked - (a.standardHours ?? targetStdHours));
            const undertime = a.checkOut ? Math.max(0, (a.standardHours ?? targetStdHours) - a.hoursWorked) : 0;
            const isEditing = editingAttendanceId === a.id;

            return (
              <div key={a.id} className="p-4 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] group hover:border-brand-blue/30 transition-all">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="font-black text-[10px] uppercase tracking-widest text-brand-blue">{a.date}</p>
                      <div className="flex gap-2">
                        <button onClick={handleSaveAttendance} className="p-1.5 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20"><Check size={14}/></button>
                        <button onClick={() => setEditingAttendanceId(null)} className="p-1.5 bg-[var(--bg-primary)] text-[var(--text-secondary)] rounded-lg hover:text-[var(--text-primary)]"><X size={14}/></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Check In</label>
                        <input type="time" value={editingAttendanceForm.checkIn || ''} onChange={(e) => {
                          const checkIn = e.target.value;
                          const checkOut = editingAttendanceForm.checkOut;
                          let hoursWorked = editingAttendanceForm.hoursWorked;
                          if(checkIn && checkOut) {
                             const [h1, m1] = checkIn.split(':').map(Number);
                             const [h2, m2] = checkOut.split(':').map(Number);
                             let diff = (h2 - h1) + (m2 - m1) / 60;
                             if(diff < 0) diff += 24;
                             hoursWorked = Math.round(diff * 10) / 10;
                          }
                          setEditingAttendanceForm({...editingAttendanceForm, checkIn, hoursWorked});
                        }} className="w-full bg-[var(--bg-primary)] p-2 rounded-lg text-xs border border-[var(--border-color)]" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Check Out</label>
                        <input type="time" value={editingAttendanceForm.checkOut || ''} onChange={(e) => {
                          const checkOut = e.target.value;
                          const checkIn = editingAttendanceForm.checkIn;
                          let hoursWorked = editingAttendanceForm.hoursWorked;
                          if(checkIn && checkOut) {
                             const [h1, m1] = checkIn.split(':').map(Number);
                             const [h2, m2] = checkOut.split(':').map(Number);
                             let diff = (h2 - h1) + (m2 - m1) / 60;
                             if(diff < 0) diff += 24;
                             hoursWorked = Math.round(diff * 10) / 10;
                          }
                          setEditingAttendanceForm({...editingAttendanceForm, checkOut, hoursWorked});
                        }} className="w-full bg-[var(--bg-primary)] p-2 rounded-lg text-xs border border-[var(--border-color)]" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Total Hours</label>
                        <input type="number" step="0.5" value={editingAttendanceForm.hoursWorked || 0} onChange={(e) => setEditingAttendanceForm({...editingAttendanceForm, hoursWorked: Number(e.target.value)})} className="w-full bg-[var(--bg-primary)] p-2 rounded-lg text-xs border border-[var(--border-color)]" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Standard Hours</label>
                        <input type="number" step="0.5" value={editingAttendanceForm.standardHours ?? a.standardHours ?? targetStdHours} onChange={(e) => setEditingAttendanceForm({...editingAttendanceForm, standardHours: Number(e.target.value)})} className="w-full bg-[var(--bg-primary)] p-2 rounded-lg text-xs border border-[var(--border-color)]" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center relative">
                    <div className="space-y-1">
                      <p className="font-black text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">{a.date}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-black text-[var(--text-primary)] uppercase">{a.checkIn} — {a.checkOut || 'Active'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-sm">{a.hoursWorked.toFixed(1)} hrs</p>
                      {overtime > 0 && <p className="text-[8px] font-black text-green-500 uppercase tracking-widest">+{overtime.toFixed(1)} Extra</p>}
                      {undertime > 0 && <p className="text-[8px] font-black text-red-500 uppercase tracking-widest">-{undertime.toFixed(1)} Less</p>}
                    </div>
                    
                    {isAdminView && (
                      <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => {
                            setEditingAttendanceId(a.id);
                            setEditingAttendanceForm({ checkIn: a.checkIn, checkOut: a.checkOut, hoursWorked: a.hoursWorked, standardHours: a.standardHours ?? targetStdHours });
                          }} 
                          className="p-2 bg-[var(--bg-primary)] text-[var(--text-secondary)] rounded-full border border-[var(--border-color)] hover:text-brand-blue"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button 
                          onClick={() => {
                            if (window.confirm('Delete this attendance record?') && onDeleteAttendance) {
                              onDeleteAttendance(a.id);
                            }
                          }}
                          className="p-2 bg-[var(--bg-primary)] text-[var(--text-secondary)] rounded-full border border-[var(--border-color)] hover:text-red-500"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {visibleAttendance.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-[var(--border-color)] rounded-3xl">
              <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">No attendance records found</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'leave' && (
        <div className="space-y-3">
          {myLeaves.map(l => (
            <div key={l.id} className="p-5 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 group hover:border-brand-blue/30 transition-all relative">
                <div className="space-y-1 w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    <p className="font-black text-[8px] uppercase tracking-[0.2em] text-brand-blue bg-brand-blue/10 px-2 py-0.5 rounded inline-block">
                      {l.type.replace('_', ' ')}
                    </p>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                      l.status === LeaveStatus.APPROVED ? 'bg-green-500/10 text-green-500' : 
                      l.status === LeaveStatus.REJECTED ? 'bg-red-500/10 text-red-500' :
                      'bg-yellow-500/10 text-yellow-500'
                    }`}>
                      {l.status}
                    </span>
                  </div>
                  <p className="text-xs font-black text-[var(--text-primary)] uppercase tracking-tight">
                    {l.startDate === l.endDate ? l.startDate : `${l.startDate} TO ${l.endDate}`}
                  </p>
                  {l.reason && (
                    <p className="text-[10px] text-[var(--text-secondary)] italic mt-1 line-clamp-1">{l.reason}</p>
                  )}
                </div>
                
                {isAdminView && (
                  <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-[var(--border-color)]">
                    {l.status !== LeaveStatus.APPROVED && (
                      <button 
                        onClick={() => onUpdateLeave?.(l.id, { status: LeaveStatus.APPROVED })}
                        className="flex-1 sm:flex-none px-3 py-1.5 bg-green-500/10 text-green-500 hover:bg-green-500/20 text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center justify-center gap-1 transition-colors"
                      >
                        <Check size={12} /> Approve
                      </button>
                    )}
                    {l.status !== LeaveStatus.REJECTED && (
                      <button 
                        onClick={() => onUpdateLeave?.(l.id, { status: LeaveStatus.REJECTED })}
                        className="flex-1 sm:flex-none px-3 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center justify-center gap-1 transition-colors"
                      >
                        <X size={12} /> Reject
                      </button>
                    )}
                    {l.status !== LeaveStatus.PENDING && (
                      <button 
                        onClick={() => onUpdateLeave?.(l.id, { status: LeaveStatus.PENDING })}
                        className="flex-1 sm:flex-none px-3 py-1.5 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center justify-center gap-1 transition-colors"
                        title="Set to Pending"
                      >
                        <Clock size={12} />
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        if (window.confirm('Delete this leave request?')) {
                          onDeleteLeave?.(l.id);
                        }
                      }}
                      className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
            </div>
          ))}
          {myLeaves.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-[var(--border-color)] rounded-3xl">
              <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">No leave records found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

