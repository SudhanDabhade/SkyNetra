import React from 'react';
import { 
  Wifi, Battery, Radio, Eye, Crosshair, 
  ChevronRight, Power, Settings, Shield, Navigation 
} from 'lucide-react';

const MissionHUD = ({ telemetry, onEndMission, caseId }) => {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-6 z-[60] font-sans">
      
      {/* 1. TOP TELEMETRY BAR (Immersive operational status) */}
      <div className="w-full max-w-4xl flex items-center justify-between px-6 py-2 bg-black/60 backdrop-blur-lg border border-white/10 rounded-xl pointer-events-auto">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <Radio className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none mb-1">Mission Case</span>
              <span className="text-xs font-bold text-cyan-400 tracking-tight leading-none uppercase">{caseId}</span>
            </div>
          </div>
          
          <div className="h-6 w-px bg-white/10" />

          {/* Core Flight Data */}
          <div className="flex items-center gap-6 text-xs font-bold tracking-tight">
            <div className="flex items-center gap-2">
              <Navigation className="w-3.5 h-3.5 text-zinc-500" />
              <span>S: <span className="text-white">5 mph</span></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-3 bg-cyan-500/40 rounded-full" />
              <span>H: <span className="text-white">200 ft</span></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8">
          {/* Signal & Battery */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-bold text-white uppercase">{telemetry.networkBandwidth}</span>
            </div>
            <div className="flex items-center gap-2">
              <Battery className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-bold text-white uppercase">64%</span>
            </div>
          </div>

          <button 
            onClick={onEndMission}
            className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all shadow-[0_0_15px_rgba(244,63,94,0.3)]"
          >
            End Mission
          </button>
        </div>
      </div>

      {/* 2. CENTER RETICLE (Optical Targeting) */}
      <div className="relative w-48 h-48 flex items-center justify-center opacity-40">
        <div className="absolute inset-0 border-2 border-cyan-500/20 rounded-full" />
        <div className="w-12 h-px bg-cyan-400" />
        <div className="h-12 w-px bg-cyan-400" />
        {/* Corners */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400" />
      </div>

      {/* 3. BOTTOM CONTROLS & AUTOPILOT */}
      <div className="w-full flex items-end justify-between">
        {/* Left Stats Overlay */}
        <div className="flex flex-col gap-2 bg-black/40 p-4 rounded-xl border border-white/5 backdrop-blur-sm">
          <div className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
            AI Target Detection Enabled
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <div className="text-lg font-bold tabular-nums">12</div>
              <div className="text-[7px] text-zinc-500 uppercase font-bold">Persons</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold tabular-nums">0</div>
              <div className="text-[7px] text-zinc-500 uppercase font-bold">Vehicles</div>
            </div>
          </div>
        </div>

        {/* Autopilot Center Toggle */}
        <div className="pointer-events-auto flex flex-col items-center gap-3 mb-4">
          <div className="bg-[#18181b]/90 backdrop-blur-lg border border-cyan-500/30 rounded-full px-6 py-2 flex items-center gap-3 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">Autopilot Mode is ON</span>
            <div className="w-8 h-4 bg-cyan-500 rounded-full relative">
              <div className="absolute right-1 top-1 w-2 h-2 bg-black rounded-full" />
            </div>
          </div>
        </div>

        {/* Flight Mode Selector */}
        <div className="pointer-events-auto flex items-center gap-2 bg-black/60 p-1.5 rounded-xl border border-white/5 backdrop-blur-lg">
          <button className="p-2.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition-all"><Eye className="w-4 h-4" /></button>
          <button className="p-2.5 rounded-lg hover:bg-white/5 text-zinc-500 transition-all"><Crosshair className="w-4 h-4" /></button>
          <button className="p-2.5 rounded-lg hover:bg-white/5 text-zinc-500 transition-all"><Settings className="w-4 h-4" /></button>
        </div>
      </div>

    </div>
  );
};

export default MissionHUD;
