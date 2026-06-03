import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { 
  FaCheckCircle, 
  FaExclamationTriangle, 
  FaTimes, 
  FaUserCheck, 
  FaHistory,
  FaShieldAlt
} from 'react-icons/fa';
import { supabase } from '../../supabaseClient'; 
import styles from './CameraScanner.module.css';

export default function CameraScanner({ regionScope = 'All', prefixScope = 'MTRC-' }) {
  const [scannerLog, setScannerLog] = useState([]);
  const [scanResult, setScanResult] = useState(null); 
  const [operator, setOperator] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false); 
  const html5QrcodeInstance = useRef(null);
  const isProcessingScan = useRef(false);

  // Safely stop and kill the native device video hardware tracks
  const stopCameraEngine = useCallback(async () => {
    if (html5QrcodeInstance.current) {
      if (html5QrcodeInstance.current.isScanning) {
        try {
          await html5QrcodeInstance.current.stop();
        } catch (err) {
          console.warn("Muted background error during stream close:", err);
        }
      }
      html5QrcodeInstance.current = null;
    }
  }, []);

  // --- BUSINESS LOGIC PROCESSING BLOCK ---
  const onScanSuccess = useCallback(async (decodedText) => {
    if (isProcessingScan.current) return;
    isProcessingScan.current = true;
    setIsProcessing(true); 

    // Kill the lens stream instantly to stop duplicate scanning and free up device hardware
    await stopCameraEngine();

    let scannedId = decodedText.trim();
    if (scannedId.includes('data=')) {
      scannedId = scannedId.split('data=').pop().split('&')[0];
    }
    scannedId = decodeURIComponent(scannedId).toUpperCase().trim();

    if (!scannedId) {
      isProcessingScan.current = false;
      setIsProcessing(false);
      return;
    }

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const operatorEmail = operator?.email || 'unknown@shibir.org';
    const operatorName = operator?.name || 'system';

    let localLogPayload = {
      id: crypto.randomUUID(),
      time: timestamp,
      processedBy: operatorName
    };

    if (regionScope !== 'All' && !scannedId.startsWith(prefixScope.toUpperCase())) {
      const crossBorderErrorMsg = `Access Denied: Scanned ID "${scannedId}" belongs to another regional center branch.`;
      
      await supabase.from('gate_logs').insert([{
        scanned_id: scannedId,
        status: 'error',
        message: crossBorderErrorMsg,
        operator_email: operatorEmail,
        operator_name: operatorName,
        attendee_name: 'Cross-Region Member'
      }]);

      localLogPayload.type = 'error';
      localLogPayload.text = crossBorderErrorMsg;
      
      setScanResult({ 
        status: 'error', 
        message: 'Cross-Partition Domain Violation!', 
        customDetail: `This scanner is restricted strictly to ${regionScope} (${prefixScope}) codes. Entry rejected.` 
      });
      setScannerLog(prev => [localLogPayload, ...prev]);
      isProcessingScan.current = false;
      setIsProcessing(false); 
      return;
    }

    try {
      const { data: attendee, error: fetchError } = await supabase
        .from('attendees') 
        .select('*')
        .eq('member_id', scannedId)
        .maybeSingle();

      if (fetchError || !attendee) {
        const errorMsg = `Denied Entry: Token "${scannedId}" is completely unknown to the database.`;
        
        await supabase.from('gate_logs').insert([{
          scanned_id: scannedId,
          status: 'error',
          message: errorMsg,
          operator_email: operatorEmail,
          operator_name: operatorName,
          attendee_name: 'Unknown Badge'
        }]);

        localLogPayload.type = 'error';
        localLogPayload.text = errorMsg;
        
        setScanResult({ status: 'error', message: `Badge Unrecognized. Token "${scannedId}" not registered.` });
        setScannerLog(prev => [localLogPayload, ...prev]);
        return;
      }

      if (attendee.status === 'Checked In') {
        const warningMsg = `Duplicate Flag: ${attendee.name} scanned again at verification check.`;

        await supabase.from('gate_logs').insert([{
          scanned_id: scannedId,
          status: 'warning',
          message: warningMsg,
          operator_email: operatorEmail,
          operator_name: operatorName,
          attendee_name: attendee.name
        }]);

        localLogPayload.type = 'warning';
        localLogPayload.text = warningMsg;

        setScanResult({ status: 'warning', message: 'Duplicate Scan Warning!', attendee });
        setScannerLog(prev => [localLogPayload, ...prev]);
        return;
      }

      const successMsg = `Approved Admission: Verified check-in completed for ${attendee.name} (${attendee.center})`;

      await supabase
        .from('attendees')
        .update({ status: 'Checked In' })
        .eq('member_id', attendee.member_id);

      await supabase.from('gate_logs').insert([{
        scanned_id: scannedId,
        status: 'success',
        message: successMsg,
        operator_email: operatorEmail,
        operator_name: operatorName,
        attendee_name: attendee.name
      }]);

      localLogPayload.type = 'success';
      localLogPayload.text = successMsg;

      setScanResult({ status: 'success', message: 'Gate Admission Approved!', attendee });
      setScannerLog(prev => [localLogPayload, ...prev]);

    } catch (err) {
      console.error("Critical error inside camera stream capture block:", err);
    } finally {
      isProcessingScan.current = false;
      setIsProcessing(false); 
    }
  }, [stopCameraEngine, operator, prefixScope, regionScope]);

  const onScanFailure = () => {
    // Silent drop for un-decoded background frames
  };

  // --- MOBILITY OPTIMIZED ENGINE INITIALIZER ---
  const startCameraEngineDirectly = useCallback(async () => {
    isProcessingScan.current = false;
    setIsProcessing(false); 

    // Hard cleanup of any leftover system locks before re-binding to elements
    await stopCameraEngine();

    // Verify container element is drawn completely on mobile screens
    const container = document.getElementById("qr-reader-container");
    if (!container) return;

    try {
      // Using Html5Qrcode instead of Html5QrcodeScanner bypasses fragile auto-generated UI layouts
      const scanner = new Html5Qrcode("qr-reader-container", {
        formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ],
        verbose: false
      });
      
      html5QrcodeInstance.current = scanner;

      const config = {
        fps: 24, // Optimized frame sampling rate for swift tracking on mobile
        qrbox: (width, height) => {
          const size = Math.min(width, height) * 0.70;
          return { width: size, height: size };
        }
      };

      await scanner.start(
        { facingMode: "environment" }, // Instructs the phone OS to select the primary rear lens instantly
        config,
        onScanSuccess,
        onScanFailure
      );

      // Force mobile iOS Safari and Android Chrome to render video element inline without full-screening
      const videoElement = container.querySelector('video');
      if (videoElement) {
        videoElement.setAttribute('playsinline', 'true');
        videoElement.setAttribute('webkit-playsinline', 'true');
        videoElement.style.objectFit = 'cover';
        videoElement.style.width = '100%';
        videoElement.style.height = '100%';
      }

    } catch (error) {
      console.error("Mobile Camera Hardware Handshake Refused:", error);
      setScanResult({
        status: 'error',
        message: 'Camera Permission Denied or Lens Blocked.',
        customDetail: 'Please make sure you allow camera permissions for this site, and use HTTPS connection.'
      });
    }
  }, [onScanSuccess, stopCameraEngine]);

  useEffect(() => {
    async function initScannerSession() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setOperator({
          email: user.email,
          name: user.user_metadata?.full_name || user.email.split('@')[0]
        });
      }

      const { data: logs, error } = await supabase
        .from('gate_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && logs) {
        const formattedLogs = logs.map(log => ({
          id: log.id,
          time: new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          type: log.status,
          text: log.message,
          processedBy: log.operator_name || log.operator_email?.split('@')[0] || 'system'
        }));
        setScannerLog(formattedLogs);
      }
    }

    initScannerSession();
    startCameraEngineDirectly();

    return () => {
      stopCameraEngine();
    };
  }, [startCameraEngineDirectly, stopCameraEngine]); 

  const handleCloseResult = () => {
    setScanResult(null);
    startCameraEngineDirectly(); 
  };

  return (
    <div className={styles.scannerWorkspaceGrid}>
      <div className={styles.mainCaptureCard}>
        
        {isProcessing && !scanResult && (
          <div className={styles.cameraWrapperActive} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '320px' }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '4px solid #f4ece6',
              borderTop: '4px solid #8a151b', 
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: '16px'
            }}></div>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
            <h4 style={{ margin: '0', color: '#2d2926', fontFamily: 'sans-serif' }}>Verifying Credentials...</h4>
            <p style={{ margin: '4px 0 0 0', color: '#6c635c', fontSize: '13px' }}>Connecting to Shibir Cloud Database Securely</p>
          </div>
        )}

        {!scanResult && !isProcessing && (
          <div className={styles.cameraWrapperActive}>
            <div className={styles.streamScopeBanner}>
              Scanning exclusively for <strong>{prefixScope}</strong> identity passes...
            </div>
            
            {/* Dedicated HTML target node container wrapper box */}
            <div id="qr-reader-container" className={styles.videoStreamBox} style={{ overflow: 'hidden', position: 'relative', width: '100%', minHeight: '320px', background: '#000' }}></div>

            <div className={styles.activeFenceBadge} style={{ marginTop: '12px', justifyContent: 'center' }}>
              <FaShieldAlt /> Region: <strong>{regionScope === 'All' ? 'All Africa' : regionScope}</strong>
            </div>
          </div>
        )}

        {scanResult && !isProcessing && (
          <div className={`${styles.resultBannerCard} ${styles[scanResult.status]}`}>
            <div className={styles.resultHeader}>
              {scanResult.status === 'success' && <FaCheckCircle className={styles.statusContextIcon} />}
              {scanResult.status === 'warning' && <FaExclamationTriangle className={styles.statusContextIcon} />}
              {scanResult.status === 'error' && <FaTimes className={styles.statusContextIcon} />}
              <div>
                <h4>{scanResult.message}</h4>
                <p>{scanResult.customDetail || 'Security Clearance Evaluation Complete'}</p>
              </div>
            </div>

            {scanResult.attendee && (
              <div className={styles.profileBadgeDataSegment}>
                <div className={styles.metaRowField}>
                  <span className={styles.metaLabel}>Full Name</span>
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
                  <span className={styles.metaLabel}>System Member ID Reference</span>
                  <span className={styles.metaIdHash}>{scanResult.attendee.member_id}</span>
                </div>
              </div>
            )}

            <button onClick={handleCloseResult} className={styles.resumePipelineBtn}>
              <FaUserCheck style={{ marginRight: '8px' }} /> Ready for Next Scan
            </button>
          </div>
        )}
      </div>

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
            <div className={styles.emptyFeedPlaceholder} style={{display: 'none'}}></div>
          )}
          {scannerLog.map((log) => (
            <div key={log.id} className={`${styles.logRowEntry} ${styles[`log_${log.type}`]}`}>
              <div className={styles.logMetaWrapper}>
                <span className={styles.logTimeToken}>{log.time}</span>
                <span className={styles.operatorBadge}>By: {log.processedBy}</span>
              </div>
              <span className={styles.logMessageText}>{log.text}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}