import React, { useState } from "react";
import { FaSearch, FaTimes, FaCheckCircle, FaSpinner } from "react-icons/fa";
import { attendees as attendeesApi, sessionLogs, gateLogs } from "../../apiClient";
import styles from "./ManualScanner.module.css";

const REGION_PREFIXES = {
  "Kenya": "MTRC-KE-",
  "Tanzania": "MTRC-TZ-",
  "Uganda": "MTRC-UG-",
  "Zambia": "MTRC-ZM-",
  "Malawi": "MTRC-MW-",
  "Botswana": "MTRC-BW-",
  "South Africa": "MTRC-ZA-",
};

export default function ManualScanner({ sessionId, regionScope }) {
  const activePrefix = regionScope !== "All" ? (REGION_PREFIXES[regionScope] || "MTRC-") : "MTRC-";
  
  const [manualId, setManualId] = useState(activePrefix);
  const [attendee, setAttendee] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [scanStatus, setScanStatus] = useState(null); // 'success', 'warning', 'error'

  const handleSearch = async () => {
    if (!manualId.trim()) return;
    setIsProcessing(true);
    setError(null);
    setAttendee(null);
    setScanStatus(null);

    const searchId = manualId.trim().toUpperCase();

    try {
      // 1. Fetch Attendee
      const { data: attendeeRecord } = await attendeesApi.get(searchId);
      if (!attendeeRecord) {
        setError(`Unrecognized Token: "${searchId}" is not in the database.`);
        setIsProcessing(false);
        return;
      }

      // 2. Cross-Region Security Fence
      if (regionScope !== "All" && attendeeRecord.region?.toLowerCase() !== regionScope.toLowerCase()) {
        const crossMsg = `Access Denied: ${attendeeRecord.name} belongs to ${attendeeRecord.region}.`;
        await gateLogs.create({ scanned_id: searchId, status: "error", message: crossMsg, attendee_name: attendeeRecord.name });
        setError(crossMsg);
        setScanStatus("error");
        setIsProcessing(false);
        return;
      }

      // 3. Duplicate Record Security Fence
      const { data: existingLogs } = await sessionLogs.list({ session_id: sessionId, attendee_id: attendeeRecord._raw_id });
      if (existingLogs?.length > 0) {
        const warnMsg = `Duplicate Flag: ${attendeeRecord.name} is already checked in.`;
        await gateLogs.create({ scanned_id: searchId, status: "warning", message: warnMsg, attendee_name: attendeeRecord.name });
        setScanStatus("warning");
        setAttendee(attendeeRecord);
        setError("Duplicate Scan Detected!");
        setIsProcessing(false);
        return;
      }

      setAttendee(attendeeRecord);
      setScanStatus("success");
    } catch (err) {
      setError("Database connection failed. Please retry.");
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmCheckIn = async () => {
    setIsProcessing(true);
    try {
      await sessionLogs.create({ session_id: sessionId, attendee_id: attendee._raw_id });
      await gateLogs.create({ 
        scanned_id: manualId, 
        status: "success", 
        message: `Approved: ${attendee.name}`, 
        attendee_name: attendee.name 
      });
      
      alert(`Entry Approved: ${attendee.name}`);
      setManualId(activePrefix);
      setAttendee(null);
    } catch (err) {
      alert("Error: Failed to record entry.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={styles.container}>
      <h3>Manual Gate Entry</h3>
      <div className={styles.inputGroup}>
        <input value={manualId} onChange={(e) => setManualId(e.target.value)} />
        <button onClick={handleSearch} disabled={isProcessing}>{isProcessing ? <FaSpinner className={styles.spin} /> : <FaSearch />}</button>
      </div>

      {error && <div className={`${styles.alert} ${styles[scanStatus]}`}>{error}</div>}

      {attendee && (
        <div className={styles.previewCard}>
          <p><strong>Name:</strong> {attendee.name}</p>
          <p><strong>Center:</strong> {attendee.center}</p>
          {scanStatus === "warning" && <p style={{color: "red"}}>⚠️ {attendee.name} has already entered.</p>}
          <div className={styles.actionButtons}>
            <button onClick={() => { setAttendee(null); setManualId(activePrefix); }} className={styles.cancelBtn}><FaTimes /> Cancel</button>
            <button onClick={confirmCheckIn} className={styles.confirmBtn}><FaCheckCircle /> {scanStatus === "warning" ? "Force Re-Entry" : "Confirm Entry"}</button>
          </div>
        </div>
      )}
    </div>
  );
}