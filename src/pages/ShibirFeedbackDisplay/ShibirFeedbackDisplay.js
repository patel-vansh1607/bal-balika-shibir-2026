import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  FaMagnifyingGlass,
  FaTrash,
  FaChevronDown,
  FaFilter,
  FaLock,
  FaEye,
  FaFileCsv,
  FaXmark,
  FaStar,
  FaVideo,
  FaDownload,
  FaCalendar,
  FaLocationDot,
  FaBuilding,
  FaImage,
  FaArrowUpRightFromSquare,
} from "react-icons/fa6";
import { feedback as feedbackApi, karayakars as karayakarsApi, attendees as attendeesApi } from "../../apiClient";
import styles from "./ShibirFeedbackDisplay.module.css";
import { useAuth } from "../../context/AuthContext";

// LOCAL ASSETS
import logo from "../../assets/images/Making the Right Choices - Logo_ColorScalable.svg";

// Helper function to strip region prefixes (e.g., "_3xl_South", "3xl_North")
const cleanRegion = (rawRegion) => {
  if (!rawRegion || typeof rawRegion !== "string") return "";
  
  const sanitized = rawRegion.trim().replace(/^(_?\d*[a-zA-Z0-9]+_|_)/, "");
  
  if (!sanitized) return rawRegion.trim();
  return sanitized.charAt(0).toUpperCase() + sanitized.slice(1);
};

// Distinct solid/dark theme color scheme for country badges
const getCountryBadgeStyle = (countryName) => {
  if (!countryName) return { background: "#334155", color: "#ffffff" };
  
  const colorSchemes = [
    { bg: "#0f172a", text: "#f8fafc" },
    { bg: "#1e3a8a", text: "#e0f2fe" },
    { bg: "#14532d", text: "#dcfce7" },
    { bg: "#581c87", text: "#fae8ff" },
    { bg: "#7c2d12", text: "#ffedd5" },
    { bg: "#831843", text: "#fce7f3" },
    { bg: "#134e4a", text: "#ccfbf1" },
  ];

  let hash = 0;
  for (let i = 0; i < countryName.length; i++) {
    hash = countryName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colorSchemes.length;
  return colorSchemes[index];
};

const getDriveFileId = (url) => {
  if (!url) return null;
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
};

const parsePhotos = (raw) => {
  if (!raw) return [];
  try {
    const p = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(p) ? p : [];
  } catch { return []; }
};

// POPUP MODAL COMPONENT (FULL DETAILS VIEW)
const FeedbackModal = ({ isOpen, onClose, data }) => {
  if (!isOpen || !data) return null;

  const driveFileId = getDriveFileId(data.video_url);
  const photos = parsePhotos(data.photo_urls);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContentLarge} onClick={(e) => e.stopPropagation()}>
        {/* Top Header Bar */}
        <div className={styles.modalHeader}>
          <h3>Details</h3>
          <button onClick={onClose} className={styles.closeBtn}>
            <FaXmark />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className={styles.modalBodyScrollable}>
          {/* Header Card Profile Info */}
          <div className={styles.modalHeaderCard}>
            <div className={styles.userInfoGroup}>
              <div className={styles.avatarPlaceholder}>
                <img
                  src="https://res.cloudinary.com/dxgkcyfrl/image/upload/v1782202338/MTRC_NEW_Color_c3d3z1.svg"
                  alt="Submitter profile"
                  style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                />
              </div>
              <div>
                <h2 className={styles.userName}>{data.full_name || "Anonymous Submitter"}</h2>
                <div className={styles.metaSubRow}>
                  <span><FaBuilding /> {data.center || "N/A"}</span>
                  <span>•</span>
                  <span><FaLocationDot /> {data.country || "N/A"}</span>
                </div>
              </div>
            </div>

            <div className={styles.ratingBox}>
              <div className={styles.ratingStars}>
                {[...Array(5)].map((_, i) => (
                  <FaStar
                    key={i}
                    style={{
                      color: i < Number(data.rating || 0) ? "#f59e0b" : "#cbd5e1",
                      fontSize: "18px",
                    }}
                  />
                ))}
              </div>
              <span className={styles.ratingNumber}>{Number(data.rating || 0).toFixed(1)} / 5.0 Stars</span>
              <span className={styles.dateSubmitted}>
                <FaCalendar /> {new Date(data.created_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>

          {/* Full Feedback Response */}
          <div className={styles.cardSection}>
            <h3>Full Feedback Response</h3>
            <div className={styles.feedbackBody}>
              {data.response ? (
                <p>{data.response}</p>
              ) : (
                <p className={styles.noDataText}>No text feedback provided.</p>
              )}
            </div>
          </div>

          {/* Uploaded Photos Section */}
          <div className={styles.cardSection}>
            <div className={styles.videoSectionHeader}>
              <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FaImage /> Uploaded Photos ({photos.length})
              </h3>
            </div>

            {photos.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "12px" }}>
                {photos.map((rawUrl, i) => {
                  const pFileId = getDriveFileId(rawUrl);
                  const previewUrl = pFileId ? `https://drive.google.com/file/d/${pFileId}/preview` : rawUrl;
                  const originalDriveUrl = pFileId ? `https://drive.google.com/file/d/${pFileId}/view` : rawUrl;

                  return (
                    <div
                      key={i}
                      style={{
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "10px",
                        overflow: "hidden",
                        padding: "12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#334155" }}>
                          Photo {i + 1} of {photos.length}
                        </span>
                        <a
                          href={originalDriveUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontSize: "0.8rem",
                            color: "#f59e0b",
                            textDecoration: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            fontWeight: "500"
                          }}
                        >
                          <FaArrowUpRightFromSquare /> Open Original in Drive
                        </a>
                      </div>

                      {pFileId ? (
                        <div className={styles.videoWrapper} style={{ height: "350px" }}>
                          <iframe
                            src={previewUrl}
                            className={styles.videoPlayer}
                            allow="autoplay; encrypted-media"
                            allowFullScreen
                            title={`Submission item ${i + 1}`}
                          />
                        </div>
                      ) : (
                        <div style={{ width: "100%", background: "#0f172a", borderRadius: "8px", overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "center", minHeight: "250px" }}>
                          <img
                            src={rawUrl}
                            alt={`Submission item ${i + 1}`}
                            style={{ width: "100%", maxHeight: "400px", objectFit: "contain", display: "block" }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.noVideoBox}>
                <FaImage style={{ fontSize: "28px", color: "#9aa0a6", marginBottom: "6px" }} />
                <p>No photos attached to this submission.</p>
              </div>
            )}
          </div>

          {/* Video Interview Section */}
          <div className={styles.cardSection}>
            <div className={styles.videoSectionHeader}>
              <h3>Video Interview</h3>
              {data.video_url && driveFileId && (
                <div className={styles.videoActions}>
                  <a
                    href={`https://drive.google.com/uc?export=download&id=${driveFileId}`}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.downloadBtn}
                  >
                    <FaDownload /> Download Video
                  </a>
                  <a
                    href={data.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.openDriveBtn}
                  >
                    Open in Drive
                  </a>
                </div>
              )}
            </div>

            {data.video_url && driveFileId ? (
              <div className={styles.videoWrapper} style={{ height: "350px" }}>
                <iframe
                  src={`https://drive.google.com/file/d/${driveFileId}/preview`}
                  className={styles.videoPlayer}
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  title="Video Interview"
                />
              </div>
            ) : (
              <div className={styles.noVideoBox}>
                <FaVideo style={{ fontSize: "28px", color: "#9aa0a6", marginBottom: "6px" }} />
                <p>No video interview attached to this submission.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ShibirFeedbackDisplay({ regionScope = "all" }) {
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // MODAL STATE
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isGlobalScope = !regionScope || regionScope.toLowerCase() === "all";

  // Region & Country & Division Filters
  const cleanScope = isGlobalScope ? "ALL" : cleanRegion(regionScope);
  const [selectedRegion, setSelectedRegion] = useState(cleanScope || "ALL");
  const [countryFilter, setCountryFilter] = useState("ALL");
  const [divisionFilter, setDivisionFilter] = useState("ALL");
  
  const { userRole } = useAuth();
  const isRegionLocked = !isGlobalScope;

  useEffect(() => {
    setSelectedRegion(isGlobalScope ? "ALL" : (cleanRegion(regionScope) || "ALL"));
  }, [regionScope, isGlobalScope]);

  const getIsFemaleKaryakar = (karyakar) => {
    if (!karyakar.seva_designation) return false;
    const designations =
      typeof karyakar.seva_designation === "string"
        ? karyakar.seva_designation.split(", ")
        : Array.isArray(karyakar.seva_designation)
        ? karyakar.seva_designation
        : [];

    return designations.some((role) => {
      const r = role.toUpperCase().trim();
      return (
        r === "I-NC" ||
        r === "I-NOC" ||
        r === "I-RC" ||
        r.includes("SHISHIKA") ||
        r.includes("BALIKA") ||
        r === "BST SANCHALIKA" ||
        r === "BST SAH-SANCHALIKA" ||
        r === "BST BALIKA IC" ||
        r === "BALIKA SANSKAR SANCHALIKA" ||
        r === "BALIKA SANSKAR SAH SANCHALIKA" ||
        r === "BALIKA SANSKAR IC" ||
        r === "IKST SANCHALIKA" ||
        r === "I-ADMIN" ||
        r === "I-IT TEAM" ||
        r.includes("IKST")
      );
    });
  };

  const getCategoryBadgeDetails = useCallback((item) => {
    const cat = (item.category || item.type || "").toLowerCase();
    const gender = (item.gender || item.sex || "").toLowerCase();
    const designation = (item.seva_designation || "").toLowerCase();

    if (cat.includes("karyakar") || designation) {
      const isFemale = getIsFemaleKaryakar(item) || gender.includes("balika") || gender.includes("f") || gender.includes("female");
      return isFemale 
        ? { typeKey: "KARYAKAR_FEMALE", label: "Karyakar (Female)" }
        : { typeKey: "KARYAKAR_MALE", label: "Karyakar (Male)" };
    }

    if (gender.includes("balika") || gender === "f" || gender === "female") {
      return { typeKey: "BALIKA", label: "Balika" };
    }

    return { typeKey: "BALAK", label: "Balak" };
  }, []);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const [feedbackRes, membersRes, attendeesRes] = await Promise.all([
        feedbackApi.list(),
        karayakarsApi.list ? karayakarsApi.list() : Promise.resolve({ data: [] }),
        attendeesApi?.list ? attendeesApi.list() : Promise.resolve({ data: [] })
      ]);

      const rawFeedback = feedbackRes?.data || [];
      const members = membersRes?.data || [];
      const attendees = attendeesRes?.data || [];

      const memberMap = new Map();
      members.forEach((m) => {
        if (m.full_name || m.name) {
          const cleanName = (m.full_name || m.name).trim().toLowerCase().replace(/\s+/g, ' ');
          memberMap.set(cleanName, m);
        }
      });

      const attendeeMap = new Map();
      attendees.forEach((a) => {
        const attendeeName = a.full_name || a.name;
        if (attendeeName) {
          const cleanName = attendeeName.trim().toLowerCase().replace(/\s+/g, ' ');
          attendeeMap.set(cleanName, {
            ...a,
            gender: a.gender || "Balak"
          });
        }
      });

      const formattedData = rawFeedback.map(item => {
        const itemCleanName = (item.full_name || "").trim().toLowerCase().replace(/\s+/g, ' ');
        const matchedMember = memberMap.get(itemCleanName) || {};
        const matchedAttendee = attendeeMap.get(itemCleanName) || {};

        const tempItem = {
          ...item,
          gender: item.gender || matchedAttendee.gender || matchedMember.gender || matchedAttendee.sex || matchedMember.sex || "",
          category: item.category || matchedMember.category || matchedAttendee.category || matchedMember.type || matchedAttendee.type || (matchedMember.seva_designation ? "Karyakar" : ""),
          seva_designation: item.seva_designation || matchedMember.seva_designation || "",
          normalizedRegion: cleanRegion(item.region || item.zone || item.area || matchedAttendee.region || matchedMember.region || "")
        };

        const badgeInfo = getCategoryBadgeDetails(tempItem);

        return {
          ...tempItem,
          divisionTypeKey: badgeInfo.typeKey,
          divisionLabel: badgeInfo.label
        };
      });

      setFeedbackList(formattedData);
    } catch (err) {
      console.error("Error fetching feedback:", err);
      alert("Failed to load feedback records: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [getCategoryBadgeDetails]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this response?")) return;

    try {
      await feedbackApi.remove(id);
      setFeedbackList((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Error deleting feedback:", err);
      alert("Failed to delete record: " + err.message);
    }
  };

  const uniqueRegions = useMemo(() => {
    const set = new Set();
    feedbackList.forEach((item) => {
      if (item.normalizedRegion) {
        set.add(item.normalizedRegion);
      }
    });
    return Array.from(set).sort();
  }, [feedbackList]);

  const uniqueCountries = useMemo(() => {
    const subset = selectedRegion === "ALL" 
      ? feedbackList 
      : feedbackList.filter(item => item.normalizedRegion?.toLowerCase() === selectedRegion.toLowerCase());
    
    return [...new Set(subset.map((item) => item.country).filter(Boolean))].sort();
  }, [feedbackList, selectedRegion]);

  const filteredData = feedbackList.filter((item) => {
    const matchesRegion =
      selectedRegion === "ALL" || 
      item.normalizedRegion?.toLowerCase() === selectedRegion.toLowerCase();

    const matchesSearch =
      item.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.center?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.response?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCountry =
      countryFilter === "ALL" || item.country === countryFilter;

    const matchesDivision =
      divisionFilter === "ALL" || item.divisionTypeKey === divisionFilter;

    return matchesRegion && matchesSearch && matchesCountry && matchesDivision;
  });

  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      alert("No data available to export.");
      return;
    }

    const headers = [
      "S/N",
      "Submission Date",
      "Full Name",
      "Division",
      "Center",
      "Country",
      "Region",
      "Rating (1-5)",
      "Feedback Response"
    ];

    const rows = filteredData.map((item, idx) => [
      idx + 1,
      new Date(item.created_at).toLocaleDateString(),
      `"${(item.full_name || "").replace(/"/g, '""')}"`,
      `"${(item.divisionLabel || "").replace(/"/g, '""')}"`,
      `"${(item.center || "").replace(/"/g, '""')}"`,
      `"${(item.country || "").replace(/"/g, '""')}"`,
      `"${(item.normalizedRegion || "").replace(/"/g, '""')}"`,
      item.rating || "",
      `"${(item.response || "").replace(/"/g, '""').replace(/\n/g, " ")}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    const filePrefix = selectedRegion !== "ALL" ? selectedRegion : "All_Regions";
    link.setAttribute("download", `Shibir_Feedback_${filePrefix}_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalSubmissions = filteredData.length;
  const avgRating =
    totalSubmissions > 0
      ? (
          filteredData.reduce((acc, curr) => acc + Number(curr.rating || 0), 0) /
          totalSubmissions
        ).toFixed(1)
      : "0.0";

  return (
    <div className={styles.wrapper}>
      {/* POPUP MODAL WITH FULL DETAILS */}
      <FeedbackModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        data={selectedItem} 
      />

      <div className={styles.card}>
        <div className={styles.headerGroup} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div className={styles.logoAndTitleInline}>
            <img
              src={logo}
              alt="Shibir Logo"
              className={styles.logoInline}
            />
            <div className={styles.titleTextGroup}>
              <h2 className={styles.title}>Feedback Dashboard</h2>
              <p className={styles.titleSubtext}>Bal-Balika Shibir, Africa - 2026</p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <button
              onClick={handleExportCSV}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "#0284c7",
                color: "#ffffff",
                border: "none",
                padding: "9px 16px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                transition: "background 0.2s"
              }}
              title="Download current table list as CSV file"
            >
              <FileCsvIcon /> Export to CSV
            </button>

            {!isRegionLocked ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#fff", padding: "8px 14px", border: "1px solid #dadce0", borderRadius: "8px" }}>
                <FaFilter style={{ color: "#5f6368", fontSize: "14px" }} />
                <span style={{ fontSize: "14px", fontWeight: "600", color: "#3c4043" }}>Region:</span>
                <select
                  value={selectedRegion}
                  onChange={(e) => {
                    setSelectedRegion(e.target.value);
                    setCountryFilter("ALL");
                  }}
                  style={{
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#1a73e8",
                    cursor: "pointer"
                  }}
                >
                  <option value="ALL">All Regions</option>
                  {uniqueRegions.map((reg) => (
                    <option key={reg} value={reg}>
                      {reg}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f1f3f4", padding: "8px 14px", border: "1px solid #dadce0", borderRadius: "8px" }}>
                <FaLock style={{ color: "#5f6368", fontSize: "13px" }} />
                <span style={{ fontSize: "14px", fontWeight: "600", color: "#3c4043" }}>
                  Region Locked: <span style={{ color: "#1a73e8" }}>{selectedRegion}</span>
                </span>
              </div>
            )}
          </div>
        </div>

        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Responses</div>
            <div className={styles.statValue}>{totalSubmissions}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Average Rating</div>
            <div className={styles.statValue}>{avgRating} / 5.0</div>
          </div>
        </div>

        <div className={styles.controlsBar}>
          <div className={styles.searchBox}>
            <div className={styles.inputWithIcon} style={{ width: "100%" }}>
              <FaMagnifyingGlass className={styles.searchFieldIcon} />
              <input
                type="text"
                className={styles.input}
                placeholder="Search by name, center, or feedback..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.filterWrapper}>
            <select
              className={styles.filterSelect}
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
            >
              <option value="ALL">All Divisions</option>
              <option value="BALAK">Balak</option>
              <option value="BALIKA">Balika</option>
              <option value="KARYAKAR_MALE">Karyakar (Male)</option>
              <option value="KARYAKAR_FEMALE">Karyakar (Female)</option>
            </select>
            <FaChevronDown className={styles.selectChevron} />
          </div>

          <div className={styles.filterWrapper}>
            <select
              className={styles.filterSelect}
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
            >
              <option value="ALL">All Countries</option>
              {uniqueCountries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <FaChevronDown className={styles.selectChevron} />
          </div>
        </div>

        <div className={styles.tableContainer}>
          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner} />
              <p>Loading feedback data...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No feedback entries found matching your criteria.</p>
            </div>
          ) : (
            <div className={styles.tableResponsiveWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Name</th>
                    <th>Location</th>
                    <th>Division</th>
                    <th style={{ textAlign: "center" }}>View More</th>
                    {userRole === "master_admin" && <th style={{ textAlign: "center" }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item) => {
                    const badge = getCategoryBadgeDetails(item);
                    const countryScheme = getCountryBadgeStyle(item.country);
                    return (
                      <tr 
                        key={item.id} 
                        onClick={() => {
                          setSelectedItem(item);
                          setIsModalOpen(true);
                        }}
                        style={{ cursor: "pointer" }}
                        title="Click to view full submission details"
                      >
                        <td>
                          {new Date(item.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td>
                          <strong>{item.full_name}</strong>
                        </td>
                        <td>
                          <div className={styles.centerName}>{item.center}</div>
                          <span 
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: "12px",
                              fontSize: "0.7rem",
                              fontWeight: "700",
                              marginTop: "4px",
                              letterSpacing: "0.03em",
                              backgroundColor: countryScheme.bg,
                              color: countryScheme.text
                            }}
                          >
                            {item.country || "N/A"}
                          </span>
                        </td>
                        <td>
                          <span 
                            className={styles.badge}
                            style={{
                              display: "inline-block",
                              padding: "4px 12px",
                              borderRadius: "20px",
                              fontSize: "12px",
                              fontWeight: "700",
                              letterSpacing: "0.03em",
                              ...(badge.typeKey === "BALIKA" && {
                                backgroundColor: "#fae8ff",
                                color: "#a855f7",
                                border: "1px solid #f5d0fe"
                              }),
                              ...(badge.typeKey === "BALAK" && {
                                backgroundColor: "#e0f2fe",
                                color: "#0369a1",
                                border: "1px solid #bae6fd"
                              }),
                              ...(badge.typeKey === "KARYAKAR_MALE" && {
                                backgroundColor: "#dbeafe",
                                color: "#1d4ed8",
                                border: "1px solid #bfdbfe"
                              }),
                              ...(badge.typeKey === "KARYAKAR_FEMALE" && {
                                backgroundColor: "#fce7f3",
                                color: "#db2777",
                                border: "1px solid #fbcfe8"
                              })
                            }}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItem(item);
                              setIsModalOpen(true);
                            }}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              background: "#f0fdf4",
                              color: "#15803d",
                              border: "1px solid #bbf7d0",
                              padding: "6px 12px",
                              borderRadius: "6px",
                              fontSize: "0.78rem",
                              fontWeight: "700",
                              cursor: "pointer",
                              transition: "background 0.2s"
                            }}
                            title="View full submission details in a popup"
                          >
                            <FaEye /> View More
                          </button>
                        </td>
                        {userRole === "master_admin" && (
                          <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                            <button
                              className={styles.deleteBtn}
                              onClick={(e) => handleDelete(item.id, e)}
                              title="Delete entry"
                            >
                              <FaTrash />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FileCsvIcon() {
  return <FaFileCsv style={{ fontSize: "16px" }} />;
}