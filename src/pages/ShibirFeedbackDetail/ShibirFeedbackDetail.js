import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  FaArrowLeft, 
  FaStar, 
  FaVideo, 
  FaDownload, 
  FaCalendar, 
  FaLocationDot, 
  FaUser, 
  FaBuilding 
} from "react-icons/fa6";
import { feedback as feedbackApi } from "../../apiClient";
import styles from "./ShibirFeedbackDetail.module.css";

// Extract Google Drive file ID from a view URL
const getDriveFileId = (url) => {
  if (!url) return null;
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
};

export default function ShibirFeedbackDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchSingleFeedback();
  }, [id]);

  const fetchSingleFeedback = async () => {
    setLoading(true);
    try {
      if (typeof feedbackApi.get === 'function') {
        const { data } = await feedbackApi.get(id);
        setRecord(data);
      } else {
        const { data } = await feedbackApi.list();
        const found = (data || []).find((item) => String(item.id) === String(id));
        if (found) {
          setRecord(found);
        } else {
          setError("Feedback record not found.");
        }
      }
    } catch (err) {
      console.error("Error fetching feedback detail:", err);
      setError("Failed to load feedback details: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Loading feedback details...</p>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className={styles.errorContainer}>
        <h2>Oops!</h2>
        <p>{error || "Record could not be found."}</p>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <FaArrowLeft /> Back to Dashboard
        </button>
      </div>
    );
  }

  const driveFileId = getDriveFileId(record.video_url);

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <div className={styles.navBar}>
          <button className={styles.backBtn} onClick={() => navigate(-1)}>
            <FaArrowLeft /> Back to Feedback List
          </button>
        </div>

        <div className={styles.headerCard}>
          <div className={styles.userInfoGroup}>
            <div className={styles.avatarPlaceholder}>
              <FaUser />
            </div>
            <div>
              <h1 className={styles.userName}>{record.full_name || "Anonymous Submitter"}</h1>
              <div className={styles.metaSubRow}>
                <span><FaBuilding /> {record.center || "N/A"}</span>
                <span>•</span>
                <span><FaLocationDot /> {record.country || "N/A"}</span>
              </div>
            </div>
          </div>

          <div className={styles.ratingBox}>
            <div className={styles.ratingStars}>
              {[...Array(5)].map((_, i) => (
                <FaStar key={i} style={{ color: i < Number(record.rating || 0) ? "#f59e0b" : "#cbd5e1", fontSize: "20px" }} />
              ))}
            </div>
            <span className={styles.ratingNumber}>{Number(record.rating || 0).toFixed(1)} / 5.0 Stars</span>
            <span className={styles.dateSubmitted}>
              <FaCalendar /> Submitted on {new Date(record.created_at).toLocaleDateString("en-US", {
                month: "long", day: "numeric", year: "numeric",
              })}
            </span>
          </div>
        </div>

        <div className={styles.contentGrid}>
          <div className={styles.cardSection}>
            <h3>Full Feedback Response</h3>
            <div className={styles.feedbackBody}>
              {record.response ? (
                <p>{record.response}</p>
              ) : (
                <p className={styles.noDataText}>No text feedback provided.</p>
              )}
            </div>
          </div>

          <div className={styles.cardSection}>
            <div className={styles.videoSectionHeader}>
              <h3>Video Interview</h3>
              {record.video_url && driveFileId && (
                <div className={styles.videoActions}>
                  <a href={`https://drive.google.com/uc?export=download&id=${driveFileId}`}
                    target="_blank" rel="noreferrer" className={styles.downloadBtn}>
                    <FaDownload /> Download Video
                  </a>
                  <a href={record.video_url} target="_blank" rel="noreferrer" className={styles.openDriveBtn}>
                    Open in Drive
                  </a>
                </div>
              )}
            </div>

            {record.video_url && driveFileId ? (
              <div className={styles.videoWrapper}>
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
                <FaVideo style={{ fontSize: "32px", color: "#9aa0a6", marginBottom: "8px" }} />
                <p>No video interview attached to this submission.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
