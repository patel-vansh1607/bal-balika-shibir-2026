import React, { useState, useEffect, useMemo } from "react";
import { 
  FaUsers, 
  FaUserPlus, 
  FaSpinner, 
  FaCreditCard, 
  FaTshirt,
  FaFilter,
  FaMapMarkerAlt,
  FaArrowLeft,
  FaChevronDown,
  FaChevronUp,
  FaUserCircle
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { userRoles } from "../../apiClient"; 
import styles from "../Dashboard/Dashboard.module.css";

export default function OverviewMetrics({ 
  attendees = [], 
  dataFetching = false, 
  regionScope = "all" 
}) {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("Admin"); 
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  
  // Region & Selected Center state
  const [selectedRegion, setSelectedRegion] = useState(regionScope);
  const [selectedCenter, setSelectedCenter] = useState(null);

  // T-Shirt Section Category Filter State ("all", "balak", "balika")
  const [tshirtCategory, setTshirtCategory] = useState("all");
  // Expanded T-Shirt size accordion state
  const [expandedSize, setExpandedSize] = useState(null);

  // Sync region state if prop changes
  useEffect(() => {
    setSelectedRegion(regionScope);
    setSelectedCenter(null);
  }, [regionScope]);

  // Reset selected center if region changes
  const handleRegionChange = (newRegion) => {
    setSelectedRegion(newRegion);
    setSelectedCenter(null);
  };

  // Fetch Admin Profile Greeting
  useEffect(() => {
    userRoles.me()
      .then((res) => {
        const rawName = res?.data?.name || res?.name;
        
        if (rawName) {
          const cleanName = rawName
            .trim()
            .split(/\s+/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(" ");

          setUserName(cleanName);
        }
      })
      .catch((error) => {
        console.error("Error matching admin session details via apiClient:", error);
      })
      .finally(() => {
        setIsLoadingProfile(false);
      });
  }, []);

  // Extract unique regions
  const uniqueRegions = useMemo(() => {
    const set = new Set();
    attendees.forEach((att) => {
      if (att.region) set.add(att.region);
    });
    return Array.from(set).sort();
  }, [attendees]);

  // Filter attendees by region first
  const regionFilteredAttendees = useMemo(() => {
    if (!selectedRegion || selectedRegion === "all") {
      return attendees;
    }
    return attendees.filter(
      (att) => (att.region || "").toLowerCase() === selectedRegion.toLowerCase()
    );
  }, [attendees, selectedRegion]);

  // Compute stats based on selected region & center drilldown
  const stats = useMemo(() => {
    const total = regionFilteredAttendees.length;

    let paidCount = 0;
    let unpaidCount = 0;

    const breakdownCounts = {};
    let balakBalikaBreakdown = [
      { name: "Balaks", value: 0, color: "#3b82f6" },
      { name: "Balikas", value: 0, color: "#ec4899" },
    ];

    regionFilteredAttendees.forEach((att) => {
      // 1. Chart Breakdown Logic
      if (selectedRegion === "all") {
        const regionKey = att.region || "Unassigned Region";
        breakdownCounts[regionKey] = (breakdownCounts[regionKey] || 0) + 1;
      } else {
        const centerKey = att.center || att.mandal || "Unassigned Center";
        breakdownCounts[centerKey] = (breakdownCounts[centerKey] || 0) + 1;
      }

      // 2. Payment Data
      const paymentStatus = (att.payment_status || att.paymentStatus || att.payment || "").toLowerCase();
      if (paymentStatus === "paid" || paymentStatus === "completed" || paymentStatus === "success" || att.isPaid) {
        paidCount++;
      } else {
        unpaidCount++;
      }
    });

    // 3. Balak / Balika breakdown for clicked center
    if (selectedCenter && selectedRegion !== "all") {
      let balaks = 0;
      let balikas = 0;

      regionFilteredAttendees.forEach((att) => {
        const centerKey = att.center || att.mandal || "Unassigned Center";
        if (centerKey === selectedCenter) {
          const gender = (att.gender || att.category || att.type || "").toLowerCase();
          if (gender.includes("balika") || gender === "f" || gender === "female") {
            balikas++;
          } else {
            balaks++;
          }
        }
      });

      balakBalikaBreakdown = [
        { name: "Balaks", value: balaks, color: "#3b82f6" },
        { name: "Balikas", value: balikas, color: "#ec4899" },
      ];
    }

    // Bar Chart Data Array
    const barChartData = Object.keys(breakdownCounts).map((label) => ({
      name: label,
      Count: breakdownCounts[label],
    }));

    // Payment Pie Data
    const paymentPieData = [
      { name: "Paid", value: paidCount, color: "#34a853" },
      { name: "Pending/Unpaid", value: unpaidCount, color: "#ea4335" },
    ];

    return {
      total,
      paidCount,
      unpaidCount,
      barChartData,
      paymentPieData,
      balakBalikaBreakdown,
    };
  }, [regionFilteredAttendees, selectedRegion, selectedCenter]);

  // Compute T-Shirt stats with Balak/Balika Filter & Attendee Details (ID + Name)
  const tshirtStats = useMemo(() => {
    const map = {};

    regionFilteredAttendees.forEach((att) => {
      const gender = (att.gender || att.category || att.type || "").toLowerCase();
      const isBalika = gender.includes("balika") || gender === "f" || gender === "female";
      const category = isBalika ? "balika" : "balak";

      // Apply Balak / Balika Filter
      if (tshirtCategory !== "all" && tshirtCategory !== category) {
        return;
      }

      const size = att.tshirt_size || att.tshirtSize || "Unspecified";
      if (!map[size]) {
        map[size] = {
          size,
          count: 0,
          balakCount: 0,
          balikaCount: 0,
          members: []
        };
      }

      map[size].count += 1;
      if (isBalika) {
        map[size].balikaCount += 1;
      } else {
        map[size].balakCount += 1;
      }

      const id = att.id || att.attendee_id || att.code || att._id || "N/A";
      const name = att.name || `${att.first_name || ""} ${att.last_name || ""}`.trim() || "Unnamed Member";

      map[size].members.push({
        id,
        name,
        category: isBalika ? "Balika" : "Balak",
        center: att.center || att.mandal || "N/A"
      });
    });

    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [regionFilteredAttendees, tshirtCategory]);

  // Click handler for Bar Chart items
  const handleBarClick = (data) => {
    if (selectedRegion !== "all" && data && data.name) {
      setSelectedCenter(data.name);
    }
  };

  const toggleSizeExpand = (size) => {
    setExpandedSize(prev => prev === size ? null : size);
  };

  const navOptions = [
    { title: "Registered Roster", icon: <FaUsers />, path: "/dashboard/roster", color: "#34a853" },
    { title: "Register Attendee", icon: <FaUserPlus />, path: "/dashboard/add-new", color: "#4285f4" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", width: "100%" }}>
      {/* --- WELCOME HEADER & REGION FILTER --- */}
      <section style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div className={styles.welcomeSection}>
          <h1 style={{ fontSize: "28px", color: "#202124", marginBottom: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
            Jay Swaminarayan, {isLoadingProfile ? (
              <FaSpinner className={styles.spinAnimation} style={{ fontSize: "20px", color: "#e78524" }} />
            ) : (
              userName
            )}
          </h1>
          <p style={{ color: "#5f6368", margin: 0 }}>Select an option below to manage the event portal.</p>
        </div>

        {/* REGION FILTER SELECTOR */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#fff", padding: "8px 14px", border: "1px solid #dadce0", borderRadius: "8px" }}>
          <FaFilter style={{ color: "#5f6368", fontSize: "14px" }} />
          <span style={{ fontSize: "14px", fontWeight: "600", color: "#3c4043" }}>Region Scope:</span>
          <select
            value={selectedRegion}
            onChange={(e) => handleRegionChange(e.target.value)}
            style={{
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: "14px",
              fontWeight: "600",
              color: "#1a73e8",
              cursor: "pointer"
            }}
          >
            <option value="all">All Regions</option>
            {uniqueRegions.map((reg) => (
              <option key={reg} value={reg}>
                {reg}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* --- NAVIGATION CARDS --- */}
      <section className={styles.navGrid} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
        {navOptions.map((opt) => (
          <button
            key={opt.title}
            onClick={() => navigate(opt.path)}
            className={styles.navCard}
            style={{
              padding: "24px",
              border: "1px solid #dadce0",
              borderRadius: "12px",
              background: "#fff",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
              transition: "transform 0.2s, box-shadow 0.2s"
            }}
          >
            <div style={{ fontSize: "32px", color: opt.color }}>{opt.icon}</div>
            <span style={{ fontWeight: "600", color: "#3c4043" }}>{opt.title}</span>
          </button>
        ))}
      </section>

      {/* --- STAT CARDS ROW --- */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
        {/* Total Registered */}
        <div style={statCardStyle}>
          <div style={{ ...circleIconStyle, backgroundColor: "#e8f0fe", color: "#1a73e8" }}>
            <FaUsers />
          </div>
          <div>
            <div style={statNumberStyle}>{dataFetching ? "-" : stats.total}</div>
            <div style={statLabelStyle}>
              {selectedRegion !== "all" ? `${selectedRegion} Attendees` : "Total Registered"}
            </div>
          </div>
        </div>

        {/* Payments Settled */}
        <div style={statCardStyle}>
          <div style={{ ...circleIconStyle, backgroundColor: "#e6f4ea", color: "#137333" }}>
            <FaCreditCard />
          </div>
          <div>
            <div style={statNumberStyle}>{dataFetching ? "-" : stats.paidCount}</div>
            <div style={statLabelStyle}>Payments Cleared</div>
          </div>
        </div>
      </section>

      {/* --- DYNAMIC BAR CHART (REGIONS VS CENTERS WITH BALAK/BALIKA DRILLDOWN) --- */}
      <section style={chartCardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FaMapMarkerAlt style={{ color: "#4285f4", fontSize: "18px" }} />
            <h3 style={{ ...chartTitleStyle, margin: 0 }}>
              {selectedRegion === "all" 
                ? "Registrations by Region" 
                : selectedCenter 
                  ? `${selectedCenter} Center Breakdown`
                  : `Centers in ${selectedRegion} (Click center to view Balaks/Balikas)`}
            </h3>
          </div>

          {selectedCenter && (
            <button
              onClick={() => setSelectedCenter(null)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "#f1f3f4",
                border: "1px solid #dadce0",
                borderRadius: "6px",
                padding: "6px 12px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "600",
                color: "#3c4043"
              }}
            >
              <FaArrowLeft /> Back to Centers
            </button>
          )}
        </div>
        
        {dataFetching ? (
          <div style={loaderWrapperStyle}><FaSpinner className={styles.spinAnimation} style={{ fontSize: "24px", color: "#4285f4" }} /></div>
        ) : selectedCenter ? (
          /* BALAK VS BALIKA PIE CHART FOR SELECTED CENTER */
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={stats.balakBalikaBreakdown}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {stats.balakBalikaBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          /* MAIN BAR CHART (REGIONS / CENTERS) */
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.barChartData} margin={{ top: 15, right: 15, left: -20, bottom: 25 }}>
              <XAxis dataKey="name" stroke="#5f6368" fontSize={12} tickLine={false} interval={0} angle={-15} textAnchor="end" />
              <YAxis stroke="#5f6368" fontSize={12} tickLine={false} allowDecimals={false} />
              <Tooltip cursor={{ fill: "rgba(0, 0, 0, 0.04)" }} />
              <Bar 
                dataKey="Count" 
                fill="#4285f4" 
                radius={[6, 6, 0, 0]} 
                barSize={36} 
                onClick={handleBarClick}
                style={{ cursor: selectedRegion !== "all" ? "pointer" : "default" }}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* --- PAYMENT BREAKDOWN ROW --- */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
        <div style={chartCardStyle}>
          <h3 style={chartTitleStyle}>Payment Status</h3>
          {dataFetching ? (
            <div style={loaderWrapperStyle}><FaSpinner className={styles.spinAnimation} style={{ fontSize: "24px", color: "#4285f4" }} /></div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={stats.paymentPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {stats.paymentPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* --- T-SHIRT INVENTORY BREAKDOWN WITH BALAK / BALIKA FILTER & MEMBER LIST --- */}
      {!dataFetching && (
        <section style={chartCardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <FaTshirt style={{ color: "#ea4335", fontSize: "18px" }} />
              <h3 style={{ ...chartTitleStyle, margin: 0 }}>T-Shirt Size Summary</h3>
            </div>

            {/* BALAK / BALIKA FILTER BUTTONS */}
            <div style={{ display: "flex", background: "#f1f3f4", padding: "3px", borderRadius: "8px", border: "1px solid #dadce0" }}>
              <button
                onClick={() => setTshirtCategory("all")}
                style={{
                  padding: "6px 14px",
                  fontSize: "13px",
                  fontWeight: "600",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  background: tshirtCategory === "all" ? "#fff" : "transparent",
                  color: tshirtCategory === "all" ? "#1a73e8" : "#5f6368",
                  boxShadow: tshirtCategory === "all" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.2s"
                }}
              >
                All
              </button>
              <button
                onClick={() => setTshirtCategory("balak")}
                style={{
                  padding: "6px 14px",
                  fontSize: "13px",
                  fontWeight: "600",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  background: tshirtCategory === "balak" ? "#3b82f6" : "transparent",
                  color: tshirtCategory === "balak" ? "#fff" : "#5f6368",
                  boxShadow: tshirtCategory === "balak" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.2s"
                }}
              >
                Balaks
              </button>
              <button
                onClick={() => setTshirtCategory("balika")}
                style={{
                  padding: "6px 14px",
                  fontSize: "13px",
                  fontWeight: "600",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  background: tshirtCategory === "balika" ? "#ec4899" : "transparent",
                  color: tshirtCategory === "balika" ? "#fff" : "#5f6368",
                  boxShadow: tshirtCategory === "balika" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.2s"
                }}
              >
                Balikas
              </button>
            </div>
          </div>

          {tshirtStats.length === 0 ? (
            <p style={{ color: "#5f6368", fontSize: "14px", fontStyle: "italic", margin: 0 }}>No T-shirt size records found for the selected filter.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {tshirtStats.map((item) => {
                const isExpanded = expandedSize === item.size;

                return (
                  <div
                    key={item.size}
                    style={{
                      border: "1px solid #dadce0",
                      borderRadius: "8px",
                      background: "#f8f9fa",
                      overflow: "hidden"
                    }}
                  >
                    {/* Size Summary Header */}
                    <div
                      onClick={() => toggleSizeExpand(item.size)}
                      style={{
                        padding: "12px 16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        userSelect: "none"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{ fontWeight: "700", color: "#202124", fontSize: "15px", minWidth: "50px" }}>
                          Size {item.size}
                        </span>
                        
                        <span style={{ background: "#e8f0fe", color: "#1a73e8", fontWeight: "700", padding: "2px 10px", borderRadius: "12px", fontSize: "13px" }}>
                          Total: {item.count}
                        </span>

                        {tshirtCategory === "all" && (
                          <div style={{ display: "flex", gap: "6px" }}>
                            <span style={{ background: "#dbeafe", color: "#1e40af", fontWeight: "600", padding: "2px 8px", borderRadius: "10px", fontSize: "11px" }}>
                              Balaks: {item.balakCount}
                            </span>
                            <span style={{ background: "#fce7f3", color: "#9d174d", fontWeight: "600", padding: "2px 8px", borderRadius: "10px", fontSize: "11px" }}>
                              Balikas: {item.balikaCount}
                            </span>
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#5f6368", fontSize: "13px" }}>
                        <span>{isExpanded ? "Hide Attendees" : "View Attendees"}</span>
                        {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                      </div>
                    </div>

                    {/* Expandable Attendee Details List */}
                    {isExpanded && (
                      <div style={{ borderTop: "1px solid #dadce0", background: "#fff", padding: "12px 16px" }}>
                        <div style={{ maxHeight: "240px", overflowY: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                            <thead>
                              <tr style={{ borderBottom: "1px solid #e8eaed", textAlign: "left", color: "#5f6368" }}>
                                <th style={{ padding: "8px 4px" }}>ID</th>
                                <th style={{ padding: "8px 4px" }}>Attendee Name</th>
                                <th style={{ padding: "8px 4px" }}>Category</th>
                                <th style={{ padding: "8px 4px" }}>Center</th>
                              </tr>
                            </thead>
                            <tbody>
                              {item.members.map((member, index) => (
                                <tr key={`${member.id}-${index}`} style={{ borderBottom: "1px solid #f1f3f4" }}>
                                  <td style={{ padding: "8px 4px", fontWeight: "600", color: "#1a73e8" }}>{member.id}</td>
                                  <td style={{ padding: "8px 4px", color: "#202124", fontWeight: "500" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                      <FaUserCircle style={{ color: "#9aa0a6" }} />
                                      {member.name}
                                    </div>
                                  </td>
                                  <td style={{ padding: "8px 4px" }}>
                                    <span style={{
                                      padding: "2px 8px",
                                      borderRadius: "10px",
                                      fontSize: "11px",
                                      fontWeight: "600",
                                      background: member.category === "Balika" ? "#fce7f3" : "#dbeafe",
                                      color: member.category === "Balika" ? "#9d174d" : "#1e40af"
                                    }}>
                                      {member.category}
                                    </span>
                                  </td>
                                  <td style={{ padding: "8px 4px", color: "#5f6368" }}>{member.center}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Global spinning keyframes */}
      <style>{`
        .${styles.spinAnimation} {
          animation: overviewSpin 1s linear infinite;
        }
        @keyframes overviewSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/* Inline Layout Styles */
const statCardStyle = {
  background: "#fff",
  border: "1px solid #dadce0",
  borderRadius: "12px",
  padding: "16px 20px",
  display: "flex",
  alignItems: "center",
  gap: "16px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
};

const circleIconStyle = {
  width: "48px",
  height: "48px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "20px",
  flexShrink: 0
};

const statNumberStyle = {
  fontSize: "22px",
  fontWeight: "700",
  color: "#202124",
  lineHeight: 1.2
};

const statLabelStyle = {
  fontSize: "13px",
  color: "#5f6368",
  fontWeight: "500"
};

const chartCardStyle = {
  background: "#fff",
  border: "1px solid #dadce0",
  borderRadius: "12px",
  padding: "20px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
};

const chartTitleStyle = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#202124",
  marginBottom: "16px"
};

const loaderWrapperStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: "200px"
};