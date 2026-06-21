import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../apiClient";
import { useAuth } from "../../context/AuthContext";
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import styles from "./Login.module.css";
import { ReactComponent as Logo } from '../../assets/images/Making the Right Choices - Logo_ColorScalable.svg'

export default function Login() {
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [errorMsg, setErrorMsg]         = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const { token, user } = await auth.login(email.trim(), password);
      login(token, user);
      navigate("/select-region");
    } catch (err) {
      setErrorMsg(err.message || "Invalid email or password.");
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.headerGroup}>
              <div className={styles.container}>
      <section className={styles.brandingSection}>
        {/* Logo inserted here */}
        <div className={styles.logoContainer}>
          <Logo className={styles.logo} />
        </div>

<header className={styles.publicHeader}>
  <h1>Making the Right Choices</h1>
  <h2>Bal-Balika Shibir, Africa - 2026</h2>
  
  {/* Divider added here */}
  <div className={styles.divider} />
  
  <p className={styles.p1}>Attendance Management System</p>
</header>
      </section>
    </div>

        </div>

        {errorMsg && (
          <div className={styles.errorBanner}>
            <span>⚠️ {errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLoginSubmit} className={styles.formElement}>
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

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? (
              <div className={styles.btnLoadingState}>
                <div className={styles.spinner}></div>
                <span>Verifying Credentials...</span>
              </div>
            ) : (
              "Verify Credentials"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
