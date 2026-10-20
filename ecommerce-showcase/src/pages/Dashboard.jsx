import React, { useState, useEffect } from 'react';
import mqtt from 'mqtt';
import { Cloud, Radio, AlertCircle, WifiOff, CheckCircle2, Circle } from 'lucide-react';

const Dashboard = () => {
  const [mqttStatus, setMqttStatus] = useState('disconnected'); 
  const [waterLevel, setWaterLevel] = useState(null); 
  const [todos, setTodos] = useState([]);
  const [activeWidget, setActiveWidget] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const client = mqtt.connect('ws://localhost:9001');

    client.on('connect', () => {
      setMqttStatus('connected');
      client.subscribe('fountain/sensor/water');
    });

    client.on('message', (topic, message) => {
      if (topic === 'fountain/sensor/water') {
        try {
          const payload = JSON.parse(message.toString());
          if (payload.level !== undefined) setWaterLevel(payload.level);
        } catch (e) {
          console.error("Failed to parse MQTT payload:", e);
        }
      }
    });

    client.on('error', () => setMqttStatus('error'));
    client.on('close', () => setMqttStatus('disconnected'));
    client.on('offline', () => setMqttStatus('disconnected'));

    return () => client.end();
  }, []);

  useEffect(() => {
    const fetchDashboardTasks = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/tasks?archived=0');
        if (response.ok) {
          const data = await response.json();
          // Removed .slice(0,4) so the scrollable list shows all active tasks
          setTodos(data.filter(t => t.done === 0));
        }
      } catch (err) {
        console.error("Dashboard failed to fetch tasks");
      }
    };
    fetchDashboardTasks();
  }, []);

  const toggleTodo = async (id, currentStatus) => {
    const newStatus = currentStatus === 1 ? 0 : 1;
    setTodos(todos.map(t => t.id === id ? { ...t, done: newStatus } : t));
    try {
      await fetch(`http://localhost:3001/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: newStatus }),
      });
    } catch (err) {}
  };

  useEffect(() => {
    if (mqttStatus !== 'connected' || (waterLevel !== null && waterLevel < 15)) {
      setActiveWidget(0);
      return;
    }
    if (isHovered) return; 
    const timer = setInterval(() => {
      setActiveWidget((prev) => (prev === 0 ? 1 : 0));
    }, 8000);
    return () => clearInterval(timer);
  }, [isHovered, mqttStatus, waterLevel]);

  return (
    <div className="animate-fade-in h-full flex flex-col">
      <header className="mb-6 flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-3xl font-bold mb-1">Command Center</h1>
          <p className="text-gray-500 text-sm">IoT Local Network Diagnostics</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-gray-200 shadow-sm text-xs font-semibold">
          <span className={`w-2.5 h-2.5 rounded-full ${mqttStatus === 'connected' ? 'bg-green-500 animate-pulse' : mqttStatus === 'error' ? 'bg-red-500' : 'bg-amber-500'}`}></span>
          <span className="text-gray-600 uppercase tracking-wider">
            Broker: {mqttStatus === 'connected' ? 'Online' : 'Awaiting Connection'}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow min-h-0">
        
        <div className="hidden lg:flex lg:col-span-2 border-2 border-dashed border-gray-200/60 rounded-3xl items-center justify-center h-full">
          <p className="text-gray-400 text-sm font-medium tracking-widest uppercase">Canvas Reserved</p>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-1 h-full min-h-0">
          
          <div className="flex flex-col h-[320px] shrink-0" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
            {activeWidget === 0 ? (
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col items-center h-full relative animate-fade-in">
                <div className="w-full flex justify-between items-center mb-2">
                  <h2 className="font-bold text-base">C_water Reservoir</h2>
                  <Radio size={16} className={waterLevel !== null ? "text-blue-500 animate-pulse" : "text-gray-300"} />
                </div>
                
                <div className="relative flex items-center justify-center flex-grow">
                  <svg className="w-36 h-36 transform -rotate-90">
                    <circle cx="72" cy="72" r="60" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-gray-50" />
                    <circle cx="72" cy="72" r="60" stroke="currentColor" strokeWidth="12" fill="transparent" 
                            strokeDasharray="377" 
                            strokeDashoffset={waterLevel !== null ? 377 - (377 * waterLevel) / 100 : 377} 
                            className="text-blue-500 transition-all duration-1000 ease-in-out" strokeLinecap="round" />
                  </svg>
                  
                  <div className="absolute flex flex-col items-center text-center px-4">
                    {waterLevel !== null ? (
                      <>
                        <span className="text-gray-400 text-[10px] font-bold tracking-widest uppercase mb-0.5">Volume</span>
                        <span className="text-3xl font-bold text-[#2d2d2d]">{waterLevel}%</span>
                      </>
                    ) : (
                      <>
                        <WifiOff size={20} className="text-gray-300 mb-1" />
                        <span className="text-gray-400 text-[10px] font-bold uppercase">No Telemetry</span>
                      </>
                    )}
                  </div>
                </div>
                
                {mqttStatus !== 'connected' && (
                  <div className="mt-2 w-full">
                    <div className="flex items-center justify-center gap-2 text-xs font-medium text-amber-700 bg-amber-50 py-2 px-3 rounded-xl border border-amber-100">
                      <AlertCircle size={14} />
                      <span>ESP32 Telemetry Offline</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between h-full relative animate-fade-in">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Local Environment</h2>
                    <div className="text-xl font-bold text-[#2d2d2d]">Location Unset</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-2xl text-gray-400">
                    <Cloud size={24} />
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 mt-auto">
                  <p className="text-xs text-gray-500 font-medium">Awaiting OpenWeather API integration.</p>
                </div>
              </div>
            )}
            <div className="flex justify-center gap-2 mt-3">
              <button onClick={() => setActiveWidget(0)} className={`h-1.5 rounded-full transition-all ${activeWidget === 0 ? 'w-5 bg-blue-500' : 'w-1.5 bg-gray-300'}`} />
              <button onClick={() => setActiveWidget(1)} className={`h-1.5 rounded-full transition-all ${activeWidget === 1 ? 'w-5 bg-blue-500' : 'w-1.5 bg-gray-300'}`} />
            </div>
          </div>

          {/* Correctly Constrained Scrollable Widget */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex-grow flex flex-col min-h-0">
            {/* Header is locked in place */}
            <div className="flex justify-between items-end mb-4 shrink-0">
              <h2 className="font-bold text-base">Active Tasks</h2>
              <span className="text-xl font-bold text-gray-300 leading-none">{todos.length}</span>
            </div>
            
            {/* Scrollable area is isolated here */}
            <div className="flex flex-col gap-1.5 overflow-y-auto pr-2 min-h-0 flex-grow">
              {todos.length === 0 ? (
                 <div className="text-center text-xs text-gray-400 mt-4">No pending tasks.</div>
              ) : (
                todos.map(todo => (
                  <label key={todo.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors group shrink-0">
                    <button onClick={() => toggleTodo(todo.id, todo.done)} className="shrink-0 mt-0.5">
                      {todo.done === 1 ? <CheckCircle2 className="text-blue-500" size={16} /> : <Circle className="text-gray-300 group-hover:text-blue-400" size={16} />}
                    </button>
                    <span className={`text-xs ${todo.done === 1 ? 'line-through text-gray-400' : 'text-gray-700 font-medium'}`}>
                      {todo.text}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;