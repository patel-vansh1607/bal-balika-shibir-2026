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
  FaGlobe,
  FaCalendarAlt,
} from "react-icons/fa";
import {
  sessions as sessionsApi,
  sessionLogs,
  attendees as attendeesApi,
} from "../../apiClient";

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
  const [metrics, setMetrics] = useState({
    totalExpected: 0,
    present: 0,
    absent: 0,
  });

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

  if (loading || isDataFetching) {
    return (
      <div className={styles.loaderContainer}>
        <div className={styles.loaderPulseWrap}>
          <FaSpinner className={styles.spin} />
        </div>
        <span>Loading session parameters...</span>
      </div>
    );
  }

  if (isMenuSelectionMode) {
    return (
      <div className={styles.container}>
        <div className={styles.viewHeader}>
          <div className={styles.headerLeft}>
            <button
              onClick={() => navigate("/dashboard/session/master")}
              className={styles.circleBackBtn}
              title="Back to Session Master"
            >
              <FaArrowLeft />
            </button>
            <div className={styles.headerInfoText}>
              <h1>Sessions Attendance</h1>
              <p>Select a Session track to manage and log live attendance</p>
            </div>
          </div>
          <div className={styles.regionBadgeSection}>
            <span className={styles.regionBadgeLabel}>Active Scope</span>
            <span className={styles.regionBadgePill}>
              <FaGlobe /> {activeRegion}
            </span>
          </div>
        </div>

        <div className={styles.selectionGridList}>
          {sessionsList.length === 0 ? (
            <div className={styles.emptyGridState}>
              <FaCalendarAlt className={styles.emptyIcon} />
              <h3>No Active Sessions Found</h3>
              <p>There are no session tracks currently configured for {activeRegion}.</p>
            </div>
          ) : (
            sessionsList.map((session, index) => (
              <div key={session.id} className={styles.gateSelectionCard}>
                <div className={styles.cardInfoPanel}>
                  <div className={styles.cardTopRow}>
                    <span className={styles.sessionIndexBadge}>
                      Session {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <h3 className={styles.sessionCardTitle}>{session.title}</h3>

                  <div className={styles.cardMetaGroup}>
                    <span className={styles.timeTagStamp}>
                      <FaClock />{" "}
                      {session.start_time
                        ? formatNairobiTime(session.start_time)
                        : "N/A"}
                    </span>
                    <span
                      className={`${styles.sessionRegionTag} ${
                        session.region === "All"
                          ? styles.regionGlobal
                          : styles.regionSpecific
                      }`}
                    >
                      <FaGlobe />{" "}
                      {session.region === "All"
                        ? "All Regions"
                        : session.region || "Unassigned"}
                    </span>
                  </div>
                </div>

                <button
                  className={styles.launchGateBtn}
                  onClick={() =>
                    navigate(`/dashboard/session/attendance/${session.id}`)
                  }
                >
                  <span>
                    <FaQrcode /> Mark Attendance
                  </span>
                  <FaArrowRight className={styles.btnArrowIcon} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.viewHeader}>
        <div className={styles.headerLeft}>
          <button
            onClick={() => navigate("/dashboard/session/attendance")}
            className={styles.circleBackBtn}
            title="Back to Sessions List"
          >
            <FaArrowLeft />
          </button>
          <div className={styles.headerInfoText}>
            <h1>{sessionInfo?.title || "Session Attendance"}</h1>
            <p>
              Scope:{" "}
              <strong>
                {isGlobal ? "Global Regional Directory" : activeRegion}
              </strong>
            </p>
          </div>
        </div>
        <div className={styles.headerActionGroup}>
          <button
            className={styles.actionScanFloatingBtnSecondary}
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
            style={{ backgroundColor: "#f4f4f5", color: "#52525b" }}
          >
            <FaUsers />
          </div>
          <div className={styles.metricData}>
            <h3>{metrics.totalExpected}</h3>
            <span>Total Expected</span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div
            className={styles.metricIconWrap}
            style={{ backgroundColor: "#dcfce7", color: "#15803d" }}
          >
            <FaCheckCircle />
          </div>
          <div className={styles.metricData}>
            <h3 style={{ color: "#15803d" }}>{metrics.present}</h3>
            <span>Present (Cleared)</span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div
            className={styles.metricIconWrap}
            style={{ backgroundColor: "#fee2e2", color: "#b91c1c" }}
          >
            <FaUserClock />
          </div>
          <div className={styles.metricData}>
            <h3 style={{ color: "#b91c1c" }}>{metrics.absent}</h3>
            <span>Pending (Absent)</span>
          </div>
        </div>
      </div>

      {/* Roster Data Table */}
      <div className={styles.tableCardContainer}>
        <div className={styles.tableScrollWrapper}>
          <table className={styles.attendanceTable}>
            <thead>
              <tr>
                <th>Member ID</th>
                <th>Full Name</th>
                <th>Region</th>
                <th>Subgroup Track</th>
                <th>Category</th>
                <th>Status</th>
                <th>Verification Time</th>
              </tr>
            </thead>
            <tbody>
              {attendanceLogs.length === 0 ? (
                <tr>
                  <td colSpan="7" className={styles.emptyTablePlaceholder}>
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
                      <span className={styles.subgroupTag}>{record.region}</span>
                    </td>
                    <td>
                      <span className={styles.subgroupTag}>{record.subgroup}</span>
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
                        {record.checkedIn ? (
                          <>
                            <FaCheckCircle style={{ marginRight: 6 }} /> Cleared
                          </>
                        ) : (
                          <>
                            <FaUserClock style={{ marginRight: 6 }} /> Pending
                          </>
                        )}
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