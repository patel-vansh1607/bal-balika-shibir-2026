import React from "react";
import { FaTools, FaClock, FaEnvelope } from "react-icons/fa";
import styles from "./MaintenancePage.module.css";

export default function MaintenancePage() {
  return (
    <div className={styles.maintenanceWrapper}>
      <div className={styles.maintenanceCard}>
        <div className={styles.logoSpace}>
          <div className={styles.gearIconRing}>
            <FaTools className={styles.centerTool} />
          </div>
          <span className={styles.brandTitle}>Shibir Portal</span>
        </div>

        <h1 className={styles.displayHeadline}>We’ll Be Right Back!</h1>
        <p className={styles.bodyParagraph}>
          Our systems are undergoing briefly scheduled optimization updates to
          improve registration streams and device sync performance. We
          appreciate your patience.
        </p>

        <div className={styles.badgeCluster}>
          <div className={styles.infoBadge}>
            <FaClock className={styles.badgeIcon} />
            <div className={styles.badgeContent}>
              <span className={styles.metaLabel}>Expected Back Online</span>
              <span className={styles.metaValue}>N/A</span>
            </div>
          </div>

          <div className={styles.infoBadge}>
            <FaEnvelope className={styles.badgeIcon} />
            <div className={styles.badgeContent}>
              <span className={styles.metaLabel}>Support Contact</span>
              <span className={styles.metaValue}>
                <a
                  href="mailto:support@shibir.org"
                  className={styles.linkAnchor}
                >
                  N/A
                </a>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
