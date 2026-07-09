import React, { useState, useEffect, useRef, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimes,
  FaHistory,
  FaShieldAlt,
  FaArrowRight
} from "react-icons/fa";
import { attendees as attendeesApi, sessionLogs, gateLogs } from "../../apiClient";
import { getStoredUser } from "../../apiClient";
import styles from "./CameraScanner.module.css";

export default function CameraScanner({
  sessionId = null,
  regionScope = "All",
  prefixScope = "MTRC-",
}) {
  const [scannerLog, setScannerLog]     = useState([]);
  const [scanResult, setScanResult]     = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const html5QrcodeInstance = useRef(null);
  const isProcessingScan    = useRef(false);
  const isStartingEngine    = useRef(false);
  const operatorRef         = useRef(null);

  const statusThemes = {
    success: { bg: "#f0fdf4", accent: "#22c55e", text: "#14532d", subtext: "#166534" },
    warning: { bg: "#fffbeb", accent: "#eab308", text: "#713f12", subtext: "#854d0e" },
    error:   { bg: "#fef2f2", accent: "#ef4444", text: "#7f1d1d", subtext: "#991b1b" },
  };
  const currentTheme = scanResult ? statusThemes[scanResult.status] || statusThemes.success : statusThemes.success;

  const stopCameraEngine = useCallback(async () => {
    if (html5QrcodeInstance.current) {
      if (html5QrcodeInstance.current.isScanning) {
        try { await html5QrcodeInstance.current.stop(); } catch (err) {}
      }
      html5QrcodeInstance.current = null;
    }
    const container = document.getElementById("qr-reader-container");
    if (container) container.innerHTML = "";
  }, []);

  const onScanFailure = useCallback(() => {}, []);

  const startCameraEngineDirectly = useCallback(async () => {
    if (isStartingEngine.current) return;
    isStartingEngine.current = true;
    isProcessingScan.current = false;
    setIsProcessing(false);
    await stopCameraEngine();

    const container = document.getElementById("qr-reader-container");
    if (!container) { isStartingEngine.current = false; return; }

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
          stream.getTracks().forEach((t) => t.stop());
        } catch (e) {}
      }

      const scanner = new Html5Qrcode("qr-reader-container", {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      html5QrcodeInstance.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 30, qrbox: (w, h) => { const s = Math.min(w, h) * 0.8; return { width: s, height: s }; } },
        async (decodedText) => {
          if (isProcessingScan.current) return;
          isProcessingScan.current = true;
          setIsProcessing(true); // Short loading indicator while network acts

          let scannedId = decodedText.trim();
          if (scannedId.includes("data=")) scannedId = scannedId.split("data=").pop().split("&")[0];
          scannedId = decodeURIComponent(scannedId).toUpperCase().trim();

          let rawNumericFallback = scannedId;
          if (scannedId.startsWith("MTRC-") && !scannedId.match(/MTRC-(KE|TZ|UG|ZM|MW|BW|ZA)-/)) {
            rawNumericFallback = scannedId.replace("MTRC-", "");
          }

          if (!scannedId) { isProcessingScan.current = false; setIsProcessing(false); return; }

          const timestamp    = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
          const operator     = operatorRef.current;
          const operatorEmail= operator?.email || "unknown@shibir.org";
          const operatorName = operator?.name  || "system";
          let localLogPayload = { id: crypto.randomUUID(), time: timestamp, processedBy: operatorName };

          try {
            // --- PARALLEL SPEED FETCH ---
            // Grabs attendee records instantly without waiting step-by-step
            const lookupPromise = (async () => {
              try {
                const { data: byMember } = await attendeesApi.get(scannedId);
                if (byMember) return byMember;
                if (!isNaN(rawNumericFallback)) {
                  const { data: byId } = await attendeesApi.get(parseInt(rawNumericFallback, 10));
                  return byId;
                }
              } catch (e) {}
              return null;
            })();

            const attendeeRecord = await lookupPromise;

            // 1. Unrecognized Token Verification
            if (!attendeeRecord) {
              const errorMsg = `Denied Entry: Token "${scannedId}" unrecognized.`;
              await gateLogs.create({ scanned_id: scannedId, status: "error", message: errorMsg, operator_email: operatorEmail, operator_name: operatorName, attendee_name: "Unknown Badge" });
              
              localLogPayload.type = "error"; localLogPayload.text = errorMsg;
              setScannerLog((prev) => [localLogPayload, ...prev]);
              setScanResult({ status: "error", message: `Badge Unrecognized. Token "${scannedId}" not registered.` });
              setIsProcessing(false);
              return;
            }

            // 2. Region Domain Verification
            const assignedRegion     = attendeeRecord.region || "";
            const targetRegionScope  = regionScope || "All";
            if (targetRegionScope !== "All" && assignedRegion.toLowerCase() !== targetRegionScope.toLowerCase()) {
              const crossMsg = `Access Denied: ${attendeeRecord.name} belongs to ${assignedRegion} Region.`;
              await gateLogs.create({ scanned_id: scannedId, status: "error", message: crossMsg, operator_email: operatorEmail, operator_name: operatorName, attendee_name: attendeeRecord.name });
              
              localLogPayload.type = "error"; localLogPayload.text = crossMsg;
              setScannerLog((prev) => [localLogPayload, ...prev]);
              setScanResult({ status: "error", message: "Cross-Partition Domain Violation!", customDetail: `Restricted strictly to ${regionScope}. Entry rejected.` });
              setIsProcessing(false);
              return;
            }

            // 3. Duplicate Verification
            const rawAttendeeId = attendeeRecord._raw_id || attendeeRecord.id;
            let isAlreadyCheckedIn = false;
            if (sessionId) {
              try {
                const { data: existingLogs } = await sessionLogs.list({ session_id: sessionId, attendee_id: rawAttendeeId });
                if (existingLogs?.length > 0) isAlreadyCheckedIn = true;
              } catch (e) {}
            } else {
              if (attendeeRecord.status === "Checked In") isAlreadyCheckedIn = true;
            }

            if (isAlreadyCheckedIn) {
              const warnMsg = `Duplicate Flag: ${attendeeRecord.name} scanned again.`;
              await gateLogs.create({ scanned_id: scannedId, status: "warning", message: warnMsg, operator_email: operatorEmail, operator_name: operatorName, attendee_name: attendeeRecord.name });
              
              localLogPayload.type = "warning"; localLogPayload.text = warnMsg;
              setScannerLog((prev) => [localLogPayload, ...prev]);
              setScanResult({ status: "warning", message: "Duplicate Scan Warning!", attendee: attendeeRecord });
              setIsProcessing(false);
              return;
            }

            // 4. Record Success Entry
            const successMsg = `Approved Admission: Check-in completed for ${attendeeRecord.name} (${attendeeRecord.center})`;
            if (sessionId) {
              await sessionLogs.create({ session_id: sessionId, attendee_id: rawAttendeeId });
            } else {
              await attendeesApi.update(rawAttendeeId, { status: "Checked In" });
            }
            await gateLogs.create({ scanned_id: scannedId, status: "success", message: successMsg, operator_email: operatorEmail, operator_name: operatorName, attendee_name: attendeeRecord.name });
            
            localLogPayload.type = "success"; localLogPayload.text = successMsg;
            setScannerLog((prev) => [localLogPayload, ...prev]);
            setScanResult({ status: "success", message: "Checked In Approved!", attendee: attendeeRecord });

          } catch (err) {
            console.error("Scanner execution pipeline failure:", err);
          } finally {
            setIsProcessing(false);
          }
        },
        onScanFailure,
      );

      const videoEl = container.querySelector("video");
      if (videoEl) {
        videoEl.setAttribute("playsinline", "true");
        videoEl.setAttribute("webkit-playsinline", "true");
        videoEl.style.objectFit = "cover";
        videoEl.style.width  = "100%";
        videoEl.style.height = "100%";
        videoEl.style.display = "block";
      }
    } catch (error) {
      console.error("Camera error:", error);
      setScanResult({ status: "error", message: "Camera Access Refused." });
    } finally {
      isStartingEngine.current = false;
    }
  }, [stopCameraEngine, onScanFailure, regionScope, sessionId]);

  useEffect(() => {
    async function initScannerSession() {
      const stored = getStoredUser();
      if (stored) {
        operatorRef.current = { email: stored.email, name: stored.name || stored.email.split("@")[0] };
      }
      try {
        const { data: logs } = await gateLogs.list(20);
        if (logs) {
          setScannerLog(logs.map((log) => ({
            id: log.id,
            time: new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            type: log.status,
            text: log.message,
            processedBy: log.operator_name || log.operator_email?.split("@")[0] || "system",
          })));
        }
      } catch (err) { console.error("Log trace tracking initialization error:", err); }
    }

    initScannerSession();
    const timeout = setTimeout(() => startCameraEngineDirectly(), 150);
    return () => {
      clearTimeout(timeout);
      if (html5QrcodeInstance.current?.isScanning) html5QrcodeInstance.current.stop().catch(() => {});
    };
  }, [startCameraEngineDirectly]);

  const handleCloseResult = () => { 
    setScanResult(null); 
    isProcessingScan.current = false; 
  };

  return (
    <div className={styles.scannerWorkspaceGrid}>
      <div className={styles.mainCaptureCard}>
        {isProcessing && !scanResult && (
          <div className={styles.loadingOverlay}>
            <div className={styles.spinnerOuter}></div>
            <h3 className={styles.loadingText}>Fetching Roster Data...</h3>
          </div>
        )}

        {scanResult && !isProcessing && (
          <div className={styles.resultBannerOverlay} style={{ background: currentTheme.bg }}>
            <div className={styles.resultContentBlock}>
              <div className={styles.resultHeader}>
                <div style={{ fontSize: "32px", color: currentTheme.accent, display: "flex", alignItems: "center" }}>
                  {scanResult.status === "success" && <FaCheckCircle />}
                  {scanResult.status === "warning" && <FaExclamationTriangle />}
                  {scanResult.status === "error"   && <FaTimes />}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ color: currentTheme.text }} className={styles.resultTitle}>{scanResult.message}</h4>
                  <p style={{ color: currentTheme.subtext }} className={styles.resultSubtitle}>
                    {scanResult.customDetail || (scanResult.status === "success" ? "Check-In Approved Successfully." : "Verification Exception Rule Flagged.")}
                  </p>
                </div>
              </div>
              {scanResult.attendee && (
                <div className={styles.attendeeDataCard}>
                  <div className={styles.dataFieldGroup}>
                    <span className={styles.fieldLabel}>Full Name</span>
                    <span className={styles.fieldValueBold}>{scanResult.attendee.name}</span>
                  </div>
                  <div className={styles.dataGridSplit}>
                    <div><span className={styles.fieldLabel}>Age</span><span className={styles.fieldValueMedium}>{scanResult.attendee.age} Years Old</span></div>
                    <div><span className={styles.fieldLabel}>Center</span><span className={styles.fieldValueMedium}>{scanResult.attendee.center}</span></div>
                  </div>
                </div>
              )}
            </div>
            
            <button 
              onClick={handleCloseResult} 
              className={styles.resumePipelineBtn} 
              style={{ background: scanResult.status === "success" ? "#166534" : scanResult.status === "warning" ? "#713f12" : "#2d2926" }}
            >
              Next Scan <FaArrowRight />
            </button>
          </div>
        )}

        <div className={styles.cameraWrapperActive}>
          <div className={styles.streamScopeBanner}>Scanning exclusively for <strong>{prefixScope}</strong> identity passes...</div>
          <div className={styles.videoStreamContainer}>
            <div id="qr-reader-container" className={styles.videoStreamBox}></div>
          </div>
          <div className={styles.activeFenceBadge}>
            <FaShieldAlt /> Region: <strong>{regionScope === "All" ? "All Africa" : regionScope}</strong>
          </div>
        </div>
      </div>

      <div className={styles.auditLogPanelCard}>
        <div className={styles.auditHeader}><FaHistory style={{ color:"#e78524" }} /><h3>Gate Session Logs</h3></div>
        <div className={styles.logStreamTrackFeed}>
          {scannerLog.length === 0 && <div className={styles.emptyFeedPlaceholder}>No entries logged in this active session.</div>}
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