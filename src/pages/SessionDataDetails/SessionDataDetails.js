import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  FaSpinner, FaArrowLeft, FaCheckCircle, FaUsers,
  FaUserClock, FaHistory, FaFileDownload, FaTimesCircle,
} from "react-icons/fa";
import { sessions as sessionsApi, sessionLogs, attendees as attendeesApi } from "../../apiClient";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import styles from "./SessionDataDetails.module.css";

const REGION_PREFIXES = {
  Kenya: "MTRC-KE-", Uganda: "MTRC-UG-",
  Tanzania: "MTRC-TZ-", Zambia: "MTRC-ZM-",
  Malawi: "MTRC-MW-", Botswana: "MTRC-BW-",
  "South Africa": "MTRC-ZA-",
};

export default function SessionDataDetails() {
  const { sessionId } = useParams();
  const navigate      = useNavigate();
  const location      = useLocation();
  const activeRegion  = location.state?.activeRegion || "All";

  const [logs, setLogs]               = useState([]);
  const [fullRoster, setFullRoster]   = useState([]);
  const [absentList, setAbsentList]   = useState([]);
  const [sessionMeta, setSessionMeta] = useState(null);
  const [expectedCount, setExpectedCount] = useState(0);
  const [loading, setLoading]         = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const isGlobal = !activeRegion || activeRegion.trim() === "" ||
    activeRegion.toLowerCase().includes("global") || activeRegion.toLowerCase().includes("all");

  useEffect(() => {
    const fetchSessionDataPool = async () => {
      try {
        setLoading(true);
        const { data: sData } = await sessionsApi.get(sessionId);
        setSessionMeta(sData);

        const activePrefix = REGION_PREFIXES[activeRegion];
        const params = isGlobal ? {} : activePrefix ? { prefix: activePrefix } : { region: activeRegion };
        const { data: rosterData } = await attendeesApi.list(params);
        const baselineRoster = rosterData || [];
        setFullRoster(baselineRoster);
        setExpectedCount(baselineRoster.length);

        const { data: logPool } = await sessionLogs.list({ session_id: sessionId });
        const rawLogs = logPool || [];

        const completeLogs = rawLogs
          .map((log) => ({
            ...log,
            memberId:  log.member_id   || "N/A",
            fullName:  log.attendee_name || "Unknown Attendee",
            region:    log.region      || "N/A",
            center:    log.center      || "N/A",
          }))
          .filter((log) => {
            if (isGlobal || !activePrefix) return true;
            return log.memberId && log.memberId.startsWith(activePrefix);
          });

        setLogs(completeLogs);

        const checkedInIds = new Set(completeLogs.map((l) => String(l._raw_attendee_id)));
        setAbsentList(baselineRoster.filter((m) => !checkedInIds.has(String(m._raw_id || parseInt(m.id, 10)))));
      } catch (err) {
        console.error("Session data detail fetch error:", err.message);
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) fetchSessionDataPool();
  }, [sessionId, activeRegion, isGlobal]);

  const exportToPDF = () => {
    try {
      setIsExporting(true);
      const doc       = new jsPDF();
      const timestamp = new Date().toLocaleDateString();

      doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.setTextColor(138, 21, 27);
      doc.text("Attendance Report", 14, 22);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(100, 100, 100);
      doc.text(`Region: ${isGlobal ? "Global African Network" : activeRegion}`, 14, 30);
      doc.text(`Date Exported: ${timestamp}`, 14, 35);
      doc.setFillColor(248, 249, 250);
      doc.rect(14, 46, 182, 22, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(40, 40, 40);
      doc.text(`${sessionMeta?.title || "Session Activity Hub"}`, 18, 52);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10);
      doc.text(`Total: ${expectedCount}`, 18, 62);
      doc.text(`Present: ${logs.length}`, 90, 62);
      doc.text(`Absent: ${absentList.length}`, 150, 62);

      const presentHeaders = isGlobal ? [["ID No","Full Name","Region","Center","Check-In Time"]] : [["ID No","Full Name","Center","Check-In Time"]];
      const presentRows = [...logs]
        .sort((a,b) => isGlobal ? a.region.localeCompare(b.region) : a.center.localeCompare(b.center))
        .map((log) => isGlobal
          ? [log.memberId, log.fullName, log.region, log.center, new Date(log.created_at).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", second:"2-digit" })]
          : [log.memberId, log.fullName, log.center, new Date(log.created_at).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", second:"2-digit" })]);

      doc.setFont("helvetica","bold"); doc.setFontSize(12); doc.setTextColor(19,115,51);
      doc.text("1. Present Attendance Check-In List", 14, 76);
      autoTable(doc, { startY: 80, head: presentHeaders, body: presentRows, theme: "striped", headStyles: { fillColor: [19,115,51], textColor: [255,255,255], fontStyle: "bold" }, styles: { fontSize: 9, cellPadding: 3 }, columnStyles: { 0: { fontStyle: "bold" } } });

      const absentHeaders = isGlobal ? [["ID No","Full Name","Region","Center","Status"]] : [["ID No","Full Name","Center","Status"]];
      const absentRows = [...absentList]
        .sort((a,b) => isGlobal ? (a.region||"").localeCompare(b.region||"") : (a.center||"").localeCompare(b.center||""))
        .map((m) => isGlobal
          ? [m.member_id||"N/A", m.name||"Unknown", m.region||"N/A", m.center||"N/A", "ABSENT"]
          : [m.member_id||"N/A", m.name||"Unknown", m.center||"N/A", "ABSENT"]);

      const finalY = doc.lastAutoTable.finalY || 85;
      doc.setFont("helvetica","bold"); doc.setFontSize(12); doc.setTextColor(138,21,27);
      doc.text("2. Absent Attendance List", 14, finalY + 12);
      autoTable(doc, {
        startY: finalY + 16, head: absentHeaders,
        body: absentRows.length === 0 ? [["-","All expected records successfully checked in.","-",""]] : absentRows,
        theme: "striped", headStyles: { fillColor: [138,21,27], textColor: [255,255,255], fontStyle: "bold" },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: { 0: { fontStyle: "bold" }, [isGlobal ? 4 : 3]: { textColor: [138,21,27], fontStyle: "bold" } },
        didDrawPage: (data) => {
          doc.setFontSize(8); doc.setTextColor(150,150,150);
          doc.text(`Page ${data.pageNumber} of Attendance Report`, 14, doc.internal.pageSize.height - 10);
        },
      });

      doc.save(`${sessionMeta?.title || "Session"}_Attendance_${activeRegion.replace(/\s+/g,"_")}.pdf`);
    } catch (err) {
      console.error("PDF export error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) return <div className={styles.loader}><FaSpinner className={styles.spin} /> Loading...</div>;

  return (
    <div className={styles.masterContainer}>
      <div className={styles.detailHeaderWrapper}>
        <div className={styles.headerLeft}>
          <button className={styles.cleanBackButton} onClick={() => navigate("/dashboard/session/master")}><FaArrowLeft /> Back to Dashboard</button>
          <h1 className={styles.detailMainTitle}>{sessionMeta?.title || "Session Activity Hub"}</h1>
          <p className={styles.detailSubtitle}>Region: <strong>{isGlobal ? "Global African Network" : activeRegion}</strong></p>
        </div>
        <div className={styles.headerRight}>
          <button onClick={exportToPDF} disabled={isExporting || fullRoster.length === 0} className={styles.pdfExportButton} style={{ backgroundColor: fullRoster.length === 0 ? "#cccccc" : "#8a151b", cursor: fullRoster.length === 0 ? "not-allowed" : "pointer" }}>
            {isExporting ? <FaSpinner className={styles.spin} /> : <FaFileDownload />}
            {isGlobal ? "Export Attendance Report" : "Export Attendance Report"}
          </button>
        </div>
      </div>

      <div className={styles.statsHorizontalGrid}>
        <div className={styles.metricRowCard}><div className={styles.metricIconBox} style={{ color:"#2d2926",background:"#f5f2ef" }}><FaUsers /></div><div><h3>{expectedCount}</h3><p>{isGlobal ? "Expected" : `${activeRegion} Expected Pool`}</p></div></div>
        <div className={styles.metricRowCard}><div className={styles.metricIconBox} style={{ color:"#137333",background:"#e6f4ea" }}><FaCheckCircle /></div><div><h3 className={styles.textPresent}>{logs.length}</h3><p>Present</p></div></div>
        <div className={styles.metricRowCard}><div className={styles.metricIconBox} style={{ color:"#8a151b",background:"#fde8e8" }}><FaUserClock /></div><div><h3 style={{ color:"#8a151b" }}>{absentList.length}</h3><p>Absent/Pending</p></div></div>
      </div>

      <div className={styles.sidebarCard} style={{ marginTop:"24px",padding:"24px" }}>
        <h3 className={styles.sectionTitle} style={{ marginBottom:"20px",display:"flex",alignItems:"center",gap:"10px",color:"#137333" }}><FaHistory /> Present</h3>
        <div className={styles.tableResponsiveWrapper}>
          <table className={styles.matrixTable}>
            <thead><tr><th>ID No</th><th>Full Name</th><th>Region</th><th>Center</th><th>Check-In</th></tr></thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan="5" className={styles.tableEmptyMessage}>No entry verification actions recorded yet.</td></tr>
              ) : logs.map((log) => (
                <tr key={log.id}>
                  <td className={styles.tablePrimaryCell}><code>{log.memberId}</code></td>
                  <td>{log.fullName}</td>
                  <td>{log.region}</td>
                  <td><span className={styles.centerBadgeTag}>{isGlobal && log.region && log.center !== "N/A" ? `${log.region} — ${log.center}` : log.center}</span></td>
                  <td className={styles.stampSuccessText}><FaCheckCircle className={styles.inlineCheckIcon} />{new Date(log.created_at).toLocaleTimeString([], { hour:"2-digit",minute:"2-digit",second:"2-digit" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.sidebarCard} style={{ marginTop:"32px",padding:"24px",borderTop:"4px solid #8a151b" }}>
        <h3 className={styles.sectionTitle} style={{ marginBottom:"20px",display:"flex",alignItems:"center",gap:"10px",color:"#8a151b" }}><FaTimesCircle style={{ color:"#8a151b" }} />Absent/Pending</h3>
        <div className={styles.tableResponsiveWrapper}>
          <table className={styles.matrixTable}>
            <thead><tr><th>ID No</th><th>Full Name</th><th>Region</th><th>Center</th><th>Status</th></tr></thead>
            <tbody>
              {absentList.length === 0 ? (
                <tr><td colSpan="5" className={styles.tableEmptyMessage} style={{ color:"#137333" }}>Perfect Score! All have successfully checked into this session.</td></tr>
              ) : absentList.map((member) => (
                <tr key={member.id}>
                  <td className={styles.tablePrimaryCell}><code>{member.member_id || "N/A"}</code></td>
                  <td>{member.name || "Unknown"}</td>
                  <td>{member.region || "N/A"}</td>
                  <td><span className={styles.centerBadgeTag} style={{ background:"#fef3f3",color:"#8a151b" }}>{member.center || "N/A"}</span></td>
                  <td style={{ color:"#8a151b",fontWeight:"bold" }}>Absent</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
