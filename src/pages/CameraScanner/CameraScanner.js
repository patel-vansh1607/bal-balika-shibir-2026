import React, { useState } from 'react';
import { FaCamera, FaSpinner } from 'react-icons/fa';
import styles from '../Dashboard/Dashboard'; // Inheriting shared structural workspace CSS context

export default function CameraScanner() {
  const [isInitializing, setIsInitializing] = useState(false);

  const handleStartCamera = () => {
    setIsInitializing(true);
    // Mock timing initialization loops for high-speed device mount pipelines
    setTimeout(() => {
      alert("Camera engine initialized. Ready to intercept entry badge scan streams.");
      setIsInitializing(false);
    }, 1200);
  };

  return (
    <div className={styles.contentCard}>
      <div className={styles.placeholderBox}>
        <FaCamera className={styles.scanIconMock} />
        
        <h3 style={{ fontFamily: 'var(--font-display)', margin: '0 0 8px 0', color: 'var(--text-main)' }}>
          Hardware Scanner Interface
        </h3>
        
        <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: 'var(--text-muted)', maxWidth: '460px', lineHeigt: '1.5' }}>
          Ready to mount high-speed video capture engine loops to parse and check in Shibir delegate gate badges automatically.
        </p>
        
        <button 
          onClick={handleStartCamera} 
          className={styles.primaryActionBtn}
          disabled={isInitializing}
        >
          {isInitializing ? (
            <><FaSpinner className={styles.spin} style={{ marginRight: '8px' }} /> Accessing Video Pipeline...</>
          ) : (
            'Initialize Camera Device'
          )}
        </button>
      </div>
    </div>
  );
}