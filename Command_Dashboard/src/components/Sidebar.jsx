import React from 'react';
import { Shield, LayoutDashboard, AlertTriangle, Activity, Database, Settings, Camera } from 'lucide-react';

const NavButton = ({ id, active, icon: Icon, label, onClick }) => (
  <button 
    onClick={() => onClick(id)}
    className={`w-full flex flex-col items-center justify-center gap-2 py-5 transition-all relative group ${
      active ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
    }`}
  >
    {active && <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-cyan-500 rounded-r shadow-[0_0_15px_#22d3ee]" />}
    <Icon className={`w-6 h-6 transition-transform ${active ? 'scale-110' : 'group-hover:scale-105 opacity-60'}`} />
    <span className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-80">{label}</span>
  </button>
);

const Sidebar = ({ activeTab, onTabChange }) => (
  <aside className="w-24 border-r border-white/5 bg-slate-950/40 backdrop-blur-2xl flex flex-col z-50 overflow-hidden">
    <div className="h-24 flex items-center justify-center border-b border-white/5 shrink-0">
      <div className="w-12 h-12 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 flex items-center justify-center animate-pulse shadow-[0_0_20px_rgba(34,211,238,0.1)]">
        <Shield className="w-6 h-6 text-cyan-500" />
      </div>
    </div>
    <nav className="flex-grow pt-4">
      <NavButton id="front" active={activeTab === 'front'} icon={LayoutDashboard} label="Front" onClick={onTabChange} />
      <NavButton id="incidents" active={activeTab === 'incidents'} icon={AlertTriangle} label="Incid" onClick={onTabChange} />
      <NavButton id="alerts" active={activeTab === 'alerts'} icon={Activity} label="Alerts" onClick={onTabChange} />
      <NavButton id="reports" active={activeTab === 'reports'} icon={Database} label="Reports" onClick={onTabChange} />
      <div className="w-full flex justify-center py-2">
        <label className="flex flex-col items-center justify-center cursor-pointer group hover:text-cyan-400 text-slate-500 transition-all">
          <Camera className="w-6 h-6 group-hover:scale-105 opacity-60 transition-transform" />
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-80 mt-2 text-center">Video</span>
          <input 
            type="file" 
            accept="video/*" 
            className="hidden" 
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                console.log('Selected video:', file.name);
                // Trigger any specific upload logic from here if needed.
              }
            }}
          />
        </label>
      </div>
    </nav>
    <div className="p-4 flex flex-col gap-4 border-t border-white/5">
      <NavButton id="config" active={activeTab === 'config'} icon={Settings} label="Config" onClick={onTabChange} />
    </div>
  </aside>
);

export default Sidebar;
