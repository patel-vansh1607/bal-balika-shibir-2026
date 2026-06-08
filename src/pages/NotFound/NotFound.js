import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import styles from "./NotFound.module.css"; // Import the CSS module

export default function NotFound() {
  const navigate = useNavigate();
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuth(!!session);
    });
  }, []);

  return (
    <div className={styles.regionWrapper}>
      <div className={styles.card}>
        <h1
          style={{
            fontSize: "48px",
            color: "var(--accent-primary)",
            margin: "0 0 10px 0",
          }}
        >
          404
        </h1>
        <h2 style={{ fontFamily: "var(--font-display)", margin: "0 0 15px 0" }}>
          Page Not Found
        </h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>
          This page doesn't exist. Let's get you back on track.
        </p>
        <button
          className={styles.primaryBtn}
          onClick={() => navigate(-1)} 
        >
          Go Back
        </button>
      </div>
    </div>
  );
}
