import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  useNavigate,
  useLocation,
  Routes,
  Route,
  useParams,
} from "react-router-dom";
import { attendees as attendeesApi } from "../../apiClient";
import { useAuth } from "../../context/AuthContext";
import OverviewMetrics from "../OverviewMetrics/OverviewMetrics";
import CameraScanner from "../CameraScanner/CameraScanner";
import RegisteredRoster from "../RegisteredRoster/RegisteredRoster";
import TanzaniaSelectionRoster from "../TanzaniaSelectionRoster/TanzaniaSelectionRoster";
import BroadcastDashboard from "../BroadcastDashboard/BroadcastDashboard";
import NotFound from "../NotFound/NotFound";
import styles from "./Dashboard.module.css";
import ArchiveManager from "../ArchiveManager/ArchiveManager";
import SessionMasterDashboard from "../SessionMasterDashboard/SessionMasterDashboard";
import AddSession from "../AddSession/AddSession";
import Sessions from "../Sessions/Sessions";
import SessionDataDetails from "../SessionDataDetails/SessionDataDetails";
import AdminControl from "../AdminControl/AdminControl";
import AdminRegister from "../AdminRegister/AdminRegister";
import DuplicateFinderModal from "../DuplicateFinderModal/DuplicateFinderModal";
import {
  FaChartBar,
  FaSignOutAlt,
  FaUserShield,
  FaBars,
  FaTimes,
  FaUserPlus,
  FaUsers,
  FaSpinner,
  FaArrowLeft,
  FaArchive,
  FaSyncAlt,
  FaGlobeAfrica,
  FaCopy,
  FaEnvelope,
  FaHotel,
  FaExclamationTriangle,
  // FaRedoAlt
} from "react-icons/fa";
import { IoIosAddCircleOutline } from "react-icons/io";
import { TfiStatsUp } from "react-icons/tfi";
import KarayakarForm from "../KarayakarForm/KarayakarForm";
import KarayakarList from "../KarayakarList/KarayakarList";
import ManualScanner from "../ManualScanner/ManualScanner";
import AccommodationManager from "../AccomodationManager/AccomodationManager";
import { FaBed } from "react-icons/fa6";
import AccommodationMetrics from "../AccomodationMetrics/AccomodationMetrics";

// ---------------------------------------------------------------------------
// PRODUCTION TIMERS
// ---------------------------------------------------------------------------
const INACTIVITY_LIMIT_MS = 60 * 60 * 1000; // 60 Minutes Inactivity
const BROWSER_CLOSE_MAX_AGE_MS = 30 * 60 * 1000; // 30 Minutes Max Age on Re-opening

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userRole, logout } = useAuth();

  function CameraRouteWrapper({ regionScope, prefixScope }) {
    const { sessionId } = useParams();
    return (
      <CameraScanner
        sessionId={sessionId}
        regionScope={regionScope}
        prefixScope={prefixScope}
      />
    );
  }

  const [loading, setLoading] = useState(true);
  const [dataFetching, setDataFetching] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [attendeesList, setAttendeesList] = useState([]);
  const [regionScope, setRegionScope] = useState("All");
  const [prefixScope, setPrefixScope] = useState("MTRC-");
  const [refreshKey, setRefreshKey] = useState(0);

  // State for controlling the Session Expiration modal
  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);

  // Core logout logic that cleans up storage and redirects to /admin
  const performLogoutAndRedirect = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      localStorage.removeItem("selected_shibir_region");
      localStorage.removeItem("selected_shibir_prefix");
      localStorage.removeItem("last_active_timestamp");
    } catch (err) {
      console.error("Logout execution error:", err);
    } finally {
      setIsLoggingOut(false);
      setShowSessionExpiredModal(false);
      navigate("/admin", { replace: true });
    }
  }, [logout, navigate]);

  // Trigger modal when session expires due to inactivity
  const handleSessionTimeout = useCallback(() => {
    setShowSessionExpiredModal(true);
  }, []);

  // ---------------------------------------------------------------------------
  // AUTO-LOGOUT SYSTEM
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // 1. Check if session expired while the tab/browser was closed
    const lastActiveStr = localStorage.getItem("last_active_timestamp");
    const currentTime = Date.now();

    if (lastActiveStr) {
      const lastActiveTime = parseInt(lastActiveStr, 10);
      if (!isNaN(lastActiveTime) && currentTime - lastActiveTime > BROWSER_CLOSE_MAX_AGE_MS) {
        handleSessionTimeout();
        return;
      }
    }

    // Update timestamp in storage
    localStorage.setItem("last_active_timestamp", currentTime.toString());

    // 2. Setup Inactivity Timer
    let inactivityTimer = setTimeout(() => {
      handleSessionTimeout();
    }, INACTIVITY_LIMIT_MS);

    // Reset inactivity timer and update timestamp on user interaction
    const resetInactivityTimer = () => {
      // Don't reset if expiration modal is already active
      if (showSessionExpiredModal) return;

      const now = Date.now();
      localStorage.setItem("last_active_timestamp", now.toString());

      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        handleSessionTimeout();
      }, INACTIVITY_LIMIT_MS);
    };

    const activityEvents = [
      "mousemove",
      "keydown",
      "click",
      "scroll",
      "touchstart",
    ];

    activityEvents.forEach((event) => {
      window.addEventListener(event, resetInactivityTimer, { passive: true });
    });

    return () => {
      clearTimeout(inactivityTimer);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetInactivityTimer);
      });
    };
  }, [handleSessionTimeout, showSessionExpiredModal]);

  // Initializing regional context
  useEffect(() => {
    const cachedRegion = localStorage.getItem("selected_shibir_region");
    if (!cachedRegion) {
      navigate("/select-region");
      return;
    }
    setRegionScope(cachedRegion);
    setPrefixScope(localStorage.getItem("selected_shibir_prefix") || "MTRC-");
    if (user) setUserEmail(user.email || "");
    setLoading(false);
  }, [navigate, user]);

  // Calculate duplicate matching groups
  const duplicateCount = useMemo(() => {
    if (!attendeesList || attendeesList.length === 0 || dataFetching) return 0;

    const groups = {};
    attendeesList.forEach((person) => {
      if (person.is_archived) return;

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

    const duplicateGroups = Object.values(groups).filter(
      (group) => group.length > 1,
    );
    return duplicateGroups.length;
  }, [attendeesList, dataFetching]);

  const fetchIsolatedDataset = useCallback(async () => {
    try {
      setDataFetching(true);
      const params = regionScope !== "All" ? { region: regionScope } : {};
      const { data } = await attendeesApi.list(params);
      setAttendeesList(data || []);
    } catch (err) {
      console.error("Data fetch failure:", err.message);
    } finally {
      setDataFetching(false);
    }
  }, [regionScope]);

  useEffect(() => {
    if (!loading && regionScope) {
      fetchIsolatedDataset();
    }
  }, [loading, regionScope, fetchIsolatedDataset]);

  const handleManualRefresh = () => {
    if (!dataFetching) {
      fetchIsolatedDataset();
      setRefreshKey((prevKey) => prevKey + 1);
    }
  };

  // Hard Refresh Handler to clear cache and reload app completely
  // const handleHardRefresh = async () => {
  //   try {
  //     if ("caches" in window) {
  //       const cacheNames = await caches.keys();
  //       await Promise.all(cacheNames.map((name) => caches.delete(name)));
  //     }
  //   } catch (err) {
  //     console.error("Error clearing browser caches:", err);
  //   } finally {
  //     window.location.reload(true);
  //   }
  // };

  const handleUpdateSelectionStatus = async (attendee, newStatusValue) => {
    try {
      setDataFetching(true);
      await attendeesApi.update(attendee.id, { is_selected: newStatusValue });

      setAttendeesList((prevList) =>
        prevList.map((item) =>
          item.id === attendee.id
            ? { ...item, is_selected: newStatusValue }
            : item,
        ),
      );
    } catch (err) {
      console.error("Failed to update status parameters:", err.message);
    } finally {
      setDataFetching(false);
    }
  };

  const handleNavigation = (targetPath) => {
    navigate(targetPath);
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    const pageName = getPageTitle(location.pathname);
    document.title = `${pageName} | Bal Balika Shibir 2026`;
  }, [location.pathname]);

  const getPageTitle = (path) => {
    if (path.startsWith("/dashboard/overview")) return "Performance Overview";
    if (path.startsWith("/dashboard/roster/karyakar")) return "Karyakar List";
    if (path.startsWith("/dashboard/tanzania-roster"))
      return "Tanzania Selection Roster";
    if (path.startsWith("/dashboard/tanzania-broadcast"))
      return "Bulk Email";
    if (path.startsWith("/dashboard/roster")) return "Registered Attendees";
    if (path.startsWith("/dashboard/add-new-karyakar"))
      return "Register New Karyakar";
    if (path.startsWith("/dashboard/add-new")) return "Register New Attendee";
    if (path.startsWith("/dashboard/archive")) return "Archive Manager";
    if (path.startsWith("/dashboard/admin-control")) return "Admin Control";
    if (path.startsWith("/dashboard/session/master")) return "Session Master";
    if (path.startsWith("/dashboard/session/add-session")) return "Add Session";
    if (path.startsWith("/dashboard/duplicates")) return "Duplicate Profiles";
if (path.startsWith("/dashboard/manual-scanner/")) return "Manual Attendance";
if (path.startsWith("/dashboard/scanner/")) return "Scanner Attendance";
    if (path.startsWith("/dashboard/accommodation/metrics")) return "Accommodation Metrics";
    if (path.startsWith("/dashboard/accommodation")) return "Accommodation";

    if (path.startsWith("/dashboard/session/attendance"))
      return "Sessions Attendance";
    return "";
  };

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
        }}
      >
        <FaSpinner
          style={{ fontSize: "32px", animation: "spin 1s linear infinite" }}
        />
      </div>
    );

  return (
    <div className={styles.layout}>
      {/* Session Expired Styled Overlay Modal */}
      {showSessionExpiredModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(6px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            fontFamily: "var(--font-sans, 'Plus Jakarta Sans', sans-serif)",
          }}
        >
          <div
            style={{
              backgroundColor: "var(--accent-soft, #f4ece6)",
              border: "1px solid var(--border-light, #e6dfd9)",
              borderRadius: "16px",
              padding: "32px 28px",
              maxWidth: "420px",
              width: "100%",
              textAlign: "center",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
              color: "#2d2723",
            }}
          >
            <div
              style={{
                width: "60px",
                height: "60px",
                backgroundColor: "rgba(231, 133, 36, 0.12)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px auto",
              }}
            >
              <FaExclamationTriangle
                style={{
                  fontSize: "28px",
                  color: "var(--accent-primary, #e78524)",
                }}
              />
            </div>
            <h3
              style={{
                fontFamily: "var(--font-display, 'Arima Madurai Local', serif)",
                fontSize: "1.5rem",
                fontWeight: "700",
                color: "#1c1917",
                marginBottom: "10px",
                letterSpacing: "-0.01em",
              }}
            >
              Session Expired
            </h3>
            <p
              style={{
                fontFamily: "var(--font-sans, 'Plus Jakarta Sans', sans-serif)",
                fontSize: "0.95rem",
                color: "#57534e",
                marginBottom: "28px",
                lineHeight: "1.5",
              }}
            >
              You have been inactive for over 60 minutes. For security reasons,
              your session has timed out.
            </p>
            <button
              onClick={performLogoutAndRedirect}
              disabled={isLoggingOut}
              style={{
                width: "100%",
                padding: "12px 20px",
                backgroundColor: "var(--accent-primary, #e78524)",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                fontWeight: "600",
                fontSize: "0.95rem",
                fontFamily: "var(--font-sans, 'Plus Jakarta Sans', sans-serif)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "opacity 0.2s ease",
              }}
            >
              {isLoggingOut ? (
                <>
                  <FaSpinner className={styles.spin} /> Returning to login...
                </>
              ) : (
                "Return to Login"
              )}
            </button>
          </div>
        </div>
      )}

      <aside
        className={`${styles.sidebar} ${isMobileMenuOpen ? styles.sidebarOpen : ""}`}
      >
        <div className={styles.sidebarTop}>
          <div className={styles.brandFrame}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h1 className={styles.brandTitle}>Making the Right Choices</h1>
                <p className={styles.brandSubtitle}>
                  Bal-Balika Shibir, africa 2026
                </p>
              </div>
              <button
                className={styles.closeMenuBtn}
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <FaTimes />
              </button>
            </div>
          </div>
          <div className={styles.scopeIndicatorCard}>
            <span className={styles.scopeMetaLabel}>REGION </span>
            <div className={styles.scopeBadgeText} title={regionScope}>
              {regionScope === "All" ? "Africa" : regionScope}
            </div>
          </div>
          <nav className={styles.navigationList}>
            {userRole && userRole !== "operator" && (
              <>
                <button
                  onClick={() => handleNavigation("/dashboard/overview")}
                  className={`${styles.navLink} ${location.pathname === "/dashboard/overview" ? styles.navLinkActive : ""}`}
                >
                  <FaChartBar className={styles.iconMargin} /> Overview Metrics
                </button>
                <button
                  onClick={() => handleNavigation("/dashboard/roster")}
                  className={`${styles.navLink} ${location.pathname === "/dashboard/roster" ? styles.navLinkActive : ""}`}
                >
                  <FaUsers className={styles.iconMargin} /> Registered Roster
                </button>

                {regionScope === "Tanzania" && (
                  <>
                    <button
                      onClick={() =>
                        handleNavigation("/dashboard/tanzania-roster")
                      }
                      className={`${styles.navLink} ${location.pathname === "/dashboard/tanzania-roster" ? styles.navLinkActive : ""}`}
                    >
                      <FaGlobeAfrica className={styles.iconMargin} /> TZ
                      Selection Roster
                    </button>
                    {userRole === "master_admin" && (
                      <button
                        onClick={() =>
                          handleNavigation("/dashboard/tanzania-broadcast")
                        }
                        className={`${styles.navLink} ${location.pathname === "/dashboard/tanzania-broadcast" ? styles.navLinkActive : ""}`}
                      >
                        <FaEnvelope className={styles.iconMargin} /> Bulk Email
                      </button>
                    )}
                  </>
                )}
                <button
                  onClick={() => handleNavigation("/dashboard/duplicates")}
                  className={`${styles.navLink} ${location.pathname === "/dashboard/duplicates" ? styles.navLinkActive : ""}`}
                  style={{ position: "relative" }}
                >
                  <FaCopy className={styles.iconMargin} /> Duplicates
                  {duplicateCount > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: "50%",
                        right: "16px",
                        transform: "translateY(-50%)",
                        backgroundColor: "#ef4444",
                        color: "#ffffff",
                        minWidth: "20px",
                        height: "20px",
                        padding: "0 6px",
                        borderRadius: "10px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.75rem",
                        fontWeight: "700",
                        boxShadow: "0 0 6px rgba(239, 68, 68, 0.4)",
                      }}
                      title={`${duplicateCount} duplicate profile sets detected`}
                    >
                      {duplicateCount}
                    </span>
                  )}
                </button>
                {regionScope === "Kenya" && (
                  <button
                    onClick={() =>
                      handleNavigation("/dashboard/accommodation")
                    }
                    className={`${styles.navLink} ${location.pathname === "/dashboard/accommodation" ? styles.navLinkActive : ""}`}
                  >
                    <FaBed className={styles.iconMargin} /> Accomodation
                  </button>
                )}
                {regionScope === "Kenya" && (
                  <button
                    onClick={() =>
                      handleNavigation("/dashboard/accommodation/metrics")
                    }
                    className={`${styles.navLink} ${location.pathname === "/dashboard/accommodation/metrics" ? styles.navLinkActive : ""}`}
                  >
                    <FaHotel className={styles.iconMargin} /> Accomodation Metrics
                  </button>
                )}
                <button
                  onClick={() => handleNavigation("/dashboard/add-new")}
                  className={`${styles.navLink} ${location.pathname === "/dashboard/add-new" ? styles.navLinkActive : ""}`}
                >
                  <FaUserPlus className={styles.iconMargin} /> Register Attendee
                </button>
                <button
                  onClick={() => handleNavigation("/dashboard/roster/karyakar")}
                  className={`${styles.navLink} ${location.pathname === "/dashboard/roster/karyakar" ? styles.navLinkActive : ""}`}
                >
                  <FaUsers className={styles.iconMargin} /> Karyakar List
                </button>
                <button
                  onClick={() =>
                    handleNavigation("/dashboard/add-new-karyakar")
                  }
                  className={`${styles.navLink} ${location.pathname === "/dashboard/add-new-karyakar" ? styles.navLinkActive : ""}`}
                >
                  <FaUserPlus className={styles.iconMargin} /> Add Karyakar
                </button>

                {(userRole === "master_admin" ||
                  userRole === "super_admin") && (
                  <button
                    onClick={() => handleNavigation("/dashboard/archive")}
                    className={`${styles.navLink} ${location.pathname === "/dashboard/archive" ? styles.navLinkActive : ""}`}
                  >
                    <FaArchive className={styles.iconMargin} /> Archive Manager
                  </button>
                )}

                {(userRole === "master_admin" || userRole === "super_admin") && (
                  <button
                    onClick={() => handleNavigation("/dashboard/admin-control")}
                    className={`${styles.navLink} ${location.pathname === "/dashboard/admin-control" ? styles.navLinkActive : ""}`}
                  >
                    <FaUserShield className={styles.iconMargin} /> Admin Control
                  </button>
                )}

                <button
                  onClick={() => handleNavigation("/dashboard/session/master")}
                  className={`${styles.navLink} ${location.pathname === "/dashboard/session/master" ? styles.navLinkActive : ""}`}
                >
                  <FaChartBar className={styles.iconMargin} /> Session Master
                </button>
                <button
                  onClick={() =>
                    handleNavigation("/dashboard/session/add-session")
                  }
                  className={`${styles.navLink} ${location.pathname === "/dashboard/session/add-session" ? styles.navLinkActive : ""}`}
                >
                  <IoIosAddCircleOutline className={styles.iconMargin} /> Add
                  Session
                </button>
              </>
            )}
            {userRole && (
              <button
                onClick={() =>
                  handleNavigation("/dashboard/session/attendance")
                }
                className={`${styles.navLink} ${location.pathname.startsWith("/dashboard/session/attendance") ? styles.navLinkActive : ""}`}
              >
                <TfiStatsUp className={styles.iconMargin} /> Sessions Attendance
              </button>
            )}
          </nav>
        </div>

        <div className={styles.sidebarFooter}>
          <button
            onClick={() => navigate("/select-region")}
            className={styles.switchGatewayBtn}
          >
            <FaArrowLeft style={{ marginRight: "6px" }} /> Switch Region
          </button>
          <div className={styles.userInfoBlock}>
            <span className={styles.userEmailLabel}>{userEmail}</span>
            <span className={styles.userRoleTag}>
              <FaUserShield style={{ marginRight: "4px" }} />
              {userRole
                ? userRole.replace(/_/g, " ").toUpperCase()
                : "Loading..."}
            </span>
          </div>
          <button
            onClick={performLogoutAndRedirect}
            className={styles.logoutBtn}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <>
                <FaSpinner
                  className={styles.spin}
                  style={{ marginRight: "6px" }}
                />{" "}
                Logging out...
              </>
            ) : (
              <>
                <FaSignOutAlt style={{ marginRight: "6px" }} /> Logout Session
              </>
            )}
          </button>
        </div>
      </aside>

      <div className={styles.mainContainer}>
        <header className={styles.topHeaderBar}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              className={styles.hamburgerBtn}
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open navigation menu"
            >
              <FaBars />
            </button>
            <h2 className={styles.pageContextTitle}>
              {getPageTitle(location.pathname)}
            </h2>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              className={styles.manualRefreshBtn}
              onClick={handleManualRefresh}
              disabled={dataFetching}
              aria-label="Refresh database metrics"
            >
              <FaSyncAlt
                className={`${styles.refreshIcon} ${dataFetching ? styles.spin : ""}`}
              />
              <span>Refresh</span>
            </button>

            {/* <button
              className={styles.manualRefreshBtn}
              onClick={handleHardRefresh}
              aria-label="Hard refresh application to fetch latest code changes"
              title="Clears browser cache and reloads application"
            >
              <FaRedoAlt className={styles.refreshIcon} />
              <span>Hard Refresh</span>
            </button> */}

            <span className={styles.systemStatusText}>
              {dataFetching ? (
                <span className={styles.syncingIndicator}>
                  <FaSpinner className={styles.spin} /> Syncing Data...
                </span>
              ) : (
                <>
                  <span className={styles.pulseDot}></span> MTRC
                </>
              )}
            </span>
          </div>
        </header>

        <div className={styles.viewWrapper}>
          <Routes key={refreshKey}>
            <Route
              path="overview"
              element={
                userRole !== "operator" ? (
                  <OverviewMetrics
                    attendees={attendeesList}
                    dataFetching={dataFetching}
                    regionScope={regionScope}
                  />
                ) : (
                  <NotFound />
                )
              }
            />
            <Route
              path="scanner"
              element={
                <CameraScanner
                  regionScope={regionScope}
                  prefixScope={prefixScope}
                />
              }
            />
            <Route
              path="admin-control"
              element={
                userRole === "master_admin" ? <AdminControl /> : <NotFound />
              }
            />
            <Route
              path="scanner/:sessionId"
              element={
                <CameraRouteWrapper
                  regionScope={regionScope}
                  prefixScope={prefixScope}
                />
              }
            />
            <Route
              path="roster"
              element={
                userRole !== "operator" ? (
                  <RegisteredRoster
                    attendees={attendeesList}
                    setAttendees={setAttendeesList}
                    dataFetching={dataFetching}
                    regionScope={regionScope}
                    userRole={userRole}
                  />
                ) : (
                  <NotFound />
                )
              }
            />
            <Route
              path="tanzania-roster"
              element={
                userRole !== "operator" && regionScope === "Tanzania" ? (
                  <TanzaniaSelectionRoster
                    attendees={attendeesList}
                    onUpdateStatus={handleUpdateSelectionStatus}
                  />
                ) : (
                  <NotFound />
                )
              }
            />
            <Route
              path="duplicates"
              element={
                userRole !== "operator" ? (
                  <DuplicateFinderModal attendees={attendeesList} />
                ) : (
                  <NotFound />
                )
              }
            />
            <Route
              path="tanzania-broadcast"
              element={
                userRole === "master_admin" ? (
                  <BroadcastDashboard attendees={attendeesList} />
                ) : (
                  <NotFound />
                )
              }
            />
            <Route
              path="add-new"
              element={
                userRole !== "operator" ? <AdminRegister /> : <NotFound />
              }
            />
            <Route
              path="accommodation"
              element={
                userRole !== "operator" ? <AccommodationManager /> : <NotFound />
              }
            />
            <Route
              path="accommodation/metrics"
              element={
                userRole !== "operator" ? <AccommodationMetrics /> : <NotFound />
              }
            />
            <Route
              path="add-new-karyakar"
              element={
                userRole !== "operator" ? <KarayakarForm /> : <NotFound />
              }
            />
            <Route
              path="manual-scanner/:sessionId"
              element={
                <ManualScanner sessionId={null} regionScope={regionScope} />
              }
            />
            <Route
              path="roster/karyakar"
              element={
                userRole !== "operator" ? (
                  <KarayakarList
                    defaultRegion={regionScope !== "All" ? regionScope : ""}
                  />
                ) : (
                  <NotFound />
                )
              }
            />
            <Route
              path="archive"
              element={
                userRole === "master_admin" || userRole === "super_admin" ? (
                  <ArchiveManager regionScope={regionScope} />
                ) : (
                  <NotFound />
                )
              }
            />
            <Route
              path="session/master"
              element={
                userRole !== "operator" ? (
                  <SessionMasterDashboard
                    activeRegion={regionScope}
                    prefixScope={prefixScope}
                    globalAttendeesList={attendeesList}
                    isDataFetching={dataFetching}
                  />
                ) : (
                  <NotFound />
                )
              }
            />
            <Route
              path="session/attendance/:sessionId"
              element={
                <Sessions
                  regionScope={regionScope}
                  prefixScope={prefixScope}
                  globalAttendeesList={attendeesList}
                  isDataFetching={dataFetching}
                />
              }
            />
            <Route
              path="session/add-session"
              element={userRole !== "operator" ? <AddSession /> : <NotFound />}
            />
            <Route
              path="session/attendance"
              element={
                <Sessions
                  regionScope={regionScope}
                  prefixScope={prefixScope}
                  globalAttendeesList={attendeesList}
                  isDataFetching={dataFetching}
                />
              }
            />
            <Route
              path="session/master/data/:sessionId"
              element={
                userRole !== "operator" ? <SessionDataDetails /> : <NotFound />
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}