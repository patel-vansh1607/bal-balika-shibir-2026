import React, { useState, useEffect, useMemo } from "react";
import { 
  FaBed, 
  FaBuilding, 
  FaUsers, 
  FaCheckCircle, 
  FaExclamationCircle, 
  FaChartPie,
  FaSpinner 
} from "react-icons/fa";
import { attendees as attendeesApi, karayakars as karayakarsApi } from "../../apiClient";
import styles from "./AccommodationMetrics.module.css";

export default function AccommodationMetrics({ currentRegion, targetGroup = "karyakars", selectedCenter = "all" }) {
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Helper to clean region or center strings (e.g., "nakuru_3xl" -> "Nakuru")
  const cleanName = (val) => {
    if (!val) return "Unknown";
    const str = String(val).trim();
    const basePart = str.split(/[_-\s]+/)[0];
    if (!basePart) return "Unknown";
    return basePart.charAt(0).toUpperCase() + basePart.slice(1).toLowerCase();
  };

  const activeRegion = cleanName(currentRegion || localStorage.getItem("selectedRegion") || "Kenya");

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const queryParams = { region: activeRegion };
    let fetchPromise;

    if (targetGroup === "karyakars") {
      fetchPromise = typeof karayakarsApi.list === "function" 
        ? karayakarsApi.list(queryParams) 
        : karayakarsApi.getAll(queryParams);
    } else {
      fetchPromise = typeof attendeesApi.list === "function"
        ? attendeesApi.list(queryParams)
        : typeof attendeesApi.getAll === "function"
          ? attendeesApi.getAll(queryParams)
          : attendeesApi.get(queryParams);
    }

    fetchPromise
      .then((res) => {
        if (!isMounted) return;
        const data = res?.data || res;
        const list = Array.isArray(data) ? data : data.attendees || data.karayakars || [];
        setAttendees(list);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Error fetching metrics data:", err);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeRegion, targetGroup]);

  const metrics = useMemo(() => {
    const centerPool = selectedCenter === "all" 
      ? attendees 
      : attendees.filter(p => {
          if (!p.center && selectedCenter === "Unknown") return true;
          return cleanName(p.center).toLowerCase() === cleanName(selectedCenter).toLowerCase();
        });

    const totalMembers = centerPool.length;
    let totalAssigned = 0;
    let totalUnassigned = 0;

    const floorCounts = {};
    const centerStats = {};

    centerPool.forEach(person => {
      const rawRoom = person.accommodation || person.accomodation || person.room || "";
      const room = String(rawRoom).trim();
      // Clean and normalize the center name for grouped stats
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
      } else {
        totalUnassigned += 1;
        centerStats[center].unassigned += 1;
      }
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
      centerStats
    };
  }, [attendees, selectedCenter]);

  if (loading) {
    return (
      <div className={styles.metricsWrapper} style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "150px" }}>
        <FaSpinner className={styles.spin} size={24} />
      </div>
    );
  }

  return (
    <div className={styles.metricsWrapper}>
      {/* Top Stat Summary Grid */}
      <div className={styles.summaryGrid}>
        <div className={styles.metricCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Active Pool</span>
            <FaUsers className={styles.cardIcon} />
          </div>
          <div className={styles.cardValue}>{metrics.totalMembers}</div>
          <span className={styles.cardSubtitle}>
            {selectedCenter === "all" ? `${activeRegion} (All Centers)` : `${selectedCenter} Directory`}
          </span>
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
            <h3>Floor Distribution</h3>
          </div>
          {Object.keys(metrics.floorCounts).length === 0 ? (
            <div className={styles.emptyText}>No room assignments recorded yet.</div>
          ) : (
            <div className={styles.floorList}>
              {Object.entries(metrics.floorCounts).map(([floor, count]) => (
                <div key={floor} className={styles.floorRow}>
                  <div className={styles.floorInfo}>
                    <span className={styles.floorName}>{floor}</span>
                    <span className={styles.floorCount}>{count} Beds</span>
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
    </div>
  );
}