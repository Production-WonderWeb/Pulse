
import React, { useState, useEffect } from 'react';
import { CalendarConfig, User, UserRole } from '../types';
import { Trash2, Plus, Shield, User as UserIcon } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

interface Props {
  config: CalendarConfig;
  onUpdateConfig: (config: CalendarConfig) => void;
}

export const AdminSettingsView: React.FC<Props> = ({ config, onUpdateConfig }) => {
  const [newHoliday, setNewHoliday] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    if (!db) {
      setLoadingUsers(false);
      return;
    }
    try {
      const querySnapshot = await getDocs(collection(db, 'profiles'));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (data) {
        setUsers(data.map((p: any) => ({
          id: p.id,
          name: p.display_name || p.email?.split('@')[0] || 'Unknown User',
          email: p.email || '',
          role: (p.role as UserRole) || 'Staff',
          imageUrl: p.avatar_url,
        })));
      }
    } catch (err) {
      console.error("Error fetching users", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const addHoliday = () => {
    if (newHoliday && !config.publicHolidays.includes(newHoliday)) {
      onUpdateConfig({ ...config, publicHolidays: [...config.publicHolidays, newHoliday] });
      setNewHoliday('');
    }
  };

  const removeHoliday = (date: string) => {
    onUpdateConfig({ ...config, publicHolidays: config.publicHolidays.filter(h => h !== date) });
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'profiles', userId), { role: newRole });
      fetchUsers();
    } catch (err) {
      console.error("Error updating user role", err);
    }
  };

  return (
    <div className="p-6 space-y-8">
      <div className="space-y-6">
        <h2 className="text-2xl font-black text-[var(--text-primary)]">User Management</h2>
        
        {loadingUsers ? (
          <p className="text-sm text-[var(--text-secondary)]">Loading users...</p>
        ) : (
          <div className="space-y-3">
            {users.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">No users found in the database.</p>
            ) : (
              users.map(u => (
                <div key={u.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue border border-brand-blue/20 overflow-hidden shrink-0">
                      {u.imageUrl ? (
                        <img src={u.imageUrl} alt={u.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
                      onChange={(e) => updateUserRole(u.id, e.target.value)}
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
        )}
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-black text-[var(--text-primary)]">Manage Public Holidays</h2>
        <div className="flex gap-2">
          <input 
            type="date"
            value={newHoliday}
            onChange={(e) => setNewHoliday(e.target.value)}
            className="flex-1 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)]"
          />
          <button onClick={addHoliday} className="p-3 bg-brand-blue text-white rounded-xl">
            <Plus size={20} />
          </button>
        </div>
        <div className="space-y-2">
          {config.publicHolidays.sort().map(h => (
            <div key={h} className="flex justify-between items-center p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)]">
              <span>{h}</span>
              <button onClick={() => removeHoliday(h)} className="text-red-500">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
