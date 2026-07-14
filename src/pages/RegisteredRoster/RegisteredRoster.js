import React, { useState, useMemo, useEffect } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import QRCode from "qrcode";
import { attendees as attendeesApi } from "../../apiClient";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast as hotToast } from "react-hot-toast";
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
  FaGlobe,
  // FaUserMinus,
  // FaUserCheck,
  FaCreditCard,
  FaMoneyBillWave,
} from "react-icons/fa";
import styles from "./RegisteredRoster.module.css";
import ArchiveConfirmModal from "../ArchiveConfirmModal/ArchiveConfirmModal";
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
  const [selectedRegion, setSelectedRegion] = useState("All");
  const [selectedGender, setSelectedGender] = useState("All");
  const [isExporting, setIsExporting] = useState(false);
  const [isDownloadingQR, setIsDownloadingQR] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [activeQrModalUser, setActiveQrModalUser] = useState(null);
  const [isQrLoading, setIsQrLoading] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAttendee, setEditingAttendee] = useState(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAttendee, setSelectedAttendee] = useState(null);
  const [paymentFilter, setPaymentFilter] = useState("All");

  // A. State variables go at the very top of the function hook block
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  // const [, setError] = useState(null);

  // B. First Memo calculates the base dataset filters
  // B. First Memo calculates the base dataset filters including your Payment Filter
  const filteredAttendees = useMemo(() => {
    return attendees.filter((attendee) => {
      const nameSafe = attendee.name?.toLowerCase() || "";
      const contactSafe = String(attendee.parent_contact || "");
      const idSafe = String(attendee.member_id || "").toLowerCase();

      // Check standard base filters (including your new region selection)
      const matchesBaseFilters =
        attendee.is_archived === showArchived &&
        (nameSafe.includes(searchTerm.toLowerCase()) ||
          contactSafe.includes(searchTerm) ||
          idSafe.includes(searchTerm.toLowerCase())) &&
        (selectedRegion === "All" ||
          attendee.region === selectedRegion ||
          attendee.country === selectedRegion) &&
        (selectedCenter === "All" || attendee.center === selectedCenter) &&
        (selectedGender === "All" || attendee.gender === selectedGender);

      // Check conditional payment criteria specifically for Kenya context values
      if (regionScope === "Kenya" && paymentFilter !== "All") {
        // If it's missing or null, treat it as 0 (not paid)
        const currentPaymentStatus = attendee.is_paid === 1 ? 1 : 0;
        return (
          matchesBaseFilters && String(currentPaymentStatus) === paymentFilter
        );
      }

      return matchesBaseFilters;
    });
  }, [
    attendees,
    searchTerm,
    selectedRegion, // Added to trigger re-computation when region changes
    selectedCenter,
    selectedGender,
    showArchived,
    regionScope,
    paymentFilter,
  ]);

  // C. Reset the active page layout index when filters change
  // C. Reset the active page layout index when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCenter, selectedGender, showArchived, paymentFilter]);

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
  // const apiFetch = async (url, options) => {
  //   const res = await fetch(url, options);
  //   if (!res.ok) {
  //     const errorData = await res.json().catch(() => ({}));
  //     throw new Error(errorData.message || "API Error");
  //   }
  //   return res.json();
  // };
  // Function updated to use member_id for the PATCH request
  // const handleToggleSelection = async (attendee, newSelectionStatus) => {
  //   setIsProcessing(true);
  //   setError(null);

  //   // Use the raw integer database ID (e.g., 299)
  //   const databaseId = attendee._raw_id || attendee.id;

  //   try {
  //     const payload = {
  //       is_selected: newSelectionStatus,
  //     };

  //     // ─── REMOVED "/routes" FROM THE ENDPOINT PATH ───
  //     await apiFetch(
  //       `https://api.riftkoders.com/mtrc/attendees/${databaseId}`,
  //       {
  //         method: "PATCH",
  //         headers: {
  //           "Content-Type": "application/json",
  //         },
  //         body: JSON.stringify(payload),
  //       },
  //     );

  //     // Update state locally
  //     setAttendees((prevAttendees) =>
  //       prevAttendees.map((item) =>
  //         item.id === attendee.id
  //           ? { ...item, is_selected: newSelectionStatus }
  //           : item,
  //       ),
  //     );

  //     setToast({
  //       show: true,
  //       type: "selection",
  //       message: `Successfully updated status for ${attendee.name}`,
  //     });

  //     setTimeout(() => setToast({ show: false, type: "", message: "" }), 4000);
  //   } catch (err) {
  //     console.error("--- SERVER ERROR DETECTED ---", err);
  //     setError(`Failed to update status: ${err.message}`);
  //   } finally {
  //     setIsProcessing(false);
  //   }
  // };
  const handleExecuteArchive = async (reason) => {
    setIsProcessing(true);
    const databaseId = selectedAttendee._raw_id || selectedAttendee.id;

    try {
      await fetch(`https://api.riftkoders.com/mtrc/attendees/${databaseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_archived: true,
          archive_reason: reason.trim(),
        }),
      });

      // Update parent dataset list array smoothly
      setAttendees((prev) =>
        prev.filter((item) => item.id !== selectedAttendee.id),
      );
      setIsModalOpen(false);
      setSelectedAttendee(null);
    } catch (err) {
      console.error("Archive request failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };
  const initiateArchive = (attendee) => {
    setSelectedAttendee(attendee);
    setIsModalOpen(true);
    setActiveDropdown(null);
  };
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
  const handleTogglePayment = async (attendee, nextStatus) => {
    try {
      // 1. Fire off the patch request to your API client layer
      await attendeesApi.update(attendee.id, { is_paid: Number(nextStatus) });

      // 2. React runtime local state sync
      setAttendees((prev) =>
        prev.map((item) =>
          item.id === attendee.id ? { ...item, is_paid: nextStatus } : item,
        ),
      );

      // 3. Mount confirmation feedback toast toast notification
      setToast({
        show: true,
        type: "success",
        message: `${attendee.name} has been marked as ${nextStatus === 1 ? "Paid" : "Not Paid"}.`,
      });

      setTimeout(() => setToast({ show: false, type: "", message: "" }), 3000);
    } catch (err) {
      console.error("Error patching payment status field attribute:", err);
      alert(
        "Failed to update payment status on server. Remember to whitelist 'is_paid' on your backend first!",
      );
    }
  };
  /* --- Core PDF Export Execution Logic --- */
const handleExportPDF = (
    includeContact = true,
    currentCountry = "All",
    currentCenter = "All",
    currentMandal = "All",
    generatedByName = "", // Fetched from active context data automatically
  ) => {
    // 1. Switched to Landscape ("landscape") to comfortably accommodate high columns
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const isSpecialRegion = [
      "Botswana",
      "South Africa",
      "Malawi",
      "Zambia",
      "Kenya",
      "Uganda",
    ].includes(regionScope);

    // Map short codes to full descriptions with measurements for Kenya & Uganda
    const SIZE_TO_CM_MAP = {
      "XXXS": "XXXS (57-62cm)",
      "XXS": "XXS (62-67cm)",
      "XS": "XS (67-72cm)",
      "S": "S (72-75cm)",
      "M": "M (77-82cm)",
      "L": "L (82-88cm)",
      "XL": "XL (88-93cm)",
      "XXL": "XXL (93-98cm)",
      "XXXL": "XXXL (98-103cm)"
    };

    // 2. Build Dynamic Headers Based on Selections
    const headersRow = [
      "Sr No.",
      "Member ID",
      "Full Name",
      "Mandal",
      "Age",
      "Country",
      "Center",
    ];
    if (includeContact) headersRow.push("Parent Contact");
    if (isSpecialRegion) headersRow.push("T-Shirt");
    const headers = [headersRow];

    // 3. Map Body Data Dynamically with Size Formatting
    const bodyData = filteredAttendees.map((a, index) => {
      const attendeeCountry = a.country || a.region || "Kenya";
      
      let displayTshirtSize = a.tshirt_size || "";
      if (isSpecialRegion && (attendeeCountry === "Kenya" || attendeeCountry === "Uganda")) {
        displayTshirtSize = SIZE_TO_CM_MAP[displayTshirtSize] || displayTshirtSize;
      }

      const baseRow = [
        String(index + 1),
        a.member_id || `MTRC-${a.id}`,
        a.name || "",
        a.gender || "Balak",
        a.age || "—",
        attendeeCountry,
        a.center || "",
      ];
      if (includeContact) {
        baseRow.push(a.parent_contact || "");
      }
      if (isSpecialRegion) {
        baseRow.push(displayTshirtSize);
      }
      return baseRow;
    });

    // 4. Custom Width Configuration Matrix tailored for Landscape (297mm)
    let columnWidthStyles = {};
    if (isSpecialRegion && includeContact) {
      columnWidthStyles = {
        0: { cellWidth: 15, halign: "center" },
        1: { cellWidth: 32, fontStyle: "bold" },
        2: { cellWidth: "auto" },
        3: { cellWidth: 20, halign: "center" },
        4: { cellWidth: 15, halign: "center" },
        5: { cellWidth: 30 },
        6: { cellWidth: 35 },
        7: { cellWidth: 35 },
        8: { cellWidth: 32, halign: "center" },
      };
    } else if (isSpecialRegion && !includeContact) {
      columnWidthStyles = {
        0: { cellWidth: 15, halign: "center" },
        1: { cellWidth: 35, fontStyle: "bold" },
        2: { cellWidth: "auto" },
        3: { cellWidth: 24, halign: "center" },
        4: { cellWidth: 18, halign: "center" },
        5: { cellWidth: 35 },
        6: { cellWidth: 40 },
        7: { cellWidth: 35, halign: "center" },
      };
    } else if (!isSpecialRegion && includeContact) {
      columnWidthStyles = {
        0: { cellWidth: 15, halign: "center" },
        1: { cellWidth: 35, fontStyle: "bold" },
        2: { cellWidth: "auto" },
        3: { cellWidth: 24, halign: "center" },
        4: { cellWidth: 18, halign: "center" },
        5: { cellWidth: 35 },
        6: { cellWidth: 40 },
        7: { cellWidth: 40 },
      };
    } else {
      // !isSpecialRegion && !includeContact
      columnWidthStyles = {
        0: { cellWidth: 15, halign: "center" },
        1: { cellWidth: 40, fontStyle: "bold" },
        2: { cellWidth: "auto" },
        3: { cellWidth: 26, halign: "center" },
        4: { cellWidth: 20, halign: "center" },
        5: { cellWidth: 40 },
        6: { cellWidth: 45 },
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
        fontSize: 8.5,
        font: "helvetica",
        cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
        overflow: "linebreak", // Wraps text fields onto secondary lines cleanly instead of breaking borders
        valign: "middle",
        lineColor: [226, 239, 249],
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: [42, 52, 107],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
      },
      columnStyles: columnWidthStyles,
      alternateRowStyles: {
        fillColor: [247, 251, 254],
      },
      margin: { top: 32, left: 10, right: 10 },

      didDrawPage: function (data) {
        doc.setFillColor(42, 52, 107);
        // Changed rect width to 297 to span full Landscape width
        doc.rect(0, 0, 297, 24, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text(
          "Making the Right Choices - Bal-Balika Shibir, Africa - 2026",
          12,
          11,
        );

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(214, 162, 101);
        const paymentLabel =
          paymentFilter === "1"
            ? "Paid Only"
            : paymentFilter === "0"
              ? "Not Paid Only"
              : "All";

        doc.text(
          `Attendee Roster  |  Filtered Country: ${currentCountry}  |  Center: ${currentCenter}  |  Mandal: ${currentMandal}  |  Payment Status: ${paymentLabel}`,
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

      // Footer auto-positioning dynamically adapted for landscape widths
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

    // Map short codes to full descriptions with measurements for Kenya & Uganda
    const SIZE_TO_CM_MAP = {
      "XXXS": "XXXS (57-62cm)",
      "XXS": "XXS (62-67cm)",
      "XS": "XS (67-72cm)",
      "S": "S (72-75cm)",
      "M": "M (77-82cm)",
      "L": "L (82-88cm)",
      "XL": "XL (88-93cm)",
      "XXL": "XXL (93-98cm)",
      "XXXL": "XXXL (98-103cm)"
    };

    try {
      const isSpecialRegion = [
        "Botswana",
        "South Africa",
        "Malawi",
        "Zambia",
        "Kenya",
        "Uganda",
      ].includes(regionScope);

      // Set dynamic headers based on contact inclusion rules
      const headers = [
        "Sr No.",
        "Member ID",
        "Full Name",
        "Mandal",
        "Age",
        "Country",
        "Center",
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
            // Apply physical measurements to size codes only for Kenya or Uganda
            const rawSize = row.tshirt_size || "";
            const formattedSize = (attendeeCountry === "Kenya" || attendeeCountry === "Uganda")
              ? (SIZE_TO_CM_MAP[rawSize] || rawSize)
              : rawSize;

            baseFields.push(`"${formattedSize}"`);
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
    // Set the specific member ID as the active loader
    setDownloadingId(memberId);
    try {
      const targetUrl =
        storedQrUrl ||
        `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(memberId)}&color=000000&format=png`;

      const safeFileName = `ID_${memberId}_${userName.trim().replace(/\s+/g, "_")}.png`;

      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 300;
          canvas.height = 300;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, 300, 300);

          const pngUrl = canvas.toDataURL("image/png");

          const link = document.createElement("a");
          link.href = pngUrl;
          link.download = safeFileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (canvasErr) {
          console.error("Canvas processing execution error:", canvasErr);
          window.open(targetUrl, "_blank");
        } finally {
          setDownloadingId(null); // Clear loading state on finish
        }
      };

      img.onerror = (err) => {
        console.error("Image loading resource track failed:", err);
        window.open(targetUrl, "_blank");
        setDownloadingId(null); // Clear loading state on error
      };

      img.src = targetUrl;
    } catch (err) {
      console.error("QR image pipeline structure error:", err);
      alert("Failed to build PNG conversion export.");
      setDownloadingId(null); // Clear loading state on total failure
    }
  };
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
      "Kenya",
      "Uganda",
    ].includes(attendeeCountry);

    // Determine if the current operator has Master Admin clearance
    const isMasterAdminClearance = userRole === "master_admin";

    setEditingAttendee({
      id: attendee.id, // Always locked in UI
      member_id: attendee.member_id || `MTRC-${attendee.id}`, // Always locked in UI
      first_name: fName,
      middle_name: mName,
      last_name: lName,
      email: loadedEmail,
      tshirt_size: attendee.tshirt_size || "",
      gender: attendee.gender || "Balak",
      age: attendee.age || "—",
      country: attendeeCountry,
      center: attendee.center || "",
      parent_contact: attendee.parent_contact || "",
      isSpecialRegion: isSpecialRegion,

      // ─── MASTER ADMIN OVERRIDE FLAG ───
      isEditableForMaster: isMasterAdminClearance,
    });

    setIsEditModalOpen(true);
  };
  /* -
  -- Save Changes to Database --- */
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editingAttendee) return;

    if (
      !editingAttendee.first_name?.trim() ||
      !editingAttendee.last_name?.trim()
    ) {
      hotToast.error("First Name and Last Name are required fields.");
      return;
    }

    setIsSavingProfile(true);
    try {
      const updatePayload = {
        first_name: editingAttendee.first_name,
        middle_name: editingAttendee.middle_name,
        last_name: editingAttendee.last_name,
        name: `${editingAttendee.first_name} ${editingAttendee.middle_name || ""} ${editingAttendee.last_name}`
          .replace(/\s+/g, " ")
          .trim(),
        email: editingAttendee.email || null,
        gender: editingAttendee.gender,
        age: editingAttendee.age,
        center: editingAttendee.center,
        parent_contact: editingAttendee.parent_contact,
        country: editingAttendee.country,
        tshirt_size: editingAttendee.tshirt_size || null,
      };

      await attendeesApi.update(editingAttendee.id, updatePayload);

      setAttendees((prev) =>
        prev.map((item) =>
          item.id === editingAttendee.id ? { ...item, ...updatePayload } : item,
        ),
      );

      setIsEditModalOpen(false);
      setEditingAttendee(null);

      hotToast.success("Profile changes committed successfully!");
    } catch (error) {
      console.error("Database Update Error:", error);
      hotToast.error(
        `Failed to save profile changes: ${error.message || "Server Error"}`,
      );
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
            {regionScope === "All" && (
              <div className={styles.filterSelectContainer}>
                <FaGlobe style={{ color: "var(--accent-primary)" }} />
                <select
                  value={selectedRegion}
                  onChange={(e) => {
                    setSelectedRegion(e.target.value);
                    setSelectedCenter("All"); // Reset center filter when region changes
                  }}
                  className={styles.selectDropdown}
                >
                  <option value="All">All Regions</option>
                  <option value="Kenya">Kenya</option>
                  <option value="Uganda">Uganda</option>
                  <option value="Botswana">Botswana</option>
                  <option value="South Africa">South Africa</option>
                  <option value="Malawi">Malawi</option>
                  <option value="Zambia">Zambia</option>
                </select>
              </div>
            )}
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

            {/* --- NEW KENYA-ONLY PAYMENT FILTER DROPDOWN --- */}
            {regionScope === "Kenya" && (
              <div className={styles.filterSelectContainer}>
                <FaMoneyBillWave style={{ color: "var(--accent-primary)" }} />
                <select
                  value={paymentFilter} // Make sure this state is defined in your parent component setup
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className={styles.selectDropdown}
                >
                  <option value="All">All Payments</option>
                  <option value="1">Paid Only</option>
                  <option value="0">Not Paid Only</option>
                </select>
              </div>
            )}

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
          <div
            className={styles.tableContainer}
            style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}
          >
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Member ID</th>
                  <th>Full Name</th>
                  <th>Mandal</th>
                  <th>Age</th>
                  <th>Center</th>
                  <th>Parent Contact</th>
                  {[
                    "Botswana",
                    "South Africa",
                    "Malawi",
                    "Zambia",
                    "Kenya",
                    "Uganda",
                  ].includes(regionScope) && <th>T-Shirt</th>}
                  {regionScope === "Tanzania" && <th>Selection Status</th>}
                  {regionScope === "Kenya" && <th>Payment Status</th>}
                  <th style={{ textAlign: "center" }}>QR</th>
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
                        "Kenya",
                        "Uganda",
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

                      {/* --- Tanzania Specific Column --- */}
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

                      {/* --- Kenya Specific Column --- */}
                      {regionScope === "Kenya" && (
                        <td>
                          {attendee.is_paid === 1 ? (
                            <span
                              className={styles.badgeGenderTag}
                              style={{
                                backgroundColor:
                                  "var(--success-light, #dcfce7)",
                                color: "var(--success-dark, #16a34a)",
                                fontWeight: "600",
                              }}
                            >
                              Paid
                            </span>
                          ) : (
                            <span
                              className={styles.badgeGenderTag}
                              style={{
                                backgroundColor: "var(--danger-light, #fee2e2)",
                                color: "var(--danger-dark, #dc2626)",
                                fontWeight: "600",
                              }}
                            >
                              Not Paid
                            </span>
                          )}
                        </td>
                      )}

                      <td style={{ textAlign: "center" }}>
                        <button
                          onClick={() => handleOpenQrModal(attendee)}
                          className={styles.viewPassBtn}
                        >
                          <FaQrcode style={{ fontSize: "13px" }} />
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
                              {/* --- Tanzania Selection Actions --- */}
                              {/* {regionScope === "Tanzania" &&
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

                                    {attendee.is_selected !== 0 &&
                                      attendee.is_selected !== null &&
                                      attendee.is_selected !== undefined && (
                                        <button
                                          onClick={() => {
                                            setActiveDropdown(null);
                                            handleToggleSelection(attendee, 0);
                                          }}
                                          className={styles.dropdownItem}
                                          style={{ color: "#64748b" }}
                                        >
                                          <FaSpinner
                                            style={{
                                              fontSize: "12px",
                                              marginRight: "6px",
                                            }}
                                          />{" "}
                                          Mark Pending
                                        </button>
                                      )}
                                  </>
                                )}*/}

                              {/* --- Kenya Payment Actions --- */}
                              {regionScope === "Kenya" &&
                                (userRole === "master_admin" ||
                                  userRole === "super_admin") && (
                                  <button
                                    onClick={() => {
                                      setActiveDropdown(null);
                                      const nextPaymentStatus =
                                        attendee.is_paid === 1 ? 0 : 1;
                                      handleTogglePayment(
                                        attendee,
                                        nextPaymentStatus,
                                      );
                                    }}
                                    className={styles.dropdownItem}
                                    style={{
                                      color:
                                        attendee.is_paid === 1
                                          ? "#dc2626"
                                          : "#16a34a",
                                    }}
                                  >
                                    {attendee.is_paid === 1 ? (
                                      <>
                                        <FaCreditCard
                                          style={{
                                            fontSize: "12px",
                                            marginRight: "6px",
                                          }}
                                        />{" "}
                                        Mark Not Paid
                                      </>
                                    ) : (
                                      <>
                                        <FaMoneyBillWave
                                          style={{
                                            fontSize: "12px",
                                            marginRight: "6px",
                                          }}
                                        />{" "}
                                        Mark Paid
                                      </>
                                    )}
                                  </button>
                                )}

                              {/* Only Admin can Edit Profile */}
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

                              {/* Archive Action */}
                              {(userRole === "master_admin" ||
                                userRole === "super_admin") &&
                                !attendee.is_archived && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveDropdown(null);
                                      initiateArchive(attendee);
                                    }}
                                    className={`${styles.dropdownItem} ${styles.archiveItem}`}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "8px",
                                      width: "100%",
                                      cursor: "pointer",
                                    }}
                                  >
                                    <FaArchive style={{ fontSize: "12px" }} />
                                    <span>Archive Record</span>
                                  </button>
                                )}

                              {/* Restore Action */}
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
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* UI Toast and Action Modals remain positioned underneath cleanly */}
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
                    {confirmAction.shouldArchive ? "archive" : "restore"}{" "}
                    <strong>{confirmAction.attendee.name}</strong>?
                    {confirmAction.shouldArchive
                      ? ""
                      : " This will place the record back into the primary active roster view."}
                  </p>

                  {confirmAction.shouldArchive && (
                    <div className={styles.archiveReasonFieldGroup}>
                      <label className={styles.archiveReasonLabel}>
                        Reason for Archiving{" "}
                        <span style={{ color: "#dc2626" }}>*</span>
                      </label>
                      <textarea
                        className={styles.archiveReasonInput}
                        placeholder="Provide a specific reason..."
                        value={confirmAction.archive_reason || ""}
                        onChange={(e) =>
                          setConfirmAction((prev) => ({
                            ...prev,
                            archive_reason: e.target.value,
                          }))
                        }
                        disabled={isProcessing}
                        rows={3}
                      />
                    </div>
                  )}

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
                      disabled={
                        isProcessing ||
                        (confirmAction.shouldArchive &&
                          !confirmAction.archive_reason?.trim())
                      }
                      style={{
                        backgroundColor: confirmAction.shouldArchive
                          ? "#d97706"
                          : "#16a34a",
                        opacity:
                          confirmAction.shouldArchive &&
                          !confirmAction.archive_reason?.trim()
                            ? "0.6"
                            : "1",
                        cursor:
                          confirmAction.shouldArchive &&
                          !confirmAction.archive_reason?.trim()
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      {isProcessing ? (
                        <>
                          <FaSpinner className={styles.spin} /> Processing...
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
          </div>
        )}
        <ArchiveConfirmModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConfirm={handleExecuteArchive}
          attendeeName={selectedAttendee?.name || ""}
          isProcessing={isProcessing}
        />
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
              onClick={() => {
                const targetId =
                  activeQrModalUser.member_id || activeQrModalUser.id;
                downloadQRImg(
                  targetId,
                  activeQrModalUser.name,
                  activeQrModalUser.qr_code_url,
                );
              }}
              className={styles.modalDownloadBtn}
              disabled={
                downloadingId ===
                (activeQrModalUser.member_id || activeQrModalUser.id)
              }
            >
              {downloadingId ===
              (activeQrModalUser.member_id || activeQrModalUser.id) ? (
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
              {/* Read-Only Fixed Structural System Elements — Permanently Locked */}
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
                  {localStorage.getItem("selected_shibir_region") === "Kenya" ||
                  localStorage.getItem("selected_shibir_region") === "Uganda" ||
                  editingAttendee?.region === "Kenya" ||
                  editingAttendee?.region === "Uganda" ? (
                    <select
                      value={editingAttendee?.tshirt_size || ""}
                      onChange={(e) =>
                        handleEditFieldChange("tshirt_size", e.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid #ccc",
                        backgroundColor: "#fff",
                        height: "38px",
                        fontSize: "14px",
                        color: "#333",
                        display: "block",
                      }}
                    >
                      <option value="">Select Size...</option>
                      <option value="XXXS">XXXS</option>
                      <option value="XXS">XXS</option>
                      <option value="XS">XS</option>
                      <option value="S">S</option>
                      <option value="M">M</option>
                      <option value="L">L</option>
                      <option value="XL">XL</option>
                      <option value="XXL">XXL</option>
                      <option value="XXXL">XXXL</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="e.g. M, L, XL"
                      value={editingAttendee?.tshirt_size || ""}
                      onChange={(e) =>
                        handleEditFieldChange("tshirt_size", e.target.value)
                      }
                    />
                  )}
                </div>         
                    </div>

              {/* Dynamic Restricted Metadata Sections — Unlocked ONLY for Master Admin */}
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
                    onChange={(e) =>
                      handleEditFieldChange("gender", e.target.value)
                    }
                    disabled={!editingAttendee.isEditableForMaster}
                    className={
                      !editingAttendee.isEditableForMaster
                        ? styles.disabledInput
                        : ""
                    }
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Age</label>
                  <input
                    type="text"
                    value={editingAttendee.age}
                    onChange={(e) =>
                      handleEditFieldChange("age", e.target.value)
                    }
                    disabled={!editingAttendee.isEditableForMaster}
                    className={
                      !editingAttendee.isEditableForMaster
                        ? styles.disabledInput
                        : ""
                    }
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Country </label>
                  <input
                    type="text"
                    value={editingAttendee.country}
                    onChange={(e) =>
                      handleEditFieldChange("country", e.target.value)
                    }
                    disabled={!editingAttendee.isEditableForMaster}
                    className={
                      !editingAttendee.isEditableForMaster
                        ? styles.disabledInput
                        : ""
                    }
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Center </label>
                  <input
                    type="text"
                    value={editingAttendee.center}
                    onChange={(e) =>
                      handleEditFieldChange("center", e.target.value)
                    }
                    disabled={!editingAttendee.isEditableForMaster}
                    className={
                      !editingAttendee.isEditableForMaster
                        ? styles.disabledInput
                        : ""
                    }
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Parent Contact </label>
                  <input
                    type="text"
                    value={editingAttendee.parent_contact}
                    onChange={(e) =>
                      handleEditFieldChange("parent_contact", e.target.value)
                    }
                    disabled={!editingAttendee.isEditableForMaster}
                    className={
                      !editingAttendee.isEditableForMaster
                        ? styles.disabledInput
                        : ""
                    }
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
