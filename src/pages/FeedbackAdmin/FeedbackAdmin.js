import React, { useState, useEffect } from "react";
import styles from "./FeedbackAdmin.module.css";
import { supabase } from "../../supabaseClient";

export default function FeedbackAdmin() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchFeedbacks() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("system_feedbacks")
          .select("*")
          .order("submitted_at", { ascending: false });

        if (error) throw error;
        setFeedbacks(data || []);
      } catch (err) {
        console.error("Error fetching feedback:", err.message);
        setError("Failed to load feedback records.");
      } finally {
        setLoading(false);
      }
    }

    fetchFeedbacks();
  }, []);

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <p className={styles.statusText}>Loading feedback submissions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <p className={styles.errorText}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>System Feedback Submissions</h2>
          <span className={styles.badge}>Total: {feedbacks.length}</span>
        </div>

        {feedbacks.length === 0 ? (
          <div className={styles.card}>
            <p className={styles.statusText}>No feedback submissions found yet.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {feedbacks.map((item) => (
              <div key={item.id} className={styles.feedbackCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.userName}>{item.user_name}</h3>
                    <p className={styles.userEmail}>{item.user_email}</p>
                  </div>
                  <span className={styles.timestamp}>
                    {new Date(item.submitted_at).toLocaleString()}
                  </span>
                </div>

                <div className={styles.ratingsGrid}>
                  {[...Array(11)].map((_, i) => {
                    const qKey = `q${i + 1}`;
                    return (
                      <div key={qKey} className={styles.ratingBadge}>
                        <span className={styles.qLabel}>Q{i + 1}</span>
                        <span className={styles.qVal}>{item[qKey] ?? "-"}</span>
                      </div>
                    );
                  })}
                </div>

                <div className={styles.feedbackSection}>
                  <h4 className={styles.feedbackHeading}>Open Feedback & Suggestions:</h4>
                  <p className={styles.feedbackText}>
                    {item.feedback_text || "No open feedback provided."}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}