import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaClock, FaChartPie, FaSpinner, FaMapMarkerAlt, FaUsers, FaCheckCircle } from 'react-icons/fa';
import { supabase } from '../../supabaseClient';
import styles from './SessionMasterDashboard.module.css';

// Extracted static configurations above the component to maintain a stable reference pointer
const REGION_PREFIXES = {
  "Kenya": "MTRC-KE-",
  "Uganda": "MTRC-UG-",
  "Gaborone": "MTRC-GA-",       
  "Tanzania": "MTRC-TZ-"    
};

export default function SessionMasterDashboard({ activeRegion }) {
  const navigate = useNavigate();
  const [sessionsSummary, setSessionsSummary] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [breakdownStats, setBreakdownStats] = useState([]);
  const [loading, setLoading] = useState(true);

  const isGlobal = !activeRegion || 
                   activeRegion.trim() === "" || 
                   activeRegion.toLowerCase().includes("global") ||
                   activeRegion.toLowerCase().includes("all");

  useEffect(() => {
    const fetchMasterAnalytics = async () => {
      try {
        setLoading(true);

        const { data: baseSessions, error: sessionsError } = await supabase
          .from('sessions')
          .select('*')
          .order('created_at', { ascending: true });

        if (sessionsError) throw sessionsError;
        
        if (!baseSessions || baseSessions.length === 0) {
          setSessionsSummary([]);
          setBreakdownStats([]);
          setLoading(false);
          return;
        }

        let attendeesQuery = supabase.from('attendees').select('id, member_id, region, center');
        
        if (!isGlobal) {
          const activePrefix = REGION_PREFIXES[activeRegion];
          if (activePrefix) {
            attendeesQuery = attendeesQuery.like('member_id', `${activePrefix}%`);
          }
        }
        
        const { data: rosterPool, error: rosterErr } = await attendeesQuery;
        if (rosterErr) throw rosterErr;

        const totalExpectedCount = rosterPool ? rosterPool.length : 0;
        const localAttendeeIds = new Set((rosterPool || []).map(a => String(a.id).trim()));

        const { data: logsPool, error: logsError } = await supabase
          .from('session_logs')
          .select('session_id, attendee_id');
        
        if (logsError) throw logsError;
        const rawLogs = logsPool || [];

        const computedSummary = baseSessions.map(session => {
          const sessionMatches = rawLogs.filter(log => {
            if (log.session_id !== session.id) return false;
            return isGlobal ? true : localAttendeeIds.has(String(log.attendee_id).trim());
          });
          
          const present = sessionMatches.length;
          const absent = Math.max(0, totalExpectedCount - present);
          
          return {
            id: session.id,
            title: session.title,
            total: totalExpectedCount,
            present,
            absent,
            time: session.start_time 
              ? new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'N/A'
          };
        });

        setSessionsSummary(computedSummary);

        let targetSessionId = selectedSessionId;
        if (!targetSessionId || !baseSessions.some(s => s.id === targetSessionId)) {
          targetSessionId = baseSessions[0].id;
          setSelectedSessionId(targetSessionId);
        }

        const targetSessionLogs = rawLogs.filter(log => log.session_id === targetSessionId);
        const checkedInIdsSet = new Set(targetSessionLogs.map(l => String(l.attendee_id).trim()));

        const groupsMap = {};

        (rosterPool || []).forEach(attendee => {
          const groupKey = isGlobal 
            ? (attendee.region?.trim() || "Other")
            : (attendee.center?.trim() || "General Pool");
          
          const attendeeIdStr = String(attendee.id).trim();

          if (!groupsMap[groupKey]) {
            groupsMap[groupKey] = { name: groupKey, total: 0, present: 0 };
          }
          groupsMap[groupKey].total += 1;
          if (checkedInIdsSet.has(attendeeIdStr)) {
            groupsMap[groupKey].present += 1;
          }
        });

        const rankedBreakdown = Object.values(groupsMap).map(g => {
          const percentage = g.total > 0 ? Math.round((g.present / g.total) * 100) : 0;
          return { ...g, percentage };
        }).sort((a, b) => b.percentage - a.percentage || b.present - a.present);

        setBreakdownStats(rankedBreakdown);

      } catch (err) {
        console.error("Master Matrix Aggregation Error:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMasterAnalytics();
  }, [activeRegion, selectedSessionId, isGlobal]);

  const handleSessionCardClick = (sessionId) => {
    setSelectedSessionId(sessionId);
    navigate(`/dashboard/session/master/data/${sessionId}`, { 
      state: { activeRegion: activeRegion } 
    });  
  };

  if (loading) {
    return (
      <div className={styles.loader}>
        <FaSpinner className={styles.spin} /> Loading...
      </div>
    );
  }

  const focusedSessionData = sessionsSummary.find(s => s.id === selectedSessionId) || sessionsSummary[0] || { title: '', total: 0, present: 0, absent: 0 };

  return (
    <div className={styles.masterContainer}>
      <div className={styles.dashHeader}>
        <h1>Sessions Dashboard</h1>
        <p>Currently viewing data for: <strong>{isGlobal ? 'Global African Database' : activeRegion}</strong></p>
        {focusedSessionData.title && (
          <p className={styles.activeSubFocus}>Data for: <span>{focusedSessionData.title}</span></p>
        )}
      </div>

      <div className={styles.dashboardGrid}>
        <div className={styles.sessionsColumn}>
          <h3 className={styles.sectionTitle}>Active Sessions </h3>
          {sessionsSummary.map((session) => {
            const attendancePct = session.total > 0 ? Math.round((session.present / session.total) * 100) : 0;
            const isTargetFocus = session.id === selectedSessionId;
            
            return (
              <div 
                key={session.id} 
                className={`${styles.sessionRowCard} ${isTargetFocus ? styles.selectedCard : ''}`}
                onClick={() => handleSessionCardClick(session.id)}
              >
                <div className={styles.cardHeader}>
                  <div>
                    <h4>{session.title} {isTargetFocus && <span className={styles.activeLabelDot}>● View Data</span>}</h4>
                    <span className={styles.timeTagStamp}><FaClock /> {session.time}</span>
                  </div>
                  <div className={styles.percentageCircle}>
                    <span>{attendancePct}%</span>
                  </div>
                </div>

                <div className={styles.progressTrackBar}>
                  <div className={styles.progressBarFill} style={{ width: `${attendancePct}%` }} />
                </div>

                <div className={styles.cardStatsBar}>
                  <div className={styles.statMiniBox}><strong>{session.total}</strong><span>Expected</span></div>
                  <div className={styles.statMiniBox}><strong className={styles.textPresent}>{session.present}</strong><span>Checked-In</span></div>
                  <div className={styles.statMiniBox}><strong className={styles.textAbsent}>{session.absent}</strong><span>Absent</span></div>
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.analyticsSidebar}>
          <h3 className={styles.sectionTitle}>
            <FaChartPie /> {isGlobal ? "Regional Data" : "Center Data"}
          </h3>
          <div className={styles.sidebarCard}>
            <div className={styles.focusedCenterBadge}>
              <h4>{isGlobal ? "Africa Data" : `${activeRegion} Data`}</h4>
            </div>

            <div className={styles.leaderboardList}>
              {breakdownStats.map((item, index) => (
                <div key={item.name} className={styles.centerStatRow}>
                  <div className={styles.centerMeta}>
                    <span className={styles.centerName}>
                      <span className={styles.rankIndexBadge}>{index + 1}</span>
                      <FaMapMarkerAlt /> {item.name}
                    </span>
                    <span className={styles.centerRatio}>{item.present} / {item.total} Present</span>
                  </div>
                  <div className={styles.miniTrackBarWrapper}>
                    <div className={styles.miniTrackBar}>
                      <div className={styles.miniBarFill} style={{ width: `${item.percentage}%`, backgroundColor: item.percentage === 100 ? '#137333' : '#8a151b' }} />
                    </div>
                    <span className={styles.rankPercentageTag}>{item.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>

            <hr className={styles.cardDivider} />
            <div className={styles.quickTotalsBar}>
              <div className={styles.totalMiniItem}><FaUsers /> <span>Exp: <strong>{focusedSessionData.total}</strong></span></div>
              <div className={styles.totalMiniItem}><FaCheckCircle className={styles.textPresent} /> <span>In: <strong className={styles.textPresent}>{focusedSessionData.present}</strong></span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}