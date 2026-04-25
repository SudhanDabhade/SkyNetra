import React from 'react';
import { Activity, ChevronDown } from 'lucide-react';
import TacticalPanel from './TacticalPanel';

const CircularGauge = ({ value, label, size = 90, color = "#22d3ee" }) => {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  
  return (
    <div className="flex flex-col items-center justify-center relative shrink-0" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90">
        <circle cx="50%" cy="50%" r={radius} fill="none" stroke="currentColor" strokeWidth="4" className="text-white/5" />
        <circle 
          cx="50%" cy="50%" r={radius} fill="none" stroke={color} strokeWidth="6" 
          strokeDasharray={circumference} 
          style={{ strokeDashoffset: value === 0 ? circumference : offset }}
          className="gauge-path shadow-[0_0_15px_rgba(34,211,238,0.4)]"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
        <span className="text-xl font-bold italic tracking-tighter tabular-nums leading-none">
          {value === 0 ? '0.0' : value}
        </span>
        <span className="text-[7px] font-bold uppercase tracking-widest text-slate-500 mt-1">{label}</span>
      </div>
    </div>
  );
};

const TelemetryHUD = ({ telemetry }) => {
  const stats = [
    { label: 'Network Bandwidth', value: telemetry.networkBandwidth, color: 'bg-cyan-400', percent: parseFloat(telemetry.networkBandwidth) || 0 },
    { label: 'Storage IOPS', value: telemetry.storageIOPS, color: 'bg-emerald-500', percent: parseFloat(telemetry.storageIOPS) || 0 },
    { label: 'Encryption Link', value: telemetry.encryption, color: 'bg-cyan-500', percent: telemetry.encryption === 'AES-256 ACTIVE' ? 100 : 0 },
    { label: 'Thermal State', value: telemetry.thermalState, color: 'bg-cyan-400', percent: telemetry.thermalState === 'OPTIMAL' ? 32 : (telemetry.thermalState === 'STABLE' ? 24 : 0) }
  ];

  return (
    <div className="h-[120px] shrink-0 grid grid-cols-12 gap-5 z-20">
      <TacticalPanel title="System Telemetry" icon={Activity} className="col-span-9">
        <div className="h-full flex items-center px-8 gap-12">
          <CircularGauge value={telemetry.cpuLoad} label="CPU Load" />
          <div className="flex-grow flex flex-col gap-3 pt-2">
            <div className="grid grid-cols-2 gap-x-12 gap-y-4">
              {stats.map((stat, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <div className="flex justify-between text-[8px] font-bold uppercase text-slate-500 italic">
                    <span>{stat.label}</span>
                    <span className="tabular-nums text-slate-300">{stat.value}</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${stat.color} ${stat.label === 'Encryption Link' && stat.percent === 100 ? 'animate-pulse' : ''}`} 
                      style={{ width: `${stat.percent}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0 pl-8 border-l border-white/5">
            <div className="text-[20px] font-bold italic tracking-tighter text-cyan-400 tabular-nums">
              {telemetry.cpuLoad > 0 ? `+${Math.floor(telemetry.cpuLoad / 2)}` : '0.00' }
              <ChevronDown className="w-4 h-4 inline mb-1" />
            </div>
            <div className="text-[8px] font-bold uppercase text-slate-500 tracking-widest text-right">Operational Scale Index</div>
          </div>
        </div>
      </TacticalPanel>
      <div className="col-span-3 bg-slate-950/60 backdrop-blur-md border border-slate-700/50 rounded-xl flex items-center justify-center p-4 shadow-2xl">
        <p className="text-[8px] font-bold text-slate-400 text-center uppercase tracking-[0.2em] italic leading-relaxed">
          Tactical System Layer Alpha<br/>Verified by computed telemetry
        </p>
      </div>
    </div>
  );
};

export default TelemetryHUD;
