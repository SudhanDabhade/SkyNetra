import React from 'react';
import TacticalPanel from './TacticalPanel';
import { Map as MapIcon } from 'lucide-react';

const RadarMap = ({ nodes }) => (
  <TacticalPanel title="Command View: Hub" icon={MapIcon} className="h-full">
    <div className="absolute inset-0 bg-slate-900/60">
      <div className="tactical-grid absolute inset-0 opacity-50" />
      <div className="relative w-full h-full p-6">
        {nodes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center opacity-20 italic">
            <p className="text-[10px] font-black uppercase tracking-[0.3em]">Awaiting Radar Uplink</p>
          </div>
        ) : (
          <>
            {nodes.map(node => (
              <div 
                key={node.id} 
                className="absolute transition-all duration-1000 ease-in-out" 
                style={{ top: `${node.y}%`, left: `${node.x}%` }}
              >
                <div className={`w-4 h-4 rounded-full flex items-center justify-center shadow-[0_0_15px] ${
                  node.type === 'CRITICAL' ? 'bg-rose-500 shadow-rose-500' : 'bg-emerald-500 shadow-emerald-500'
                }`}>
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                </div>
                <div className={`absolute top-5 left-5 whitespace-nowrap bg-slate-950/80 px-2 py-1 rounded border text-[8px] font-black uppercase tracking-tighter ${
                  node.type === 'CRITICAL' ? 'border-rose-500/30 text-rose-400' : 'border-emerald-500/30 text-emerald-400'
                }`}>
                  {node.id} {node.type === 'CRITICAL' ? '[CRIT]' : '[SN-D]'}
                </div>
              </div>
            ))}
            
            {/* Connecting Vector Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
              {nodes.length > 1 && nodes.map((node, i) => {
                if (i === 0) return null;
                const prev = nodes[i-1];
                return (
                  <line 
                    key={`line-${i}`}
                    x1={`${prev.x}%`} y1={`${prev.y}%`} 
                    x2={`${node.x}%`} y2={`${node.y}%`} 
                    stroke={node.type === 'CRITICAL' ? '#f43f5e' : '#22d3ee'} 
                    strokeWidth="1" 
                    strokeDasharray="5,3" 
                  />
                );
              })}
            </svg>
          </>
        )}
      </div>
    </div>
  </TacticalPanel>
);

export default RadarMap;
