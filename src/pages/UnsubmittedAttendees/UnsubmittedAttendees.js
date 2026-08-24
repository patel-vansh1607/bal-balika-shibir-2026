import React, { useState, useEffect } from "react";
import { FaMagnifyingGlass, FaEnvelope, FaDownload, FaUserXmark } from "react-icons/fa6";
import { feedback as feedbackApi } from "../../apiClient";
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
};

const COUNTRIES = Object.keys(regionDataset);

export default function UnsubmittedAttendees() {
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedCenter, setSelectedCenter] = useState("");
  const [unsubmittedList, setUnsubmittedList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchUnsubmitted() {
      if (!selectedCountry || !selectedCenter) {
        setUnsubmittedList([]);
        return;
      }

      setLoading(true);
      try {
        const [attendeesRes, feedbackRes] = await Promise.all([
          feedbackApi.attendees(selectedCountry, selectedCenter),
          feedbackApi.list(),
        ]);

        const allAttendees = attendeesRes.data || [];

        // Build set of names that already submitted for this country+center
        const submitted = new Set(
          (feedbackRes.data || [])
            .filter(f => f.country === selectedCountry && f.center === selectedCenter)
            .map(f => (f.full_name || "").toLowerCase())
        );

        const pending = allAttendees.filter(
          item => !submitted.has((item.full_name || "").toLowerCase())
        );

        setUnsubmittedList(pending);
      } catch (err) {
        console.error("Error fetching unsubmitted attendees:", err);
        setUnsubmittedList([]);
      } finally {
        setLoading(false);
      }
    }

    fetchUnsubmitted();
  }, [selectedCountry, selectedCenter]);

  const availableCenters = selectedCountry ? regionDataset[selectedCountry] || [] : [];

  const filteredList = unsubmittedList.filter((item) =>
    item.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.parent_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopyEmails = () => {
    const emails = filteredList
      .map((item) => item.parent_email)
      .filter(Boolean)
      .join(", ");

    if (!emails) {
      alert("No parent email addresses found for this filtered list.");
      return;
    }

    navigator.clipboard.writeText(emails);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleExportCSV = () => {
    if (filteredList.length === 0) return alert("No data to export.");

    const headers = ["Full Name", "Category", "Country", "Center", "Parent Email"];
    const rows = filteredList.map((i) => [
      `"${i.full_name || ""}"`,
      `"${i.category || ""}"`,
      `"${i.country || selectedCountry}"`,
      `"${i.center || selectedCenter}"`,
      `"${i.parent_email || ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `unsubmitted_attendees_${selectedCenter || "all"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h2>Pending Feedback Tracker</h2>
          <p>View and manage attendees who haven't submitted their Shibir feedback yet.</p>
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
              <button className={styles.secondaryBtn} onClick={handleCopyEmails}>
                <FaEnvelope /> {copied ? "Emails Copied!" : "Copy Parent Emails"}
              </button>
              <button className={styles.primaryBtn} onClick={handleExportCSV}>
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
                  <th>Full Name</th>
                  <th>Category</th>
                  <th>Center</th>
                  <th>Parent Email Address</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((item, idx) => (
                  <tr key={idx}>
                    <td className={styles.boldText}>{item.full_name}</td>
                    <td>
                      <span className={styles.badge}>{item.category || "Balak/Balika"}</span>
                    </td>
                    <td>{item.center}</td>
                    <td className={styles.emailText}>{item.parent_email || "No parent email provided"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
