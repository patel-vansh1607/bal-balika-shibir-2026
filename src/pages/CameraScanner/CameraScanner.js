import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { 
  FaCamera, 
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
  const [isEnabled, setIsEnabled] = useState(false);
  const [scannerLog, setScannerLog] = useState([]);
  const [scanResult, setScanResult] = useState(null); 
  const [operator, setOperator] = useState(null);
  const scannerInstance = useRef(null);
  const isProcessingScan = useRef(false);

  // 1. Fetch active operator details & sync initial gate logs from backend on mount
  useEffect(() => {
    async function initScannerSession() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setOperator({
          email: user.email,
          name: user.user_metadata?.full_name || user.email.split('@')[0]
        });
      }

      // Fetch the last 20 real gate log entries from the database
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
    return () => clearScannerInstance();
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
    isProcessingScan.current = false;

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
          message: 'Could not access local video stream hardware.'
        });
        setIsEnabled(false);
      }
    }, 150);
  };

  const onScanSuccess = async (decodedText) => {
    if (isProcessingScan.current) return;
    isProcessingScan.current = true;

    clearScannerInstance();
    setIsEnabled(false);

    let scannedId = decodedText.trim();
    if (scannedId.includes('data=')) {
      scannedId = scannedId.split('data=').pop().split('&')[0];
    }
    scannedId = decodeURIComponent(scannedId).toUpperCase().trim();

    if (!scannedId) {
      isProcessingScan.current = false;
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

    // --- CRITICAL SCOPE CROSS-CHECK ENFORCEMENT ---
    // If user is locked to a specific country hub, ensure scanned code begins with that specific layout signature
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
      return;
    }

    try {
      // Query the attendee profile using the descriptive member_id token string field
      const { data: attendee, error: fetchError } = await supabase
        .from('attendees') 
        .select('*')
        .eq('member_id', scannedId)
        .maybeSingle();

      // CASE A: Alphanumeric custom code not found anywhere in public.attendees registry
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

      // CASE B: Attendee is found but has already verified check-in status rules
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

      // CASE C: Successful valid check-in
      const successMsg = `Approved Admission: Verified check-in completed for ${attendee.name} (${attendee.center})`;

      // Mutate attendee status record to Checked In matching by member_id string field safely
      await supabase
        .from('attendees')
        .update({ status: 'Checked In' })
        .eq('member_id', attendee.member_id);

      // Save transaction data directly to database audit trail logs
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
    }
  };

  const onScanFailure = () => {
    // Silent frame capture drop
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
            
            {/* Realtime Active Boundary Notice Box */}
            <div className={styles.activeFenceBadge}>
              <FaShieldAlt /> Restricted Scope: <strong>{regionScope === 'All' ? 'All Africa' : regionScope} ({prefixScope})</strong>
            </div>

            <p className={styles.cardSubtitle}>
              Active Operator Session: <strong style={{ color: '#8a151b', textTransform: 'capitalize' }}>{operator?.name || 'Loading...'}</strong>
            </p>
            <button onClick={handleStartCamera} className={styles.activateDeviceBtn}>
              Initialize Camera Device
            </button>
          </div>
        )}

        {/* Live Active Stream Container */}
        {isEnabled && (
          <div className={styles.cameraWrapperActive}>
            <div className={styles.streamScopeBanner}>
              Scanning exclusively for <strong>{prefixScope}</strong> identity passes...
            </div>
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
            scannerLog.map((log) => (
              <div key={log.id} className={`${styles.logRowEntry} ${styles[`log_${log.type}`]}`}>
                <div className={styles.logMetaWrapper}>
                  <span className={styles.logTimeToken}>{log.time}</span>
                  <span className={styles.operatorBadge}>By: {log.processedBy}</span>
                </div>
                <span className={styles.logMessageText}>{log.text}</span>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}