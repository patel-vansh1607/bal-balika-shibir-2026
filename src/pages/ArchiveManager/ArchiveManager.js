import React, { useState, useEffect } from "react";
import { FaUndo, FaSearch, FaArchive, FaSpinner } from "react-icons/fa";
import styles from "./ArchiveManager.module.css";

export default function ArchiveManager({ attendees, toggleArchiveStatus }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localRecords, setLocalRecords] = useState([]);

  useEffect(() => {
    if (attendees) {
      setLocalRecords(attendees);
    }
  }, [attendees]);

  const archivedRecords = localRecords.filter(
    (a) =>
      a.is_archived === true &&
      (a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.member_id && a.member_id.toString().includes(searchTerm))),
  );

  const handleRestore = async () => {
    if (!confirmAction) return;
    setIsProcessing(true);

    try {
      setLocalRecords((prev) =>
        prev.map((item) =>
          String(item.id).trim() === String(confirmAction.id).trim()
            ? { ...item, is_archived: false }
            : item,
        ),
      );

      await toggleArchiveStatus(confirmAction, false);

      setConfirmAction(null);
    } catch (error) {
      console.error("Restoration pipeline failed:", error);
      setLocalRecords(attendees);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={styles.rosterContainer}>
      <div className={styles.contentCard}>
        <div className={styles.toolbarRow}>
          <div className={styles.titleArea}>
            <h2>
              <span className={styles.iconFallbackWrapper}>
                <FaArchive className={styles.archiveHeaderIcon} />
              </span>
              System Archive
            </h2>
            <p className={styles.viewSubtitle}>
              Manage and restore previously archived attendee accounts
            </p>
          </div>
          <div className={styles.searchWrapper}>
            <FaSearch className={styles.searchIcon} />
            <input
              className={styles.inputField}
              placeholder="Search by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Member ID</th>
                <th>Full Name</th>
                <th>Region</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {archivedRecords.length === 0 ? (
                <tr>
                  <td colSpan="4" className={styles.emptyTablePlaceholder}>
                    No archived record tracks match your search filters.
                  </td>
                </tr>
              ) : (
                archivedRecords.map((a) => (
                  <tr key={a.id}>
                    <td className={styles.monospaceText}>
                      <code>{a.member_id || "N/A"}</code>
                    </td>
                    <td className={styles.boldText}>{a.name}</td>
                    <td>
                      <span className={styles.regionTag}>
                        {a.region || "Global"}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        onClick={() => setConfirmAction(a)}
                        className={styles.viewPassBtn}
                        disabled={isProcessing}
                      >
                        <FaUndo /> Restore
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div
          className={styles.modalOverlay}
          onClick={() => !isProcessing && setConfirmAction(null)}
        >
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>Confirm Restoration</h3>

              <div className={styles.modalInlineActionBox}>
                <p>
                  Restore <strong>{confirmAction.name}</strong> to the active
                  registry roster context?
                </p>
                <button
                  onClick={handleRestore}
                  disabled={isProcessing}
                  className={styles.inlineTextRestoreBtn}
                  title="Click to instantly restore record"
                >
                  {isProcessing ? (
                    <FaSpinner className={styles.spin} />
                  ) : (
                    <FaUndo />
                  )}{" "}
                  Restore
                </button>
              </div>
            </div>

            <div className={styles.modalActionRow}>
              <button
                onClick={() => setConfirmAction(null)}
                className={styles.cancelBtn}
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                onClick={handleRestore}
                className={styles.confirmBtn}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <FaSpinner className={styles.spin} /> Processing...
                  </>
                ) : (
                  <>
                    <FaUndo /> Confirm Restore
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
