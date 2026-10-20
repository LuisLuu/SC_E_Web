import React, { useState, useEffect, useRef } from 'react';
import mqtt from 'mqtt';
import { Terminal, Activity as ActivityIcon, Cpu, Zap, WifiOff, Clock } from 'lucide-react';

const Activity = () => {
  // 1. Dynamic State (No hardcoded data)
  const [brokerStatus, setBrokerStatus] = useState('disconnected');
  const [fleet, setFleet] = useState({}); // Stores all discovered devices and their live data
  const [spotlightId, setSpotlightId] = useState(null); // Which device is currently focused
  const [logs, setLogs] = useState([]); // Master MQTT firehose

  // 2. The Auto-Discovery MQTT Engine
  useEffect(() => {
    const client = mqtt.connect('ws://localhost:9001');

    client.on('connect', () => {
      setBrokerStatus('connected');
      // Subscribe to EVERYTHING. We will filter it dynamically.
      client.subscribe('#');
    });

    client.on('message', (topic, message) => {
      const payloadString = message.toString();
      const timestamp = new Date().toLocaleTimeString();
      
      // Update global log stream (keep last 50 logs to prevent memory leaks)
      setLogs(prev => [{ id: Date.now(), time: timestamp, topic, payload: payloadString }, ...prev].slice(0, 50));

      // Auto-Discovery Parsing
      // Assuming topics are structured like: deviceName/category/action (e.g., fountain/sensor/water)
      const topicParts = topic.split('/');
      if (topicParts.length < 2) return; // Ignore malformed topics
      
      const deviceId = topicParts[0];

      let parsedData = {};
      try {
        parsedData = JSON.parse(payloadString);
      } catch (e) {
        // If it's not JSON, store it as a raw string under the topic's last word
        parsedData = { [topicParts[topicParts.length - 1]]: payloadString };
      }

      // Dynamically update the fleet state
      setFleet(prevFleet => {
        const existingDevice = prevFleet[deviceId] || { data: {}, firstSeen: timestamp };
        return {
          ...prevFleet,
          [deviceId]: {
            ...existingDevice,
            lastSeen: timestamp,
            data: { ...existingDevice.data, ...parsedData } // Merge new data keys
          }
        };
      });

      // Auto-select the first device that talks if nothing is spotlighted
      setSpotlightId(currentSpotlight => currentSpotlight || deviceId);
    });

    client.on('error', () => setBrokerStatus('error'));
    client.on('close', () => setBrokerStatus('disconnected'));

    return () => client.end();
  }, []);

  const spotlightDevice = fleet[spotlightId];
  // Filter logs to only show messages relevant to the spotlighted device
  const spotlightLogs = logs.filter(log => log.topic.startsWith(`${spotlightId}/`));

  return (
    <div className="animate-fade-in h-full flex flex-col">
      <header className="mb-6 shrink-0 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold mb-1">Fleet Manager</h1>
          <p className="text-gray-500 text-sm">Dynamic telemetry and isolated device diagnostics</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-gray-200 shadow-sm text-xs font-semibold">
          <span className={`w-2.5 h-2.5 rounded-full ${brokerStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
          <span className="text-gray-600 uppercase tracking-wider">
            {brokerStatus === 'connected' ? 'Broker Online' : 'Broker Offline'}
          </span>
        </div>
      </header>

      {/* THE ROSTER: Horizontal list of all discovered devices */}
      <div className="shrink-0 mb-6 flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {Object.keys(fleet).length === 0 ? (
          <div className="bg-gray-100 border border-gray-200 border-dashed rounded-3xl p-6 w-full text-center text-gray-400 text-sm flex flex-col items-center gap-2">
            <WifiOff size={24} />
            <p>Listening to WebSocket (Port 9001). Awaiting device telemetry...</p>
          </div>
        ) : (
          Object.keys(fleet).map(id => (
            <button 
              key={id}
              onClick={() => setSpotlightId(id)}
              className={`flex flex-col items-start min-w-[200px] p-5 rounded-3xl transition-all border ${
                spotlightId === id 
                  ? 'bg-white border-blue-500 shadow-md ring-4 ring-blue-50' 
                  : 'bg-white/50 border-gray-200 hover:bg-white hover:shadow-sm'
              }`}
            >
              <div className="flex justify-between w-full items-center mb-3">
                <Cpu size={20} className={spotlightId === id ? 'text-blue-500' : 'text-gray-400'} />
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              </div>
              <h3 className="font-bold text-lg text-gray-800 capitalize">{id}</h3>
              <p className="text-xs text-gray-400 font-mono mt-1">Last seen: {fleet[id].lastSeen}</p>
            </button>
          ))
        )}
      </div>

      {/* THE SPOTLIGHT: Dynamic Analytics Canvas */}
      {spotlightDevice && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow min-h-0 animate-fade-in">
          
          {/* Dynamic Metrics Column */}
          <div className="flex flex-col gap-4 lg:col-span-1 overflow-y-auto pr-2 pb-10">
            <h2 className="font-bold text-sm text-gray-400 uppercase tracking-wider mb-2 px-2">Live Parameters</h2>
            
            {Object.keys(spotlightDevice.data).length === 0 ? (
              <div className="text-sm text-gray-400 p-4">No parseable JSON metrics available.</div>
            ) : (
              Object.entries(spotlightDevice.data).map(([key, value]) => (
                <div key={key} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wider">{key.replace(/_/g, ' ')}</h3>
                    <ActivityIcon size={16} className="text-gray-300" />
                  </div>
                  <div className="text-3xl font-bold text-gray-800">
                    {typeof value === 'number' ? Number(value).toFixed(1) : value}
                  </div>
                </div>
              ))
            )}
            
            {/* Standard Meta Card */}
            <div className="bg-blue-50 rounded-3xl p-6 border border-blue-100 mt-auto shrink-0">
              <div className="flex items-center gap-2 mb-2 text-blue-600">
                <Clock size={16} />
                <h3 className="font-bold text-sm uppercase tracking-wider">Session Info</h3>
              </div>
              <p className="text-sm text-blue-800">Discovered at {spotlightDevice.firstSeen}</p>
            </div>
          </div>

          {/* Isolated Spotlight Terminal */}
          <div className="bg-[#111111] rounded-3xl p-6 shadow-sm flex flex-col lg:col-span-2 h-[400px] lg:h-auto border border-[#2d2d2d]">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-[#2d2d2d] shrink-0">
              <h2 className="font-bold text-white flex items-center gap-2">
                <Terminal size={18} className="text-gray-400" /> 
                <span className="capitalize">{spotlightId}</span> Firehose
              </h2>
              <div className="text-xs font-mono text-gray-500 bg-gray-900 px-3 py-1 rounded-lg">
                Topic Filter: {spotlightId}/#
              </div>
            </div>
            
            <div className="flex-grow overflow-y-auto font-mono text-xs text-gray-400 flex flex-col gap-2">
              {spotlightLogs.length === 0 ? (
                <div className="text-gray-600 italic">Awaiting telemetry payloads...</div>
              ) : (
                spotlightLogs.map(log => (
                  <div key={log.id} className="border-l-2 border-gray-800 pl-3 py-1 hover:bg-white/5 transition-colors">
                    <span className="text-gray-600 mr-3">[{log.time}]</span>
                    <span className="text-blue-400 mr-2">{log.topic}</span>
                    <span className="text-gray-300 break-all">{log.payload}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default Activity;  