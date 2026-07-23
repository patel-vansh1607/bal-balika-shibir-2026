// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast'; // 1. Import Toaster
import Maintenance from './pages/MaintenancePage/MaintenancePage';
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
      {/* 2. Add Toaster here. This makes it available globally. */}
      <Toaster 
        position="top-right" 
        reverseOrder={false}
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
      <Routes>
        <Route path='/' element={<HomeRoute />}/>
        <Route path="/_v1_node_106_health_10548" element={<Login />} />
        <Route path="/admin" element={<NotFound />} />
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