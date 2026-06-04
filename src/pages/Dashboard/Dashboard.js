import React, { useState, useEffect } from 'react';
import { useNavigate, NavLink, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import AddAttendee from '../AddAttendee/AddAttendee'; 
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

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dataFetching, setDataFetching] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); 
  
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
        let query = supabase.from('attendees').select('*');

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
    await supabase.auth.signOut();
    localStorage.removeItem('selected_shibir_region');
    localStorage.removeItem('selected_shibir_prefix');
    navigate('/');
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

          <div className={styles.scopeIndicatorCard}>
            <span className={styles.scopeMetaLabel}>REGION </span>
            <div className={styles.scopeBadgeText} title={regionScope}>
              {regionScope === 'All' ? 'Global African Database' : regionScope}
            </div>
          </div>

          <nav className={styles.navigationList}>
            {/* NavLink components automatically apply a `.active` class when matched */}
            <NavLink 
              to="/dashboard/overview" 
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
            >
              <FaChartBar className={styles.iconMargin} /> Overview Metrics
            </NavLink>

            <NavLink 
              to="/dashboard/scanner" 
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
            >
              <FaCamera className={styles.iconMargin} /> Camera QR Scanner
            </NavLink>

            <NavLink 
              to="/dashboard/roster" 
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
            >
              <FaUsers className={styles.iconMargin} /> Registered Roster
            </NavLink>

            <NavLink 
              to="/dashboard/add-new" 
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
            >
              <FaUserPlus className={styles.iconMargin} /> Register Attendee
            </NavLink>
          </nav>
        </div>

        <div className={styles.sidebarFooter}>
          <button onClick={() => navigate('/select-region')} className={styles.switchGatewayBtn}>
            <FaArrowLeft style={{ marginRight: '6px' }} /> Switch Partition
          </button>
          
          <div className={styles.userInfoBlock}>
            <span className={styles.userEmailLabel}>{userEmail}</span>
            <span className={styles.userRoleTag}>
              <FaUserShield style={{ marginRight: '4px' }} /> Regional Admin
            </span>
          </div>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            <FaSignOutAlt style={{ marginRight: '6px' }} /> Logout Session
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
          {/* Sub-routing structural switch map block */}
          <Routes>
            <Route path="overview" element={<OverviewMetrics attendees={attendees} dataFetching={dataFetching} />} />
            <Route path="scanner" element={<CameraScanner regionScope={regionScope} prefixScope={prefixScope} />} />
            <Route path="roster" element={<RegisteredRoster attendees={attendees} dataFetching={dataFetching} regionScope={regionScope} />} />
            <Route path="add-new" element={<AddAttendee defaultRegion={regionScope !== 'All' ? regionScope : ''} />} />
            {/* Safe fallback catch direction map */}
            <Route path="*" element={<Navigate to="overview" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}