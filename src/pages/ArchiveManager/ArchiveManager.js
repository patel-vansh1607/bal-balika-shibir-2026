import React, { useState, useEffect, useCallback } from "react";
import { FaUndo, FaSearch, FaArchive, FaSpinner } from "react-icons/fa";
import { attendees as attendeesApi } from "../../apiClient";
import styles from "./ArchiveManager.module.css";

export default function ArchiveManager({ regionScope }) {
  const [searchTerm, setSearchTerm]     = useState("");
  const [confirmAction, setConfirmAction] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [records, setRecords]           = useState([]);
  const [loading, setLoading]           = useState(true);

  const fetchArchived = useCallback(async () => {
    setLoading(true);
    try {
      const params = { archived: 1 };
      if (regionScope && regionScope !== "All") params.region = regionScope;
      const { data } = await attendeesApi.list(params);
      setRecords(data || []);
    } catch (err) {
      console.error("Archive fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, [regionScope]);

  useEffect(() => { fetchArchived(); }, [fetchArchived]);

  const archivedRecords = records.filter(
    (a) =>
      a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.member_id && a.member_id.toString().includes(searchTerm)),
  );

  const handleRestore = async () => {
    if (!confirmAction) return;
    setIsProcessing(true);
    try {
      await attendeesApi.update(confirmAction._raw_id || parseInt(confirmAction.id, 10), { is_archived: false });
      setRecords((prev) => prev.filter((item) => item.id !== confirmAction.id));
      setConfirmAction(null);
    } catch (error) {
      console.error("Restoration pipeline failed:", error);
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
              {loading ? (
                <tr>
                  <td colSpan="4" className={styles.emptyTablePlaceholder}>
                    <FaSpinner className={styles.spin} /> Loading archived records...
                  </td>
                </tr>
              ) : archivedRecords.length === 0 ? (
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
