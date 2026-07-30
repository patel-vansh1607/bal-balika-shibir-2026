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
  FaDownload,
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

// Inlined Style Constants to Prevent ESLint 'no-undef' Warnings
const statCardStyle = {
  background: "#ffffff",
  border: "1px solid #dadce0",
  borderRadius: "12px",
  padding: "20px",
  display: "flex",
  alignItems: "center",
  gap: "16px",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
};

const circleIconStyle = {
  width: "48px",
  height: "48px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "20px",
  flexShrink: 0,
};

const statNumberStyle = {
  fontSize: "28px",
  fontWeight: "700",
  color: "#202124",
  lineHeight: "1.2",
};

const statLabelStyle = {
  fontSize: "13px",
  fontWeight: "600",
  color: "#5f6368",
  marginTop: "4px",
};

const chartCardStyle = {
  background: "#ffffff",
  border: "1px solid #dadce0",
  borderRadius: "12px",
  padding: "20px",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
  width: "100%",
  boxSizing: "border-box",
};

const chartTitleStyle = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#202124",
};

const loaderWrapperStyle = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  height: "220px",
  width: "100%",
};

// Standard order of all available sizes
const ALL_STANDARD_SIZES = [
  "XXXS",
  "XXS",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "2XL",
  "3XL"
];

// Helper to determine if a karyakar is female based on seva designation
const getIsFemale = (karyakar) => {
  if (!karyakar || !karyakar.seva_designation) return false;

  const designations =
    typeof karyakar.seva_designation === "string"
      ? karyakar.seva_designation.split(", ")
      : Array.isArray(karyakar.seva_designation)
        ? karyakar.seva_designation
        : [];

  return designations.some((role) => {
    const r = role.toUpperCase();

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
};

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

// Extract Member ID across all Attendee & Karyakar schemas
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

// Extract T-Shirt Size across all Attendee & Karyakar schemas
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

  const rawCenter = person.center || person.mandal || person.location || "";
  const match = String(rawCenter).match(/_(3XL|XXXL|2XL|XXL|XL|L|M|S|XS|XXS|XXXS)/i);
  if (match) {
    return match[1];
  }

  return "";
};

// Helper function to strip region prefixes
const cleanRegion = (rawRegion) => {
  if (!rawRegion || typeof rawRegion !== "string") return "";
  
  const sanitized = rawRegion.trim().replace(/^(_?\d*[a-zA-Z0-9]+_|_)/, "");
  
  if (!sanitized) return rawRegion.trim();
  return sanitized.charAt(0).toUpperCase() + sanitized.slice(1);
};

// Helper function to strip center prefixes
const cleanCenter = (rawCenter) => {
  if (!rawCenter || typeof rawCenter !== "string") return "";

  let sanitized = rawCenter.trim();
  sanitized = sanitized.replace(/(_?\d*[A-Z0-9]*MTRC-\d+|_?\d*XL.*|_?\d*XS|_?\d*S|_?\d*M|_?\d*L)$/i, "");
  sanitized = sanitized.replace(/^(_?\d*[a-zA-Z0-9]+_|_)/, "");

  sanitized = sanitized.trim();
  if (!sanitized) return rawCenter.trim();

  return sanitized.charAt(0).toUpperCase() + sanitized.slice(1);
};

// Helper function to sanitize T-shirt sizes
const cleanTshirtSize = (rawSize) => {
  if (!rawSize || typeof rawSize !== "string") return "";

  let cleaned = rawSize.trim().toUpperCase();
  cleaned = cleaned.replace(/MTRC-\d+/g, "").replace(/^(_+)/, "").trim();

  if (cleaned.includes("XXXS") || cleaned.includes("3XS")) return "XXXS";
  if (cleaned.includes("XXS") || cleaned.includes("2XS")) return "XXS";
  if (cleaned.includes("3XL") || cleaned.includes("XXXL")) return "3XL";
  if (cleaned.includes("2XL") || cleaned.includes("XXL")) return "2XL";
  if (cleaned.includes("XL")) return "XL";
  if (cleaned.includes("LARGE") || cleaned === "L") return "L";
  if (cleaned.includes("MEDIUM") || cleaned === "M") return "M";
  if (cleaned.includes("SMALL") || cleaned === "S") return "S";
  if (cleaned.includes("XS")) return "XS";

  return cleaned;
};

// Helper function to evaluate payment status safely for both tables
const checkIsPaid = (person) => {
  if (!person) return false;

  const rawIsPaid = 
    person.is_paid ?? 
    person.isPaid ?? 
    person.karyakar_is_paid ?? 
    person.karyakarIsPaid;

  const isPaidFlag = rawIsPaid === 1 || rawIsPaid === true || rawIsPaid === "1" || rawIsPaid === "true";
  
  const paymentStatus = String(
    person.payment_status || 
    person.paymentStatus || 
    person.payment || 
    ""
  ).toLowerCase();

  const isPaidStatus = 
    paymentStatus === "paid" || 
    paymentStatus === "completed" || 
    paymentStatus === "success";

  return isPaidFlag || isPaidStatus;
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

  // T-Shirt Section Filter State ("all", "balak", "balika", "karyakar_male", "karyakar_female", "missing")
  const [tshirtCategory, setTshirtCategory] = useState("all");
  const [expandedSize, setExpandedSize] = useState(null);

  const isRegionLocked = regionScope && regionScope !== "all";

  useEffect(() => {
    setSelectedRegion(cleanRegion(regionScope) || "all");
    setSelectedCenter(null);
  }, [regionScope]);

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

  // Combine attendees and karyakars
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

  // Extract unique regions
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

  // Compute stats
  const stats = useMemo(() => {
    const total = regionFilteredPeople.length;

    let attendeeTotalCount = 0;
    let attendeePaidCount = 0;
    let attendeeUnpaidCount = 0;
    let karyakarTotalCount = 0;
    let karyakarPaidCount = 0;
    let karyakarUnpaidCount = 0;

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

      const isPaid = checkIsPaid(person);

      if (person.isKaryakar) {
        karyakarTotalCount++;
        if (isPaid) {
          karyakarPaidCount++;
        } else {
          karyakarUnpaidCount++;
        }
      } else {
        attendeeTotalCount++;
        if (isPaid) {
          attendeePaidCount++;
        } else {
          attendeeUnpaidCount++;
        }
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
      { name: "Attendee Paid", value: attendeePaidCount, color: "#34a853" },
      { name: "Attendee Unpaid", value: attendeeUnpaidCount, color: "#ea4335" },
      { name: "Karyakar Paid", value: karyakarPaidCount, color: "#0d9488" },
      { name: "Karyakar Unpaid", value: karyakarUnpaidCount, color: "#f97316" },
    ];

    return {
      total,
      attendeeTotalCount,
      attendeePaidCount,
      attendeeUnpaidCount,
      karyakarTotalCount,
      karyakarPaidCount,
      karyakarUnpaidCount,
      barChartData,
      paymentPieData,
      balakBalikaBreakdown,
    };
  }, [regionFilteredPeople, selectedRegion, selectedCenter]);

  // Compute T-Shirt stats
  const { tshirtStats, unassignedCount } = useMemo(() => {
    const map = {};
    let missingTotal = 0;

    ALL_STANDARD_SIZES.forEach((size) => {
      map[size] = {
        size,
        isMissingGroup: false,
        count: 0,
        balakCount: 0,
        balikaCount: 0,
        maleKaryakarCount: 0,
        femaleKaryakarCount: 0,
        karyakarCount: 0,
        karyakarPaidCount: 0,
        karyakarUnpaidCount: 0,
        members: []
      };
    });

    map["NOT ADDED"] = {
      size: "NOT ADDED",
      isMissingGroup: true,
      count: 0,
      balakCount: 0,
      balikaCount: 0,
      maleKaryakarCount: 0,
      femaleKaryakarCount: 0,
      karyakarCount: 0,
      karyakarPaidCount: 0,
      karyakarUnpaidCount: 0,
      members: []
    };

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
      const isPaid = checkIsPaid(person);
      const isFemaleKaryakar = person.isKaryakar && getIsFemale(person);
      
      let category = "balak";
      if (person.isKaryakar) {
        category = isFemaleKaryakar ? "karyakar_female" : "karyakar_male";
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
          maleKaryakarCount: 0,
          femaleKaryakarCount: 0,
          karyakarCount: 0,
          karyakarPaidCount: 0,
          karyakarUnpaidCount: 0,
          members: []
        };
      }

      map[size].count += 1;
      if (person.isKaryakar) {
        map[size].karyakarCount += 1;
        if (isFemaleKaryakar) {
          map[size].femaleKaryakarCount += 1;
        } else {
          map[size].maleKaryakarCount += 1;
        }

        if (isPaid) {
          map[size].karyakarPaidCount += 1;
        } else {
          map[size].karyakarUnpaidCount += 1;
        }
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
        category: person.isKaryakar ? (isFemaleKaryakar ? "Karyakar (Female)" : "Karyakar (Male)") : isBalika ? "Balika" : "Balak",
        center: cleanCenterVal || "N/A",
        isPaid: isPaid
      });
    });

    let list = Object.values(map);
    
    if (tshirtCategory === "missing") {
      list = list.filter(item => item.isMissingGroup);
    }

    list.sort((a, b) => {
      if (a.isMissingGroup) return 1;
      if (b.isMissingGroup) return -1;
      
      const idxA = ALL_STANDARD_SIZES.indexOf(a.size);
      const idxB = ALL_STANDARD_SIZES.indexOf(b.size);

      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;

      return a.size.localeCompare(b.size);
    });

    return { tshirtStats: list, unassignedCount: missingTotal };
  }, [regionFilteredPeople, tshirtCategory]);

  // Export T-Shirt Summary & Members List to CSV
  const handleExportTshirts = () => {
    if (tshirtStats.length === 0) return;

    const SIZE_MEASUREMENTS = {
      XXXS: "57 - 62cm",
      "3XS": "57 - 62cm",
      XXS: "62 - 67cm",
      "2XS": "62 - 67cm",
      XS: "67 - 72cm",
      S: "72 - 75cm",
      M: "77 - 82cm",
      L: "82 - 88cm",
      XL: "88 - 93cm",
      XXL: "93 - 98cm",
      "2XL": "93 - 98cm",
      XXXL: "98 - 103cm",
      "3XL": "98 - 103cm",
    };

    const getFormattedSize = (sizeCode) => {
      const cleanSize = (sizeCode || "").trim().toUpperCase();
      const measurement = SIZE_MEASUREMENTS[cleanSize];
      return measurement ? `${cleanSize} (${measurement})` : sizeCode;
    };

    let csvContent = "data:text/csv;charset=utf-8,";

    csvContent += "--- T-SHIRT SUMMARY TOTALS ---\n";
    if (tshirtCategory === "balak") {
      csvContent += "Size (Chest Measurement),Total Balaks Count\n";
    } else if (tshirtCategory === "balika") {
      csvContent += "Size (Chest Measurement),Total Balikas Count\n";
    } else if (tshirtCategory === "karyakar_male") {
      csvContent += "Size (Chest Measurement),Total Male Karyakars Count\n";
    } else if (tshirtCategory === "karyakar_female") {
      csvContent += "Size (Chest Measurement),Total Female Karyakars Count\n";
    } else if (tshirtCategory === "missing") {
      csvContent += "Size (Chest Measurement),Total Missing T-Shirts Count\n";
    } else {
      csvContent += "Size (Chest Measurement),Total Count,Balaks Count,Balikas Count,Male Karyakars Count,Female Karyakars Count\n";
    }

    let grandTotal = 0;
    let grandBalaks = 0;
    let grandBalikas = 0;
    let grandMaleKaryakars = 0;
    let grandFemaleKaryakars = 0;

    tshirtStats.forEach((item) => {
      grandTotal += item.count;
      grandBalaks += item.balakCount;
      grandBalikas += item.balikaCount;
      grandMaleKaryakars += item.maleKaryakarCount;
      grandFemaleKaryakars += item.femaleKaryakarCount;

      const formattedSize = getFormattedSize(item.size);

      if (tshirtCategory === "balak") {
        csvContent += `"${formattedSize}",${item.balakCount}\n`;
      } else if (tshirtCategory === "balika") {
        csvContent += `"${formattedSize}",${item.balikaCount}\n`;
      } else if (tshirtCategory === "karyakar_male") {
        csvContent += `"${formattedSize}",${item.maleKaryakarCount}\n`;
      } else if (tshirtCategory === "karyakar_female") {
        csvContent += `"${formattedSize}",${item.femaleKaryakarCount}\n`;
      } else if (tshirtCategory === "missing") {
        csvContent += `"${formattedSize}",${item.count}\n`;
      } else {
        csvContent += `"${formattedSize}",${item.count},${item.balakCount},${item.balikaCount},${item.maleKaryakarCount},${item.femaleKaryakarCount}\n`;
      }
    });

    if (tshirtCategory === "balak") {
      csvContent += `"TOTAL SUMMARY",${grandBalaks}\n\n`;
    } else if (tshirtCategory === "balika") {
      csvContent += `"TOTAL SUMMARY",${grandBalikas}\n\n`;
    } else if (tshirtCategory === "karyakar_male") {
      csvContent += `"TOTAL SUMMARY",${grandMaleKaryakars}\n\n`;
    } else if (tshirtCategory === "karyakar_female") {
      csvContent += `"TOTAL SUMMARY",${grandFemaleKaryakars}\n\n`;
    } else {
      csvContent += `"TOTAL SUMMARY",${grandTotal},${grandBalaks},${grandBalikas},${grandMaleKaryakars},${grandFemaleKaryakars}\n\n`;
    }

    csvContent += "--- MEMBER BREAKDOWN LIST ---\n";
    csvContent += "Member ID,Full Name,Category,Center,Payment Status,T-Shirt Size (Chest Measurement)\n";

    tshirtStats.forEach((item) => {
      const formattedSize = getFormattedSize(item.size);
      item.members.forEach((member) => {
        const cleanName = `"${member.name.replace(/"/g, '""')}"`;
        const cleanCenterStr = `"${member.center.replace(/"/g, '""')}"`;
        const paymentLabel = member.isPaid ? "Paid" : "Unpaid";
        csvContent += `"${member.member_id}",${cleanName},"${member.category}",${cleanCenterStr},"${paymentLabel}","${formattedSize}"\n`;
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
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f1f3f4", padding: "8px 14px", border: "1px solid #dadce0", borderRadius: "8px" }}>
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
            <div style={statNumberStyle}>
              {isDataLoading
                ? "-"
                : Number(stats.attendeeTotalCount || 0) + Number(stats.karyakarTotalCount || 0)}
            </div>
            <div style={statLabelStyle}>
              {selectedRegion !== "all" ? `${selectedRegion} Total` : "Attendee Count"}
            </div>
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={{ ...circleIconStyle, backgroundColor: "#e6f4ea", color: "#137333" }}>
            <FaCreditCard />
          </div>
          <div>
            <div style={statNumberStyle}>{isDataLoading ? "-" : `${stats.attendeePaidCount} / ${stats.attendeeTotalCount}`}</div>
            <div style={statLabelStyle}>Balak/Balikas Payment</div>
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={{ ...circleIconStyle, backgroundColor: "#ccfbf1", color: "#0d9488" }}>
            <FaUsers />
          </div>
          <div>
            <div style={statNumberStyle}>{isDataLoading ? "-" : `${stats.karyakarPaidCount} / ${stats.karyakarTotalCount}`}</div>
            <div style={statLabelStyle}>Karayakars Payement</div>
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
              <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} />
              <Bar dataKey="Count" fill="#4285f4" radius={[4, 4, 0, 0]} onClick={handleBarClick} cursor={selectedRegion !== "all" ? "pointer" : "default"} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* T-Shirt Size Distribution Matrix Section */}
      <section style={chartCardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FaTshirt style={{ color: "#ea4335", fontSize: "18px" }} />
            <h3 style={{ ...chartTitleStyle, margin: 0 }}>T-Shirt Distribution Matrix</h3>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            {/* Category Filter Buttons */}
            <div style={{ display: "flex", background: "#f1f3f4", padding: "3px", borderRadius: "8px", border: "1px solid #dadce0" }}>
              <button
                onClick={() => setTshirtCategory("all")}
                style={{
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  background: tshirtCategory === "all" ? "#fff" : "transparent",
                  color: tshirtCategory === "all" ? "#202124" : "#5f6368",
                  boxShadow: tshirtCategory === "all" ? "0 1px 2px rgba(0,0,0,0.1)" : "none"
                }}
              >
                All
              </button>
              <button
                onClick={() => setTshirtCategory("balak")}
                style={{
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  background: tshirtCategory === "balak" ? "#fff" : "transparent",
                  color: tshirtCategory === "balak" ? "#1a73e8" : "#5f6368",
                  boxShadow: tshirtCategory === "balak" ? "0 1px 2px rgba(0,0,0,0.1)" : "none"
                }}
              >
                Balaks
              </button>
              <button
                onClick={() => setTshirtCategory("balika")}
                style={{
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  background: tshirtCategory === "balika" ? "#fff" : "transparent",
                  color: tshirtCategory === "balika" ? "#e91e63" : "#5f6368",
                  boxShadow: tshirtCategory === "balika" ? "0 1px 2px rgba(0,0,0,0.1)" : "none"
                }}
              >
                Balikas
              </button>
              <button
                onClick={() => setTshirtCategory("karyakar_male")}
                style={{
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  background: tshirtCategory === "karyakar_male" ? "#fff" : "transparent",
                  color: tshirtCategory === "karyakar_male" ? "#0d9488" : "#5f6368",
                  boxShadow: tshirtCategory === "karyakar_male" ? "0 1px 2px rgba(0,0,0,0.1)" : "none"
                }}
              >
                Karyakars (Male)
              </button>
              <button
                onClick={() => setTshirtCategory("karyakar_female")}
                style={{
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  background: tshirtCategory === "karyakar_female" ? "#fff" : "transparent",
                  color: tshirtCategory === "karyakar_female" ? "#0d9488" : "#5f6368",
                  boxShadow: tshirtCategory === "karyakar_female" ? "0 1px 2px rgba(0,0,0,0.1)" : "none"
                }}
              >
                Karyakars (Female)
              </button>
              <button
                onClick={() => setTshirtCategory("missing")}
                style={{
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  background: tshirtCategory === "missing" ? "#fff" : "transparent",
                  color: tshirtCategory === "missing" ? "#d97706" : "#5f6368",
                  boxShadow: tshirtCategory === "missing" ? "0 1px 2px rgba(0,0,0,0.1)" : "none"
                }}
              >
                Missing
              </button>
            </div>

            {/* Export CSV Button */}
            <button
              onClick={handleExportTshirts}
              disabled={tshirtStats.length === 0 || isDataLoading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "#1a73e8",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: tshirtStats.length === 0 || isDataLoading ? "not-allowed" : "pointer",
                opacity: tshirtStats.length === 0 || isDataLoading ? 0.6 : 1
              }}
            >
              <FaDownload /> Export CSV
            </button>
          </div>
        </div>

        {isDataLoading ? (
          <div style={loaderWrapperStyle}><FaSpinner className={styles.spinAnimation} style={{ fontSize: "24px", color: "#ea4335" }} /></div>
        ) : tshirtStats.length === 0 ? (
          <p style={{ textAlign: "center", color: "#5f6368", padding: "20px" }}>No T-Shirt data matching selected filters.</p>
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
                    overflow: "hidden",
                    background: item.isMissingGroup ? "#fffbeb" : "#fff" 
                  }}
                >
                  {/* Summary Bar Header */}
                  <div 
                    onClick={() => toggleSizeExpand(item.size)}
                    style={{ 
                      padding: "12px 16px", 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "center", 
                      cursor: "pointer",
                      userSelect: "none"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ 
                        fontWeight: "700", 
                        fontSize: "15px", 
                        minWidth: "70px",
                        color: item.isMissingGroup ? "#b45309" : "#202124"
                      }}>
                        {item.size}
                      </span>
                      <span style={{ 
                        background: item.isMissingGroup ? "#fef3c7" : "#f1f3f4", 
                        padding: "2px 8px", 
                        borderRadius: "12px", 
                        fontSize: "12px", 
                        fontWeight: "600",
                        color: item.isMissingGroup ? "#92400e" : "#3c4043"
                      }}>
                        {item.count} total
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      {/* Detailed Breakdown Tags */}
                      {tshirtCategory === "all" && (
                        <div style={{ display: "flex", gap: "8px", fontSize: "12px", fontWeight: "500" }}>
                          <span style={{ color: "#1a73e8" }}>{item.balakCount} Balaks</span>
                          <span style={{ color: "#e91e63" }}>{item.balikaCount} Balikas</span>
                          <span style={{ color: "#0d9488" }}>
                            {item.maleKaryakarCount} Male Karyakars / {item.femaleKaryakarCount} Female Karyakars
                          </span>
                        </div>
                      )}

                      {isExpanded ? <FaChevronUp style={{ color: "#5f6368" }} /> : <FaChevronDown style={{ color: "#5f6368" }} />}
                    </div>
                  </div>

                  {/* Expandable Member Details List */}
                  {isExpanded && (
                    <div style={{ borderTop: "1px solid #dadce0", padding: "12px 16px", background: "#fafafa" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid #e0e0e0", textAlign: "left", color: "#5f6368" }}>
                            <th style={{ padding: "6px 8px" }}>Member ID</th>
                            <th style={{ padding: "6px 8px" }}>Name</th>
                            <th style={{ padding: "6px 8px" }}>Category</th>
                            <th style={{ padding: "6px 8px" }}>Center</th>
                            <th style={{ padding: "6px 8px" }}>Payment</th>
                          </tr>
                        </thead>
                        <tbody>
                          {item.members.map((mem, i) => (
                            <tr key={i} style={{ borderBottom: i === item.members.length - 1 ? "none" : "1px solid #f0f0f0" }}>
                              <td style={{ padding: "6px 8px", fontWeight: "600", color: "#3c4043" }}>{mem.member_id}</td>
                              <td style={{ padding: "6px 8px", color: "#202124" }}>{mem.name}</td>
                              <td style={{ padding: "6px 8px" }}>
                                <span style={{
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  fontWeight: "600",
                                  background: mem.category.includes("Karyakar") ? "#ccfbf1" : mem.category === "Balika" ? "#fce7f3" : "#dbeafe",
                                  color: mem.category.includes("Karyakar") ? "#0f766e" : mem.category === "Balika" ? "#be185d" : "#1e40af"
                                }}>
                                  {mem.category}
                                </span>
                              </td>
                              <td style={{ padding: "6px 8px", color: "#5f6368" }}>{mem.center}</td>
                              <td style={{ padding: "6px 8px" }}>
                                <span style={{
                                  fontWeight: "600",
                                  color: mem.isPaid ? "#16a34a" : "#dc2626"
                                }}>
                                  {mem.isPaid ? "Paid" : "Unpaid"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}