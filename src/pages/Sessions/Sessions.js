import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaArrowLeft, FaSpinner, FaCheckCircle,
  FaUserClock, FaUsers, FaArrowRight, FaQrcode, FaClock,
} from "react-icons/fa";
import { sessions as sessionsApi, sessionLogs, attendees as attendeesApi } from "../../apiClient";
import styles from "./Sessions.module.css";

export default function Sessions({ regionScope, prefixScope, globalAttendeesList, isDataFetching }) {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [sessionsList, setSessionsList]   = useState([]);
  const [sessionInfo, setSessionInfo]     = useState(null);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [metrics, setMetrics]             = useState({ totalExpected: 0, present: 0, absent: 0 });

  const isMenuSelectionMode = !sessionId || sessionId === "attendance";
  const activeRegion  = regionScope || localStorage.getItem("selected_shibir_region") || "All";
  const activePrefix  = prefixScope || localStorage.getItem("selected_shibir_prefix") || "";
  const isGlobal      = activeRegion === "All";

  useEffect(() => {
    const fetchSessionWorkspace = async () => {
      try {
        setLoading(true);
        if (isMenuSelectionMode) {
          const { data } = await sessionsApi.list();
          setSessionsList(data || []);
          setLoading(false);
          return;
        }

        const { data: currentSession } = await sessionsApi.get(sessionId);
        setSessionInfo(currentSession);

        let scopedRoster = globalAttendeesList || [];
        if (scopedRoster.length === 0) {
          const params = isGlobal ? {} : activePrefix ? { prefix: activePrefix } : { region: activeRegion };
          const { data } = await attendeesApi.list(params);
          scopedRoster = data || [];
        }
        const rosterCount = scopedRoster.length;
        const attendeeLookupMap = new Map(scopedRoster.map((a) => [String(a._raw_id || parseInt(a.id, 10)), a]));

        const { data: logsData } = await sessionLogs.list({ session_id: sessionId });
        const logs = logsData || [];
        const logsCheckedInIds = new Set(logs.map((log) => String(log._raw_attendee_id)));

        let filteredRoster = scopedRoster;
        if (!isGlobal && activePrefix) {
          filteredRoster = scopedRoster.filter((a) => a.member_id?.startsWith(activePrefix));
        }

        let parsedRosterStatus = filteredRoster.map((attendee) => {
          const key = String(attendee._raw_id || parseInt(attendee.id, 10));
          const matchingLog = logs.find((log) => String(log._raw_attendee_id) === key);
          const hasCheckedIn = logsCheckedInIds.has(key);
          return {
            id: attendee.id,
            memberId: attendee.member_id || "N/A",
            fullName: attendee.name || "Unknown Attendee",
            subgroup: attendee.subgroup || "N/A",
            category: attendee.category || "General",
            checkedIn: hasCheckedIn,
            checkInTime: hasCheckedIn && matchingLog?.created_at
              ? new Date(matchingLog.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
              : "—",
          };
        });

        // Inject external attendees from logs not in current roster
        logs.forEach((log) => {
          const key = String(log._raw_attendee_id);
          if (!attendeeLookupMap.has(key) && log.attendee_name) {
            if (!parsedRosterStatus.some((item) => String(parseInt(item.id, 10)) === key)) {
              if (isGlobal || !activePrefix || log.member_id?.startsWith(activePrefix)) {
                parsedRosterStatus.push({
                  id: log.attendee_id,
                  memberId: log.member_id || "N/A",
                  fullName: log.attendee_name || "Verified External Attendee",
                  subgroup: "Cross-Region",
                  category: "General",
                  checkedIn: true,
                  checkInTime: new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
                });
              }
            }
          }
        });

        const presentCount       = parsedRosterStatus.filter((item) => item.checkedIn).length;
        const adjustedTotalCount = Math.max(rosterCount, parsedRosterStatus.length);
        setAttendanceLogs(parsedRosterStatus);
        setMetrics({ totalExpected: adjustedTotalCount, present: presentCount, absent: Math.max(0, adjustedTotalCount - presentCount) });
      } catch (err) {
        console.error("Session fetch error:", err.message);
      } finally {
        setLoading(false);
      }
    };

    if (!isDataFetching) fetchSessionWorkspace();
  }, [sessionId, isMenuSelectionMode, activeRegion, activePrefix, globalAttendeesList, isDataFetching, isGlobal]);

  if (loading || isDataFetching) return <div className={styles.loaderContainer}><FaSpinner className={styles.spin} /> Loading...</div>;

  if (isMenuSelectionMode) {
    return (
      <div className={styles.container}>
        <div className={styles.viewHeader}>
          <button onClick={() => navigate("/dashboard/session/master")} className={styles.circleBackBtn}><FaArrowLeft /></button>
          <div className={styles.headerInfoText}>
            <h1>Sessions Attendance</h1>
            <p>Select a Session track to manage attendance for: <strong>{activeRegion}</strong></p>
          </div>
        </div>
        <div className={styles.selectionGridList}>
          {sessionsList.map((session, index) => (
            <div key={session.id} className={styles.gateSelectionCard}>
              <div className={styles.cardInfoPanel}>
                <div className={styles.sessionIndexBadge}>Session {index + 1}</div>
                <h3>{session.title}</h3>
                <span className={styles.timeTagStamp}>
                  <FaClock /> {session.start_time ? new Date(session.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "N/A"}
                </span>
              </div>
              <button className={styles.launchGateBtn} onClick={() => navigate(`/dashboard/session/attendance/${session.id}`)}>
                <FaQrcode /> Mark Attendance <FaArrowRight />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.viewHeader}>
        <button onClick={() => navigate("/dashboard/session/attendance")} className={styles.circleBackBtn}><FaArrowLeft /></button>
        <div className={styles.headerInfoText}>
          <h1>{sessionInfo?.title}</h1>
          <p>Managing for: <strong>{isGlobal ? "Global African Database" : activeRegion} Mode</strong></p>
        </div>
        <button className={styles.actionScanFloatingBtn} onClick={() => navigate(`/dashboard/scanner/${sessionId}`)}>
          <FaQrcode /> Scan Badge
        </button>
      </div>

      <div className={styles.metricsBarGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricIconWrap} style={{ backgroundColor: "#f5f2ef", color: "#2d2926" }}><FaUsers /></div>
          <div className={styles.metricData}><h3>{metrics.totalExpected}</h3><span>Expected</span></div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricIconWrap} style={{ backgroundColor: "#e6f4ea", color: "#137333" }}><FaCheckCircle /></div>
          <div className={styles.metricData}><h3 style={{ color: "#137333" }}>{metrics.present}</h3><span>Present</span></div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricIconWrap} style={{ backgroundColor: "#fce8e6", color: "#c5221f" }}><FaUserClock /></div>
          <div className={styles.metricData}><h3 style={{ color: "#c5221f" }}>{metrics.absent}</h3><span>Pending/Absent</span></div>
        </div>
      </div>

      <div className={styles.tableCardContainer}>
        <div className={styles.tableScrollWrapper}>
          <table className={styles.attendanceTable}>
            <thead>
              <tr><th>ID No</th><th>Full Name</th><th>Subgroup Track</th><th>Category</th><th>Terminal Status</th><th>Verification Stamp</th></tr>
            </thead>
            <tbody>
              {attendanceLogs.length === 0 ? (
                <tr><td colSpan="6" className={styles.emptyTablePlaceholder}>No registered attendee track found matching current filters.</td></tr>
              ) : (
                attendanceLogs.map((record) => (
                  <tr key={record.id} className={record.checkedIn ? styles.rowCheckedIn : styles.rowAbsent}>
                    <td className={styles.badgeIdCell}><code>{record.memberId}</code></td>
                    <td className={styles.nameCell}>{record.fullName}</td>
                    <td><span className={styles.subgroupTag}>{record.subgroup}</span></td>
                    <td>{record.category}</td>
                    <td><span className={`${styles.statusLabel} ${record.checkedIn ? styles.statusCleared : styles.statusPending}`}>{record.checkedIn ? "Cleared Entry" : "Pending Pass"}</span></td>
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
