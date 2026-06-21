// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Maintenance from './pages/MaintenancePage/MaintenancePage'; // Import your new page
import ProtectedRoute from './pages/ProtectedRoute/ProtectedRoute';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import PublicRegister from './pages/PublicRegister/PublicRegister';
import SelectRegion from './pages/SelectRegion/SelectRegion';
import NotFound from './pages/NotFound/NotFound';
import HomeRoute from './pages/HomeRoute/HomeRoute';

export default function App() {
  const [isMaintenance, setIsMaintenance] = useState(false);

  useEffect(() => {
    setIsMaintenance(false);
  }, []);

  if (isMaintenance) {
    return <Maintenance />;
  }

  return (
    <Router>
      <Routes>
        <Route path='/' element={<HomeRoute />}/>
        <Route path="/admin" element={<Login />} />
        <Route 
          path="/dashboard/*" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route path="/register" element={<PublicRegister />} />
        <Route path="/select-region" element={<SelectRegion />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}