import React, { useEffect, useState } from "react";
import {
  FaStar,
  FaMagnifyingGlass,
  FaVideo,
  FaTrash,
  FaXmark,
  FaArrowUpRightFromSquare,
} from "react-icons/fa6";
import { supabase } from "../../supabaseClient";
import styles from "./ShibirFeedbackDisplay.module.css";

export default function ShibirFeedbackDisplay() {
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState("ALL");
  const [ratingFilter, setRatingFilter] = useState("ALL");
  const [activeVideoUrl, setActiveVideoUrl] = useState(null);

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("shibir_feedback")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFeedbackList(data || []);
    } catch (err) {
      console.error("Error fetching feedback:", err);
      alert("Failed to load feedback records: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, videoUrl) => {
    if (!window.confirm("Are you sure you want to delete this response?")) {
      return;
    }

    try {
      // 1. Delete video file from storage if present
      if (videoUrl) {
        const urlParts = videoUrl.split("/shibir-videos/");
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          await supabase.storage.from("shibir-videos").remove([filePath]);
        }
      }

      // 2. Delete database record
      const { error } = await supabase
        .from("shibir_feedback")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setFeedbackList((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Error deleting feedback:", err);
      alert("Failed to delete record: " + err.message);
    }
  };

  // Unique country list for dropdown filter
  const uniqueCountries = [
    ...new Set(feedbackList.map((item) => item.country).filter(Boolean)),
  ];

  // Filter Logic
  const filteredData = feedbackList.filter((item) => {
    const matchesSearch =
      item.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.center?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.response?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCountry =
      countryFilter === "ALL" || item.country === countryFilter;

    const matchesRating =
      ratingFilter === "ALL" || item.rating === parseInt(ratingFilter, 10);

    return matchesSearch && matchesCountry && matchesRating;
  });

  // Calculate statistics
  const totalSubmissions = feedbackList.length;
  const totalVideos = feedbackList.filter((f) => f.video_url).length;
  const avgRating =
    totalSubmissions > 0
      ? (
          feedbackList.reduce((acc, curr) => acc + (curr.rating || 0), 0) /
          totalSubmissions
        ).toFixed(1)
      : "0.0";

  return (
    <div className={styles.wrapper}>
      <div className={styles.headerContainer}>
        <div className={styles.titleGroup}>
          <h1>Shibir Feedback Submissions</h1>
          <p>Review participant responses, star ratings, and video interviews.</p>
        </div>
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
          <FaMagnifyingGlass className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by name, center, or feedback..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

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
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Name</th>
                <th>Location</th>
                <th>Rating</th>
                <th>Feedback</th>
                <th>Video Interview</th>
                <th>Action</th>
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
                    <div>{item.center}</div>
                    <span className={styles.badge}>{item.country}</span>
                  </td>
                  <td>
                    <div className={styles.ratingStars}>
                      {[...Array(5)].map((_, i) => (
                        <FaStar
                          key={i}
                          style={{
                            color: i < item.rating ? "#ecc94b" : "#e2e8f0",
                          }}
                        />
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className={styles.responseText}>{item.response}</div>
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
                  </td>
                  <td>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(item.id, item.video_url)}
                      title="Delete entry"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Video Preview Modal */}
      {activeVideoUrl && (
        <div className={styles.modalOverlay} onClick={() => setActiveVideoUrl(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Video Interview</h3>
              <button
                className={styles.closeModalBtn}
                onClick={() => setActiveVideoUrl(null)}
              >
                <FaXmark />
              </button>
            </div>
            <video
              src={activeVideoUrl}
              controls
              autoPlay
              className={styles.videoPlayer}
            />
          </div>
        </div>
      )}
    </div>
  );
}