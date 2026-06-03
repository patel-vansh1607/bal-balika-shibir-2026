import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './ProtectedRoute.module.css';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className={styles.loaderCanvas}>
        <div className={styles.spinner}></div>
        <p>Verifying Security Credentials...</p>
      </div>
    );
  }

  if (!user) {
    // Send unauthenticated users back to baseline login terminal
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // Intercept permission shortfalls cleanly
    return (
      <div className={styles.unauthorizedContainer}>
        <h3>Access Denied</h3>
        <p>Your current security tier assignment ({userRole}) is unauthorized to view this ecosystem node.</p>
        <a href="/" className={styles.backBtn}>Return to Terminal Workspace</a>
      </div>
    );
  }

  return children;
}