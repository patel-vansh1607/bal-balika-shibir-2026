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
import { supabase } from '../../supabaseClient'; 
import styles from './CameraScanner.module.css';

export default function CameraScanner() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [scannerLog, setScannerLog] = useState([]);
  const [scanResult, setScanResult] = useState(null); 
  const [operator, setOperator] = useState(null);
  const scannerInstance = useRef(null);

  // 1. Fetch active operator details & sync initial gate logs from backend on mount
  useEffect(() => {
    async function initScannerSession() {
      // Get the currently authenticated operator session
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setOperator({
          email: user.email,
          name: user.email.split('@')[0]
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
          processedBy: log.operator_email
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
    clearScannerInstance();
    setIsEnabled(false);

    // Dynamic Sanitization: Safely handle both deep links and raw code tokens
    let scannedId = decodedText.trim();
    if (scannedId.includes('data=')) {
      scannedId = scannedId.split('data=').pop().split('&')[0];
    }
    scannedId = decodeURIComponent(scannedId);

    // Enforce upper-case matching since alpha-codes (MTRC) are capitalized in DB
    scannedId = scannedId.toUpperCase();

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const operatorEmail = operator?.email || 'unknown@shibir.org';

    // 2. Query public.attendees strictly using the alphanumeric text ID
    const { data: attendee, error: fetchError } = await supabase
      .from('attendees') 
      .select('*')
      .eq('id', scannedId)
      .maybeSingle(); // Handles matching gracefully without crashing on string formats

    let localLogPayload = {
      id: crypto.randomUUID(),
      time: timestamp,
      processedBy: operatorEmail
    };

    // CASE A: Alphanumeric ID format not found in public.attendees records
    if (fetchError || !attendee) {
      const errorMsg = `Failed gate verification entry match for token input: "${scannedId}"`;
      
      await supabase.from('gate_logs').insert([{
        scanned_id: scannedId,
        status: 'error',
        message: errorMsg,
        operator_email: operatorEmail
      }]);

      localLogPayload.type = 'error';
      localLogPayload.text = `Badge Unknown. ID ${scannedId} missing from public.attendees list.`;
      
      setScanResult({ status: 'error', message: `Badge Unknown. ID ${scannedId} does not match any entry.` });
      setScannerLog(prev => [localLogPayload, ...prev]);
      return;
    }

    // CASE B: Attendee is found but has already checked in
    if (attendee.status === 'Checked In') {
      const warningMsg = `Duplicate entry warning flag triggered for ${attendee.name}`;

      await supabase.from('gate_logs').insert([{
        scanned_id: scannedId,
        status: 'warning',
        message: warningMsg,
        operator_email: operatorEmail,
        attendee_name: attendee.name
      }]);

      localLogPayload.type = 'warning';
      localLogPayload.text = `Duplicate flag triggered for ${attendee.name} (${attendee.center})`;

      setScanResult({ status: 'warning', message: 'Duplicate Scan Warning!', attendee });
      setScannerLog(prev => [localLogPayload, ...prev]);
      return;
    }

    // CASE C: Successful valid check-in
    const successMsg = `Successful check-in confirmation completed for attendee: ${attendee.name}`;

    // Mutate attendee status record to Checked In using text primary key
    await supabase
      .from('attendees')
      .update({ status: 'Checked In' })
      .eq('id', attendee.id);

    // Save transaction to backend logs
    await supabase.from('gate_logs').insert([{
      scanned_id: scannedId,
      status: 'success',
      message: successMsg,
      operator_email: operatorEmail,
      attendee_name: attendee.name
    }]);

    localLogPayload.type = 'success';
    localLogPayload.text = `Verified Check-In for ${attendee.name}`;

    setScanResult({ status: 'success', message: 'Gate Admission Approved!', attendee });
    setScannerLog(prev => [localLogPayload, ...prev]);
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
            scannerLog.map((log) => (
              <div key={log.id} className={`${styles.logRowEntry} ${styles[`log_${log.type}`]}`}>
                <div className={styles.logMetaWrapper}>
                  <span className={styles.logTimeToken}>{log.time}</span>
                  <span className={styles.operatorBadge}>By: {log.processedBy ? log.processedBy.split('@')[0] : 'system'}</span>
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