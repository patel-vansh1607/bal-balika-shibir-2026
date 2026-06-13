import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaSpinner,
  FaCheckCircle,
  FaUserClock,
  FaUsers,
  FaArrowRight,
  FaQrcode,
  FaClock,
} from "react-icons/fa";
import { supabase } from "../../supabaseClient";
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

  useEffect(() => {
    const fetchSessionWorkspace = async () => {
      try {
        setLoading(true);

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

        const { data: currentSession, error: sessionErr } = await supabase
          .from("sessions")
          .select("*")
          .eq("id", sessionId)
          .single();

        if (sessionErr) throw sessionErr;
        setSessionInfo(currentSession);

        let scopedRoster = globalAttendeesList || [];
        if (scopedRoster.length === 0 && !isGlobal) {
          let backupQuery = supabase.from("attendees").select("*");
          if (activePrefix) {
            backupQuery = backupQuery.like("member_id", `${activePrefix}%`);
          } else {
            backupQuery = backupQuery.eq("region", activeRegion);
          }
          const { data: backupData } = await backupQuery.order("created_at", {
            ascending: false,
          });
          if (backupData) scopedRoster = backupData;
        }
        const rosterCount = scopedRoster.length;

        const attendeeLookupMap = new Map(
          scopedRoster.map((a) => [String(a.id).trim(), a]),
        );

        const { data: logsData, error: logsErr } = await supabase
          .from("session_logs")
          .select("*")
          .eq("session_id", sessionId);

        if (logsErr) throw logsErr;

        const logsCheckedInIds = new Set(
          logsData.map((log) => String(log.attendee_id).trim()),
        );

        let filteredRoster = scopedRoster;
        if (!isGlobal && activePrefix) {
          filteredRoster = scopedRoster.filter(
            (a) => a.member_id && a.member_id.startsWith(activePrefix),
          );
        }

        let parsedRosterStatus = filteredRoster.map((attendee) => {
          const attendeeKey = String(attendee.id).trim();
          const matchingLog = logsData.find(
            (log) => String(log.attendee_id).trim() === attendeeKey,
          );
          const hasCheckedIn = logsCheckedInIds.has(attendeeKey);

          return {
            id: attendee.id,
            memberId: attendee.member_id || "N/A",
            fullName: attendee.name || "Unknown Attendee",
            subgroup: attendee.subgroup || "N/A",
            category: attendee.category || "General",
            checkedIn: hasCheckedIn,
            checkInTime:
              hasCheckedIn && matchingLog?.created_at
                ? new Date(matchingLog.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                : "—",
          };
        });

        const untrackedLogEntries = logsData.filter(
          (log) => !attendeeLookupMap.has(String(log.attendee_id).trim()),
        );

        if (untrackedLogEntries.length > 0) {
          const externalIds = untrackedLogEntries.map((l) => l.attendee_id);

          const { data: externalProfiles } = await supabase
            .from("attendees")
            .select("id, member_id, name, subgroup, category")
            .in("id", externalIds);

          untrackedLogEntries.forEach((log) => {
            const cleanLogId = String(log.attendee_id).trim();
            const profileMatch = externalProfiles?.find(
              (p) => String(p.id).trim() === cleanLogId,
            );

            if (
              !isGlobal &&
              activePrefix &&
              profileMatch &&
              !profileMatch.member_id?.startsWith(activePrefix)
            ) {
              return;
            }

            const alreadyInjected = parsedRosterStatus.some(
              (item) => String(item.id).trim() === cleanLogId,
            );
            if (!alreadyInjected && profileMatch) {
              parsedRosterStatus.push({
                id: log.attendee_id,
                memberId: profileMatch.member_id || "N/A",
                fullName: profileMatch.name || "Verified External Attendee",
                subgroup: profileMatch.subgroup || "Cross-Region",
                category: profileMatch.category || "General",
                checkedIn: true,
                checkInTime: new Date(log.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                }),
              });
            }
          });
        }

        const presentCount = parsedRosterStatus.filter(
          (item) => item.checkedIn,
        ).length;
        const adjustedTotalCount = Math.max(
          rosterCount,
          parsedRosterStatus.length,
        );
        const absentCount = Math.max(0, adjustedTotalCount - presentCount);

        setAttendanceLogs(parsedRosterStatus);
        setMetrics({
          totalExpected: adjustedTotalCount,
          present: presentCount,
          absent: absentCount,
        });
      } catch (err) {
        console.error(
          "Critical Failure Compiling Session Attendance Streams:",
          err.message,
        );
      } finally {
        setLoading(false);
      }
    };

    if (!isDataFetching) {
      fetchSessionWorkspace();
    }
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
        <FaSpinner className={styles.spin} /> Loading...
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
            <p>
              Select a Session track to manage attendance for:{" "}
              <strong>{activeRegion}</strong>
            </p>
          </div>
        </div>

        <div className={styles.selectionGridList}>
          {sessionsList.map((session, index) => (
            <div key={session.id} className={styles.gateSelectionCard}>
              <div className={styles.cardInfoPanel}>
                <div className={styles.sessionIndexBadge}>
                  Session {index + 1}
                </div>
                <h3>{session.title}</h3>
                <span className={styles.timeTagStamp}>
                  <FaClock />{" "}
                  {session.start_time
                    ? new Date(session.start_time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "N/A"}
                </span>
              </div>
              <button
                className={styles.launchGateBtn}
                onClick={() =>
                  navigate(`/dashboard/session/attendance/${session.id}`)
                }
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
          <h1>{sessionInfo?.title}</h1>
          <p>
            Managing for :{" "}
            <strong>
              {isGlobal ? "Global African Database" : activeRegion} Mode
            </strong>
          </p>
        </div>
        <button
          className={styles.actionScanFloatingBtn}
          onClick={() => navigate(`/dashboard/scanner/${sessionId}`)}
        >
          <FaQrcode /> Scan Badge
        </button>
      </div>

      <div className={styles.metricsBarGrid}>
        <div className={styles.metricCard}>
          <div
            className={styles.metricIconWrap}
            style={{ backgroundColor: "#f5f2ef", color: "#2d2926" }}
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
            <span>Pending/Absent</span>
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
                    No registered attendee track found matching current filters.
                  </td>
                </tr>
              ) : (
                attendanceLogs.map((record) => (
                  <tr
                    key={record.id}
                    className={
                      record.checkedIn ? styles.rowCheckedIn : styles.rowAbsent
                    }
                  >
                    <td className={styles.badgeIdCell}>
                      <code>{record.memberId}</code>
                    </td>
                    <td className={styles.nameCell}>{record.fullName}</td>
                    <td>
                      <span className={styles.subgroupTag}>
                        {record.subgroup}
                      </span>
                    </td>
                    <td>{record.category}</td>
                    <td>
                      <span
                        className={`${styles.statusLabel} ${record.checkedIn ? styles.statusCleared : styles.statusPending}`}
                      >
                        {record.checkedIn ? "Cleared Entry" : "Pending Pass"}
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
