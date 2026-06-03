import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient'; // Importing your configured client instance
import styles from './Login.module.css';

export default function Login() {
  const [email, setEmail] = useState(''); // Switched from username to email for Supabase Auth default
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    // Authenticate against your Supabase project instance
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    } else if (data?.user) {
      // Supabase automatically updates token state in local storage under the hood
      navigate('/dashboard');
    }
  };

  const handleGuestAccess = (e) => {
    e.preventDefault(); 
    e.stopPropagation();
    
    // Explicitly fallback to absolute native routing if browser history blocks internal state
    try {
      navigate('/dashboard');
    } catch (err) {
      console.warn("SPA Router context missing on prod environment, dropping back to window.location");
      window.location.href = '/dashboard';
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.headerGroup}>
          <h2 className={styles.title}>Bal Balika Shibir</h2>
          <p className={styles.subtitle}>Management & Gate Control Portal</p>
        </div>

        {errorMsg && <div className={styles.errorBanner}>⚠️ {errorMsg}</div>}

        <form onSubmit={handleLoginSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Email Address</label>
            <input 
              type="email" 
              required
              className={styles.input} 
              placeholder="admin@shibir.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Access Password</label>
            <input 
              type="password" 
              required
              className={styles.input} 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Verifying...' : 'Verify Credentials'}
          </button>
          
          <div className={styles.dividerZone}>
            <span>or</span>
          </div>

          <button 
            type="button" 
            onClick={handleGuestAccess}
            className={styles.guestBtn}
            disabled={loading}
          >
            Just Visiting
          </button>
        </form>
      </div>
    </div>
  );
}