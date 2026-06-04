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
  const [isProcessing, setIsProcessing] = useState(false); 
  
  const html5QrcodeInstance = useRef(null);
  const isProcessingScan = useRef(false);
  const isStartingEngine = useRef(false);
  
  // Use a ref to store operator to eliminate stale closure/hook dependency loops
  const operatorRef = useRef(null);

  // Safely stop and kill the native device video hardware tracks
  const stopCameraEngine = useCallback(async () => {
    if (html5QrcodeInstance.current) {
      if (html5QrcodeInstance.current.isScanning) {
        try {
          await html5QrcodeInstance.current.stop();
        } catch (err) {
          // Suppress asynchronous race condition rejections during teardown
        }
      }
      html5QrcodeInstance.current = null;
    }
    // Deep clean container layout remnants to prevent flickering on rebuilds
    const container = document.getElementById("qr-reader-container");
    if (container) {
      container.innerHTML = "";
    }
  }, []);

  const onScanFailure = useCallback(() => {
    // Drop un-decoded background stream frames cleanly
  }, []);

  // --- MOBILITY OPTIMIZED ENGINE INITIALIZER ---
  const startCameraEngineDirectly = useCallback(async () => {
    if (isStartingEngine.current) return;
    isStartingEngine.current = true;

    isProcessingScan.current = false;
    setIsProcessing(false); 

    await stopCameraEngine();

    const container = document.getElementById("qr-reader-container");
    if (!container) {
      isStartingEngine.current = false;
      return;
    }

    try {
      // ⚡ Native Web API Handshake: Triggers permissions early to prevent library UI fallbacks
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const preemptiveStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
          preemptiveStream.getTracks().forEach(track => track.stop());
        } catch (e) {
          console.warn("Preemptive camera handshake omitted:", e);
        }
      }

      const scanner = new Html5Qrcode("qr-reader-container", {
        formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ],
        verbose: false
      });
      
      html5QrcodeInstance.current = scanner;

      const config = {
        fps: 24, 
        qrbox: (width, height) => {
          const size = Math.min(width, height) * 0.75;
          return { width: size, height: size };
        }
      };

      await scanner.start(
        { facingMode: "environment" }, 
        config,
        async (decodedText) => {
          // Guard lock ensures we drop concurrent video stream frames while validating
          if (isProcessingScan.current) return;
          isProcessingScan.current = true;
          setIsProcessing(true); 

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
          const currentOperator = operatorRef.current;
          const operatorEmail = currentOperator?.email || 'unknown@shibir.org';
          const operatorName = currentOperator?.name || 'system';

          let localLogPayload = {
            id: crypto.randomUUID(),
            time: timestamp,
            processedBy: operatorName
          };

          // Region restriction scope boundary validator
          if (regionScope !== 'All' && !scannedId.startsWith(prefixScope.toUpperCase())) {
            const crossBorderErrorMsg = `Access Denied: Scanned ID "${scannedId}" belongs to another regional center branch.`;
            
            try {
              await supabase.from('gate_logs').insert([{
                scanned_id: scannedId,
                status: 'error',
                message: crossBorderErrorMsg,
                operator_email: operatorEmail,
                operator_name: operatorName,
                attendee_name: 'Cross-Region Member'
              }]);
            } catch (dbErr) {
              console.error("Database log write failed:", dbErr);
            }

            localLogPayload.type = 'error';
            localLogPayload.text = crossBorderErrorMsg;
            
            setScanResult({ 
              status: 'error', 
              message: 'Cross-Partition Domain Violation!', 
              customDetail: `This scanner is restricted strictly to ${regionScope} (${prefixScope}) codes. Entry rejected.` 
            });
            setScannerLog(prev => [localLogPayload, ...prev]);
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
            setIsProcessing(false); 
          }
        },
        onScanFailure
      );

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
        message: 'Camera Access Refused.',
        customDetail: 'Please confirm camera permissions are granted for this origin, and that the page is running on HTTPS.'
      });
    } finally {
      isStartingEngine.current = false;
    }
  }, [stopCameraEngine, onScanFailure, prefixScope, regionScope]);

  useEffect(() => {
    async function initScannerSession() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const userData = {
            email: user.email,
            name: user.user_metadata?.full_name || user.email.split('@')[0]
          };
          operatorRef.current = userData; // Sync to ref tracking structure
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
      } catch (err) {
        console.error("Initialization error:", err);
      }
    }

    initScannerSession();
    
    const initializationTimeout = setTimeout(() => {
      startCameraEngineDirectly();
    }, 150);

    return () => {
      clearTimeout(initializationTimeout);
      if (html5QrcodeInstance.current?.isScanning) {
        html5QrcodeInstance.current.stop().catch(() => {});
      }
    };
  }, [startCameraEngineDirectly]); 

  // Fast UI unlock sequence avoiding native hardware lifecycle teardowns
  const handleCloseResult = () => {
    setScanResult(null);
    isProcessingScan.current = false; 
  };

  return (
    <div className={styles.scannerWorkspaceGrid}>
      <div className={styles.mainCaptureCard} style={{ position: 'relative', overflow: 'hidden' }}>
        
        {/* --- SYSTEM LOADING ABSOLUTE OVERLAY --- */}
        {isProcessing && !scanResult && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(255, 255, 255, 0.95)', zIndex: 5,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            minHeight: '340px'
          }}>
            <div style={{
              width: '45px', height: '45px',
              border: '4px solid #f4ece6', borderTop: '4px solid #8a151b', 
              borderRadius: '50%', animation: 'spin-loader 0.8s linear infinite',
              marginBottom: '16px'
            }}></div>
            <style>{`@keyframes spin-loader { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            <h4 style={{ margin: '0', color: '#2d2926', fontFamily: 'sans-serif' }}>Verifying Credentials...</h4>
            <p style={{ margin: '4px 0 0 0', color: '#6c635c', fontSize: '13px' }}>Connecting to Shibir Cloud Database Securely</p>
          </div>
        )}

        {/* --- DYNAMIC VERIFICATION RESULTS CARD OVERLAY --- */}
        {scanResult && !isProcessing && (
          <div className={`${styles.resultBannerCard} ${styles[scanResult.status]}`} style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 6,
            background: '#fff', overflowY: 'auto', padding: '16px'
          }}>
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

        {/* --- BASE INTERFACE AND CAMERA MOUNT VIEWPORT --- */}
        <div className={styles.cameraWrapperActive}>
          <div className={styles.streamScopeBanner}>
            Scanning exclusively for <strong>{prefixScope}</strong> identity passes...
          </div>
          
          <div id="qr-reader-container" className={styles.videoStreamBox} style={{ overflow: 'hidden', position: 'relative', width: '100%', minHeight: '320px', background: '#000' }}></div>

          {/* Failsafe injection blocks library fallback DOM interfaces */}
          <style>{`
            #qr-reader-container button, 
            #qr-reader-container img, 
            #qr-reader-container input, 
            #qr-reader-container a { 
              display: none !important; 
            }
          `}</style>

          <div className={styles.activeFenceBadge} style={{ marginTop: '12px', justifyContent: 'center' }}>
            <FaShieldAlt /> Region: <strong>{regionScope === 'All' ? 'All Africa' : regionScope}</strong>
          </div>
        </div>

      </div>

      {/* --- SIDE AUDIT TRAIL LOG PANEL --- */}
      <div className={styles.auditLogPanelCard}>
        <div className={styles.auditHeader}>
          <FaHistory style={{ color: '#8a151b' }} />
          <h3>Live Gate Session Logs</h3>
        </div>
        <div className={styles.logStreamTrackFeed}>
          {scannerLog.length === 0 ? (
            <div className={styles.emptyFeedPlaceholder}>
              No entries logged in this active session.
            </div>
          ) : null}
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