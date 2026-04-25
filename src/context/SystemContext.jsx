import React, { createContext, useContext, useState, useEffect } from 'react';

const SystemContext = createContext();

export const SystemProvider = ({ children }) => {
  const [fleetStatus, setFleetStatus] = useState([
    { id: 'ready', status: 'Available', count: 8, color: '#10B981' },
    { id: 'active', status: 'In Flight', count: 3, color: '#3B82F6' },
    { id: 'maintenance', status: 'Maintenance', count: 1, color: '#F59E0B' }
  ]);

  const [alertLog, setAlertLog] = useState([
    { id: 'ALT-001', type: 'CROWD_DETECTED', location: 'Katraj Junction', time: '12:45', status: 'RESOLVED' },
    { id: 'ALT-002', type: 'FIRE_ALERT', location: 'Swargate Square', time: '13:10', status: 'ACTIVE' },
    { id: 'ALT-003', type: 'TRAFFIC_CONGESTION', location: 'Shivajinagar', time: '14:20', status: 'PENDING' }
  ]);

  const [activeMission, setActiveMission] = useState(null);
  const [sosEmergency, setSosEmergency] = useState(null);

  const deployDrone = (incidentId, droneId = 'SN-01') => {
    setActiveMission({ incidentId, droneId, startTime: Date.now() });
  };

  const value = {
    fleetStatus,
    alertLog,
    activeMission,
    setActiveMission,
    sosEmergency,
    setSosEmergency,
    deployDrone
  };

  return <SystemContext.Provider value={value}>{children}</SystemContext.Provider>;
};

export const useSystemState = () => useContext(SystemContext);
