
import React, { useState, useEffect } from 'react';
import { CalendarConfig, User, UserRole, SystemSettings } from '../types';
import { Trash2, Plus, Shield, User as UserIcon, Globe } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs, updateDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { ImageUpload } from './ImageUpload';

interface Props {
  config: CalendarConfig;
  onUpdateConfig: (config: CalendarConfig) => void;
  brandSettings: SystemSettings | null;
  users: User[];
  onUpdateUserRole: (userId: string, newRole: string) => void;
}

export const AdminSettingsView: React.FC<Props> = ({ config, onUpdateConfig, brandSettings, users, onUpdateUserRole }) => {
  const [newHoliday, setNewHoliday] = useState({ startDate: '', endDate: '', name: '', description: '' });
  const [newWorkingDate, setNewWorkingDate] = useState('');
  const [localBrand, setLocalBrand] = useState<Partial<SystemSettings>>(brandSettings || {
    appName: 'WONDERWEB PULSE',
    logoUrl: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (brandSettings) {
      setLocalBrand(brandSettings);
    }
  }, [brandSettings]);

  const addHoliday = () => {
    if (newHoliday.startDate && newHoliday.endDate && newHoliday.name) {
      onUpdateConfig({ 
        ...config, 
        publicHolidays: [
          ...(config.publicHolidays || []), 
          { 
            id: Math.random().toString(36).substr(2, 9),
            startDate: newHoliday.startDate, 
            endDate: newHoliday.endDate, 
            name: newHoliday.name, 
            description: newHoliday.description 
          }
        ] 
      });
      setNewHoliday({ startDate: '', endDate: '', name: '', description: '' });
    }
  };

  const removeHoliday = (id: string) => {
    onUpdateConfig({ ...config, publicHolidays: (config.publicHolidays || []).filter(h => h.id !== id) });
  };

  const addForcedWorkingDate = () => {
    if (newWorkingDate && !(config.forcedWorkingDates || []).includes(newWorkingDate)) {
      onUpdateConfig({
        ...config,
        forcedWorkingDates: [...(config.forcedWorkingDates || []), newWorkingDate]
      });
      setNewWorkingDate('');
    }
  };

  const removeForcedWorkingDate = (date: string) => {
    onUpdateConfig({
      ...config,
      forcedWorkingDates: (config.forcedWorkingDates || []).filter(d => d !== date)
    });
  };

  const saveBrandSettings = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      if (!db) return;
      await setDoc(doc(db, 'settings', 'global'), {
        ...localBrand,
        id: 'global',
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error("Error saving brand settings", err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-12 pb-8 h-full overflow-y-auto">
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-brand-blue/10 rounded-xl text-brand-blue border border-brand-blue/20">
            <Globe size={24} />
          </div>
          <h2 className="text-2xl font-black text-[var(--text-primary)]">Global Branding</h2>
        </div>

        <div className="bg-[var(--bg-secondary)] p-6 rounded-2xl border border-[var(--border-color)] space-y-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Application Name</label>
              <input 
                type="text"
                value={localBrand.appName || ''}
                onChange={(e) => setLocalBrand({...localBrand, appName: e.target.value})}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-brand-blue"
                placeholder="e.g. WONDERWEB PULSE"
              />
            </div>
            
            <ImageUpload 
              label="Application Logo"
              value={localBrand.logoUrl || ''}
              onChange={(val) => setLocalBrand({...localBrand, logoUrl: val})}
              maxSizeInKB={800}
              aspectRatio="any"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-[10px] font-black uppercase tracking-widest">
              {saveStatus === 'success' && <span className="text-brand-green">Identity Updated Successfully</span>}
              {saveStatus === 'error' && <span className="text-red-500">Failed to Update Identity</span>}
            </div>
            <button 
              onClick={saveBrandSettings}
              disabled={isSaving}
              className="bg-brand-blue text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-brand-blue/20 transform transition active:scale-95 disabled:opacity-50"
            >
              {isSaving ? 'Updating...' : 'Update Brand Identity'}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-black text-[var(--text-primary)]">User Management</h2>
        
        <div className="space-y-3">
          {users.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">No users found in the database.</p>
          ) : (
            users.map(u => (
              <div key={u.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue border border-brand-blue/20 overflow-hidden shrink-0">
                    {(u.imageUrl || u.avatar) ? (
                      <img src={u.imageUrl || u.avatar} alt={u.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <UserIcon size={20} />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-black text-[var(--text-primary)] leading-none">{u.name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Shield size={14} className="text-brand-blue" />
                  <select 
                    value={u.role} 
                    onChange={(e) => onUpdateUserRole(u.id, e.target.value)}
                    className="bg-brand-blue/5 border border-brand-blue/20 text-[10px] font-black uppercase tracking-widest text-brand-blue px-3 py-1.5 rounded-lg focus:outline-none"
                  >
                    <option value="Administrator">Administrator</option>
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="Staff">Staff</option>
                  </select>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-black text-[var(--text-primary)]">Manage Weekends</h2>
        <div className="bg-[var(--bg-secondary)] p-6 rounded-2xl border border-[var(--border-color)] shadow-sm">
          <p className="text-[10px] font-black uppercase text-[var(--text-secondary)] tracking-[0.2em] mb-4">Select days to be treated as non-working weekends:</p>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 0, label: 'Sunday' },
              { id: 1, label: 'Monday' },
              { id: 2, label: 'Tuesday' },
              { id: 3, label: 'Wednesday' },
              { id: 4, label: 'Thursday' },
              { id: 5, label: 'Friday' },
              { id: 6, label: 'Saturday' }
            ].map((day) => {
              const isWeekend = (config.workingWeekends || []).includes(day.id);
              return (
                <button
                  key={day.id}
                  onClick={() => {
                    const currentWeekends = config.workingWeekends || [];
                    const newWeekends = isWeekend
                      ? currentWeekends.filter(d => d !== day.id)
                      : [...currentWeekends, day.id];
                    onUpdateConfig({ ...config, workingWeekends: newWeekends });
                  }}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    isWeekend 
                      ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' 
                      : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:border-brand-blue/30'
                  }`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-[9px] text-[var(--text-secondary)] italic">Note: These days will be excluded from leave calculations and treated as non-working days.</p>
        </div>

        <div className="bg-[var(--bg-secondary)] p-6 rounded-2xl border border-[var(--border-color)] shadow-sm space-y-4">
          <div>
            <h3 className="text-xs font-black uppercase text-[var(--text-primary)] tracking-widest mb-1">Override Weekend to Working Day</h3>
            <p className="text-[9px] text-[var(--text-secondary)]">Select a specific weekend date (Sat/Sun) to convert it into a normal working day.</p>
          </div>
          
          <div className="flex gap-2">
            <input 
              type="date"
              value={newWorkingDate}
              onChange={(e) => setNewWorkingDate(e.target.value)}
              className="flex-1 p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] text-xs focus:outline-none focus:border-brand-blue"
            />
            <button 
              onClick={addForcedWorkingDate}
              disabled={!newWorkingDate}
              className="px-4 py-3 bg-brand-blue text-white rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {(config.forcedWorkingDates || []).sort().map(date => (
              <div key={date} className="flex items-center gap-2 bg-[var(--bg-primary)] border border-brand-blue/20 px-3 py-1.5 rounded-lg">
                <span className="text-[10px] font-black text-brand-blue">{date}</span>
                <button onClick={() => removeForcedWorkingDate(date)} className="text-red-500 hover:text-red-600">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-black text-[var(--text-primary)]">Manage Public Holidays</h2>
        
        <div className="bg-[var(--bg-secondary)] p-6 rounded-2xl border border-[var(--border-color)] space-y-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Start Date</label>
              <input 
                type="date"
                value={newHoliday.startDate}
                onChange={(e) => setNewHoliday({ ...newHoliday, startDate: e.target.value })}
                className="w-full p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] text-xs focus:outline-none focus:border-brand-blue"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">End Date</label>
              <input 
                type="date"
                value={newHoliday.endDate}
                onChange={(e) => setNewHoliday({ ...newHoliday, endDate: e.target.value })}
                className="w-full p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] text-xs focus:outline-none focus:border-brand-blue"
              />
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Holiday Name</label>
            <input 
              type="text"
              placeholder="e.g. National Day"
              value={newHoliday.name}
              onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
              className="w-full p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] text-xs focus:outline-none focus:border-brand-blue"
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Description (Optional)</label>
            <input 
              type="text"
              placeholder="Brief details about the holiday"
              value={newHoliday.description}
              onChange={(e) => setNewHoliday({ ...newHoliday, description: e.target.value })}
              className="w-full p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] text-xs focus:outline-none focus:border-brand-blue"
            />
          </div>

          <div className="flex justify-end">
            <button 
              onClick={addHoliday} 
              disabled={!newHoliday.startDate || !newHoliday.endDate || !newHoliday.name}
              className="px-6 py-3 bg-brand-blue text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-50"
            >
              <Plus size={16} />
              Add Public Holiday
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(config.publicHolidays || []).sort((a, b) => a.startDate.localeCompare(b.startDate)).map(h => (
            <div key={h.id} className="flex justify-between items-start p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] group hover:border-brand-blue/30 transition-all">
              <div className="space-y-1">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] font-black text-brand-blue bg-brand-blue/10 px-2 py-0.5 rounded uppercase tracking-widest">{h.startDate}</span>
                    <span className="text-[8px] text-[var(--text-secondary)] font-black">TO</span>
                    <span className="text-[8px] font-black text-brand-blue bg-brand-blue/10 px-2 py-0.5 rounded uppercase tracking-widest">{h.endDate}</span>
                  </div>
                  <p className="text-xs font-black text-[var(--text-primary)] uppercase tracking-tight">{h.name}</p>
                </div>
                {h.description && <p className="text-[10px] text-[var(--text-secondary)] leading-tight">{h.description}</p>}
              </div>
              <button onClick={() => removeHoliday(h.id)} className="text-[var(--text-secondary)] hover:text-red-500 p-1 rounded transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {(!config.publicHolidays || config.publicHolidays.length === 0) && (
            <div className="md:col-span-2 text-center py-12 border-2 border-dashed border-[var(--border-color)] rounded-2xl">
              <p className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-widest">No public holidays defined</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
