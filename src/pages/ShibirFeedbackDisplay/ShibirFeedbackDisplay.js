import React, { useEffect, useState, useMemo } from "react";
import {
  FaStar,
  FaMagnifyingGlass,
  FaVideo,
  FaTrash,
  FaXmark,
  FaChevronDown,
  FaFilter,
  FaLock,
  FaDownload,
} from "react-icons/fa6";
import { feedback as feedbackApi } from "../../apiClient";
import styles from "./ShibirFeedbackDisplay.module.css";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
// LOCAL ASSETS
import logo from "../../assets/images/Making the Right Choices - Logo_ColorScalable.svg";

// Extract Google Drive file ID from a view URL
const getDriveFileId = (url) => {
  if (!url) return null;
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
};

// Helper function to strip region prefixes (e.g., "_3xl_South", "3xl_North")
const cleanRegion = (rawRegion) => {
  if (!rawRegion || typeof rawRegion !== "string") return "";
  
  const sanitized = rawRegion.trim().replace(/^(_?\d*[a-zA-Z0-9]+_|_)/, "");
  
  if (!sanitized) return rawRegion.trim();
  return sanitized.charAt(0).toUpperCase() + sanitized.slice(1);
};

export default function ShibirFeedbackDisplay({ regionScope = "all" }) {
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const isGlobalScope = !regionScope || regionScope.toLowerCase() === "all";

  // Region & Country & Rating Filters
  const cleanScope = isGlobalScope ? "ALL" : cleanRegion(regionScope);
  const [selectedRegion, setSelectedRegion] = useState(cleanScope || "ALL");
  const [countryFilter, setCountryFilter] = useState("ALL");
  const [ratingFilter, setRatingFilter] = useState("ALL");
  const [activeVideoUrl, setActiveVideoUrl] = useState(null);
  const navigate = useNavigate();
  const { userRole } = useAuth();
  

  // Is region locked by parent prop?
  const isRegionLocked = !isGlobalScope;

  // Sync region state if prop changes
  useEffect(() => {
    setSelectedRegion(isGlobalScope ? "ALL" : (cleanRegion(regionScope) || "ALL"));
  }, [regionScope, isGlobalScope]);

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const { data } = await feedbackApi.list();

      const formattedData = (data || []).map(item => ({
        ...item,
        normalizedRegion: cleanRegion(item.region || item.zone || item.area || "")
      }));

      setFeedbackList(formattedData);
    } catch (err) {
      console.error("Error fetching feedback:", err);
      alert("Failed to load feedback records: " + err.message);
    } finally {
      setLoading(false);
    }
  };

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

  // Extract unique regions for the dropdown
  const uniqueRegions = useMemo(() => {
    const set = new Set();
    feedbackList.forEach((item) => {
      if (item.normalizedRegion) {
        set.add(item.normalizedRegion);
      }
    });
    return Array.from(set).sort();
  }, [feedbackList]);

  // Unique country list for dropdown filter (based on region filter if applied)
  const uniqueCountries = useMemo(() => {
    const subset = selectedRegion === "ALL" 
      ? feedbackList 
      : feedbackList.filter(item => item.normalizedRegion?.toLowerCase() === selectedRegion.toLowerCase());
    
    return [...new Set(subset.map((item) => item.country).filter(Boolean))].sort();
  }, [feedbackList, selectedRegion]);

  // Filter Logic (Region + Country + Rating + Search)
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

    const matchesRating =
      ratingFilter === "ALL" || item.rating === parseInt(ratingFilter, 10);

    return matchesRegion && matchesSearch && matchesCountry && matchesRating;
  });

  // Calculate statistics based on filtered data (or global feedback list)
  const totalSubmissions = filteredData.length;
  const totalVideos = filteredData.filter((f) => f.video_url).length;
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
        {/* Header & Region Filter Bar */}
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

          {/* Region Filter / Scope Selector */}
          {!isRegionLocked ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#fff", padding: "8px 14px", border: "1px solid #dadce0", borderRadius: "8px" }}>
              <FaFilter style={{ color: "#5f6368", fontSize: "14px" }} />
              <span style={{ fontSize: "14px", fontWeight: "600", color: "#3c4043" }}>Region:</span>
              <select
                value={selectedRegion}
                onChange={(e) => {
                  setSelectedRegion(e.target.value);
                  setCountryFilter("ALL"); // Reset country filter on region change
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

        {/* Stats Section */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Responses</div>
            <div className={styles.statValue}>{totalSubmissions}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Average Rating</div>
            <div className={styles.statValue}>{avgRating} / 5.0</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Videos Uploaded</div>
            <div className={styles.statValue}>{totalVideos}</div>
          </div>
        </div>

        {/* Search & Filter Controls */}
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

          <div className={styles.filterWrapper}>
            <select
              className={styles.filterSelect}
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
            >
              <option value="ALL">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
            <FaChevronDown className={styles.selectChevron} />
          </div>
        </div>

        {/* Table Section */}
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
                    <th>Rating</th>
                    {/* <th>Feedback</th>
                    <th>Video Interview</th> */}
                    <th>View More</th>
                    {userRole === 'master_admin' && (<th>Action</th> )}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item) => (
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
                        <span className={styles.badge}>{item.country}</span>
                      </td>
                      <td>
                        <div className={styles.ratingStars}>
                          {[...Array(5)].map((_, i) => (
                            <FaStar
                              key={i}
                              style={{
                                color: i < item.rating ? "#f59e0b" : "#cbd5e1",
                              }}
                            />
                          ))}
                        </div>
                      </td>
                      {/* <td>
                        <div className={styles.responseText}>
                          {item.response && item.response.length > 50 
                            ? `${item.response.substring(0, 50)}...` 
                            : (item.response || "No feedback provided")}
                        </div>
                      </td>
                      <td>
                        {item.video_url ? (
                          <button
                            className={styles.videoLinkBtn}
                            onClick={() => setActiveVideoUrl(item.video_url)}
                          >
                            <FaVideo /> Play Video
                          </button>
                        ) : (
                          <span className={styles.noVideoText}>No Video</span>
                        )}
                      </td> */}

                      {/* View More Cell */}
                      <td>
                        <button
                          className={styles.viewDetailsBtn}
                          onClick={() => navigate(`/dashboard/feedback/${item.id}`)}
                          title="View full feedback details"
                        >
                          View More
                        </button>
                      </td>

                      {userRole === 'master_admin' && (
                        <td>
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Video Preview Modal */}
      {activeVideoUrl && (
        <div className={styles.modalOverlay} onClick={() => setActiveVideoUrl(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Video Interview</h3>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <a
                  href={`https://drive.google.com/uc?export=download&id=${getDriveFileId(activeVideoUrl)}`}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.downloadBtn}
                  onClick={(e) => e.stopPropagation()}
                >
                  <FaDownload /> Download
                </a>
                <a
                  href={activeVideoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.openDriveBtn}
                  onClick={(e) => e.stopPropagation()}
                >
                  Open in Drive
                </a>
                <button
                  className={styles.closeModalBtn}
                  onClick={() => setActiveVideoUrl(null)}
                >
                  <FaXmark />
                </button>
              </div>
            </div>
            <iframe
              src={`https://drive.google.com/file/d/${getDriveFileId(activeVideoUrl)}/preview`}
              className={styles.videoPlayer}
              allow="autoplay; encrypted-media"
              allowFullScreen
              title="Video Interview"
              style={{ border: "none" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}