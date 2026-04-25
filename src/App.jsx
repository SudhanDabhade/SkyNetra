import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SystemProvider, useSystemState } from './context/SystemContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import MobileDroneNode from './components/MobileDroneNode';
import Footer from './components/Footer';
import { Toaster, toast } from 'react-hot-toast';

const DashboardLayout = () => {
  const [activeTab, setActiveTab] = useState('front');
  
  const renderContent = () => {
    switch (activeTab) {
      case 'front':
        return <Dashboard />;
      // ... other tabs can be added here or handled inside Dashboard
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="h-screen w-screen bg-[#0a0a0a] text-white selection:bg-cyan-500/30 overflow-hidden">
      {renderContent()}
    </div>
  );
};

// Simplified Icons for the shell placeholders
const ShieldIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const ActivityIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const App = () => (
  <SystemProvider>
    <BrowserRouter>
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#18181b', // zinc-900
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            fontSize: '14px',
            fontWeight: '600'
          },
        }}
      />
      <Routes>
        <Route path="/" element={<DashboardLayout />} />
        <Route path="/drone" element={<MobileDroneNode />} />
      </Routes>
    </BrowserRouter>
  </SystemProvider>
);

export default App;
