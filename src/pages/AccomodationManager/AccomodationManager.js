import React, { useState, useEffect } from "react";
import { 
  FaArrowLeft, 
  FaBed, 
  FaSearch, 
  FaSave, 
  FaSpinner, 
  FaCheckCircle, 
  FaMapMarkerAlt,
  FaTimes
} from "react-icons/fa";
import { attendees as attendeesApi } from "../../apiClient";
import styles from "./AccomodationManager.module.css";

export default function AccommodationManager({ onBack, regionScope }) {
  const [attendees, setAttendees] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [centerFilter, setCenterFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Track temporary state changes for unsaved inputs
  const [editedRooms, setEditedRooms] = useState({});
  const [savingIds, setSavingIds] = useState({});
  const [savedNotifications, setSavedNotifications] = useState({});

  useEffect(() => {
    fetchAttendees();
  }, [regionScope]);

  const fetchAttendees = () => {
    setLoading(true);
    const queryParams = regionScope && regionScope !== "All" ? { region: regionScope } : {};
    
    const fetchPromise = typeof attendeesApi.list === "function"
      ? attendeesApi.list(queryParams)
      : typeof attendeesApi.getAll === "function"
        ? attendeesApi.getAll(queryParams)
        : attendeesApi.get(queryParams);

    fetchPromise
      .then((res) => {
        const data = res?.data || res;
        const list = Array.isArray(data) ? data : data.attendees || [];
        setAttendees(list);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching attendees:", err);
        setError("Failed to load attendees list.");
        setLoading(false);
      });
  };

  // Pre-fills input fields with "PS-" upon typing or focusing an empty value
  const handleRoomChange = (id, rawValue) => {
    let formattedValue = rawValue;

    if (rawValue.trim() !== "") {
      const upperVal = rawValue.toUpperCase();
      // Ensure the value starts with "PS-"
      if (!upperVal.startsWith("PS-")) {
        // If they just typed a number or letter, prepend 'PS-'
        if (upperVal.startsWith("PS")) {
          formattedValue = "PS-" + rawValue.slice(2);
        } else {
          formattedValue = "PS-" + rawValue;
        }
      } else {
        formattedValue = "PS-" + rawValue.slice(3);
      }
    }

    setEditedRooms(prev => ({
      ...prev,
      [id]: formattedValue
    }));
  };

  const handleInputFocus = (id, currentValue) => {
    // If there is no current assignment, pre-fill "PS-" on focus for faster data entry
    if (!currentValue && (!editedRooms[id] || editedRooms[id] === "")) {
      setEditedRooms(prev => ({
        ...prev,
        [id]: "PS-"
      }));
    }
  };

  // Save single attendee's accommodation safely matching the DB schema key
  const handleSaveRoom = (id) => {
    const rawValue = editedRooms[id];
    if (rawValue === undefined) return; // No edits made

    // Convert empty or only "PS-" drafts to null for a clean database state
    const cleanRoom = rawValue.trim() === "" || rawValue.trim() === "PS-" ? null : rawValue.trim().toUpperCase();
    
    setSavingIds(prev => ({ ...prev, [id]: true }));

    // Send alternative spellings to guarantee the backend validation middleware captures the correct one
    const payload = {
      accomodation: cleanRoom,      // Single 'c' spelling
      accommodation: cleanRoom,     // Double 'c' spelling
      room: cleanRoom               // Generic alternative fallback
    };

    attendeesApi.update(id, payload)
      .then(() => {
        // Update local status with the newly saved accommodation
        setAttendees(prev => prev.map(p => {
          if (p.id === id) {
            // Keep local object properties updated (binding both variations)
            return { 
              ...p, 
              accomodation: cleanRoom,
              accommodation: cleanRoom 
            };
          }
          return p;
        }));
        
        // Remove from pending edited changes list
        setEditedRooms(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });

        // Show confirmation badge
        setSavedNotifications(prev => ({ ...prev, [id]: true }));
        setTimeout(() => {
          setSavedNotifications(prev => ({ ...prev, [id]: false }));
        }, 2000);

        setSavingIds(prev => ({ ...prev, [id]: false }));
      })
      .catch((err) => {
        console.error("Failed to save room details:", err);
        alert("Could not update accommodation database. Please check your network connection.");
        setSavingIds(prev => ({ ...prev, [id]: false }));
      });
  };

  // Triggers immediate save when Enter is pressed
  const handleKeyDown = (e, id) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveRoom(id);
      e.target.blur(); // Blur the input field to visually indicate action completed
    }
  };

  // Extract list of unique registration centers for clean drop-down filters
  const uniqueCenters = [...new Set(attendees.map(p => p.center).filter(Boolean))].sort();

  // Filter list by name, member id, center, or room text
  const filteredAttendees = attendees.filter(p => {
    const currentRoom = p.accomodation || p.accommodation || "";
    const matchesSearch = 
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.member_id || `MTRC-${p.id}`).toLowerCase().includes(searchQuery.toLowerCase()) ||
      currentRoom.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCenter = centerFilter === "all" || p.center === centerFilter;

    return matchesSearch && matchesCenter;
  });

  return (
    <div className={styles.managerContainer}>
      {/* Header Controls */}
      <div className={styles.header}>
        <button onClick={onBack} className={styles.backBtn}>
          <FaArrowLeft /> Back
        </button>
        <div className={styles.titleArea}>
          <h2 className={styles.title}>Accomodation Management</h2>
          <p className={styles.subtitle}>
            Manage regional boarding spaces and room allocations for <strong>{regionScope || "Kenya"}</strong>
          </p>
        </div>
      </div>

      {/* Filters & Actions Panel */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <FaSearch className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search Name, ID, or current room..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          className={styles.filterSelect}
          value={centerFilter}
          onChange={(e) => setCenterFilter(e.target.value)}
        >
          <option value="all">All Centers</option>
          {uniqueCenters.map(center => (
            <option key={center} value={center}>{center}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className={styles.centerState}>
          <FaSpinner className={styles.spin} size={28} />
          <div>Retrieving allocation rosters...</div>
        </div>
      ) : error ? (
        <div className={styles.errorState}>{error}</div>
      ) : (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Full Name</th>
                <th>Center</th>
                <th>Current Accomodation</th>
                <th>Assign Room / Space</th>
                <th className={styles.actionHeader}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendees.length === 0 ? (
                <tr>
                  <td colSpan="6" className={styles.noDataCell}>
                    No records matched the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAttendees.map(person => {
                  const currentRoom = person.accomodation || person.accommodation || "";
                  const draftRoomValue = editedRooms[person.id] !== undefined ? editedRooms[person.id] : currentRoom;
                  const isModified = editedRooms[person.id] !== undefined && editedRooms[person.id] !== currentRoom;
                  const isSaving = savingIds[person.id];
                  const wasSaved = savedNotifications[person.id];

                  return (
                    <tr key={person.id} className={isModified ? styles.modifiedRow : ""}>
                      {/* Member ID */}
                      <td className={styles.idCell}>
                        {person.member_id || `MTRC-${person.id}`}
                      </td>

                      {/* Full Name */}
                      <td className={styles.nameCell}>
                        {person.name}
                      </td>

                      {/* Center */}
                      <td>
                        <span className={styles.centerTag}>
                          <FaMapMarkerAlt /> {person.center || "—"}
                        </span>
                      </td>

                      {/* Current Status Column */}
                      <td>
                        {currentRoom ? (
                          <span className={styles.currentRoomTag}>
                            <FaBed /> {currentRoom}
                          </span>
                        ) : (
                          <span className={styles.noRoomTag}>Unassigned</span>
                        )}
                      </td>

                      {/* Edit Input Column with Auto Prefilled "PS-" & Enter to Save */}
                      <td>
                        <div className={styles.inputWrapper}>
                          <input
                            type="text"
                            placeholder="Type Room No / Block..."
                            className={styles.roomInput}
                            value={draftRoomValue}
                            onFocus={() => handleInputFocus(person.id, currentRoom)}
                            onChange={(e) => handleRoomChange(person.id, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, person.id)}
                            disabled={isSaving}
                          />
                          {draftRoomValue && (
                            <button 
                              className={styles.clearBtn} 
                              onClick={() => handleRoomChange(person.id, "")}
                              title="Clear Input"
                            >
                              <FaTimes />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Actions Column */}
                      <td className={styles.actionCell}>
                        {isSaving ? (
                          <span className={styles.savingTag}>
                            <FaSpinner className={styles.spin} /> Saving...
                          </span>
                        ) : wasSaved ? (
                          <span className={styles.savedTag}>
                            <FaCheckCircle /> Saved
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSaveRoom(person.id)}
                            className={`${styles.saveBtn} ${isModified ? styles.activeSave : ""}`}
                            disabled={!isModified}
                          >
                            <FaSave /> Save
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}