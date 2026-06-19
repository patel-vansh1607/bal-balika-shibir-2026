import React, { useState, useEffect, useRef, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimes,
  FaUserCheck,
  FaHistory,
  FaShieldAlt,
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
        { fps: 24, qrbox: (w, h) => { const s = Math.min(w, h) * 0.75; return { width: s, height: s }; } },
        async (decodedText) => {
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

          if (!scannedId) { isProcessingScan.current = false; setIsProcessing(false); return; }

          const timestamp    = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
          const operator     = operatorRef.current;
          const operatorEmail= operator?.email || "unknown@shibir.org";
          const operatorName = operator?.name  || "system";
          let localLogPayload = { id: crypto.randomUUID(), time: timestamp, processedBy: operatorName };

          let attendeeRecord = null;
          try {
            const { data: byMember } = await attendeesApi.get(scannedId);
            if (byMember) {
              attendeeRecord = byMember;
            } else if (!isNaN(rawNumericFallback)) {
              const { data: byId } = await attendeesApi.get(parseInt(rawNumericFallback, 10));
              attendeeRecord = byId;
            }
          } catch (lookupErr) {
            console.error("Lookup failed:", lookupErr);
          }

          if (!attendeeRecord) {
            const errorMsg = `Denied Entry: Token "${scannedId}" is completely unknown to the database.`;
            await gateLogs.create({ scanned_id: scannedId, status: "error", message: errorMsg, operator_email: operatorEmail, operator_name: operatorName, attendee_name: "Unknown Badge" });
            localLogPayload.type = "error"; localLogPayload.text = errorMsg;
            setScanResult({ status: "error", message: `Badge Unrecognized. Token "${scannedId}" not registered.` });
            setScannerLog((prev) => [localLogPayload, ...prev]);
            setIsProcessing(false);
            return;
          }

          const assignedRegion     = attendeeRecord.region || "";
          const targetRegionScope  = regionScope || "All";
          if (targetRegionScope !== "All" && assignedRegion.toLowerCase() !== targetRegionScope.toLowerCase()) {
            const crossMsg = `Access Denied: ${attendeeRecord.name} belongs to ${assignedRegion} Region.`;
            await gateLogs.create({ scanned_id: scannedId, status: "error", message: crossMsg, operator_email: operatorEmail, operator_name: operatorName, attendee_name: attendeeRecord.name || "Cross-Region" });
            localLogPayload.type = "error"; localLogPayload.text = crossMsg;
            setScanResult({ status: "error", message: "Cross-Partition Domain Violation!", customDetail: `This scanner is restricted strictly to ${regionScope}. Entry rejected.` });
            setScannerLog((prev) => [localLogPayload, ...prev]);
            setIsProcessing(false);
            return;
          }

          const rawAttendeeId = attendeeRecord._raw_id;
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
            const warnMsg = `Duplicate Flag: ${attendeeRecord.name} scanned again at verification check.`;
            await gateLogs.create({ scanned_id: scannedId, status: "warning", message: warnMsg, operator_email: operatorEmail, operator_name: operatorName, attendee_name: attendeeRecord.name });
            localLogPayload.type = "warning"; localLogPayload.text = warnMsg;
            setScanResult({ status: "warning", message: "Duplicate Scan Warning!", attendee: attendeeRecord });
            setScannerLog((prev) => [localLogPayload, ...prev]);
            setIsProcessing(false);
            return;
          }

          const successMsg = `Approved Admission: Check-in completed for ${attendeeRecord.name} (${attendeeRecord.center})`;
          try {
            if (sessionId) {
              await sessionLogs.create({ session_id: sessionId, attendee_id: rawAttendeeId });
            } else {
              await attendeesApi.update(rawAttendeeId, { status: "Checked In" });
            }
            await gateLogs.create({ scanned_id: scannedId, status: "success", message: successMsg, operator_email: operatorEmail, operator_name: operatorName, attendee_name: attendeeRecord.name });
            localLogPayload.type = "success"; localLogPayload.text = successMsg;
            setScanResult({ status: "success", message: "Checked In Approved!", attendee: attendeeRecord });
            setScannerLog((prev) => [localLogPayload, ...prev]);
          } catch (writeErr) {
            console.error("Write failed:", writeErr);
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
      }
    } catch (error) {
      console.error("Camera error:", error);
      setScanResult({ status: "error", message: "Camera Access Refused.", customDetail: "Please confirm camera permissions are granted for this origin, and that the page is running on HTTPS." });
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
      } catch (err) { console.error("Log init error:", err); }
    }

    initScannerSession();
    const timeout = setTimeout(() => startCameraEngineDirectly(), 150);
    return () => {
      clearTimeout(timeout);
      if (html5QrcodeInstance.current?.isScanning) html5QrcodeInstance.current.stop().catch(() => {});
    };
  }, [startCameraEngineDirectly]);

  const handleCloseResult = () => { setScanResult(null); isProcessingScan.current = false; };

  return (
    <div className={styles.scannerWorkspaceGrid}>
      <div className={styles.mainCaptureCard} style={{ position: "relative", overflow: "hidden", borderRadius: "12px" }}>
        {isProcessing && !scanResult && (
          <div style={{ position:"absolute",top:0,left:0,right:0,bottom:0,background:"rgba(255,255,255,0.75)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",zIndex:10,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px",animation:"fadeIn 0.25s ease-out" }}>
            <div style={{ position:"relative",display:"flex",alignItems:"center",justifyContent:"center" }}>
              <div style={{ width:"60px",height:"60px",border:"3px solid rgba(138,21,27,0.1)",borderTop:"3px solid #8a151b",borderRadius:"50%",animation:"spin-loader 0.75s infinite linear" }}></div>
              <div style={{ position:"absolute",width:"40px",height:"40px",border:"3px solid transparent",borderBottom:"3px solid #2d2926",borderRadius:"50%",animation:"spin-loader 1.2s infinite reverse linear" }}></div>
            </div>
            <style>{`@keyframes spin-loader{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
            <h3 style={{ margin:"20px 0 6px 0",color:"#2d2926",fontFamily:"system-ui,sans-serif",fontWeight:"600",letterSpacing:"-0.01em" }}>Verifying Badge Securely</h3>
            <div style={{ display:"flex",alignItems:"center",gap:"6px",padding:"6px 14px",background:"rgba(0,0,0,0.04)",borderRadius:"20px" }}>
              <span style={{ width:"6px",height:"6px",borderRadius:"50%",background:"#8a151b",animation:"ping 1s infinite" }}></span>
              <p style={{ margin:"0",color:"#555",fontSize:"12px",fontWeight:"500" }}>Querying Shibir Engine...</p>
            </div>
            <style>{`@keyframes ping{0%{transform:scale(1);opacity:1}100%{transform:scale(2.2);opacity:0}}`}</style>
          </div>
        )}

        {scanResult && !isProcessing && (
          <div className={`${styles.resultBannerCard} ${styles[scanResult.status]}`} style={{ position:"absolute",top:0,left:0,right:0,bottom:0,zIndex:9,background:currentTheme.bg,overflowY:"auto",padding:"20px",display:"flex",flexDirection:"column",justifyContent:"space-between",boxSizing:"border-box",animation:"fadeIn 0.2s ease-out" }}>
            <div style={{ width:"100%" }}>
              <div style={{ display:"flex",alignItems:"flex-start",gap:"14px",borderBottom:"1px solid rgba(0,0,0,0.06)",paddingBottom:"16px",marginBottom:"16px" }}>
                <div style={{ fontSize:"32px",color:currentTheme.accent,display:"flex",alignItems:"center" }}>
                  {scanResult.status === "success" && <FaCheckCircle />}
                  {scanResult.status === "warning" && <FaExclamationTriangle />}
                  {scanResult.status === "error"   && <FaTimes />}
                </div>
                <div style={{ flex:1 }}>
                  <h4 style={{ margin:"0 0 4px 0",color:currentTheme.text,fontSize:"18px",fontWeight:"700",lineHeight:"1.2" }}>{scanResult.message}</h4>
                  <p style={{ margin:"0",color:currentTheme.subtext,fontSize:"13px",lineHeight:"1.4",fontWeight:"500" }}>
                    {scanResult.customDetail || (sessionId ? "Logged to Active Session" : "Check In Complete")}
                  </p>
                </div>
              </div>
              {scanResult.attendee && (
                <div style={{ background:"rgba(255,255,255,0.65)",borderRadius:"10px",padding:"14px",border:"1px solid rgba(0,0,0,0.04)" }}>
                  <div style={{ marginBottom:"12px" }}>
                    <span style={{ display:"block",fontSize:"11px",textTransform:"uppercase",color:"#666",fontWeight:"600",letterSpacing:"0.05em" }}>Full Name</span>
                    <span style={{ fontSize:"16px",fontWeight:"700",color:"#111" }}>{scanResult.attendee.name}</span>
                  </div>
                  <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:"12px",marginBottom:"12px",borderTop:"1px dashed rgba(0,0,0,0.08)",paddingTop:"12px" }}>
                    <div><span style={{ display:"block",fontSize:"11px",textTransform:"uppercase",color:"#666",fontWeight:"600" }}>Age</span><span style={{ fontSize:"14px",fontWeight:"600",color:"#222" }}>{scanResult.attendee.age} Years Old</span></div>
                    <div><span style={{ display:"block",fontSize:"11px",textTransform:"uppercase",color:"#666",fontWeight:"600" }}>Center</span><span style={{ fontSize:"14px",fontWeight:"600",color:"#222" }}>{scanResult.attendee.center}</span></div>
                  </div>
                  <div style={{ borderTop:"1px dashed rgba(0,0,0,0.08)",paddingTop:"10px" }}>
                    <span style={{ display:"block",fontSize:"11px",textTransform:"uppercase",color:"#666",fontWeight:"600" }}>Shibir ID Number</span>
                    <code style={{ fontSize:"12px",color:"#444",background:"rgba(0,0,0,0.05)",padding:"2px 6px",borderRadius:"4px",display:"inline-block",marginTop:"4px",wordBreak:"break-all" }}>
                      {scanResult.attendee.member_id || `MTRC-${scanResult.attendee.id}`}
                    </code>
                  </div>
                </div>
              )}
            </div>
            <button onClick={handleCloseResult} className={styles.resumePipelineBtn} style={{ width:"100%",padding:"14px",background:"#2d2926",color:"#fff",border:"none",borderRadius:"8px",fontSize:"15px",fontWeight:"600",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",cursor:"pointer",marginTop:"16px",boxShadow:"0 4px 6px -1px rgba(0,0,0,0.1)" }}>
              <FaUserCheck /> Dismiss & Scan Next
            </button>
          </div>
        )}

        <div className={styles.cameraWrapperActive}>
          <div className={styles.streamScopeBanner}>Scanning exclusively for <strong>{prefixScope}</strong> identity passes...</div>
          <div id="qr-reader-container" className={styles.videoStreamBox} style={{ overflow:"hidden",position:"relative",width:"100%",minHeight:"320px",background:"#000" }}></div>
          <style>{`#qr-reader-container button,#qr-reader-container img,#qr-reader-container input,#qr-reader-container a{display:none!important}`}</style>
          <div className={styles.activeFenceBadge} style={{ marginTop:"12px",justifyContent:"center" }}>
            <FaShieldAlt /> Region: <strong>{regionScope === "All" ? "All Africa" : regionScope}</strong>
          </div>
        </div>
      </div>

      <div className={styles.auditLogPanelCard}>
        <div className={styles.auditHeader}><FaHistory style={{ color:"#8a151b" }} /><h3>Gate Session Logs</h3></div>
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
