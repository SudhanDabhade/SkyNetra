import React from 'react';
import { Power, Terminal } from 'lucide-react';

const Footer = ({ isConnected, onConnect, onDisconnect }) => (
  <footer className="h-20 shrink-0 border-t border-white/5 bg-slate-950/40 backdrop-blur-3xl px-12 flex items-center justify-between z-50">
    <div className="flex items-center gap-10">
      <button 
        onClick={isConnected ? onDisconnect : onConnect}
        className={`flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 ${
          isConnected ? 'text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.1)]' : 'text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.1)]'
        }`}
      >
        <Power className={`w-4 h-4 ${isConnected ? 'animate-pulse' : ''}`} />
        <span>{isConnected ? 'Terminate Link' : 'Establish Link'}</span>
      </button>
      <button className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-all hover:scale-105">
        <Terminal className="w-4 h-4" />
        <span>Load Simulation</span>
      </button>
    </div>
    
    <div className="flex items-center gap-12">
      <div className="flex items-center gap-6">
        <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest tabular-nums">Ref_ID: 82.42a</div>
        <div className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${isConnected ? 'text-emerald-500' : 'text-slate-600'}`}>
          {isConnected ? 'HUB_SYNC_OK' : 'HUB_OFFLINE'}
        </div>
      </div>
      <button 
        className="bg-rose-500/10 border border-rose-500/20 text-rose-500 px-8 py-2 rounded-lg text-[10px] font-bold uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(244,63,94,0.05)] hover:bg-rose-500 hover:text-white transition-all transform hover:scale-105 active:scale-95 active:bg-rose-600"
      >
        Critical Stop
      </button>
    </div>
  </footer>
);

export default Footer;
