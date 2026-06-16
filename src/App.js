// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './pages/ProtectedRoute/ProtectedRoute'; // Ensure this path is correct
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import PublicRegister from './pages/PublicRegister/PublicRegister';
import SelectRegion from './pages/SelectRegion/SelectRegion';
import NotFound from './pages/NotFound/NotFound';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        
        {/* Protected Route Wrapper */}
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
        
        {/* Catch-all redirect */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}