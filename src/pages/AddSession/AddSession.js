import React, { useState, useEffect } from 'react';
import { FaCalendarPlus, FaHeading, FaClock, FaSpinner, FaCheckCircle } from 'react-icons/fa';
import { supabase } from '../../supabaseClient';
import styles from './AddSession.module.css';

export default function AddSession() {
  const [sessionNumber, setSessionNumber] = useState(1);
  const [sessionName, setSessionName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  // Automatically calculate the next Session Number on mount
  useEffect(() => {
    const fetchNextSessionNumber = async () => {
      try {
        const { count, error } = await supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true });

        if (error) throw error;
        setSessionNumber((count || 0) + 1);
      } catch (err) {
        console.error("Error calculating next session prefix:", err.message);
      }
    };

    fetchNextSessionNumber();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    // Auto-generate the title prefix: "Session X: Your Custom Name"
    const fullTitle = `Session ${sessionNumber}: ${sessionName.trim()}`;
    
    // Generate an explicit unique client-side UUID natively using Web Crypto API
    const sessionUuid = crypto.randomUUID();

    try {
      const { error } = await supabase
        .from('sessions')
        .insert([
          {
            id: sessionUuid, // Explicitly inserting our freshly minted UUID token
            title: fullTitle,
            start_time: new Date(startTime).toISOString(),
            end_time: new Date(endTime).toISOString()
          }
        ]);

      if (error) throw error;

      setMessage({ success: true, text: `${fullTitle} created successfully!` });
      setSessionName('');
      setStartTime('');
      setEndTime('');
      setSessionNumber(prev => prev + 1); // Auto-increment prefix counter for the next entry
    } catch (err) {
      setMessage({ success: false, text: err.message || 'Failed to save session.' });
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
          {message.success && <FaCheckCircle style={{ marginRight: '6px' }} />}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.sessionForm}>
        
        {/* Read-Only Auto Generated Prefix Indicator */}
        <div className={styles.inputGroup}>
          <label>Auto-Generated Identifier</label>
          <input 
            type="text" 
            value={`Session ${sessionNumber}`} 
            disabled 
            className={styles.disabledInput}
          />
        </div>

        {/* Core Session Name Input */}
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

        {/* Time Settings Inputs Row layout splits evenly */}
        <div className={styles.formRow}>
          <div className={styles.inputGroup}>
            <label><FaClock /> Start Time *</label>
            <input 
              type="datetime-local" 
              required 
              value={startTime} 
              onChange={(e) => setStartTime(e.target.value)} 
            />
          </div>
          <div className={styles.inputGroup}>
            <label><FaClock /> End Time *</label>
            <input 
              type="datetime-local" 
              required 
              value={endTime} 
              onChange={(e) => setEndTime(e.target.value)} 
            />
          </div>
        </div>

        <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
          {isSubmitting ? <><FaSpinner className={styles.spin} /> Saving Slot...</> : 'Save Session'}
        </button>
      </form>
    </div>
  );
}