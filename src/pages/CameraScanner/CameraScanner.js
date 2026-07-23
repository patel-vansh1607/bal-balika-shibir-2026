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
import { attendees as attendeesApi, sessionLogs, gateLogs, getStoredUser } from "../../apiClient";

import styles from "./CameraScanner.module.css";
import styless from "../ManualScanner/ManualScanner.module.css"

// Formats DB UTC timestamps into correct 12-hour local time (+3 EAT)
const getFormattedTime = (dateInput = new Date()) => {
  try {
    let date;
    if (typeof dateInput === "string") {
      let isoStr = dateInput.trim();
      // Ensure string is recognized as UTC if missing 'Z' or offset
      if (!isoStr.endsWith("Z") && !isoStr.includes("+") && !isoStr.includes("-")) {
        isoStr = isoStr.replace(" ", "T") + "Z";
      }
      date = new Date(isoStr);
    } else {
      date = dateInput;
    }

    if (isNaN(date.getTime())) {
      date = new Date();
    }

    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch (err) {
    return new Date().toLocaleTimeString();
  }
};

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
  const activeStreamRef     = useRef(null);
  const nativeDetectorRef   = useRef(null);
  const animFrameRef        = useRef(null);

  const statusThemes = {
    success: { bg: "#f0fdf4", accent: "#22c55e", text: "#14532d", subtext: "#166534" },
    warning: { bg: "#fffbeb", accent: "#eab308", text: "#713f12", subtext: "#854d0e" },
    error:   { bg: "#fef2f2", accent: "#ef4444", text: "#7f1d1d", subtext: "#991b1b" },
  };
  const currentTheme = scanResult ? statusThemes[scanResult.status] || statusThemes.success : statusThemes.success;

  const stopCameraEngine = useCallback(async () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => track.stop());
      activeStreamRef.current = null;
    }
    if (html5QrcodeInstance.current) {
      if (html5QrcodeInstance.current.isScanning) {
        try { await html5QrcodeInstance.current.stop(); } catch (err) {}
      }
      html5QrcodeInstance.current = null;
    }
    const container = document.getElementById("qr-reader-container");
    if (container) container.innerHTML = "";
  }, []);

  const handleDecodedText = useCallback(async (decodedText) => {
    if (isProcessingScan.current) return;
    isProcessingScan.current = true;
    setIsProcessing(true);

    let scannedId = decodedText.trim();
    if (scannedId.includes("data=")) scannedId = scannedId.split("data=").pop().split("&")[0];
    scannedId = decodeURIComponent(scannedId).toUpperCase().trim();

    let rawNumericFallback = scannedId;
    if (scannedId.startsWith("MTRC-") && !scannedId.match(/MTRC-(KE|TZ|UG|ZM|MW|BW|ZA)-/)) {
      rawNumericFallback = scannedId.replace("MTRC-", "");
    }

    if (!scannedId) {
      isProcessingScan.current = false;
      setIsProcessing(false);
      return;
    }

    const timestamp     = getFormattedTime();
    const operator      = operatorRef.current;
    const operatorEmail = operator?.email || "unknown@shibir.org";
    const operatorName  = operator?.name  || "system";
    let localLogPayload = { id: crypto.randomUUID(), time: timestamp, processedBy: operatorName };

    const logGateEvent = (payload) => {
      gateLogs.create(payload).catch((e) => {
        console.error("gateLogs.create failed (non-blocking):", e);
      });
    };

    try {
      // Direct API lookup with fallback
      let attendeeRecord = null;
      try {
        const { data: byMember } = await attendeesApi.get(scannedId);
        attendeeRecord = byMember;
        if (!attendeeRecord && !isNaN(rawNumericFallback)) {
          const { data: byId } = await attendeesApi.get(parseInt(rawNumericFallback, 10));
          attendeeRecord = byId;
        }
      } catch (e) {}

      // 1. Unrecognized Token Verification
      if (!attendeeRecord) {
        const errorMsg = `Denied Entry: Token "${scannedId}" unrecognized.`;
        logGateEvent({ scanned_id: scannedId, status: "error", message: errorMsg, operator_email: operatorEmail, operator_name: operatorName, attendee_name: "Unknown Badge" });

        localLogPayload.type = "error"; localLogPayload.text = errorMsg;
        setScannerLog((prev) => [localLogPayload, ...prev]);
        setScanResult({ status: "error", message: `Badge Unrecognized. Token "${scannedId}" not registered.` });
        setIsProcessing(false);
        return;
      }

      // 2. Region Domain Verification
      const assignedRegion    = attendeeRecord.region || "";
      const targetRegionScope = regionScope || "All";
      if (targetRegionScope !== "All" && assignedRegion.toLowerCase() !== targetRegionScope.toLowerCase()) {
        const crossMsg = `Access Denied: ${attendeeRecord.name} belongs to ${assignedRegion} Region.`;
        logGateEvent({ scanned_id: scannedId, status: "error", message: crossMsg, operator_email: operatorEmail, operator_name: operatorName, attendee_name: attendeeRecord.name });

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
        logGateEvent({ scanned_id: scannedId, status: "warning", message: warnMsg, operator_email: operatorEmail, operator_name: operatorName, attendee_name: attendeeRecord.name });

        localLogPayload.type = "warning"; localLogPayload.text = warnMsg;
        setScannerLog((prev) => [localLogPayload, ...prev]);
        setScanResult({ status: "warning", message: "Duplicate Scan Warning!", attendee: attendeeRecord });
        setIsProcessing(false);
        return;
      }

      // 4. Record Success Entry
      const successMsg = `Approved Admission: Check-in completed for ${attendeeRecord.name} (${attendeeRecord.center})`;
      
      // Update check-in state
      if (sessionId) {
        await sessionLogs.create({ session_id: sessionId, attendee_id: rawAttendeeId });
      } else {
        await attendeesApi.update(rawAttendeeId, { status: "Checked In" });
      }

      logGateEvent({ scanned_id: scannedId, status: "success", message: successMsg, operator_email: operatorEmail, operator_name: operatorName, attendee_name: attendeeRecord.name });

      localLogPayload.type = "success"; localLogPayload.text = successMsg;
      setScannerLog((prev) => [localLogPayload, ...prev]);
      setScanResult({ status: "success", message: "Checked In Approved!", attendee: attendeeRecord });

    } catch (err) {
      console.error("Scanner execution pipeline failure:", err);
    } finally {
      setIsProcessing(false);
    }
  }, [regionScope, sessionId]);

  const startCameraEngineDirectly = useCallback(async () => {
    if (isStartingEngine.current) return;
    isStartingEngine.current = true;
    isProcessingScan.current = false;
    setIsProcessing(false);
    await stopCameraEngine();

    const container = document.getElementById("qr-reader-container");
    if (!container) { isStartingEngine.current = false; return; }

    try {
      if ("BarcodeDetector" in window) {
        try {
          const supportedFormats = await window.BarcodeDetector.getSupportedFormats();
          if (supportedFormats.includes("qr_code")) {
            nativeDetectorRef.current = new window.BarcodeDetector({ formats: ["qr_code"] });
            
            const stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            activeStreamRef.current = stream;

            const video = document.createElement("video");
            video.srcObject = stream;
            video.setAttribute("playsinline", "true");
            video.style.width = "100%";
            video.style.height = "100%";
            video.style.objectFit = "cover";
            video.style.display = "block";
            await video.play();

            container.appendChild(video);

            const detectFrame = async () => {
              if (!isProcessingScan.current && video.readyState === video.HAVE_ENOUGH_DATA) {
                try {
                  const barcodes = await nativeDetectorRef.current.detect(video);
                  if (barcodes.length > 0 && barcodes[0].rawValue) {
                    handleDecodedText(barcodes[0].rawValue);
                  }
                } catch (e) {}
              }
              animFrameRef.current = requestAnimationFrame(detectFrame);
            };

            detectFrame();
            isStartingEngine.current = false;
            return;
          }
        } catch (e) {
          console.warn("Native BarcodeDetector initialization failed, falling back to html5Qrcode", e);
        }
      }

      const scanner = new Html5Qrcode("qr-reader-container", {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      html5QrcodeInstance.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 25 },
        (decodedText) => handleDecodedText(decodedText),
        () => {}
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
  }, [stopCameraEngine, handleDecodedText]);

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
            time: getFormattedTime(log.created_at),
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
      stopCameraEngine();
    };
  }, [startCameraEngineDirectly, stopCameraEngine]);

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
            <h3 className={styles.loadingText}>Fetching...</h3>
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
                  <div className={styless.attendeeDataCard}>
                    <div className={styless.dataFieldGroup}>
                      <span className={styless.fieldLabel}>Full Name</span>
                      <span className={styless.fieldValueBold}>{scanResult.attendee.name}</span>
                    </div>
                    <div className={styless.dataGridSplit}>
                      <div>
                        <span className={styless.fieldLabel}>Age : </span>
                        <span className={styless.fieldValueMedium}>{scanResult.attendee.age}</span>
                      </div>
                      <div>
                        <span className={styless.fieldLabel}>Center : </span>
                        <span className={styless.fieldValueMedium}>{scanResult.attendee.center}</span>
                      </div>
                      <div>
                        <span className={styless.fieldLabel}>Tshirt : </span>
                        <span className={styless.fieldValueMedium}>{scanResult.attendee.tshirt_size}</span>
                      </div>
                     <div>
                      <span className={styless.fieldLabel}>Accommodation:</span>
                      <span className={styless.fieldValueMedium}><br/>
                        {scanResult?.attendee?.accommodation || scanResult?.attendee?.accomodation || "Not Assigned"}
                      </span>
                    </div>
                    </div>
                    <div className={styless.dataFieldGroupTopLine}>
                      <span className={styless.fieldLabel}>Shibir ID Number : </span>
                      <code className={styless.monospaceCodeBadge}>
                        {scanResult.attendee.member_id || `MTRC-${scanResult.attendee.id}`}
                      </code>
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