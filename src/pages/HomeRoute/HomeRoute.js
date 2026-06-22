// src/routes/HomeRoute.js
import React from 'react';
import styles from './HomeRoute.module.css';
import LogoImage from '../../assets/images/MTRC.png';

const HomeRoute = () => {
  return (
    <div className={styles.container}>
      <section className={styles.brandingSection}>
        <div className={styles.logoContainer}>
          <img src={LogoImage} alt="Logo" className={styles.logo} />
        </div>
{/* 
        <header className={styles.publicHeader}>
          <h1>Making the Right Choices</h1>
          <p>Bal-Balika Shibir, Africa - 2026</p>
        </header> */}
        
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