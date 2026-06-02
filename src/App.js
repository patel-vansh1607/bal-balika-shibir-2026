// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import PublicRegister from './pages/PublicRegister/PublicRegister';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Login page acts as the root route */}
        <Route path="/" element={<Login />} />
        
        {/* Dashboard page layout */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/register" element={<PublicRegister />} />
      </Routes>
    </Router>
  );
}