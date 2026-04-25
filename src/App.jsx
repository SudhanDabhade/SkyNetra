import React from 'react';
import { SystemProvider } from './context/SystemContext';
import Dashboard from './components/Dashboard';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <SystemProvider>
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#18181b',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            fontSize: '14px',
          },
        }}
      />
      <Dashboard />
    </SystemProvider>
  );
}

export default App;
