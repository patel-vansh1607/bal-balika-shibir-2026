import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FaSpinner, FaArrowLeft, FaCheckCircle, FaUsers, FaUserClock, FaHistory, FaFileDownload, FaTimesCircle } from 'react-icons/fa';
import { supabase } from '../../supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; 
import styles from './SessionDataDetails.module.css';

// Move static configuration outside to keep object reference stable and fix ESLint warning
const REGION_PREFIXES = {
  "Kenya": "MTRC-KE-",
  "Uganda": "MTRC-UG-",
  "Gaborone": "MTRC-GA-",       
  "Tanzania": "MTRC-TZ-"    
};

export default function SessionDataDetails() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Safely extract selection context state passed from master dropdown routers
  const activeRegion = location.state?.activeRegion || "All";

  const [logs, setLogs] = useState([]);
  const [fullRoster, setFullRoster] = useState([]);
  const [absentList, setAbsentList] = useState([]);
  const [sessionMeta, setSessionMeta] = useState(null);
  const [expectedCount, setExpectedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const isGlobal = !activeRegion || 
                   activeRegion.trim() === "" || 
                   activeRegion.toLowerCase().includes("global") ||
                   activeRegion.toLowerCase().includes("all");

  useEffect(() => {
    const fetchSessionDataPool = async () => {
      try {
        setLoading(true);

        // 1. Fetch targeted single session details
        const { data: sData, error: sErr } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (sErr) throw sErr;
        setSessionMeta(sData);

        // 2. Fetch full baseline active roster object details for cross-referencing absentees
        let rosterQuery = supabase.from('attendees').select('id, member_id, name, region, center');
        const activePrefix = REGION_PREFIXES[activeRegion];

        if (!isGlobal && activePrefix) {
          rosterQuery = rosterQuery.like('member_id', `${activePrefix}%`);
        } else if (!isGlobal) {
          rosterQuery = rosterQuery.eq('region', activeRegion);
        }

        const { data: rosterData, error: rosterErr } = await rosterQuery;
        if (rosterErr) throw rosterErr;
        
        const baselineRoster = rosterData || [];
        setFullRoster(baselineRoster);
        setExpectedCount(baselineRoster.length);

        // 3. Query all entry validation logs for this active event session
        const { data: logPool, error: logErr } = await supabase
          .from('session_logs')
          .select('id, created_at, attendee_id')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: false });

        if (logErr) throw logErr;

        // 4. Hydrate verification logs with matching profile structural records
        let completeLogs = [];
        if (logPool && logPool.length > 0) {
          const attendeeIds = logPool.map(l => l.attendee_id);
          
          let profileQuery = supabase.from('attendees').select('id, member_id, name, region, center').in('id', attendeeIds);
          const { data: attendeesInfo, error: attErr } = await profileQuery;
          if (attErr) throw attErr;

          completeLogs = logPool
            .map(log => {
              const profile = attendeesInfo.find(a => String(a.id).trim() === String(log.attendee_id).trim());
              return {
                ...log,
                memberId: profile ? profile.member_id : "N/A",
                fullName: profile ? profile.name : "Unknown Attendee",
                region: profile ? profile.region : "N/A",
                center: profile ? profile.center : "N/A"
              };
            })
            .filter(log => {
              if (isGlobal || !activePrefix) return true;
              return log.memberId && log.memberId.startsWith(activePrefix);
            });

          setLogs(completeLogs);
        } else {
          setLogs([]);
        }

        // 5. Compute Absent Personnel details directly for UI tracking tables
        const checkedInIdsSet = new Set(completeLogs.map(l => String(l.attendee_id).trim()));
        const unverifiedSaints = baselineRoster.filter(rosterMember => !checkedInIdsSet.has(String(rosterMember.id).trim()));
        setAbsentList(unverifiedSaints);

      } catch (err) {
        console.error("Error processing stream parameters matrix detail logs:", err.message);
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchSessionDataPool();
    }
  }, [sessionId, activeRegion, isGlobal]);

  // Dynamic conditional document assembly with present and absent groups
  const exportToPDF = () => {
    try {
      setIsExporting(true);
      const doc = new jsPDF();
      const timestamp = new Date().toLocaleDateString();

      // Set Up Elegant Document Identity Brand Layout Meta Headers
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(138, 21, 27); // Brand Primary Red Accent
      doc.text("Attendance Report", 14, 22);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Region: ${isGlobal ? "Global African Network" : activeRegion}`, 14, 30);
      doc.text(`Date Exported: ${timestamp}`, 14, 35);

      // Session Core Summary Panel Metadata Cards Layout
      doc.setDrawColor(230, 230, 230);
      doc.setFillColor(248, 249, 250);
      doc.rect(14, 46, 182, 22, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(40, 40, 40);
      doc.text(`${sessionMeta?.title || "Session Activity Hub"}`, 18, 52);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Total: ${expectedCount}`, 18, 62);
      doc.text(`Present: ${logs.length}`, 90, 62);
      doc.text(`Absent: ${absentList.length}`, 150, 62);

      // ---- 1. ASSEMBLE PRESENT SAINTS MATRIX ----
      let presentRows = [];
      let presentHeaders = [];

      if (isGlobal) {
        presentHeaders = [["ID No", "Full Name", "Region", "Center", "Check-In Time"]];
        const sortedGlobalLogs = [...logs].sort((a, b) => a.region.localeCompare(b.region));
        presentRows = sortedGlobalLogs.map(log => [
          log.memberId,
          log.fullName,
          log.region,
          log.center,
          new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        ]);
      } else {
        presentHeaders = [["ID No", "Full Name", "Center", "Check-In Time"]];
        const sortedLocalLogs = [...logs].sort((a, b) => a.center.localeCompare(b.center));
        presentRows = sortedLocalLogs.map(log => [
          log.memberId,
          log.fullName,
          log.center,
          new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        ]);
      }

      // Render Present Table Matrix onto Layout
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(19, 115, 51); // Success Green Accent Title
      doc.text("1. Present Attendance Check-In List", 14, 76);

      autoTable(doc, {
        startY: 80,
        head: presentHeaders,
        body: presentRows,
        theme: 'striped',
        headStyles: { fillColor: [19, 115, 51], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: { 0: { fontStyle: 'bold' } }
      });

      // ---- 2. ASSEMBLE ABSENT SAINTS MATRIX ----
      let absentRows = [];
      let absentHeaders = [];

      if (isGlobal) {
        absentHeaders = [["ID No", "Full Name", "Region", "Center", "Status"]];
        const sortedGlobalAbsent = [...absentList].sort((a, b) => (a.region || "").localeCompare(b.region || ""));
        absentRows = sortedGlobalAbsent.map(m => [
          m.member_id || "N/A",
          m.name || "Unknown Saint",
          m.region || "N/A",
          m.center || "N/A",
          "ABSENT"
        ]);
      } else {
        absentHeaders = [["ID No", "Full Name", "Center", "Status"]];
        const sortedLocalAbsent = [...absentList].sort((a, b) => (a.center || "").localeCompare(b.center || ""));
        absentRows = sortedLocalAbsent.map(m => [
          m.member_id || "N/A",
          m.name || "Unknown",
          m.center || "N/A",
          "ABSENT"
        ]);
      }

      // Render Section Header for Absentees seamlessly below the first table
      const finalYOfFirstTable = doc.lastAutoTable.finalY || 85;
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(138, 21, 27); // Brand Primary Red Accent for Absent section
      doc.text("2. Absent Attendance List", 14, finalYOfFirstTable + 12);

      autoTable(doc, {
        startY: finalYOfFirstTable + 16,
        head: absentHeaders,
        body: absentRows.length === 0 ? [["-", "All expected records successfully checked in.", "-", ""]] : absentRows,
        theme: 'striped',
        headStyles: { fillColor: [138, 21, 27], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: { 
          0: { fontStyle: 'bold' },
          [isGlobal ? 4 : 3]: { textColor: [138, 21, 27], fontStyle: 'bold' } 
        },
        didDrawPage: function (data) {
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(`Page ${data.pageNumber} of Attendance Report`, 14, doc.internal.pageSize.height - 10);
        }
      });

      const processedFilename = `${sessionMeta?.title || "Session"}_Attendance_${activeRegion.replace(/\s+/g, '_')}.pdf`;
      doc.save(processedFilename);
    } catch (err) {
      console.error("PDF Export generation pipeline sequence failure exception:", err);
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loader}>
        <FaSpinner className={styles.spin} /> Loading...
      </div>
    );
  }

  return (
    <div className={styles.masterContainer}>
      {/* View Header Meta Controls */}
      <div className={styles.detailHeaderWrapper}>
        <div className={styles.headerLeft}>
          <button className={styles.cleanBackButton} onClick={() => navigate('/dashboard/session/master')}>
            <FaArrowLeft /> Back to Dashboard
          </button>
          <h1 className={styles.detailMainTitle}>{sessionMeta?.title || "Session Activity Hub"}</h1>
          <p className={styles.detailSubtitle}>
             Region: <strong>{isGlobal ? "Global African Network" : activeRegion}</strong>
          </p>
        </div>
        
        {/* Dynamic Action Trigger Button Block Component */}
        <div className={styles.headerRight}>
          <button 
            onClick={exportToPDF} 
            disabled={isExporting || fullRoster.length === 0}
            className={styles.pdfExportButton}
            style={{ 
              backgroundColor: fullRoster.length === 0 ? '#cccccc' : '#8a151b', 
              cursor: fullRoster.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            {isExporting ? <FaSpinner className={styles.spin} /> : <FaFileDownload />}
            {isGlobal ? 'Export Region Audit Report PDF' : 'Export Center Ledger PDF'}
          </button>
        </div>
      </div>

      {/* Top row analytics overview blocks */}
      <div className={styles.statsHorizontalGrid}>
        <div className={styles.metricRowCard}>
          <div className={styles.metricIconBox} style={{ color: '#2d2926', background: '#f5f2ef' }}>
            <FaUsers />
          </div>
          <div>
            <h3>{expectedCount}</h3>
            <p>{isGlobal ? "Expected" : `${activeRegion} Expected Pool`}</p>
          </div>
        </div>

        <div className={styles.metricRowCard}>
          <div className={styles.metricIconBox} style={{ color: '#137333', background: '#e6f4ea' }}>
            <FaCheckCircle />
          </div>
          <div>
            <h3 className={styles.textPresent}>{logs.length}</h3>
            <p>Present</p>
          </div>
        </div>

        <div className={styles.metricRowCard}>
          <div className={styles.metricIconBox} style={{ color: '#8a151b', background: '#fde8e8' }}>
            <FaUserClock />
          </div>
          <div>
            <h3 style={{ color: '#8a151b' }}>{absentList.length}</h3>
            <p> Absent/Pending </p>
          </div>
        </div>
      </div>

      {/* Primary Data Matrix Ledger Section: PRESENT */}
      <div className={styles.sidebarCard} style={{ marginTop: '24px', padding: '24px' }}>
        <h3 className={styles.sectionTitle} style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: '#137333' }}>
          <FaHistory /> Present
        </h3>
        
        <div className={styles.tableResponsiveWrapper}>
          <table className={styles.matrixTable}>
            <thead>
              <tr>
                <th>ID No</th>
                <th>Full Name</th>
                <th>Region</th>
                <th>Center</th>
                <th>Check-In</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className={styles.tableEmptyMessage}>
                    No entry verification actions recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td className={styles.tablePrimaryCell}><code>{log.memberId}</code></td>
                    <td>{log.fullName}</td>
                    <td>{log.region}</td>
                    <td>
                      <span className={styles.centerBadgeTag}>
                        {isGlobal && log.region && log.center !== "N/A" 
                          ? `${log.region} — ${log.center}` 
                          : log.center}
                      </span>
                    </td>
                    <td className={styles.stampSuccessText}>
                      <FaCheckCircle className={styles.inlineCheckIcon} /> 
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Secondary Data Matrix Ledger Section: ABSENT */}
      <div className={styles.sidebarCard} style={{ marginTop: '32px', padding: '24px', borderTop: '4px solid #8a151b' }}>
        <h3 className={styles.sectionTitle} style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: '#8a151b' }}>
          <FaTimesCircle style={{ color: '#8a151b' }} />Absent/Pending
        </h3>
        
        <div className={styles.tableResponsiveWrapper}>
          <table className={styles.matrixTable}>
            <thead>
              <tr>
                <th>ID No</th>
                <th>Full Name</th>
                <th>Region</th>
                <th>Center</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {absentList.length === 0 ? (
                <tr>
                  <td colSpan="5" className={styles.tableEmptyMessage} style={{ color: '#137333' }}>
                    Perfect Score! All have successfully checked into this session.
                  </td>
                </tr>
              ) : (
                absentList.map((member) => (
                  <tr key={member.id}>
                    <td className={styles.tablePrimaryCell}><code>{member.member_id || "N/A"}</code></td>
                    <td>{member.name || "Unknown Saint"}</td>
                    <td>{member.region || "N/A"}</td>
                    <td>
                      <span className={styles.centerBadgeTag} style={{ background: '#fef3f3', color: '#8a151b' }}>
                        {member.center || "N/A"}
                      </span>
                    </td>
                    <td style={{ color: '#8a151b', fontWeight: 'bold' }}>
                      Absent
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