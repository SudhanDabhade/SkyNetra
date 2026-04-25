import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Map as MapIcon, 
  ShieldAlert, 
  Settings, 
  Bell, 
  User,
  ChevronRight,
  Activity,
  Navigation,
  Battery,
  Wifi
} from 'lucide-react';
import { useSystemState } from '../context/SystemContext';
import CommandMap from './CommandMap';

const Dashboard = () => {
  const { fleetStatus, alertLog } = useSystemState();
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="flex h-screen w-full bg-[#050505] text-zinc-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-20 lg:w-64 bg-[#0a0a0a] border-r border-zinc-800/50 flex flex-col transition-all duration-300">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <span className="hidden lg:block text-xl font-bold tracking-tight">SkyNetra</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-2">
          <NavItem icon={LayoutDashboard} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
          <NavItem icon={MapIcon} label="Tactical Map" active={activeTab === 'map'} onClick={() => setActiveTab('map')} />
          <NavItem icon={Activity} label="Fleet Status" active={activeTab === 'fleet'} onClick={() => setActiveTab('fleet')} />
          <NavItem icon={Settings} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>

        <div className="p-4 border-t border-zinc-800/50">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-800/50 cursor-pointer transition-colors">
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
              <User className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-medium">Command Center</p>
              <p className="text-xs text-zinc-500">Root Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-zinc-800/50 flex items-center justify-between px-8 bg-[#0a0a0a]/50 backdrop-blur-md sticky top-0 z-10">
          <h2 className="text-lg font-semibold capitalize">{activeTab}</h2>
          <div className="flex items-center gap-4">
            <button className="p-2 text-zinc-400 hover:text-white transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#0a0a0a]"></span>
            </button>
            <div className="h-8 w-px bg-zinc-800"></div>
            <div className="flex items-center gap-2 text-sm text-zinc-400 bg-zinc-900/50 px-3 py-1.5 rounded-lg border border-zinc-800">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              System Online
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-gradient-to-br from-[#050505] to-[#0a0a0a]">
          {activeTab === 'map' && (
            <div className="h-full w-full animate-in fade-in zoom-in-95 duration-500">
              <CommandMap />
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {fleetStatus.map(f => (
                  <StatCard key={f.id} label={f.status} value={f.count} color={f.color} />
                ))}
              </div>

              {/* Main Sections */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Active Alerts */}
                <div className="xl:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">Recent Incidents</h3>
                    <button className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
                      View All <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl overflow-hidden backdrop-blur-sm">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-zinc-800/50 bg-zinc-900/50">
                          <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Location</th>
                          <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Time</th>
                          <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {alertLog.map(alert => (
                          <tr key={alert.id} className="hover:bg-zinc-800/30 transition-colors group cursor-pointer">
                            <td className="px-6 py-4">
                              <span className="text-sm font-medium">{alert.type.replace('_', ' ')}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-zinc-400">{alert.location}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-zinc-500">{alert.time}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                alert.status === 'ACTIVE' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                                alert.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                                'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              }`}>
                                {alert.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Drone Telemetry Preview */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">Drone Uplink: SN-01</h3>
                  <div className="aspect-video bg-zinc-900 rounded-2xl border border-zinc-800 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                    <div className="absolute top-4 left-4 flex gap-2">
                      <span className="bg-rose-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider animate-pulse">Live</span>
                      <span className="bg-black/60 backdrop-blur-md text-[10px] font-bold px-2 py-0.5 rounded text-white/80">4K HDR</span>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-white/60 uppercase">Altitude</p>
                        <p className="text-lg font-mono font-bold">124m</p>
                      </div>
                      <div className="flex gap-4">
                        <TelemetryIcon icon={Battery} value="84%" color="text-emerald-400" />
                        <TelemetryIcon icon={Navigation} value="12km/h" color="text-indigo-400" />
                        <TelemetryIcon icon={Wifi} value="98ms" color="text-cyan-400" />
                      </div>
                    </div>
                  </div>
                  <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98]">
                    Request Manual Override
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
      active 
        ? 'bg-indigo-600/10 text-indigo-500' 
        : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50'
    }`}
  >
    <Icon className={`w-5 h-5 transition-colors ${active ? 'text-indigo-500' : 'group-hover:text-zinc-200'}`} />
    <span className="hidden lg:block text-sm font-semibold">{label}</span>
  </button>
);

const StatCard = ({ label, value, color }) => (
  <div className="bg-zinc-900/30 border border-zinc-800/50 p-6 rounded-2xl backdrop-blur-sm relative overflow-hidden group hover:border-zinc-700/50 transition-colors">
    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 blur-3xl transition-opacity opacity-0 group-hover:opacity-100"></div>
    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
    <div className="flex items-baseline gap-2">
      <span className="text-4xl font-black tracking-tight">{value}</span>
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></div>
    </div>
  </div>
);

const TelemetryIcon = ({ icon: Icon, value, color }) => (
  <div className="flex flex-col items-center gap-1">
    <Icon className={`w-4 h-4 ${color}`} />
    <span className="text-[10px] font-mono font-bold text-white/80">{value}</span>
  </div>
);

export default Dashboard;
