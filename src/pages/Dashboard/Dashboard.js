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
} from "react-icons/fa";
import { IoIosAddCircleOutline } from "react-icons/io";
import { TfiStatsUp } from "react-icons/tfi";
import KarayakarForm from "../KarayakarForm/KarayakarForm";
import KarayakarList from "../KarayakarList/KarayakarList";
import ManualScanner from "../ManualScanner/ManualScanner";
import AccommodationManager from "../AccomodationManager/AccomodationManager";

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
  // Calculate the exact number of duplicate matching groups
  const duplicateCount = useMemo(() => {
    if (!attendeesList || attendeesList.length === 0 || dataFetching) return 0;

    const groups = {};
    attendeesList.forEach((person) => {
      if (person.is_archived) return; // Skip archived records

      // Normalize name
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

    // Filter to find groups with 2 or more occurrences, then return the count
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
                  style={{ position: "relative" }} // Keeps badge anchored correctly
                >
                  <FaCopy className={styles.iconMargin} /> Duplicates
                  {/* Display the active count bubble if duplicates > 0 */}
                  {duplicateCount > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: "50%",
                        right: "16px",
                        transform: "translateY(-50%)",
                        backgroundColor: "#ef4444", // Tailwind Red-500
                        color: "#ffffff",
                        minWidth: "20px",
                        height: "20px",
                        padding: "0 6px",
                        borderRadius: "10px", // pill-shaped so multi-digit numbers fit
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
                <button
                  onClick={() =>
                    handleNavigation("/dashboard/acc")
                  }
                  className={`${styles.navLink} ${location.pathname === "/dashboard/acc" ? styles.navLinkActive : ""}`}
                >
                  <FaUserPlus className={styles.iconMargin} /> Accomodation
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

                {userRole === "master_admin" && (
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
            onClick={handleLogout}
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

          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
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
              path="acc"
              element={
                userRole !== "operator" ? <AccommodationManager /> : <NotFound />
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
