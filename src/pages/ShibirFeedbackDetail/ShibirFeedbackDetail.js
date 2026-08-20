import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  FaArrowLeft, 
  FaStar, 
  FaVideo, 
  FaDownload, 
  FaCalendar, 
  FaLocationDot, 
  FaBuilding,
  FaImage,
  FaArrowUpRightFromSquare
} from "react-icons/fa6";
import { feedback as feedbackApi } from "../../apiClient";
import styles from "./ShibirFeedbackDetail.module.css";

const getDriveFileId = (url) => {
  if (!url) return null;
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
};

// Parse photo_urls JSON field from DB
const parsePhotos = (raw) => {
  if (!raw) return [];
  try {
    const p = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(p) ? p : [];
  } catch { return []; }
};

export default function ShibirFeedbackDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSingleFeedback = useCallback(async () => {
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
  }, [id]);

  useEffect(() => {
    fetchSingleFeedback();
  }, [fetchSingleFeedback]);

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
  const photos = parsePhotos(record.photo_urls);

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
              <img
                src="https://res.cloudinary.com/dxgkcyfrl/image/upload/v1782202338/MTRC_NEW_Color_c3d3z1.svg"
                alt="Submitter profile"
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
              />
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
                <FaStar
                  key={i}
                  style={{
                    color: i < Number(record.rating || 0) ? "#f59e0b" : "#cbd5e1",
                    fontSize: "20px",
                  }}
                />
              ))}
            </div>
            <span className={styles.ratingNumber}>{Number(record.rating || 0).toFixed(1)} / 5.0 Stars</span>
            <span className={styles.dateSubmitted}>
              <FaCalendar /> Submitted on {new Date(record.created_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
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

          {/* Full-Frame Photos Section using Google Drive Previews */}
          <div className={styles.cardSection}>
            <div className={styles.videoSectionHeader}>
              <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FaImage /> Uploaded Photos ({photos.length})
              </h3>
            </div>

            {photos.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "16px" }}>
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
                        borderRadius: "12px",
                        overflow: "hidden",
                        padding: "16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.9rem", fontWeight: "600", color: "#334155" }}>
                          Photo {i + 1} of {photos.length}
                        </span>
                        <a
                          href={originalDriveUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontSize: "0.85rem",
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
                        <div className={styles.videoWrapper} style={{ height: "450px" }}>
                          <iframe
                            src={previewUrl}
                            className={styles.videoPlayer}
                            allow="autoplay; encrypted-media"
                            allowFullScreen
                            title={`Submission item ${i + 1}`}
                          />
                        </div>
                      ) : (
                        <div style={{ width: "100%", background: "#0f172a", borderRadius: "8px", overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "center", minHeight: "300px" }}>
                          <img
                            src={rawUrl}
                            alt={`Submission item ${i + 1}`}
                            style={{ width: "100%", maxHeight: "500px", objectFit: "contain", display: "block" }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.noVideoBox}>
                <FaImage style={{ fontSize: "32px", color: "#9aa0a6", marginBottom: "8px" }} />
                <p>No photos attached to this submission.</p>
              </div>
            )}
          </div>

          <div className={styles.cardSection}>
            <div className={styles.videoSectionHeader}>
              <h3>Video Interview</h3>
              {record.video_url && driveFileId && (
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
                    href={record.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.openDriveBtn}
                  >
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