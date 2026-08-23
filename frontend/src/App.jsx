import React, { useState } from 'react';
import CitizenPortal from './components/CitizenPortal.jsx';
import CommandDashboard from './components/commandDashboard.jsx';
import { Radio, ShieldAlert } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('citizen');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Global Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center font-black text-white text-sm shadow-md">
            R
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-wide text-slate-100">
              ResQ-Mesh <span className="text-red-500 font-mono text-xs">v1.0</span>
            </h1>
            <p className="text-[10px] text-slate-400">SIH 2026 • AI & Offline Disaster Grid</p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('citizen')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === 'citizen'
              ? 'bg-red-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <Radio size={14} /> Citizen SOS Beacon
          </button>

          <button
            onClick={() => setActiveTab('command')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === 'command'
              ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30 shadow-md'
              : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <ShieldAlert size={14} /> NDRF Command Center
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={`flex-1 flex justify-center p-4 ${activeTab === 'citizen' ? 'items-center' : 'items-start'}`}>
        {activeTab === 'citizen' ? <CitizenPortal /> : <CommandDashboard />}
      </main>
    </div>
  );
}