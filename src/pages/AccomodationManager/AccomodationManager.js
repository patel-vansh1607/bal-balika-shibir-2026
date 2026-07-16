import React, { useState, useEffect, useCallback } from "react";
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
import { attendees as attendeesApi, karayakars as karayakarsApi } from "../../apiClient"; // Imported both API endpoints
import styles from "./AccomodationManager.module.css";

const REGIONS = ['Kenya', 'Tanzania', 'Uganda', 'Zambia', 'Malawi', 'Botswana', 'South Africa'];

export default function AccommodationManager({ onBack, regionScope: initialRegionScope }) {
  // Toggle State 1: Target group ('karyakars' or 'children')
  const [targetGroup, setTargetGroup] = useState("karyakars");
  
  // Toggle State 2: Active Region
  const [regionScope, setRegionScope] = useState(initialRegionScope || "Kenya");

  const [attendees, setAttendees] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [centerFilter, setCenterFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Track temporary state changes for unsaved inputs
  const [editedRooms, setEditedRooms] = useState({});
  const [savingIds, setSavingIds] = useState({});
  const [savedNotifications, setSavedNotifications] = useState({});

  // Memoize data fetching to avoid recreation loops
  const fetchAttendees = useCallback(() => {
    setLoading(true);
    setAttendees([]); // Clear list on change
    setEditedRooms({}); // Reset unsaved inputs
    
    const queryParams = regionScope && regionScope !== "All" ? { region: regionScope } : {};
    
    // Choose correct API and fetch method depending on Group toggle
    let fetchPromise;
    if (targetGroup === "karyakars") {
      fetchPromise = karayakarsApi.list(queryParams);
    } else {
      fetchPromise = typeof attendeesApi.list === "function"
        ? attendeesApi.list(queryParams)
        : typeof attendeesApi.getAll === "function"
          ? attendeesApi.getAll(queryParams)
          : attendeesApi.get(queryParams);
    }

    fetchPromise
      .then((res) => {
        const data = res?.data || res;
        const list = Array.isArray(data) ? data : data.attendees || [];
        setAttendees(list);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching rosters:", err);
        setError("Failed to load members list.");
        setLoading(false);
      });
  }, [regionScope, targetGroup]);

  useEffect(() => {
    fetchAttendees();
  }, [fetchAttendees]);

  // Clean format helper ensuring Member ID is correctly formatted on the UI output
  const formatMemberId = (person) => {
    const rawId = person.member_id;
    if (!rawId) {
      // Default ID formats based on group
      return targetGroup === "karyakars" ? `KP-${person.id}` : `MTRC-${person.id}`;
    }
    const strId = String(rawId).trim();
    if (strId.toUpperCase().startsWith('PS-')) {
      return strId.toUpperCase();
    }
    return `PS-${strId}`;
  };

  // Pre-fills input fields with "PS-" upon typing or focusing an empty value
  const handleRoomChange = (id, rawValue) => {
    let formattedValue = rawValue;

    if (rawValue.trim() !== "") {
      const upperVal = rawValue.toUpperCase();
      if (!upperVal.startsWith("PS-")) {
        if (upperVal.startsWith("PS")) {
          formattedValue = "PS-" + rawValue.slice(2);
        } else {
          formattedValue = "PS-" + rawValue;
        }
      }
    }

    setEditedRooms(prev => ({
      ...prev,
      [id]: formattedValue
    }));
  };

  const handleInputFocus = (id, currentValue) => {
    // Pre-fill "PS-" on focus if there is currently no value typed or saved
    if (!currentValue && (!editedRooms[id] || editedRooms[id] === "")) {
      setEditedRooms(prev => ({
        ...prev,
        [id]: "PS-"
      }));
    }
  };

  // Save single attendee's accommodation safely matching the DB schema keys
  const handleSaveRoom = (id) => {
    const rawValue = editedRooms[id];
    if (rawValue === undefined) return; // No edits made

    // Convert empty or only "PS-" drafts to null for a clean database state
    const cleanRoom = rawValue.trim() === "" || rawValue.trim() === "PS-" ? null : rawValue.trim().toUpperCase();
    
    setSavingIds(prev => ({ ...prev, [id]: true }));

    const payload = {
      accomodation: cleanRoom,      // Single 'c' spelling
      accommodation: cleanRoom,     // Double 'c' spelling
      room: cleanRoom               // Generic fallback option
    };

    const updatePromise = targetGroup === "karyakars"
      ? karayakarsApi.update(id, payload)
      : attendeesApi.update(id, payload);

    updatePromise
      .then(() => {
        // Update local status with the newly saved accommodation
        setAttendees(prev => prev.map(p => {
          if (p.id === id) {
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
        alert("Could not update accommodation database. Please check network connection.");
        setSavingIds(prev => ({ ...prev, [id]: false }));
      });
  };

  const handleKeyDown = (e, id) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveRoom(id);
      e.target.blur();
    }
  };

  const uniqueCenters = [...new Set(attendees.map(p => p.center).filter(Boolean))].sort();

  const filteredAttendees = attendees.filter(p => {
    const currentRoom = p.accomodation || p.accommodation || "";
    const nameToSearch = p.name || p.full_name || ""; // fallback matching for Karyakar 'full_name' scheme
    const calculatedId = formatMemberId(p);

    const matchesSearch = 
      nameToSearch.toLowerCase().includes(searchQuery.toLowerCase()) ||
      calculatedId.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
          <h2 className={styles.title}>Accommodation Management Hub</h2>
          <p className={styles.subtitle}>
            Manage boarding spaces and room allocations dynamically for your selected groups
          </p>
        </div>
      </div>

      {/* Control Block featuring Double Toggles */}
      <div className={styles.controlRow}>
        <div className={styles.toggleSection}>
          
          {/* Toggle 1: Karyakars vs Children */}
          <div className={styles.toggleGroup}>
            <span className={styles.toggleLabel}>Target Directory</span>
            <div className={styles.toggleSwitchContainer}>
              <button 
                className={`${styles.toggleBtn} ${targetGroup === "karyakars" ? styles.toggleBtnActive : ""}`}
                onClick={() => { setTargetGroup("karyakars"); setCenterFilter("all"); }}
              >
                Karyakars
              </button>
              <button 
                className={`${styles.toggleBtn} ${targetGroup === "children" ? styles.toggleBtnActive : ""}`}
                onClick={() => { setTargetGroup("children"); setCenterFilter("all"); }}
              >
                Children
              </button>
            </div>
          </div>

          {/* Toggle 2: Region Scope selection */}
          <div className={styles.toggleGroup}>
            <span className={styles.toggleLabel}>Active Region Scope</span>
            <div className={styles.toggleSwitchContainer}>
              {REGIONS.map((r) => (
                <button
                  key={r}
                  className={`${styles.toggleBtn} ${regionScope === r ? styles.toggleBtnActive : ""}`}
                  onClick={() => { setRegionScope(r); setCenterFilter("all"); }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Filters and Inputs row */}
        <div className={styles.filterBar}>
          <div className={styles.searchWrapper}>
            <FaSearch className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder={`Search ${targetGroup === "karyakars" ? "Karyakar" : "Child"} Name, ID, or room...`}
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
      </div>

      {loading ? (
        <div className={styles.centerState}>
          <FaSpinner className={styles.spin} size={28} />
          <div>Retrieving accommodation rosters...</div>
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
                <th>Current Accommodation</th>
                <th>Assign Room / Space</th>
                <th className={styles.actionHeader}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendees.length === 0 ? (
                <tr>
                  <td colSpan="6" className={styles.noDataCell}>
                    No records matched current parameters.
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
                      {/* Formatted Member ID column */}
                      <td className={styles.idCell}>
                        {formatMemberId(person)}
                      </td>

                      {/* Full Name */}
                      <td className={styles.nameCell}>
                        {person.name || person.full_name}
                      </td>

                      {/* Center Hub */}
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

                      {/* Edit Input Column with Auto Prefilled "PS-" */}
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