import React, { useMemo } from "react";
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaGlobe } from "react-icons/fa";

export default function DuplicateFinderModal({ attendees }) {
  // Group and find duplicates based on name only (normalizing spaces and cases)
  const duplicateSets = useMemo(() => {
    if (!attendees || attendees.length === 0) return [];

    const groups = {};

    attendees.forEach((person) => {
      if (person.is_archived) return; // Skip archived records

      // Normalize name: lowercase, trim, collapse multiple spaces
      const cleanName = (person.name || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");

      if (!cleanName || cleanName.length < 3) return;

      if (!groups[cleanName]) {
        groups[cleanName] = [];
      }
      groups[cleanName].push(person);
    });

    // Only return groups where the same name appears 2 or more times
    return Object.values(groups).filter((group) => group.length > 1);
  }, [attendees]);

  return (
    <div
      style={{
        padding: "24px",
        fontFamily: "Inter, system-ui, sans-serif",
        minHeight: "100%",
      }}
    >
      {/* Top Breadcrumb Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: "#0f172a", fontSize: "1.5rem", fontWeight: "700" }}>
            Duplicate Profiles
          </h2>
          <p style={{ margin: "4px 0 0 0", fontSize: "0.9rem", color: "#64748b" }}>
          </p>
        </div>
        <span
          style={{
            backgroundColor: duplicateSets.length > 0 ? "#fee2e2" : "#dcfce7",
            color: duplicateSets.length > 0 ? "#ef4444" : "#22c55e",
            padding: "8px 16px",
            borderRadius: "9999px",
            fontSize: "0.875rem",
            fontWeight: "600",
          }}
        >
          {duplicateSets.length} Duplicate Flag(s)
        </span>
      </div>

      {/* Main Content Area */}
      {duplicateSets.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "80px 20px",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ fontSize: "3.5rem", marginBottom: "16px" }}>🎉</div>
          <h4 style={{ margin: "0 0 8px 0", color: "#0f172a", fontSize: "1.2rem" }}>
            All Clear! No Duplicates Detected
          </h4>
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.95rem" }}>
            All active registrations contain completely unique names.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {duplicateSets.map((group, idx) => (
            <div
              key={idx}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                backgroundColor: "#ffffff",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                overflow: "hidden",
              }}
            >
              {/* Group Identifier Header */}
              <div
                style={{
                  backgroundColor: "#fff5f5",
                  padding: "14px 20px",
                  fontWeight: "600",
                  color: "#c53030",
                  fontSize: "0.95rem",
                  borderBottom: "1px solid #fed7d7",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>👥 MATCH GROUP: "{group[0].name}"</span>
                <span
                  style={{
                    fontSize: "0.8rem",
                    backgroundColor: "#ffffff",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    border: "1px solid #feb2b2",
                  }}
                >
                  {group.length} occurrences
                </span>
              </div>

              {/* Matching Entries Grid List */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                {group.map((attendee, attIdx) => (
                  <div
                    key={attendee.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr 2fr 1fr 1fr",
                      padding: "16px 20px",
                      borderBottom: attIdx < group.length - 1 ? "1px solid #f1f5f9" : "none",
                      fontSize: "0.875rem",
                      color: "#334155",
                      alignItems: "center",
                      gap: "15px",
                    }}
                  >
                    {/* Identifier */}
                    <div style={{ fontWeight: "600", color: "#64748b" }}>
                      {attendee.member_id || `MTRC-${attendee.id}`}
                    </div>

                    {/* Personal Details */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "8px", color: "#1e293b", fontWeight: "500" }}>
                        <FaUser style={{ color: "#94a3b8", fontSize: "0.8rem" }} /> {attendee.name}
                      </span>
                      {attendee.parent_contact && (
                        <span style={{ display: "flex", alignItems: "center", gap: "8px", color: "#64748b" }}>
                          <FaPhone style={{ color: "#94a3b8", fontSize: "0.8rem" }} /> {attendee.parent_contact}
                        </span>
                      )}
                      {attendee.email && (
                        <span style={{ display: "flex", alignItems: "center", gap: "8px", color: "#64748b" }}>
                          <FaEnvelope style={{ color: "#94a3b8", fontSize: "0.8rem" }} /> {attendee.email}
                        </span>
                      )}
                    </div>

                    {/* Regional Info */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <FaMapMarkerAlt style={{ color: "#94a3b8", fontSize: "0.8rem" }} /> {attendee.center || "No Center"}
                      </span>
                      <span style={{ color: "#64748b", paddingLeft: "16px" }}>
                        {attendee.gender || "Balak"}
                      </span>
                    </div>

                    {/* Country */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <FaGlobe style={{ color: "#94a3b8" }} />
                      {attendee.country || attendee.region || "—"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}