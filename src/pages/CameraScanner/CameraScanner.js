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

// ⚡ PERFORMANCE FIX: Moved static themes outside to prevent garbage collection layout thrashing
const STATUS_THEMES = {
  success: { bg: '#f0fdf4', accent: '#22c55e', text: '#14532d', subtext: '#166534' },
  warning: { bg: '#fffbeb', accent: '#eab308', text: '#713f12', subtext: '#854d0e' },
  error: { bg: '#fef2f2', accent: '#ef4444', text: '#7f1d1d', subtext: '#991b1b' }
};

const COUNTRIES_REGEX = /-(KE|TZ|UG|ZM|MW|BW|ZA)-/;

export default function CameraScanner({ regionScope = 'All', prefixScope = 'MTRC-' }) {
  const [scannerLog, setScannerLog] = useState([]);
  const [scanResult, setScanResult] = useState(null); 
  const [isProcessing, setIsProcessing] = useState(false); 
  
  const html5QrcodeInstance = useRef(null);
  const isProcessingScan = useRef(false);
  const isStartingEngine = useRef(false);
  const operatorRef = useRef({ email: 'unknown@shibir.org', name: 'system' }); // ⚡ FIXED: Default initialized to avoid empty initial frames

  const currentTheme = scanResult ? (STATUS_THEMES[scanResult.status] || STATUS_THEMES.success) : STATUS_THEMES.success;

  const stopCameraEngine = useCallback(async () => {
    if (html5QrcodeInstance.current) {
      if (html5QrcodeInstance.current.isScanning) {
        try {
          await html5QrcodeInstance.current.stop();
        } catch (err) {
          // Suppress race conditions during rapid teardowns
        }
      }
      html5QrcodeInstance.current = null;
    }
  }, []);

  const onScanFailure = useCallback(() => {
    // Drop un-decoded frames instantly with zero execution overhead
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
      const scanner = new Html5Qrcode("qr-reader-container", {
        formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ],
        verbose: false
      });
      
      html5QrcodeInstance.current = scanner;

      // ⚡ SPEED FIX: Increased to 30 FPS, narrowed the camera query scan field box to 60% 
      // This forces the hardware GPU to process fewer pixels per calculation loop cycle.
      const config = {
        fps: 30, 
        qrbox: (width, height) => {
          const size = Math.min(width, height) * 0.60;
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

          // ⚡ SPEED FIX: Dynamic prefix validation with micro-optimized RegExp evaluation
          let rawNumericFallback = scannedId;
          if (scannedId.startsWith(prefixScope) && !COUNTRIES_REGEX.test(scannedId)) {
            rawNumericFallback = scannedId.replace(prefixScope, '');
          }

          if (!scannedId) {
            isProcessingScan.current = false;
            setIsProcessing(false);
            return;
          }

          const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const currentOperator = operatorRef.current;

          let localLogPayload = {
            id: crypto.randomUUID(),
            time: timestamp,
            processedBy: currentOperator.name
          };

          let attendeeRecord = null;
          let fetchErrorInstance = null;

          try {
            // ⚡ SPEED FIX: Replaced serial database lookups with a high-speed parallel Promise array execution
            const numericId = parseInt(rawNumericFallback, 10);
            const isNumeric = !isNaN(numericId);

            const queries = [
              supabase.from('attendees').select('*').eq('member_id', scannedId).maybeSingle()
            ];

            if (isNumeric) {
              queries.push(supabase.from('attendees').select('*').eq('id', numericId).maybeSingle());
            }

            const results = await Promise.all(queries);
            
            const byMemberId = results[0].data;
            const byId = results[1]?.data;

            if (byMemberId) {
              attendeeRecord = byMemberId;
            } else if (byId) {
              attendeeRecord = byId;
            } else {
              fetchErrorInstance = results[0].error || results[1]?.error;
            }
          } catch (lookupErr) {
            console.error("Database resolution failed:", lookupErr);
          }

          if (fetchErrorInstance || !attendeeRecord) {
            const errorMsg = `Denied Entry: Token "${scannedId}" unknown.`;
            
            // ⚡ SPEED FIX: Fire-and-forget write operations to prevent UI thread execution blocking
            supabase.from('gate_logs').insert([{
              scanned_id: scannedId, status: 'error', message: errorMsg,
              operator_email: currentOperator.email, operator_name: currentOperator.name, attendee_name: 'Unknown Badge'
            }]).catch(() => {});

            localLogPayload.type = 'error';
            localLogPayload.text = errorMsg;
            
            setScanResult({ status: 'error', message: `Badge Unrecognized. Token "${scannedId}" not registered.` });
            setScannerLog(prev => [localLogPayload, ...prev]);
            setIsProcessing(false);
            return;
          }

          // Geographical scope verification
          const assignedRegion = attendeeRecord.region || '';
          const targetRegionScope = regionScope || 'All';

          if (targetRegionScope !== 'All' && assignedRegion.toLowerCase() !== targetRegionScope.toLowerCase()) {
            const crossBorderErrorMsg = `Access Denied: ${attendeeRecord.name} belongs to ${assignedRegion}.`;
            
            supabase.from('gate_logs').insert([{
              scanned_id: scannedId, status: 'error', message: crossBorderErrorMsg,
              operator_email: currentOperator.email, operator_name: currentOperator.name, attendee_name: attendeeRecord.name || 'Cross-Region Member'
            }]).catch(() => {});

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

          // Duplicate checks
          if (attendeeRecord.status === 'Checked In') {
            const warningMsg = `Duplicate Flag: ${attendeeRecord.name} scanned again.`;

            supabase.from('gate_logs').insert([{
              scanned_id: scannedId, status: 'warning', message: warningMsg,
              operator_email: currentOperator.email, operator_name: currentOperator.name, attendee_name: attendeeRecord.name
            }]).catch(() => {});

            localLogPayload.type = 'warning';
            localLogPayload.text = warningMsg;

            setScanResult({ status: 'warning', message: 'Duplicate Scan Warning!', attendee: attendeeRecord });
            setScannerLog(prev => [localLogPayload, ...prev]);
            setIsProcessing(false);
            return;
          }

          // Successful validation process
          const successMsg = `Approved Admission: Check-in completed for ${attendeeRecord.name}`;

          try {
            // ⚡ SPEED FIX: Combined database operations into a single simultaneous payload array execution context
            await Promise.all([
              supabase.from('attendees').update({ status: 'Checked In' }).eq('id', attendeeRecord.id),
              supabase.from('gate_logs').insert([{
                scanned_id: scannedId, status: 'success', message: successMsg,
                operator_email: currentOperator.email, operator_name: currentOperator.name, attendee_name: attendeeRecord.name
              }])
            ]);

            localLogPayload.type = 'success';
            localLogPayload.text = successMsg;

            setScanResult({ status: 'success', message: 'Checked In Approved!', attendee: attendeeRecord });
            setScannerLog(prev => [localLogPayload, ...prev]);
          } catch (writeErr) {
            console.error("Failed executing admission payload:", writeErr);
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
    } finally {
      isStartingEngine.current = false;
    }
  }, [stopCameraEngine, onScanFailure, regionScope, prefixScope]);

  useEffect(() => {
    async function initScannerSession() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          operatorRef.current = {
            email: user.email,
            name: user.user_metadata?.full_name || user.email.split('@')[0]
          };
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
    startCameraEngineDirectly();

    return () => {
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
        
        {isProcessing && !scanResult && (
          <div className={styles.premiumOverlay}>
            <div className={styles.loaderSpinner}></div>
            <h3 className={styles.premiumTitle}>Verifying Badge Securely</h3>
            <div className={styles.queryEngineContainer}>
              <span className={styles.pingIndicator}></span>
              <p className={styles.queryEngineText}>Querying Shibir Engine...</p>
            </div>
          </div>
        )}

        {scanResult && !isProcessing && (
          <div className={`${styles.resultBannerCard} ${styles[scanResult.status]}`} style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9,
            background: currentTheme.bg, overflowY: 'auto', padding: '20px',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            boxSizing: 'border-box'
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
                      {scanResult.attendee.member_id || `${prefixScope}${scanResult.attendee.id}`}
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

        <div className={styles.cameraWrapperActive}>
          <div className={styles.streamScopeBanner}>
            Scanning exclusively for <strong>{prefixScope}</strong> identity passes...
          </div>
          <div id="qr-reader-container" className={styles.videoStreamBox} style={{ overflow: 'hidden', position: 'relative', width: '100%', minHeight: '320px', background: '#000' }}></div>
          <div className={styles.activeFenceBadge} style={{ marginTop: '12px', justifyContent: 'center' }}>
            <FaShieldAlt /> Region: <strong>{regionScope === 'All' ? 'All Africa' : regionScope}</strong>
          </div>
        </div>
      </div>

      <div className={styles.auditLogPanelCard}>
        <div className={styles.auditHeader}>
          <FaHistory style={{ color: '#8a151b' }} />
          <h3>Live Gate Session Logs</h3>
        </div>
        <div className={styles.logStreamTrackFeed}>
          {scannerLog.length === 0 ? (
            <div className={styles.emptyFeedPlaceholder}>No entries logged in this active session.</div>
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