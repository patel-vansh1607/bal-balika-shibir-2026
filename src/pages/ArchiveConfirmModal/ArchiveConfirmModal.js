// src/pages/RegisteredRoster/ArchiveConfirmModal.js
import React, { useState, useEffect } from "react";
import { FaArchive, FaSpinner } from "react-icons/fa";
import styles from "./ArchiveConfirmModal.module.css";

export default function ArchiveConfirmModal({ isOpen, onClose, onConfirm, attendeeName, isProcessing }) {
  const [archiveReasonText, setArchiveReasonText] = useState("");

  // Clear out the text whenever the modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setArchiveReasonText("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay2} onClick={onClose}>
      <div className={styles.modalCard2} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalIconHeader2}>
          <FaArchive size={24} />
        </div>

        <h3 className={styles.modalTitle2}>Archive Record?</h3>
        <p className={styles.modalDescription2}>
          Are you sure you want to archive <strong>{attendeeName}</strong>?
        </p>

        <div className={styles.archiveReasonFieldGroup}>
          <label className={styles.archiveReasonLabel}>
            Reason for Archiving <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <textarea
            className={styles.archiveReasonInput}
            placeholder="Provide a specific reason (e.g., Duplicate Entry)..."
            value={archiveReasonText}
            onChange={(e) => setArchiveReasonText(e.target.value)}
            disabled={isProcessing}
            rows={3}
          />
        </div>

        <div className={styles.modalActionGroup2}>
          <button 
            type="button" 
            onClick={onClose} 
            className={styles.cancelBtn} 
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(archiveReasonText)}
            className={styles.confirmBtn}
            disabled={isProcessing || !archiveReasonText.trim()}
          >
            {isProcessing ? <FaSpinner className={styles.spin} /> : "Confirm Archive"}
          </button>
        </div>
      </div>
    </div>
  );
}