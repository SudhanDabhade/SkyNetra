import React from 'react';
import { Video } from 'lucide-react';
import { useSystemState } from '../context/SystemContext';
import YoloScanner from './YoloScanner';

const LiveDroneFeed = ({ isConnected, peerStatus, remoteVideoRef, videoStream, isTactical = false }) => {
  const { currentActiveDroneSource } = useSystemState();
  
  // In Tactical Mode, we want the video to be the absolute background
  // In Dashboard Mode, we want the previous grid-bound container
  const wrapperClasses = isTactical
    ? "absolute inset-0 w-full h-full bg-black overflow-hidden flex items-center justify-center p-0"
    : "absolute inset-0 bg-black flex items-center justify-center group overflow-hidden";

  return (
    <div className={wrapperClasses}>
      {/* 1. BRINC-Style HUD Overlays (Dashboard Mode only) */}
      {!isTactical && (
        <>
          <div className="absolute top-4 left-4 flex flex-col gap-1 pointer-events-none z-[60]">
            <div className="bg-black/60 px-2 py-1 border border-white/5 rounded text-[8px] font-bold text-white/40 uppercase tracking-widest">Stream_Active</div>
            <div className="bg-black/60 px-2 py-1 border border-white/5 rounded text-[8px] font-bold text-white/40 uppercase tracking-widest">CAM_ID: 82B7F</div>
          </div>

          <div className="absolute bottom-4 left-4 flex items-center gap-3 pointer-events-none z-[60]">
            <div className="flex flex-col gap-0.5">
              <span className="text-[6px] font-bold text-white/20 uppercase tracking-[0.2em]">Signaling_Handle</span>
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-bold uppercase tracking-widest ${peerStatus === 'ONLINE' ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {peerStatus === 'ONLINE' ? 'skynetra-hub-01' : 'UPLINK_OFFLINE'}
                </span>
                <div className={`w-1.5 h-1.5 rounded-full ${peerStatus === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* 2. Core Video Element */}
      <div className="w-full h-full flex items-center justify-center pointer-events-none">
        {isConnected && remoteVideoRef && (
          <video 
            ref={remoteVideoRef}
            autoPlay 
            playsInline 
            muted 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: isTactical ? 'cover' : 'cover', // Always cover for full immersion
              filter: isTactical ? 'brightness(0.9) contrast(1.1)' : 'none' 
            }}
            className="opacity-90"
          />
        )}

        {currentActiveDroneSource && !isConnected && (
           <YoloScanner 
              videoSrc={currentActiveDroneSource || "/video/cctv/14737129_3840_2160_50fps.mp4"}
            />
        )}
        
        {!isConnected && !videoStream && !currentActiveDroneSource && (
          <div className="flex flex-col items-center justify-center gap-6 opacity-30">
            <Activity className="w-12 h-12 text-cyan-500/40" />
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-cyan-200/40 animate-pulse">Awaiting Link</p>
          </div>
        )}
      </div>

      {/* Tactical Vignette/Grid (Tactical Mode only) */}
      {isTactical && (
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] z-[59]" />
      )}
    </div>
  );
};

// Internal Activity Icon for empty state
const Activity = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

export default LiveDroneFeed;
