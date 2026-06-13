import React, { useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { supabase } from "../../supabaseClient";
import { useMemo } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  FaSearch,
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaQrcode,
  FaTimes,
  FaUserFriends,
  FaFileExport,
  FaDownload,
  FaSpinner,
  FaArchive,
} from "react-icons/fa";

import styles from "./RegisteredRoster.module.css";
jsPDF.autoTable = autoTable;

export default function RegisteredRoster({
  attendees = [],
  dataFetching = false,
  regionScope = "All",
  userRole,
  setAttendees,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const showArchived = false;
  const [selectedCenter, setSelectedCenter] = useState("All");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedGender, setSelectedGender] = useState("All");

  const [imageErrors, setImageErrors] = useState({});
  const [isExporting, setIsExporting] = useState(false);
  const [isDownloadingQR, setIsDownloadingQR] = useState(false);
  const [isDownloadingSingle, setIsDownloadingSingle] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [activeQrModalUser, setActiveQrModalUser] = useState(null);
  const [isQrLoading, setIsQrLoading] = useState(true);

  const centersList = [
    "All",
    ...new Set(attendees.map((a) => a.center).filter(Boolean)),
  ];
  const initiateArchive = (attendee, shouldArchive) => {
    setConfirmAction({ attendee, shouldArchive });
  };
  // const exportToPDF = async () => {
  //   // 1. Filter out archived records immediately so we only deal with active ones
  //   const activeAttendees = attendees.filter(attendee => !attendee?.is_archived);

  //   // Guard clause if no active records exist
  //   if (activeAttendees.length === 0) {
  //     alert("No active records available to export.");
  //     return;
  //   }

  //   setIsExporting(true);

  //   try {
  //     const doc = new jsPDF({
  //       orientation: "portrait",
  //       unit: "mm",
  //       format: "a4"
  //     });

  //     // Hex mapping from your design framework
  //     const themeColors = {
  //       bgMain: "#fcfbfa",       // Soft cream
  //       bgCard: "#ffffff",       // Card white
  //       textMain: "#2d2926",     // Deep charcoal
  //       textMuted: "#6c635c",    // Warm gray-brown
  //       accentPrimary: "#8a151b",// Deep Crimson Maroon
  //       accentSoft: "#f4ece6",   // Soft beige/terracotta tint
  //       borderLight: "#e6dfd9",  // Muted organic border
  //     };

  //     // Set background sheet bleed color
  //     doc.setFillColor(themeColors.bgMain);
  //     doc.rect(0, 0, 210, 297, "F");

  //     // --- PDF HEADER DESIGN ---
  //     doc.setFont("helvetica", "bold");
  //     doc.setFontSize(22);
  //     doc.setTextColor(themeColors.accentPrimary);
  //     doc.text("Making the Right Choices", 14, 22);

  //     doc.setFont("helvetica", "normal");
  //     doc.setFontSize(10);
  //     doc.setTextColor(themeColors.textMuted);
  //     doc.text(`Region: ${regionScope || "All"}`, 14, 29);

  //     // Decorative Accent Line using organic border configuration
  //     doc.setDrawColor(themeColors.borderLight);
  //     doc.setLineWidth(0.8);
  //     doc.line(14, 33, 196, 33);

  //     // --- SAFE DATA MAPPING (ONLY IS_ARCHIVED === FALSE) ---
  //     const tableHeaders = [["SR.", "Full Name", "Gender", "Region", "Status", "Registration Date"]];

  //     const tableRows = activeAttendees.map((attendee, index) => {
  //       const fullName = attendee?.full_name || attendee?.name || "N/A";
  //       const gender = attendee?.gender ? String(attendee.gender).toUpperCase() : "N/A";
  //       const region = attendee?.region || "N/A";
  //       const status = "Active";

  //       let regDate = "N/A";
  //       if (attendee?.created_at) {
  //         try {
  //           regDate = new Date(attendee.created_at).toLocaleDateString();
  //         } catch (dateErr) {
  //           regDate = String(attendee.created_at).split('T')[0] || "N/A";
  //         }
  //       }

  //       return [index + 1, fullName, gender, region, status, regDate];
  //     });

  //     // --- BUILD THE TABLE LAYOUT (Emulating .data-table rules) ---
  //     autoTable(doc, {
  //       startY: 38,
  //       head: tableHeaders,
  //       body: tableRows,
  //       theme: "plain", // We provide precise structural fill rules manually instead
  //       headStyles: {
  //         fillColor: themeColors.accentSoft,
  //         textColor: themeColors.textMuted,
  //         fontStyle: "bold",
  //         fontSize: 10,
  //         halign: "left",
  //         valign: "middle",
  //         lineWidth: { bottom: 2 },
  //         lineColor: themeColors.borderLight
  //       },
  //       bodyStyles: {
  //         fillColor: themeColors.bgCard,
  //         fontSize: 9,
  //         textColor: themeColors.textMain,
  //         valign: "middle",
  //         lineWidth: { bottom: 1 },
  //         lineColor: themeColors.borderLight
  //       },
  //       alternateRowStyles: {
  //         fillColor: themeColors.bgMain
  //       },
  //       columnStyles: {
  //         0: { cellWidth: 12, halign: "center" },
  //         2: { cellWidth: 20 },
  //         3: { cellWidth: 35 },
  //         4: { cellWidth: 25 },
  //         5: { cellWidth: 35 }
  //       },
  //       margin: { top: 38, left: 14, right: 14, bottom: 35 },
  //       didDrawPage: (data) => {
  //         const pageCount = doc.internal.getNumberOfPages();
  //         const centerX = 105; // Base horizontal coordinate matching precise page splits

  //         // --- 1. METADATA SECTION (CENTERED AT THE BOTTOM) ---
  //         let todayStr = "";
  //         try {
  //           todayStr = new Date().toLocaleDateString("en-US", {
  //             year: "numeric",
  //             month: "long",
  //             day: "numeric",
  //             hour: "2-digit",
  //             minute: "2-digit"
  //           });
  //         } catch (e) {
  //           todayStr = new Date().toISOString().split('T')[0];
  //         }

  //         doc.setFont("helvetica", "normal");
  //         doc.setFontSize(9);
  //         doc.setTextColor(themeColors.textMuted);

  //         // Draw the metadata strings stacked cleanly right above the system footer
  //         doc.text(`Generated: ${todayStr}`, centerX, 270, { align: "center" });
  //         doc.text(`Generated By: ${userRole || "System Administrator"}`, centerX, 275, { align: "center" });

  //         // --- 2. SYSTEM FOOTER LAYOUT (BOTTOM EDGE) ---
  //         doc.setDrawColor(themeColors.borderLight);
  //         doc.setLineWidth(0.5);
  //         doc.line(14, 282, 196, 282); // Fine border above footer

  //         doc.setTextColor(themeColors.textMuted);
  //         doc.text("System generated document. Confidential.", 14, 289);

  //         const pageString = `Page ${data.pageNumber} of ${pageCount}`;
  //         doc.text(pageString, 196, 289, { align: "right" });
  //       }
  //     });

  //     // Save File safely
  //     const cleanScope = String(regionScope || "All").replace(/[^a-z0-9]/gi, '_');
  //     const filename = `Roster_Report_${cleanScope}_${new Date().toISOString().slice(0,10)}.pdf`;
  //     doc.save(filename);

  //   } catch (error) {
  //     console.error("Failed to generate report PDF:", error);
  //     alert(`An error occurred while creating your PDF report: ${error.message || error}`);
  //   } finally {
  //     setIsExporting(false);
  //   }
  // };
  const handleOpenQrModal = (user) => {
    setActiveQrModalUser(user);
    setIsQrLoading(true);
  };
  const executeArchive = async () => {
    if (!confirmAction) return;

    setIsProcessing(true);
    const { attendee, shouldArchive } = confirmAction;

    try {
      const { error } = await supabase
        .from("attendees")
        .update({ is_archived: shouldArchive })
        .eq("id", attendee.id);

      if (error) throw error;

      setAttendees((prev) => prev.filter((a) => a.id !== attendee.id));

      setConfirmAction(null);
    } catch (err) {
      console.error("Database update failed:", err);

      setConfirmAction(null);
    } finally {
      setIsProcessing(false);
    }
  };
  const downloadBatchQR = async () => {
    if (filteredAttendees.length === 0) return;

    setIsDownloadingQR(true);

    try {
      const zip = new JSZip();
      const folder = zip.folder(`QR_Codes_${regionScope}`);

      for (const attendee of filteredAttendees) {
        const id = attendee.member_id || attendee.memberId || attendee.id;
        const name = (attendee.name || "Attendee").replace(/\s+/g, "_");

        const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(id)}&color=000000&format=png&t=${Date.now()}`;

        const response = await fetch(url);
        const blob = await response.blob();

        folder.file(`${id}_${name}.png`, blob);
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(
        content,
        `Batch_QR_${regionScope}_${new Date().toISOString().slice(0, 10)}.zip`,
      );
    } catch (error) {
      console.error("Batch download failed", error);
      alert("Failed to generate ZIP file. Please try again.");
    } finally {
      setIsDownloadingQR(false);
    }
  };

  const filteredAttendees = useMemo(() => {
    return attendees.filter((attendee) => {
      const nameSafe = attendee.name?.toLowerCase() || "";
      const contactSafe = String(
        attendee.parent_contact || attendee.parentContact || "",
      );
      const customIdSafe = String(
        attendee.member_id || attendee.memberId || "",
      ).toLowerCase();

      const matchesArchiveStatus = attendee.is_archived === showArchived;

      const matchesSearch =
        nameSafe.includes(searchTerm.toLowerCase()) ||
        contactSafe.includes(searchTerm) ||
        customIdSafe.includes(searchTerm.toLowerCase());

      const matchesCenter =
        selectedCenter === "All" || attendee.center === selectedCenter;
      const matchesGender =
        selectedGender === "All" || attendee.gender === selectedGender;

      return (
        matchesArchiveStatus && matchesSearch && matchesCenter && matchesGender
      );
    });
  }, [attendees, searchTerm, selectedCenter, selectedGender, showArchived]);
  const exportToCSV = () => {
    if (filteredAttendees.length === 0) {
      alert("No matched dataset found to extract.");
      return;
    }

    setIsExporting(true);

    try {
      const headers = [
        "Member ID",
        "Full Name",
        "Mandal",
        "Age",
        "Center Branch",
        "Parent Contact",
        "Photo Link",
      ];

      const csvRows = [
        headers.join(","),
        ...filteredAttendees.map((row) => {
          const finalId = row.member_id || row.memberId || row.id;

          const rawContact = row.parent_contact || row.parentContact || "";
          const finalContact = rawContact ? `\t${rawContact}` : "";
          return [
            `"${finalId}"`,
            `"${row.name?.replace(/"/g, '""') || ""}"`,
            `"${row.gender || "Balak"}"`,
            `"${row.age}"`,
            `"${row.center}"`,
            `"${finalContact}"`,
            `"${row.photo_url || row.photoUrl || ""}"`,
          ].join(",");
        }),
      ];

      const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
      const encodedUri = encodeURI(csvContent);
      const downloadAnchor = document.createElement("a");

      downloadAnchor.setAttribute("href", encodedUri);
      downloadAnchor.setAttribute(
        "download",
        `Roster_${regionScope?.replace(/\s+/g, "_") || "All"}_${selectedGender || "Export"}.csv`,
      );

      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
    } catch (error) {
      console.error("Export failed", error);
    } finally {
      setIsExporting(false);
    }
  };
  const toggleArchiveStatus = (attendee, shouldArchive) => {
    initiateArchive(attendee, shouldArchive);
  };

  const downloadQRImg = async (memberId, userName) => {
    setIsDownloadingSingle(true);

    try {
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(memberId)}&color=000000&format=png&t=${Date.now()}`;
      const response = await fetch(qrApiUrl);

      if (!response.ok) throw new Error("Network response was not ok");

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `ID_${memberId}_${userName.replace(/\s+/g, "_")}.png`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download error:", err);
      alert("Failed to initiate QR asset media fetch download.");
    } finally {
      setIsDownloadingSingle(false);
    }
  };
  const getAvatarUrl = (photoPath) => {
    if (!photoPath) return null;

    if (photoPath.startsWith("http://") || photoPath.startsWith("https://")) {
      return `${photoPath.split("?")[0]}?t=${new Date().getTime()}`;
    }

    let cleanFileName = photoPath.includes("/")
      ? photoPath.split("/").pop()
      : photoPath;

    cleanFileName = cleanFileName
      .replace("attendee-profiles/", "")
      .replace("public/", "");

    const projectUrl =
      "https://bdqscvezobwshuyxqrvq.supabase.co/storage/v1/object/public/attendee-profiles";

    return `${projectUrl}/${cleanFileName}?t=${new Date().getTime()}`;
  };

  const getInitials = (name) => {
    if (!name) return "?";

    return name.trim().charAt(0).toUpperCase();
  };

  const handleImageError = (id) => {
    setImageErrors((prev) => ({ ...prev, [id]: true }));
  };
  const ROLES = { master_admin: 4, super_admin: 3, admin: 2, operator: 1 };
  const hasPermission = (userRole, requiredRole) =>
    (ROLES[userRole] || 0) >= (ROLES[requiredRole] || 0);
  console.log("Permissions system initialized:", !!hasPermission);
  const getGenderTagClass = (genderCategory) => {
    switch (genderCategory) {
      case "Balak":
        return styles.tagBalak;

      case "Balika":
        return styles.tagBalika;

      case "Shishu":
        return styles.tagShishu;

      case "Shishika":
        return styles.tagShishika;

      default:
        return styles.tagBalak;
    }
  };

  return (
    <div className={styles.rosterContainer}>
      {/* Dynamic Statistics Metrics Hub */}

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Registered</div>

          <p className={styles.statValue}>{filteredAttendees.length}</p>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel} style={{ color: "#2b6cb0" }}>
            Balak
          </div>

          <p className={styles.statValue} style={{ color: "#2b6cb0" }}>
            {filteredAttendees.filter((a) => a.gender === "Balak").length}
          </p>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel} style={{ color: "#c53030" }}>
            Balika
          </div>

          <p className={styles.statValue} style={{ color: "#c53030" }}>
            {filteredAttendees.filter((a) => a.gender === "Balika").length}
          </p>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel} style={{ color: "#319795" }}>
            Shishu
          </div>

          <p className={styles.statValue} style={{ color: "#319795" }}>
            {filteredAttendees.filter((a) => a.gender === "Shishu").length}
          </p>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel} style={{ color: "#b7791f" }}>
            Shishika
          </div>

          <p className={styles.statValue} style={{ color: "#b7791f" }}>
            {filteredAttendees.filter((a) => a.gender === "Shishika").length}
          </p>
        </div>
      </section>

      {/* Control Actions & Filtering Hub Row */}

      <div
        className={styles.contentCard}
        style={{ marginBottom: "24px", padding: "20px" }}
      >
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

              <select
                value={selectedCenter}
                onChange={(e) => setSelectedCenter(e.target.value)}
                className={styles.selectDropdown}
              >
                {centersList.map((center) => (
                  <option key={center} value={center}>
                    {center === "All" ? "All Center Branches" : center}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterSelectContainer}>
              <FaUserFriends style={{ color: "var(--accent-primary)" }} />

              <select
                value={selectedGender}
                onChange={(e) => setSelectedGender(e.target.value)}
                className={styles.selectDropdown}
              >
                <option value="All">All Mandals</option>

                <option value="Balak">Balak</option>

                <option value="Balika">Balika</option>

                <option value="Shishu">Shishu</option>

                <option value="Shishika">Shishika</option>
              </select>
            </div>

            <button
              onClick={exportToCSV}
              className={styles.exportBtn}
              disabled={isExporting}
            >
              {isExporting ? (
                <FaSpinner className={styles.spin} />
              ) : (
                <FaFileExport />
              )}
              {isExporting ? " Exporting..." : " Export to Excel"}
            </button>

            <button
              onClick={downloadBatchQR}
              className={styles.qrBtn}
              disabled={isDownloadingQR}
            >
              {isDownloadingQR ? (
                <FaSpinner className={styles.spin} />
              ) : (
                <FaDownload />
              )}
              {isDownloadingQR ? " Generating Zip..." : " Download All QR"}
            </button>
            <div className={styles.btnWrapper}>
              <span className={styles.comingSoonBadge}>Coming Soon</span>
              <button
                onClick={(e) => e.preventDefault()}
                className={`${styles.pdfBtn} ${styles.disabledBtn}`}
                disabled={true}
              >
                <FaFileExport />
                {" Export to PDF"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Master Data Table Container */}

      <div className={styles.contentCard}>
        {dataFetching ? (
          <div className={styles.tableMessageBlock}>
            <FaSpinner className={`${styles.spin} ${styles.loaderSpinner}`} />

            <p style={{ marginTop: "12px" }}>
              Updating regional partition data view...
            </p>
          </div>
        ) : filteredAttendees.length === 0 ? (
          <div className={styles.tableMessageBlock}>
            <p>
              No attendes found matching{" "}
              <strong>
                {regionScope === "All" ? "All African Regions" : regionScope}
              </strong>{" "}
              selection grid.
            </p>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Picture</th>

                  <th>Member ID</th>

                  <th>Full Name</th>

                  <th>Mandal</th>

                  <th>Age</th>

                  <th>Center</th>

                  <th>Parent Contact</th>

                  <th style={{ textAlign: "center" }}>Identity Pass</th>
                  {(userRole === "master_admin" ||
                    userRole === "super_admin") && <th>Actions</th>}
                </tr>
              </thead>

              <tbody>
                {filteredAttendees.map((attendee) => {
                  const resolvedAvatarUrl = getAvatarUrl(
                    attendee.photo_url || attendee.photoUrl,
                  );

                  const hasImageError = imageErrors[attendee.id];

                  const systemIdCode =
                    attendee.member_id ||
                    attendee.memberId ||
                    `MTRC-${attendee.id}`;

                  const parentContactDisplay =
                    attendee.parent_contact || attendee.parentContact;

                  return (
                    <tr key={attendee.id}>
                      <td>
                        <div className={styles.avatarWrapper}>
                          {resolvedAvatarUrl && !hasImageError ? (
                            <img
                              src={resolvedAvatarUrl}
                              alt=""
                              crossOrigin="anonymous"
                              className={styles.avatarImage}
                              onError={() => handleImageError(attendee.id)}
                            />
                          ) : (
                            <div className={styles.avatarFallback}>
                              {getInitials(attendee.name)}
                            </div>
                          )}
                        </div>
                      </td>

                      <td
                        className={styles.monospaceText}
                        style={{
                          fontWeight: "700",
                          color: "var(--accent-primary)",
                        }}
                      >
                        {systemIdCode}
                      </td>

                      <td className={styles.boldText}>{attendee.name}</td>

                      <td>
                        <span
                          className={`${styles.badgeGenderTag} ${getGenderTagClass(attendee.gender)}`}
                        >
                          {attendee.gender || "Balak"}
                        </span>
                      </td>

                      <td>{attendee.age}</td>

                      <td>
                        <span className={styles.inlineIconFlex}>
                          <FaMapMarkerAlt className={styles.mutedIcon} />{" "}
                          {attendee.center}
                        </span>
                      </td>

                      <td className={styles.monospaceText}>
                        {parentContactDisplay ? (
                          <span className={styles.inlineIconFlex}>
                            <FaPhoneAlt className={styles.mutedIcon} />{" "}
                            {parentContactDisplay}
                          </span>
                        ) : (
                          <span
                            style={{
                              color: "var(--text-muted)",
                              fontSize: "12px",
                            }}
                          >
                            N/A
                          </span>
                        )}
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <button
                          onClick={() => handleOpenQrModal(attendee)}
                          className={styles.viewPassBtn}
                        >
                          <FaQrcode style={{ fontSize: "13px" }} /> View QR
                        </button>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {/* Archive: Accessible to Admin+ */}
                        {(userRole === "master_admin" ||
                          userRole === "super_admin" ||
                          userRole === "admin") &&
                          !attendee.is_archived && (
                            <button
                              onClick={() =>
                                toggleArchiveStatus(attendee, true)
                              }
                              className={styles.archiveBtn}
                              title="Archive Record"
                            >
                              <FaArchive style={{ fontSize: "12px" }} /> Archive
                            </button>
                          )}

                        {/* Restore: Accessible ONLY to Master Admin */}
                        {userRole === "master_admin" &&
                          attendee.is_archived && (
                            <button
                              onClick={() =>
                                toggleArchiveStatus(attendee, false)
                              }
                              className={styles.actionBtn}
                              style={{ color: "green" }}
                            >
                              Restore
                            </button>
                          )}
                      </td>
                      {confirmAction && (
                        <div
                          className={styles.modalOverlay}
                          onClick={() => setConfirmAction(null)}
                        >
                          <div
                            className={styles.modalCard}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <h3>
                              Confirm{" "}
                              {confirmAction.shouldArchive
                                ? "Archive"
                                : "Restore"}
                            </h3>
                            <p>
                              Are you sure you want to{" "}
                              {confirmAction.shouldArchive
                                ? "archive"
                                : "restore"}{" "}
                              <strong>{confirmAction.attendee.name}</strong>?
                            </p>

                            <div
                              style={{
                                display: "flex",
                                gap: "10px",
                                marginTop: "20px",
                              }}
                            >
                              <button
                                onClick={() => setConfirmAction(null)}
                                className={styles.cancelBtn}
                              >
                                Cancel
                              </button>
                              <button
                                onClick={executeArchive}
                                className={styles.confirmBtn}
                                disabled={isProcessing}
                                style={{
                                  backgroundColor: confirmAction.shouldArchive
                                    ? "#d97706"
                                    : "green",
                                  opacity: isProcessing ? 0.7 : 1,
                                  cursor: isProcessing
                                    ? "not-allowed"
                                    : "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: "8px",
                                }}
                              >
                                {isProcessing ? (
                                  <>
                                    <FaSpinner className={styles.spin} />{" "}
                                    Processing...
                                  </>
                                ) : confirmAction.shouldArchive ? (
                                  "Confirm Archive"
                                ) : (
                                  "Confirm Restore"
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Verification Entry Modal Sheet Overlay */}

      {activeQrModalUser && (
        <div
          className={styles.modalOverlay}
          onClick={() => setActiveQrModalUser(null)}
        >
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.modalCloseBtn}
              onClick={() => setActiveQrModalUser(null)}
            >
              <FaTimes />
            </button>

            <h3 className={styles.modalTitle}>QR Code</h3>

            <p className={styles.modalSubtitle}>BAL-BALIKA SHIBIR 2026</p>

            <div className={styles.qrContainer}>
              {/* Show loading spinner if image is still fetching */}
              {isQrLoading && (
                <div className={styles.qrLoaderWrapper}>
                  <FaSpinner className={styles.spin} />
                  <span className={styles.loaderText}>Generating QR...</span>
                </div>
              )}

              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  activeQrModalUser?.member_id ||
                    activeQrModalUser?.memberId ||
                    activeQrModalUser?.id ||
                    "",
                )}&color=000000`}
                alt="Verification Token Map"
                className={`${styles.qrImage} ${isQrLoading ? styles.hidden : ""}`}
                onLoad={() => setIsQrLoading(false)}
              />
            </div>

            <div className={styles.modalInfoBox}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  marginBottom: "14px",
                }}
              >
                {getAvatarUrl(
                  activeQrModalUser.photo_url || activeQrModalUser.photoUrl,
                ) && !imageErrors[activeQrModalUser.id] ? (
                  <img
                    src={getAvatarUrl(
                      activeQrModalUser.photo_url || activeQrModalUser.photoUrl,
                    )}
                    alt=""
                    crossOrigin="anonymous"
                    className={styles.modalAvatarImg}
                    onError={() => handleImageError(activeQrModalUser.id)}
                  />
                ) : (
                  <div className={styles.modalAvatarFallback}>
                    {getInitials(activeQrModalUser.name)}
                  </div>
                )}

                <div style={{ textAlign: "left" }}>
                  <div className={styles.modalAttendeeName}>
                    {activeQrModalUser.name}
                  </div>

                  <div
                    style={{
                      fontSize: "12.5px",
                      color: "var(--text-muted)",
                      fontWeight: "500",
                    }}
                  >
                    Mandal:{" "}
                    <span
                      className={`${styles.badgeGenderTag} ${getGenderTagClass(activeQrModalUser.gender)}`}
                      style={{ marginLeft: "4px" }}
                    >
                      {activeQrModalUser.gender || "Balak"}
                    </span>
                  </div>
                </div>
              </div>

              <div
                className={styles.modalDataRow}
                style={{
                  borderTop: "1px dashed var(--border-light)",
                  paddingTop: "10px",
                }}
              >
                <span>Center:</span>

                <span style={{ color: "var(--text-main)", fontWeight: "600" }}>
                  {activeQrModalUser.center}
                </span>
              </div>

              <div className={styles.modalDataRow}>
                <span>ID Number:</span>

                <span
                  style={{
                    fontFamily: "monospace",
                    color: "var(--accent-primary)",
                    fontWeight: "700",
                  }}
                >
                  {String(
                    activeQrModalUser.member_id ||
                      activeQrModalUser.memberId ||
                      activeQrModalUser.id,
                  ).toUpperCase()}
                </span>
              </div>
            </div>
            <button
              onClick={() =>
                downloadQRImg(
                  activeQrModalUser.member_id ||
                    activeQrModalUser.memberId ||
                    activeQrModalUser.id,
                  activeQrModalUser.name,
                )
              }
              className={styles.modalDownloadBtn}
              disabled={isDownloadingSingle}
            >
              {isDownloadingSingle ? (
                <>
                  <FaSpinner className={styles.spin} /> Downloading...
                </>
              ) : (
                <>
                  <FaDownload /> Download QR Code
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
