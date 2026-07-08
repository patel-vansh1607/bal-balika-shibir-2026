import React, { useState, useEffect, useCallback, useMemo } from "react";
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
      
      // DEBUG LOG: Look inside your browser developer tools console (F12) to see exactly what name the database field has!
      console.log("Archived records payload from DB:", data);
      
      setRecords(data || []);
    } catch (err) {
      console.error("Archive fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, [regionScope]);

  useEffect(() => { 
    fetchArchived(); 
  }, [fetchArchived]);

  // Helper function to extract whatever name the database is using for the reason field
  const getArchiveReason = (record) => {
    if (!record) return "";
    return record.archive_reason || record.archiveReason || record.reason || record.archive_remarks || "";
  };

  // Memoized filter calculation
  const archivedRecords = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase();
    if (!cleanSearch) return records;

    return records.filter((a) => {
      const nameMatch = a.name?.toLowerCase().includes(cleanSearch);
      const idMatch = a.member_id?.toString().toLowerCase().includes(cleanSearch);
      const reasonMatch = getArchiveReason(a).toLowerCase().includes(cleanSearch);

      return nameMatch || idMatch || reasonMatch;
    });
  }, [records, searchTerm]);

  const handleRestore = async () => {
    if (!confirmAction) return;
    setIsProcessing(true);
    try {
      await attendeesApi.update(confirmAction._raw_id || parseInt(confirmAction.id, 10), { 
        is_archived: false,
        archive_reason: null 
      });
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
              placeholder="Search by name, ID, or reason..."
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
                <th>Reason for Archiving</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className={styles.emptyTablePlaceholder}>
                    <FaSpinner className={styles.spin} /> Loading archived records...
                  </td>
                </tr>
              ) : archivedRecords.length === 0 ? (
                <tr>
                  <td colSpan="5" className={styles.emptyTablePlaceholder}>
                    No archived record tracks match your search filters.
                  </td>
                </tr>
              ) : (
                archivedRecords.map((a) => {
                  const displayReason = getArchiveReason(a);

                  return (
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
                      <td>
                        <span className={displayReason ? styles.reasonText : styles.noReasonText}>
                          {displayReason || "No explicit reason specified"}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => setConfirmAction(a)}
                          className={styles.viewPassBtn}
                          disabled={isProcessing}
                        >
                          <FaUndo /> Restore
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal Container */}
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
                {getArchiveReason(confirmAction) && (
                  <p className={styles.modalReasonContext}>
                    <strong>Original Reason:</strong> "{getArchiveReason(confirmAction)}"
                  </p>
                )}
              </div>
            </div>

            <div className={styles.modalActionRow}>
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className={styles.cancelBtn}
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                type="button"
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