import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
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
  const scannerInstance = useRef(null);
  const isProcessingScan = useRef(false);

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

    return () => clearScannerInstance();
  }, []);

  const clearScannerInstance = () => {
    if (scannerInstance.current) {
      try {
        scannerInstance.current.clear();
        scannerInstance.current = null;
      } catch (err) {
        console.error("Failed to unmount scanner:", err);
      }
    }
  };

  const startCameraEngineDirectly = () => {
    isProcessingScan.current = false;
    setIsProcessing(false); 
    clearScannerInstance();

    setTimeout(() => {
      try {
        const config = {
          fps: 20, 
          qrbox: { width: 250, height: 250 },
          formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ],
          videoConstraints: {
            facingMode: "environment" 
          }
        };

        const scanner = new Html5QrcodeScanner("qr-reader-container", config, false);
        scanner.render(onScanSuccess, onScanFailure);
        scannerInstance.current = scanner;
      } catch (error) {
        console.error("Camera direct boot failed:", error);
      }
    }, 100); 
  };

  const onScanSuccess = async (decodedText) => {
    if (isProcessingScan.current) return;
    isProcessingScan.current = true;
    setIsProcessing(true); // Triggers the clean loading display over the camera view

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
      
      clearScannerInstance();
      setScanResult({ 
        status: 'error', 
        message: 'Cross-Partition Domain Violation!', 
        customDetail: `This scanner is restricted strictly to ${regionScope} (${prefixScope}) codes.` 
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

      clearScannerInstance();

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
      console.error("Database processing error:", err);
    } finally {
      isProcessingScan.current = false;
      setIsProcessing(false); 
    }
  };

  const onScanFailure = () => {
    // Drop un-decoded frames cleanly
  };

  const handleCloseResult = () => {
    setScanResult(null);
    startCameraEngineDirectly(); 
  };

  return (
    <div className={styles.scannerWorkspaceGrid}>
      <div className={styles.mainCaptureCard} style={{ position: 'relative' }}>
        
        {/* 🔥 VISUAL LOADING STATE BLOCKER */}
        {isProcessing && !scanResult && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: '#ffffff',
            zIndex: 10,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            minHeight: '300px'
          }}>
            <div style={{
              width: '45px',
              height: '45px',
              border: '4px solid #f4ece6',
              borderTop: '4px solid #8a151b', 
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              marginBottom: '12px'
            }}></div>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            <h4 style={{ margin: '0', color: '#2d2926' }}>Verifying Credentials...</h4>
          </div>
        )}

        {/* --- LIVE ACTIVE STREAM FRAME --- */}
        {/* We use visibility instead of complete DOM removal to protect phone hardware play track promises */}
        <div style={{ visibility: scanResult ? 'hidden' : 'visible', height: scanResult ? '0px' : 'auto', overflow: 'hidden' }}>
          <div className={styles.streamScopeBanner}>
            Scanning exclusively for <strong>{prefixScope}</strong> identity passes...
          </div>
          
          <div id="qr-reader-container" className={styles.videoStreamBox}></div>

          {/* Clean up default fallback file choice selectors on native mobile viewports */}
          <style>{`
            #qr-reader-container button, #qr-reader-container input, #qr-reader-container span a { display: none !important; }
            #qr-reader-container img { display:none !important; }
            #qr-reader-container { border: none !important; }
          `}</style>

          <div className={styles.activeFenceBadge} style={{ marginTop: '12px', justifyContent: 'center' }}>
            <FaShieldAlt /> Region: <strong>{regionScope === 'All' ? 'All Africa' : regionScope}</strong>
          </div>
        </div>

        {/* --- EVALUATION RESULT RESPONSES PANEL --- */}
        {scanResult && (
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