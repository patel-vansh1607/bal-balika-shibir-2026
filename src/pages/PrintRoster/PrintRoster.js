import React from "react";
import styles from "./PrintRoster.module.css";

export default function PrintRoster({ attendees }) {
  return (
    <div className={styles.printOnly}>
      {attendees.map((a) => (
        <div key={a.id} className={styles.qrItem}>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(a.member_id || a.memberId || a.id)}`}
            alt={a.name}
          />
          <p>
            {a.name} ({a.member_id || a.id})
          </p>
        </div>
      ))}
    </div>
  );
}
