import React from "react";
import { FaClipboardList, FaCheckCircle } from "react-icons/fa";
import styles from "../Dashboard/Dashboard.module.css"; // Utilizing existing core modular dashboard styles

export default function OverviewMetrics({ attendees = [] }) {
  const totalRegistered = attendees.length;
  const totalCheckedIn = attendees.filter(
    (a) => a.status === "Checked In",
  ).length;
  const verifiedRatio =
    totalRegistered > 0
      ? Math.round((totalCheckedIn / totalRegistered) * 100)
      : 0;

  return (
    <>
      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Region Registrations</div>
          <p className={styles.statValue}>{attendees.length}</p>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Checked In Encampment</div>
          <p
            className={styles.statValue}
            style={{ color: "var(--accent-primary)" }}
          >
            {totalCheckedIn}
          </p>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Verified Ratio</div>
          <p className={styles.statValue}>{verifiedRatio}%</p>
        </div>
      </section>

      <section className={styles.contentCard}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>
            <FaClipboardList
              style={{ marginRight: "8px", color: "var(--accent-primary)" }}
            />
            Recent Check-Ins Stream
          </h3>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Attendee Name</th>
                <th>Center</th>
                <th>Status</th>
                <th>Scan Time</th>
              </tr>
            </thead>
            <tbody>
              {attendees.slice(0, 3).map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: "500" }}>{a.name}</td>
                  <td>{a.center}</td>
                  <td>
                    <span className={styles.badgePresent}>
                      <FaCheckCircle
                        style={{ marginRight: "4px", fontSize: "11px" }}
                      />{" "}
                      {a.status}
                    </span>
                  </td>
                  <td
                    style={{
                      fontFamily: "monospace",
                      color: "var(--text-muted)",
                    }}
                  >
                    {a.time}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
