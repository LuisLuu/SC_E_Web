import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { MessageSquare, X, Send } from 'lucide-react';
import Sidebar from './Sidebar';

const AppLayout = () => {
  const [isAiOpen, setIsAiOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#f4f5f7] text-[#2d2d2d] font-sans overflow-hidden relative">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto px-6 pt-6 pb-24 md:px-10 md:pt-8 md:pb-10">
        <Outlet /> 
      </main>

      {/* Global AI Floating Action Button */}
      <button 
        onClick={() => setIsAiOpen(true)}
        className="fixed bottom-6 right-6 md:bottom-10 md:right-10 bg-[#111111] text-white p-4 rounded-full shadow-2xl hover:scale-105 transition-transform z-40"
      >
        <MessageSquare size={24} />
      </button>

      {/* Slide-out AI Drawer */}
      <div className={`fixed top-0 right-0 h-full w-full md:w-96 bg-white/90 backdrop-blur-xl shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isAiOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-white">
          <div>
            <h2 className="font-bold text-lg">V</h2>
            <p className="text-xs text-green-500 font-medium">● Local Model Active</p>
          </div>
          <button onClick={() => setIsAiOpen(false)} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-grow p-6 overflow-y-auto flex flex-col gap-4">
          <div className="bg-gray-100 text-gray-700 p-4 rounded-2xl rounded-tl-sm text-sm self-start max-w-[85%]">
            System health is nominal. Pump is running at 75%. How can I assist you today?
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 bg-white">
          <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2">
            <input 
              type="text" 
              placeholder="Query hardware state..." 
              className="flex-grow bg-transparent border-none focus:outline-none text-sm py-2"
            />
            <button className="text-blue-500 hover:text-blue-600 transition-colors">
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Background Overlay when Drawer is open */}
      {isAiOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={() => setIsAiOpen(false)}
        />
      )}
    </div>
  );
};

export default AppLayout;