import React, { useState, useEffect, useCallback } from "react";
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
import NotFound from "../NotFound/NotFound";
import styles from "./Dashboard.module.css";
import ArchiveManager from "../ArchiveManager/ArchiveManager";
import SessionMasterDashboard from "../SessionMasterDashboard/SessionMasterDashboard";
import AddSession from "../AddSession/AddSession";
import Sessions from "../Sessions/Sessions";
import SessionDataDetails from "../SessionDataDetails/SessionDataDetails";
import AdminControl from "../AdminControl/AdminControl";
import PublicRegister from "../PublicRegister/PublicRegister";
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
} from "react-icons/fa";
import { IoIosAddCircleOutline } from "react-icons/io";
import { TfiStatsUp } from "react-icons/tfi";
import KarayakarForm from "../KarayakarForm/KarayakarForm";
import KarayakarList from "../KarayakarList/KarayakarList";
import ManualScanner from "../ManualScanner/ManualScanner";
export default function Dashboard() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, userRole, logout } = useAuth();

  function CameraRouteWrapper({ regionScope, prefixScope }) {
    const { sessionId } = useParams();
    return <CameraScanner sessionId={sessionId} regionScope={regionScope} prefixScope={prefixScope} />;
  }

  const [loading, setLoading]               = useState(true);
  const [dataFetching, setDataFetching]     = useState(true);
  const [userEmail, setUserEmail]           = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut]     = useState(false);
  const [attendeesList, setAttendeesList]   = useState([]);
  const [regionScope, setRegionScope]       = useState("All");
  const [prefixScope, setPrefixScope]       = useState("MTRC-");
  
  // We use this key to force React to remount child components on refresh
  const [refreshKey, setRefreshKey]         = useState(0);

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

  // Runs only once on component mount when initialization loading completes
  useEffect(() => {
    if (!loading && regionScope) {
      fetchIsolatedDataset();
    }
  }, [loading, regionScope, fetchIsolatedDataset]);

  const handleManualRefresh = () => {
    if (!dataFetching) {
      fetchIsolatedDataset();
      // This forces the <Routes> component below to remount, triggering 
      // internal fetch logic inside your other components (Sessions, Overview, etc.)
      setRefreshKey(prevKey => prevKey + 1); 
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      localStorage.removeItem("selected_shibir_region");
      localStorage.removeItem("selected_shibir_prefix");
      navigate("/admin", { replace: true });
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleNavigation = (targetPath) => {
    navigate(targetPath);
    setIsMobileMenuOpen(false);
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <FaSpinner style={{ fontSize: "32px", animation: "spin 1s linear infinite" }} />
    </div>
  );

  return (
    <div className={styles.layout}>
      <aside className={`${styles.sidebar} ${isMobileMenuOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.sidebarTop}>
          <div className={styles.brandFrame}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h1 className={styles.brandTitle}>Making the Right Choices</h1>
                <p className={styles.brandSubtitle}>Bal-Balika Shibir, africa 2026</p>
                
              </div>
              <button className={styles.closeMenuBtn} onClick={() => setIsMobileMenuOpen(false)} aria-label="Close menu">
                <FaTimes />
              </button>
            </div>
          </div>
          <div className={styles.scopeIndicatorCard}>
            <span className={styles.scopeMetaLabel}>REGION </span>
            <div className={styles.scopeBadgeText} title={regionScope}>
              {regionScope === "All" ? "Global African Database" : regionScope}
            </div>
          </div>
          <nav className={styles.navigationList}>
            {userRole && userRole !== "operator" && (
  <>
    <button onClick={() => handleNavigation("/dashboard/overview")} className={`${styles.navLink} ${location.pathname === "/dashboard/overview" ? styles.navLinkActive : ""}`}>
      <FaChartBar className={styles.iconMargin} /> Overview Metrics
    </button>
    <button onClick={() => handleNavigation("/dashboard/roster")} className={`${styles.navLink} ${location.pathname === "/dashboard/roster" ? styles.navLinkActive : ""}`}>
      <FaUsers className={styles.iconMargin} /> Registered Roster
    </button>
    <button onClick={() => handleNavigation("/dashboard/add-new")} className={`${styles.navLink} ${location.pathname === "/dashboard/add-new" ? styles.navLinkActive : ""}`}>
      <FaUserPlus className={styles.iconMargin} /> Register Attendee
    </button>
    <button onClick={() => handleNavigation("/dashboard/roster/karyakar")} className={`${styles.navLink} ${location.pathname === "/dashboard/roster/karyakar" ? styles.navLinkActive : ""}`}>
      <FaUsers className={styles.iconMargin} /> Karyakar List
    </button>
    <button onClick={() => handleNavigation("/dashboard/add-new-karyakar")} className={`${styles.navLink} ${location.pathname === "/dashboard/add-new-karyakar" ? styles.navLinkActive : ""}`}>
      <FaUserPlus className={styles.iconMargin} /> Add Karyakar
    </button>

    

    {/* Archive Manager: Accessible by both master_admin and super_admin */}
    {(userRole === "master_admin" || userRole === "super_admin") && (
      <button onClick={() => handleNavigation("/dashboard/archive")} className={`${styles.navLink} ${location.pathname === "/dashboard/archive" ? styles.navLinkActive : ""}`}>
        <FaArchive className={styles.iconMargin} /> Archive Manager
      </button>
    )}

    {/* Admin Control: Only accessible by master_admin */}
    {userRole === "master_admin" && (
      <button onClick={() => handleNavigation("/dashboard/admin-control")} className={`${styles.navLink} ${location.pathname === "/dashboard/admin-control" ? styles.navLinkActive : ""}`}>
        <FaUserShield className={styles.iconMargin} /> Admin Control
      </button>
    )}

    <button onClick={() => handleNavigation("/dashboard/session/master")} className={`${styles.navLink} ${location.pathname === "/dashboard/session/master" ? styles.navLinkActive : ""}`}>
      <FaChartBar className={styles.iconMargin} /> Session Master
    </button>
    <button onClick={() => handleNavigation("/dashboard/session/add-session")} className={`${styles.navLink} ${location.pathname === "/dashboard/session/add-session" ? styles.navLinkActive : ""}`}>
      <IoIosAddCircleOutline className={styles.iconMargin} /> Add Session
    </button>
  </>
)}
            {userRole && (
              <button onClick={() => handleNavigation("/dashboard/session/attendance")} className={`${styles.navLink} ${location.pathname.startsWith("/dashboard/session/attendance") ? styles.navLinkActive : ""}`}>
                <TfiStatsUp className={styles.iconMargin} /> Sessions Attendance
              </button>
            )}
          </nav>
        </div>

        <div className={styles.sidebarFooter}>
          <button onClick={() => navigate("/select-region")} className={styles.switchGatewayBtn}>
            <FaArrowLeft style={{ marginRight: "6px" }} /> Switch Region
          </button>
          <div className={styles.userInfoBlock}>
            <span className={styles.userEmailLabel}>{userEmail}</span>
            <span className={styles.userRoleTag}>
              <FaUserShield style={{ marginRight: "4px" }} />
              {userRole ? userRole.replace(/_/g, " ").toUpperCase() : "Loading..."}
            </span>
          </div>
          <button onClick={handleLogout} className={styles.logoutBtn} disabled={isLoggingOut}>
            {isLoggingOut
              ? <><FaSpinner className={styles.spin} style={{ marginRight: "6px" }} /> Logging out...</>
              : <><FaSignOutAlt style={{ marginRight: "6px" }} /> Logout Session</>
            }
          </button>
        </div>
      </aside>

      <div className={styles.mainContainer}>
        <header className={styles.topHeaderBar}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button className={styles.hamburgerBtn} onClick={() => setIsMobileMenuOpen(true)} aria-label="Open navigation menu">
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
                <Route path="session/attendance" element="Sessions Attendance" />
                <Route path="session/attendance/:uuid" element="Mark Attendance" />
                <Route path="session/master/data/:sessionId" element="Master Data" />
                <Route path="roster/karyakar" element="Karyakar List" />
                <Route path="add-new-karyakar" element="Register New Karyakar" />
              </Routes>
            </h2>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <button 
              className={styles.manualRefreshBtn} 
              onClick={handleManualRefresh}
              disabled={dataFetching}
              aria-label="Refresh database metrics"
            >
              <FaSyncAlt className={`${styles.refreshIcon} ${dataFetching ? styles.spin : ""}`} />
              <span>Refresh</span>
            </button>
            <span className={styles.systemStatusText}>
              {dataFetching
                ? <span className={styles.syncingIndicator}><FaSpinner className={styles.spin} /> Syncing Data...</span>
                : <><span className={styles.pulseDot}></span> MTRC</>
              }
            </span>
          </div>
        </header>

        <div className={styles.viewWrapper}>
          {/* Passing the refreshKey here forces React to cleanly remount whichever child view is currently open, triggering all internal API calls anew */}
          <Routes key={refreshKey}>
            <Route path="overview" element={userRole !== "operator" ? <OverviewMetrics attendees={attendeesList} dataFetching={dataFetching} /> : <NotFound />} />
            <Route path="scanner" element={<CameraScanner regionScope={regionScope} prefixScope={prefixScope} />} />
            <Route path="admin-control" element={userRole === "master_admin" ? <AdminControl /> : <NotFound />} />
            <Route path="scanner/:sessionId" element={<CameraRouteWrapper regionScope={regionScope} prefixScope={prefixScope} />} />
            <Route path="roster" element={userRole !== "operator" ? <RegisteredRoster attendees={attendeesList} setAttendees={setAttendeesList} dataFetching={dataFetching} regionScope={regionScope} userRole={userRole} /> : <NotFound />} />
            <Route path="add-new" element={userRole !== "operator" ? <PublicRegister /> : <NotFound />} />
            <Route path="add-new-karyakar" element={userRole !== "operator" ? <KarayakarForm /> : <NotFound />} />
<Route path="manual-scanner/:sessionId" element={<ManualScanner sessionId={null} regionScope={regionScope} />} />
            <Route path="roster/karyakar" element={userRole !== "operator" ? <KarayakarList defaultRegion={regionScope !== "All" ? regionScope : ""} /> : <NotFound />} />
<Route path="archive" element={(userRole === "master_admin" || userRole === "super_admin") ? <ArchiveManager regionScope={regionScope} /> : <NotFound />} />            <Route path="session/master" element={userRole !== "operator" ? <SessionMasterDashboard activeRegion={regionScope} prefixScope={prefixScope} globalAttendeesList={attendeesList} isDataFetching={dataFetching} /> : <NotFound />} />
            <Route path="session/attendance/:sessionId" element={<Sessions regionScope={regionScope} prefixScope={prefixScope} globalAttendeesList={attendeesList} isDataFetching={dataFetching} />} />
            <Route path="session/add-session" element={userRole !== "operator" ? <AddSession /> : <NotFound />} />
            <Route path="session/attendance" element={<Sessions regionScope={regionScope} prefixScope={prefixScope} globalAttendeesList={attendeesList} isDataFetching={dataFetching} />} />
            <Route path="session/master/data/:sessionId" element={userRole !== "operator" ? <SessionDataDetails /> : <NotFound />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}