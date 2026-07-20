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
  FaUserCircle,
  FaDownload,
  FaUserTie,
  FaLock,
  FaExclamationCircle
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
import { userRoles, karayakars as karayakarsApi } from "../../apiClient"; 
import styles from "../Dashboard/Dashboard.module.css";

// Helper function to extract and sanitize full name
const getFullName = (person) => {
  if (!person) return "Unnamed Member";

  const singleStringName = 
    person.full_name || 
    person.fullName || 
    person.name || 
    person.karyakar_name || 
    person.karyakarName;

  if (singleStringName && typeof singleStringName === "string" && singleStringName.trim()) {
    return singleStringName.trim();
  }

  const parts = [
    person.first_name || person.firstName, 
    person.middle_name || person.middleName, 
    person.last_name || person.lastName
  ]
    .filter(Boolean)
    .map(p => (typeof p === "string" ? p.trim() : ""))
    .filter(Boolean);

  return parts.length > 0 ? parts.join(" ") : "Unnamed Member";
};

// Robust helper to extract Member ID across all Attendee & Karyakar schemas
const getMemberId = (person) => {
  if (!person) return "N/A";

  const idVal = 
    person.member_id || 
    person.memberId || 
    person.code || 
    person.karyakar_code || 
    person.karyakarCode || 
    person.karyakar_id || 
    person.karyakarId || 
    person.id || 
    person.mtrc_code ||
    person.registration_id;

  if (idVal && typeof idVal === "string" && idVal.trim()) {
    return idVal.trim();
  }
  return "N/A";
};

// Robust helper to extract T-Shirt Size across all Attendee & Karyakar schemas
const getTshirtSize = (person) => {
  if (!person) return "";

  const rawSize = 
    person.tshirt_size || 
    person.tshirtSize || 
    person.shirt_size || 
    person.shirtSize || 
    person.tshirt || 
    person.size || 
    person.t_shirt_size ||
    person.tShirtSize;

  if (rawSize) return String(rawSize);

  // Fallback: If size is concatenated inside center/location string (e.g. "Eldoret_3XL")
  const rawCenter = person.center || person.mandal || person.location || "";
  const match = String(rawCenter).match(/_(3XL|2XL|XL|L|M|S|XS)/i);
  if (match) {
    return match[1];
  }

  return "";
};

// Helper function to strip region prefixes (e.g., "_3xl_South", "3xl_North")
const cleanRegion = (rawRegion) => {
  if (!rawRegion || typeof rawRegion !== "string") return "";
  
  const sanitized = rawRegion.trim().replace(/^(_?\d*[a-zA-Z0-9]+_|_)/, "");
  
  if (!sanitized) return rawRegion.trim();
  return sanitized.charAt(0).toUpperCase() + sanitized.slice(1);
};

// Helper function to strip center prefixes & trailing size/code attachments
const cleanCenter = (rawCenter) => {
  if (!rawCenter || typeof rawCenter !== "string") return "";

  let sanitized = rawCenter.trim();

  // Strip attached trailing sizes or next code markers
  sanitized = sanitized.replace(/(_?\d*[A-Z0-9]*MTRC-\d+|_?\d*XL.*|_?\d*XS|_?\d*S|_?\d*M|_?\d*L)$/i, "");

  // Strip leading size/code prefixes like _3xl_ or 3xl_
  sanitized = sanitized.replace(/^(_?\d*[a-zA-Z0-9]+_|_)/, "");

  sanitized = sanitized.trim();
  if (!sanitized) return rawCenter.trim();

  return sanitized.charAt(0).toUpperCase() + sanitized.slice(1);
};

// Helper function to sanitize T-shirt sizes
const cleanTshirtSize = (rawSize) => {
  if (!rawSize || typeof rawSize !== "string") return "";

  let cleaned = rawSize.trim().toUpperCase();

  // Strip attached code markers if concatenated (e.g., "3XLMTRC-0085" -> "3XL")
  cleaned = cleaned.replace(/MTRC-\d+/g, "").replace(/^(_+)/, "").trim();

  if (cleaned.includes("3XL") || cleaned.includes("XXXL")) return "3XL";
  if (cleaned.includes("2XL") || cleaned.includes("XXL")) return "2XL";
  if (cleaned.includes("XL")) return "XL";
  if (cleaned.includes("LARGE") || cleaned === "L") return "L";
  if (cleaned.includes("MEDIUM") || cleaned === "M") return "M";
  if (cleaned.includes("SMALL") || cleaned === "S") return "S";
  if (cleaned.includes("XS")) return "XS";

  return cleaned;
};

export default function OverviewMetrics({ 
  attendees = [], 
  dataFetching = false, 
  regionScope = "all" 
}) {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("Admin"); 
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Karyakars state & loading
  const [karyakarsList, setKaryakarsList] = useState([]);
  const [isFetchingKaryakars, setIsFetchingKaryakars] = useState(true);
  
  // Sanitized region scope
  const cleanScope = cleanRegion(regionScope);
  
  // Region & Selected Center state
  const [selectedRegion, setSelectedRegion] = useState(cleanScope || "all");
  const [selectedCenter, setSelectedCenter] = useState(null);

  // T-Shirt Section Filter State ("all", "balak", "balika", "karyakar", "missing")
  const [tshirtCategory, setTshirtCategory] = useState("all");
  const [expandedSize, setExpandedSize] = useState(null);

  // Is region locked by parent prop?
  const isRegionLocked = regionScope && regionScope !== "all";

  // Sync region state if prop changes
  useEffect(() => {
    setSelectedRegion(cleanRegion(regionScope) || "all");
    setSelectedCenter(null);
  }, [regionScope]);

  // Reset selected center if region changes
  const handleRegionChange = (newRegion) => {
    if (isRegionLocked) return; 
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

  // Fetch Karyakars Data
  useEffect(() => {
    setIsFetchingKaryakars(true);
    const fetchKaryakars = karayakarsApi?.getAll || karayakarsApi?.list || karayakarsApi;

    if (typeof fetchKaryakars === "function") {
      fetchKaryakars()
        .then((res) => {
          const data = res?.data || res || [];
          setKaryakarsList(Array.isArray(data) ? data : []);
        })
        .catch((err) => {
          console.error("Error fetching Karyakars list:", err);
        })
        .finally(() => {
          setIsFetchingKaryakars(false);
        });
    } else {
      setIsFetchingKaryakars(false);
    }
  }, []);

  // Combine attendees and karyakars with normalized region AND normalized center
  const combinedPeople = useMemo(() => {
    const formattedAttendees = attendees.map(a => {
      const rawCenter = a.center || a.mandal || a.location || "";
      return { 
        ...a, 
        isKaryakar: false,
        normalizedRegion: cleanRegion(a.region),
        normalizedCenter: cleanCenter(rawCenter)
      };
    });

    const formattedKaryakars = karyakarsList.map(k => {
      const rawCenter = k.center || k.mandal || k.location || "";
      return { 
        ...k, 
        isKaryakar: true,
        normalizedRegion: cleanRegion(k.region),
        normalizedCenter: cleanCenter(rawCenter)
      };
    });

    return [...formattedAttendees, ...formattedKaryakars];
  }, [attendees, karyakarsList]);

  // Extract unique valid cleaned regions
  const uniqueRegions = useMemo(() => {
    const set = new Set();
    combinedPeople.forEach((person) => {
      if (person.normalizedRegion) {
        set.add(person.normalizedRegion);
      }
    });
    return Array.from(set).sort();
  }, [combinedPeople]);

  // Filter combined dataset by cleaned region
  const regionFilteredPeople = useMemo(() => {
    if (!selectedRegion || selectedRegion === "all") {
      return combinedPeople;
    }
    return combinedPeople.filter(
      (person) => person.normalizedRegion.toLowerCase() === selectedRegion.toLowerCase()
    );
  }, [combinedPeople, selectedRegion]);

  // Compute metrics based on selected region & center drilldown
  const stats = useMemo(() => {
    const total = regionFilteredPeople.length;

    let paidCount = 0;
    let unpaidCount = 0;

    const breakdownCounts = {};
    let balakBalikaBreakdown = [
      { name: "Balaks", value: 0, color: "#3b82f6" },
      { name: "Balikas", value: 0, color: "#ec4899" },
      { name: "Karyakars", value: 0, color: "#10b981" },
    ];

    regionFilteredPeople.forEach((person) => {
      if (selectedRegion === "all") {
        const regionKey = person.normalizedRegion;
        if (regionKey) {
          breakdownCounts[regionKey] = (breakdownCounts[regionKey] || 0) + 1;
        }
      } else {
        const centerKey = person.normalizedCenter;
        if (centerKey) {
          breakdownCounts[centerKey] = (breakdownCounts[centerKey] || 0) + 1;
        }
      }

      const paymentStatus = (person.payment_status || person.paymentStatus || person.payment || "").toLowerCase();
      if (paymentStatus === "paid" || paymentStatus === "completed" || paymentStatus === "success" || person.isPaid) {
        paidCount++;
      } else {
        unpaidCount++;
      }
    });

    if (selectedCenter && selectedRegion !== "all") {
      let balaks = 0;
      let balikas = 0;
      let karyakarCount = 0;

      regionFilteredPeople.forEach((person) => {
        const centerKey = person.normalizedCenter;
        if (centerKey && centerKey.toLowerCase() === selectedCenter.toLowerCase()) {
          if (person.isKaryakar) {
            karyakarCount++;
          } else {
            const gender = (person.gender || person.category || person.type || "").toLowerCase();
            if (gender.includes("balika") || gender === "f" || gender === "female") {
              balikas++;
            } else {
              balaks++;
            }
          }
        }
      });

      balakBalikaBreakdown = [
        { name: "Balaks", value: balaks, color: "#3b82f6" },
        { name: "Balikas", value: balikas, color: "#ec4899" },
        { name: "Karyakars", value: karyakarCount, color: "#10b981" },
      ];
    }

    const barChartData = Object.keys(breakdownCounts).map((label) => ({
      name: label,
      Count: breakdownCounts[label],
    }));

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
  }, [regionFilteredPeople, selectedRegion, selectedCenter]);

  // Compute T-Shirt stats with Clean Sizes, Member IDs, & Centers
  const { tshirtStats, unassignedCount } = useMemo(() => {
    const map = {};
    let missingTotal = 0;

    regionFilteredPeople.forEach((person) => {
      const rawSize = getTshirtSize(person);
      const sanitizedSize = cleanTshirtSize(rawSize);

      const isMissing = !sanitizedSize || sanitizedSize === "NONE" || sanitizedSize === "N/A";
      if (isMissing) {
        missingTotal++;
      }

      const size = isMissing ? "NOT ADDED" : sanitizedSize;

      const gender = (person.gender || person.category || person.type || "").toLowerCase();
      const isBalika = gender.includes("balika") || gender === "f" || gender === "female";
      
      let category = "balak";
      if (person.isKaryakar) {
        category = "karyakar";
      } else if (isBalika) {
        category = "balika";
      }

      if (tshirtCategory === "missing" && !isMissing) return;
      if (tshirtCategory !== "all" && tshirtCategory !== "missing" && tshirtCategory !== category) return;

      if (!map[size]) {
        map[size] = {
          size,
          isMissingGroup: isMissing,
          count: 0,
          balakCount: 0,
          balikaCount: 0,
          karyakarCount: 0,
          members: []
        };
      }

      map[size].count += 1;
      if (person.isKaryakar) {
        map[size].karyakarCount += 1;
      } else if (isBalika) {
        map[size].balikaCount += 1;
      } else {
        map[size].balakCount += 1;
      }

      const memberId = getMemberId(person);
      const fullName = getFullName(person);
      const cleanCenterVal = person.normalizedCenter;

      map[size].members.push({
        member_id: memberId,
        name: fullName,
        category: person.isKaryakar ? "Karyakar" : isBalika ? "Balika" : "Balak",
        center: cleanCenterVal || "N/A"
      });
    });

    const list = Object.values(map).sort((a, b) => {
      if (a.isMissingGroup) return 1;
      if (b.isMissingGroup) return -1;
      return b.count - a.count;
    });

    return { tshirtStats: list, unassignedCount: missingTotal };
  }, [regionFilteredPeople, tshirtCategory]);

  // Export T-Shirt Summary & Members List to CSV
  const handleExportTshirts = () => {
    if (tshirtStats.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,";

    csvContent += "--- T-SHIRT SUMMARY TOTALS ---\n";
    if (tshirtCategory === "balak") {
      csvContent += "Size,Total Balaks Count\n";
    } else if (tshirtCategory === "balika") {
      csvContent += "Size,Total Balikas Count\n";
    } else if (tshirtCategory === "karyakar") {
      csvContent += "Size,Total Karyakars Count\n";
    } else if (tshirtCategory === "missing") {
      csvContent += "Size,Total Missing T-Shirts Count\n";
    } else {
      csvContent += "Size,Total Count,Balaks Count,Balikas Count,Karyakars Count\n";
    }

    let grandTotal = 0;
    let grandBalaks = 0;
    let grandBalikas = 0;
    let grandKaryakars = 0;

    tshirtStats.forEach((item) => {
      grandTotal += item.count;
      grandBalaks += item.balakCount;
      grandBalikas += item.balikaCount;
      grandKaryakars += item.karyakarCount;

      if (tshirtCategory === "balak") {
        csvContent += `"${item.size}",${item.balakCount}\n`;
      } else if (tshirtCategory === "balika") {
        csvContent += `"${item.size}",${item.balikaCount}\n`;
      } else if (tshirtCategory === "karyakar") {
        csvContent += `"${item.size}",${item.karyakarCount}\n`;
      } else if (tshirtCategory === "missing") {
        csvContent += `"${item.size}",${item.count}\n`;
      } else {
        csvContent += `"${item.size}",${item.count},${item.balakCount},${item.balikaCount},${item.karyakarCount}\n`;
      }
    });

    if (tshirtCategory === "balak") {
      csvContent += `"TOTAL SUMMARY",${grandBalaks}\n\n`;
    } else if (tshirtCategory === "balika") {
      csvContent += `"TOTAL SUMMARY",${grandBalikas}\n\n`;
    } else if (tshirtCategory === "karyakar") {
      csvContent += `"TOTAL SUMMARY",${grandKaryakars}\n\n`;
    } else {
      csvContent += `"TOTAL SUMMARY",${grandTotal},${grandBalaks},${grandBalikas},${grandKaryakars}\n\n`;
    }

    csvContent += "--- MEMBER BREAKDOWN LIST ---\n";
    csvContent += "Member ID,Full Name,Category,Center,T-Shirt Size\n";

    tshirtStats.forEach((item) => {
      item.members.forEach((member) => {
        const cleanName = `"${member.name.replace(/"/g, '""')}"`;
        const cleanCenterStr = `"${member.center.replace(/"/g, '""')}"`;
        csvContent += `"${member.member_id}",${cleanName},"${member.category}",${cleanCenterStr},"${item.size}"\n`;
      });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const filterLabel = tshirtCategory === "all" ? "All" : tshirtCategory.toUpperCase();
    const regionLabel = selectedRegion === "all" ? "AllRegions" : selectedRegion;
    link.setAttribute("download", `TShirt_Summary_${regionLabel}_${filterLabel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

  const isDataLoading = dataFetching || isFetchingKaryakars;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", width: "100%" }}>
      {/* Welcome & Region Scope Filter Header */}
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

        {!isRegionLocked ? (
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
        ) : (
          <div style={{ display: "none", alignItems: "center", gap: "8px", background: "#f1f3f4", padding: "8px 14px", border: "1px solid #dadce0", borderRadius: "8px" }}>
            <FaLock style={{ color: "#5f6368", fontSize: "13px" }} />
            <span style={{ fontSize: "14px", fontWeight: "600", color: "#3c4043" }}>
              Region Locked: <span style={{ color: "#1a73e8" }}>{selectedRegion}</span>
            </span>
          </div>
        )}
      </section>

      {/* Action Cards */}
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

      {/* Top Metrics Cards */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
        <div style={statCardStyle}>
          <div style={{ ...circleIconStyle, backgroundColor: "#e8f0fe", color: "#1a73e8" }}>
            <FaUsers />
          </div>
          <div>
            <div style={statNumberStyle}>{isDataLoading ? "-" : stats.total}</div>
            <div style={statLabelStyle}>
              {selectedRegion !== "all" ? `${selectedRegion} Attendees & Karyakars` : "Total Registrations"}
            </div>
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={{ ...circleIconStyle, backgroundColor: "#e6f4ea", color: "#137333" }}>
            <FaCreditCard />
          </div>
          <div>
            <div style={statNumberStyle}>{isDataLoading ? "-" : stats.paidCount}</div>
            <div style={statLabelStyle}>Payments Cleared</div>
          </div>
        </div>

        <div 
          style={{ ...statCardStyle, cursor: "pointer" }}
          onClick={() => setTshirtCategory("missing")}
        >
          <div style={{ ...circleIconStyle, backgroundColor: "#fef3c7", color: "#d97706" }}>
            <FaExclamationCircle />
          </div>
          <div>
            <div style={statNumberStyle}>{isDataLoading ? "-" : unassignedCount}</div>
            <div style={statLabelStyle}>Missing T-Shirts</div>
          </div>
        </div>
      </section>

      {/* Bar & Drilldown Pie Chart */}
      <section style={chartCardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FaMapMarkerAlt style={{ color: "#4285f4", fontSize: "18px" }} />
            <h3 style={{ ...chartTitleStyle, margin: 0 }}>
              {selectedRegion === "all" 
                ? "Registrations by Region" 
                : selectedCenter 
                  ? `${selectedCenter} Center Breakdown`
                  : `Centers in ${selectedRegion} (Click center to view Breakdown)`}
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
        
        {isDataLoading ? (
          <div style={loaderWrapperStyle}><FaSpinner className={styles.spinAnimation} style={{ fontSize: "24px", color: "#4285f4" }} /></div>
        ) : selectedCenter ? (
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

      {/* Payment Status Chart */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
        <div style={chartCardStyle}>
          <h3 style={chartTitleStyle}>Payment Status</h3>
          {isDataLoading ? (
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

      {/* T-Shirt Size Accordion & Export Section */}
      {!isDataLoading && (
        <section style={chartCardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <FaTshirt style={{ color: "#ea4335", fontSize: "18px" }} />
              <h3 style={{ ...chartTitleStyle, margin: 0 }}>T-Shirt Size Summary</h3>
              {unassignedCount > 0 && (
                <span 
                  onClick={() => setTshirtCategory("missing")}
                  style={{
                    background: "#fef3c7",
                    color: "#b45309",
                    border: "1px solid #fde68a",
                    fontSize: "12px",
                    fontWeight: "700",
                    padding: "3px 10px",
                    borderRadius: "12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px"
                  }}
                  title="Click to view members with missing T-Shirt size"
                >
                  <FaExclamationCircle /> {unassignedCount} Missing
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <button
                onClick={handleExportTshirts}
                disabled={tshirtStats.length === 0}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: tshirtStats.length === 0 ? "#e0e0e0" : "#1e8e3e",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "7px 14px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: tshirtStats.length === 0 ? "not-allowed" : "pointer",
                  transition: "background 0.2s"
                }}
              >
                <FaDownload /> Export T-Shirts CSV
              </button>

              <div style={{ display: "flex", background: "#f1f3f4", padding: "3px", borderRadius: "8px", border: "1px solid #dadce0", flexWrap: "wrap", gap: "2px" }}>
                <button
                  onClick={() => setTshirtCategory("all")}
                  style={{
                    padding: "6px 12px",
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
                    padding: "6px 12px",
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
                    padding: "6px 12px",
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
                <button
                  onClick={() => setTshirtCategory("karyakar")}
                  style={{
                    padding: "6px 12px",
                    fontSize: "13px",
                    fontWeight: "600",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    background: tshirtCategory === "karyakar" ? "#10b981" : "transparent",
                    color: tshirtCategory === "karyakar" ? "#fff" : "#5f6368",
                    boxShadow: tshirtCategory === "karyakar" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                    transition: "all 0.2s"
                  }}
                >
                  Karyakars
                </button>
                <button
                  onClick={() => setTshirtCategory("missing")}
                  style={{
                    padding: "6px 12px",
                    fontSize: "13px",
                    fontWeight: "600",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    background: tshirtCategory === "missing" ? "#d97706" : "transparent",
                    color: tshirtCategory === "missing" ? "#fff" : "#78350f",
                    boxShadow: tshirtCategory === "missing" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                    transition: "all 0.2s"
                  }}
                >
                  Missing T-Shirt ({unassignedCount})
                </button>
              </div>
            </div>
          </div>

          {tshirtStats.length === 0 ? (
            <p style={{ color: "#5f6368", fontSize: "14px", fontStyle: "italic", margin: 0 }}>No T-shirt size records found for the selected filter.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {tshirtStats.map((item) => {
                const isExpanded = expandedSize === item.size;
                const isMissingGroup = item.isMissingGroup;

                return (
                  <div
                    key={item.size}
                    style={{
                      border: isMissingGroup ? "1px solid #fde68a" : "1px solid #dadce0",
                      borderRadius: "8px",
                      background: isMissingGroup ? "#fffbeb" : "#f8f9fa",
                      overflow: "hidden"
                    }}
                  >
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
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                        <span style={{ 
                          fontWeight: "700", 
                          color: isMissingGroup ? "#b45309" : "#202124", 
                          fontSize: "15px", 
                          minWidth: "90px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px"
                        }}>
                          {isMissingGroup && <FaExclamationCircle style={{ color: "#d97706" }} />}
                          {isMissingGroup ? "NOT ADDED" : `Size ${item.size}`}
                        </span>
                        
                        <span style={{ 
                          background: isMissingGroup ? "#fef3c7" : "#e8f0fe", 
                          color: isMissingGroup ? "#92400e" : "#1a73e8", 
                          fontWeight: "700", 
                          padding: "2px 10px", 
                          borderRadius: "12px", 
                          fontSize: "13px" 
                        }}>
                          Total: {item.count}
                        </span>

                        {tshirtCategory === "all" && (
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                            <span style={{ background: "#dbeafe", color: "#1e40af", fontWeight: "600", padding: "2px 8px", borderRadius: "10px", fontSize: "11px" }}>
                              Balaks: {item.balakCount}
                            </span>
                            <span style={{ background: "#fce7f3", color: "#9d174d", fontWeight: "600", padding: "2px 8px", borderRadius: "10px", fontSize: "11px" }}>
                              Balikas: {item.balikaCount}
                            </span>
                            <span style={{ background: "#d1fae5", color: "#065f46", fontWeight: "600", padding: "2px 8px", borderRadius: "10px", fontSize: "11px" }}>
                              Karyakars: {item.karyakarCount}
                            </span>
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#5f6368", fontSize: "13px" }}>
                        <span>{isExpanded ? "Hide Members Left" : "View Members Left"}</span>
                        {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ borderTop: isMissingGroup ? "1px solid #fde68a" : "1px solid #dadce0", background: "#fff", padding: "12px 16px" }}>
                        <div style={{ maxHeight: "240px", overflowY: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                            <thead>
                              <tr style={{ borderBottom: "1px solid #e8eaed", textAlign: "left", color: "#5f6368" }}>
                                <th style={{ padding: "8px 4px" }}>Member ID</th>
                                <th style={{ padding: "8px 4px" }}>Full Name</th>
                                <th style={{ padding: "8px 4px" }}>Category</th>
                                <th style={{ padding: "8px 4px" }}>Center</th>
                              </tr>
                            </thead>
                            <tbody>
                              {item.members.map((member, index) => (
                                <tr key={`${member.member_id}-${index}`} style={{ borderBottom: "1px solid #f1f3f4" }}>
                                  <td style={{ padding: "8px 4px", fontWeight: "600", color: "#1a73e8" }}>{member.member_id}</td>
                                  <td style={{ padding: "8px 4px", color: "#202124", fontWeight: "500" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                      {member.category === "Karyakar" ? (
                                        <FaUserTie style={{ color: "#10b981" }} />
                                      ) : (
                                        <FaUserCircle style={{ color: "#9aa0a6" }} />
                                      )}
                                      {member.name}
                                    </div>
                                  </td>
                                  <td style={{ padding: "8px 4px" }}>
                                    <span style={{
                                      padding: "2px 8px",
                                      borderRadius: "10px",
                                      fontSize: "11px",
                                      fontWeight: "600",
                                      background: member.category === "Karyakar" ? "#d1fae5" : member.category === "Balika" ? "#fce7f3" : "#dbeafe",
                                      color: member.category === "Karyakar" ? "#065f46" : member.category === "Balika" ? "#9d174d" : "#1e40af"
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

/* Inline Card Layout Styles */
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