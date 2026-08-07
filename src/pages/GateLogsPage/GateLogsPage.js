import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FaDoorOpen,
  FaClipboardList,
  FaSearch,
  FaSync,
  FaFilter,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimesCircle,
  FaGlobe,
  FaDownload
} from "react-icons/fa";
import { gateLogs, sessionLogs } from "../../apiClient";

import styles from "./GateLogsPage.module.css";

const formatTimestamp = (dateInput) => {
  if (!dateInput) return "N/A";
  try {
    let isoStr = typeof dateInput === "string" ? dateInput.trim() : dateInput;
    if (typeof isoStr === "string" && !isoStr.endsWith("Z") && !isoStr.includes("+") && !isoStr.includes("-")) {
      isoStr = isoStr.replace(" ", "T") + "Z";
    }
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "Invalid Date";

    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch (e) {
    return String(dateInput);
  }
};

const parseStoredRegionAndPrefix = () => {
  let targetRegion = "GLOBAL";
  let targetPrefix = "";

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i) || "";
    const value = localStorage.getItem(key) || "";

    if (key.includes("selected_shibir_region")) {
      const extracted = key.replace("selected_shibir_region", "").trim();
      if (extracted) targetRegion = extracted.toUpperCase();
      else if (value) targetRegion = value.toUpperCase();
    } else if (value.includes("selected_shibir_region")) {
      const extracted = value.replace("selected_shibir_region", "").trim();
      if (extracted) targetRegion = extracted.toUpperCase();
    }

    if (key.includes("selected_shibir_prefix")) {
      const prefixExtracted = key.replace("selected_shibir_prefix", "").trim();
      if (prefixExtracted) targetPrefix = prefixExtracted.toUpperCase();
      else if (value) targetPrefix = value.toUpperCase();
    } else if (value.includes("selected_shibir_prefix")) {
      const prefixExtracted = value.replace("selected_shibir_prefix", "").trim();
      if (prefixExtracted) targetPrefix = prefixExtracted.toUpperCase();
    }
  }

  if (targetRegion === "GLOBAL" || targetRegion === "ALL") {
    const legacy = localStorage.getItem("SELECTED_SHIBOR_REGION");
    if (legacy && legacy.toUpperCase() !== "GLOBAL" && legacy.toUpperCase() !== "ALL") {
      targetRegion = legacy.toUpperCase();
    }
  }

  if (targetRegion === "KENYA" || targetRegion === "KE") {
    targetRegion = "KENYA";
    if (!targetPrefix) targetPrefix = "MTRC-KE-";
  } else if (targetRegion === "TANZANIA" || targetRegion === "TZ") {
    targetRegion = "TANZANIA";
    if (!targetPrefix) targetPrefix = "MTRC-TZ-";
  } else if (targetRegion === "UGANDA" || targetRegion === "UG") {
    targetRegion = "UGANDA";
    if (!targetPrefix) targetPrefix = "MTRC-UG-";
  } else if (targetRegion === "ZAMBIA" || targetRegion === "ZM") {
    targetRegion = "ZAMBIA";
    if (!targetPrefix) targetPrefix = "MTRC-ZM-";
  } else if (targetRegion === "MALAWI" || targetRegion === "MW") {
    targetRegion = "MALAWI";
    if (!targetPrefix) targetPrefix = "MTRC-MW-";
  } else if (targetRegion === "BOTSWANA" || targetRegion === "BW") {
    targetRegion = "BOTSWANA";
    if (!targetPrefix) targetPrefix = "MTRC-BW-";
  } else if (targetRegion === "SOUTH AFRICA" || targetRegion === "ZA") {
    targetRegion = "SOUTH AFRICA";
    if (!targetPrefix) targetPrefix = "MTRC-ZA-";
  }

  return { region: targetRegion, prefix: targetPrefix };
};

export default function GateLogsPage() {
  const [activeTab, setActiveTab]       = useState("gate");
  const [logs, setLogs]                 = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  const [{ region: selectedRegion, prefix: selectedPrefix }, setShibirScope] = useState(parseStoredRegionAndPrefix);

  const [searchTerm, setSearchTerm]     = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [currentPage, setCurrentPage]   = useState(1);
  const itemsPerPage = 15;

  const updateScope = useCallback(() => {
    setShibirScope(parseStoredRegionAndPrefix());
  }, []);

  useEffect(() => {
    updateScope();
    window.addEventListener("storage", updateScope);
    return () => window.removeEventListener("storage", updateScope);
  }, [updateScope]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === "gate") {
        const response = await gateLogs.list(300);
        const data = response?.data || response || [];
        setLogs(Array.isArray(data) ? data : []);
      } else {
        const response = await sessionLogs.list();
        const data = response?.data || response || [];
        setLogs(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(`Failed to fetch ${activeTab} logs from API:`, err);
      setError(`Failed to retrieve live ${activeTab} log records.`);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setCurrentPage(1);
    fetchLogs();
  }, [fetchLogs]);

  const regionScopedLogs = useMemo(() => {
    if (!selectedRegion || selectedRegion === "GLOBAL" || selectedRegion === "ALL") {
      return logs;
    }

    return logs.filter((log) => {
      const logRegion = (log.region || log.country || log.gate_region || "").toString().toUpperCase();
      const scannedCode = (log.scanned_id || log.attendee_id || "").toString().toUpperCase();

      if (logRegion) {
        if (selectedRegion === "TANZANIA" && (logRegion === "TANZANIA" || logRegion === "TZ")) return true;
        if (selectedRegion === "KENYA" && (logRegion === "KENYA" || logRegion === "KE")) return true;
        if (selectedRegion === "UGANDA" && (logRegion === "UGANDA" || logRegion === "UG")) return true;
        if (selectedRegion === "ZAMBIA" && (logRegion === "ZAMBIA" || logRegion === "ZM")) return true;
        if (selectedRegion === "MALAWI" && (logRegion === "MALAWI" || logRegion === "MW")) return true;
        if (selectedRegion === "BOTSWANA" && (logRegion === "BOTSWANA" || logRegion === "BW")) return true;
        if (selectedRegion === "SOUTH AFRICA" && (logRegion === "SOUTH AFRICA" || logRegion === "ZA")) return true;
      }

      if (selectedPrefix && scannedCode.startsWith(selectedPrefix)) {
        return true;
      }

      if (selectedRegion === "TANZANIA" && (scannedCode.includes("TZ") || scannedCode.includes("TANZANIA"))) return true;
      if (selectedRegion === "KENYA" && (scannedCode.includes("KE") || scannedCode.includes("KENYA"))) return true;
      if (selectedRegion === "UGANDA" && (scannedCode.includes("UG") || scannedCode.includes("UGANDA"))) return true;
      if (selectedRegion === "ZAMBIA" && (scannedCode.includes("ZM") || scannedCode.includes("ZAMBIA"))) return true;
      if (selectedRegion === "MALAWI" && (scannedCode.includes("MW") || scannedCode.includes("MALAWI"))) return true;
      if (selectedRegion === "BOTSWANA" && (scannedCode.includes("BW") || scannedCode.includes("BOTSWANA"))) return true;
      if (selectedRegion === "SOUTH AFRICA" && (scannedCode.includes("ZA") || scannedCode.includes("SOUTH AFRICA"))) return true;

      return false;
    });
  }, [logs, selectedRegion, selectedPrefix]);

  const filteredLogs = useMemo(() => {
    return regionScopedLogs.filter((log) => {
      const query = searchTerm.toLowerCase();

      if (activeTab === "gate") {
        const matchesSearch =
          (log.scanned_id && log.scanned_id.toLowerCase().includes(query)) ||
          (log.attendee_name && log.attendee_name.toLowerCase().includes(query)) ||
          (log.operator_name && log.operator_name.toLowerCase().includes(query)) ||
          (log.operator_email && log.operator_email.toLowerCase().includes(query)) ||
          (log.message && log.message.toLowerCase().includes(query));

        const matchesStatus =
          statusFilter === "ALL" ||
          (log.status && log.status.toLowerCase() === statusFilter.toLowerCase());

        return matchesSearch && matchesStatus;
      } else {
        return (
          (log.attendee_id && String(log.attendee_id).toLowerCase().includes(query)) ||
          (log.attendee_name && log.attendee_name.toLowerCase().includes(query)) ||
          (log.session_id && String(log.session_id).toLowerCase().includes(query)) ||
          (log.session_title && log.session_title.toLowerCase().includes(query))
        );
      }
    });
  }, [regionScopedLogs, searchTerm, statusFilter, activeTab]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = useMemo(() => {
    return filteredLogs.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredLogs, currentPage, itemsPerPage]);

  const handleExportCSV = () => {
    if (!filteredLogs.length) return;

    let headers = [];
    let rows = [];

    if (activeTab === "gate") {
      headers = ["Region Scope", "Timestamp", "Scanned ID", "Attendee Name", "Status", "Operator", "Full Message"];
      rows = filteredLogs.map((l) => [
        `"${selectedRegion}"`,
        `"${formatTimestamp(l.created_at || l.timestamp)}"`,
        `"${l.scanned_id || ""}"`,
        `"${l.attendee_name || "Unknown Badge"}"`,
        `"${l.status || ""}"`,
        `"${l.operator_name || l.operator_email || "System"}"`,
        `"${(l.message || "").replace(/"/g, '""')}"`,
      ]);
    } else {
      headers = ["Region Scope", "Check-In Time", "Attendee ID", "Session ID", "Session Title"];
      rows = filteredLogs.map((l) => [
        `"${selectedRegion}"`,
        `"${formatTimestamp(l.created_at || l.checkin_time)}"`,
        `"${l.attendee_id || ""}"`,
        `"${l.session_id || ""}"`,
        `"${l.session_title || "General"}"`,
      ]);
    }

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedRegion.toLowerCase()}_${activeTab}_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <div className={styles.navigationTabs}>
          <button
            className={`${styles.tabBtn} ${activeTab === "gate" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("gate")}
          >
            <FaDoorOpen /> Gate Audit Logs
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === "session" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("session")}
          >
            <FaClipboardList /> Session Check-In Logs
          </button>
        </div>

        <div className={styles.actionGroup}>
          <div className={styles.regionIndicator}>
            <FaGlobe className={styles.regionIcon} />
            <span>
              Scope: <strong>{selectedRegion}</strong>
              {selectedPrefix ? ` (${selectedPrefix})` : ""}
            </span>
          </div>

          <button onClick={fetchLogs} className={styles.refreshBtn} title="Reload live database logs">
            <FaSync className={loading ? styles.spinIcon : ""} /> Refresh
          </button>
          <button
            onClick={handleExportCSV}
            disabled={!filteredLogs.length}
            className={styles.exportBtn}
          >
            <FaDownload /> Export CSV
          </button>
        </div>
      </div>

      <div className={styles.filterCard}>
        <div className={styles.searchBox}>
          <FaSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder={
              activeTab === "gate"
                ? `Search ${selectedRegion === "GLOBAL" ? "All" : selectedRegion} Token, Name, Message...`
                : `Search ${selectedRegion === "GLOBAL" ? "All" : selectedRegion} Attendee ID, Session...`
            }
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className={styles.searchInput}
          />
        </div>

        {activeTab === "gate" && (
          <div className={styles.filterDropdowns}>
            <div className={styles.selectWrapper}>
              <FaFilter className={styles.filterIcon} />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className={styles.selectInput}
              >
                <option value="ALL">All Statuses</option>
                <option value="success">Approved (Success)</option>
                <option value="warning">Duplicates (Warning)</option>
                <option value="error">Denied (Error)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {error && <div className={styles.errorNotice}>{error}</div>}

      <div className={styles.tableContainer}>
        {loading ? (
          <div className={styles.skeletonContainer}>
            <div className={styles.spinner}></div>
            <p>Fetching real-time {selectedRegion === "GLOBAL" ? "Global" : selectedRegion} logs...</p>
          </div>
        ) : (
          <>
            <table className={styles.logTable}>
              <thead>
                {activeTab === "gate" ? (
                  <tr>
                    <th>Timestamp</th>
                    <th>Scanned Token</th>
                    <th>Attendee Name</th>
                    <th>Status</th>
                    <th>Operator</th>
                    <th>Audit Detail (Full)</th>
                  </tr>
                ) : (
                  <tr>
                    <th>Check-In Time</th>
                    <th>Attendee ID</th>
                    <th>Session Context</th>
                    <th>Region Scope</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {paginatedLogs.length > 0 ? (
                  paginatedLogs.map((row, index) => {
                    const keyId = row.id || `${index}-${Date.now()}`;

                    if (activeTab === "gate") {
                      const status = (row.status || "info").toLowerCase();
                      return (
                        <tr key={keyId}>
                          <td className={styles.timeCell}>
                            {formatTimestamp(row.created_at || row.timestamp)}
                          </td>
                          <td>
                            <code className={styles.tokenCode}>{row.scanned_id}</code>
                          </td>
                          <td className={styles.nameCell}>{row.attendee_name || "Unknown Badge"}</td>
                          <td>
                            <span className={`${styles.statusBadge} ${styles[`badge_${status}`]}`}>
                              {status === "success" && <FaCheckCircle />}
                              {status === "warning" && <FaExclamationTriangle />}
                              {status === "error" && <FaTimesCircle />}
                              {row.status ? row.status.toUpperCase() : "INFO"}
                            </span>
                          </td>
                          <td className={styles.operatorCell}>
                            {row.operator_name || row.operator_email?.split("@")[0] || "System"}
                          </td>
                          <td className={styles.messageCellFull}>{row.message || "—"}</td>
                        </tr>
                      );
                    } else {
                      return (
                        <tr key={keyId}>
                          <td className={styles.timeCell}>
                            {formatTimestamp(row.created_at || row.checkin_time)}
                          </td>
                          <td>
                            <code className={styles.tokenCode}>{row.attendee_id}</code>
                          </td>
                          <td className={styles.sessionCell}>
                            {row.session_title || (row.session_id ? `Session #${row.session_id}` : "General Gate Admission")}
                          </td>
                          <td>
                            <span className={styles.regionTag}>{row.region || selectedRegion}</span>
                          </td>
                        </tr>
                      );
                    }
                  })
                ) : (
                  <tr>
                    <td colSpan={activeTab === "gate" ? "6" : "4"} className={styles.emptyTable}>
                      No {selectedRegion === "GLOBAL" ? "global" : selectedRegion} records match the search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className={styles.mobileCardList}>
              {paginatedLogs.length > 0 ? (
                paginatedLogs.map((row, index) => {
                  const keyId = row.id || `mobile-${index}-${Date.now()}`;
                  const status = (row.status || "info").toLowerCase();

                  return (
                    <div key={keyId} className={styles.mobileCard}>
                      <div className={styles.mobileHeader}>
                        <span className={styles.timeCell}>
                          {formatTimestamp(row.created_at || row.timestamp || row.checkin_time)}
                        </span>
                        {activeTab === "gate" ? (
                          <span className={`${styles.statusBadge} ${styles[`badge_${status}`]}`}>
                            {row.status ? row.status.toUpperCase() : "INFO"}
                          </span>
                        ) : (
                          <span className={styles.regionTag}>{row.region || selectedRegion}</span>
                        )}
                      </div>

                      <div className={styles.mobileBody}>
                        <div>
                          <strong>ID / Token: </strong>
                          <code className={styles.tokenCode}>
                            {activeTab === "gate" ? row.scanned_id : row.attendee_id}
                          </code>
                        </div>

                        {activeTab === "gate" && (
                          <div>
                            <strong>Attendee: </strong>
                            <span>{row.attendee_name || "Unknown Badge"}</span>
                          </div>
                        )}

                        {activeTab === "gate" && (
                          <div>
                            <strong>Operator: </strong>
                            <span>{row.operator_name || row.operator_email?.split("@")[0] || "System"}</span>
                          </div>
                        )}

                        {activeTab === "session" && (
                          <div>
                            <strong>Session: </strong>
                            <span>
                              {row.session_title || (row.session_id ? `Session #${row.session_id}` : "General Gate Admission")}
                            </span>
                          </div>
                        )}

                        {activeTab === "gate" && (
                          <div className={styles.mobileMessage}>
                            <strong>Audit Detail: </strong>
                            <p>{row.message || "—"}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className={styles.emptyTable}>
                  No {selectedRegion === "GLOBAL" ? "global" : selectedRegion} records found.
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {!loading && filteredLogs.length > 0 && (
        <div className={styles.paginationFooter}>
          <div className={styles.recordsCount}>
            Showing <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> to{" "}
            <strong>{Math.min(currentPage * itemsPerPage, filteredLogs.length)}</strong> of{" "}
            <strong>{filteredLogs.length}</strong> records ({selectedRegion})
          </div>
          <div className={styles.paginationControls}>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className={styles.pageNavBtn}
            >
              Previous
            </button>
            <span className={styles.pageIndicator}>
              Page {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className={styles.pageNavBtn}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}