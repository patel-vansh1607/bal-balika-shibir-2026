import React, { useState, useMemo } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import QRCode from "qrcode";
import { attendees as attendeesApi } from "../../apiClient";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  FaSearch, FaPhoneAlt, FaMapMarkerAlt, FaQrcode, FaTimes,
  FaUserFriends, FaFileExport, FaDownload, FaSpinner, FaArchive,
} from "react-icons/fa";
import styles from "./RegisteredRoster.module.css";
jsPDF.autoTable = autoTable;

export default function RegisteredRoster({
  attendees = [], dataFetching = false, regionScope = "All", userRole, setAttendees,
}) {
  const [searchTerm, setSearchTerm]           = useState("");
  const showArchived = false;
  const [selectedCenter, setSelectedCenter]   = useState("All");
  const [isProcessing, setIsProcessing]       = useState(false);
  const [selectedGender, setSelectedGender]   = useState("All");
  const [imageErrors, setImageErrors]         = useState({});
  const [isExporting, setIsExporting]         = useState(false);
  const [isDownloadingQR, setIsDownloadingQR] = useState(false);
  const [isDownloadingSingle, setIsDownloadingSingle] = useState(false);
  const [confirmAction, setConfirmAction]     = useState(null);
  const [activeQrModalUser, setActiveQrModalUser] = useState(null);
  const [isQrLoading, setIsQrLoading]         = useState(true);

  const centersList = ["All", ...new Set(attendees.map((a) => a.center).filter(Boolean))];

  const initiateArchive  = (attendee, shouldArchive) => setConfirmAction({ attendee, shouldArchive });
  const handleOpenQrModal = (user) => { setActiveQrModalUser(user); setIsQrLoading(true); };

  const executeArchive = async () => {
    if (!confirmAction) return;
    setIsProcessing(true);
    const { attendee, shouldArchive } = confirmAction;
    try {
      await attendeesApi.update(attendee._raw_id || parseInt(attendee.id, 10), { is_archived: shouldArchive });
      setAttendees((prev) => prev.filter((a) => a.id !== attendee.id));
      setConfirmAction(null);
    } catch (err) {
      console.error("Archive update failed:", err);
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
        const id   = attendee.member_id || attendee.id;
        const name = (attendee.name || "Attendee").replace(/\s+/g, "_");
        try {
          const dataUrl = await QRCode.toDataURL(String(id), { width: 300, margin: 2, color: { dark: "#000000", light: "#ffffff" } });
          const base64  = dataUrl.replace(/^data:image\/png;base64,/, "");
          folder.file(`${id}_${name}.png`, base64, { base64: true });
        } catch (qrErr) {
          console.error(`QR generation failed for ${id}:`, qrErr);
        }
      }
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `Batch_QR_${regionScope}_${new Date().toISOString().slice(0,10)}.zip`);
    } catch (error) {
      console.error("Batch download failed", error);
      alert("Failed to generate ZIP file. Please try again.");
    } finally {
      setIsDownloadingQR(false);
    }
  };

  const filteredAttendees = useMemo(() => {
    return attendees.filter((attendee) => {
      const nameSafe    = attendee.name?.toLowerCase() || "";
      const contactSafe = String(attendee.parent_contact || "");
      const idSafe      = String(attendee.member_id || "").toLowerCase();
      return (
        attendee.is_archived === showArchived &&
        (nameSafe.includes(searchTerm.toLowerCase()) || contactSafe.includes(searchTerm) || idSafe.includes(searchTerm.toLowerCase())) &&
        (selectedCenter === "All" || attendee.center === selectedCenter) &&
        (selectedGender === "All" || attendee.gender === selectedGender)
      );
    });
  }, [attendees, searchTerm, selectedCenter, selectedGender, showArchived]);

  const exportToCSV = () => {
    if (filteredAttendees.length === 0) { alert("No matched dataset found to extract."); return; }
    setIsExporting(true);
    try {
      const headers = ["Member ID","Full Name","Mandal","Age","Center Branch","Parent Contact"];
      const csvRows = [
        headers.join(","),
        ...filteredAttendees.map((row) => {
          const finalId      = row.member_id || row.id;
          const rawContact   = row.parent_contact || "";
          const finalContact = rawContact ? `\t${rawContact}` : "";
          return [
            `"${finalId}"`, `"${(row.name||"").replace(/"/g,'""')}"`,
            `"${row.gender||"Balak"}"`, `"${row.age}"`, `"${row.center}"`,
            `"${finalContact}"`,
          ].join(",");
        }),
      ];
      const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvRows.join("\n"));
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Roster_${(regionScope||"All").replace(/\s+/g,"_")}_${selectedGender||"Export"}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Export failed", error);
    } finally {
      setIsExporting(false);
    }
  };

  const downloadQRImg = async (memberId, userName, storedQrUrl) => {
    setIsDownloadingSingle(true);
    try {
      const url = storedQrUrl ||
        `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(memberId)}&color=000000&format=png&t=${Date.now()}`;
      const ext = storedQrUrl ? "svg" : "png";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Network response was not ok");
      const blob    = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `ID_${memberId}_${userName.replace(/\s+/g,"_")}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("QR download error:", err);
      alert("Failed to download QR code.");
    } finally {
      setIsDownloadingSingle(false);
    }
  };

  const getAvatarUrl = (photoPath) => {
    if (!photoPath) return null;
    if (photoPath.startsWith("http://") || photoPath.startsWith("https://")) {
      return `${photoPath.split("?")[0]}?t=${Date.now()}`;
    }
    return photoPath;
  };

  const getInitials  = (name) => name ? name.trim().charAt(0).toUpperCase() : "?";
  const handleImageError = (id) => setImageErrors((prev) => ({ ...prev, [id]: true }));

  const getGenderTagClass = (g) => {
    switch (g) {
      case "Balak":    return styles.tagBalak;
      case "Balika":   return styles.tagBalika;
      case "Shishu":   return styles.tagShishu;
      case "Shishika": return styles.tagShishika;
      default:         return styles.tagBalak;
    }
  };

  return (
    <div className={styles.rosterContainer}>
      <section className={styles.statsGrid}>
        <div className={styles.statCard}><div className={styles.statLabel}>Total Registered</div><p className={styles.statValue}>{filteredAttendees.length}</p></div>
        <div className={styles.statCard}><div className={styles.statLabel} style={{ color:"#2b6cb0" }}>Balak</div><p className={styles.statValue} style={{ color:"#2b6cb0" }}>{filteredAttendees.filter((a)=>a.gender==="Balak").length}</p></div>
        <div className={styles.statCard}><div className={styles.statLabel} style={{ color:"#c53030" }}>Balika</div><p className={styles.statValue} style={{ color:"#c53030" }}>{filteredAttendees.filter((a)=>a.gender==="Balika").length}</p></div>
        <div className={styles.statCard}><div className={styles.statLabel} style={{ color:"#319795" }}>Shishu</div><p className={styles.statValue} style={{ color:"#319795" }}>{filteredAttendees.filter((a)=>a.gender==="Shishu").length}</p></div>
        <div className={styles.statCard}><div className={styles.statLabel} style={{ color:"#b7791f" }}>Shishika</div><p className={styles.statValue} style={{ color:"#b7791f" }}>{filteredAttendees.filter((a)=>a.gender==="Shishika").length}</p></div>
      </section>

      <div className={styles.contentCard} style={{ marginBottom:"24px",padding:"20px" }}>
        <div className={styles.toolbarRow}>
          <div className={styles.searchWrapper}>
            <input type="text" placeholder="Search by name, ID or contacts..." className={styles.inputField} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <FaSearch className={styles.searchIcon} />
          </div>
          <div className={styles.filterGroup}>
            <div className={styles.filterSelectContainer}>
              <FaMapMarkerAlt style={{ color:"var(--accent-primary)" }} />
              <select value={selectedCenter} onChange={(e) => setSelectedCenter(e.target.value)} className={styles.selectDropdown}>
                {centersList.map((c) => <option key={c} value={c}>{c === "All" ? "All Center Branches" : c}</option>)}
              </select>
            </div>
            <div className={styles.filterSelectContainer}>
              <FaUserFriends style={{ color:"var(--accent-primary)" }} />
              <select value={selectedGender} onChange={(e) => setSelectedGender(e.target.value)} className={styles.selectDropdown}>
                <option value="All">All Mandals</option>
                <option value="Balak">Balak</option>
                <option value="Balika">Balika</option>
                <option value="Shishu">Shishu</option>
                <option value="Shishika">Shishika</option>
              </select>
            </div>
            <button onClick={exportToCSV} className={styles.exportBtn} disabled={isExporting}>
              {isExporting ? <FaSpinner className={styles.spin} /> : <FaFileExport />}
              {isExporting ? " Exporting..." : " Export to Excel"}
            </button>
            <button onClick={downloadBatchQR} className={styles.qrBtn} disabled={isDownloadingQR}>
              {isDownloadingQR ? <FaSpinner className={styles.spin} /> : <FaDownload />}
              {isDownloadingQR ? " Generating Zip..." : " Download All QR"}
            </button>
            <div className={styles.btnWrapper}>
              <span className={styles.comingSoonBadge}>Coming Soon</span>
              <button onClick={(e) => e.preventDefault()} className={`${styles.pdfBtn} ${styles.disabledBtn}`} disabled={true}>
                <FaFileExport />{" Export to PDF"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.contentCard}>
        {dataFetching ? (
          <div className={styles.tableMessageBlock}><FaSpinner className={`${styles.spin} ${styles.loaderSpinner}`} /><p style={{ marginTop:"12px" }}>Updating regional partition data view...</p></div>
        ) : filteredAttendees.length === 0 ? (
          <div className={styles.tableMessageBlock}><p>No attendees found matching <strong>{regionScope === "All" ? "All African Regions" : regionScope}</strong> selection grid.</p></div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Picture</th><th>Member ID</th><th>Full Name</th><th>Mandal</th>
                  <th>Age</th><th>Center</th><th>Parent Contact</th>
                  <th style={{ textAlign:"center" }}>Identity Pass</th>
                  {(userRole === "master_admin" || userRole === "super_admin") && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredAttendees.map((attendee) => {
                  const resolvedAvatarUrl = getAvatarUrl(attendee.photo_url);
                  const hasImageError     = imageErrors[attendee.id];
                  const systemIdCode      = attendee.member_id || `MTRC-${attendee.id}`;
                  const parentContactDisplay = attendee.parent_contact;
                  return (
                    <tr key={attendee.id}>
                      <td>
                        <div className={styles.avatarWrapper}>
                          {resolvedAvatarUrl && !hasImageError
                            ? <img src={resolvedAvatarUrl} alt="" crossOrigin="anonymous" className={styles.avatarImage} onError={() => handleImageError(attendee.id)} />
                            : <div className={styles.avatarFallback}>{getInitials(attendee.name)}</div>}
                        </div>
                      </td>
                      <td className={styles.monospaceText} style={{ fontWeight:"700",color:"var(--accent-primary)" }}>{systemIdCode}</td>
                      <td className={styles.boldText}>{attendee.name}</td>
                      <td><span className={`${styles.badgeGenderTag} ${getGenderTagClass(attendee.gender)}`}>{attendee.gender || "Balak"}</span></td>
                      <td>{attendee.age}</td>
                      <td><span className={styles.inlineIconFlex}><FaMapMarkerAlt className={styles.mutedIcon} /> {attendee.center}</span></td>
                      <td className={styles.monospaceText}>
                        {parentContactDisplay
                          ? <span className={styles.inlineIconFlex}><FaPhoneAlt className={styles.mutedIcon} /> {parentContactDisplay}</span>
                          : <span style={{ color:"var(--text-muted)",fontSize:"12px" }}>N/A</span>}
                      </td>
                      <td style={{ textAlign:"center" }}>
                        <button onClick={() => handleOpenQrModal(attendee)} className={styles.viewPassBtn}><FaQrcode style={{ fontSize:"13px" }} /> View QR</button>
                      </td>
                      <td style={{ textAlign:"center" }}>
                        {(userRole === "master_admin" || userRole === "super_admin" || userRole === "admin") && !attendee.is_archived && (
                          <button onClick={() => initiateArchive(attendee, true)} className={styles.archiveBtn} title="Archive Record"><FaArchive style={{ fontSize:"12px" }} /> Archive</button>
                        )}
                        {userRole === "master_admin" && attendee.is_archived && (
                          <button onClick={() => initiateArchive(attendee, false)} className={styles.actionBtn} style={{ color:"green" }}>Restore</button>
                        )}
                      </td>
                      {confirmAction && (
                        <div className={styles.modalOverlay} onClick={() => setConfirmAction(null)}>
                          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
                            <h3>Confirm {confirmAction.shouldArchive ? "Archive" : "Restore"}</h3>
                            <p>Are you sure you want to {confirmAction.shouldArchive ? "archive" : "restore"} <strong>{confirmAction.attendee.name}</strong>?</p>
                            <div style={{ display:"flex",gap:"10px",marginTop:"20px" }}>
                              <button onClick={() => setConfirmAction(null)} className={styles.cancelBtn}>Cancel</button>
                              <button onClick={executeArchive} className={styles.confirmBtn} disabled={isProcessing} style={{ backgroundColor: confirmAction.shouldArchive ? "#d97706" : "green", opacity: isProcessing ? 0.7 : 1, cursor: isProcessing ? "not-allowed" : "pointer", display:"flex",alignItems:"center",justifyContent:"center",gap:"8px" }}>
                                {isProcessing ? <><FaSpinner className={styles.spin} /> Processing...</> : confirmAction.shouldArchive ? "Confirm Archive" : "Confirm Restore"}
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

      {activeQrModalUser && (
        <div className={styles.modalOverlay} onClick={() => setActiveQrModalUser(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalCloseBtn} onClick={() => setActiveQrModalUser(null)}><FaTimes /></button>
            <h3 className={styles.modalTitle}>QR Code</h3>
            <p className={styles.modalSubtitle}>BAL-BALIKA SHIBIR 2026</p>
            <div className={styles.qrContainer}>
              {isQrLoading && <div className={styles.qrLoaderWrapper}><FaSpinner className={styles.spin} /><span className={styles.loaderText}>Loading QR...</span></div>}
              <img
                src={
                  activeQrModalUser?.qr_code_url ||
                  `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(activeQrModalUser?.member_id || activeQrModalUser?.id || "")}&color=000000`
                }
                alt="Verification Token Map"
                className={`${styles.qrImage} ${isQrLoading ? styles.hidden : ""}`}
                onLoad={() => setIsQrLoading(false)}
                onError={() => setIsQrLoading(false)}
              />
            </div>
            <div className={styles.modalInfoBox}>
              <div style={{ display:"flex",alignItems:"center",gap:"14px",marginBottom:"14px" }}>
                {getAvatarUrl(activeQrModalUser.photo_url) && !imageErrors[activeQrModalUser.id]
                  ? <img src={getAvatarUrl(activeQrModalUser.photo_url)} alt="" crossOrigin="anonymous" className={styles.modalAvatarImg} onError={() => handleImageError(activeQrModalUser.id)} />
                  : <div className={styles.modalAvatarFallback}>{getInitials(activeQrModalUser.name)}</div>}
                <div style={{ textAlign:"left" }}>
                  <div className={styles.modalAttendeeName}>{activeQrModalUser.name}</div>
                  <div style={{ fontSize:"12.5px",color:"var(--text-muted)",fontWeight:"500" }}>
                    Mandal: <span className={`${styles.badgeGenderTag} ${getGenderTagClass(activeQrModalUser.gender)}`} style={{ marginLeft:"4px" }}>{activeQrModalUser.gender || "Balak"}</span>
                  </div>
                </div>
              </div>
              <div className={styles.modalDataRow} style={{ borderTop:"1px dashed var(--border-light)",paddingTop:"10px" }}>
                <span>Center:</span><span style={{ color:"var(--text-main)",fontWeight:"600" }}>{activeQrModalUser.center}</span>
              </div>
              <div className={styles.modalDataRow}>
                <span>ID Number:</span>
                <span style={{ fontFamily:"monospace",color:"var(--accent-primary)",fontWeight:"700" }}>
                  {String(activeQrModalUser.member_id || activeQrModalUser.id || "").toUpperCase()}
                </span>
              </div>
            </div>
            <button onClick={() => downloadQRImg(activeQrModalUser.member_id || activeQrModalUser.id, activeQrModalUser.name, activeQrModalUser.qr_code_url)} className={styles.modalDownloadBtn} disabled={isDownloadingSingle}>
              {isDownloadingSingle ? <><FaSpinner className={styles.spin} /> Downloading...</> : <><FaDownload /> Download QR Code</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
