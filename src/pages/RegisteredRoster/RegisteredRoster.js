import React, { useState, useMemo, useEffect } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import QRCode from "qrcode";
import { attendees as attendeesApi } from "../../apiClient";
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
  FaEllipsisV,
  FaEdit,
  FaCheckCircle,
  FaUserMinus,
  FaUserCheck,
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedGender, setSelectedGender] = useState("All");
  const [isExporting, setIsExporting] = useState(false);
  const [isDownloadingQR, setIsDownloadingQR] = useState(false);
  const [isDownloadingSingle, setIsDownloadingSingle] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [activeQrModalUser, setActiveQrModalUser] = useState(null);
  const [isQrLoading, setIsQrLoading] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAttendee, setEditingAttendee] = useState(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  // A. State variables go at the very top of the function hook block
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [error, setError] = useState(null);

  // B. First Memo calculates the base dataset filters
  const filteredAttendees = useMemo(() => {
    return attendees.filter((attendee) => {
      const nameSafe = attendee.name?.toLowerCase() || "";
      const contactSafe = String(attendee.parent_contact || "");
      const idSafe = String(attendee.member_id || "").toLowerCase();
      return (
        attendee.is_archived === showArchived &&
        (nameSafe.includes(searchTerm.toLowerCase()) ||
          contactSafe.includes(searchTerm) ||
          idSafe.includes(searchTerm.toLowerCase())) &&
        (selectedCenter === "All" || attendee.center === selectedCenter) &&
        (selectedGender === "All" || attendee.gender === selectedGender)
      );
    });
  }, [attendees, searchTerm, selectedCenter, selectedGender, showArchived]);

  // C. Reset the active page layout index when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCenter, selectedGender, showArchived]);

  // D. Second Memo slices the filtered rows down into 25-row segments
  const paginatedAttendees = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredAttendees.slice(startIndex, endIndex);
  }, [filteredAttendees, currentPage]);

  // E. Compute total page layout limits
  const totalPages = Math.ceil(filteredAttendees.length / ITEMS_PER_PAGE);
  const centersList = [
    "All",
    ...new Set(attendees.map((a) => a.center).filter(Boolean)),
  ];
  const handleToggleSelection = async (attendee) => {
    setError(null);
    
    // 1. Target the raw database numeric primary key
    const targetId = attendee._raw_id || attendee.id;
    if (!targetId) {
      console.error("Missing valid numeric identifier for attendee:", attendee);
      return;
    }

    // 2. Cycle or toggle the is_selected state logic safely
    // If it's 0 or undefined, move to 1. If 1, move to 2. If 2, cycle back to 0.
    const currentVal = parseInt(attendee.is_selected || 0, 10);
    let nextVal = 1;
    if (currentVal === 1) nextVal = 2;
    if (currentVal === 2) nextVal = 0;

    try {
      // 3. Match payload keys precisely with the PHP whitelisted fields array
      const payload = {
        is_selected: nextVal
      };

      // Sending PATCH targeting the resource by its raw numeric ID path token
      await apiFetch(`https://api.riftkoders.com/mtrc/routes/attendees/${targetId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // 4. Optimistically update UI array state locally 
      setAttendees((prevAttendees) =>
        prevAttendees.map((item) =>
          item.id === attendee.id ? { ...item, is_selected: nextVal } : item
        )
      );
    } catch (err) {
      console.error("--- SERVER ERROR DETECTED ---", err);
      setError(`Error updating attendee status profile: ${err.message}`);
    }
  };
  const apiFetch = async (url, options) => {
  const res = await fetch(url, options);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'API Error');
  }
  return res.json();
};
  const initiateArchive = (attendee, shouldArchive) =>
    setConfirmAction({ attendee, shouldArchive });
  const handleOpenQrModal = (user) => {
    setActiveQrModalUser(user);
    setIsQrLoading(true);
  };

  const executeArchive = async () => {
    if (!confirmAction) return;
    setIsProcessing(true);
    // Inside your try block where executeArchive resolves successfully:
    const wasArchiving = confirmAction.shouldArchive;

    setConfirmAction(null);
    setToast({
      show: true,
      message: wasArchiving
        ? "Record archived successfully!"
        : "Record restored successfully!",
      type: wasArchiving ? "archive" : "restore",
    });

    // Auto-hide the success popup banner after 3 seconds
    setTimeout(() => {
      setToast({ show: false, message: "", type: "" });
    }, 3000);
    const { attendee, shouldArchive } = confirmAction;
    try {
      await attendeesApi.update(attendee._raw_id || parseInt(attendee.id, 10), {
        is_archived: shouldArchive,
      });
      setAttendees((prev) => prev.filter((a) => a.id !== attendee.id));
      setConfirmAction(null);
    } catch (err) {
      console.error("Archive update failed:", err);
      setConfirmAction(null);
    } finally {
      setIsProcessing(false);
    }
  };
  /* --- Open PDF Export Modal --- */
  const handleOpenPdfChoice = () => {
    if (filteredAttendees.length === 0) {
      alert("No data available to export based on current filters.");
      return;
    }
    setIsPdfModalOpen(true);
  };

  /* --- Core PDF Export Execution Logic --- */
  const handleExportPDF = (
    includeContact = true,
    currentCountry = "All",
    currentCenter = "All",
    currentMandal = "All",
    generatedByName = "", // Fetched from active context data automatically
  ) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const isSpecialRegion = [
      "Botswana",
      "South Africa",
      "Malawi",
      "Zambia",
    ].includes(regionScope);

    // 1. Build Dynamic Headers Based on Selections
    const headersRow = [
      "Sr No.",
      "Member ID",
      "Full Name",
      "Mandal",
      "Age",
      "Country",
      "Center Branch",
    ];
    if (includeContact) headersRow.push("Parent Contact");
    if (isSpecialRegion) headersRow.push("T-Shirt");
    const headers = [headersRow];

    // 2. Map Body Data Dynamically
    const bodyData = filteredAttendees.map((a, index) => {
      const baseRow = [
        String(index + 1),
        a.member_id || `MTRC-${a.id}`,
        a.name || "",
        a.gender || "Balak",
        a.age || "—",
        a.country || a.region || "Kenya",
        a.center || "",
      ];
      if (includeContact) {
        baseRow.push(a.parent_contact || "");
      }
      if (isSpecialRegion) {
        baseRow.push(a.tshirt_size || "");
      }
      return baseRow;
    });

    // 3. Dynamic Column Width Configuration Matrix
    let columnWidthStyles = {};
    if (isSpecialRegion && includeContact) {
      columnWidthStyles = {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 26, fontStyle: "bold" },
        2: { cellWidth: "auto" },
        3: { cellWidth: 14, halign: "center" },
        4: { cellWidth: 10, halign: "center" },
        5: { cellWidth: 20 },
        6: { cellWidth: 22 },
        7: { cellWidth: 24 },
        8: { cellWidth: 12, halign: "center" },
      };
    } else if (isSpecialRegion && !includeContact) {
      columnWidthStyles = {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 28, fontStyle: "bold" },
        2: { cellWidth: "auto" },
        3: { cellWidth: 16, halign: "center" },
        4: { cellWidth: 12, halign: "center" },
        5: { cellWidth: 26 },
        6: { cellWidth: 28 },
        7: { cellWidth: 16, halign: "center" },
      };
    } else if (!isSpecialRegion && includeContact) {
      columnWidthStyles = {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 28, fontStyle: "bold" },
        2: { cellWidth: "auto" },
        3: { cellWidth: 16, halign: "center" },
        4: { cellWidth: 12, halign: "center" },
        5: { cellWidth: 24 },
        6: { cellWidth: 26 },
        7: { cellWidth: 26 },
      };
    } else {
      // !isSpecialRegion && !includeContact
      columnWidthStyles = {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 32, fontStyle: "bold" },
        2: { cellWidth: "auto" },
        3: { cellWidth: 18, halign: "center" },
        4: { cellWidth: 14, halign: "center" },
        5: { cellWidth: 28 },
        6: { cellWidth: 32 },
      };
    }

    const exportTimestamp = new Date().toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    autoTable(doc, {
      startY: 32,
      head: headers,
      body: bodyData,
      theme: "striped",
      styles: {
        fontSize: 8,
        font: "helvetica",
        cellPadding: { top: 4, bottom: 4, left: 2, right: 2 },
        overflow: "visible",
        valign: "middle",
        lineColor: [226, 239, 249],
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: [42, 52, 107],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.5,
      },
      columnStyles: columnWidthStyles,
      alternateRowStyles: {
        fillColor: [247, 251, 254],
      },
      margin: { top: 32, left: 10, right: 10 },

      didDrawPage: function (data) {
        doc.setFillColor(42, 52, 107);
        doc.rect(0, 0, 210, 24, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text(
          "Making the Right Choices - Bal-Balika Shibir, Africa - 2026",
          12,
          11,
        );

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(214, 162, 101);
        doc.text(
          `Attendee Roster  |  Filtered Country: ${currentCountry}  |  Center: ${currentCenter}  |  Mandal: ${currentMandal}`,
          12,
          18,
        );
      },
    });

    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);

      doc.setFontSize(8);
      doc.setTextColor(42, 52, 107);
      doc.setFont("helvetica", "normal");

      doc.text(
        `Page ${i} of ${totalPages}`,
        10,
        doc.internal.pageSize.height - 10,
      );

      // Fallback display checks for naming strings
      const displayName = generatedByName || "Admin";
      const footerString = `System report generated by: ${displayName} on ${exportTimestamp}`;
      const textWidth = doc.getTextWidth(footerString);
      const rightXPosition = doc.internal.pageSize.width - 10 - textWidth;

      doc.text(footerString, rightXPosition, doc.internal.pageSize.height - 10);
    }

    const safeFileNameToken = String(currentCountry || "All").replace(
      /\s+/g,
      "_",
    );
    const contactToken = includeContact ? "" : "";
    doc.save(`${contactToken}Registered_${safeFileNameToken}.pdf`);
  };
  const downloadBatchQR = async () => {
    if (filteredAttendees.length === 0) return;
    setIsDownloadingQR(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder(`QR_Codes_${regionScope}`);
      for (const attendee of filteredAttendees) {
        const id = attendee.member_id || attendee.id;
        const name = (attendee.name || "Attendee").replace(/\s+/g, "_");
        try {
          const dataUrl = await QRCode.toDataURL(String(id), {
            width: 300,
            margin: 2,
            color: { dark: "#000000", light: "#ffffff" },
          });
          const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
          folder.file(`${id}_${name}.png`, base64, { base64: true });
        } catch (qrErr) {
          console.error(`QR generation failed for ${id}:`, qrErr);
        }
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

  /* --- Triggered by the main layout button --- */
  const handleOpenExportChoice = () => {
    if (filteredAttendees.length === 0) {
      alert("No matched dataset found to extract.");
      return;
    }
    setIsExportModalOpen(true);
  };

  /* --- The Core Export Logic Execution --- */
  const executeExport = (includeContact) => {
    setIsExporting(true);
    setIsExportModalOpen(false); // Close choice menu instantly

    try {
      const isSpecialRegion = [
        "Botswana",
        "South Africa",
        "Malawi",
        "Zambia",
      ].includes(regionScope);

      // Set dynamic headers based on contact inclusion rules
      const headers = [
        "Sr No.",
        "Member ID",
        "Full Name",
        "Mandal",
        "Age",
        "Country",
        "Center Branch",
      ];
      if (includeContact) {
        headers.push("Parent Contact");
      }
      if (isSpecialRegion) {
        headers.push("T-Shirt Size");
      }

      const csvRows = [
        headers.join(","),
        ...filteredAttendees.map((row, index) => {
          const finalId = row.member_id || row.id;
          const attendeeCountry =
            row.country ||
            row.region ||
            (regionScope !== "All" ? regionScope : "");

          const baseFields = [
            `"${index + 1}"`,
            `"${finalId}"`,
            `"${(row.name || "").replace(/"/g, '""')}"`,
            `"${row.gender || "Balak"}"`,
            `"${row.age}"`,
            `"${attendeeCountry}"`,
            `"${row.center}"`,
          ];

          // Conditional column payload injection
          if (includeContact) {
            const rawContact = row.parent_contact || "";
            const finalContact = rawContact ? `\t${rawContact}` : "";
            baseFields.push(`"${finalContact}"`);
          }

          if (isSpecialRegion) {
            baseFields.push(`"${row.tshirt_size || ""}"`);
          }

          return baseFields.join(",");
        }),
      ];

      const blob = new Blob([csvRows.join("\n")], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.setAttribute("href", url);
      const filenamePrefix = includeContact ? "" : "";
      link.setAttribute(
        "download",
        `${filenamePrefix}Registered_${(regionScope || "All").replace(/\s+/g, "_")}_${selectedGender || "Export"}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed", error);
    } finally {
      setIsExporting(false);
    }
  };
  const downloadQRImg = async (memberId, userName, storedQrUrl) => {
    setIsDownloadingSingle(true);
    try {
      const url =
        storedQrUrl ||
        `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(memberId)}&color=000000&format=png&t=${Date.now()}`;
      const ext = storedQrUrl ? "svg" : "png";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Network response was not ok");
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `ID_${memberId}_${userName.replace(/\s+/g, "_")}.${ext}`;
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
  /* --- Open Edit Modal & Populate Form Fields Dynamically --- */

  /* --- Update Field Values Inline --- */
  const handleEditFieldChange = (field, value) => {
    setEditingAttendee((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  /* --- Save Changes to Database using API Client --- */
  /* --- Open Edit Modal & Populate Form Fields Dynamically --- */
  /* --- Open Edit Modal & Populate Form Fields Dynamically --- */
  const handleEditProfile = (attendee) => {
    // Debug log to see exactly what properties exist on your attendee object
    console.log("Attendee properties received for editing:", attendee);

    let fName = attendee.first_name || "";
    let mName = attendee.middle_name || "";
    let lName = attendee.last_name || "";

    // Dynamic fallback parsing logic if explicit fields aren't present
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

    // Check alternative common property paths if attendee.email is returning empty
    const loadedEmail =
      attendee.email || attendee.email_address || attendee.parent_email || "";

    // Determine if the record belongs to the special region list
    const attendeeCountry = attendee.country || attendee.region || "Kenya";
    const isSpecialRegion = [
      "Botswana",
      "South Africa",
      "Malawi",
      "Zambia",
    ].includes(attendeeCountry);

    setEditingAttendee({
      id: attendee.id,
      member_id: attendee.member_id || `MTRC-${attendee.id}`,
      first_name: fName,
      middle_name: mName,
      last_name: lName,
      email: loadedEmail, // Uses the resolved fallback property string
      tshirt_size: attendee.tshirt_size || "",
      gender: attendee.gender || "Balak",
      age: attendee.age || "—",
      country: attendeeCountry,
      center: attendee.center || "",
      parent_contact: attendee.parent_contact || "",
      isSpecialRegion: isSpecialRegion,
    });

    setIsEditModalOpen(true);
  };
  /* --- Save Changes to Database --- */
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editingAttendee) return;

    setIsSavingProfile(true);
    try {
      const updatePayload = {
        first_name: editingAttendee.first_name,
        middle_name: editingAttendee.middle_name,
        last_name: editingAttendee.last_name,
        name: `${editingAttendee.first_name} ${editingAttendee.middle_name} ${editingAttendee.last_name}`
          .replace(/\s+/g, " ")
          .trim(),
        email: editingAttendee.email || null, // Saves clean null state to the database if left empty
      };

      // Append t-shirt parameters only if the attendee falls into the specific geographic list
      if (editingAttendee.isSpecialRegion) {
        updatePayload.tshirt_size = editingAttendee.tshirt_size || null;
      }

      await attendeesApi.update(editingAttendee.id, updatePayload);

      // Sync UI changes instantly down to the roster record list array
      setAttendees((prev) =>
        prev.map((item) =>
          item.id === editingAttendee.id
            ? {
                ...item,
                ...editingAttendee,
                name: updatePayload.name,
                email: updatePayload.email,
                ...(editingAttendee.isSpecialRegion && {
                  tshirt_size: updatePayload.tshirt_size,
                }),
              }
            : item,
        ),
      );

      setIsEditModalOpen(false);
      setEditingAttendee(null);
      alert("Profile changes committed successfully!");
    } catch (error) {
      console.error("Database Update Error:", error);
      alert(`Failed to save profile changes: ${error.message || error}`);
    } finally {
      setIsSavingProfile(false);
    }
  };
  const getGenderTagClass = (g) => {
    switch (g) {
      case "Balak":
        return styles.tagBalak;
      case "Balika":
        return styles.tagBalika;
      default:
        return styles.tagBalak;
    }
  };

  return (
    <div className={styles.rosterContainer}>
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
      </section>

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
                {centersList.map((c) => (
                  <option key={c} value={c}>
                    {c === "All" ? "All Center Branches" : c}
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
              </select>
            </div>
            {/* Primary Action Button */}
            <button
              onClick={handleOpenExportChoice}
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

            {/* Export Selection Modal Popup */}
            {isExportModalOpen && (
              <div className={styles.modalOverlay}>
                <div className={styles.exportModalContent}>
                  <h3>Export Data - Excel</h3>
                  <p>Please select an option below: </p>

                  <div className={styles.exportOptions}>
                    <button
                      onClick={() => executeExport(true)}
                      className={`${styles.choiceBtn} ${styles.primaryChoice}`}
                    >
                      <span className={styles.btnTitle}>
                        EXCEL - With Contact Numbers
                      </span>
                      <span className={styles.btnDesc}></span>
                    </button>

                    <button
                      onClick={() => executeExport(false)}
                      className={`${styles.choiceBtn} ${styles.secondaryChoice}`}
                    >
                      <span className={styles.btnTitle}>
                        EXCEL - Without Contact Numbers
                      </span>
                      <span className={styles.btnDesc}></span>
                    </button>
                  </div>

                  <div className={styles.modalActions}>
                    <button
                      onClick={() => setIsExportModalOpen(false)}
                      className={styles.cancelBtn}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
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
              {/* Primary PDF Action Button Trigger */}
              <button
                type="button"
                onClick={handleOpenPdfChoice}
                className={styles.pdfBtn}
              >
                <FaFileExport /> Export to PDF
              </button>

              {/* PDF Modal Selection View popup */}
              {isPdfModalOpen && (
                <div className={styles.modalOverlay}>
                  <div className={styles.exportModalContent}>
                    <h3>Export Data - PDF</h3>
                    <p>Please select an option below:</p>

                    <div className={styles.exportOptions}>
                      <button
                        onClick={() => {
                          handleExportPDF(
                            true,
                            regionScope || "All",
                            selectedCenter,
                            selectedGender,
                          );
                          setIsPdfModalOpen(false);
                        }}
                        className={`${styles.choiceBtn} ${styles.primaryChoice}`}
                      >
                        <span className={styles.btnTitle}>
                          PDF - With Contact Numbers
                        </span>
                        <span className={styles.btnDesc}></span>
                      </button>

                      <button
                        onClick={() => {
                          handleExportPDF(
                            false,
                            regionScope || "All",
                            selectedCenter,
                            selectedGender,
                          );
                          setIsPdfModalOpen(false);
                        }}
                        className={`${styles.choiceBtn} ${styles.secondaryChoice}`}
                      >
                        <span className={styles.btnTitle}>
                          PDF - Without Contact Numbers
                        </span>
                        <span className={styles.btnDesc}></span>
                      </button>
                    </div>

                    <div className={styles.modalActions}>
                      <button
                        onClick={() => setIsPdfModalOpen(false)}
                        className={styles.cancelBtn}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* --- Fixed 25-Record Pagination Footer Control --- */}
      {filteredAttendees.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px",
            borderTop: "1px solid #e2e8f0",
            backgroundColor: "#ffffff",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          {/* Record Metrics Counter */}
          <div style={{ color: "#475569", fontSize: "14px" }}>
            Showing{" "}
            <strong>
              {Math.min(
                (currentPage - 1) * ITEMS_PER_PAGE + 1,
                filteredAttendees.length,
              )}
            </strong>{" "}
            to{" "}
            <strong>
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredAttendees.length)}
            </strong>{" "}
            of <strong>{filteredAttendees.length}</strong> records
          </div>

          {/* Navigation Button Layout Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Previous Page Navigation */}
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                backgroundColor: currentPage === 1 ? "#f1f5f9" : "#ffffff",
                color: currentPage === 1 ? "#94a3b8" : "#334155",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.15s ease",
              }}
            >
              Previous
            </button>

            {/* Page Sequence Context Tracker */}
            <span style={{ fontSize: "14px", color: "#334155" }}>
              Page <strong>{currentPage}</strong> of{" "}
              <strong>{totalPages || 1}</strong>
            </span>

            {/* Next Page Navigation */}
            <button
              type="button"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages || totalPages === 0}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                backgroundColor:
                  currentPage === totalPages || totalPages === 0
                    ? "#f1f5f9"
                    : "#ffffff",
                color:
                  currentPage === totalPages || totalPages === 0
                    ? "#94a3b8"
                    : "#334155",
                cursor:
                  currentPage === totalPages || totalPages === 0
                    ? "not-allowed"
                    : "pointer",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.15s ease",
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
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
              No attendees found matching{" "}
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
                  <th>Member ID</th>
                  <th>Full Name</th>
                  <th>Mandal</th>
                  <th>Age</th>
                  <th>Center</th>
                  <th>Parent Contact</th>
                  {["Botswana", "South Africa", "Malawi", "Zambia"].includes(
                    regionScope,
                  ) && <th>T-Shirt</th>}

                  {/* Only show Selection Status column header for Tanzania */}
                  {regionScope === "Tanzania" && <th>Selection Status</th>}

                  <th style={{ textAlign: "center" }}>Identity Pass</th>
                  {(userRole === "master_admin" ||
                    userRole === "super_admin") && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {paginatedAttendees.map((attendee, index) => {
                  const systemIdCode =
                    attendee.member_id || `MTRC-${attendee.id}`;
                  const parentContactDisplay = attendee.parent_contact;
                  return (
                    <tr key={attendee.id}>
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
                      {[
                        "Botswana",
                        "South Africa",
                        "Malawi",
                        "Zambia",
                      ].includes(regionScope) && (
                        <td>
                          {attendee.tshirt_size ? (
                            <span className={styles.badgeGenderTag}>
                              {attendee.tshirt_size}
                            </span>
                          ) : (
                            <span
                              style={{
                                color: "var(--text-muted)",
                                fontSize: "12px",
                              }}
                            >
                              —
                            </span>
                          )}
                        </td>
                      )}

                      {/* --- Selection Status Badge Cell (0 = Pending, 1 = Selected, 2 = Not Selected) --- */}
                      {/* Only render Selection Status data cell for Tanzania */}
                      {regionScope === "Tanzania" && (
                        <td>
                          {attendee.is_selected === 1 ? (
                            <span
                              className={styles.badgeGenderTag}
                              style={{
                                backgroundColor:
                                  "var(--success-light, #dcfce7)",
                                color: "var(--success-dark, #16a34a)",
                                fontWeight: "600",
                              }}
                            >
                              Selected
                            </span>
                          ) : attendee.is_selected === 2 ? (
                            <span
                              className={styles.badgeGenderTag}
                              style={{
                                backgroundColor: "var(--danger-light, #fee2e2)",
                                color: "var(--danger-dark, #dc2626)",
                                fontWeight: "600",
                              }}
                            >
                              Not Selected
                            </span>
                          ) : (
                            <span
                              style={{
                                color: "var(--text-muted)",
                                fontSize: "12px",
                              }}
                            >
                              Pending
                            </span>
                          )}
                        </td>
                      )}

                      <td style={{ textAlign: "center" }}>
                        <button
                          onClick={() => handleOpenQrModal(attendee)}
                          className={styles.viewPassBtn}
                        >
                          <FaQrcode style={{ fontSize: "13px" }} /> View QR
                        </button>
                      </td>
                      <td style={{ textAlign: "center", position: "relative" }}>
                        {/* 3-Dots Trigger Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const currentId = String(attendee.id);
                            setActiveDropdown(
                              String(activeDropdown) === currentId
                                ? null
                                : attendee.id,
                            );
                          }}
                          className={styles.menuTriggerBtn}
                          title="Actions"
                        >
                          <FaEllipsisV style={{ fontSize: "14px" }} />
                        </button>

                        {/* Dropdown Action Menu */}
                        {String(activeDropdown) === String(attendee.id) && (
                          <>
                            <div
                              onClick={() => setActiveDropdown(null)}
                              style={{
                                position: "fixed",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                zIndex: 998,
                                background: "transparent",
                              }}
                            />
                            <div
                              className={styles.actionDropdown}
                              style={{
                                zIndex: 9999,
                                right: "100%",
                                top: "50%",
                                transform: "translateY(-50%)",
                                marginRight: "8px",
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* --- Selection Actions: ONLY accessible if region is TZ and user is authorized --- */}
                              {regionScope === "Tanzania" &&
                                (userRole === "master_admin" ||
                                  userRole === "super_admin") && (
                                  <>
                                    {attendee.is_selected !== 1 && (
                                      <button
                                        onClick={() => {
                                          setActiveDropdown(null);
                                          handleToggleSelection(attendee, 1);
                                        }}
                                        className={styles.dropdownItem}
                                        style={{ color: "#16a34a" }}
                                      >
                                        <FaUserCheck
                                          style={{
                                            fontSize: "12px",
                                            marginRight: "6px",
                                          }}
                                        />{" "}
                                        Mark Selected
                                      </button>
                                    )}

                                    {attendee.is_selected !== 2 && (
                                      <button
                                        onClick={() => {
                                          setActiveDropdown(null);
                                          handleToggleSelection(attendee, 2);
                                        }}
                                        className={styles.dropdownItem}
                                        style={{ color: "#dc2626" }}
                                      >
                                        <FaUserMinus
                                          style={{
                                            fontSize: "12px",
                                            marginRight: "6px",
                                          }}
                                        />{" "}
                                        Mark Not Selected
                                      </button>
                                    )}
                                  </>
                                )}

                              {/* Only Master Admin can Edit Profile */}
                              {(userRole === "master_admin" ||
                                userRole === "super_admin") && (
                                <button
                                  onClick={() => {
                                    setActiveDropdown(null);
                                    handleEditProfile(attendee);
                                  }}
                                  className={styles.dropdownItem}
                                >
                                  <FaEdit
                                    style={{
                                      fontSize: "12px",
                                      color: "#3b82f6",
                                    }}
                                  />{" "}
                                  Edit Profile
                                </button>
                              )}

                              {/* Conditional Archive Action */}
                              {(userRole === "master_admin" ||
                                userRole === "super_admin") &&
                                !attendee.is_archived && (
                                  <button
                                    onClick={() => {
                                      setActiveDropdown(null);
                                      initiateArchive(attendee, true);
                                    }}
                                    className={`${styles.dropdownItem} ${styles.archiveItem}`}
                                  >
                                    <FaArchive style={{ fontSize: "12px" }} />{" "}
                                    Archive Record
                                  </button>
                                )}

                              {/* Conditional Restore Action */}
                              {userRole === "master_admin" &&
                                attendee.is_archived && (
                                  <button
                                    onClick={() => {
                                      setActiveDropdown(null);
                                      initiateArchive(attendee, false);
                                    }}
                                    className={`${styles.dropdownItem} ${styles.restoreItem}`}
                                  >
                                    <FaArchive
                                      style={{
                                        fontSize: "12px",
                                        transform: "rotate(180deg)",
                                      }}
                                    />{" "}
                                    Restore Record
                                  </button>
                                )}
                            </div>
                          </>
                        )}
                      </td>
                      {toast.show && (
                        <div
                          className={`${styles.toastNotification} ${toast.type === "archive" ? styles.toastArchive : styles.toastRestore}`}
                        >
                          <FaCheckCircle className={styles.toastIcon} />
                          <span>{toast.message}</span>
                        </div>
                      )}

                      {confirmAction && (
                        <div
                          className={styles.modalOverlay2}
                          onClick={() => setConfirmAction(null)}
                        >
                          <div
                            className={styles.modalCard2}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div
                              className={styles.modalIconHeader2}
                              style={{
                                backgroundColor: confirmAction.shouldArchive
                                  ? "#fef3c7"
                                  : "#dcfce7",
                                color: confirmAction.shouldArchive
                                  ? "#d97706"
                                  : "#16a34a",
                              }}
                            >
                              <FaArchive
                                size={24}
                                style={{
                                  transform: confirmAction.shouldArchive
                                    ? "none"
                                    : "rotate(180deg)",
                                }}
                              />
                            </div>

                            <h3 className={styles.modalTitle2}>
                              {confirmAction.shouldArchive
                                ? "Archive Record?"
                                : "Restore Record?"}
                            </h3>
                            <p className={styles.modalDescription2}>
                              Are you sure you want to{" "}
                              {confirmAction.shouldArchive
                                ? "archive"
                                : "restore"}{" "}
                              <strong>{confirmAction.attendee.name}</strong>?
                              {confirmAction.shouldArchive
                                ? " "
                                : " This will place the record back into the primary active roster view."}
                            </p>

                            <div className={styles.modalActionGroup2}>
                              <button
                                type="button"
                                onClick={() => setConfirmAction(null)}
                                className={styles.cancelBtn}
                                disabled={isProcessing}
                              >
                                Cancel
                              </button>

                              <button
                                type="button"
                                onClick={executeArchive}
                                className={styles.confirmBtn}
                                disabled={isProcessing}
                                style={{
                                  backgroundColor: confirmAction.shouldArchive
                                    ? "#d97706"
                                    : "#16a34a",
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
                })}{" "}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
              className={styles.modalCloseBtn1}
              onClick={() => setActiveQrModalUser(null)}
            >
              <FaTimes />
            </button>
            <h3 className={styles.modalTitle}>QR Code</h3>
            <p className={styles.modalSubtitle}>BAL-BALIKA SHIBIR 2026</p>
            <div className={styles.qrContainer}>
              {isQrLoading && (
                <div className={styles.qrLoaderWrapper}>
                  <FaSpinner className={styles.spin} />
                  <span className={styles.loaderText}>Loading QR...</span>
                </div>
              )}
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  marginBottom: "14px",
                }}
              >
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
                    activeQrModalUser.member_id || activeQrModalUser.id || "",
                  ).toUpperCase()}
                </span>
              </div>
            </div>
            <button
              onClick={() =>
                downloadQRImg(
                  activeQrModalUser.member_id || activeQrModalUser.id,
                  activeQrModalUser.name,
                  activeQrModalUser.qr_code_url,
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
      {/* --- Profile Edit Modal Layer --- */}
      {isEditModalOpen && editingAttendee && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Edit Profile Records</h3>
              <button
                className={styles.modalCloseBtn}
                onClick={() => setIsEditModalOpen(false)}
                disabled={isSavingProfile}
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className={styles.modalForm}>
              {/* Read-Only Fixed Structural System Elements */}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Database Row ID </label>
                  <input
                    type="text"
                    value={editingAttendee.id}
                    disabled
                    className={styles.disabledInput}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Member Identification Token </label>
                  <input
                    type="text"
                    value={editingAttendee.member_id}
                    disabled
                    className={styles.disabledInput}
                  />
                </div>
              </div>

              {/* Mutable Independent Name Segments */}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>First Name</label>
                  <input
                    type="text"
                    required
                    value={editingAttendee.first_name}
                    onChange={(e) =>
                      handleEditFieldChange("first_name", e.target.value)
                    }
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Middle Name</label>
                  <input
                    type="text"
                    value={editingAttendee.middle_name}
                    onChange={(e) =>
                      handleEditFieldChange("middle_name", e.target.value)
                    }
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Last Name</label>
                  <input
                    type="text"
                    required
                    value={editingAttendee.last_name}
                    onChange={(e) =>
                      handleEditFieldChange("last_name", e.target.value)
                    }
                  />
                </div>
              </div>

              {/* Editable Email and Apparel Configuration */}
              <div className={styles.formRow}>
                <div className={styles.formGroup} style={{ flex: 2 }}>
                  <label>Email Address</label>
                  <input
                    type="email"
                    placeholder="name@domain.com"
                    value={editingAttendee.email}
                    onChange={(e) =>
                      handleEditFieldChange("email", e.target.value)
                    }
                  />
                </div>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label>T-Shirt Size</label>
                  <input
                    type="text"
                    placeholder="e.g. M, L, XL"
                    value={editingAttendee.tshirt_size}
                    onChange={(e) =>
                      handleEditFieldChange("tshirt_size", e.target.value)
                    }
                  />
                </div>
              </div>

              {/* Read Only Restricted Metadata Reference Sections */}
              <hr
                style={{
                  border: "0",
                  borderTop: "1px dashed #e2e8f0",
                  margin: "8px 0",
                }}
              />

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Mandal</label>
                  <input
                    type="text"
                    value={editingAttendee.gender}
                    disabled
                    className={styles.disabledInput}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Age</label>
                  <input
                    type="text"
                    value={editingAttendee.age}
                    disabled
                    className={styles.disabledInput}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Country </label>
                  <input
                    type="text"
                    value={editingAttendee.country}
                    disabled
                    className={styles.disabledInput}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Center </label>
                  <input
                    type="text"
                    value={editingAttendee.center}
                    disabled
                    className={styles.disabledInput}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Parent Contact </label>
                  <input
                    type="text"
                    value={editingAttendee.parent_contact}
                    disabled
                    className={styles.disabledInput}
                  />
                </div>
              </div>

              {/* Action Panel Confirmation Controls */}
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSavingProfile}
                >
                  Cancel Changes
                </button>
                <button
                  type="submit"
                  className={styles.saveBtn}
                  disabled={isSavingProfile}
                >
                  {isSavingProfile ? (
                    <>
                      <FaSpinner className={styles.spinner} /> Processing
                      Save...
                    </>
                  ) : (
                    "Save New Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
