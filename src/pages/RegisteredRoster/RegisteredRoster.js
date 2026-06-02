import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  FaSearch, 
  FaFilter, 
  FaSync, 
  FaClock, 
  FaCheckCircle, 
  FaPhoneAlt, 
  FaMapMarkerAlt,
  FaQrcode,
  FaTimes
} from 'react-icons/fa';
import styles from './RegisteredRoster.module.css'; 

export default function RegisteredRoster() {
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCenter, setSelectedCenter] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  
  // Track image load errors by individual attendee ID
  const [imageErrors, setImageErrors] = useState({});
  
  // Modal tracking state for the active targeted attendee pass
  const [activeQrModalUser, setActiveQrModalUser] = useState(null);

  // Fetch live rows from Supabase
  const fetchAttendees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendees')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('--- SUPABASE ROW FETCH SUCCESS ---');
      setAttendees(data || []);
      // Reset image error states on a fresh sync reload
      setImageErrors({});
    } catch (error) {
      console.error('Error loading roster database:', error.message);
      alert('Could not synchronize roster data stream.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendees();
  }, []);

  // Compute live local metrics dynamically
  const totalCount = attendees.length;
  const verifiedCount = attendees.filter(a => a.status === 'Checked In').length;
  const pendingCount = attendees.filter(a => a.status === 'Pending').length;

  // Extract unique centers available for clean dropdown mapping filters
  const centersList = ['All', ...new Set(attendees.map(a => a.center).filter(Boolean))];

  // Run multi-parameter filtration loops over the localized state dataset
  const filteredAttendees = attendees.filter(attendee => {
    const nameSafe = attendee.name ? attendee.name.toLowerCase() : '';
    const contactSafe = attendee.parent_contact ? attendee.parent_contact : '';
    
    const matchesSearch = nameSafe.includes(searchTerm.toLowerCase()) || contactSafe.includes(searchTerm);
    const matchesCenter = selectedCenter === 'All' || attendee.center === selectedCenter;
    const matchesStatus = selectedStatus === 'All' || attendee.status === selectedStatus;
    
    return matchesSearch && matchesCenter && matchesStatus;
  });

  /**
   * Refactored Helper function to construct absolute Storage Bucket public paths safely.
   */
  const getAvatarUrl = (photoPath) => {
    if (!photoPath) return null;

    // 1. If it's already a full absolute web link, strip cache query params and append cleanly
    if (photoPath.startsWith("http://") || photoPath.startsWith("https://")) {
      const cleanUrl = photoPath.split('?')[0];
      return `${cleanUrl}?t=${new Date().getTime()}`;
    }

    // 2. Extract just the pure file name if paths get appended duplicates
    let cleanFileName = photoPath;
    if (photoPath.includes('/')) {
      cleanFileName = photoPath.split('/').pop();
    }

    // 3. Strip any accidental string folder structures prefixes
    cleanFileName = cleanFileName.replace('attendee-profiles/', '').replace('public/', '');

    // 4. Construct the precise public CDN endpoint URL structure from your bucket
    const projectUrl = "https://bdqscvezobwshuyxqrvq.supabase.co/storage/v1/object/public/attendee-profiles";
    return `${projectUrl}/${cleanFileName}?t=${new Date().getTime()}`;
  };

  // Helper to get a stylized text fallback avatar
  const getInitials = (name) => {
    if (!name) return "?";
    return name.trim().charAt(0).toUpperCase();
  };

  const handleImageError = (id) => {
    setImageErrors(prev => ({ ...prev, [id]: true }));
  };

  return (
    <div className={styles.rosterContainer}>
      
      {/* Mini Metric Grid Panel Cards */}
      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Roster Database Rows</div>
          <p className={styles.statValue}>{totalCount}</p>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Verified Arrivals</div>
          <p className={styles.statValue} style={{ color: '#8a151b' }}>{verifiedCount}</p>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Awaiting Scans</div>
          <p className={styles.statValue} style={{ color: '#ffb020' }}>{pendingCount}</p>
        </div>
      </section>

      {/* Database Filter Action Toolbox Toolbar Row */}
      <div className={styles.contentCard} style={{ marginBottom: '20px', padding: '16px' }}>
        <div className={styles.toolbarRow}>
          
          <div className={styles.searchWrapper}>
            <input
              type="text"
              placeholder="Search by child name or parent contact..."
              className={styles.inputField}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <FaSearch className={styles.searchIcon} />
          </div>

          <div className={styles.filterGroup}>
            {/* Center Selector Dropdown Menu */}
            <div className={styles.filterSelectContainer}>
              <FaMapMarkerAlt style={{ color: '#8a151b' }} />
              <select 
                value={selectedCenter} 
                onChange={(e) => setSelectedCenter(e.target.value)}
                className={styles.selectDropdown}
              >
                {centersList.map(center => (
                  <option key={center} value={center}>
                    {center}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter Dropdown */}
            <div className={styles.filterSelectContainer}>
              <FaFilter style={{ color: '#8a151b' }} />
              <select 
                value={selectedStatus} 
                onChange={(e) => setSelectedStatus(e.target.value)}
                className={styles.selectDropdown}
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Checked In">Checked In</option>
              </select>
            </div>

            <button onClick={fetchAttendees} className={styles.primaryActionBtn}>
              <FaSync className={loading ? styles.spin : ''} /> Refresh
            </button>
          </div>

        </div>
      </div>

      {/* Main Roster Matrix Data Table Card Block */}
      <div className={styles.contentCard}>
        {loading ? (
          <div className={styles.tableMessageBlock}>
            <p>Pulling registered data schema streams...</p>
          </div>
        ) : filteredAttendees.length === 0 ? (
          <div className={styles.tableMessageBlock}>
            <p>No matching registered attendees found inside the cloud storage tables.</p>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Avatar</th>
                  <th>Child's Full Name</th>
                  <th>Age Bracket</th>
                  <th>Center Branch</th>
                  <th>Parent Contact</th>
                  <th>Status State Flag</th>
                  <th style={{ textAlign: 'center' }}>Verification Pass</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendees.map((attendee) => {
                  const resolvedAvatarUrl = getAvatarUrl(attendee.photo_url);
                  const hasImageError = imageErrors[attendee.id];

                  return (
                    <tr key={attendee.id}>
                      <td>
                        <div className={styles.avatarWrapper}>
                          {resolvedAvatarUrl && !hasImageError ? (
                            <img 
                              src={resolvedAvatarUrl} 
                              alt={attendee.name} 
                              crossOrigin="anonymous"
                              className={styles.avatarImage}
                              onError={() => handleImageError(attendee.id)}
                            />
                          ) : (
                            <div className={styles.avatarFallback}>
                              {getInitials(attendee.name)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className={styles.boldText}>{attendee.name}</td>
                      <td>{attendee.age} Years Old</td>
                      <td>
                        <span className={styles.inlineIconFlex}>
                          <FaMapMarkerAlt className={styles.mutedIcon} /> {attendee.center}
                        </span>
                      </td>
                      <td className={styles.monospaceText}>
                        <span className={styles.inlineIconFlex}>
                          <FaPhoneAlt className={styles.mutedIcon} /> {attendee.parent_contact}
                        </span>
                      </td>
                      <td>
                        {attendee.status === 'Checked In' ? (
                          <span className={styles.badgePresent}>
                            <FaCheckCircle style={{ marginRight: '4px' }} /> Checked In
                          </span>
                        ) : (
                          <span className={styles.badgeAbsent}>
                            <FaClock style={{ marginRight: '4px' }} /> Pending
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => setActiveQrModalUser(attendee)}
                          className={styles.viewPassBtn}
                        >
                          <FaQrcode style={{ fontSize: '13px' }} /> View QR Pass
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= MODAL OVERLAY ================= */}
      {activeQrModalUser && (
        <div className={styles.modalOverlay} onClick={() => setActiveQrModalUser(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalCloseBtn} onClick={() => setActiveQrModalUser(null)}>
              <FaTimes />
            </button>

            <h3 className={styles.modalTitle}>Attendee Gateway Card</h3>
            <p className={styles.modalSubtitle}>Bal-Balika Shibir 2026</p>

            <div className={styles.qrContainer}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(activeQrModalUser.id)}&color=8a151b`} 
                alt="Verification QR Pass"
                className={styles.qrImage}
              />
            </div>

            <div className={styles.modalInfoBox}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                {getAvatarUrl(activeQrModalUser.photo_url) && !imageErrors[activeQrModalUser.id] ? (
                  <img 
                    src={getAvatarUrl(activeQrModalUser.photo_url)} 
                    alt="" 
                    crossOrigin="anonymous"
                    className={styles.modalAvatarImg}
                    onError={() => handleImageError(activeQrModalUser.id)}
                  />
                ) : (
                  <div className={styles.modalAvatarFallback}>
                    {getInitials(activeQrModalUser.name)}
                  </div>
                )}
                <div style={{ textAlign: 'left' }}>
                  <div className={styles.modalAttendeeName}>{activeQrModalUser.name}</div>
                  <div style={{ fontSize: '12px', color: '#6e655f' }}>{activeQrModalUser.age} Years Old</div>
                </div>
              </div>
              
              <div className={styles.modalDataRow} style={{ borderTop: '1px dashed #e6dfda', paddingTop: '8px' }}>
                <span>Center Branch:</span>
                <span style={{ color: '#2d2926', fontWeight: '600' }}>{activeQrModalUser.center}</span>
              </div>
              <div className={styles.modalDataRow}>
                <span>DB Unique ID:</span>
                <span style={{ fontFamily: 'monospace', color: '#8a151b', fontWeight: '600' }}>
                  #{String(activeQrModalUser.id).toUpperCase()}
                </span>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
