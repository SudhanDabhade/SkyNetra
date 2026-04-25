import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const CommandMap = () => {
  const position = [18.5204, 73.8567]; // Pune, India

  return (
    <div className="h-full w-full bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 relative">
      <MapContainer 
        center={position} 
        zoom={13} 
        scrollWheelZoom={false} 
        className="h-full w-full grayscale contrast-125 invert opacity-80"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position}>
          <Popup>
            Command Center Hub <br /> SkyNetra HQ.
          </Popup>
        </Marker>
        <Circle center={position} radius={2000} pathOptions={{ color: '#6366f1', fillColor: '#6366f1', fillOpacity: 0.1 }} />
      </MapContainer>
      
      {/* Overlay controls */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
        <div className="bg-black/60 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-xl">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Active Zones</p>
          <div className="space-y-2">
            <ZonePill label="Sector 7" status="CLEAR" color="bg-emerald-500" />
            <ZonePill label="Sector 12" status="ALERT" color="bg-rose-500" />
            <ZonePill label="Sector 3" status="PATROL" color="bg-indigo-500" />
          </div>
        </div>
      </div>
    </div>
  );
};

const ZonePill = ({ label, status, color }) => (
  <div className="flex items-center justify-between gap-4">
    <span className="text-xs font-medium text-zinc-300">{label}</span>
    <div className="flex items-center gap-1.5">
      <div className={`w-1.5 h-1.5 rounded-full ${color}`}></div>
      <span className="text-[9px] font-bold text-zinc-500">{status}</span>
    </div>
  </div>
);

export default CommandMap;
