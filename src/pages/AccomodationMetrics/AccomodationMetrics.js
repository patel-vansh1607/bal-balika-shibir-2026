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
  FaDownload
} from "react-icons/fa";
import { attendees as attendeesApi, karayakars as karayakarsApi } from "../../apiClient";
import styles from "./AccommodationMetrics.module.css";

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

        setKarayakars(kList);
        setAttendees(aList);
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
      const rawGender = String(p.gender || p.sex || p.sanch || p.category || "").trim().toLowerCase();
      if (genderFilter === "male") {
        return rawGender === "m" || rawGender === "male" || rawGender.startsWith("m") || rawGender.includes("kishore") || rawGender.includes("yuvak");
      } else if (genderFilter === "female") {
        return rawGender === "f" || rawGender === "female" || rawGender.startsWith("f") || rawGender.includes("kishori") || rawGender.includes("mahila");
      }
      return true;
    });

    const totalMembers = filteredPool.length;
    let totalAssigned = 0;
    let totalUnassigned = 0;

    const floorCounts = {};
    const floorRooms = {}; // Maps floorLabel -> Sorted Array of [roomName, members]
    const centerStats = {};

    filteredPool.forEach(person => {
      const rawRoom = person.accommodation || person.accomodation || person.room || "";
      const room = String(rawRoom).trim();
      const center = cleanName(person.center || "Unknown");

      if (!centerStats[center]) {
        centerStats[center] = { total: 0, assigned: 0, unassigned: 0 };
      }
      centerStats[center].total += 1;

      if (room && room !== "null" && room !== "undefined" && room !== "PS-") {
        totalAssigned += 1;
        centerStats[center].assigned += 1;

        let floorLabel = "Custom/Other";
        const match = room.match(/PS-(\d+)/i);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (num >= 100) {
            floorLabel = `Floor ${Math.floor(num / 100)}`;
          } else {
            floorLabel = `Floor ${num}`;
          }
        } else if (room.toLowerCase().includes("floor")) {
          floorLabel = room.toUpperCase();
        }

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

    // Sort rooms numerically/alphabetically for each floor (e.g., 101, 102, 103...)
    const sortedFloorRooms = {};
    Object.keys(floorRooms).forEach((floor) => {
      const roomsObj = floorRooms[floor];
      const sortedKeys = Object.keys(roomsObj).sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ""), 10);
        const numB = parseInt(b.replace(/\D/g, ""), 10);
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
      });

      sortedFloorRooms[floor] = sortedKeys.map(key => [key, roomsObj[key]]);
    });

    const occupancyRate = totalMembers > 0 
      ? Math.round((totalAssigned / totalMembers) * 100) 
      : 0;

    return {
      totalMembers,
      totalAssigned,
      totalUnassigned,
      occupancyRate,
      floorCounts,
      floorRooms: sortedFloorRooms,
      centerStats,
      filteredPool
    };
  }, [karayakars, attendees, selectedCenter, genderFilter]);

  // CSV Export Handler
  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      const rows = [
        ["Member ID", "Name", "Center", "Gender/Category", "Room / Accommodation", "Floor"]
      ];

      Object.entries(metrics.floorRooms).forEach(([floorLabel, roomEntries]) => {
        roomEntries.forEach(([roomName, members]) => {
          members.forEach(person => {
            const memberId = person.member_id || person.id || "";
            const name = person.name || person.full_name || "Unknown";
            const center = cleanName(person.center || "Unknown");
            const gender = person.gender || person.sex || person.sanch || person.category || "";
            rows.push([
              `"${memberId}"`,
              `"${name.replace(/"/g, '""')}"`,
              `"${center}"`,
              `"${gender}"`,
              `"${roomName}"`,
              `"${floorLabel}"`
            ]);
          });
        });
      });

      const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Accommodation_Report_${activeRegion}_${selectedCenter}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Error exporting CSV:", err);
    } finally {
      setIsExporting(false);
    }
  };

  // Text/Summary Report Print/Export Handler
  const handleExportReport = () => {
    setIsExporting(true);
    try {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert("Please allow popups to download/print the report.");
        setIsExporting(false);
        return;
      }

      let html = `
        <html>
          <head>
            <title>Accommodation Report - ${activeRegion}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; color: #2d2926; }
              h1 { font-size: 22px; margin-bottom: 4px; }
              .subtitle { color: #6c635c; font-size: 14px; margin-bottom: 20px; }
              .summary-box { display: flex; gap: 15px; margin-bottom: 20px; }
              .card { border: 1px solid #ddd; padding: 12px 16px; border-radius: 8px; background: #fbfced; min-width: 120px; }
              .card h3 { margin: 0; font-size: 12px; color: #6c635c; text-transform: uppercase; }
              .card p { margin: 6px 0 0 0; font-size: 20px; font-weight: bold; }
              h2 { font-size: 18px; border-bottom: 2px solid #e78524; padding-bottom: 4px; margin-top: 30px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
              th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
              th { background-color: #f4ece6; color: #2d2926; }
            </style>
          </head>
          <body>
            <h1>Accommodation Summary Report</h1>
            <div class="subtitle">Region: ${activeRegion} | Center: ${selectedCenter} | Gender: ${genderFilter}</div>
            
            <div class="summary-box">
              <div class="card"><h3>Total Members</h3><p>${metrics.totalMembers}</p></div>
              <div class="card"><h3>Assigned Beds</h3><p>${metrics.totalAssigned}</p></div>
              <div class="card"><h3>Pending Beds</h3><p>${metrics.totalUnassigned}</p></div>
              <div class="card"><h3>Occupancy Rate</h3><p>${metrics.occupancyRate}%</p></div>
            </div>
      `;

      Object.entries(metrics.floorRooms).forEach(([floorLabel, roomEntries]) => {
        html += `<h2>${floorLabel}</h2>`;
        roomEntries.forEach(([roomName, members]) => {
          html += `<h3>Room: ${roomName} (${members.length} Guests)</h3>`;
          html += `<table><thead><tr><th>ID</th><th>Name</th><th>Center</th><th>Gender</th></tr></thead><tbody>`;
          members.forEach(p => {
            html += `<tr><td>${p.member_id || p.id || "—"}</td><td>${p.name || p.full_name || "—"}</td><td>${cleanName(p.center)}</td><td>${p.gender || p.sex || "—"}</td></tr>`;
          });
          html += `</tbody></table>`;
        });
      });

      html += `</body></html>`;
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } catch (err) {
      console.error("Error generating report:", err);
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
            title="Download room allocations as CSV spreadsheet"
          >
            <FaFileCsv /> Export CSV
          </button>
          <button 
            className={styles.exportBtnPrimary} 
            onClick={handleExportReport} 
            disabled={isExporting}
            title="Print or Save Detailed PDF/Printable Report"
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
              {metrics.floorRooms[selectedFloor].map(([roomName, members]) => (
                <div key={roomName} className={styles.roomCard}>
                  <div className={styles.roomCardHeader}>
                    <div className={styles.roomNameBadge}>
                      <FaBed /> {roomName}
                    </div>
                    <span className={styles.occupantCountTag}>{members.length} {members.length === 1 ? 'Guest' : 'Guests'}</span>
                  </div>
                  <div className={styles.occupantsList}>
                    {members.map((person, idx) => {
                      const memberId = person.member_id || person.id || `M-${idx}`;
                      const memberName = person.name || person.full_name || "Unknown Name";
                      const centerName = cleanName(person.center || "—");
                      const genderVal = person.gender || person.sex || person.sanch || person.category || "—";

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
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Top Stat Summary Grid */}
          <div className={styles.summaryGrid}>
            <div className={styles.metricCard}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>TOTAL (ATTENDEES + KARYAKARS)</span>
                <FaUsers className={styles.cardIcon} />
              </div>
              <div className={styles.cardValue}>{metrics.totalMembers}</div>
            </div>

            <div className={`${styles.metricCard} ${styles.successCard}`}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>Assigned</span>
                <FaCheckCircle className={styles.cardIcon} />
              </div>
              <div className={styles.cardValue}>{metrics.totalAssigned}</div>
              <span className={styles.cardSubtitle}>{metrics.occupancyRate}% Room Allocated</span>
            </div>

            <div className={`${styles.metricCard} ${styles.warningCard}`}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>Pending</span>
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
                  {Object.entries(metrics.floorCounts).map(([floor, count]) => (
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
                          <span className={styles.floorCount}>{count} Beds</span>
                          <FaChevronRight className={styles.chevronIcon} />
                        </div>
                      </div>
                      <div className={styles.miniBarBg}>
                        <div 
                          className={styles.miniBarFill} 
                          style={{ 
                            width: `${Math.min(100, Math.round((count / (metrics.totalAssigned || 1)) * 100))}%` 
                          }} 
                        />
                      </div>
                    </div>
                  ))}
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