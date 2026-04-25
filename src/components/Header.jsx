import React from 'react';
import { Search, ChevronDown, User, Video } from 'lucide-react';

const Header = () => (
  <header className="h-24 border-b border-slate-700/50 bg-slate-950/80 backdrop-blur-md flex items-center justify-between px-10 z-[20] shrink-0">
    <div className="flex items-center gap-12">
      <div className="flex items-center gap-4">
        <Video className="w-8 h-8 text-cyan-500" />
        <h1 className="text-2xl font-bold uppercase italic tracking-tighter text-white">Sky<span className="text-cyan-500">Netra</span></h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="hud-pill hud-badge-cyan">AI-Powered</div>
        <div className="hud-pill flex items-center gap-2 group cursor-pointer transition-all hover:bg-white/10 hover:border-cyan-500/30 hover:text-cyan-400">
          <span>CCTV-Feed</span>
          <ChevronDown className="w-3 h-3 group-hover:rotate-180 transition-transform" />
        </div>
      </div>
    </div>

    <div className="flex items-center gap-8">
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-hover:text-cyan-500 transition-colors" />
        <input 
          type="text" 
          placeholder="Global Tactical Search..." 
          className="bg-slate-900/40 border border-white/5 py-2.5 pl-11 pr-5 rounded-xl text-[10px] font-bold w-64 focus:border-cyan-500/40 outline-none transition-all placeholder:text-slate-600 focus:w-80" 
        />
      </div>
      <div className="flex items-center gap-4 pl-8 border-l border-white/5">
        <div className="text-right">
          <div className="text-[11px] font-bold text-white uppercase tracking-tighter mb-1 leading-none">Cdr. SkyNetra</div>
          <div className="text-[8px] font-bold text-cyan-500 uppercase tracking-widest leading-none">Authorization IV</div>
        </div>
        <div className="w-12 h-12 rounded-full p-1 bg-gradient-to-tr from-cyan-500/20 to-transparent border border-white/10 shrink-0">
          <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
            <User className="w-6 h-6 text-cyan-400" />
          </div>
        </div>
      </div>
    </div>
  </header>
);

export default Header;
