import React, { useState, useEffect } from 'react';
import { Task, User, TaskComment } from '../types';
import { Plus, Check, Trash2, Edit3, X, Save, Clock, MessageSquare, Send, Users, Warehouse } from 'lucide-react';
import { cn } from '../lib/utils';
import { collection, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface TaskViewProps {
  user: User;
  staff: User[];
  tasks: Task[];
}

const TaskComments: React.FC<{ taskId: string; user: User }> = ({ taskId, user }) => {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'tasks', taskId, 'comments'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskComment)));
    });
    return () => unsubscribe();
  }, [taskId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    await addDoc(collection(db, 'tasks', taskId, 'comments'), {
      taskId,
      userId: user.id,
      userName: user.name,
      text: newComment.trim(),
      createdAt: serverTimestamp()
    });
    setNewComment('');
  };

  return (
    <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
      <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] mb-2 flex items-center gap-2">
        <MessageSquare size={12} /> Comments
      </h4>
      <div className="space-y-3 mb-4 max-h-40 overflow-y-auto scrollbar-hide">
        {comments.map(c => (
          <div key={c.id} className="text-[10px]">
            <div className="flex justify-between mb-1">
              <span className="font-bold text-brand-blue">{c.userName}</span>
              <span className="text-[var(--text-secondary)] opacity-60">
                {c.createdAt?.toDate ? c.createdAt.toDate().toLocaleString([], { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
            </div>
            <p className="bg-[var(--bg-primary)] p-2 rounded-lg leading-relaxed">{c.text}</p>
          </div>
        ))}
        {comments.length === 0 && <p className="text-[10px] text-[var(--text-secondary)] italic">No comments yet</p>}
      </div>
      <form onSubmit={handleAddComment} className="flex gap-2">
        <input 
          className="flex-1 bg-[var(--bg-primary)] p-2 rounded-lg text-xs outline-none focus:ring-1 focus:ring-brand-blue" 
          placeholder="Add a comment..."
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
        />
        <button type="submit" className="bg-brand-blue text-white p-2 rounded-lg hover:opacity-80 transition-opacity">
          <Send size={14}/>
        </button>
      </form>
    </div>
  );
};

export const TaskView: React.FC<TaskViewProps> = ({ user, staff, tasks }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTask, setNewTask] = useState<Partial<Task>>({ status: 'todo', assignedTo: [] });
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  const roleLower = (user.role || 'staff').toLowerCase();
  const isAdmin = roleLower.includes('admin') || user.email?.toLowerCase().trim() === 'production@wonderweb.ae';

  const filteredTasks = isAdmin ? tasks : (tasks || []).filter(t => t.assignedTo?.includes(user.id));
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
    <div key={task.id} className="p-4 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] transition-all">
        {editingTask?.id === task.id ? (
            <div className="space-y-4 p-4 bg-[var(--bg-primary)] rounded-xl border border-brand-blue/30 shadow-lg">
                 <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-[var(--text-secondary)] ml-1">Task Title</label>
                   <input className="w-full bg-[var(--bg-secondary)] p-2 rounded-lg text-sm border border-[var(--border-color)] outline-none focus:border-brand-blue" value={editingTask.title || ''} onChange={e => setEditingTask({...editingTask, title: e.target.value})} />
                 </div>
                 
                 <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-[var(--text-secondary)] ml-1">Description</label>
                   <textarea className="w-full bg-[var(--bg-secondary)] p-2 rounded-lg text-sm border border-[var(--border-color)] outline-none focus:border-brand-blue h-24 resize-none" value={editingTask.description || ''} onChange={e => setEditingTask({...editingTask, description: e.target.value})} />
                 </div>

                 <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-[var(--text-secondary)] ml-1">Due Date & Time</label>
                   <input className="w-full bg-[var(--bg-secondary)] p-2 rounded-lg text-sm border border-[var(--border-color)] outline-none focus:border-brand-blue" type="datetime-local" value={editingTask.dueDate || ''} onChange={e => setEditingTask({...editingTask, dueDate: e.target.value})} />
                 </div>

                 {isAdmin && (
                   <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase text-[var(--text-secondary)] ml-1">Assignees</label>
                     <div className="flex flex-wrap gap-1.5 p-2 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)]">
                       {staff.map(s => (
                         <button 
                           key={s.id} 
                           onClick={(e) => { e.stopPropagation(); toggleAssignee(s.id, true); }}
                           className={`px-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                             editingTask.assignedTo?.includes(s.id) 
                               ? 'bg-brand-blue text-white border-brand-blue shadow-sm' 
                               : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-brand-blue/50'
                           }`}
                         >
                           {s.name}
                         </button>
                       ))}
                     </div>
                   </div>
                 )}

                <div className="flex gap-2 pt-2">
                  <button onClick={handleUpdateTask} title="Save Changes" className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white p-2.5 rounded-xl transition-all shadow-md active:scale-95">
                    <Save size={16}/>
                    <span className="text-[10px] font-black uppercase tracking-wider">Save Changes</span>
                  </button>
                  <button onClick={() => setEditingTask(null)} title="Cancel" className="bg-[var(--bg-secondary)] hover:bg-[var(--border-color)] text-[var(--text-primary)] p-2.5 rounded-xl transition-all border border-[var(--border-color)] active:scale-95">
                    <X size={16}/>
                  </button>
                </div>
            </div>
        ) : (
            <>
                <div className="space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0" onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}>
                      <div className="cursor-pointer group">
                        <h3 className={`font-black text-sm uppercase tracking-tight transition-colors group-hover:text-brand-blue truncate ${task.status === 'completed' ? 'line-through opacity-50' : ''}`}>
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="text-[10px] text-[var(--text-secondary)] mt-1 line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className={`shrink-0 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${task.status === 'completed' ? 'bg-brand-green/10 text-brand-green border border-brand-green/20' : 'bg-brand-orange/10 text-brand-orange border border-brand-orange/20'}`}>
                      {task.status}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[var(--border-color)]/20">
                    <div className="flex items-center gap-1.5">
                      <Clock size={10} className="text-brand-blue/60" />
                      <span className="text-[9px] font-bold text-[var(--text-secondary)]">
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'No due date'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users size={10} className="text-brand-blue/60" />
                      <span className="text-[9px] font-bold text-[var(--text-secondary)]">
                        By: {staff.find(s => s.id === task.createdBy)?.name || 'System'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Plus size={10} className="text-brand-blue/60" />
                      <div className="flex -space-x-1">
                        {(task.assignedTo || []).map(id => (
                          <div 
                            key={id} 
                            title={staff.find(s => s.id === id)?.name}
                            className="w-4 h-4 rounded-full bg-[var(--bg-primary)] border border-[var(--bg-secondary)] flex items-center justify-center text-[6px] font-black"
                          >
                            {staff.find(s => s.id === id)?.name.charAt(0)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleStatusChange(task, task.status === 'completed' ? 'todo' : 'completed')}
                        className={`p-2 rounded-xl transition-all shadow-sm active:scale-95 ${task.status === 'completed' ? 'bg-brand-green text-white shadow-brand-green/20' : 'bg-[var(--bg-primary)] text-brand-green border border-[var(--border-color)] hover:bg-brand-green/5'}`}
                        title={task.status === 'completed' ? "Mark Active" : "Mark Complete"}
                      >
                        <Check size={14} />
                      </button>
                      <button 
                        onClick={() => setEditingTask(task)} 
                        className="p-2 bg-[var(--bg-primary)] text-brand-blue border border-[var(--border-color)] rounded-xl hover:bg-brand-blue/5 transition-all shadow-sm active:scale-95"
                        title="Edit Task"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                        className={`p-2 rounded-xl border transition-all shadow-sm active:scale-95 flex items-center gap-1.5 ${expandedTask === task.id ? 'bg-brand-orange text-white border-brand-orange shadow-brand-orange/20' : 'bg-[var(--bg-primary)] text-brand-orange border border-[var(--border-color)] hover:bg-brand-orange/5'}`}
                        title="Comments"
                      >
                        <MessageSquare size={14} />
                      </button>
                    </div>
                    {isAdmin && (
                      <button 
                        onClick={() => { if(confirm('Delete task?')) deleteDoc(doc(db, 'tasks', task.id)) }} 
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all active:scale-95"
                        title="Delete Task"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  {expandedTask === task.id && <TaskComments taskId={task.id} user={user} />}
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
