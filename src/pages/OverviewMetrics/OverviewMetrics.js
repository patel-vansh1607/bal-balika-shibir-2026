import React, { useState, useEffect } from "react";
import { FaUsers, FaUserPlus, FaChartBar } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import styles from "../Dashboard/Dashboard.module.css";

export default function OverviewMetrics() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("Admin"); // Default fallback while loading

  useEffect(() => {
    const fetchUserProfile = async () => {
      // 1. Retrieve the token stored during login (adjust 'token' to match your localStorage key)
      const token = localStorage.getItem("token"); 
      
      if (!token) return;

      try {
        // 2. Fetch from your PHP endpoint (replace API_BASE_URL with your actual backend URL)
        const response = await fetch("/api/user-roles/me", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}` // Ensure it matches what require_auth() expects
          }
        });

        if (response.ok) {
          const result = await response.json();
          // 3. Map to data.name based on your PHP format_user_role() response structural output
          if (result?.data?.name) {
            setUserName(result.data.name);
          }
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    fetchUserProfile();
  }, []);

  const navOptions = [
    { title: "Registered Roster", icon: <FaUsers />, path: "/dashboard/roster", color: "#34a853" },
    { title: "Register Attendee", icon: <FaUserPlus />, path: "/dashboard/add-new", color: "#4285f4" },
    { title: "Session Master", icon: <FaChartBar />, path: "/dashboard/session/master", color: "#fbbc05" },
  ];

  return (
    <>
      <section className={styles.welcomeSection} style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", color: "#202124", marginBottom: "8px" }}>
          Jay Swaminarayan, {userName}
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
    </>
  );
}
