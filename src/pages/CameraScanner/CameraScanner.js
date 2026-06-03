import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { 
  FaCamera, 
  FaCheckCircle, 
  FaExclamationTriangle, 
  FaTimes, 
  FaUserCheck, 
  FaHistory 
} from 'react-icons/fa';
import styles from './CameraScanner.module.css';

// Local Mock Database for decoupled gate pipeline matching
const MOCK_ATTENDEE_DATABASE = [
  { id: "10", name: "Suresh Patel", age: 11, center: "Nairobi", status: "Pending", photo: "public_profile_10_s12.png" },
  { id: "11", name: "Aman Shah", age: 12, center: "Mombasa", status: "Pending", photo: "public_profile_11_23131.png" },
  { id: "7", name: "Vansh Patel", age: 14, center: "Nakuru", status: "Checked In", photo: "public_profile_7_vansh_pat.png" },
  { id: "8", name: "Aman Patel", age: 10, center: "Nakuru", status: "Pending", photo: "public_profile_8_aman_pa.png" },
  { id: "9", name: "Manan Patel", age: 13, center: "Kisumu", status: "Pending", photo: "public_profile_9_manan_p.png" }
];

export default function CameraScanner() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [scannerLog, setScannerLog] = useState([]);
  const [scanResult, setScanResult] = useState(null); 
  
  const scannerInstance = useRef(null);

  // Clean up hardware video capture instances when navigating away
  useEffect(() => {
    return () => {
      clearScannerInstance();
    };
  }, []);

  const clearScannerInstance = () => {
    if (scannerInstance.current) {
      try {
        scannerInstance.current.clear();
        scannerInstance.current = null;
      } catch (err) {
        console.error("Failed to safely unmount html5-qrcode engine pipeline:", err);
      }
    }
  };

  const handleStartCamera = () => {
    setIsEnabled(true);
    setScanResult(null);

    setTimeout(() => {
      try {
        const config = {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ]
        };

        const scanner = new Html5QrcodeScanner("qr-reader-container", config, false);
        
        scanner.render(onScanSuccess, onScanFailure);
        scannerInstance.current = scanner;
      } catch (error) {
        console.error("Camera device layout mounting crash:", error);
        setScanResult({
          status: 'error',
          message: 'Could not access local video stream hardware. Check browser security clearances.'
        });
        setIsEnabled(false);
      }
    }, 150);
  };

  const onScanSuccess = (decodedText) => {
    clearScannerInstance();
    setIsEnabled(false);

    let scannedId = decodedText.trim();
    if (scannedId.includes('data=')) {
      scannedId = scannedId.split('data=').pop().split('&')[0];
    }
    scannedId = decodeURIComponent(scannedId);

    const match = MOCK_ATTENDEE_DATABASE.find(item => item.id === scannedId || item.name.toLowerCase() === scannedId.toLowerCase());
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (!match) {
      setScanResult({
        status: 'error',
        message: `Badge Unknown. ID #${scannedId} does not match any entry logs.`
      });
      setScannerLog(prev => [{ time: timestamp, type: 'error', text: `Failed scan query for token: ${scannedId}` }, ...prev]);
      return;
    }

    if (match.status === 'Checked In') {
      setScanResult({
        status: 'warning',
        message: 'Duplicate Scan Warning!',
        attendee: match
      });
      setScannerLog(prev => [{ time: timestamp, type: 'warning', text: `${match.name} flagged as duplicate access attempt.` }, ...prev]);
    } else {
      match.status = 'Checked In';
      setScanResult({
        status: 'success',
        message: 'Gate Admission Approved!',
        attendee: match
      });
      setScannerLog(prev => [{ time: timestamp, type: 'success', text: `Verified Check-In for ${match.name}` }, ...prev]);
    }
  };

  const onScanFailure = () => {
    // Silent drop on frame capture misses
  };

  const handleCloseResult = () => {
    setScanResult(null);
    handleStartCamera(); 
  };

  return (
    <div className={styles.scannerWorkspaceGrid}>
      
      {/* Primary Video Capture Card Frame */}
      <div className={styles.mainCaptureCard}>
        {!isEnabled && !scanResult && (
          <div className={styles.dormantPlaceholder}>
            <div className={styles.radarPulseWrapper}>
              <FaCamera className={styles.scanIconCenter} />
            </div>
            <h3 className={styles.cardTitle}>Gate Control Scanner</h3>
            <p className={styles.cardSubtitle}>
              Ready to initialize fast hardware video tracking frame arrays to automatically parse and check in Bal Balika Shibir delegate badges.
            </p>
            <button onClick={handleStartCamera} className={styles.activateDeviceBtn}>
              Initialize Camera Device
            </button>
          </div>
        )}

        {/* Live Active Stream Container */}
        {isEnabled && (
          <div className={styles.cameraWrapperActive}>
            <div id="qr-reader-container" className={styles.videoStreamBox}></div>
            <button 
              onClick={() => { clearScannerInstance(); setIsEnabled(false); }} 
              className={styles.killPipelineBtn}
            >
              <FaTimes style={{ marginRight: '6px' }} /> Cancel Session
            </button>
          </div>
        )}

        {/* Dynamic Scanning Verification Display Panel Result Feedback Cards */}
        {scanResult && (
          <div className={`${styles.resultBannerCard} ${styles[scanResult.status]}`}>
            <div className={styles.resultHeader}>
              {scanResult.status === 'success' && <FaCheckCircle className={styles.statusContextIcon} />}
              {scanResult.status === 'warning' && <FaExclamationTriangle className={styles.statusContextIcon} />}
              {scanResult.status === 'error' && <FaTimes className={styles.statusContextIcon} />}
              <div>
                <h4>{scanResult.message}</h4>
                <p>Security Clearance Evaluation Complete</p>
              </div>
            </div>

            {scanResult.attendee && (
              <div className={styles.profileBadgeDataSegment}>
                <div className={styles.metaRowField}>
                  <span className={styles.metaLabel}>Full Legal Name</span>
                  <span className={styles.metaValueText}>{scanResult.attendee.name}</span>
                </div>
                <div className={styles.metaGridHalf}>
                  <div>
                    <span className={styles.metaLabel}>Age Bracket</span>
                    <span className={styles.metaValueText}>{scanResult.attendee.age} Years Old</span>
                  </div>
                  <div>
                    <span className={styles.metaLabel}>Center Branch</span>
                    <span className={styles.metaValueText}>{scanResult.attendee.center}</span>
                  </div>
                </div>
                <div className={styles.metaRowField} style={{ borderBottom: 'none', paddingBottom: '0' }}>
                  <span className={styles.metaLabel}>System Identity ID Reference</span>
                  <span className={styles.metaIdHash}>#{scanResult.attendee.id}</span>
                </div>
              </div>
            )}

            <button onClick={handleCloseResult} className={styles.resumePipelineBtn}>
              <FaUserCheck style={{ marginRight: '8px' }} /> Ready for Next Scan
            </button>
          </div>
        )}
      </div>

      {/* Secondary Live Activity Session Logs Side Panel Audit Feed */}
      <div className={styles.auditLogPanelCard}>
        <div className={styles.auditHeader}>
          <FaHistory style={{ color: '#8a151b' }} />
          <h3>Live Gate Session Logs</h3>
        </div>
        <div className={styles.logStreamTrackFeed}>
          {scannerLog.length === 0 ? (
            <div className={styles.emptyFeedPlaceholder}>
              No scan entries registered over the current browser environment session.
            </div>
          ) : (
            scannerLog.map((log, index) => (
              <div key={index} className={`${styles.logRowEntry} ${styles[`log_${log.type}`]}`}>
                <span className={styles.logTimeToken}>{log.time}</span>
                <span className={styles.logMessageText}>{log.text}</span>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}