import React, { useState, useEffect } from "react";
import { FaUsers, FaUserPlus, FaSpinner } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
// Import your established API instance
import { userRoles } from "../../apiClient"; 
import styles from "../Dashboard/Dashboard.module.css";

export default function OverviewMetrics() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("Admin"); 
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  useEffect(() => {
    // Call the profile endpoint directly from your API client engine
    userRoles.me()
      .then((res) => {
        // Read from your unified data structure wrapper
        const rawName = res?.data?.name || res?.name;
        
        if (rawName) {
          // Force proper clean capitalization for the visual greeting
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

  const navOptions = [
    { title: "Registered Roster", icon: <FaUsers />, path: "/dashboard/roster", color: "#34a853" },
    { title: "Register Attendee", icon: <FaUserPlus />, path: "/dashboard/add-new", color: "#4285f4" },
  ];

  return (
    <>
      <section className={styles.welcomeSection} style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", color: "#202124", marginBottom: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
          Jay Swaminarayan, {isLoadingProfile ? (
            <FaSpinner className={styles.spinAnimation} style={{ fontSize: "20px", color: "#e78524" }} />
          ) : (
            userName
          )}
        </h1>
        <p style={{ color: "#5f6368" }}>Select an option below to manage the event portal.</p>
      </section>

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

      {/* Global spinning keyframes in case it's not defined in your CSS module */}
      <style>{`
        .${styles.spinAnimation} {
          animation: overviewSpin 1s linear infinite;
        }
        @keyframes overviewSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}