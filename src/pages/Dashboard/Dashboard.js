import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import PublicRegister from '../PublicRegister/PublicRegister'; 
import OverviewMetrics from '../OverviewMetrics/OverviewMetrics'; 
import CameraScanner from '../CameraScanner/CameraScanner'; 
import RegisteredRoster from '../RegisteredRoster/RegisteredRoster';
import styles from './Dashboard.module.css';

import { 
  FaChartBar, 
  FaCamera, 
  FaSignOutAlt, 
  FaUserShield,
  FaBars,
  FaTimes,
  FaUserPlus,
  FaUsers,
  FaSpinner,
  FaArrowLeft
} from 'react-icons/fa';
import NotFound from '../NotFound/NotFound';

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation(); // Used to read URL paths directly for CSS mapping
  const [loading, setLoading] = useState(true);
  const [dataFetching, setDataFetching] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); 
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Real-time Data Store Stream
  const [attendees, setAttendees] = useState([]);
  
  // Regional Partition Isolation Scope States
  const [regionScope, setRegionScope] = useState('All');
  const [prefixScope, setPrefixScope] = useState('MTRC-');

  // 1. Session & Storage Scope Verification Engine
  useEffect(() => {
    const checkUserSession = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        navigate('/login');
        return;
      }
      
      setUserEmail(user.email);

      // Extract structural boundaries established inside Data Partition Gateway
      const cachedRegion = localStorage.getItem('selected_shibir_region');
      const cachedPrefix = localStorage.getItem('selected_shibir_prefix');

      if (!cachedRegion) {
        // Redirection fallback if partition tokens are missing
        navigate('/select-region');
        return;
      }

      setRegionScope(cachedRegion);
      setPrefixScope(cachedPrefix || 'MTRC-');
      setLoading(false);
    };

    checkUserSession();
  }, [navigate]);

  // 2. Isolated Supabase Database Data Stream Fetcher
  useEffect(() => {
    if (loading) return;

    const fetchIsolatedDataset = async () => {
      try {
        setDataFetching(true);
        
        // Base dynamic builder query pipeline
        let query = supabase.from('attendees').select('*');

        // Apply row containment filters if scope isn't set to "All" global clearance
        if (regionScope !== 'All') {
          query = query.eq('region', regionScope);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;
        setAttendees(data || []);
      } catch (err) {
        console.error('Database payload stream mapping failure:', err.message);
      } finally {
        setDataFetching(false);
      }
    };

    fetchIsolatedDataset();
  }, [loading, regionScope]);

const handleLogout = async () => {
  setIsLoggingOut(true); // Trigger loading state
  
  // Optional: add a tiny delay so the user actually sees the "Logging out..." text
  await new Promise(resolve => setTimeout(resolve, 800)); 

  await supabase.auth.signOut();
  localStorage.removeItem('selected_shibir_region');
  localStorage.removeItem('selected_shibir_prefix');
  navigate('/');
}
  
  // Centralized router management engine replacing handleTabChange
  const handleNavigation = (targetPath) => {
    navigate(targetPath);
    setIsMobileMenuOpen(false);
  };

  if (loading) {
    return (
      <div className={styles.loadingWrapper}>
        <FaSpinner className={styles.spinIcon} />
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '20px', marginTop: '12px' }}>
          Loading Portal Settings...
        </p>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      
      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div 
          className={styles.mobileOverlay} 
          onClick={() => setIsMobileMenuOpen(false)} 
        />
      )}

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
              <FaUserShield style={{ marginRight: '4px' }} /> Regional Admin
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
          
          {/* Sub-routing configuration switch container block */}
          <Routes>
            <Route path="overview" element={<OverviewMetrics attendees={attendees} dataFetching={dataFetching} />} />
            <Route path="scanner" element={<CameraScanner regionScope={regionScope} prefixScope={prefixScope} />} />
            <Route path="roster" element={<RegisteredRoster attendees={attendees} dataFetching={dataFetching} regionScope={regionScope} />} />
            <Route path="add-new" element={<PublicRegister defaultRegion={regionScope !== 'All' ? regionScope : ''} />} />
            {/* Safe fallback catch direction map */}
            <Route path="*" element={<NotFound  />} />
          </Routes>

        </div>
      </div>
    </div>
  );
}