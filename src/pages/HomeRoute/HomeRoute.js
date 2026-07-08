import React from 'react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import styles from './HomeRoute.module.css';
import LogoImage from '../../assets/images/MTRC_NEW_Color.svg';

const HomeRoute = () => {
  
  const triggerCelebration = () => {
    // 1. Play Sound

    // 2. Full-page Fireworks Confetti
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) return clearInterval(interval);

      const particleCount = 50 * (timeLeft / duration);
      
      // Fire from both sides
      confetti({ 
        particleCount, 
        spread: 160, 
        origin: { x: 0, y: 0.6 },
        colors: ['#8a151b', '#ffffff', '#2d2926'] 
      });
      confetti({ 
        particleCount, 
        spread: 160, 
        origin: { x: 1, y: 0.6 },
        colors: ['#8a151b', '#ffffff', '#2d2926'] 
      });
    }, 250);
  };

  return (
    <div className={styles.container}>
      <section className={styles.brandingSection}>
        <div className={styles.logoContainer}>
          <img src={LogoImage} alt="Logo" className={styles.logo} />
        </div>
        
        <div className={styles.ctaWrapper}>
          <Link to="/register" className={styles.registerBtn} onClick={triggerCelebration}>
            Register Now
          </Link>
        </div>
      </section>
    </div>
  );
}

export default HomeRoute;