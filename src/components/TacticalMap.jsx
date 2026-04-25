import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, Tooltip, useMap, Polygon } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import TacticalPanel from './TacticalPanel';
import { Crosshair, Navigation, Tent } from 'lucide-react';

// Custom SVG Icons
const createTacticalIcon = (type) => L.divIcon({
  className: 'custom-tactical-icon',
  html: `
    <div class="relative flex items-center justify-center">
      ${type === 'HUB' ? `
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#00E5FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="drop-shadow-[0_0_8px_#00E5FF]">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          <circle cx="12" cy="12" r="3" fill="#00E5FF" class="animate-pulse" />
        </svg>
      ` : `
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#34C759" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="drop-shadow-[0_0_8px_#34C759]">
          <path d="M10.27 2l-6.69 6.69a2 2 0 0 0 0 2.82L10.27 18.2M21 12l-9-9-9 9 9 9 9-9z" />
          <circle cx="12" cy="12" r="2" fill="#34C759" />
        </svg>
      `}
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const icons = {
  HUB: createTacticalIcon('HUB'),
  UNIT: createTacticalIcon('UNIT'),
};

const SURVEILLANCE_ZONE = [
  [18.4620, 73.8470],
  [18.4630, 73.8530],
  [18.4580, 73.8540],
  [18.4570, 73.8480]
];

const NO_FLY_ZONES = [
  { center: [18.4680, 73.8600], radius: 400, label: 'Pune Airport NFZ' },
  { center: [18.4500, 73.8350], radius: 300, label: 'Restricted Facility' }
];

// Component to sync map center with state
const MapController = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

const TacticalMap = ({ mapState }) => {
  const { center, zoom, markers, paths } = mapState;

  return (
    <TacticalPanel title="Command View: Hub" icon={Crosshair} className="h-full relative">
      <div className="absolute inset-0 bg-[#0B0E14]">
        <MapContainer 
          center={center} 
          zoom={zoom} 
          style={{ height: '100%', width: '100%', background: '#0B0E14' }}
          zoomControl={false}
          attributionControl={false}
        >
          {/* Google Hybrid Map Provider */}
          <TileLayer
            url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
            maxZoom={20}
            attribution='&copy; Google Maps'
          />
          
          <MapController center={center} zoom={zoom} />

          {/* Surveillance Zone: Green Pulse */}
          <Polygon 
            positions={SURVEILLANCE_ZONE}
            pathOptions={{
              color: '#34C759',
              weight: 2,
              fillColor: '#34C759',
              fillOpacity: 0.15,
              className: 'surveillance-zone-pulse'
            }}
          />

          {/* No-Fly Zones: Red Warning */}
          {NO_FLY_ZONES.map((nfz, idx) => (
            <React.Fragment key={`nfz-${idx}`}>
              <Circle 
                center={nfz.center}
                radius={nfz.radius}
                pathOptions={{
                  color: '#FF3B30',
                  weight: 3,
                  fillColor: '#FF3B30',
                  fillOpacity: 0.25,
                  className: 'nfz-warning'
                }}
              />
              <Marker position={nfz.center} icon={L.divIcon({ className: 'hidden' })}>
                <Tooltip permanent direction="center" className="bg-transparent border-none text-[8px] font-bold text-red-500 uppercase">
                  {nfz.label}
                </Tooltip>
              </Marker>
            </React.Fragment>
          ))}

          {/* Range Circles for Units */}
          {markers.filter(m => m.type === 'UNIT').map(unit => (
            <Circle 
              key={`range-${unit.id}`}
              center={unit.pos}
              radius={800}
              pathOptions={{
                color: '#00E5FF',
                weight: 1,
                opacity: 0.3,
                fill: false,
                dashArray: '4, 4'
              }}
            />
          ))}

          {/* High-Contrast Paths */}
          {paths.map((path, idx) => (
            <Polyline 
              key={`path-${idx}`} 
              positions={path} 
              pathOptions={{
                color: '#00E5FF',
                weight: 2,
                opacity: 0.8,
                dashArray: '8, 8'
              }} 
            />
          ))}


          {/* Custom Tactical Markers with Permanent Labels */}
          {markers.map((marker) => (
            <Marker 
              key={marker.id} 
              position={marker.pos} 
              icon={icons[marker.type] || icons.HUB}
            >
              <Tooltip 
                permanent 
                direction="right" 
                offset={[15, 0]} 
                className="tactical-tooltip"
              >
                <span className="tabular-nums">{marker.label}</span>
              </Tooltip>
              <Popup className="tactical-popup">
                <div className="p-2 bg-slate-900 text-white rounded border border-white/10">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 mb-1">{marker.label}</p>
                  <p className="text-[8px] font-bold text-slate-400 tabular-nums">
                    {marker.pos[0].toFixed(4)}°N, {marker.pos[1].toFixed(4)}°E
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* HUD Overlay: Coordinate Display (Pune) */}
        <div className="absolute bottom-4 left-4 bg-slate-950/80 border border-white/5 p-3 rounded-lg backdrop-blur-md z-[1000] pointer-events-none">
          <div className="flex gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Longitude</span>
              <span className="text-[10px] font-bold text-cyan-400 tabular-nums">73.8500 E</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Latitude</span>
              <span className="text-[10px] font-bold text-cyan-400 tabular-nums">18.4600 N</span>
            </div>
          </div>
        </div>

        {/* Scanline Overlay (Inside Map) */}
        <div className="absolute inset-0 pointer-events-none z-[1001] opacity-20 tactical-grid" />
      </div>
    </TacticalPanel>
  );
};

export default TacticalMap;
