import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaSpinner,
  FaCheckCircle,
  FaUserClock,
  FaUsers,
  FaQrcode,
  FaClock,
  FaKeyboard,
  FaArrowRight,
  FaTrash,
  FaGlobe,
  FaCheck,
  FaTimes,
} from "react-icons/fa";
import {
  sessions as sessionsApi,
  sessionLogs,
  attendees as attendeesApi,
} from "../../apiClient";

const REGIONS = ['All', 'Kenya', 'Tanzania', 'Uganda', 'Zambia', 'Malawi', 'Botswana', 'South Africa'];
import styles from "./Sessions.module.css";

export default function Sessions({
  regionScope,
  prefixScope,
  globalAttendeesList,
  isDataFetching,
}) {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [sessionsList, setSessionsList] = useState([]);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ totalExpected: 0, present: 0, absent: 0 });
  const [deletingId, setDeletingId] = useState(null);
  const [assigningId, setAssigningId] = useState(null);
  const [assignRegionValue, setAssignRegionValue] = useState("");
  const [actionMsg, setActionMsg] = useState(null);

  const isMenuSelectionMode = !sessionId || sessionId === "attendance";
  const activeRegion =
    regionScope || localStorage.getItem("selected_shibir_region") || "All";
  const activePrefix =
    prefixScope || localStorage.getItem("selected_shibir_prefix") || "";
  const isGlobal = activeRegion === "All";

  // Helper for consistent East Africa Time (EAT) / Nairobi formatting
  const formatNairobiTime = (dateInput) => {
    if (!dateInput) return "—";
    try {
      let date;
      if (typeof dateInput === "string") {
        let isoStr = dateInput.trim();
        if (
          !isoStr.endsWith("Z") &&
          !isoStr.includes("+") &&
          !isoStr.includes("-")
        ) {
          isoStr = isoStr.replace(" ", "T") + "Z";
        }
        date = new Date(isoStr);
      } else {
        date = new Date(dateInput);
      }

      if (isNaN(date.getTime())) return "—";

      return date.toLocaleTimeString("en-KE", {
        timeZone: "Africa/Nairobi",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    } catch (err) {
      return "—";
    }
  };

  useEffect(() => {
    const fetchSessionWorkspace = async () => {
      try {
        setLoading(true);
        if (isMenuSelectionMode) {
          const { data } = await sessionsApi.list(activeRegion);
          setSessionsList(data || []);
          setLoading(false);
          return;
        }

        const { data: currentSession } = await sessionsApi.get(sessionId);
        setSessionInfo(currentSession);

        let scopedRoster = globalAttendeesList || [];
        if (scopedRoster.length === 0) {
          const params = isGlobal
            ? {}
            : activePrefix
            ? { prefix: activePrefix }
            : { region: activeRegion };
          const { data } = await attendeesApi.list(params);
          scopedRoster = data || [];
        }

        const rosterCount = scopedRoster.length;
        const attendeeLookupMap = new Map(
          scopedRoster.map((a) => [
            String(a._raw_id || parseInt(a.id, 10)),
            a,
          ])
        );
        const { data: logsData } = await sessionLogs.list({
          session_id: sessionId,
        });
        const logs = logsData || [];
        const logsCheckedInIds = new Set(
          logs.map((log) => String(log._raw_attendee_id))
        );

        let filteredRoster =
          isGlobal || !activePrefix
            ? scopedRoster
            : scopedRoster.filter((a) => a.member_id?.startsWith(activePrefix));

        let parsedRosterStatus = filteredRoster.map((attendee) => {
          const key = String(attendee._raw_id || parseInt(attendee.id, 10));
          const matchingLog = logs.find(
            (log) => String(log._raw_attendee_id) === key
          );
          const hasCheckedIn = logsCheckedInIds.has(key);
          return {
            id: attendee.id,
            memberId: attendee.member_id || "N/A",
            fullName: attendee.name || "Unknown Attendee",
            region: attendee.region || "N/A",
            subgroup: attendee.subgroup || "N/A",
            category: attendee.category || "General",
            checkedIn: hasCheckedIn,
            checkInTime:
              hasCheckedIn && matchingLog?.created_at
                ? formatNairobiTime(matchingLog.created_at)
                : "—",
          };
        });

        logs.forEach((log) => {
          const key = String(log._raw_attendee_id);
          if (!attendeeLookupMap.has(key) && log.attendee_name) {
            if (
              !parsedRosterStatus.some(
                (item) => String(parseInt(item.id, 10)) === key
              )
            ) {
              if (
                isGlobal ||
                !activePrefix ||
                log.member_id?.startsWith(activePrefix)
              ) {
                parsedRosterStatus.push({
                  id: log.attendee_id,
                  memberId: log.member_id || "N/A",
                  fullName: log.attendee_name || "Verified External Attendee",
                  region: log.region || "N/A",
                  subgroup: "Cross-Region",
                  category: "General",
                  checkedIn: true,
                  checkInTime: log.created_at
                    ? formatNairobiTime(log.created_at)
                    : "—",
                });
              }
            }
          }
        });

        const presentCount = parsedRosterStatus.filter(
          (item) => item.checkedIn
        ).length;
        const adjustedTotalCount = Math.max(
          rosterCount,
          parsedRosterStatus.length
        );
        setAttendanceLogs(parsedRosterStatus);
        setMetrics({
          totalExpected: adjustedTotalCount,
          present: presentCount,
          absent: Math.max(0, adjustedTotalCount - presentCount),
        });
      } catch (err) {
        console.error("Session fetch error:", err.message);
      } finally {
        setLoading(false);
      }
    };

    if (!isDataFetching) fetchSessionWorkspace();
  }, [
    sessionId,
    isMenuSelectionMode,
    activeRegion,
    activePrefix,
    globalAttendeesList,
    isDataFetching,
    isGlobal,
  ]);

  const handleDeleteSession = async (session) => {
    if (!window.confirm(`Delete "${session.title}"? This cannot be undone.`)) return;
    setDeletingId(session.id);
    try {
      await sessionsApi.delete(session.id);
      setSessionsList((prev) => prev.filter((s) => s.id !== session.id));
      setActionMsg({ type: "success", text: `"${session.title}" deleted.` });
    } catch (err) {
      setActionMsg({ type: "error", text: err.message });
    } finally {
      setDeletingId(null);
      setTimeout(() => setActionMsg(null), 4000);
    }
  };

  const handleAssignRegion = async (session) => {
    if (!assignRegionValue) return;
    try {
      await sessionsApi.update(session.id, { region: assignRegionValue });
      setSessionsList((prev) =>
        prev.map((s) => s.id === session.id ? { ...s, region: assignRegionValue } : s)
      );
      setActionMsg({ type: "success", text: `Region updated to "${assignRegionValue}".` });
    } catch (err) {
      setActionMsg({ type: "error", text: err.message });
    } finally {
      setAssigningId(null);
      setAssignRegionValue("");
      setTimeout(() => setActionMsg(null), 4000);
    }
  };

  if (loading || isDataFetching) {
    return (
      <div className={styles.loaderContainer}>
        <FaSpinner className={styles.spin} /> Loading session parameters...
      </div>
    );
  }

  if (isMenuSelectionMode) {
    return (
      <div className={styles.container}>
        <div className={styles.viewHeader}>
          <button
            onClick={() => navigate("/dashboard/session/master")}
            className={styles.circleBackBtn}
          >
            <FaArrowLeft />
          </button>
          <div className={styles.headerInfoText}>
            <h1>Sessions Attendance</h1>
            <p>Select a Session track to manage attendance</p>
          </div>
        </div>

        <div className={styles.regionBadgeSection}>
          <span className={styles.regionBadgeLabel}>Active Region:</span>
          <span className={styles.regionBadgePill}>{activeRegion}</span>
        </div>

        {actionMsg && (
          <div className={`${styles.actionToast} ${actionMsg.type === "error" ? styles.actionToastError : styles.actionToastSuccess}`}>
            {actionMsg.text}
          </div>
        )}

        <div className={styles.selectionGridList}>
          {sessionsList.map((session, index) => (
            <div key={session.id} className={styles.gateSelectionCard}>
              <div className={styles.cardInfoPanel}>
                <div className={styles.cardTopRow}>
                  <div className={styles.sessionIndexBadge}>Session {index + 1}</div>
                  <button
                    className={styles.deleteSessionBtn}
                    title="Delete session"
                    disabled={deletingId === session.id}
                    onClick={() => handleDeleteSession(session)}
                  >
                    {deletingId === session.id ? <FaSpinner className={styles.spin} /> : <FaTrash />}
                  </button>
                </div>
                <h3>{session.title}</h3>
                <span className={styles.timeTagStamp}>
                  <FaClock />{" "}
                  {session.start_time ? formatNairobiTime(session.start_time) : "N/A"}
                </span>
                <span className={styles.sessionRegionTag} style={{ background: session.region === "All" ? "#f0fdf4" : "#eff6ff", color: session.region === "All" ? "#166534" : "#1d4ed8", borderColor: session.region === "All" ? "#bbf7d0" : "#bfdbfe" }}>
                  <FaGlobe style={{ fontSize: 10 }} /> {session.region === "All" ? "All Regions" : session.region}
                </span>

                {/* Assign region inline */}
                {assigningId === session.id ? (
                  <div className={styles.assignRegionRow}>
                    <select
                      value={assignRegionValue}
                      onChange={(e) => setAssignRegionValue(e.target.value)}
                      className={styles.assignRegionSelect}
                      autoFocus
                    >
                      <option value="">Pick region...</option>
                      {REGIONS.map((r) => (
                        <option key={r} value={r}>{r === "All" ? "All Regions (Global)" : r}</option>
                      ))}
                    </select>
                    <button className={styles.assignConfirmBtn} onClick={() => handleAssignRegion(session)} disabled={!assignRegionValue}><FaCheck /></button>
                    <button className={styles.assignCancelBtn} onClick={() => { setAssigningId(null); setAssignRegionValue(""); }}><FaTimes /></button>
                  </div>
                ) : (
                  <button className={styles.assignRegionTrigger} onClick={() => { setAssigningId(session.id); setAssignRegionValue(session.region || "All"); }}>
                    <FaGlobe /> Assign Region
                  </button>
                )}
              </div>
              <button
                className={styles.launchGateBtn}
                onClick={() => navigate(`/dashboard/session/attendance/${session.id}`)}
              >
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
        <button
          onClick={() => navigate("/dashboard/session/attendance")}
          className={styles.circleBackBtn}
        >
          <FaArrowLeft />
        </button>
        <div className={styles.headerInfoText}>
          <h1>{sessionInfo?.title || "Session Attendance"}</h1>
          <p>
            Managing for:{" "}
            <strong>
              {isGlobal ? "Global Regional Directory" : activeRegion}
            </strong>
          </p>
        </div>
        <div className={styles.headerActionGroup}>
          <button
            className={styles.actionScanFloatingBtn}
            onClick={() => navigate(`../manual-scanner/${sessionId}`)}
          >
            <FaKeyboard /> Manual Entry
          </button>
          <button
            className={styles.actionScanFloatingBtn}
            onClick={() => navigate(`/dashboard/scanner/${sessionId}`)}
          >
            <FaQrcode /> Scan Badge
          </button>
        </div>
      </div>

      {/* Scoreboard Metrics */}
      <div className={styles.metricsBarGrid}>
        <div className={styles.metricCard}>
          <div
            className={styles.metricIconWrap}
            style={{ backgroundColor: "#f5f2ef", color: "#52525b" }}
          >
            <FaUsers />
          </div>
          <div className={styles.metricData}>
            <h3>{metrics.totalExpected}</h3>
            <span>Expected</span>
          </div>
        </div>
        <div className={styles.metricCard}>
          <div
            className={styles.metricIconWrap}
            style={{ backgroundColor: "#e6f4ea", color: "#137333" }}
          >
            <FaCheckCircle />
          </div>
          <div className={styles.metricData}>
            <h3 style={{ color: "#137333" }}>{metrics.present}</h3>
            <span>Present</span>
          </div>
        </div>
        <div className={styles.metricCard}>
          <div
            className={styles.metricIconWrap}
            style={{ backgroundColor: "#fce8e6", color: "#c5221f" }}
          >
            <FaUserClock />
          </div>
          <div className={styles.metricData}>
            <h3 style={{ color: "#c5221f" }}>{metrics.absent}</h3>
            <span>Pending</span>
          </div>
        </div>
      </div>

      <div className={styles.tableCardContainer}>
        <div className={styles.tableScrollWrapper}>
          <table className={styles.attendanceTable}>
            <thead>
              <tr>
                <th>ID No</th>
                <th>Full Name</th>
                <th>Region</th>
                <th>Subgroup Track</th>
                <th>Category</th>
                <th>Status</th>
                <th>Verification</th>
              </tr>
            </thead>
            <tbody>
              {attendanceLogs.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className={styles.emptyTablePlaceholder}
                  >
                    No attendance records logged for this session scope.
                  </td>
                </tr>
              ) : (
                attendanceLogs.map((record) => (
                  <tr
                    key={record.id}
                    className={
                      record.checkedIn
                        ? styles.rowCheckedIn
                        : styles.rowAbsent
                    }
                  >
                    <td className={styles.badgeIdCell}>
                      <code>{record.memberId}</code>
                    </td>
                    <td className={styles.nameCell}>{record.fullName}</td>
                    <td>
                      <span className={styles.subgroupTag}>
                        {record.region}
                      </span>
                    </td>
                    <td>
                      <span className={styles.subgroupTag}>
                        {record.subgroup}
                      </span>
                    </td>
                    <td>{record.category}</td>
                    <td>
                      <span
                        className={`${styles.statusLabel} ${
                          record.checkedIn
                            ? styles.statusCleared
                            : styles.statusPending
                        }`}
                      >
                        {record.checkedIn ? "Cleared" : "Pending"}
                      </span>
                    </td>
                    <td className={styles.timeStampCell}>
                      {record.checkInTime}
                    </td>
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
