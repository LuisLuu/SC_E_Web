import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle2, Circle, Archive, ArchiveRestore, Loader2, ServerCrash, X, FileText, AlertCircle, Calendar } from 'lucide-react';

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('active');
  const [selectedTask, setSelectedTask] = useState(null); 

  useEffect(() => {
    fetchTasks();
  }, [viewMode]);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const isArchived = viewMode === 'archived' ? '1' : '0';
      const response = await fetch(`http://localhost:3001/api/tasks?archived=${isArchived}`);
      if (!response.ok) throw new Error('Failed to connect to database.');
      const data = await response.json();
      setTasks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    try {
      const response = await fetch('http://localhost:3001/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newTask, category: 'general', priority: 'low' }),
      });
      if (!response.ok) throw new Error('Server rejected the task');
      const createdTask = await response.json();
      if (viewMode === 'active') {
        setTasks([createdTask, ...tasks]);
      }
      setNewTask('');
    } catch (err) {
      alert("Failed to save task to database. Is the server running?");
    }
  };

  const updateTaskDetails = async (updates) => {
    setTasks(tasks.map(t => t.id === selectedTask.id ? { ...t, ...updates } : t));
    setSelectedTask({ ...selectedTask, ...updates });
    try {
      await fetch(`http://localhost:3001/api/tasks/${selectedTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch (err) {
      fetchTasks(); 
    }
  };

  const toggleTask = async (id, currentStatus) => {
    const newStatus = currentStatus === 1 ? 0 : 1;
    
    // UI Fix: Only remove from view if unchecking in archive, or checking in active
    if (viewMode === 'active' || newStatus === 0) {
      setTasks(tasks.filter(t => t.id !== id)); 
    } else {
      // If you are in the archive and check an unchecked task, it stays visible in the archive
      setTasks(tasks.map(t => t.id === id ? { ...t, done: 1 } : t));
    }
    
    try {
      const payload = newStatus === 0 ? { done: 0, archived: 0 } : { done: 1 };
      
      await fetch(`http://localhost:3001/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) { 
      fetchTasks(); 
    }
  };

  // UI Fix: Context-aware toggle ignoring the raw database flag
  const handleArchiveToggle = async (id) => {
    setTasks(tasks.filter(t => t.id !== id)); 
    
    try {
      // If in Active: Force Archive. If in Archive: Force Restore (undone + unarchived).
      const payload = viewMode === 'active' ? { archived: 1 } : { archived: 0, done: 0 };
      
      await fetch(`http://localhost:3001/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) { 
      fetchTasks(); 
    }
  };

  const deleteTask = async (id) => {
    setTasks(tasks.filter(t => t.id !== id));
    try {
      await fetch(`http://localhost:3001/api/tasks/${id}`, { method: 'DELETE' });
    } catch (err) { fetchTasks(); }
  };

  return (
    <div className="animate-fade-in h-full flex flex-col relative overflow-hidden">
      <header className="mb-8 shrink-0 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold mb-1">Project Roadmap</h1>
          <p className="text-gray-500 text-sm">Track hardware deployment and software milestones</p>
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button onClick={() => setViewMode('active')} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${viewMode === 'active' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Active</button>
          <button onClick={() => setViewMode('archived')} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${viewMode === 'archived' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Archived</button>
        </div>
      </header>

      <div className="flex-grow bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col min-h-0">
        
        {viewMode === 'active' && (
          <form onSubmit={addTask} className="flex gap-4 mb-8 shrink-0">
            <input type="text" value={newTask} onChange={(e) => setNewTask(e.target.value)} disabled={isLoading || error} placeholder="Add a new system task..." className="flex-grow bg-gray-50 border border-gray-200 rounded-xl px-5 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50" />
            <button type="submit" disabled={isLoading || error || !newTask.trim()} className="bg-[#111111] hover:bg-[#2d2d2d] disabled:bg-gray-300 text-white px-6 py-3 rounded-xl text-sm font-semibold flex items-center gap-2">
              <Plus size={18} /> Add
            </button>
          </form>
        )}

        <div className="flex-grow overflow-y-auto pr-2 flex flex-col gap-2">
          {error && <div className="text-center text-red-400 mt-10"><ServerCrash className="mx-auto mb-2" />{error}</div>}
          {isLoading && !error && <div className="text-center text-gray-400 mt-10"><Loader2 className="animate-spin mx-auto mb-2" />Querying database...</div>}
          {!isLoading && !error && tasks.length === 0 && <div className="text-center text-gray-400 mt-10 text-sm">No tasks found.</div>}

          {!isLoading && !error && tasks.map(task => (
            <div key={task.id} className="group flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all">
              <div className="flex items-center gap-4 flex-grow">
                
                <button onClick={() => toggleTask(task.id, task.done)} className="shrink-0">
                  {task.done === 1 ? <CheckCircle2 className="text-blue-500" size={24} /> : <Circle className="text-gray-300" size={24} />}
                </button>
                
                <div className="flex flex-col flex-grow cursor-pointer" onClick={() => setSelectedTask(task)}>
                  <span className={`text-sm ${task.done === 1 ? 'line-through text-gray-400' : 'text-gray-700 font-medium'}`}>
                    {task.text}
                  </span>
                  <div className="flex gap-3 mt-1">
                    {task.priority === 'high' && <span className="text-[10px] text-red-500 font-bold uppercase">High Priority</span>}
                    {task.due_date && <span className="text-[10px] text-blue-500 font-bold uppercase">Due: {task.due_date}</span>}
                    {task.notes && <span className="text-[10px] text-gray-400 uppercase">Contains Notes</span>}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => handleArchiveToggle(task.id)} className="text-gray-300 hover:text-blue-500 p-2">
                  {viewMode === 'active' ? <Archive size={18} /> : <ArchiveRestore size={18} />}
                </button>
                <button onClick={() => deleteTask(task.id)} className="text-gray-300 hover:text-red-500 p-2">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedTask && (
        <div className="fixed inset-0 bg-black/10 z-40" onClick={() => setSelectedTask(null)} />
      )}

      <div className={`fixed top-0 right-0 h-full w-full md:w-[450px] bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col border-l border-gray-100 ${selectedTask ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedTask && (
          <>
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
              <h2 className="font-bold text-lg text-gray-800">Task Parameters</h2>
              <button onClick={() => setSelectedTask(null)} className="text-gray-400 hover:text-gray-700"><X size={24} /></button>
            </div>
            
            <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-8">
              
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  <FileText size={16} /> Extended Notes (AI Readable)
                </label>
                <textarea 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500 min-h-[150px] resize-none"
                  placeholder="Paste terminal logs, hardware specs, or specific agent instructions here..."
                  value={selectedTask.notes || ''}
                  onChange={(e) => updateTaskDetails({ notes: e.target.value })}
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  <AlertCircle size={16} /> Execution Priority
                </label>
                <select 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500 appearance-none"
                  value={selectedTask.priority || 'low'}
                  onChange={(e) => updateTaskDetails({ priority: e.target.value })}
                >
                  <option value="low">Low (Background Task)</option>
                  <option value="medium">Medium (Standard)</option>
                  <option value="high">High (Critical / Blocker)</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  <Calendar size={16} /> System Deadline
                </label>
                <input 
                  type="date"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500"
                  value={selectedTask.due_date || ''}
                  onChange={(e) => updateTaskDetails({ due_date: e.target.value })}
                />
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Tasks;