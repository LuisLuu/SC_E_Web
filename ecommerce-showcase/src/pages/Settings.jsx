import React, { useState } from 'react';
import { Save, Server, Cpu, Shield } from 'lucide-react';

const Settings = () => {
  const [mqttIp, setMqttIp] = useState('localhost');
  const [mqttPort, setMqttPort] = useState('9001');
  const [ollamaEndpoint, setOllamaEndpoint] = useState('http://localhost:11434');

  return (
    <div className="animate-fade-in h-full flex flex-col">
      <header className="mb-8 shrink-0">
        <h1 className="text-3xl font-bold mb-1">System Settings</h1>
        <p className="text-gray-500 text-sm">Configure local network endpoints and parameters</p>
      </header>

      <div className="flex-grow overflow-y-auto max-w-4xl flex flex-col gap-8 pb-10">
        
        {/* MQTT Configuration */}
        <section className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <Server className="text-blue-500" size={24} />
            <h2 className="font-bold text-xl">MQTT Broker Connection</h2>
          </div>
          <p className="text-sm text-gray-500 mb-6">Define the WebSocket endpoint for Mosquitto to receive ESP32 telemetry.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Broker IP Address</label>
              <input 
                type="text" 
                value={mqttIp}
                onChange={(e) => setMqttIp(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">WebSocket Port</label>
              <input 
                type="text" 
                value={mqttPort}
                onChange={(e) => setMqttPort(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        </section>

        {/* Local AI Configuration */}
        <section className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <Cpu className="text-purple-500" size={24} />
            <h2 className="font-bold text-xl">Ollama Local Agent</h2>
          </div>
          <p className="text-sm text-gray-500 mb-6">Point the dashboard to your local LLM instance. Ensure CORS is enabled on the host machine.</p>
          
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">API Endpoint URL</label>
            <input 
              type="text" 
              value={ollamaEndpoint}
              onChange={(e) => setOllamaEndpoint(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
        </section>

        {/* Security & Access */}
        <section className="bg-[#111111] text-white rounded-3xl p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="text-red-400" size={24} />
            <h2 className="font-bold text-xl">Access Control</h2>
          </div>
          <p className="text-sm text-gray-400 mb-6">Dashboard is currently running in unrestricted local mode. Public deployment requires authentication.</p>
          <button disabled className="bg-[#2d2d2d] text-gray-500 px-6 py-3 rounded-xl text-sm font-semibold cursor-not-allowed">
            Enable Read-Only Mode
          </button>
        </section>

      </div>

      {/* Sticky Save Bar */}
      <div className="shrink-0 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex justify-between items-center mt-4">
        <span className="text-sm text-gray-500">Unsaved changes will be lost upon reload.</span>
        <button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors">
          <Save size={18} /> Save Configuration
        </button>
      </div>
    </div>
  );
};

export default Settings;