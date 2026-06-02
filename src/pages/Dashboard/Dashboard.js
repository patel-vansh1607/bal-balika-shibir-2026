import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  FaUsers // Added icon for the live roster section link
} from 'react-icons/fa';

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); 

  // Central state stream array passed down to metrics pipeline views
  const [attendees] = useState([
    { id: 1, name: "Aarav Patel", age: 9, center: "Town Center", status: "Checked In", time: "08:14 AM" },
    { id: 2, name: "Diya Shah", age: 11, center: "West District", status: "Checked In", time: "08:22 AM" },
    { id: 3, name: "Devam Patel", age: 7, center: "Town Center", status: "Pending", time: "-" },
    { id: 4, name: "Riya Sharma", age: 12, center: "East Area", status: "Checked In", time: "08:31 AM" },
    { id: 5, name: "Smit Shah", age: 10, center: "Town Center", status: "Pending", time: "-" },
  ]);

  useEffect(() => {
    const checkUserSession = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        navigate('/');
      } else {
        setUserEmail(user.email);
        setLoading(false);
      }
    };
    checkUserSession();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false); 
  };

  if (loading) {
    return (
      <div className={styles.loadingWrapper}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '20px' }}>Loading Portal Settings...</p>
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

          <nav className={styles.navigationList}>
            <button 
              onClick={() => handleTabChange('overview')} 
              className={`${styles.navLink} ${activeTab === 'overview' ? styles.navLinkActive : ''}`}
            >
              <FaChartBar className={styles.iconMargin} /> Overview Metrics
            </button>
            <button 
              onClick={() => handleTabChange('scanner')} 
              className={`${styles.navLink} ${activeTab === 'scanner' ? styles.navLinkActive : ''}`}
            >
              <FaCamera className={styles.iconMargin} /> Camera QR Scanner
            </button>
            <button 
              onClick={() => handleTabChange('roster')} 
              className={`${styles.navLink} ${activeTab === 'roster' ? styles.navLinkActive : ''}`}
            >
              <FaUsers className={styles.iconMargin} /> Registered Roster
            </button>
            <button 
              onClick={() => handleTabChange('add-new')} 
              className={`${styles.navLink} ${activeTab === 'add-new' ? styles.navLinkActive : ''}`}
            >
              <FaUserPlus className={styles.iconMargin} /> Register Attendee
            </button>
          </nav>
        </div>

        <div className={styles.sidebarFooter}>
          <div className={styles.userInfoBlock}>
            <span className={styles.userEmailLabel}>{userEmail}</span>
            <span className={styles.userRoleTag}>
              <FaUserShield style={{ marginRight: '4px' }} /> Super Administrator
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
              {activeTab === 'overview' && 'Performance Overview'}
              {activeTab === 'scanner' && 'Entrance Verification'}
              {activeTab === 'roster' && 'Registered Attendees Base'}
              {activeTab === 'add-new' && 'Register New Attendee'}
            </h2>
          </div>
          <span className={styles.systemStatusText}>
            <span className={styles.pulseDot}></span> System Live
          </span>
        </header>

        <div className={styles.viewWrapper}>
          
          {/* TAB VIEW 1: OVERVIEW METRICS PANEL */}
          {activeTab === 'overview' && (
            <OverviewMetrics attendees={attendees} />
          )}

          {/* TAB VIEW 2: CAMERA QR HARDWARE SCANNER MODULE */}
          {activeTab === 'scanner' && (
            <CameraScanner />
          )}

          {/* TAB VIEW 3: LIVE REGISTERED ATTENDEES LIST ROSTER */}
          {activeTab === 'roster' && (
            <RegisteredRoster />
          )}

          {/* TAB VIEW 4: REGISTER ATTENDEE MOUNT MODULE */}
          {activeTab === 'add-new' && (
            <AddAttendee />
          )}

        </div>
      </div>
    </div>
  );
}