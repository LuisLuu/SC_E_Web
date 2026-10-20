import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, ServerCrash, Terminal, Plus, Trash2, Edit2, MessageSquare, Check, X } from 'lucide-react';

const Agent = () => {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  
  // Session editing state
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editTitleInput, setEditTitleInput] = useState('');

  const messagesEndRef = useRef(null);
  const logsEndRef = useRef(null);

  // Fetch all sessions on mount
  useEffect(() => {
    fetchSessions();
  }, []);

  // Fetch messages when activeSessionId changes
  useEffect(() => {
    if (activeSessionId) {
      fetchSessionMessages(activeSessionId);
    } else {
      setMessages([]);
    }
  }, [activeSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, logs]);

  const fetchSessions = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/sessions');
      const data = await res.json();
      setSessions(data);
      if (data.length > 0 && !activeSessionId) {
        setActiveSessionId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    }
  };

  const fetchSessionMessages = async (sessionId) => {
    try {
      const res = await fetch(`http://localhost:3001/api/sessions/${sessionId}/messages`);
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  };

  const createNewSession = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `Session ${sessions.length + 1}` })
      });
      const newSession = await res.json();
      setSessions([newSession, ...sessions]);
      setActiveSessionId(newSession.id);
    } catch (err) {
      console.error("Failed to create session:", err);
    }
  };

  const deleteSession = async (id, e) => {
    e.stopPropagation();
    try {
      await fetch(`http://localhost:3001/api/sessions/${id}`, { method: 'DELETE' });
      const updated = sessions.filter(s => s.id !== id);
      setSessions(updated);
      if (activeSessionId === id) {
        setActiveSessionId(updated.length > 0 ? updated[0].id : null);
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };

  const startRenameSession = (session, e) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitleInput(session.title);
  };

  const saveRenameSession = async (id, e) => {
    e.stopPropagation();
    if (!editTitleInput.trim()) return;
    try {
      await fetch(`http://localhost:3001/api/sessions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitleInput.trim() })
      });
      setSessions(sessions.map(s => s.id === id ? { ...s, title: editTitleInput.trim() } : s));
      setEditingSessionId(null);
    } catch (err) {
      console.error("Failed to rename session:", err);
    }
  };

  const addLog = (type, message, rawData = null) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { id: Date.now() + Math.random(), time, type, message, rawData }]);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    let targetSessionId = activeSessionId;
    
    if (!targetSessionId) {
      const res = await fetch('http://localhost:3001/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: input.trim().substring(0, 20) + '...' })
      });
      const newSession = await res.json();
      setSessions([newSession]);
      targetSessionId = newSession.id;
      setActiveSessionId(newSession.id);
    }

    const userText = input.trim();
    setInput('');
    setError(null);

    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setIsTyping(true);

    const startTime = Date.now();
    addLog('OUTBOUND', `POST /api/agent (Session #${targetSessionId})`, { prompt: userText });

    try {
      const response = await fetch('http://localhost:3001/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userText,
          history: messages,
          sessionId: targetSessionId
        }),
      });

      if (!response.ok) throw new Error('Failed to connect to backend stream.');

      // Placeholder for incoming streaming tokens
      setMessages(prev => [...prev, { role: 'ai', content: '' }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const payload = JSON.parse(line.replace('data: ', ''));

              if (payload.type === 'debug') {
                addLog('LAYER 1', `Intent: ${payload.debug?.intent}`);
                if (payload.debug?.actionResult) {
                  addLog('LAYER 2', `Execution Result`, payload.debug.actionResult);
                }
              } else if (payload.type === 'token') {
                accumulatedText += payload.token;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: 'ai', content: accumulatedText };
                  return updated;
                });
              } else if (payload.type === 'done') {
                const latency = Date.now() - startTime;
                addLog('LAYER 3', `Synthesis Stream Complete (${latency}ms)`);
              } else if (payload.type === 'error') {
                throw new Error(payload.error);
              }
            } catch (err) {
              console.error("Error parsing SSE event:", err);
            }
          }
        }
      }

    } catch (err) {
      const latency = Date.now() - startTime;
      addLog('ERROR', `Pipeline Failed (${latency}ms)`, { error: err.message });
      setError(err.message);
      setMessages(prev => [...prev, { role: 'ai', content: `System Error: ${err.message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="animate-fade-in h-full flex flex-col">
      <header className="mb-6 shrink-0">
        <h1 className="text-3xl font-bold mb-1">Agent Hub</h1>
        <p className="text-gray-500 text-sm">Local AI orchestration & multi-session command interface</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-grow min-h-0">
        
        {/* Column 1: Sessions Drawer */}
        <div className="bg-white rounded-3xl p-4 border border-gray-100 flex flex-col min-h-0 shadow-sm lg:col-span-1">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 shrink-0">
            <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <MessageSquare size={16} /> Sessions
            </h2>
            <button 
              onClick={createNewSession}
              className="p-2 bg-[#111111] hover:bg-[#2d2d2d] text-white rounded-xl transition-colors text-xs flex items-center gap-1"
            >
              <Plus size={14} /> New
            </button>
          </div>

          <div className="flex-grow overflow-y-auto flex flex-col gap-2 pr-1">
            {sessions.length === 0 ? (
              <div className="text-xs text-gray-400 italic text-center py-4">No active sessions</div>
            ) : (
              sessions.map(s => (
                <div 
                  key={s.id} 
                  onClick={() => setActiveSessionId(s.id)}
                  className={`p-3 rounded-2xl cursor-pointer text-xs flex items-center justify-between group transition-all ${
                    activeSessionId === s.id ? 'bg-blue-50 text-blue-600 font-semibold border border-blue-100' : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {editingSessionId === s.id ? (
                    <div className="flex items-center gap-1 w-full" onClick={e => e.stopPropagation()}>
                      <input 
                        type="text" 
                        value={editTitleInput}
                        onChange={e => setEditTitleInput(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none"
                        autoFocus
                      />
                      <button onClick={(e) => saveRenameSession(s.id, e)} className="text-green-600 p-1"><Check size={14} /></button>
                      <button onClick={() => setEditingSessionId(null)} className="text-gray-400 p-1"><X size={14} /></button>
                    </div>
                  ) : (
                    <>
                      <span className="truncate pr-2">{s.title}</span>
                      <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                        <button onClick={(e) => startRenameSession(s, e)} className="text-gray-400 hover:text-gray-700 p-1"><Edit2 size={12} /></button>
                        <button onClick={(e) => deleteSession(s.id, e)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={12} /></button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2 & 3: Chat Box */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col min-h-0 overflow-hidden relative lg:col-span-2">
          <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-6">
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 text-sm my-auto">Start a conversation or select a session...</div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                  <div className={`shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-[#111111] text-white'}`}>
                    {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                  </div>
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-blue-500 text-white rounded-tr-sm' 
                      : msg.content.startsWith('System Error') 
                        ? 'bg-red-50 text-red-700 border border-red-100 rounded-tl-sm'
                        : 'bg-gray-50 text-gray-800 border border-gray-100 rounded-tl-sm'
                  }`}>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))
            )}

            {isTyping && (
              <div className="flex gap-4 max-w-[85%] mr-auto">
                <div className="shrink-0 w-10 h-10 rounded-2xl bg-[#111111] text-white flex items-center justify-center shadow-sm">
                  <Bot size={20} />
                </div>
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 rounded-tl-sm flex items-center gap-2 text-gray-500">
                  <Loader2 size={16} className="animate-spin text-blue-500" />
                  <span className="text-xs font-medium uppercase tracking-wider">Computing...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-gray-100 shrink-0">
            <form onSubmit={sendMessage} className="relative flex items-center">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isTyping}
                placeholder="Message Aether..." 
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-6 pr-16 py-4 text-sm focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
              />
              <button 
                type="submit" 
                disabled={isTyping || !input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#111111] hover:bg-[#2d2d2d] disabled:bg-gray-300 text-white rounded-xl flex items-center justify-center transition-colors"
              >
                <Send size={18} className={isTyping ? "opacity-0" : "opacity-100"} />
                {isTyping && <Loader2 size={18} className="animate-spin absolute" />}
              </button>
            </form>
            {error && (
              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-red-500">
                <ServerCrash size={14} />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Column 4: Firehose Log */}
        <div className="hidden lg:flex bg-[#111111] rounded-3xl p-6 shadow-sm flex-col lg:col-span-1 border border-[#2d2d2d] min-h-0">
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-[#2d2d2d] shrink-0">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Terminal size={18} className="text-gray-400" /> Firehose
            </h2>
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
          </div>
          
          <div className="flex-grow overflow-y-auto font-mono text-xs text-gray-400 flex flex-col gap-3 pr-2">
            {logs.length === 0 ? (
              <div className="text-gray-600 italic">Awaiting API requests...</div>
            ) : (
              logs.map(log => (
                <div key={log.id} className="border-l-2 border-gray-800 pl-3 py-1 flex flex-col gap-1 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">[{log.time}]</span>
                    <span className={`font-bold ${
                      log.type === 'OUTBOUND' ? 'text-blue-400' : 
                      log.type === 'ERROR' ? 'text-red-400' : 
                      log.type === 'LAYER 1' ? 'text-purple-400' :
                      log.type === 'LAYER 2' ? 'text-amber-400' : 'text-green-400'
                    }`}>
                      {log.type}
                    </span>
                  </div>
                  <div className="text-gray-300">{log.message}</div>
                  {log.rawData && (
                    <div className="bg-black/50 p-2 rounded-lg text-[10px] text-gray-500 overflow-x-auto">
                      <pre className="whitespace-pre-wrap">{typeof log.rawData === 'string' ? log.rawData : JSON.stringify(log.rawData, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>

      </div>
    </div>
  );
};

export default Agent;