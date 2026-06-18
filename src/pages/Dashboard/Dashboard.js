import React, { useState, useEffect } from "react";
import {
  useNavigate,
  useLocation,
  Routes,
  Route,
  useParams,
} from "react-router-dom";
import { supabase } from "../../supabaseClient";
import PublicRegister from "../PublicRegister/PublicRegister";
import OverviewMetrics from "../OverviewMetrics/OverviewMetrics";
import CameraScanner from "../CameraScanner/CameraScanner";
import RegisteredRoster from "../RegisteredRoster/RegisteredRoster";
import NotFound from "../NotFound/NotFound";
import styles from "./Dashboard.module.css";
import ArchiveManager from "../ArchiveManager/ArchiveManager";
import SessionMasterDashboard from "../SessionMasterDashboard/SessionMasterDashboard";
import AddSession from "../AddSession/AddSession";
import Sessions from "../Sessions/Sessions";
import SessionDataDetails from "../SessionDataDetails/SessionDataDetails";
import AdminControl from "../AdminControl/AdminControl"; // Import the AdminControl component
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
} from "react-icons/fa";
import { IoIosAddCircleOutline } from "react-icons/io";
import { TfiStatsUp } from "react-icons/tfi";
export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [userRole, setUserRole] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [attendees, setAttendees] = useState([]);
  const [regionScope, setRegionScope] = useState("All");
  const [prefixScope, setPrefixScope] = useState("MTRC-");
  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  console.log("Menu state:", !!toggleMenu);

  useEffect(() => {
    const checkUserSession = async () => {
      try {
        setLoading(true);

        const {
          data: { session },
          error: authError,
        } = await supabase.auth.getSession();

        if (authError || !session) {
          navigate("/login");
          return;
        }

        const { data: profile, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (profile) {
          setUserRole(profile.role);
          setUserEmail(session.user.email);
        } else {
          console.error("Role fetch error:", error);
        }

        const ROLES = {
          master_admin: 4,
          super_admin: 3,
          admin: 2,
          operator: 1,
        };

        const hasPermission = (userRole, requiredRole) => {
          return (ROLES[userRole] || 0) >= (ROLES[requiredRole] || 0);
        };
        console.log("Permissions loaded:", !!hasPermission);
        const cachedRegion = localStorage.getItem("selected_shibir_region");
        if (!cachedRegion) {
          navigate("/select-region");
          return;
        }

        setRegionScope(cachedRegion);
        setPrefixScope(
          localStorage.getItem("selected_shibir_prefix") || "MTRC-",
        );
      } catch (err) {
        console.error("Critical Auth/Profile fetch failure:", err);
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    checkUserSession();
  }, [navigate]);

  useEffect(() => {
    if (loading || !regionScope) return;
    fetchIsolatedDataset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, regionScope]);
  const fetchIsolatedDataset = async () => {
    try {
      setDataFetching(true);
      let query = supabase.from("attendees").select("*");

      if (regionScope !== "All") {
        query = query.eq("region", regionScope);
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });
      if (error) throw error;
      setAttendees(data || []);
    } catch (err) {
      console.error("Data fetch failure:", err.message);
    } finally {
      setDataFetching(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    localStorage.removeItem("selected_shibir_region");
    localStorage.removeItem("selected_shibir_prefix");
    navigate("/");
  };
  const toggleArchiveStatus = async (attendee, status) => {
    try {
      const { error } = await supabase
        .from("attendees")
        .update({ is_archived: status })
        .eq("id", attendee.id);

      if (error) throw error;

      setAttendees((prev) => prev.filter((item) => item.id !== attendee.id));
    } catch (err) {
      console.error("Error toggling archive status:", err.message);
    }
  };
  useEffect(() => {
    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "attendees" },
        (payload) => {
          fetchIsolatedDataset();
        },
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const handleNavigation = (targetPath) => {
    navigate(targetPath);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className={styles.layout}>
      {/* ================= SIDEBAR MENU COMPONENT ================= */}
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
                <h1 className={styles.brandTitle}>Bal-Balika Shibir</h1>
                <p className={styles.brandSubtitle}>africa 2026</p>
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
          {/* Active Partition Micro Indicator Badge */}
          <div className={styles.scopeIndicatorCard}>
            <span className={styles.scopeMetaLabel}>REGION </span>
            <div className={styles.scopeBadgeText} title={regionScope}>
              {regionScope === "All" ? "Global African Database" : regionScope}
            </div>
            {/* <span className={styles.scopePrefixCode}>Prefix Filter: <code>{prefixScope}</code></span> */}
          </div>
          <nav className={styles.navigationList}>
            {/* 1. Only evaluate admin rules if userRole has actually loaded to prevent layout flashing */}
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

                <button
                  onClick={() => handleNavigation("/dashboard/add-new")}
                  className={`${styles.navLink} ${location.pathname === "/dashboard/add-new" ? styles.navLinkActive : ""}`}
                >
                  <FaUserPlus className={styles.iconMargin} /> Register Attendee
                </button>

             {userRole === "master_admin" && (
              <>
                {/* Existing Archive Button */}
                <button
                  onClick={() => handleNavigation("/dashboard/archive")}
                  className={`${styles.navLink} ${location.pathname === "/dashboard/archive" ? styles.navLinkActive : ""}`}
                >
                  <FaArchive className={styles.iconMargin} /> Archive Manager
                </button>

                {/* New Button Example */}
                <button
                  onClick={() => handleNavigation("/dashboard/admin-control")}
                  className={`${styles.navLink} ${location.pathname === "/dashboard/admin-control" ? styles.navLinkActive : ""}`}
                >
                  <FaUserShield className={styles.iconMargin} /> Admin Control
                </button>
              </>
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
                  <IoIosAddCircleOutline className={styles.iconMargin} /> Add Session
                </button>
              </>
            )}

            {/* 2. Handle the Sessions Attendance button securely */}
            {userRole &&
              (userRole === "operator" ? (
                <button
                  onClick={() =>
                    handleNavigation("/dashboard/session/attendance")
                  }
                  className={`${styles.navLink} ${styles.navLinkActive}`}
                >
                  <TfiStatsUp className={styles.iconMargin} /> Sessions
                  Attendance
                </button>
              ) : (
                <button
                  onClick={() =>
                    handleNavigation("/dashboard/session/attendance")
                  }
                  className={`${styles.navLink} ${location.pathname.startsWith("/dashboard/session/attendance") ? styles.navLinkActive : ""}`}
                >
                  <TfiStatsUp className={styles.iconMargin} /> Sessions
                  Attendance
                </button>
              ))}
          </nav>{" "}
        </div>

        <div className={styles.sidebarFooter}>
          {/* Quick Route Switchback Button to main gateway view */}
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
                ? userRole.replace("_", " ").toUpperCase()
                : "Loading..."}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className={styles.logoutBtn}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <>
                <FaSpinner
                  className={styles.spin}
                  style={{ marginRight: "6px" }}
                />
                Logging out...
              </>
            ) : (
              <>
                <FaSignOutAlt style={{ marginRight: "6px" }} />
                Logout Session
              </>
            )}
          </button>
        </div>
      </aside>
      {/* ================= DYNAMIC MAIN WORKSPACE CONTENT AREA ================= */}
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
              <Routes>
                <Route path="overview" element="Performance Overview" />
                <Route path="scanner/:uuid" element="Mark Attendance" />
                <Route path="roster" element="Registered Attendees Base" />
                <Route path="add-new" element="Register New Attendee" />
                <Route path="archive" element="Archive Manager" />
                <Route path="admin-control" element="Admin Control Panel" />
                <Route path="session/master" element="Session Master" />
                <Route path="session/add-session" element="Add Session" />
                <Route
                  path="session/attendance"
                  element="Sessions Attendance"
                />
                <Route
                  path="session/attendance/:uuid"
                  element="Mark Attendance"
                />
                <Route
                  path="session/master/data/:sessionId"
                  element="Master Data"
                />
              </Routes>
            </h2>
          </div>
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
        </header>
        <div className={styles.viewWrapper}>
          <Routes>
            <Route
              path="overview"
              element={
                userRole !== "operator" ? (
                  <OverviewMetrics
                    attendees={attendees}
                    dataFetching={dataFetching}
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
    userRole === "master_admin" ? (
      <AdminControl /> // Ensure you import this component
    ) : (
      <NotFound />
    )
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
                    attendees={attendees}
                    setAttendees={setAttendees}
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
              path="add-new"
              element={
                userRole !== "operator" ? (
                  <PublicRegister
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
                userRole === "master_admin" ? (
                  <ArchiveManager
                    attendees={attendees}
                    toggleArchiveStatus={toggleArchiveStatus}
                    regionScope={regionScope}
                  />
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
                    globalAttendeesList={attendees}
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
                  globalAttendeesList={attendees}
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
                  globalAttendeesList={attendees}
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
