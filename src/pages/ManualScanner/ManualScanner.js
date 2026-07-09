import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  FaSearch, 
  FaTimes, 
  FaCheckCircle, 
  FaSpinner, 
  FaExclamationTriangle,
  FaShieldAlt,
  FaHistory,
  FaArrowLeft,
  FaArrowRight
} from "react-icons/fa";
import { attendees as attendeesApi, sessionLogs, gateLogs, getStoredUser } from "../../apiClient";
import styles from "./ManualScanner.module.css";

const REGION_PREFIX_MAP = {
  "Kenya": "MTRC-KE-",
  "Tanzania": "MTRC-TZ-",
  "Uganda": "MTRC-UG-",
  "Zambia": "MTRC-ZM-",
  "Malawi": "MTRC-MW-",
  "Botswana": "MTRC-BW-",
  "South Africa": "MTRC-ZA-",
};

export default function ManualScanner({ regionScope = "All", prefixScope = "" }) {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const lockedPrefix = prefixScope || REGION_PREFIX_MAP[regionScope] || "MTRC-";
  
  // State array to manage 4 independent string digits
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [scannerLog, setScannerLog] = useState([]);
  const [scanResult, setScanResult] = useState(null); 
  const [isProcessing, setIsProcessing] = useState(false);

  const operatorRef = useRef(null);
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  
  const processingRef = useRef(isProcessing);
  useEffect(() => {
    processingRef.current = isProcessing;
  }, [isProcessing]);

  useEffect(() => {
    async function initManualSession() {
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
      } catch (err) { 
        console.error("Log init error:", err); 
      }
    }
    initManualSession();
  }, []);

  const executeSearchLookup = async (targetSequence) => {
    const cleanedSeq = targetSequence.trim();
    if (cleanedSeq.length < 4 || processingRef.current) return;

    setIsProcessing(true);
    setScanResult(null);

    let scannedId = `${lockedPrefix}${cleanedSeq}`.toUpperCase();
    let rawNumericFallback = cleanedSeq;

    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const operator = operatorRef.current;
    const operatorEmail = operator?.email || "unknown@shibir.org";
    const operatorName = operator?.name || "system";
    let localLogPayload = { id: crypto.randomUUID(), time: timestamp, processedBy: operatorName };

    try {
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
        
        localLogPayload.type = "error"; 
        localLogPayload.text = errorMsg;
        setScanResult({ status: "error", message: `Badge Invalid. Token "${scannedId}" not registered.` });
        setScannerLog((prev) => [localLogPayload, ...prev]);
        return;
      }

      const assignedRegion = attendeeRecord.region || attendeeRecord.country || "";
      const targetRegionScope = regionScope || "All";
      if (targetRegionScope !== "All" && assignedRegion.toLowerCase() !== targetRegionScope.toLowerCase()) {
        const crossMsg = `Access Denied: ${attendeeRecord.name} belongs to ${assignedRegion} Region.`;
        await gateLogs.create({ scanned_id: scannedId, status: "error", message: crossMsg, operator_email: operatorEmail, operator_name: operatorName, attendee_name: attendeeRecord.name || "Cross-Region" });
        
        localLogPayload.type = "error"; 
        localLogPayload.text = crossMsg;
        setScanResult({ status: "error", message: "Cross-Partition Domain Violation!", customDetail: `This scanner is restricted strictly to ${regionScope}. Entry rejected.` });
        setScannerLog((prev) => [localLogPayload, ...prev]);
        return;
      }

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
        setScanResult({ status: "warning", message: "Duplicate Scan Warning!", attendee: attendeeRecord });
        return;
      }

      setScanResult({ status: "success", message: "Attendee Located", attendee: attendeeRecord });

    } catch (err) {
      console.error(err);
      setScanResult({ status: "error", message: "Server connection failed.", customDetail: "Please verify network connectivity parameters." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDigitChange = (index, value) => {
    // Strictly filter out non-numeric characters
    const safeValue = value.replace(/[^0-9]/g, "");
    if (!safeValue && value !== "") return; 

    const newDigits = [...digits];
    // Take only the last typed character if field gets crowded
    const targetChar = safeValue.slice(-1);
    newDigits[index] = targetChar;
    setDigits(newDigits);

    // Auto-advance focus to the next box if a number is input
    if (targetChar && index < 3) {
      inputRefs[index + 1].current.focus();
    }

    // Auto-trigger fire-rate immediately when sequence reaches 4 digits
    const completeSequence = newDigits.join("");
    if (completeSequence.length === 4) {
      executeSearchLookup(completeSequence);
    }
  };

  const handleDigitKeyDown = (index, e) => {
    // If user hits Backspace and the current box is empty, drop back one space
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs[index - 1].current.focus();
    }
  };

  const handleFormSubmit = (e) => {
    if (e) e.preventDefault();
    const joinedSequence = digits.join("");
    if (joinedSequence.length === 4) {
      executeSearchLookup(joinedSequence);
    }
  };

  const executeCheckedInApproval = async () => {
    if (!scanResult || !scanResult.attendee) return;
    setIsProcessing(true);

    const attendeeRecord = scanResult.attendee;
    const rawAttendeeId = attendeeRecord._raw_id || attendeeRecord.id;
    const scannedId = `${lockedPrefix}${digits.join("")}`.toUpperCase();

    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const operator = operatorRef.current;
    const operatorEmail = operator?.email || "unknown@shibir.org";
    const operatorName = operator?.name || "system";
    let localLogPayload = { id: crypto.randomUUID(), time: timestamp, processedBy: operatorName };

    const successMsg = `Approved Admission: Check-in completed for ${attendeeRecord.name} (${attendeeRecord.center})`;
    
    try {
      if (sessionId) {
        await sessionLogs.create({ session_id: sessionId, attendee_id: rawAttendeeId });
      } else {
        await attendeesApi.update(rawAttendeeId, { status: "Checked In" });
      }

      await gateLogs.create({ scanned_id: scannedId, status: "success", message: successMsg, operator_email: operatorEmail, operator_name: operatorName, attendee_name: attendeeRecord.name });
      
      localLogPayload.type = "success"; 
      localLogPayload.text = successMsg;
      setScannerLog((prev) => [localLogPayload, ...prev]);
      
      handleDismissResult();
    } catch (writeErr) {
      console.error("Write execution failed:", writeErr);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDismissResult = () => {
    setScanResult(null);
    setDigits(["", "", "", ""]);
    setTimeout(() => {
      if (inputRefs[0].current) inputRefs[0].current.focus();
    }, 50);
  };

  const statusThemes = {
    success: { bg: "#f0fdf4", accent: "#22c55e", text: "#14532d", subtext: "#166534" },
    warning: { bg: "#fffbeb", accent: "#eab308", text: "#713f12", subtext: "#854d0e" },
    error:   { bg: "#fef2f2", accent: "#ef4444", text: "#7f1d1d", subtext: "#991b1b" },
  };
  const currentTheme = scanResult ? statusThemes[scanResult.status] || statusThemes.success : statusThemes.success;

  return (
    <div style={{ padding: "10px 0" }}>
      <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "16px" }}>
        <button 
          onClick={() => navigate(-1)} 
          style={{ display: "flex", alignItems: "center", gap: "6px", border: "none", padding: "8px 14px", background: "#f1f5f9", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "13px", color: "#475569" }}
        >
          <FaArrowLeft /> Return to Roster
        </button>
      </div>

      <div className={styles.scannerWorkspaceGrid}>
        <div className={styles.mainCaptureCard}>
          {isProcessing && !scanResult && (
            <div className={styles.loadingOverlay}>
              <div className={styles.spinnerWrapper}>
                <div className={styles.spinnerOuter}></div>
              </div>
              <h3 className={styles.loadingText}>Verifying Record</h3>
            </div>
          )}

          {scanResult && (
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
                      {scanResult.customDetail || (scanResult.status === "warning" ? "Attendee has already been checked into this session grid roster." : "")}
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
                      <div>
                        <span className={styles.fieldLabel}>Age : </span>
                        <span className={styles.fieldValueMedium}>{scanResult.attendee.age}</span>
                      </div>
                      <div>
                        <span className={styles.fieldLabel}>Center : </span>
                        <span className={styles.fieldValueMedium}>{scanResult.attendee.center}</span>
                      </div>
                    </div>
                    <div className={styles.dataFieldGroupTopLine}>
                      <span className={styles.fieldLabel}>Shibir ID Number</span>
                      <code className={styles.monospaceCodeBadge}>
                        {scanResult.attendee.member_id || `MTRC-${scanResult.attendee.id}`}
                      </code>
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.modalActionRow}>
                {scanResult.status === "warning" ? (
                  <button onClick={handleDismissResult} className={styles.primaryActionBtn} style={{ background: "#713f12" }}>
                    Next Scan <FaArrowRight />
                  </button>
                ) : (
                  <>
                    <button onClick={handleDismissResult} className={styles.secondaryActionBtn}>
                      Cancel
                    </button>
                    {scanResult.status === "success" && (
                      <button onClick={executeCheckedInApproval} className={styles.primaryActionBtn}>
                        <FaCheckCircle /> Confirm Entry
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          <div className={styles.cameraWrapperActive}>
            <div className={styles.streamScopeBanner}>
            </div>
            
            <form onSubmit={handleFormSubmit}>
              <div className={styles.formInputFlexGroup}>
                {lockedPrefix && (
                  <div className={styles.prefixLockBadge}>
                    {lockedPrefix}
                  </div>
                )}
                
                {/* 4-Box Split Number Grid Layout */}
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  {digits.map((digit, index) => (
                    <input
                      key={index}
                      ref={inputRefs[index]}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleDigitKeyDown(index, e)}
                      style={{
                        width: "44px",
                        height: "48px",
                        textAlign: "center",
                        fontSize: "20px",
                        fontWeight: "700",
                        borderRadius: "6px",
                        border: "2px solid #cbd5e1",
                        outline: "none",
                        background: "#fff"
                      }}
                      autoFocus={index === 0}
                    />
                  ))}
                </div>

                <button 
                  type="submit" 
                  disabled={isProcessing || digits.join("").length < 4} 
                  className={styles.formSubmitBtn}
                  style={{ marginLeft: "4px" }}
                >
                  {isProcessing ? <FaSpinner className={styles.spin} /> : <FaSearch />}
                </button>
              </div>
            </form>

            <div className={styles.activeFenceBadge}>
              <FaShieldAlt /> Region: <strong>{regionScope === "All" ? "All Africa" : regionScope}</strong>
            </div>
          </div>
        </div>

        <div className={styles.auditLogPanelCard}>
          <div className={styles.auditHeader}>
            <FaHistory style={{ color: "#8a151b" }} />
            <h3>Gate Session Logs</h3>
          </div>
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
    </div>
  );
}