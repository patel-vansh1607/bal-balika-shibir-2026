import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient'; 
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import styles from './Login.module.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      // Authenticate against your Supabase project instance
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
      } else if (data?.user) {
        // Route them directly to the region partition gateway
        navigate('/select-region');
      }
    } catch (err) {
      setErrorMsg('An unexpected network runtime error occurred.');
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        
        {/* Portal Branding Header */}
        <div className={styles.headerGroup}>
<div className={styles.container}>
      {/* Replaced FaShieldAlt with the custom logo image */}
      <img 
        src="https://res.cloudinary.com/dxgkcyfrl/image/upload/v1780507737/BAPS_Aksharderi_Transperent_PNG_o9ldiv.png" 
        className={styles.shieldIcon} 
        alt="BAPS Aksharderi Logo" 
      />
    </div>
          <h2 className={styles.title}>Bal Balika Shibir 2026</h2>
          <p className={styles.subtitle}>Management System</p>
        </div>

        {/* Runtime Error Banner */}
        {errorMsg && (
          <div className={styles.errorBanner}>
            <span>⚠️ {errorMsg}</span>
          </div>
        )}

        {/* Access Form */}
        <form onSubmit={handleLoginSubmit} className={styles.formElement}>
          
          {/* Email Address Input */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Email Address</label>
            <div className={styles.inputContainer}>
              <FaEnvelope className={styles.fieldIcon} />
              <input 
                type="email" 
                required
                className={styles.input} 
                placeholder="admin@shibir.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Access Password Input */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Access Password</label>
            <div className={styles.inputContainer}>
              <FaLock className={styles.fieldIcon} />
              <input 
                type={showPassword ? "text" : "password"} 
                required
                className={styles.input} 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          {/* Verification Button */}
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? (
              <div className={styles.btnLoadingState}>
                <div className={styles.spinner}></div>
                <span>Verifying Credentials...</span>
              </div>
            ) : (
              'Verify Credentials'
            )}
          </button>

        </form>

        {/* System Information Footer */}
        {/* <div className={styles.loginFooter}>
          Authorized Personnel Only • Secure Session Guard active
        </div> */}

      </div>
    </div>
  );
}