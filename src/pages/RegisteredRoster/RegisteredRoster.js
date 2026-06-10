import React, { useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { supabase } from "../../supabaseClient";
import { useMemo } from "react";

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
  // Add this to your existing useState definitions
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedGender, setSelectedGender] = useState("All"); // 'All' | 'Balak' | 'Balika' | 'Shishu' | 'Shishika'

  const [imageErrors, setImageErrors] = useState({});
  // Add these to your state
  const [isExporting, setIsExporting] = useState(false);
  const [isDownloadingQR, setIsDownloadingQR] = useState(false);
  const [isDownloadingSingle, setIsDownloadingSingle] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // { attendee: object, type: 'archive'|'restore' }
  const [activeQrModalUser, setActiveQrModalUser] = useState(null);

  // Derive unique center hubs dynamically based *only* on the current region's dataset

  const centersList = [
    "All",
    ...new Set(attendees.map((a) => a.center).filter(Boolean)),
  ];
  const initiateArchive = (attendee, shouldArchive) => {
    setConfirmAction({ attendee, shouldArchive });
  };

  const executeArchive = async () => {
    if (!confirmAction) return;

    setIsProcessing(true); // Start the loading spinner
    const { attendee, shouldArchive } = confirmAction;

    try {
      const { error } = await supabase
        .from("attendees")
        .update({ is_archived: shouldArchive })
        .eq("id", attendee.id);

      if (error) throw error;

      // Update local state:
      // If you want to move them to/from the archived list,
      // filter them out so they disappear from the current view.
      setAttendees((prev) => prev.filter((a) => a.id !== attendee.id));

      // Success: Close the modal
      setConfirmAction(null);
    } catch (err) {
      console.error("Database update failed:", err);
      // Replace alert() with a non-blocking notification or
      // simply close the modal so the user can try again.
      setConfirmAction(null);
    } finally {
      setIsProcessing(false); // Stop the loading spinner regardless of success or failure
    }
  };
  const downloadBatchQR = async () => {
    if (filteredAttendees.length === 0) return;

    setIsDownloadingQR(true); // Start loading state

    try {
      const zip = new JSZip();
      const folder = zip.folder(`QR_Codes_${regionScope}`);

      // Loop through filtered list
      for (const attendee of filteredAttendees) {
        const id = attendee.member_id || attendee.memberId || attendee.id;
        const name = (attendee.name || "Attendee").replace(/\s+/g, "_");

        // Use 6-character hex (e.g., 8a151b or 000000)
        const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(id)}&color=000000&format=png&t=${Date.now()}`;

        const response = await fetch(url);
        const blob = await response.blob();

        // Add to zip
        folder.file(`${id}_${name}.png`, blob);
      }

      // Generate and trigger download
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(
        content,
        `Batch_QR_${regionScope}_${new Date().toISOString().slice(0, 10)}.zip`,
      );
    } catch (error) {
      console.error("Batch download failed", error);
      alert("Failed to generate ZIP file. Please try again.");
    } finally {
      setIsDownloadingQR(false); // Stop loading state regardless of success/fail
    }
  }; // Apply localized sub-filters (Search bar, Mandal select, Center branch select)

  const filteredAttendees = useMemo(() => {
    return attendees.filter((attendee) => {
      // 1. Sanitization & Normalization
      const nameSafe = attendee.name?.toLowerCase() || "";
      const contactSafe = String(
        attendee.parent_contact || attendee.parentContact || "",
      );
      const customIdSafe = String(
        attendee.member_id || attendee.memberId || "",
      ).toLowerCase();

      // 2. Archive status filter
      const matchesArchiveStatus = attendee.is_archived === showArchived;

      // 3. Search match logic
      const matchesSearch =
        nameSafe.includes(searchTerm.toLowerCase()) ||
        contactSafe.includes(searchTerm) ||
        customIdSafe.includes(searchTerm.toLowerCase());

      // 4. Categorical filters
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

          // Fix: Wrap the phone number in ="..." so Excel treats it as text
          // Use \t (tab) before the contact number.
          // This forces Excel to treat the cell content as text.
          const rawContact = row.parent_contact || row.parentContact || "";
          const finalContact = rawContact ? `\t${rawContact}` : "";
          return [
            `"${finalId}"`,
            `"${row.name?.replace(/"/g, '""') || ""}"`,
            `"${row.gender || "Balak"}"`,
            `"${row.age}"`,
            `"${row.center}"`,
            `"${finalContact}"`, // This now includes the Excel-formatting trick
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
      // This runs immediately after the code above finishes
      setIsExporting(false);
    }
  };
  const toggleArchiveStatus = (attendee, shouldArchive) => {
    initiateArchive(attendee, shouldArchive);
  };
  const downloadQRImg = async (memberId, userName) => {
    setIsDownloadingSingle(true); // Start loading animation

    try {
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(memberId)}&color=8a151b&format=png&t=${Date.now()}`;
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
      setIsDownloadingSingle(false); // Stop loading animation
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

                  // Unified token identifier fallback logic

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
                          onClick={() => setActiveQrModalUser(attendee)}
                          className={styles.viewPassBtn}
                        >
                          <FaQrcode style={{ fontSize: "13px" }} /> View Pass
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
                                disabled={isProcessing} // Prevent double-clicks
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
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(activeQrModalUser.member_id || activeQrModalUser.memberId || activeQrModalUser.id)}&color=000000`}
                alt="Verification Token Map"
                className={styles.qrImage}
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
