import React, { useState, useEffect } from 'react';
import { FaClock, FaChartPie, FaSpinner, FaUsers, FaCheckCircle, FaUserTimes } from 'react-icons/fa';
import { supabase } from '../../supabaseClient';
import styles from './SessionMasterDashboard.module.css';

export default function SessionMasterDashboard({ regionScope, prefixScope, globalAttendeesList, isDataFetching }) {
  const [sessionsSummary, setSessionsSummary] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const aggregateMasterMatrix = async () => {
      try {
        setLoading(true);

        // 1. Fetch all system sessions
        const { data: baseSessions, error: sessionsError } = await supabase
          .from('sessions')
          .select('*')
          .order('created_at', { ascending: true });

        if (sessionsError) throw sessionsError;

        // 2. Extract current filtered attendee baseline dataset from parent state
        const targetAttendeePool = globalAttendeesList || [];
        const totalExpectedCount = targetAttendeePool.length;

        // Create a lookup set for O(1) checking speed
        const localAttendeeIds = new Set(targetAttendeePool.map(a => a.id));

        // 3. Query all session logs across the board
        let logsQuery = supabase.from('session_logs').select('session_id, attendee_id');
        
        // If viewing a specific region, pull logs only for attendees currently in your roster list
        if (regionScope !== "All" && targetAttendeePool.length > 0) {
          const attendeeIdsArray = targetAttendeePool.map(a => a.id);
          // Split queries if list exceeds Supabase in-filter bounds, or pull cleaner via array maps
          logsQuery = logsQuery.in('attendee_id', attendeeIdsArray);
        } else if (regionScope !== "All" && prefixScope) {
          // Fallback backup optimization match structure
          logsQuery = logsQuery.like('attendee_id', `${prefixScope}%`);
        }
        
        const { data: logsPool, error: logsError } = await logsQuery;
        if (logsError) throw logsError;

        // 4. Map cross-session tracking blocks accurately
        const computedSummary = baseSessions.map(session => {
          const matchingLogs = logsPool.filter(log => {
            if (log.session_id !== session.id) return false;
            // Clear entry if viewing the global scope, otherwise confirm user belongs to current selection profile
            return regionScope === "All" ? true : localAttendeeIds.has(log.attendee_id);
          });

          const present = matchingLogs.length;
          const absent = Math.max(0, totalExpectedCount - present);
          
          const formattedTime = session.start_time 
            ? new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'N/A';

          return {
            id: session.id,
            title: session.title,
            total: totalExpectedCount,
            present,
            absent,
            time: formattedTime
          };
        });

        setSessionsSummary(computedSummary);
      } catch (err) {
        console.error("Master Analytics Mapping Error:", err.message);
      } finally {
        setLoading(false);
      }
    };

    // Only run execution matrices once master data fetches settle cleanly
    if (!isDataFetching) {
      aggregateMasterMatrix();
    }
  }, [regionScope, prefixScope, globalAttendeesList, isDataFetching]);

  if (loading || isDataFetching) {
    return (
      <div className={styles.loader}>
        <FaSpinner className={styles.spin} /> Processing Partitioned Matrix Streams...
      </div>
    );
  }

  // Calculate global summary matrix fallback counts if metrics evaluate out of bounds
  const primarySessionMetrics = sessionsSummary[0] || { total: 0, present: 0, absent: 0 };

  return (
    <div className={styles.masterContainer}>
      <div className={styles.dashHeader}>
        <h1>Session Master Control Panel</h1>
        <p>Currently viewing analytical matrix for: <strong>{regionScope === "All" ? "Global African Database" : regionScope}</strong></p>
      </div>

      <div className={styles.dashboardGrid}>
        
        {/* Left Side: All Active Sessions Stream Progress */}
        <div className={styles.sessionsColumn}>
          <h3 className={styles.sectionTitle}>Active Sessions Status</h3>
          
          {sessionsSummary.map((session) => {
            const attendancePct = session.total > 0 ? Math.round((session.present / session.total) * 100) : 0;
            
            return (
              <div key={session.id} className={styles.sessionRowCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <h4>{session.title}</h4>
                    <span className={styles.timeTag}><FaClock /> {session.time}</span>
                  </div>
                  <div className={styles.percentageCircle}>
                    <span>{attendancePct}%</span>
                  </div>
                </div>

                <div className={styles.progressTrackBar}>
                  <div 
                    className={styles.progressBarFill} 
                    style={{ width: `${attendancePct}%` }}
                  />
                </div>

                <div className={styles.cardStatsBar}>
                  <div className={styles.statMiniBox}>
                    <strong>{session.total}</strong>
                    <span>Expected</span>
                  </div>
                  <div className={styles.statMiniBox}>
                    <strong className={styles.textPresent}>{session.present}</strong>
                    <span>Checked-In</span>
                  </div>
                  <div className={styles.statMiniBox}>
                    <strong className={styles.textAbsent}>{session.absent}</strong>
                    <span>Absent</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Side Column: Terminal Focus Cards */}
        <div className={styles.analyticsSidebar}>
          <h3 className={styles.sectionTitle}><FaChartPie /> Terminal Focus Status</h3>
          <div className={styles.sidebarCard}>
            <div className={styles.focusedCenterBadge}>
              <h4>{regionScope === "All" ? "Global Network" : `${regionScope} Checkpoint`}</h4>
            </div>
            
            <div className={styles.focusStatItem}>
              <FaUsers className={styles.iconExpected} />
              <div>
                <h5>{primarySessionMetrics.total}</h5>
                <p>Total Registered Roster</p>
              </div>
            </div>

            <div className={styles.focusStatItem}>
              <FaCheckCircle className={styles.iconCheckedIn} />
              <div>
                <h5>{primarySessionMetrics.present}</h5>
                <p>Verified Clear Gate Entries</p>
              </div>
            </div>

            <div className={styles.focusStatItem}>
              <FaUserTimes className={styles.iconAbsent} />
              <div>
                <h5>{primarySessionMetrics.absent}</h5>
                <p>Remaining Pending Badges</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}