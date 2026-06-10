import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import PublicRegister from '../PublicRegister/PublicRegister'; 
import OverviewMetrics from '../OverviewMetrics/OverviewMetrics'; 
import CameraScanner from '../CameraScanner/CameraScanner'; 
import RegisteredRoster from '../RegisteredRoster/RegisteredRoster';
import NotFound from '../NotFound/NotFound';
import styles from './Dashboard.module.css';
import ArchiveManager from '../ArchiveManager/ArchiveManager';

import { 
  FaChartBar, FaCamera, FaSignOutAlt, FaUserShield, FaBars,
  FaTimes, FaUserPlus, FaUsers, FaSpinner, FaArrowLeft,FaArchive
} from 'react-icons/fa';

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  // 1. Unified State Declarations
  const [loading, setLoading] = useState(true);
  const [dataFetching, setDataFetching] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState(null); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); 
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [attendees, setAttendees] = useState([]);
  const [regionScope, setRegionScope] = useState('All');
  const [prefixScope, setPrefixScope] = useState('MTRC-');
  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);


  // 2. Session & Scope Verification Engine
  useEffect(() => {
    const checkUserSession = async () => {
      try {
        setLoading(true);
        // Get session first
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        
        if (authError || !session) {
          navigate('/login');
          return;
        }

        // Fetch Profile & Role
        const { data: profile, error } = await supabase
  .from('user_roles')
  .select('role')
  .eq('id', session.user.id) // Corrected from 'user_id' to 'id'
  .single();

if (profile) {
  setUserRole(profile.role); // Corrected from 'profile.user_roles.role_name'
  setUserEmail(session.user.email);
} else {
  console.error("Role fetch error:", error);
}

        const ROLES = {
  master_admin: 4,
  super_admin: 3,
  admin: 2,
  operator: 1
};

// Use this helper function to check permissions
const hasPermission = (userRole, requiredRole) => {
  return (ROLES[userRole] || 0) >= (ROLES[requiredRole] || 0);
};
        const cachedRegion = localStorage.getItem('selected_shibir_region');
        if (!cachedRegion) {
          navigate('/select-region');
          return;
        }

        setRegionScope(cachedRegion);
        setPrefixScope(localStorage.getItem('selected_shibir_prefix') || 'MTRC-');
      } catch (err) {
        console.error("Critical Auth/Profile fetch failure:", err);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    checkUserSession();
  }, [navigate]);

useEffect(() => {
  if (loading || !regionScope) return;
  fetchIsolatedDataset();
}, [loading, regionScope]);
const fetchIsolatedDataset = async () => {
  try {
    setDataFetching(true);
    let query = supabase.from('attendees').select('*');
    
    // If you want to see all (including archived) in the manager, 
    // adjust logic to handle visibility here
    if (regionScope !== 'All') {
      query = query.eq('region', regionScope);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    setAttendees(data || []);
  } catch (err) {
    console.error('Data fetch failure:', err.message);
  } finally {
    setDataFetching(false);
  }
};


  // Handlers
  const handleLogout = async () => {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    localStorage.removeItem('selected_shibir_region');
    localStorage.removeItem('selected_shibir_prefix');
    navigate('/');
  };
const toggleArchiveStatus = async (attendee, status) => {
  try {
    const { error } = await supabase
      .from('attendees')
      .update({ is_archived: status })
      .eq('id', attendee.id);

    if (error) throw error;

    // Refresh the local state so the UI updates automatically
    // You can call your existing fetchIsolatedDataset here
    // Note: If fetchIsolatedDataset is inside a useEffect, 
    // it's better to make it a standalone function you can call.
    setAttendees(prev => prev.filter(item => item.id !== attendee.id));
    
  } catch (err) {
    console.error("Error toggling archive status:", err.message);
  }
};useEffect(() => {
  const channel = supabase
    .channel('schema-db-changes')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'attendees' }, (payload) => {
      // Refresh the data whenever an update happens
      fetchIsolatedDataset();
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
}, []);
  const handleNavigation = (targetPath) => {
    navigate(targetPath);
    setIsMobileMenuOpen(false);
  };

  // 4. Loading State View

  return (
    <div className={styles.layout}>
            {/* ================= SIDEBAR MENU COMPONENT ================= */}
      <aside className={`${styles.sidebar} ${isMobileMenuOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarTop}>
          <div className={styles.brandFrame}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
              {regionScope === 'All' ? 'Global African Database' : regionScope}
            </div>
            {/* <span className={styles.scopePrefixCode}>Prefix Filter: <code>{prefixScope}</code></span> */}
          </div>

          <nav className={styles.navigationList}>
            <button 
              onClick={() => handleNavigation('/dashboard/overview')} 
              className={`${styles.navLink} ${location.pathname === '/dashboard/overview' ? styles.navLinkActive : ''}`}
            >
              <FaChartBar className={styles.iconMargin} /> Overview Metrics
            </button>
            <button 
              onClick={() => handleNavigation('/dashboard/scanner')} 
              className={`${styles.navLink} ${location.pathname === '/dashboard/scanner' ? styles.navLinkActive : ''}`}
            >
              <FaCamera className={styles.iconMargin} /> Camera QR Scanner
            </button>
            <button 
              onClick={() => handleNavigation('/dashboard/roster')} 
              className={`${styles.navLink} ${location.pathname === '/dashboard/roster' ? styles.navLinkActive : ''}`}
            >
              <FaUsers className={styles.iconMargin} /> Registered Roster
            </button>
            <button 
              onClick={() => handleNavigation('/dashboard/add-new')} 
              className={`${styles.navLink} ${location.pathname === '/dashboard/add-new' ? styles.navLinkActive : ''}`}
            >
              <FaUserPlus className={styles.iconMargin} /> Register Attendee
            </button>
            {(userRole === 'master_admin') && (
    <button 
      onClick={() => handleNavigation('/dashboard/archive')} 
      className={`${styles.navLink} ${location.pathname === '/dashboard/archive' ? styles.navLinkActive : ''}`}
    >
      <FaArchive className={styles.iconMargin} /> Archive Manager
    </button>
  )}
          </nav>
        </div>

        <div className={styles.sidebarFooter}>
          {/* Quick Route Switchback Button to main gateway view */}
          <button onClick={() => navigate('/select-region')} className={styles.switchGatewayBtn}>
            <FaArrowLeft style={{ marginRight: '6px' }} /> Switch Region
          </button>
          
          <div className={styles.userInfoBlock}>
            <span className={styles.userEmailLabel}>{userEmail}</span>
            <span className={styles.userRoleTag}>
  <FaUserShield style={{ marginRight: '4px' }} /> 
  {userRole ? userRole.replace('_', ' ').toUpperCase() : 'Loading...'}
</span>
          </div>
          <button 
  onClick={handleLogout} 
  className={styles.logoutBtn}
  disabled={isLoggingOut} // Prevents double-clicks
>
  {isLoggingOut ? (
    <>
      <FaSpinner className={styles.spin} style={{ marginRight: '6px' }} /> 
      Logging out...
    </>
  ) : (
    <>
      <FaSignOutAlt style={{ marginRight: '6px' }} /> 
      Logout Session
    </>
  )}
</button>
        </div>
      </aside>
{/* ================= DYNAMIC MAIN WORKSPACE CONTENT AREA ================= */}
        <div className={styles.mainContainer}>
                 <header className={styles.topHeaderBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                <Route path="scanner" element="Entrance Verification" />
                <Route path="roster" element="Registered Attendees Base" />
                <Route path="add-new" element="Register New Attendee" />
              </Routes>
            </h2>
          </div>
          <span className={styles.systemStatusText}>
            {dataFetching ? (
              <span className={styles.syncingIndicator}><FaSpinner className={styles.spin} /> Syncing Data...</span>
            ) : (
              <><span className={styles.pulseDot}></span> MTRC</>
            )}
          </span>
        </header>

          
          <div className={styles.viewWrapper}>
            <Routes>
              <Route path="overview" element={<OverviewMetrics attendees={attendees} dataFetching={dataFetching} />} />
              <Route path="scanner" element={<CameraScanner regionScope={regionScope} prefixScope={prefixScope} />} />
              <Route path="roster" element={<RegisteredRoster attendees={attendees} setAttendees={setAttendees} dataFetching={dataFetching} regionScope={regionScope} userRole={userRole} />} />
              <Route path="add-new" element={<PublicRegister defaultRegion={regionScope !== 'All' ? regionScope : ''} />} />
              
              <Route 
  path="archive" 
  element={
    userRole === 'master_admin' ? 
    <ArchiveManager 
      attendees={attendees} 
      toggleArchiveStatus={toggleArchiveStatus} 
      regionScope={regionScope} 
    /> : 
    <NotFound /> // Only master_admin gets the ArchiveManager; others get NotFound
  } 
/>
            </Routes>
          </div>
          </div>
    </div>
  );
}