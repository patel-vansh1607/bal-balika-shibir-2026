import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  FaBed, 
  FaSearch, 
  FaSave, 
  FaSpinner, 
  FaCheckCircle, 
  FaMapMarkerAlt,
  FaTimes,
  FaCheck,
  FaClipboardList,
  FaUsers,
} from "react-icons/fa";

import { FaBedPulse } from "react-icons/fa6";
import { attendees as attendeesApi, karayakars as karayakarsApi } from "../../apiClient";
import styles from "./AccomodationManager.module.css";
import toast from "react-hot-toast";

// Assuming you have access to user state (or storage fallback)
export default function AccommodationManager({ 
  onBack, 
  currentRegion,       // Passed down from your routing/auth layout
  userEmail = "", 
  userRole = "", 
  handleLogout, 
  isLoggingOut = false 
}) {

  // 1. Lock the active region strictly to the system's selected region
  const activeRegion = currentRegion || localStorage.getItem("selectedRegion") || "Kenya";

  // Directory State (Karyakars vs Children)
  const [targetGroup, setTargetGroup] = useState("karyakars");

  const [attendees, setAttendees] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [centerFilter, setCenterFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Inline edit states
  const [editedRooms, setEditedRooms] = useState({});
  const [savingIds, setSavingIds] = useState({});
  const [savedNotifications, setSavedNotifications] = useState({});

  // Bulk Assignment State
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkRoomValue, setBulkRoomValue] = useState("");
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  // ID formatting matching the database system keys
  const formatMemberId = useCallback((person) => {
    const rawId = person.member_id;
    if (!rawId) {
      return targetGroup === "karyakars" ? `KP-${person.id}` : `MTRC-${person.id}`;
    }
    const strId = String(rawId).trim();
    if (strId.toUpperCase().startsWith('PS-')) {
      return strId.toUpperCase();
    }
    return `${strId}`;
  }, [targetGroup]);

  // Memoized data fetching locked to activeRegion
  const fetchAttendees = useCallback(() => {
    setLoading(true);
    setAttendees([]); 
    setEditedRooms({});
    setSelectedIds([]);
    setBulkRoomValue("");
    
    // Only query parameters for the enforced region
    const queryParams = { region: activeRegion };
    
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
        setError(`Failed to load members directory for ${activeRegion}.`);
        setLoading(false);
      });
  }, [activeRegion, targetGroup]);

  useEffect(() => {
    fetchAttendees();
  }, [fetchAttendees]);

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
    setEditedRooms(prev => ({ ...prev, [id]: formattedValue }));
  };

  const handleInputFocus = (id, currentValue) => {
    if (!currentValue && (!editedRooms[id] || editedRooms[id] === "")) {
      setEditedRooms(prev => ({ ...prev, [id]: "PS-" }));
    }
  };

  const handleSaveRoom = (id) => {
    const rawValue = editedRooms[id];
    if (rawValue === undefined) return;

    const cleanRoom = rawValue.trim() === "" || rawValue.trim() === "PS-" ? null : rawValue.trim().toUpperCase();
    setSavingIds(prev => ({ ...prev, [id]: true }));

    const payload = {
      accomodation: cleanRoom,      
      accommodation: cleanRoom,     
      room: cleanRoom               
    };

    const updatePromise = targetGroup === "karyakars"
      ? karayakarsApi.update(id, payload)
      : attendeesApi.update(id, payload);

    updatePromise
      .then(() => {
        setAttendees(prev => prev.map(p => {
          if (p.id === id) {
            return { ...p, accomodation: cleanRoom, accommodation: cleanRoom };
          }
          return p;
        }));
        
        setEditedRooms(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });

        setSavedNotifications(prev => ({ ...prev, [id]: true }));
        setTimeout(() => setSavedNotifications(prev => ({ ...prev, [id]: false })), 2000);
        setSavingIds(prev => ({ ...prev, [id]: false }));
        toast.success("Allocation updated successfully!");
      })
      .catch((err) => {
        console.error(err);
        toast.error("Could not update accommodation record.");
        setSavingIds(prev => ({ ...prev, [id]: false }));
      });
  };

  const handleKeyDown = (e, id) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveRoom(id);
      e.target.blur();
    } else if (e.key === "Escape") {
      setEditedRooms(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      e.target.blur();
    }
  };

  // Bulk updates
  const handleToggleSelectAll = (filteredList) => {
    if (selectedIds.length === filteredList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredList.map(p => p.id));
    }
  };

  const handleToggleSelectRow = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkAssign = async () => {
    if (selectedIds.length === 0) return;
    if (!bulkRoomValue.trim() || bulkRoomValue === "PS-") {
      return toast.error("Please provide a valid Room code/name");
    }

    const cleanRoom = bulkRoomValue.trim().toUpperCase();
    setIsBulkSaving(true);

    try {
      const payload = {
        accomodation: cleanRoom,
        accommodation: cleanRoom,
        room: cleanRoom
      };

      const updatePromises = selectedIds.map(id => {
        return targetGroup === "karyakars"
          ? karayakarsApi.update(id, payload)
          : attendeesApi.update(id, payload);
      });

      await Promise.all(updatePromises);

      setAttendees(prev => prev.map(p => {
        if (selectedIds.includes(p.id)) {
          return { ...p, accomodation: cleanRoom, accommodation: cleanRoom };
        }
        return p;
      }));

      setSelectedIds([]);
      setBulkRoomValue("");
      toast.success(`Successfully assigned ${selectedIds.length} members to ${cleanRoom}!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save assignments to all selected records");
    } finally {
      setIsBulkSaving(false);
    }
  };

  const handleBulkRoomChange = (rawValue) => {
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
    setBulkRoomValue(formattedValue);
  };

  // Memoized UI layout structures
  const uniqueCenters = useMemo(() => {
    return [...new Set(attendees.map(p => p.center).filter(Boolean))].sort();
  }, [attendees]);

  const filteredAttendees = useMemo(() => {
    return attendees.filter(p => {
      const currentRoom = p.accomodation || p.accommodation || "";
      const nameToSearch = p.name || p.full_name || ""; 
      const calculatedId = formatMemberId(p);

      const matchesSearch = 
        nameToSearch.toLowerCase().includes(searchQuery.toLowerCase()) ||
        calculatedId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        currentRoom.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCenter = centerFilter === "all" || p.center === centerFilter;

      return matchesSearch && matchesCenter;
    });
  }, [attendees, searchQuery, centerFilter, formatMemberId]);

  const stats = useMemo(() => {
    const total = filteredAttendees.length;
    const assigned = filteredAttendees.filter(p => p.accomodation || p.accommodation).length;
    const unassigned = total - assigned;
    return { total, assigned, unassigned };
  }, [filteredAttendees]);

  return (
    <div className={styles.dashboardContainer}>
    
      {/* Main Accommodation Area */}
      <div className={styles.managerContainer}>

        {/* Filters and Control Blocks */}
        <div className={styles.controlRow}>
          <div className={styles.toggleSection}>
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
          </div>

          {/* Real-time statistics */}
          <div className={styles.statsBentoGrid}>
            <div className={styles.statCard}>
              <div className={styles.statMeta}>
                <span className={styles.statLabel}>Active Pool</span>
                <FaUsers className={styles.statIcon} />
              </div>
              <span className={styles.statValue}>{stats.total}</span>
            </div>
            <div className={styles.statCard} style={{ borderColor: 'rgba(72,187,120,0.3)' }}>
              <div className={styles.statMeta}>
                <span className={styles.statLabel} style={{ color: '#68d391' }}>Assigned</span>
                <FaCheck className={styles.statIcon} style={{ color: '#68d391' }} />
              </div>
              <span className={styles.statValue} style={{ color: '#68d391' }}>{stats.assigned}</span>
            </div>
            <div className={styles.statCard} style={{ borderColor: 'rgba(237,137,54,0.3)' }}>
              <div className={styles.statMeta}>
                <span className={styles.statLabel} style={{ color: '#f6ad55' }}>Pending</span>
                <FaBedPulse className={styles.statIcon} style={{ color: '#f6ad55' }} />
              </div>
              <span className={styles.statValue} style={{ color: '#f6ad55' }}>{stats.unassigned}</span>
            </div>
          </div>

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

        {/* Bulk Action Panel */}
        {selectedIds.length > 0 && (
          <div className={styles.bulkActionPanel}>
            <div className={styles.bulkMeta}>
              <FaClipboardList className={styles.bulkIcon} />
              <span><strong>{selectedIds.length}</strong> selected for bulk update</span>
            </div>
            <div className={styles.bulkForm}>
              <input 
                type="text"
                placeholder="Enter Bulk Room e.g. PS-102"
                value={bulkRoomValue}
                onFocus={() => { if(!bulkRoomValue) setBulkRoomValue("PS-"); }}
                onChange={(e) => handleBulkRoomChange(e.target.value)}
                className={styles.bulkInput}
              />
              <button onClick={handleBulkAssign} className={styles.bulkSubmitBtn} disabled={isBulkSaving}>
                {isBulkSaving ? <FaSpinner className={styles.spin} /> : "Assign to Room"}
              </button>
              <button onClick={() => setSelectedIds([])} className={styles.bulkCancelBtn}>
                Deselect
              </button>
            </div>
          </div>
        )}

        {/* Table Render Roster */}
        {loading ? (
          <div className={styles.centerState}>
            <FaSpinner className={styles.spin} size={28} />
            <div>Fetching live rosters for {activeRegion}...</div>
          </div>
        ) : error ? (
          <div className={styles.errorState}>{error}</div>
        ) : (
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: "40px" }} className={styles.checkboxCol}>
                    <input 
                      type="checkbox"
                      className={styles.styledCheckbox}
                      checked={filteredAttendees.length > 0 && selectedIds.length === filteredAttendees.length}
                      onChange={() => handleToggleSelectAll(filteredAttendees)}
                    />
                  </th>
                  <th>ID</th>
                  <th>Full Name</th>
                  <th>Center</th>
                  <th>Accommodation Space</th>
                  <th>Assign Room</th>
                  <th className={styles.actionHeader}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendees.length === 0 ? (
                  <tr>
                    <td colSpan="7" className={styles.noDataCell}>
                      No records matched the selected query parameters.
                    </td>
                  </tr>
                ) : (
                  filteredAttendees.map(person => {
                    const currentRoom = person.accomodation || person.accommodation || "";
                    const draftRoomValue = editedRooms[person.id] !== undefined ? editedRooms[person.id] : currentRoom;
                    const isModified = editedRooms[person.id] !== undefined && editedRooms[person.id] !== currentRoom;
                    const isSaving = savingIds[person.id];
                    const wasSaved = savedNotifications[person.id];
                    const isChecked = selectedIds.includes(person.id);

                    return (
                      <tr key={person.id} className={`${isModified ? styles.modifiedRow : ""} ${isChecked ? styles.selectedRow : ""}`}>
                        <td className={styles.checkboxCol}>
                          <input 
                            type="checkbox"
                            className={styles.styledCheckbox}
                            checked={isChecked}
                            onChange={() => handleToggleSelectRow(person.id)}
                          />
                        </td>
                        <td className={styles.idCell}>{formatMemberId(person)}</td>
                        <td className={styles.nameCell}>{person.name || person.full_name}</td>
                        <td>
                          <span className={styles.centerTag}>
                            <FaMapMarkerAlt /> {person.center || "—"}
                          </span>
                        </td>
                        <td>
                          {currentRoom ? (
                            <span className={styles.currentRoomTag}>
                              <FaBed /> {currentRoom}
                            </span>
                          ) : (
                            <span className={styles.noRoomTag}>Unassigned</span>
                          )}
                        </td>
                        <td>
                          <div className={styles.inputWrapper}>
                            <input
                              type="text"
                              placeholder="Type Room..."
                              className={styles.roomInput}
                              value={draftRoomValue}
                              onFocus={() => handleInputFocus(person.id, currentRoom)}
                              onChange={(e) => handleRoomChange(person.id, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, person.id)}
                              disabled={isSaving}
                            />
                            {draftRoomValue && (
                              <button className={styles.clearBtn} onClick={() => handleRoomChange(person.id, "")}>
                                <FaTimes />
                              </button>
                            )}
                          </div>
                        </td>
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
    </div>
  );
}