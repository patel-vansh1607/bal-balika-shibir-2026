import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaMagnifyingGlass,
  FaTrash,
  FaChevronDown,
  FaFilter,
  FaLock,
  FaEye,
  FaFileCsv,
} from "react-icons/fa6";
import { feedback as feedbackApi, karayakars as karayakarsApi } from "../../apiClient";
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

export default function ShibirFeedbackDisplay({ regionScope = "all" }) {
  const navigate = useNavigate();
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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

  // Helper to determine if a Karyakar is female based on seva designations
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

  // Pastel badge styles and labels for division
  const getCategoryBadgeDetails = useCallback((item) => {
    const cat = (item.category || item.type || "").toLowerCase();
    const gender = (item.gender || item.sex || "").toLowerCase();
    const designation = (item.seva_designation || "").toLowerCase();

    // 1. Karyakar Check
    if (cat.includes("karyakar") || designation) {
      const isFemale = getIsFemaleKaryakar(item) || gender.includes("f") || gender.includes("female");
      if (isFemale) {
        return {
          typeKey: "KARYAKAR_FEMALE",
          label: "Karyakar (Female)",
          style: { background: "#fce7f3", color: "#db2777", border: "1px solid #fbcfe8" }
        };
      } else {
        return {
          typeKey: "KARYAKAR_MALE",
          label: "Karyakar (Male)",
          style: { background: "#dbeafe", color: "#1d4ed8", border: "1px solid #bfdbfe" }
        };
      }
    }

    // 2. Balika Check
    if (gender.includes("f") || gender.includes("female") || cat.includes("balika") || gender.includes("balika")) {
      return {
        typeKey: "BALIKA",
        label: "Balika",
        style: { background: "#fae8ff", color: "#a855f7", border: "1px solid #f5d0fe" }
      };
    }

    // 3. Balak Check (Default fallback)
    return {
      typeKey: "BALAK",
      label: "Balak",
      style: { background: "#e0f2fe", color: "#0369a1", border: "1px solid #bae6fd" }
    };
  }, []);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const [feedbackRes, membersRes] = await Promise.all([
        feedbackApi.list(),
        karayakarsApi.list ? karayakarsApi.list() : Promise.resolve({ data: [] })
      ]);

      const rawFeedback = feedbackRes?.data || [];
      const members = membersRes?.data || [];

      const memberMap = new Map();
      members.forEach((m) => {
        if (m.full_name) {
          const cleanName = m.full_name.trim().toLowerCase().replace(/\s+/g, ' ');
          memberMap.set(cleanName, m);
        }
      });

      const formattedData = rawFeedback.map(item => {
        const itemCleanName = (item.full_name || "").trim().toLowerCase().replace(/\s+/g, ' ');
        const matched = memberMap.get(itemCleanName) || {};

        const tempItem = {
          ...item,
          gender: item.gender || matched.gender || matched.sex || "",
          category: item.category || matched.category || matched.type || (matched.seva_designation ? "Karyakar" : ""),
          seva_designation: item.seva_designation || matched.seva_designation || "",
          normalizedRegion: cleanRegion(item.region || item.zone || item.area || matched.region || "")
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

  const handleDelete = async (id) => {
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

  // Export Filtered Data to CSV format
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
              <FaFileCsv style={{ fontSize: "16px" }} /> Export to CSV
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
                      <tr key={item.id}>
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
                            style={{
                              display: "inline-block",
                              padding: "4px 10px",
                              borderRadius: "6px",
                              fontSize: "0.78rem",
                              fontWeight: "700",
                              ...badge.style
                            }}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                          <button
                            onClick={() => navigate(`/dashboard/feedback/${item.id}`)}
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
                            title="View full submission details"
                          >
                            <FaEye /> View More
                          </button>
                        </td>
                        {userRole === "master_admin" && (
                          <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                            <button
                              className={styles.deleteBtn}
                              onClick={() => handleDelete(item.id)}
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