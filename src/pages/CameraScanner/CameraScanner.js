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
  const operatorRef = useRef(null);

  // Dynamic Theme Definitions for Bulletproof Responsiveness & Visual Feedback
  const statusThemes = {
    success: { bg: '#f0fdf4', accent: '#22c55e', text: '#14532d', subtext: '#166534' },
    warning: { bg: '#fffbeb', accent: '#eab308', text: '#713f12', subtext: '#854d0e' },
    error: { bg: '#fef2f2', accent: '#ef4444', text: '#7f1d1d', subtext: '#991b1b' }
  };

  const currentTheme = scanResult ? (statusThemes[scanResult.status] || statusThemes.success) : statusThemes.success;

  const stopCameraEngine = useCallback(async () => {
    if (html5QrcodeInstance.current) {
      if (html5QrcodeInstance.current.isScanning) {
        try {
          await html5QrcodeInstance.current.stop();
        } catch (err) {
          // Suppress asynchronous race conditions during teardown
        }
      }
      html5QrcodeInstance.current = null;
    }
    const container = document.getElementById("qr-reader-container");
    if (container) {
      container.innerHTML = "";
    }
  }, []);

  const onScanFailure = useCallback(() => {
    // Drop un-decoded background stream frames cleanly
  }, []);

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
          if (isProcessingScan.current) return;
          isProcessingScan.current = true;
          setIsProcessing(true); 

          let scannedId = decodedText.trim();
          if (scannedId.includes('data=')) {
            scannedId = scannedId.split('data=').pop().split('&')[0];
          }
          scannedId = decodeURIComponent(scannedId).toUpperCase().trim();

          // Try splitting off generic local tags if present (e.g. MTRC-15 -> 15)
          let rawNumericFallback = scannedId;
          if (scannedId.startsWith('MTRC-') && !scannedId.includes('-KE-') && !scannedId.includes('-TZ-') && !scannedId.includes('-UG-') && !scannedId.includes('-ZM-') && !scannedId.includes('-MW-') && !scannedId.includes('-BW-') && !scannedId.includes('-ZA-')) {
            rawNumericFallback = scannedId.replace('MTRC-', '');
          }

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

          // Step 1: Pre-fetch record flexibly via custom alphanumeric token OR numeric Primary Key fallback
          let attendeeRecord = null;
          let fetchErrorInstance = null;

          try {
            // Check absolute alphanumeric layout first
            const { data: byMemberId, error: err1 } = await supabase
              .from('attendees')
              .select('*')
              .eq('member_id', scannedId)
              .maybeSingle();

            if (byMemberId) {
              attendeeRecord = byMemberId;
            } else if (!isNaN(rawNumericFallback)) {
              // Check structural integer index key second
              const { data: byId, error: err2 } = await supabase
                .from('attendees')
                .select('*')
                .eq('id', parseInt(rawNumericFallback, 10))
                .maybeSingle();
              attendeeRecord = byId;
              fetchErrorInstance = err2;
            } else {
              fetchErrorInstance = err1;
            }
          } catch (lookupErr) {
            console.error("Database resolution failed:", lookupErr);
          }

          // Step 2: Handle totally unrecognized tokens
          if (fetchErrorInstance || !attendeeRecord) {
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
            setIsProcessing(false);
            return;
          }

          // Step 3: Validate geographical permission logic cleanly matching database names
          const assignedRegion = attendeeRecord.region || '';
          const targetRegionScope = regionScope || 'All';

          if (targetRegionScope !== 'All' && assignedRegion.toLowerCase() !== targetRegionScope.toLowerCase()) {
            const crossBorderErrorMsg = `Access Denied: ${attendeeRecord.name} belongs to ${assignedRegion} Region.`;
            
            try {
              await supabase.from('gate_logs').insert([{
                scanned_id: scannedId,
                status: 'error',
                message: crossBorderErrorMsg,
                operator_email: operatorEmail,
                operator_name: operatorName,
                attendee_name: attendeeRecord.name || 'Cross-Region Member'
              }]);
            } catch (dbErr) {
              console.error("Database log write failed:", dbErr);
            }

            localLogPayload.type = 'error';
            localLogPayload.text = crossBorderErrorMsg;
            
            setScanResult({ 
              status: 'error', 
              message: 'Cross-Partition Domain Violation!', 
              customDetail: `This scanner is restricted strictly to ${regionScope}. Entry rejected.` 
            });
            setScannerLog(prev => [localLogPayload, ...prev]);
            setIsProcessing(false); 
            return;
          }

          // Step 4: Handle duplicate check-ins
          if (attendeeRecord.status === 'Checked In') {
            const warningMsg = `Duplicate Flag: ${attendeeRecord.name} scanned again at verification check.`;

            await supabase.from('gate_logs').insert([{
              scanned_id: scannedId,
              status: 'warning',
              message: warningMsg,
              operator_email: operatorEmail,
              operator_name: operatorName,
              attendee_name: attendeeRecord.name
            }]);

            localLogPayload.type = 'warning';
            localLogPayload.text = warningMsg;

            setScanResult({ status: 'warning', message: 'Duplicate Scan Warning!', attendee: attendeeRecord });
            setScannerLog(prev => [localLogPayload, ...prev]);
            setIsProcessing(false);
            return;
          }

          // Step 5: Process standard successful validation
          const successMsg = `Approved Admission: Check-in completed for ${attendeeRecord.name} (${attendeeRecord.center})`;

          try {
            await supabase
              .from('attendees')
              .update({ status: 'Checked In' })
              .eq('id', attendeeRecord.id);

            await supabase.from('gate_logs').insert([{
              scanned_id: scannedId,
              status: 'success',
              message: successMsg,
              operator_email: operatorEmail,
              operator_name: operatorName,
              attendee_name: attendeeRecord.name
            }]);

            localLogPayload.type = 'success';
            localLogPayload.text = successMsg;

            setScanResult({ status: 'success', message: 'Checked In Approved!', attendee: attendeeRecord });
            setScannerLog(prev => [localLogPayload, ...prev]);
          } catch (writeErr) {
            console.error("Failed executing admission payload state commitment:", writeErr);
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
          operatorRef.current = userData; 
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

  const handleCloseResult = () => {
    setScanResult(null);
    isProcessingScan.current = false; 
  };

  return (
    <div className={styles.scannerWorkspaceGrid}>
      <div className={styles.mainCaptureCard} style={{ position: 'relative', overflow: 'hidden', borderRadius: '12px' }}>
        
        {/* --- PREMIUM GLOWING GLASS-MORPHISM LOADING OVERLAY --- */}
        {isProcessing && !scanResult && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            zIndex: 10, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', padding: '24px',
            animation: 'fadeIn 0.25s ease-out'
          }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{
                width: '60px', height: '60px',
                border: '3px solid rgba(138, 21, 27, 0.1)', borderTop: '3px solid #8a151b', 
                borderRadius: '50%', animation: 'spin-loader 0.75s infinite linear'
              }}></div>
              <div style={{
                position: 'absolute', width: '40px', height: '40px',
                border: '3px solid transparent', borderBottom: '3px solid #2d2926',
                borderRadius: '50%', animation: 'spin-loader 1.2s infinite reverse linear'
              }}></div>
            </div>
            
            <style>{`
              @keyframes spin-loader { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
              @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
            
            <h3 style={{ margin: '20px 0 6px 0', color: '#2d2926', fontFamily: 'system-ui, sans-serif', fontWeight: '600', letterSpacing: '-0.01em' }}>
              Verifying Badge Securely
            </h3>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px', background: 'rgba(0,0,0,0.04)', borderRadius: '20px'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#8a151b', animation: 'ping 1s infinite' }}></span>
              <p style={{ margin: '0', color: '#555', fontSize: '12px', fontWeight: '500' }}>Querying Shibir Engine...</p>
            </div>
            <style>{`@keyframes ping { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(2.2); opacity: 0; } }`}</style>
          </div>
        )}

        {/* --- HIGHLY RESPONSIVE ADAPTIVE CARD OVERLAY --- */}
        {scanResult && !isProcessing && (
          <div className={`${styles.resultBannerCard} ${styles[scanResult.status]}`} style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9,
            background: currentTheme.bg, overflowY: 'auto', padding: '20px',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            boxSizing: 'border-box', animation: 'fadeIn 0.2s ease-out'
          }}>
            
            <div style={{ width: '100%' }}>
              <div style={{ 
                display: 'flex', alignItems: 'flex-start', gap: '14px', 
                borderBottom: `1px solid rgba(0,0,0,0.06)`, paddingBottom: '16px', marginBottom: '16px'
              }}>
                <div style={{ fontSize: '32px', color: currentTheme.accent, display: 'flex', alignItems: 'center' }}>
                  {scanResult.status === 'success' && <FaCheckCircle />}
                  {scanResult.status === 'warning' && <FaExclamationTriangle />}
                  {scanResult.status === 'error' && <FaTimes />}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 4px 0', color: currentTheme.text, fontSize: '18px', fontWeight: '700', lineHeight: '1.2' }}>
                    {scanResult.message}
                  </h4>
                  <p style={{ margin: '0', color: currentTheme.subtext, fontSize: '13px', lineHeight: '1.4', fontWeight: '500' }}>
                    {scanResult.customDetail || 'Check In Complete'}
                  </p>
                </div>
              </div>

              {scanResult.attendee && (
                <div style={{ background: 'rgba(255,255,255,0.65)', borderRadius: '10px', padding: '14px', border: '1px solid rgba(0,0,0,0.04)' }}>
                  
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', color: '#666', fontWeight: '600', letterSpacing: '0.05em' }}>Full Name</span>
                    <span style={{ fontSize: '16px', fontWeight: '700', color: '#111' }}>{scanResult.attendee.name}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '12px', marginBottom: '12px', borderTop: '1px dashed rgba(0,0,0,0.08)', paddingTop: '12px' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', color: '#666', fontWeight: '600' }}>Age</span>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#222' }}>{scanResult.attendee.age} Years Old</span>
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', color: '#666', fontWeight: '600' }}>Center</span>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#222' }}>{scanResult.attendee.center}</span>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px dashed rgba(0,0,0,0.08)', paddingTop: '10px' }}>
                    <span style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', color: '#666', fontWeight: '600' }}>Shibir ID Number</span>
                    <code style={{ fontSize: '12px', color: '#444', background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '4px', wordBreak: 'break-all' }}>
                      {scanResult.attendee.member_id || `MTRC-${scanResult.attendee.id}`}
                    </code>
                  </div>

                </div>
              )}
            </div>

            <button 
              onClick={handleCloseResult} 
              className={styles.resumePipelineBtn}
              style={{
                width: '100%', padding: '14px', background: '#2d2926', color: '#fff',
                border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                cursor: 'pointer', marginTop: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
              }}
            >
              <FaUserCheck /> Dismiss & Scan Next
            </button>
          </div>
        )}

        {/* --- BASE INTERFACE AND CAMERA MOUNT VIEWPORT --- */}
        <div className={styles.cameraWrapperActive}>
          <div className={styles.streamScopeBanner}>
            Scanning exclusively for <strong>{prefixScope}</strong> identity passes...
          </div>
          
          <div id="qr-reader-container" className={styles.videoStreamBox} style={{ overflow: 'hidden', position: 'relative', width: '100%', minHeight: '320px', background: '#000' }}></div>

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