import React, { useState, useEffect } from "react";
import { FaCalendarPlus, FaHeading, FaClock, FaSpinner, FaCheckCircle, FaGlobe } from "react-icons/fa";
import { sessions as sessionsApi } from "../../apiClient";
import styles from "./AddSession.module.css";

const REGIONS = ['All', 'Kenya', 'Tanzania', 'Uganda', 'Zambia', 'Malawi', 'Botswana', 'South Africa'];

export default function AddSession() {
  const [sessionNumber, setSessionNumber] = useState(1);
  const [sessionName, setSessionName]     = useState("");
  const [sessionRegion, setSessionRegion] = useState("All");
  const [startTime, setStartTime]         = useState("");
  const [endTime, setEndTime]             = useState("");
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
      const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
      await sessionsApi.create({
        id: sessionUuid,
        title: fullTitle,
        region: sessionRegion,
        start_time: new Date(new Date(startTime).getTime() + THREE_HOURS_MS).toISOString(),
        end_time:   new Date(new Date(endTime).getTime() + THREE_HOURS_MS).toISOString(),
      });
      setMessage({ success: true, text: `${fullTitle} created for ${sessionRegion === 'All' ? 'all regions' : sessionRegion}!` });
      setSessionName("");
      setSessionRegion("All");
      setStartTime("");
      setEndTime("");
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
          <input type="text" required value={sessionName} onChange={(e) => setSessionName(e.target.value)} placeholder="e.g., Morning Devotional, Post-Lunch Panel" />
        </div>
        <div className={styles.inputGroup}>
          <label><FaGlobe /> Region *</label>
          <select value={sessionRegion} onChange={(e) => setSessionRegion(e.target.value)} required>
            {REGIONS.map((r) => (
              <option key={r} value={r}>{r === 'All' ? 'All Regions (Global)' : r}</option>
            ))}
          </select>
        </div>
        <div className={styles.formRow}>
          <div className={styles.inputGroup}>
            <label><FaClock /> Start Time *</label>
            <input type="datetime-local" required value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div className={styles.inputGroup}>
            <label><FaClock /> End Time *</label>
            <input type="datetime-local" required value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
        </div>
        <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
          {isSubmitting ? <><FaSpinner className={styles.spin} /> Saving Slot...</> : "Save Session"}
        </button>
      </form>
    </div>
  );
}
