// src/App.js
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import PublicRegister from './pages/PublicRegister/PublicRegister';
import SelectRegion from './pages/SelectRegion/SelectRegion';
import MaintenancePage from './pages/MaintenancePage/MaintenancePage';

export default function App() {
  // Toggle this Boolean state variable to 'true' to seamlessly direct 
  // all application entry points into a secure maintenance state.
  const [isUnderMaintenance, setIsUnderMaintenance] = useState(true);

  if (isUnderMaintenance) {
    return (
      <Router>
        <Routes>
          {/* Direct all wildcard requests into the standalone maintenance interface */}
          <Route path="*" element={
            <MaintenancePage 
              title="Shibir Engine Maintenance" 
              estimatedTime="3 Hours" 
              supportEmail="admin@shibir.org" 
            />
          } />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Login page acts as the root route */}
        <Route path="/" element={<Login />} />
        
        {/* Allows internal nested sub-routing inside the Dashboard layout */}
        <Route path="/dashboard/*" element={<Dashboard />} />
        
        <Route path="/register" element={<PublicRegister />} />
        <Route path="/select-region" element={<SelectRegion />} />

        {/* Fallback Catch-All Redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}