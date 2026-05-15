import React, { useState } from 'react';
import { Task, User } from '../types';
import { Plus, Check, Trash2, Edit3, X, Save } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface TaskViewProps {
  user: User;
  staff: User[];
  tasks: Task[];
}

export const TaskView: React.FC<TaskViewProps> = ({ user, staff, tasks }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTask, setNewTask] = useState<Partial<Task>>({ status: 'todo', assignedTo: [] });
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const isAdmin = ['Administrator', 'Admin'].includes(user.role);

  const filteredTasks = isAdmin ? tasks : tasks.filter(t => t.assignedTo?.includes(user.id));
  const pendingTasks = filteredTasks.filter(t => t.status !== 'completed');
  const completedTasks = filteredTasks.filter(t => t.status === 'completed');

  const handleAddTask = async () => {
    if (!newTask.title || !newTask.assignedTo || newTask.assignedTo.length === 0) return;
    
    await addDoc(collection(db, 'tasks'), {
      ...newTask,
      createdBy: user.id,
      createdAt: serverTimestamp()
    });

    for (const userId of newTask.assignedTo) {
      await addDoc(collection(db, 'notifications'), {
        userId,
        title: 'New Task Assigned',
        message: `Task: ${newTask.title} has been assigned to you.`,
        read: false,
        type: 'general',
        createdAt: serverTimestamp()
      });
    }

    setNewTask({ status: 'todo', assignedTo: [] });
    setIsAdding(false);
  };

  const handleUpdateTask = async () => {
      if (!editingTask) return;
      await updateDoc(doc(db, 'tasks', editingTask.id), { ...editingTask, updatedAt: serverTimestamp() });
      setEditingTask(null);
  };

  const toggleAssignee = (userId: string, isEditing: boolean = false) => {
    if (isEditing && editingTask) {
        const assignedTo = editingTask.assignedTo || [];
        setEditingTask({
            ...editingTask,
             assignedTo: assignedTo.includes(userId)
          ? assignedTo.filter(id => id !== userId)
          : [...assignedTo, userId]
        })
    } else {
        setNewTask(prev => {
        const assignedTo = prev.assignedTo || [];
        return {
            ...prev,
            assignedTo: assignedTo.includes(userId)
            ? assignedTo.filter(id => id !== userId)
            : [...assignedTo, userId]
        };
        });
    }
  };

  const handleStatusChange = async (task: Task, status: Task['status']) => {
    await updateDoc(doc(db, 'tasks', task.id), { status });
  };

  const renderTask = (task: Task) => (
    <div key={task.id} className="p-4 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)]">
        {editingTask?.id === task.id ? (
            <div className="space-y-2">
                 <input className="w-full bg-[var(--bg-primary)] p-2 rounded-lg" value={editingTask.title} onChange={e => setEditingTask({...editingTask, title: e.target.value})} />
                 <input className="w-full bg-[var(--bg-primary)] p-2 rounded-lg" type="datetime-local" value={editingTask.dueDate} onChange={e => setEditingTask({...editingTask, dueDate: e.target.value})} />
                <button onClick={handleUpdateTask} className="bg-green-500 text-white p-2 rounded-lg"><Save size={16}/></button>
                <button onClick={() => setEditingTask(null)} className="bg-red-500 text-white p-2 rounded-lg"><X size={16}/></button>
            </div>
        ) : (
            <>
                <h3 className="font-bold text-lg">{task.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-2">{task.description}</p>
                <p className="text-xs">Assigned to: {task.assignedTo?.map(id => staff.find(s => s.id === id)?.name).join(', ') || 'Unknown'}</p>
                <p className="text-xs">Due: {new Date(task.dueDate).toLocaleString()}</p>
                <div className="flex gap-2 mt-4">
                    <button
                    onClick={() => handleStatusChange(task, task.status === 'completed' ? 'todo' : 'completed')}
                    className={`${task.status === 'completed' ? 'bg-gray-400' : 'bg-green-500'} text-white p-1 rounded transition-colors`}
                    >
                    {task.status === 'completed' ? <X size={16} /> : <Check size={16} />}
                    </button>
                    <button onClick={() => setEditingTask(task)} className="bg-brand-blue text-white p-1 rounded"><Edit3 size={16}/></button>
                    {isAdmin && <button onClick={() => deleteDoc(doc(db, 'tasks', task.id))} className="bg-red-500 text-white p-1 rounded"><Trash2 size={16}/></button>}
                </div>
            </>
        )}
    </div>
  );

  return (
    <div className="space-y-6 text-[var(--text-primary)]">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black uppercase tracking-widest text-[var(--text-primary)]">Tasks</h2>
        {isAdmin && <button onClick={() => setIsAdding(true)} className="bg-brand-blue text-white p-2 rounded-lg"><Plus size={20}/></button>}
      </div>

      {isAdding && (
        <div className="p-4 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)]">
          <input className="w-full bg-[var(--bg-primary)] p-2 rounded-lg mb-2" placeholder="Title" value={newTask.title || ''} onChange={e => setNewTask({...newTask, title: e.target.value})} />
          <textarea className="w-full bg-[var(--bg-primary)] p-2 rounded-lg mb-2" placeholder="Description" value={newTask.description || ''} onChange={e => setNewTask({...newTask, description: e.target.value})} />
          
          <div className="mb-2">
            <label className="text-xs font-bold block mb-1">Assignees:</label>
            <div className="flex flex-wrap gap-2">
              {staff.map(s => (
                <button 
                  key={s.id} 
                  onClick={() => toggleAssignee(s.id)}
                  className={`p-2 rounded-lg text-xs ${newTask.assignedTo?.includes(s.id) ? 'bg-brand-blue text-white' : 'bg-[var(--bg-primary)]'}`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
          <input className="w-full bg-[var(--bg-primary)] p-2 rounded-lg mb-2" type="datetime-local" value={newTask.dueDate || ''} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} />
          <div className="flex gap-2">
            <button onClick={handleAddTask} className="bg-green-500 text-white p-2 rounded-lg"><Check size={20}/></button>
            <button onClick={() => setIsAdding(false)} className="bg-red-500 text-white p-2 rounded-lg"><X size={20}/></button>
          </div>
        </div>
      )}

      <div>
        <h3 className="font-black text-lg mb-4">Pending</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingTasks.map(renderTask)}
        </div>
      </div>
      <div>
        <h3 className="font-black text-lg mb-4">Completed</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedTasks.map(renderTask)}
        </div>
      </div>
    </div>
  );
};
