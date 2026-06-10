import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaSpinner, FaCheckCircle, FaUserClock, FaUsers, FaArrowRight, FaQrcode, FaClock } from "react-icons/fa";
import { supabase } from "../supabaseClient";
import styles from "./Sessions.module.css";

export default function Sessions({ regionScope, prefixScope, globalAttendeesList, isDataFetching }) {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  // Core Data States
  const [sessionsList, setSessionsList] = useState([]); // Used for the general selection menu view
  const [sessionInfo, setSessionInfo] = useState(null);  // Used for single isolated session tracking view
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ totalExpected: 0, present: 0, absent: 0 });

  // Determine view mode based on URL structural path
  const isMenuSelectionMode = !sessionId || sessionId === "attendance";

  // System Configurations
  const activeRegion = regionScope || localStorage.getItem("selected_shibir_region") || "All";
  const activePrefix = prefixScope || localStorage.getItem("selected_shibir_prefix") || "";

  useEffect(() => {
    const fetchSessionWorkspace = async () => {
      try {
        setLoading(true);

        // --- MODE 1: RENDER ALL AVAILABLE SESSIONS FOR OPERATOR SELECTION ---
        if (isMenuSelectionMode) {
          const { data: baseSessions, error: err } = await supabase
            .from("sessions")
            .select("*")
            .order("created_at", { ascending: true });

          if (err) throw err;
          setSessionsList(baseSessions || []);
          setLoading(false);
          return;
        }

        // --- MODE 2: SPECIFIC SESSION ENTRY ISOLATED (UUID ATTACHED) ---
        const { data: currentSession, error: sessionErr } = await supabase
          .from("sessions")
          .select("*")
          .eq("id", sessionId)
          .single();

        if (sessionErr) throw sessionErr;
        setSessionInfo(currentSession);

        // Resolve target roster baseline
        let scopedRoster = globalAttendeesList || [];
        if (scopedRoster.length === 0 && activeRegion !== "All") {
          let backupQuery = supabase.from("attendees").select("*");
          if (activeRegion) backupQuery = backupQuery.eq("region", activeRegion);
          const { data: backupData } = await backupQuery.order("created_at", { ascending: false });
          if (backupData) scopedRoster = backupData;
        }
        const rosterCount = scopedRoster.length;

        // Build an explicit lookup Map of what attendees we expect to trace locally
        const attendeeLookupMap = new Map(scopedRoster.map(a => [a.id, a]));

        // Pull corresponding check-in log records for this session
        let logsQuery = supabase.from("session_logs").select("*").eq("session_id", sessionId);
        
        // Optimize querying constraints cleanly without breaking real-time visibility hooks
        if (activeRegion !== "All" && scopedRoster.length > 0) {
          const targetIdsArray = scopedRoster.map(a => a.id);
          logsQuery = logsQuery.in("attendee_id", targetIdsArray);
        } else if (activeRegion !== "All" && activePrefix) {
          logsQuery = logsQuery.like("attendee_id", `${activePrefix}%`);
        }

        const { data: logsData, error: logsErr } = await logsQuery;
        if (logsErr) throw logsErr;

        // Trace explicit check-in tracking identifiers
        const logsCheckedInIds = new Set(logsData.map((log) => log.attendee_id));

        // Generate matrix array structure mapping
        let parsedRosterStatus = scopedRoster.map((attendee) => {
          const matchingLog = logsData.find((log) => log.attendee_id === attendee.id);
          const hasCheckedIn = logsCheckedInIds.has(attendee.id);

          return {
            id: attendee.id,
            fullName: attendee.name || "Unknown Attendee",
            subgroup: attendee.subgroup || "N/A",
            category: attendee.category || "General",
            checkedIn: hasCheckedIn,
            checkInTime: hasCheckedIn && matchingLog?.created_at
              ? new Date(matchingLog.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
              : "—"
          };
        });

        // 🌟 FAILSAFE SYNC RECONCILIATION BLOCK:
        // If someone scanned into this session but didn't land inside your filtered attendee list,
        // we forcefully append them into the dataset dynamically so they reflect on screen instantly!
        logsData.forEach((log) => {
          if (!attendeeLookupMap.has(log.attendee_id)) {
            const alreadyInjected = parsedRosterStatus.some(item => item.id === log.attendee_id);
            if (!alreadyInjected) {
              parsedRosterStatus.push({
                id: log.attendee_id,
                fullName: log.attendee_name || "Verified External Attendee", 
                subgroup: "Cross-Region",
                category: "General",
                checkedIn: true,
                checkInTime: new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
              });
            }
          }
        });

        const presentCount = parsedRosterStatus.filter((item) => item.checkedIn).length;
        // Balance baseline indicators
        const adjustedTotalCount = Math.max(rosterCount, parsedRosterStatus.length);
        const absentCount = Math.max(0, adjustedTotalCount - presentCount);

        setAttendanceLogs(parsedRosterStatus);
        setMetrics({
          totalExpected: adjustedTotalCount,
          present: presentCount,
          absent: absentCount
        });

      } catch (err) {
        console.error("Critical Failure Compiling Session Attendance Streams:", err.message);
      } finally {
        setLoading(false);
      }
    };

    if (!isDataFetching) {
      fetchSessionWorkspace();
    }
  }, [sessionId, isMenuSelectionMode, activeRegion, activePrefix, globalAttendeesList, isDataFetching]);

  // General Loading Component State Template Fallback
  if (loading || isDataFetching) {
    return (
      <div className={styles.loaderContainer}>
        <FaSpinner className={styles.spin} /> Synchronizing Terminal Interface Pipelines...
      </div>
    );
  }

  // ==================== RENDERING LAYOUT A: SELECTION MENU PANE ====================
  if (isMenuSelectionMode) {
    return (
      <div className={styles.container}>
        <div className={styles.viewHeader}>
          <button onClick={() => navigate("/dashboard/session/master")} className={styles.circleBackBtn} title="Back to Panel">
            <FaArrowLeft />
          </button>
          <div className={styles.headerInfoText}>
            <h1>Gateway Entry Systems</h1>
            <p>Select an operation track below to manage badge scanning gates for: <strong>{activeRegion} Pool</strong></p>
          </div>
        </div>

        <div className={styles.selectionGridList}>
          {sessionsList.map((session, index) => (
            <div key={session.id} className={styles.gateSelectionCard}>
              <div className={styles.cardInfoPanel}>
                <div className={styles.sessionIndexBadge}>Session {index + 1}</div>
                <h3>{session.title}</h3>
                <span className={styles.timeTagStamp}>
                  <FaClock /> {session.start_time ? new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A"}
                </span>
              </div>
              <button 
                className={styles.launchGateBtn} 
                onClick={() => navigate(`/dashboard/session/attendance/${session.id}`)}
              >
                <FaQrcode /> Launch Gate Pass <FaArrowRight />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==================== RENDERING LAYOUT B: DEEP LOG ROSTER ATTENDANCE (WITH UUID) ====================
  return (
    <div className={styles.container}>
      <div className={styles.viewHeader}>
        <button onClick={() => navigate("/dashboard/session/attendance")} className={styles.circleBackBtn} title="Back to Session Picker">
          <FaArrowLeft />
        </button>
        <div className={styles.headerInfoText}>
          <h1>{sessionInfo?.title} Checkpoint</h1>
          <p>Analytical Tracking Segment Scope: <strong>{activeRegion === "All" ? "Global African Database" : activeRegion} Mode</strong></p>
        </div>
        
        {/* ACTION SCAN BUTTON */}
        <button 
          className={styles.actionScanFloatingBtn}
          onClick={() => navigate(`/dashboard/scanner/${sessionId}`)}
        >
          <FaQrcode /> Scan Attendee Badges
        </button>
      </div>

      {/* Analytical Overview Cards */}
      <div className={styles.metricsBarGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricIconWrap} style={{ backgroundColor: "#f5f2ef", color: "#2d2926" }}>
            <FaUsers />
          </div>
          <div className={styles.metricData}>
            <h3>{metrics.totalExpected}</h3>
            <span>Expected Base</span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIconWrap} style={{ backgroundColor: "#e6f4ea", color: "#137333" }}>
            <FaCheckCircle />
          </div>
          <div className={styles.metricData}>
            <h3 style={{ color: "#137333" }}>{metrics.present}</h3>
            <span>Verified Present</span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIconWrap} style={{ backgroundColor: "#fce8e6", color: "#c5221f" }}>
            <FaUserClock />
          </div>
          <div className={styles.metricData}>
            <h3 style={{ color: "#c5221f" }}>{metrics.absent}</h3>
            <span>Pending/Absent</span>
          </div>
        </div>
      </div>

      {/* Main Roster Verification Grid Table */}
      <div className={styles.tableCardContainer}>
        <div className={styles.tableScrollWrapper}>
          <table className={styles.attendanceTable}>
            <thead>
              <tr>
                <th>Badge System ID</th>
                <th>Full Name</th>
                <th>Subgroup Track</th>
                <th>Category</th>
                <th>Terminal Status</th>
                <th>Verification Stamp</th>
              </tr>
            </thead>
            <tbody>
              {attendanceLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className={styles.emptyTablePlaceholder}>
                    No registered attendee track found matches the current scope parameter guidelines.
                  </td>
                </tr>
              ) : (
                attendanceLogs.map((record) => (
                  <tr key={record.id} className={record.checkedIn ? styles.rowCheckedIn : styles.rowAbsent}>
                    <td className={styles.badgeIdCell}><code>{record.id}</code></td>
                    <td className={styles.nameCell}>{record.fullName}</td>
                    <td><span className={styles.subgroupTag}>{record.subgroup}</span></td>
                    <td>{record.category}</td>
                    <td>
                      <span className={`${styles.statusLabel} ${record.checkedIn ? styles.statusCleared : styles.statusPending}`}>
                        {record.checkedIn ? "Cleared Entry" : "Pending Pass"}
                      </span>
                    </td>
                    <td className={styles.timeStampCell}>{record.checkInTime}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}