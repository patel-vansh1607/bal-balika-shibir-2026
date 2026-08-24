// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Maintenance from './pages/MaintenancePage/MaintenancePage';
import ProtectedRoute from './pages/ProtectedRoute/ProtectedRoute';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import PublicRegister from './pages/PublicRegister/PublicRegister';
import SelectRegion from './pages/SelectRegion/SelectRegion';
import NotFound from './pages/NotFound/NotFound';
import HomeRoute from './pages/HomeRoute/HomeRoute';
import ShibirFeedbackForm from './pages/ShibirFeedbackForm/ShibirFeedbackForm';
import UnsubmittedAttendees from './pages/UnsubmittedAttendees/UnsubmittedAttendees';
import SystemFeedback from './pages/SystemFeedback/SystemFeedback';
// Helper component placed directly inside App.js to handle browser tab titles
function DocumentTitleManager() {
  const location = useLocation();

  useEffect(() => {
    const titles = {
      '/': 'Home | Portal',
      '/admin': 'Admin Login | Portal',
      '/dashboard': 'Dashboard | Portal',
      '/register': 'Public Registration | Portal',
      '/feedback': 'Feedback Form | Portal',
      '/select-region': 'Select Region | Portal',
      '/_v1_node_106_health_10548': 'Redirecting...',
      '/systemfeedback': 'System Feedback | Portal',
    };

    let currentTitle = 'Portal';
    
    if (titles[location.pathname]) {
      currentTitle = titles[location.pathname];
    } else if (location.pathname.startsWith('/dashboard')) {
      currentTitle = 'Dashboard | Portal';
    } else {
      currentTitle = 'Page Not Found | Portal';
    }

    document.title = currentTitle;
  }, [location]);

  return null;
}

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
      {/* Manages browser tab titles right next to the favicon */}
      <DocumentTitleManager />

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
        
        <Route 
          path="/_v1_node_106_health_10548" 
          element={<Navigate to="/admin" replace />} 
        />

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
        <Route path="/feedback" element={<ShibirFeedbackForm />} />        
        <Route path="/feedback1" element={<UnsubmittedAttendees />} />
        <Route path="/systemfeedback" element={<SystemFeedback />} />
        <Route path="/select-region" element={<SelectRegion />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}