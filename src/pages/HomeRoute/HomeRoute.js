// src/routes/HomeRoute.js
import React from 'react';
import styles from './HomeRoute.module.css';
import { ReactComponent as Logo } from '../../assets/images/Making the Right Choices - Logo_ColorScalable.svg'

const HomeRoute = () => {
  return (
    <div className={styles.container}>
      <section className={styles.brandingSection}>
        {/* Logo inserted here */}
        <div className={styles.logoContainer}>
          <Logo className={styles.logo} />
        </div>

        <header className={styles.publicHeader}>
          <h1>Making the Right Choices</h1>
          <p>Bal-Balika Shibir, Africa - 2026</p>
        </header>
        
        <div className={styles.ctaWrapper}>
          <a href="/register" className={styles.registerBtn}>
            Register Now
          </a>
        </div>
      </section>
    </div>
  );
}

export default HomeRoute;