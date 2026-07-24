import { useNavigate } from "react-router-dom";
import styles from "./NotFound.module.css";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className={styles.regionWrapper}>
      <div className={styles.contentContainer}>
        {/* Brand Logo */}
        <div style={{ marginBottom: "20px" }}>
          <img 
            src="https://res.cloudinary.com/dxgkcyfrl/image/upload/v1782202338/MTRC_NEW_Color_c3d3z1.svg" 
            alt="Making the Right Choices Logo" 
            className={styles.brandLogo}
          />
        </div>

        <h1
          style={{
            fontSize: "clamp(48px, 10vw, 80px)",
            color: "var(--accent-primary)",
            margin: "0 0 10px 0",
            fontWeight: "800",
          }}
        >
          404
        </h1>
        
        <h2 style={{ fontFamily: "var(--font-subbrand)", fontSize: "clamp(24px, 4vw, 36px)", margin: "0 0 12px 0" }}>
          Page Not Found
        </h2>

        {/* Thematic tagline */}
        <p style={{ 
          fontStyle: "italic", 
          color: "var(--accent-primary)", 
          fontWeight: "500", 
          fontSize: "18px",
          marginBottom: "12px" 
        }}>
          "Looks like this wasn't the right choice."
        </p>

        <p style={{ color: "var(--text-muted)", fontSize: "16px", marginBottom: "32px", maxWidth: "500px", marginInline: "auto" }}>
          This page doesn't exist or has been moved. Let's get you back on track.
        </p>

        <button className={styles.primaryBtn} onClick={() => navigate(-1)}>
          Go Back
        </button>
      </div>
    </div>
  );
}