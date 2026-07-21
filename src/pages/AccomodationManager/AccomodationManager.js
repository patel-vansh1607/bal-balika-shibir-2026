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
  FaUsers
} from "react-icons/fa";

import { FaBedPulse } from "react-icons/fa6";
import { attendees as attendeesApi, karayakars as karayakarsApi } from "../../apiClient";
import styles from "./AccomodationManager.module.css";
import toast from "react-hot-toast";

export default function AccommodationManager({ 
  onBack, 
  currentRegion,       
  userEmail = "", 
  userRole = "", 
  handleLogout, 
  isLoggingOut = false 
}) {

  const cleanRegion = (reg) => {
    if (!reg) return localStorage.getItem("selectedRegion") || "Kenya";
    const str = String(reg).trim();
    const basePart = str.split(/[_-\s]+/)[0];
    if (!basePart) return "Kenya";
    return basePart.charAt(0).toUpperCase() + basePart.slice(1).toLowerCase();
  };

  const activeRegion = cleanRegion(currentRegion);

  const [targetGroup, setTargetGroup] = useState("karyakars");
  const [attendees, setAttendees] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [centerFilter, setCenterFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [editedRooms, setEditedRooms] = useState({});
  const [savingIds, setSavingIds] = useState({});
  const [savedNotifications, setSavedNotifications] = useState({});

  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkRoomValue, setBulkRoomValue] = useState("");
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  const roomOptions = useMemo(() => {
    const list = [];
    for (let floor = 1; floor <= 7; floor++) {
      for (let roomNum = 1; roomNum <= 4; roomNum++) {
        list.push(`PS-${floor}0${roomNum}`);
      }
    }
    for (let floor = 8; floor <= 11; floor++) {
      list.push(`PS-${floor}th Floor`);
    }
    return list;
  }, []);

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

  const cleanCenterName = (val) => {
    if (!val) return "Unknown";
    const str = String(val).trim();
    const basePart = str.split(/[_-\s]+/)[0];
    if (!basePart) return "Unknown";
    return basePart.charAt(0).toUpperCase() + basePart.slice(1).toLowerCase();
  };

  const fetchAttendees = useCallback(() => {
    setLoading(true);
    setAttendees([]); 
    setEditedRooms({});
    setSelectedIds([]);
    setBulkRoomValue("");
    
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
    if (rawValue.trim() !== "" && rawValue !== "__CUSTOM__") {
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
      return toast.error("Please select or enter a valid Room code");
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

  const uniqueCenters = useMemo(() => {
    const centersSet = new Set();
    attendees.forEach(p => {
      if (p.center) centersSet.add(cleanCenterName(p.center));
    });
    return [...centersSet].sort();
  }, [attendees]);

  const filteredAttendees = useMemo(() => {
    return attendees.filter(p => {
      const currentRoom = p.accomodation || p.accommodation || "";
      const nameToSearch = p.name || p.full_name || ""; 
      const calculatedId = formatMemberId(p);
      const personCenter = cleanCenterName(p.center || "");
      
      const rawGender = String(p.gender || p.sex || p.sanch || p.category || "").trim().toLowerCase();

      const matchesSearch = 
        nameToSearch.toLowerCase().includes(searchQuery.toLowerCase()) ||
        calculatedId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        currentRoom.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCenter = centerFilter === "all" || personCenter === centerFilter;

      let matchesGender = true;
      if (genderFilter !== "all") {
        if (genderFilter === "male") {
          matchesGender = rawGender === "m" || rawGender === "male" || rawGender.startsWith("m") || rawGender.includes("kishore") || rawGender.includes("yuvak");
        } else if (genderFilter === "female") {
          matchesGender = rawGender === "f" || rawGender === "female" || rawGender.startsWith("f") || rawGender.includes("kishori") || rawGender.includes("mahila");
        }
      }

      return matchesSearch && matchesCenter && matchesGender;
    });
  }, [attendees, searchQuery, centerFilter, genderFilter, formatMemberId]);

  const stats = useMemo(() => {
    const total = filteredAttendees.length;
    const assigned = filteredAttendees.filter(p => p.accomodation || p.accommodation).length;
    const unassigned = total - assigned;
    return { total, assigned, unassigned };
  }, [filteredAttendees]);

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.managerContainer}>

        {/* Filters and Control Blocks */}
        <div className={styles.controlRow}>
          <div className={styles.toggleSection}>
            <div className={styles.toggleGroup}>
              <span className={styles.toggleLabel}>Target Directory</span>
              <div className={styles.toggleSwitchContainer}>
                <button 
                  className={`${styles.toggleBtn} ${targetGroup === "karyakars" ? styles.toggleBtnActive : ""}`}
                  onClick={() => { setTargetGroup("karyakars"); setCenterFilter("all"); setGenderFilter("all"); }}
                >
                  Karyakars
                </button>
                <button 
                  className={`${styles.toggleBtn} ${targetGroup === "children" ? styles.toggleBtnActive : ""}`}
                  onClick={() => { setTargetGroup("children"); setCenterFilter("all"); setGenderFilter("all"); }}
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
            <div className={styles.statCard} style={{ borderColor: 'rgba(231,133,36,0.2)' }}>
              <div className={styles.statMeta}>
                <span className={styles.statLabel} style={{ color: '#e78524' }}>Assigned</span>
                <FaCheck className={styles.statIcon} style={{ color: '#e78524' }} />
              </div>
              <span className={styles.statValue} style={{ color: '#e78524' }}>{stats.assigned}</span>
            </div>
            <div className={styles.statCard} style={{ borderColor: 'rgba(108,99,92,0.2)' }}>
              <div className={styles.statMeta}>
                <span className={styles.statLabel} style={{ color: '#6c635c' }}>Pending</span>
                <FaBedPulse className={styles.statIcon} style={{ color: '#6c635c' }} />
              </div>
              <span className={styles.statValue} style={{ color: '#6c635c' }}>{stats.unassigned}</span>
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
              <option value="all">All Centers ({activeRegion})</option>
              {uniqueCenters.map(center => (
                <option key={center} value={center}>{center}</option>
              ))}
            </select>

            <select
              className={styles.filterSelect}
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
            >
              <option value="all">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
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
              <select 
                value={bulkRoomValue}
                onChange={(e) => handleBulkRoomChange(e.target.value)}
                className={styles.bulkSelect}
              >
                <option value="">-- Select Bulk Room --</option>
                <optgroup label="Floors 1 to 7 (Individual Rooms)">
                  {roomOptions.filter(r => !r.includes("Floor")).map(room => (
                    <option key={room} value={room}>{room}</option>
                  ))}
                </optgroup>
                <optgroup label="Floors 8 to 11 (Floor Groups)">
                  {roomOptions.filter(r => r.includes("Floor")).map(room => (
                    <option key={room} value={room}>{room}</option>
                  ))}
                </optgroup>
              </select>

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
            <div className={styles.tableResponsiveWrapper}>
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
                    <th>Gender</th>
                    <th>Accommodation Space</th>
                    <th>Assign Room</th>
                    <th className={styles.actionHeader}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendees.length === 0 ? (
                    <tr>
                      <td colSpan="8" className={styles.noDataCell}>
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
                      const formattedCenter = cleanCenterMap(person.center);

                      const isPresetRoom = roomOptions.includes(draftRoomValue);

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
                              <FaMapMarkerAlt /> {formattedCenter}
                            </span>
                          </td>
                          <td>
                            <span className={styles.genderTag}>
                              {person.gender || person.sex || person.sanch || person.category || "—"}
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
                              <select
                                className={styles.roomSelect}
                                value={isPresetRoom ? draftRoomValue : draftRoomValue ? "__CUSTOM__" : ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === "__CUSTOM__") {
                                    handleRoomChange(person.id, "PS-");
                                  } else {
                                    handleRoomChange(person.id, val);
                                  }
                                }}
                                disabled={isSaving}
                              >
                                <option value="">-- Select Room --</option>
                                <optgroup label="Floors 1 to 7 (101-104 Series)">
                                  {roomOptions.filter(r => !r.includes("Floor")).map(room => (
                                    <option key={room} value={room}>{room}</option>
                                  ))}
                                </optgroup>
                                <optgroup label="Floors 8 to 11 (Floor Groups)">
                                  {roomOptions.filter(r => r.includes("Floor")).map(room => (
                                    <option key={room} value={room}>{room}</option>
                                  ))}
                                </optgroup>
                                <option value="__CUSTOM__">✍️ Enter Custom Room...</option>
                              </select>

                              {(!isPresetRoom && draftRoomValue !== "") && (
                                <input
                                  type="text"
                                  placeholder="e.g. PS-105"
                                  className={styles.roomInput}
                                  value={draftRoomValue}
                                  onChange={(e) => handleRoomChange(person.id, e.target.value)}
                                  onKeyDown={(e) => handleKeyDown(e, person.id)}
                                  disabled={isSaving}
                                />
                              )}

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
          </div>
        )}
      </div>
    </div>
  );
}

function cleanCenterMap(val) {
  if (!val) return "—";
  const str = String(val).trim();
  const basePart = str.split(/[_-\s]+/)[0];
  if (!basePart) return "—";
  return basePart.charAt(0).toUpperCase() + basePart.slice(1).toLowerCase();
}