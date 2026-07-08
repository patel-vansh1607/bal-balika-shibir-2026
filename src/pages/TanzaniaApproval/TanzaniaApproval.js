import React, { useState, useMemo, useEffect } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import QRCode from "qrcode";
import { attendees as attendeesApi, email as emailApi } from "../../apiClient";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  FaSearch,
  FaMapMarkerAlt,
  FaTimes,
  FaUserFriends,
  FaFileExport,
  FaDownload,
  FaSpinner,
  FaCheck,
  FaSave,
  FaUserClock,
  FaUserCheck,
  FaUserTimes
} from "react-icons/fa";
import styles from "./TanzaniaApproval.module.css";

export default function TanzaniaApproval({
  attendees = [],
  dataFetching = false,
  regionScope = "Tanzania",
  userRole,
  setAttendees,
}) {
  // Filtering and UI Control States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCenter, setSelectedCenter] = useState("All");
  const [selectedGender, setSelectedGender] = useState("All");
  const [statusFilter, setStatusFilter] = useState("Awaiting Screening");
  
  // Action Processing Indicators
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [isSavingRowId, setIsSavingRowId] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isDownloadingQR, setIsDownloadingQR] = useState(false);
  
  // Modal State Variables
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  
  // Pagination State Layout Matrix
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;

  // Sync and Process Roster Names Client-Side using RegisteredRoster's parsing fallbacks
  const processedAttendees = useMemo(() => {
    return attendees.map(attendee => {
      let fName = attendee.first_name || "";
      let mName = attendee.middle_name || "";
      let lName = attendee.last_name || "";

      // Dynamic fallback parsing logic if explicit fields aren't split yet
      if (!fName && attendee.name) {
        const nameParts = attendee.name.trim().split(/\s+/);
        if (nameParts.length === 1) {
          fName = nameParts[0];
        } else if (nameParts.length === 2) {
          fName = nameParts[0];
          lName = nameParts[1];
        } else if (nameParts.length >= 3) {
          fName = nameParts[0];
          mName = nameParts.slice(1, -1).join(" ");
          lName = nameParts[nameParts.length - 1];
        }
      }

      // Resolve conflicting email properties exactly like RegisteredRoster
      const loadedEmail = attendee.email || attendee.email_address || attendee.parent_email || "";

      return {
        ...attendee,
        first_name: fName,
        middle_name: mName,
        last_name: lName,
        email: loadedEmail
      };
    });
  }, [attendees]);

  /* --- CORE DATA FETCHING & FILTER FILTER MATRIX ---
     Mimics RegisteredRoster by looking at country OR region fallbacks dynamically. */
  const filteredAttendees = useMemo(() => {
    return processedAttendees.filter((attendee) => {
      // Look up double-key geographic properties safely to avoid blank arrays
      const attendeeCountry = attendee.country || attendee.region || "Kenya";
      
      // Strict matching for this module to catch Tanzania row allocations
      const isTanzania = String(attendeeCountry).toLowerCase().trim() === "tanzania";
      if (!isTanzania) return false;

      // Filter out records matching archive state (Standard is false for active views)
      if (attendee.is_archived === true) return false;

      const nameSafe = attendee.name?.toLowerCase() || "";
      const contactSafe = String(attendee.parent_contact || attendee.phone_number || "");
      const idSafe = String(attendee.member_id || "").toLowerCase();

      const matchesSearch = 
        nameSafe.includes(searchTerm.toLowerCase().trim()) ||
        contactSafe.includes(searchTerm.trim()) ||
        idSafe.includes(searchTerm.toLowerCase().trim());

      const matchesStatus = statusFilter === "All" || attendee.status === statusFilter;
      const matchesCenter = selectedCenter === "All" || attendee.center === selectedCenter;
      const matchesGender = selectedGender === "All" || attendee.gender === selectedGender;

      return matchesSearch && matchesStatus && matchesCenter && matchesGender;
    });
  }, [processedAttendees, searchTerm, statusFilter, selectedCenter, selectedGender]);

  // Reset page layout index when critical parameter strings pivot
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, selectedCenter, selectedGender]);

  // Slice Master Result Dataset down into 25-Row Segments
  const paginatedAttendees = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAttendees.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAttendees, currentPage]);

  const totalPages = Math.ceil(filteredAttendees.length / ITEMS_PER_PAGE);
  
  // Re-map centersList using the strict double-key property fallback logic
  const centersList = [
    "All",
    ...new Set(
      processedAttendees
        .filter(a => String(a.country || a.region || "").toLowerCase().trim() === "tanzania")
        .map((a) => a.center)
        .filter(Boolean)
    ),
  ];

  // Global Counter Metrics Box Calculations
  const metrics = useMemo(() => {
    const tanzaniaSet = processedAttendees.filter(a => String(a.country || a.region || "").toLowerCase().trim() === "tanzania" && !a.is_archived);
    return {
      pending: tanzaniaSet.filter(a => a.status === "Awaiting Screening").length,
      confirmed: tanzaniaSet.filter(a => a.status === "Confirmed").length,
      rejected: tanzaniaSet.filter(a => a.status === "Rejected").length,
    };
  }, [processedAttendees]);

  /* --- DATA MUTATION CONTROL ENGINE --- */
  const handleInlineFieldChange = (id, field, value) => {
    setAttendees(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleInlineSave = async (attendee) => {
    setIsSavingRowId(attendee.id);
    const compiledName = `${attendee.first_name} ${attendee.middle_name} ${attendee.last_name}`.replace(/\s+/g, " ").trim();
    
    try {
      await attendeesApi.update(attendee.id, {
        first_name: attendee.first_name,
        middle_name: attendee.middle_name,
        last_name: attendee.last_name,
        name: compiledName,
        email: attendee.email || null
      });
      
      setAttendees(prev =>
        prev.map(item => (item.id === attendee.id ? { ...item, name: compiledName, email: attendee.email || null } : item))
      );
    } catch (err) {
      console.error("Profile change save failed:", err);
    } 
  };

  const handleScreeningDecision = async (attendee, isApproved) => {
    const finalStatus = isApproved ? "Confirmed" : "Rejected";
    setActionLoadingId(attendee.id);

    const compiledName = `${attendee.first_name} ${attendee.middle_name} ${attendee.last_name}`.replace(/\s+/g, " ").trim();
    const targetEmail = attendee.email || null;
    let assignedMemberId = attendee.member_id;

    // Generate dynamic sequential ID if newly approved
    if (isApproved && !assignedMemberId) {
      const confirmedAttendees = attendees.filter(a => a.status === "Confirmed" && String(a.member_id || "").startsWith("MTRC-TZ-"));
      let maxNum = 0;
      
      confirmedAttendees.forEach(a => {
        const parts = a.member_id.split("-");
        const num = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      });

      assignedMemberId = `MTRC-TZ-${String(maxNum + 1).padStart(4, "0")}`;
    }

    try {
      await attendeesApi.update(attendee.id, { 
        first_name: attendee.first_name,
        middle_name: attendee.middle_name,
        last_name: attendee.last_name,
        name: compiledName,
        email: targetEmail,
        member_id: assignedMemberId,
        status: finalStatus 
      });

      if (isApproved) {
        await emailApi.sendConfirmationEmail({
          email: targetEmail,
          name: compiledName,
          memberId: assignedMemberId,
          region: "Tanzania",
          center: attendee.center
        });
      } else {
        await emailApi.sendRejectionEmail({
          email: targetEmail,
          name: compiledName,
          region: "Tanzania",
          center: attendee.center
        });
      }

      setAttendees(prev => 
        prev.map(item => 
          (item.id === attendee.id) 
            ? { ...item, name: compiledName, member_id: assignedMemberId, status: finalStatus } 
            : item
        )
      );
    } catch (err) {
      console.error("Screening update lifecycle error:", err);
      alert("Failed to modify screening parameters.");
    } finally {
      setActionLoadingId(null);
    }
  };

  /* --- RECONCILED EXPORT ROUTINES --- */
  const executeExport = (includeContact) => {
    setIsExporting(true);
    setIsExportModalOpen(false);
    try {
      const headers = ["Sr No.", "Member ID", "Full Name", "Mandal", "Age", "Country", "Center Branch", "Status"];
      if (includeContact) headers.push("Parent Contact");

      const csvRows = [
        headers.join(","),
        ...filteredAttendees.map((row, index) => {
          const baseFields = [
            `"${index + 1}"`,
            `"${row.member_id || 'PENDING'}"`,
            `"${(row.name || "").replace(/"/g, '""')}"`,
            `"${row.gender || "Balak"}"`,
            `"${row.age || ""}"`,
            `"Tanzania"`,
            `"${row.center || ""}"`,
            `"${row.status}"`
          ];
          if (includeContact) {
            const rawContact = row.parent_contact || row.phone_number || "";
            baseFields.push(`"${rawContact ? `\t${rawContact}` : ""}"`);
          }
          return baseFields.join(",");
        })
      ];

      const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Registered_Tanzania_Screening.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) { console.error(err); } finally { setIsExporting(false); }
  };

  const handleExportPDF = (includeContact) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const headers = [["Sr No.", "Member ID", "Full Name", "Mandal", "Age", "Center Branch", "Status"]];
    if (includeContact) headers[0].push("Parent Contact");

    const bodyData = filteredAttendees.map((a, i) => {
      const base = [i + 1, a.member_id || "PENDING", a.name || "", a.gender || "Balak", a.age || "—", a.center || "", a.status];
      if (includeContact) base.push(a.parent_contact || a.phone_number || "");
      return base;
    });

    autoTable(doc, {
      startY: 32,
      head: headers,
      body: bodyData,
      theme: "striped",
      styles: { fontSize: 8, font: "helvetica", cellPadding: 3, valign: "middle" },
      headStyles: { fillColor: [42, 52, 107], textColor: [255, 255, 255] },
      margin: { top: 32, left: 10, right: 10 },
      didDrawPage: function () {
        doc.setFillColor(42, 52, 107);
        doc.rect(0, 0, 210, 24, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("Bal-Balika Shibir 2026 - Tanzania Screening System", 12, 11);
      }
    });
    doc.save(`Registered_Tanzania_Report.pdf`);
  };

  const downloadBatchQR = async () => {
    if (filteredAttendees.length === 0) return;
    setIsDownloadingQR(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder("Tanzania_Screening_QRs");
      for (const attendee of filteredAttendees) {
        const id = attendee.member_id || attendee.id;
        const name = (attendee.name || "Attendee").replace(/\s+/g, "_");
        try {
          const dataUrl = await QRCode.toDataURL(String(id), { width: 300, margin: 2 });
          const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
          folder.file(`${id}_${name}.png`, base64, { base64: true });
        } catch (qrErr) { console.error(qrErr); }
      }
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `Batch_QR_Tanzania.zip`);
    } catch (error) { console.error(error); } finally { setIsDownloadingQR(false); }
  };

  return (
    <div className={styles.rosterContainer}>
      {/* Metrics Grid Matrix layout */}
      <section className={styles.statsGrid}>
        <div className={styles.statCard} onClick={() => setStatusFilter("Awaiting Screening")} style={{ cursor: "pointer" }}>
          <div className={styles.statLabel}><FaUserClock /> Awaiting Screening</div>
          <p className={styles.statValue}>{metrics.pending}</p>
        </div>
        <div className={styles.statCard} onClick={() => setStatusFilter("Confirmed")} style={{ cursor: "pointer" }}>
          <div className={styles.statLabel} style={{ color: "#2b6cb0" }}><FaUserCheck /> Confirmed Passes</div>
          <p className={styles.statValue} style={{ color: "#2b6cb0" }}>{metrics.confirmed}</p>
        </div>
        <div className={styles.statCard} onClick={() => setStatusFilter("Rejected")} style={{ cursor: "pointer" }}>
          <div className={styles.statLabel} style={{ color: "#c53030" }}><FaUserTimes /> Declined Invites</div>
          <p className={styles.statValue} style={{ color: "#c53030" }}>{metrics.rejected}</p>
        </div>
      </section>

      {/* Roster Controls Header Toolbar */}
      <div className={styles.contentCard} style={{ marginBottom: "24px", padding: "20px" }}>
        <div className={styles.toolbarRow}>
          <div className={styles.searchWrapper}>
            <input 
              type="text" 
              placeholder="Search by name, ID or contacts..." 
              className={styles.inputField}
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
            <FaSearch className={styles.searchIcon} />
          </div>
          
          <div className={styles.filterGroup}>
            <div className={styles.filterSelectContainer}>
              <FaMapMarkerAlt style={{ color: "var(--accent-primary)" }} />
              <select value={selectedCenter} onChange={(e) => setSelectedCenter(e.target.value)} className={styles.selectDropdown}>
                {centersList.map(c => <option key={c} value={c}>{c === "All" ? "All Center Branches" : c}</option>)}
              </select>
            </div>

            <div className={styles.filterSelectContainer}>
              <FaUserFriends style={{ color: "var(--accent-primary)" }} />
              <select value={selectedGender} onChange={(e) => setSelectedGender(e.target.value)} className={styles.selectDropdown}>
                <option value="All">All Mandals</option>
                <option value="Balak">Balak</option>
                <option value="Balika">Balika</option>
              </select>
            </div>

            <div className={styles.filterSelectContainer}>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={styles.selectDropdown}>
                <option value="All">All Statuses</option>
                <option value="Awaiting Screening">Awaiting Screening</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <button onClick={() => setIsExportModalOpen(true)} className={styles.exportBtn} disabled={isExporting}>
              {isExporting ? <FaSpinner className={styles.spin} /> : <FaFileExport />} Excel
            </button>
            <button onClick={() => setIsPdfModalOpen(true)} className={styles.pdfBtn}><FaFileExport /> PDF</button>
            <button onClick={downloadBatchQR} className={styles.qrBtn} disabled={isDownloadingQR}>
              {isDownloadingQR ? <FaSpinner className={styles.spin} /> : <FaDownload />} QRs
            </button>
          </div>
        </div>
      </div>

      {/* Export Selection Modals popups */}
      {isExportModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.exportModalContent}>
            <h3>Export Data - Excel</h3>
            <div className={styles.exportOptions}>
              <button onClick={() => executeExport(true)} className={`${styles.choiceBtn} ${styles.primaryChoice}`}>EXCEL - With Contacts</button>
              <button onClick={() => executeExport(false)} className={`${styles.choiceBtn} ${styles.secondaryChoice}`}>EXCEL - Without Contacts</button>
            </div>
            <button onClick={() => setIsExportModalOpen(false)} className={styles.cancelBtn}>Cancel</button>
          </div>
        </div>
      )}

      {isPdfModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.exportModalContent}>
            <h3>Export Data - PDF</h3>
            <div className={styles.exportOptions}>
              <button onClick={() => { handleExportPDF(true); setIsPdfModalOpen(false); }} className={`${styles.choiceBtn} ${styles.primaryChoice}`}>PDF - With Contacts</button>
              <button onClick={() => { handleExportPDF(false); setIsPdfModalOpen(false); }} className={`${styles.choiceBtn} ${styles.secondaryChoice}`}>PDF - Without Contacts</button>
            </div>
            <button onClick={() => setIsPdfModalOpen(false)} className={styles.cancelBtn}>Cancel</button>
          </div>
        </div>
      )}

      {/* Data Pagination Footnotes Matrix */}
      {filteredAttendees.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", borderTop: "1px solid #e2e8f0", backgroundColor: "#ffffff", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ color: "#475569", fontSize: "14px" }}>
            Showing <strong>{Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredAttendees.length)}</strong> to <strong>{Math.min(currentPage * ITEMS_PER_PAGE, filteredAttendees.length)}</strong> of <strong>{filteredAttendees.length}</strong> records
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button type="button" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} style={{ padding: "6px 14px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: currentPage === 1 ? "#f1f5f9" : "#ffffff", color: currentPage === 1 ? "#94a3b8" : "#334155", cursor: currentPage === 1 ? "not-allowed" : "pointer" }}>Previous</button>
            <span style={{ fontSize: "14px" }}>Page <strong>{currentPage}</strong> of <strong>{totalPages || 1}</strong></span>
            <button type="button" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0} style={{ padding: "6px 14px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: currentPage === totalPages || totalPages === 0 ? "#f1f5f9" : "#ffffff", color: currentPage === totalPages || totalPages === 0 ? "#94a3b8" : "#334155", cursor: currentPage === totalPages || totalPages === 0 ? "not-allowed" : "pointer" }}>Next</button>
          </div>
        </div>
      )}

      {/* Main Table Content Panel */}
      <div className={styles.contentCard}>
        {dataFetching ? (
          <div className={styles.tableMessageBlock}>
            <FaSpinner className={`${styles.spin} ${styles.loaderSpinner}`} />
            <p style={{ marginTop: "12px" }}>Updating regional data array...</p>
          </div>
        ) : filteredAttendees.length === 0 ? (
          <div className={styles.tableMessageBlock}>
            <p>No attendees found matching region: <strong>Tanzania</strong>.</p>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Member ID</th>
                  <th>Full Name Structure Inputs</th>
                  <th>Mandal Group</th>
                  <th>Center Branch</th>
                  <th>Email Path</th>
                  <th style={{ textAlign: "center" }}>Actions Grid</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAttendees.map((attendee) => {
                  return (
                    <tr key={attendee.id}>
                      <td style={{ fontWeight: "600" }}>{attendee.member_id || "PENDING"}</td>
                      <td>
                        <div style={{ display: "flex", gap: "4px" }}>
                          <input type="text" value={attendee.first_name || ""} onChange={(e) => handleInlineFieldChange(attendee.id, "first_name", e.target.value)} style={{ width: "70px", padding: "4px", borderRadius: "4px", border: "1px solid #cbd5e1" }} />
                          <input type="text" value={attendee.middle_name || ""} onChange={(e) => handleInlineFieldChange(attendee.id, "middle_name", e.target.value)} style={{ width: "50px", padding: "4px", borderRadius: "4px", border: "1px solid #cbd5e1" }} />
                          <input type="text" value={attendee.last_name || ""} onChange={(e) => handleInlineFieldChange(attendee.id, "last_name", e.target.value)} style={{ width: "70px", padding: "4px", borderRadius: "4px", border: "1px solid #cbd5e1" }} />
                        </div>
                      </td>
                      <td>
                        <span style={{ marginRight: "6px" }}>{attendee.age} Y/O</span>
                        <strong style={{ color: attendee.gender === "Balika" ? "#c53030" : "#2b6cb0" }}>{attendee.gender}</strong>
                      </td>
                      <td>{attendee.center}</td>
                      <td>
                        <input type="email" value={attendee.email || ""} onChange={(e) => handleInlineFieldChange(attendee.id, "email", e.target.value)} style={{ width: "130px", padding: "4px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "12px" }} />
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {attendee.status === "Awaiting Screening" ? (
                          <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                            <button onClick={() => handleScreeningDecision(attendee, true)} disabled={actionLoadingId !== null} style={{ backgroundColor: "#2f855a", color: "#fff", border: "none", padding: "4px 8px", borderRadius: "4px", cursor: "pointer" }}>
                              {actionLoadingId === attendee.id ? <FaSpinner className={styles.spin} /> : <FaCheck />}
                            </button>
                            <button onClick={() => handleScreeningDecision(attendee, false)} disabled={actionLoadingId !== null} style={{ backgroundColor: "#c53030", color: "#fff", border: "none", padding: "4px 8px", borderRadius: "4px", cursor: "pointer" }}>
                              {actionLoadingId === attendee.id ? <FaSpinner className={styles.spin} /> : <FaTimes />}
                            </button>
                            <button onClick={() => handleInlineSave(attendee)} disabled={isSavingRowId === attendee.id} style={{ backgroundColor: "#4a5568", color: "#fff", border: "none", padding: "4px 8px", borderRadius: "4px", cursor: "pointer" }}>
                              {isSavingRowId === attendee.id ? <FaSpinner className={styles.spin} /> : <FaSave />}
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "center" }}>
                            <span style={{ fontSize: "12px", fontWeight: "bold", color: attendee.status === "Confirmed" ? "#2f855a" : "#c53030" }}>{attendee.status}</span>
                            <button onClick={() => handleInlineSave(attendee)} style={{ fontSize: "10px", background: "none", border: "none", textDecoration: "underline", color: "#4a5568", cursor: "pointer" }}>Update</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}