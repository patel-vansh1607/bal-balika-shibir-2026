import React, { useState, useEffect } from "react";
import { FaMagnifyingGlass, FaEnvelope, FaDownload, FaUserXmark, FaCheck, FaRotateLeft, FaCircleCheck, FaTriangleExclamation } from "react-icons/fa6";
import { feedback as feedbackApi } from "../../apiClient";
import { supabase } from "../../supabaseClient";
import styles from "./UnsubmittedAttendees.module.css";

const regionDataset = {
  Kenya: [
    "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Malindi",
    "Kericho", "Kakamega", "Nyeri", "Machakos", "Meru", "Kitale", "Garissa",
    "Voi", "Naivasha", "Narok", "Embu", "Lamu", "Nanyuki", "Athi River",
    "Nyahururu", "Bomet", "Busia", "Homabay", "Kisii", "Bungoma"
  ],
  Tanzania: [
    "Akshardham", "Dar es Salaam", "Arusha", "Mwanza", "Zanzibar City",
    "Dodoma", "Moshi", "Tanga", "Morogoro", "Mbeya", "Iringa", "Kigoma",
    "Songea", "Tabora", "Musoma", "Shinyanga", "Sumbawanga", "Lindi", "Singida", "Bukoba"
  ],
  Malawi: [
    "Lilongwe", "Blantyre", "Mzuzu", "Zomba", "Kasungu", "Mangochi", "Karonga",
    "Salima", "Nkhotakota", "Liwonde", "Balaka", "Luchenza", "Dedza", "Mchinji",
    "Chikwawa", "Nsanje", "Rumphi"
  ]
};

const COUNTRIES = Object.keys(regionDataset);

export default function UnsubmittedAttendees() {
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedCenter, setSelectedCenter] = useState("");
  const [unsubmittedList, setUnsubmittedList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [copied, setCopied] = useState(false);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sentSet, setSentSet] = useState(new Set());
  const [sending, setSending] = useState(false);

  // Nice notification banner state: { type: 'success' | 'error', message: '' } | null
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  useEffect(() => {
    if (!selectedCountry || !selectedCenter) {
      setUnsubmittedList([]);
      setSelectedIds(new Set());
      setSentSet(new Set());
      return;
    }

    async function fetchData() {
      setLoading(true);
      try {
        const [attendeesRes, feedbackRes, remindersRes] = await Promise.all([
          feedbackApi.attendees(selectedCountry, selectedCenter),
          feedbackApi.list(),
          supabase
            .from("feedback_reminders")
            .select("attendee_name, parent_email")
            .eq("center", selectedCenter)
            .eq("country", selectedCountry)
        ]);

        const allAttendees = attendeesRes.data || [];

        const submitted = new Set(
          (feedbackRes.data || [])
            .filter(f => f.country === selectedCountry && f.center === selectedCenter)
            .map(f => (f.full_name || "").toLowerCase())
        );

        const pending = allAttendees.filter(
          item => !submitted.has((item.full_name || "").toLowerCase())
        );

        const alreadySent = new Set();
        if (remindersRes.data) {
          remindersRes.data.forEach(r => {
            const key = `${(r.attendee_name || "").toLowerCase()}|${(r.parent_email || "").toLowerCase()}`;
            alreadySent.add(key);
          });
        }

        setUnsubmittedList(pending);
        setSentSet(alreadySent);
        setSelectedIds(new Set());
      } catch (err) {
        console.error("Error fetching data:", err);
        setUnsubmittedList([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedCountry, selectedCenter]);

  const availableCenters = selectedCountry ? regionDataset[selectedCountry] || [] : [];

  const filteredList = unsubmittedList.filter((item) =>
    item.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.parent_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allUnsentIds = filteredList
        .filter((item) => {
          const key = `${(item.full_name || "").toLowerCase()}|${(item.parent_email || "").toLowerCase()}`;
          return !sentSet.has(key) && item.parent_email;
        })
        .map((item, idx) => item.id || idx);
      setSelectedIds(new Set(allUnsentIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSendReminders = async () => {
    if (selectedIds.size === 0) {
      showNotification("Please select at least one recipient with an email.", "error");
      return;
    }

    setSending(true);
    try {
      const targets = filteredList.filter((item, idx) => selectedIds.has(item.id || idx));
      
      const { error } = await supabase.functions.invoke("send-feedback-email", {
        body: {
          country: selectedCountry,
          center: selectedCenter,
          recipients: targets.map(t => ({
            name: t.full_name,
            email: t.parent_email,
            center: t.center || selectedCenter
          }))
        }
      });

      if (error) throw new Error(error.message || "Failed to send");

      const newSent = new Set(sentSet);
      targets.forEach(t => {
        const key = `${(t.full_name || "").toLowerCase()}|${(t.parent_email || "").toLowerCase()}`;
        newSent.add(key);
      });
      setSentSet(newSent);
      setSelectedIds(new Set());

      showNotification(`Successfully sent reminder emails to ${targets.length} parent(s)! 🚀`);
    } catch (err) {
      console.error("Error dispatching reminders:", err);
      showNotification("Failed to send reminders: " + err.message, "error");
    } finally {
      setSending(false);
    }
  };

  const handleResetSent = async () => {
    if (!window.confirm("Are you sure you want to clear the database sent history for this center?")) return;
    
    try {
      const { error } = await supabase
        .from("feedback_reminders")
        .delete()
        .eq("center", selectedCenter)
        .eq("country", selectedCountry);

      if (error) throw error;

      setSentSet(new Set());
      setSelectedIds(new Set());
      showNotification("Sent records cleared successfully for this center.");
    } catch (err) {
      console.error("Error clearing sent history:", err);
      showNotification("Failed to clear history: " + err.message, "error");
    }
  };

  const handleCopyEmails = () => {
    const emails = filteredList
      .filter((item) => {
        const key = `${(item.full_name || "").toLowerCase()}|${(item.parent_email || "").toLowerCase()}`;
        return !sentSet.has(key);
      })
      .map((item) => item.parent_email)
      .filter(Boolean)
      .join(", ");

    if (!emails) {
      showNotification("No unsent parent email addresses found for this filtered list.", "error");
      return;
    }

    navigator.clipboard.writeText(emails);
    setCopied(true);
    showNotification("Active unsent emails copied to clipboard! 📋");
    setTimeout(() => setCopied(false), 3000);
  };

  const handleExportCSV = () => {
    if (filteredList.length === 0) {
      showNotification("No data to export.", "error");
      return;
    }

    const headers = ["Full Name", "Category", "Country", "Center", "Parent Email", "Status"];
    const rows = filteredList.map((i) => {
      const key = `${(i.full_name || "").toLowerCase()}|${(i.parent_email || "").toLowerCase()}`;
      const isSent = sentSet.has(key);
      return [
        `"${i.full_name || ""}"`,
        `"${i.category || ""}"`,
        `"${i.country || selectedCountry}"`,
        `"${i.center || selectedCenter}"`,
        `"${i.parent_email || ""}"`,
        `"${isSent ? "Sent" : "Pending"}"`,
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `unsubmitted_attendees_${selectedCenter || "all"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification("CSV export downloaded successfully! 📥");
  };

  return (
    <div className={styles.wrapper}>
      {/* Sleek Notification Banner */}
      {notification && (
        <div style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "16px 22px",
          backgroundColor: notification.type === "error" ? "#FDEDED" : "#EDF7ED",
          color: notification.type === "error" ? "#5F2120" : "#1E4620",
          border: `1px solid ${notification.type === "error" ? "#F5C6CB" : "#C3E6CB"}`,
          borderRadius: "12px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          fontFamily: "'Nunito', sans-serif",
          fontWeight: 700,
          fontSize: "14px",
          animation: "slideIn 0.3s ease-out"
        }}>
          {notification.type === "error" ? (
            <FaTriangleExclamation size={18} style={{ color: "#D32F2F" }} />
          ) : (
            <FaCircleCheck size={18} style={{ color: "#2E7D32" }} />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.header}>
          <h2>Pending Feedback Tracker</h2>
          <p>View attendees who haven't submitted feedback and dispatch batch reminders via Resend.</p>
        </div>

        <div className={styles.filterRow}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Select Country</label>
            <select
              className={styles.select}
              value={selectedCountry}
              onChange={(e) => {
                setSelectedCountry(e.target.value);
                setSelectedCenter("");
              }}
            >
              <option value="">-- Choose Country --</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Select Center</label>
            <select
              className={styles.select}
              value={selectedCenter}
              disabled={!selectedCountry}
              onChange={(e) => setSelectedCenter(e.target.value)}
            >
              <option value="">-- Choose Center --</option>
              {availableCenters.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {selectedCenter && (
          <div className={styles.actionsBar}>
            <div className={styles.searchWrapper}>
              <FaMagnifyingGlass className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search by name or parent email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className={styles.actionButtons}>
              <button 
                className={styles.primaryBtn} 
                onClick={handleSendReminders}
                disabled={selectedIds.size === 0 || sending}
              >
                <FaEnvelope /> {sending ? "Sending..." : `Send Reminders (${selectedIds.size})`}
              </button>

              {sentSet.size > 0 && (
                <button 
                  className={styles.secondaryBtn} 
                  onClick={handleResetSent}
                  title="Clear database sent history for this center"
                >
                  <FaRotateLeft /> Reset Sent ({sentSet.size})
                </button>
              )}

              <button className={styles.secondaryBtn} onClick={handleCopyEmails}>
                <FaEnvelope /> {copied ? "Emails Copied!" : "Copy Active Emails"}
              </button>
              <button className={styles.secondaryBtn} onClick={handleExportCSV}>
                <FaDownload /> Export CSV
              </button>
            </div>
          </div>
        )}

        <div className={styles.tableContainer}>
          {!selectedCenter ? (
            <div className={styles.placeholderState}>
              <FaUserXmark size={32} />
              <p>Please select a country and center above to view pending submissions.</p>
            </div>
          ) : loading ? (
            <div className={styles.placeholderState}>
              <p>Loading pending attendees...</p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className={styles.placeholderState}>
              <p>🎉 Everyone from this center has submitted their feedback!</p>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: "40px" }}>
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={
                        filteredList.length > 0 &&
                        filteredList.every((item) => {
                          const key = `${(item.full_name || "").toLowerCase()}|${(item.parent_email || "").toLowerCase()}`;
                          return sentSet.has(key) || selectedIds.has(item.id || filteredList.indexOf(item));
                        })
                      }
                    />
                  </th>
                  <th>Full Name</th>
                  <th>Category</th>
                  <th>Center</th>
                  <th>Parent Email Address</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((item, idx) => {
                  const uniqueId = item.id || idx;
                  const key = `${(item.full_name || "").toLowerCase()}|${(item.parent_email || "").toLowerCase()}`;
                  const isSent = sentSet.has(key);
                  const isSelected = selectedIds.has(uniqueId);

                  return (
                    <tr 
                      key={uniqueId} 
                      className={isSent ? styles.fadedRow : ""}
                    >
                      <td>
                        {!isSent && item.parent_email && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(uniqueId)}
                          />
                        )}
                      </td>
                      <td className={styles.boldText}>{item.full_name}</td>
                      <td>
                        <span className={styles.badge}>{item.category || "Balak/Balika"}</span>
                      </td>
                      <td>{item.center}</td>
                      <td className={styles.emailText}>{item.parent_email || "No parent email provided"}</td>
                      <td>
                        {isSent ? (
                          <span className={styles.sentBadge}>
                            <FaCheck size={10} /> Sent
                          </span>
                        ) : (
                          <span className={styles.pendingBadge}>Pending</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}