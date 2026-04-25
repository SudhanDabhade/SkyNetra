import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Battery, Radio, Navigation, AlertTriangle, Shield } from 'lucide-react';

const DeployModal = ({ isOpen, onClose, onDeploy, emergencyData, onStandby }) => {
  const drones = [
    { id: 'Alpha-1', name: 'Alpha-1', dist: '0.3 km away', status: 'Ready to fly', color: 'text-emerald-500', bg: 'bg-emerald-500/20' },
    { id: 'Beta-2', name: 'Beta-2', dist: '1.2 km away', status: 'Ready to fly', color: 'text-emerald-500', bg: 'bg-emerald-500/20' },
    { id: 'Gamma-3', name: 'Gamma-3', dist: '4.8 km away', status: 'Charging', color: 'text-orange-500', bg: 'bg-orange-500/20' },
  ];

  const [selectedDroneId, setSelectedDroneId] = React.useState(null);

  const isSOS = !!emergencyData;
  const suggestedDroneId = emergencyData?.droneId;

  // Set default selection when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedDroneId(suggestedDroneId || drones[0].id);
    }
  }, [isOpen, suggestedDroneId]);

  // Find the suggested drone and move it to the top
  const sortedDrones = isSOS
    ? [...drones].sort((a, b) => (a.id === suggestedDroneId ? -1 : b.id === suggestedDroneId ? 1 : 0))
    : drones;

  const currentSelected = drones.find(d => d.id === selectedDroneId) || drones[0];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Box */}
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className={`relative w-full max-w-[440px] border rounded-2xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)] text-white flex flex-col ${
              isSOS 
                ? 'bg-[#141010] border-red-500/40' 
                : 'bg-[#121214] border-[#27272a]'
            }`}
          >
            {/* SOS CRITICAL BANNER */}
            {isSOS && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="bg-gradient-to-r from-red-900/60 to-red-800/40 border-b border-red-500/30 px-6 py-3 flex items-center gap-3"
              >
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_#ef4444]" />
                <span className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em]">
                  ⚡ CRITICAL SOS — IMMEDIATE RESPONSE REQUIRED
                </span>
              </motion.div>
            )}

            {/* Header */}
            <div className="p-6 pb-2 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-black tracking-tight mb-2">
                  {isSOS 
                    ? `CRITICAL: Drone [${suggestedDroneId || 'Alpha-1'}] available. Deploy to Sector 4?`
                    : 'Deploy #2667(9)8B05DEY'
                  }
                </h2>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                  {isSOS 
                    ? `INCIDENT: ${emergencyData.type} • REPORTED BY ${emergencyData.user}`
                    : 'Please select drone for the mission'
                  }
                </p>
              </div>
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            {/* Auto-Assigned Drone Info */}
            <div className="px-6 py-4">
               <div className="space-y-3 pb-4">
                 {[currentSelected].map((drone) => {
                   const isSuggested = drone.id === suggestedDroneId;
                   
                   return (
                    <div 
                      key={drone.id}
                      className={`group flex items-center gap-4 p-4 rounded-xl border ${
                        isSOS ? 'bg-red-500/5 border-red-500/30' : 'bg-cyan-500/5 border-cyan-500/30 shadow-[0_0_20px_rgba(0,229,255,0.1)]'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        isSOS ? 'border-red-500' : 'border-cyan-500'
                      }`}>
                         <div className={`w-2 h-2 rounded-full ${isSOS ? 'bg-red-500 shadow-[0_0_6px_#ef4444]' : 'bg-cyan-500'}`} />
                      </div>
                      
                      <div className="flex-1">
                        <div className="text-xs font-black text-white mb-0.5">{drone.name}</div>
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">ID: {drone.id}</div>
                        <div className={`text-[10px] font-black mt-1 ${isSOS && isSuggested ? 'text-red-400' : 'text-cyan-400'}`}>
                          {isSOS && isSuggested ? `${emergencyData.distance} km • AUTO-ASSIGNED NEAREST` : drone.dist}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 text-[10px] font-black uppercase">
                         <div className="w-16 h-8 bg-zinc-900/50 rounded border border-white/5 overflow-hidden flex items-center justify-center">
                            <img src="https://img.freepik.com/premium-photo/military-drone-white-background-generative-ai_115919-6194.jpg?w=1000" className="opacity-40 invert scale-125" />
                         </div>
                         <div className={`${drone.bg} ${drone.color} px-2 py-0.5 rounded leading-none`}>
                           {drone.status}
                         </div>
                      </div>
                    </div>
                  );
                 })}
               </div>
            </div>

            {/* Location Check Box */}
            <div className="p-6 pt-2">
               <div className={`border rounded-xl p-4 relative overflow-hidden group ${
                 isSOS ? 'bg-red-950/20 border-red-500/30' : 'bg-black/40 border-[#27272a]'
               }`}>
                  <div className="absolute inset-0 opacity-10 tactical-grid" />
                  <div className="relative z-10">
                     <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">
                       {isSOS ? '📍 Incident Location' : 'Check the location'}
                     </div>
                     <div className={`border rounded-lg p-3 flex gap-4 items-center ${
                       isSOS ? 'border-red-500/60 bg-red-950/30' : 'border-cyan-500/60 bg-cyan-950/20'
                     }`}>
                        <div className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 ${
                          isSOS ? 'bg-red-500/20 border-red-500/40' : 'bg-cyan-500/20 border-cyan-500/40'
                        }`}>
                           <Navigation className={`w-5 h-5 ${isSOS ? 'text-red-500' : 'text-cyan-500'}`} />
                        </div>
                        <div>
                           <div className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${isSOS ? 'text-red-500' : 'text-cyan-500'}`}>
                             {isSOS ? 'SOS GPS Coordinates' : 'Alert Area'}
                           </div>
                           <div className="text-[11px] font-bold text-zinc-400 leading-snug">
                             {isSOS 
                               ? `${emergencyData.lat?.toFixed(4)}° N, ${emergencyData.lng?.toFixed(4)}° E — Pune, IND`
                               : '6316 N 83rd St, Redmond, WA 98052, USA'
                             }
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-6 pt-0 flex gap-3">
              {isSOS && (
                <button 
                  onClick={() => { if (onStandby) onStandby(); onClose(); }}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-black text-sm py-4 rounded-xl transition-all border border-zinc-700 active:scale-95"
                >
                  STANDBY
                </button>
              )}
              <button 
                onClick={() => onDeploy(selectedDroneId)}
                className={`flex-1 font-black text-lg py-4 rounded-xl transition-all active:scale-95 ${
                  isSOS 
                    ? 'bg-red-500 hover:bg-red-400 text-white shadow-[0_20px_40px_rgba(239,68,68,0.2)]'
                    : 'bg-[#00e5ff] hover:bg-cyan-400 text-black shadow-[0_20px_40px_rgba(0,229,255,0.2)]'
                }`}
              >
                {isSOS ? '🚁 CONFIRM DEPLOYMENT' : 'Deploy Now'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DeployModal;