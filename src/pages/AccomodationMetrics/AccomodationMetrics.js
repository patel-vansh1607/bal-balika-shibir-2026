import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  FaBed, 
  FaBuilding, 
  FaUsers, 
  FaCheckCircle, 
  FaExclamationCircle, 
  FaChartPie,
  FaSpinner,
  FaChevronRight,
  FaArrowLeft,
  FaMapMarkerAlt,
  FaFileCsv,
  FaFilePdf,
  FaDownload,
  FaBan,
  FaExclamationTriangle
} from "react-icons/fa";
import { attendees as attendeesApi, karayakars as karayakarsApi } from "../../apiClient";
import styles from "./AccommodationMetrics.module.css";

// Easily editable Room Capacity Config
const ROOM_CAPACITIES = {
  // Floor 1
  "101": { capacity: 0, blocked: true, label: "Office (Not Allowed)" },
  "102": { capacity: 10 },
  "103": { capacity: 12 },
  "104": { capacity: 14 },

  // Floor 2
  "201": { capacity: 0, blocked: true, label: "Dressing (Not Allowed)" },
  "202": { capacity: 12 },
  "203": { capacity: 10 },
  "204": { capacity: 13 },

  // Floor 3
  "301": { capacity: 23, label: "301 A/B" },
  "301 A/B": { capacity: 23 },
  "302": { capacity: 10 },
  "303": { capacity: 14 },

  // Floor 4
  "401": { capacity: 40, label: "401 A/B/C" },
  "401 A/B/C": { capacity: 40 },
  "402": { capacity: 15 },

  // Floor 5
  "501": { capacity: 23, label: "501 A/B" },
  "501 A/B": { capacity: 23 },
  "502": { capacity: 10 },
  "503": { capacity: 14 },

  // Floor 6
  "601": { capacity: 10 },
  "602": { capacity: 12 },
  "603": { capacity: 10 },
  "604": { capacity: 13 },

  // Floor 7
  "701": { capacity: 33, label: "701 A/B/C" },
  "701 A/B/C": { capacity: 33 },
  "702": { capacity: 15 },

  // Floor 8
  "801": { capacity: 35, label: "801 A/B/C" },
  "801 A/B/C": { capacity: 35 },
  "802": { capacity: 15 },

  // Floor 9
  "9TH FLOOR HALL": { capacity: 0, blocked: true, label: "Sports Complex" },
  "SPORTS COMPLEX": { capacity: 0, blocked: true, label: "Sports Complex" },

  // Floor 10 & 11
  "10TH FLOOR HALL": { capacity: 50 },
  "11TH FLOOR HALL": { capacity: 50 }
};

export default function AccommodationMetrics({ currentRegion, selectedCenter = "all", genderFilter = "all" }) {
  const [karayakars, setKarayakars] = useState([]);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const cleanName = (val) => {
    if (!val) return "Unknown";
    const str = String(val).trim();
    const basePart = str.split(/[_-\s]+/)[0];
    if (!basePart) return "Unknown";
    return basePart.charAt(0).toUpperCase() + basePart.slice(1).toLowerCase();
  };

  const getIsFemale = useCallback((karyakar) => {
    if (!karyakar || !karyakar.seva_designation) return false;

    const designations =
      typeof karyakar.seva_designation === "string"
        ? karyakar.seva_designation.split(", ")
        : Array.isArray(karyakar.seva_designation)
          ? karyakar.seva_designation
          : [];

    return designations.some((role) => {
      const r = String(role).toUpperCase();

      const matchesExisting =
        r === "I-NC" ||
        r === "I-NOC" ||
        r === "I-RC" ||
        r.includes("SHISHIKA") ||
        r.includes("BALIKA");

      const isBstFemaleRole =
        r === "BST SANCHALIKA" ||
        r === "BST SAH-SANCHALIKA" ||
        r === "BST BALIKA IC";

      return matchesExisting || isBstFemaleRole;
    });
  }, []);

  const getFloorFromRoom = (roomStr) => {
    if (!roomStr) return "Custom/Other";
    const cleanRoom = roomStr.trim().toUpperCase();

    const numberMatch = cleanRoom.match(/(?:PS-?|P-?|ROOM\s*|-)?\s*(\d+)/i);

    if (numberMatch && numberMatch[1]) {
      const num = parseInt(numberMatch[1], 10);
      if (num >= 100) {
        return `Floor ${Math.floor(num / 100)}`;
      } else if (num > 0) {
        return `Floor ${num}`;
      }
    }

    if (cleanRoom.includes("GROUND") || cleanRoom.includes("GF")) return "Ground Floor";
    if (cleanRoom.includes("BASEMENT")) return "Basement";
    if (cleanRoom.includes("FLOOR")) return cleanRoom;

    return "Custom/Other";
  };

  const getRoomCapacityInfo = (rawRoomName) => {
    if (!rawRoomName) return { capacity: null, blocked: false, label: "" };

    const clean = rawRoomName.trim().toUpperCase().replace(/^PS-/, "").trim();

    if (ROOM_CAPACITIES[clean]) {
      return ROOM_CAPACITIES[clean];
    }

    const baseNum = clean.replace(/\D/g, "");
    if (baseNum && ROOM_CAPACITIES[baseNum]) {
      return ROOM_CAPACITIES[baseNum];
    }

    return { capacity: null, blocked: false, label: "" };
  };

  const activeRegion = cleanName(currentRegion || localStorage.getItem("selectedRegion") || "Kenya");

  const fetchData = useCallback(() => {
    let isMounted = true;
    setLoading(true);

    const queryParams = { region: activeRegion };

    Promise.all([
      typeof karayakarsApi.list === "function" 
        ? karayakarsApi.list(queryParams) 
        : karayakarsApi.getAll(queryParams),
      typeof attendeesApi.list === "function"
        ? attendeesApi.list(queryParams)
        : typeof attendeesApi.getAll === "function"
          ? attendeesApi.getAll(queryParams)
          : attendeesApi.get(queryParams)
    ])
      .then(([kRes, aRes]) => {
        if (!isMounted) return;
        
        const kData = kRes?.data || kRes;
        const kList = Array.isArray(kData) ? kData : kData.karayakars || [];
        
        const aData = aRes?.data || aRes;
        const aList = Array.isArray(aData) ? aData : aData.attendees || [];

        const taggedKarayakars = kList.map(item => ({ ...item, _isKaryakar: true }));
        const taggedAttendees = aList.map(item => ({ ...item, _isKaryakar: false }));

        setKarayakars(taggedKarayakars);
        setAttendees(taggedAttendees);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Error fetching combined metrics data:", err);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeRegion]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const metrics = useMemo(() => {
    const combinedPool = [...karayakars, ...attendees];

    const centerPool = selectedCenter === "all" 
      ? combinedPool 
      : combinedPool.filter(p => {
          if (!p.center && selectedCenter === "Unknown") return true;
          return cleanName(p.center).toLowerCase() === cleanName(selectedCenter).toLowerCase();
        });

    const filteredPool = centerPool.filter(p => {
      if (genderFilter === "all") return true;

      if (p._isKaryakar) {
        const isFemale = getIsFemale(p);
        if (genderFilter === "female") return isFemale;
        if (genderFilter === "male") return !isFemale;
        return true;
      }

      const rawCategory = String(p.gender || p.sex || p.sanch || p.category || "").trim().toLowerCase();
      if (genderFilter === "male") {
        return (
          (rawCategory.includes("bal") && !rawCategory.includes("balika")) ||
          rawCategory === "b" ||
          rawCategory === "m" ||
          rawCategory === "male" ||
          rawCategory.includes("kishore") ||
          rawCategory.includes("yuvak")
        );
      } else if (genderFilter === "female") {
        return (
          rawCategory.includes("balika") ||
          rawCategory === "f" ||
          rawCategory === "female" ||
          rawCategory.includes("kishori") ||
          rawCategory.includes("mahila")
        );
      }
      return true;
    });

    const totalMembers = filteredPool.length;
    let totalAssigned = 0;
    let totalUnassigned = 0;

    const floorCounts = {};
    const floorCapacityMap = {};
    const floorRooms = {}; 
    const centerStats = {};

    filteredPool.forEach(person => {
      const rawRoom = person.accommodation || person.accomodation || person.room || "";
      const room = String(rawRoom).trim();
      const center = cleanName(person.center || "Unknown");

      if (!centerStats[center]) {
        centerStats[center] = { total: 0, assigned: 0, unassigned: 0 };
      }
      centerStats[center].total += 1;

      if (room && room !== "null" && room !== "undefined" && room !== "PS-" && room !== "P") {
        totalAssigned += 1;
        centerStats[center].assigned += 1;

        const floorLabel = getFloorFromRoom(room);

        floorCounts[floorLabel] = (floorCounts[floorLabel] || 0) + 1;

        if (!floorRooms[floorLabel]) {
          floorRooms[floorLabel] = {};
        }
        if (!floorRooms[floorLabel][room]) {
          floorRooms[floorLabel][room] = [];
        }
        floorRooms[floorLabel][room].push(person);
      } else {
        totalUnassigned += 1;
        centerStats[center].unassigned += 1;
      }
    });

    // Calculate total capacity per floor
    Object.entries(floorRooms).forEach(([floorLabel, roomsObj]) => {
      let floorTotalCap = 0;
      Object.keys(roomsObj).forEach(roomName => {
        const info = getRoomCapacityInfo(roomName);
        if (info.capacity) {
          floorTotalCap += info.capacity;
        }
      });
      floorCapacityMap[floorLabel] = floorTotalCap;
    });

    let globalTotalCapacity = 0;
    Object.values(ROOM_CAPACITIES).forEach(val => {
      if (val.capacity) globalTotalCapacity += val.capacity;
    });

    const sortedFloorRooms = {};
    const sortedFloorKeys = Object.keys(floorRooms).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ""), 10);
      const numB = parseInt(b.replace(/\D/g, ""), 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });

    sortedFloorKeys.forEach((floor) => {
      const roomsObj = floorRooms[floor];
      const sortedRoomKeys = Object.keys(roomsObj).sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ""), 10);
        const numB = parseInt(b.replace(/\D/g, ""), 10);
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
      });

      sortedFloorRooms[floor] = sortedRoomKeys.map(key => [key, roomsObj[key]]);
    });

    const occupancyRate = totalMembers > 0 
      ? Math.round((totalAssigned / totalMembers) * 100) 
      : 0;

    return {
      totalMembers,
      totalAssigned,
      totalUnassigned,
      occupancyRate,
      globalTotalCapacity,
      floorCounts,
      floorCapacityMap,
      floorRooms: sortedFloorRooms,
      centerStats,
      filteredPool
    };
  }, [karayakars, attendees, selectedCenter, genderFilter, getIsFemale]);

  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      const rows = [
        ["Floor", "Room / Accommodation", "Capacity", "Occupancy Status", "Member ID", "Name", "Center", "Role", "Gender/Category"]
      ];

      Object.entries(metrics.floorRooms).forEach(([floorLabel, roomEntries]) => {
        roomEntries.forEach(([roomName, members]) => {
          const info = getRoomCapacityInfo(roomName);
          const capText = info.blocked ? "Blocked" : (info.capacity ? `${info.capacity}` : "N/A");
          const statusText = info.blocked ? "Not Allowed" : (info.capacity ? `${members.length}/${info.capacity}` : `${members.length} guests`);

          members.forEach(person => {
            const memberId = person.member_id || person.id || "";
            const name = person.name || person.full_name || "Unknown";
            const center = cleanName(person.center || "Unknown");
            const pType = person._isKaryakar ? "Karyakar" : "Attendee";
            const gender = person._isKaryakar 
              ? (getIsFemale(person) ? "Female" : "Male")
              : (person.gender || person.sex || person.sanch || person.category || "");

            rows.push([
              `"${floorLabel}"`,
              `"${roomName}"`,
              `"${capText}"`,
              `"${statusText}"`,
              `"${memberId}"`,
              `"${name.replace(/"/g, '""')}"`,
              `"${center}"`,
              `"${pType}"`,
              `"${gender}"`
            ]);
          });
        });
      });

      const csvString = rows.map(e => e.join(",")).join("\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Accommodation_Report_${activeRegion}_${selectedCenter}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting CSV:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportReport = () => {
    setIsExporting(true);
    try {
      let htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Accommodation Report - ${activeRegion}</title>
            <style>
              @page { size: A4; margin: 12mm 15mm; }
              body { 
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                padding: 0; 
                margin: 0;
                color: #0f172a; 
                background: #ffffff;
                -webkit-print-color-adjust: exact;
              }
              .report-header { 
                border-bottom: 2px solid #0284c7; 
                padding-bottom: 12px; 
                margin-bottom: 20px; 
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
              }
              .title-group h1 { font-size: 20px; margin: 0 0 4px 0; color: #0f172a; font-weight: 700; }
              .title-group p { font-size: 12px; color: #64748b; margin: 0; }
              
              .summary-cards { 
                display: grid; 
                grid-template-columns: repeat(4, 1fr); 
                gap: 10px; 
                margin-bottom: 20px; 
              }
              .card { 
                border: 1px solid #e2e8f0; 
                padding: 10px 12px; 
                border-radius: 6px; 
                background: #f8fafc; 
              }
              .card h3 { margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
              .card p { margin: 4px 0 0 0; font-size: 16px; font-weight: 700; color: #0284c7; }

              .floor-section { 
                margin-bottom: 22px; 
                page-break-inside: avoid;
              }
              .floor-header { 
                background: #0284c7; 
                color: #ffffff;
                padding: 6px 12px; 
                font-size: 14px; 
                font-weight: 700; 
                border-radius: 4px;
                margin-bottom: 10px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }

              .room-block { 
                margin-bottom: 12px; 
                page-break-inside: avoid;
              }
              .room-title { 
                font-size: 12px; 
                font-weight: 700; 
                color: #334155; 
                margin-bottom: 4px;
                background: #f1f5f9;
                padding: 4px 8px;
                border-left: 3px solid #0284c7;
              }

              table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 8px; }
              th, td { border: 1px solid #cbd5e1; padding: 5px 8px; text-align: left; }
              th { background-color: #f8fafc; color: #475569; font-weight: 600; text-transform: uppercase; font-size: 9px; }
              tr:nth-child(even) { background-color: #f8fafc; }
              
              .type-tag { font-size: 9px; font-weight: 600; padding: 2px 6px; border-radius: 4px; background: #e0f2fe; color: #0369a1; }
            </style>
          </head>
          <body>
            <div class="report-header">
              <div class="title-group">
                <h1>Accommodation Allocation Report</h1>
                <p>Region: <strong>${activeRegion}</strong> | Center Filter: <strong>${selectedCenter}</strong> | Gender Filter: <strong>${genderFilter}</strong></p>
              </div>
            </div>
            
            <div class="summary-cards">
              <div class="card"><h3>Total Directory</h3><p>${metrics.totalMembers}</p></div>
              <div class="card"><h3>Allocated Beds</h3><p>${metrics.totalAssigned}</p></div>
              <div class="card"><h3>Unassigned Beds</h3><p>${metrics.totalUnassigned}</p></div>
              <div class="card"><h3>Occupancy Rate</h3><p>${metrics.occupancyRate}%</p></div>
            </div>
      `;

      Object.entries(metrics.floorRooms).forEach(([floorLabel, roomEntries]) => {
        htmlContent += `<div class="floor-section"><div class="floor-header">${floorLabel}</div>`;
        roomEntries.forEach(([roomName, members]) => {
          const capInfo = getRoomCapacityInfo(roomName);
          const capText = capInfo.blocked ? "(Blocked - Not Allowed)" : capInfo.capacity ? `(Capacity: ${capInfo.capacity})` : "";
          
          htmlContent += `
            <div class="room-block">
              <div class="room-title">Room ${roomName} ${capText} &mdash; ${members.length} Guest${members.length === 1 ? '' : 's'}</div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 15%;">ID</th>
                    <th style="width: 35%;">Full Name</th>
                    <th style="width: 20%;">Center</th>
                    <th style="width: 15%;">Directory</th>
                    <th style="width: 15%;">Gender</th>
                  </tr>
                </thead>
                <tbody>
          `;
          members.forEach(p => {
            const isFem = p._isKaryakar ? getIsFemale(p) : false;
            const genderText = p._isKaryakar 
              ? (isFem ? "Female" : "Male")
              : (p.gender || p.sex || p.category || "—");

            htmlContent += `
              <tr>
                <td><strong>${p.member_id || p.id || "—"}</strong></td>
                <td>${p.name || p.full_name || "—"}</td>
                <td>${cleanName(p.center)}</td>
                <td><span class="type-tag">${p._isKaryakar ? "Karyakar" : "Attendee"}</span></td>
                <td>${genderText}</td>
              </tr>
            `;
          });
          htmlContent += `</tbody></table></div>`;
        });
        htmlContent += `</div>`;
      });

      htmlContent += `
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 300);
              };
            </script>
          </body>
        </html>
      `;

      const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
      const blobUrl = URL.createObjectURL(blob);
      const printWin = window.open(blobUrl, "_blank");
      
      if (!printWin) {
        alert("Please allow popups to view or print the report.");
      }
    } catch (err) {
      console.error("Error generating printable report:", err);
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.metricsWrapper} style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "150px" }}>
        <FaSpinner className={styles.spin} size={24} />
      </div>
    );
  }

  return (
    <div className={styles.metricsWrapper}>
      {/* Global Export Bar */}
      <div className={styles.exportActionBar}>
        <div className={styles.exportInfoText}>
          <FaDownload className={styles.exportBarIcon} />
          <span>Export Accommodation Data & Reports</span>
        </div>
        <div className={styles.exportButtonsGroup}>
          <button 
            className={styles.exportBtn} 
            onClick={handleExportCSV} 
            disabled={isExporting}
            title="Download floor & room allocations as CSV"
          >
            <FaFileCsv /> Export CSV
          </button>
          <button 
            className={styles.exportBtnPrimary} 
            onClick={handleExportReport} 
            disabled={isExporting}
            title="Print or Save Floor & Room PDF Report"
          >
            <FaFilePdf /> Printable Report
          </button>
        </div>
      </div>

      {selectedFloor ? (
        <div className={styles.roomDetailView}>
          <div className={styles.detailHeaderBar}>
            <button className={styles.backButton} onClick={() => setSelectedFloor(null)}>
              <FaArrowLeft /> Back to Floor Overview
            </button>
            <div className={styles.detailTitleGroup}>
              <h2>{selectedFloor} Room Breakdown</h2>
            </div>
          </div>

          {(!metrics.floorRooms[selectedFloor] || metrics.floorRooms[selectedFloor].length === 0) ? (
            <div className={styles.emptyText}>No room allocations found for {selectedFloor}.</div>
          ) : (
            <div className={styles.roomsGrid}>
              {metrics.floorRooms[selectedFloor].map(([roomName, members]) => {
                const capInfo = getRoomCapacityInfo(roomName);
                const count = members.length;
                const capacity = capInfo.capacity;
                const isBlocked = capInfo.blocked;
                const isOverCap = capacity && count > capacity;
                const isFull = capacity && count === capacity;

                let pct = capacity ? Math.min(100, Math.round((count / capacity) * 100)) : 0;

                return (
                  <div 
                    key={roomName} 
                    className={`${styles.roomCard} ${isBlocked ? styles.blockedCard : isOverCap ? styles.overCapCard : ""}`}
                  >
                    <div className={styles.roomCardHeader}>
                      <div className={styles.roomNameBadge}>
                        <FaBed /> {roomName}
                        {capInfo.label && <span className={styles.roomLabelSub}>({capInfo.label})</span>}
                      </div>

                      {isBlocked ? (
                        <span className={styles.blockedTag}><FaBan /> Not Allowed</span>
                      ) : capacity ? (
                        <span className={`${styles.capacityBadge} ${isOverCap ? styles.overCapBadge : isFull ? styles.fullBadge : ""}`}>
                          {count} / {capacity} Beds
                        </span>
                      ) : (
                        <span className={styles.occupantCountTag}>{count} {count === 1 ? 'Guest' : 'Guests'}</span>
                      )}
                    </div>

                    {capacity > 0 && (
                      <div className={styles.capacityProgressBarBg}>
                        <div 
                          className={`${styles.capacityProgressBarFill} ${isOverCap ? styles.fillOverCap : isFull ? styles.fillFull : ""}`} 
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}

                    {isOverCap && (
                      <div className={styles.capacityAlert}>
                        <FaExclamationTriangle /> Exceeds capacity by {count - capacity}!
                      </div>
                    )}

                    <div className={styles.occupantsList}>
                      {members.map((person, idx) => {
                        const memberId = person.member_id || person.id || `M-${idx}`;
                        const memberName = person.name || person.full_name || "Unknown Name";
                        const centerName = cleanName(person.center || "—");
                        const genderVal = person._isKaryakar
                          ? (getIsFemale(person) ? "Female" : "Male")
                          : (person.gender || person.sex || person.sanch || person.category || "—");

                        return (
                          <div key={person.id || idx} className={styles.occupantRow}>
                            <div className={styles.occupantInfo}>
                              <span className={styles.occupantName}>{memberName}</span>
                              <span className={styles.occupantMetaId}>{memberId}</span>
                            </div>
                            <div className={styles.occupantTags}>
                              <span className={styles.miniCenterTag}><FaMapMarkerAlt /> {centerName}</span>
                              <span className={styles.miniGenderTag}>{genderVal}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Top Stat Summary Grid */}
          <div className={styles.summaryGrid}>
            <div className={styles.metricCard}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>TOTAL DIRECTORY</span>
                <FaUsers className={styles.cardIcon} />
              </div>
              <div className={styles.cardValue}>{metrics.totalMembers}</div>
            </div>

            <div className={`${styles.metricCard} ${styles.successCard}`}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>Assigned Beds</span>
                <FaCheckCircle className={styles.cardIcon} />
              </div>
              <div className={styles.cardValue}>{metrics.totalAssigned}</div>
              <span className={styles.cardSubtitle}>
                {metrics.globalTotalCapacity > 0 
                  ? `${metrics.totalAssigned} of ${metrics.globalTotalCapacity} Max Capacity`
                  : `${metrics.occupancyRate}% Allocated`}
              </span>
            </div>

            <div className={`${styles.metricCard} ${styles.warningCard}`}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>Pending Unassigned</span>
                <FaExclamationCircle className={styles.cardIcon} />
              </div>
              <div className={styles.cardValue}>{metrics.totalUnassigned}</div>
              <span className={styles.cardSubtitle}>{100 - metrics.occupancyRate}% Remaining</span>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>Occupancy Rate</span>
                <FaChartPie className={styles.cardIcon} />
              </div>
              <div className={styles.cardValue}>{metrics.occupancyRate}%</div>
              <div className={styles.progressBarBg}>
                <div 
                  className={styles.progressBarFill} 
                  style={{ width: `${metrics.occupancyRate}%` }}
                />
              </div>
            </div>
          </div>

          {/* Visual Analytics Breakdowns */}
          <div className={styles.analyticsGrid}>
            <div className={styles.analyticsCard}>
              <div className={styles.sectionHeader}>
                <FaBuilding className={styles.sectionIcon} />
                <h3>Floor Distribution <span className={styles.hintText}>(Click any floor to view rooms)</span></h3>
              </div>
              {Object.keys(metrics.floorCounts).length === 0 ? (
                <div className={styles.emptyText}>No room assignments recorded yet.</div>
              ) : (
                <div className={styles.floorList}>
                  {Object.entries(metrics.floorCounts).map(([floor, count]) => {
                    const floorCap = metrics.floorCapacityMap[floor] || 0;
                    const pct = floorCap > 0 ? Math.min(100, Math.round((count / floorCap) * 100)) : 0;

                    return (
                      <div 
                        key={floor} 
                        className={styles.floorRowClickable}
                        onClick={() => setSelectedFloor(floor)}
                      >
                        <div className={styles.floorInfo}>
                          <span className={styles.floorNameWithIcon}>
                            <FaBed className={styles.floorBedIcon} /> {floor}
                          </span>
                          <div className={styles.floorCountRight}>
                            <span className={styles.floorCount}>
                              {count} {floorCap > 0 ? `/ ${floorCap}` : ""} Beds
                            </span>
                            <FaChevronRight className={styles.chevronIcon} />
                          </div>
                        </div>
                        <div className={styles.miniBarBg}>
                          <div 
                            className={styles.miniBarFill} 
                            style={{ 
                              width: `${floorCap > 0 ? pct : Math.min(100, Math.round((count / (metrics.totalAssigned || 1)) * 100))}%` 
                            }} 
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedCenter === "all" && (
              <div className={styles.analyticsCard}>
                <div className={styles.sectionHeader}>
                  <FaBed className={styles.sectionIcon} />
                  <h3>Center Breakdown</h3>
                </div>
                <div className={styles.centerTableWrapper}>
                  <table className={styles.centerTable}>
                    <thead>
                      <tr>
                        <th>Center</th>
                        <th>Assigned</th>
                        <th>Pending</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(metrics.centerStats).map(([center, data]) => (
                        <tr key={center}>
                          <td className={styles.centerName}>{center}</td>
                          <td className={styles.assignedText}>{data.assigned}</td>
                          <td className={styles.pendingText}>{data.unassigned}</td>
                          <td><strong>{data.total}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}