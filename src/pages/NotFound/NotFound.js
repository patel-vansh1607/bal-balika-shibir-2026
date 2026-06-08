// src/pages/NotFound/NotFound.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient'; // Ensure your path is correct

export default function NotFound() {
  const navigate = useNavigate();
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuth(!!session);
    });
  }, []);

  return (
    <div className="regionWrapper">
      <div className="card" style={{ maxWidth: '400px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '48px', color: 'var(--accent-primary)' }}>404</h1>
        <h2 style={{ fontFamily: 'var(--font-display)' }}>Page Not Found</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
          This page doesn't exist. Let's get you back on track.
        </p>
        <button className="primary-btn" onClick={() => navigate(isAuth ? '/dashboard' : '/')}>
          {isAuth ? 'Return to Dashboard' : 'Return to Login'}
        </button>
      </div>
    </div>
  );
}