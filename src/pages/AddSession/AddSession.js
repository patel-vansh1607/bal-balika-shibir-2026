import React, { useState, useEffect } from "react";
import { FaCalendarPlus, FaHeading, FaClock, FaSpinner, FaCheckCircle, FaGlobe, FaLock } from "react-icons/fa";
import { sessions as sessionsApi } from "../../apiClient";
import styles from "./AddSession.module.css";

const REGIONS = ['All', 'Kenya', 'Tanzania', 'Uganda', 'Zambia', 'Malawi', 'Botswana', 'South Africa'];

export default function AddSession() {
  const activeRegion = localStorage.getItem("selected_shibir_region") || "All";
  const isRegionLocked = activeRegion !== "All";

  const [sessionNumber, setSessionNumber] = useState(1);
  const [sessionName, setSessionName]     = useState("");
  const [sessionRegion, setSessionRegion] = useState(isRegionLocked ? activeRegion : "All");
  const [sessionTime, setSessionTime]     = useState("");
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [message, setMessage]             = useState(null);

  useEffect(() => {
    sessionsApi.count()
      .then(({ count }) => setSessionNumber((count || 0) + 1))
      .catch((err) => console.error("Error fetching session count:", err.message));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const fullTitle   = `Session ${sessionNumber}: ${sessionName.trim()}`;
    const sessionUuid = crypto.randomUUID();

    try {
      await sessionsApi.create({
        id: sessionUuid,
        title: fullTitle,
        region: sessionRegion,
        start_time: new Date(sessionTime).toISOString(),
      });
      setMessage({ success: true, text: `${fullTitle} created for ${sessionRegion === 'All' ? 'all regions' : sessionRegion}!` });
      setSessionName("");
      setSessionRegion(isRegionLocked ? activeRegion : "All");
      setSessionTime("");
      setSessionNumber((prev) => prev + 1);
    } catch (err) {
      setMessage({ success: false, text: err.message || "Failed to save session." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <div className={styles.formHeader}>
        <h2><FaCalendarPlus /> Add New Session</h2>
        <p>The system will automatically prefix this entry as <strong>Session {sessionNumber}</strong>.</p>
      </div>

      {message && (
        <div className={`${styles.alert} ${message.success ? styles.alertSuccess : styles.alertError}`}>
          {message.success && <FaCheckCircle style={{ marginRight: "6px" }} />}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.sessionForm}>
        <div className={styles.inputGroup}>
          <label>Auto-Generated Identifier</label>
          <input type="text" value={`Session ${sessionNumber}`} disabled className={styles.disabledInput} />
        </div>
        <div className={styles.inputGroup}>
          <label><FaHeading /> Session Name *</label>
          <input 
            type="text" 
            required 
            value={sessionName} 
            onChange={(e) => setSessionName(e.target.value)} 
            placeholder="e.g., Morning Devotional, Post-Lunch Panel" 
          />
        </div>
        <div className={styles.inputGroup}>
          <label><FaGlobe /> Region *</label>
          {isRegionLocked ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="text" value={activeRegion} disabled className={styles.disabledInput} style={{ flex: 1 }} />
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#9a3412', fontWeight: 600 }}>
                <FaLock /> Locked to your region
              </span>
            </div>
          ) : (
            <select value={sessionRegion} onChange={(e) => setSessionRegion(e.target.value)} required>
              {REGIONS.map((r) => (
                <option key={r} value={r}>{r === 'All' ? 'All Regions (Global)' : r}</option>
              ))}
            </select>
          )}
        </div>

        <div className={styles.inputGroup}>
          <label><FaClock /> Session Time *</label>
          <input 
            type="datetime-local" 
            required 
            value={sessionTime} 
            onChange={(e) => setSessionTime(e.target.value)} 
          />
        </div>

        <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
          {isSubmitting ? <><FaSpinner className={styles.spin} /> Saving Slot...</> : "Save Session"}
        </button>
      </form>
    </div>
  );
}