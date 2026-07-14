import React, { useMemo } from "react";
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaGlobe, FaExclamationTriangle } from "react-icons/fa";

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
        padding: "16px",
        maxWidth: "1200px",
        margin: "0 auto",
        fontFamily: "Inter, system-ui, sans-serif",
        minHeight: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Inject custom media queries directly into the document head */}
      <style>{`
        .header-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          gap: 12px;
        }
        .header-title {
          margin: 0;
          color: #0f172a;
          font-size: 1.5rem;
          font-weight: 700;
        }
        .header-badge {
          background-color: ${duplicateSets.length > 0 ? "#fee2e2" : "#dcfce7"};
          color: ${duplicateSets.length > 0 ? "#ef4444" : "#22c55e"};
          padding: 8px 16px;
          borderRadius: 9999px;
          font-size: 0.875rem;
          font-weight: 600;
          white-space: nowrap;
        }
        .attendee-row {
          display: grid;
          grid-template-columns: 1.2fr 2fr 1fr 1fr;
          padding: 16px 20px;
          font-size: 0.875rem;
          color: #334155;
          align-items: center;
          gap: 15px;
        }
        .warning-banner {
          background-color: #fffbeb;
          border: 1px solid #fcd34d;
          border-radius: 10px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 14px;
          color: #92400e;
          margin-bottom: 20px;
        }

        /* Mobile Adjustments (Max Width: 768px) */
        @media (max-width: 768px) {
          .header-container {
            flex-direction: column;
            align-items: flex-start;
          }
          .header-title {
            font-size: 1.25rem;
          }
          .attendee-row {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
            padding: 16px !important;
          }
          .attendee-divider {
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 12px;
          }
          .warning-banner {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
        }
      `}</style>

      {/* Top Header */}
      <div className="header-container">
        <div>
          <h2 className="header-title">Duplicate Profiles</h2>
          <p style={{ margin: "4px 0 0 0", fontSize: "0.9rem", color: "#64748b" }}>
          </p>
        </div>
        <span className="header-badge">
          {duplicateSets.length} Duplicate Flag(s)
        </span>
      </div>

      {/* Warning Banner when duplicates exist */}
      {duplicateSets.length > 0 && (
        <div className="warning-banner">
          <FaExclamationTriangle size={20} style={{ color: "#f59e0b", flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: "700" }}>Attention Required</div>
            <div style={{ fontSize: "0.85rem", marginTop: "2px" }}>
              Multiple registrations share identical normalized names. Resolve these collisions to keep data clean.
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {duplicateSets.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🎉</div>
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
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <span style={{ wordBreak: "break-all" }}>👥 MATCH GROUP: "{group[0].name}"</span>
                <span
                  style={{
                    fontSize: "0.8rem",
                    backgroundColor: "#ffffff",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    border: "1px solid #feb2b2",
                    whiteSpace: "nowrap",
                  }}
                >
                  {group.length} occurrences
                </span>
              </div>

              {/* Matching Entries List */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                {group.map((attendee, attIdx) => (
                  <div
                    key={attendee.id}
                    className="attendee-row"
                    style={{
                      borderBottom: attIdx < group.length - 1 ? "1px solid #f1f5f9" : "none",
                    }}
                  >
                    {/* Identifier */}
                    <div style={{ fontWeight: "600", color: "#64748b" }} className="attendee-divider">
                      {attendee.member_id || `MTRC-${attendee.id}`}
                    </div>

                    {/* Personal Details */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }} className="attendee-divider">
                      <span style={{ display: "flex", alignItems: "center", gap: "8px", color: "#1e293b", fontWeight: "500" }}>
                        <FaUser style={{ color: "#94a3b8", fontSize: "0.8rem", flexShrink: 0 }} /> {attendee.name}
                      </span>
                      {attendee.parent_contact && (
                        <span style={{ display: "flex", alignItems: "center", gap: "8px", color: "#64748b" }}>
                          <FaPhone style={{ color: "#94a3b8", fontSize: "0.8rem", flexShrink: 0 }} /> {attendee.parent_contact}
                        </span>
                      )}
                      {attendee.email && (
                        <span style={{ display: "flex", alignItems: "center", gap: "8px", color: "#64748b", wordBreak: "break-all" }}>
                          <FaEnvelope style={{ color: "#94a3b8", fontSize: "0.8rem", flexShrink: 0 }} /> {attendee.email}
                        </span>
                      )}
                    </div>

                    {/* Regional Info */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }} className="attendee-divider">
                      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <FaMapMarkerAlt style={{ color: "#94a3b8", fontSize: "0.8rem", flexShrink: 0 }} /> {attendee.center || "No Center"}
                      </span>
                      <span style={{ color: "#64748b", paddingLeft: "16px" }}>
                        {attendee.gender || "Balak"}
                      </span>
                    </div>

                    {/* Country */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <FaGlobe style={{ color: "#94a3b8", flexShrink: 0 }} />
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
