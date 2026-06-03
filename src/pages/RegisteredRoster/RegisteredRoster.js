import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  FaSearch, 
  FaSync, 
  FaPhoneAlt, 
  FaMapMarkerAlt,
  FaQrcode,
  FaTimes,
  FaUserFriends,
  FaFileExport,
  FaDownload
} from 'react-icons/fa';
import styles from './RegisteredRoster.module.css'; 

export default function RegisteredRoster() {
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCenter, setSelectedCenter] = useState('All');
  const [selectedGender, setSelectedGender] = useState('All'); // 'All' | 'Balak' | 'Balika'
  
  // Track image load errors by individual attendee ID
  const [imageErrors, setImageErrors] = useState({});
  
  // Modal tracking state for the active targeted attendee pass
  const [activeQrModalUser, setActiveQrModalUser] = useState(null);

  // Fetch live rows from Supabase master database
  const fetchAttendees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendees')
        .select('*')
        .order('name', { ascending: true }); // Ordered alphabetically for master directory tracking

      if (error) throw error;
      
      console.log('--- SUPABASE MASTER ROSTER FETCH SUCCESS ---');
      setAttendees(data || []);
      setImageErrors({});
    } catch (error) {
      console.error('Error loading roster database:', error.message);
      alert('Could not synchronize master roster data stream.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendees();
  }, []);

  // Extract unique centers dynamically for pristine dropdown selection filtering
  const centersList = ['All', ...new Set(attendees.map(a => a.center).filter(Boolean))];

  // Primary filtering query matching logic loop
  const filteredAttendees = attendees.filter(attendee => {
    const nameSafe = attendee.name ? attendee.name.toLowerCase() : '';
    const contactSafe = attendee.parent_contact ? attendee.parent_contact : '';
    
    const matchesSearch = nameSafe.includes(searchTerm.toLowerCase()) || contactSafe.includes(searchTerm);
    const matchesCenter = selectedCenter === 'All' || attendee.center === selectedCenter;
    const matchesGender = selectedGender === 'All' || attendee.gender === selectedGender;
    
    return matchesSearch && matchesCenter && matchesGender;
  });

  // Client side engine to generate and push CSV data arrays on request
  const exportToCSV = () => {
    if (filteredAttendees.length === 0) {
      alert("No matched dataset found to extract.");
      return;
    }

    const headers = ["ID", "Full Name", "Classification", "Age", "Center Branch", "Parent Contact", "Photo Link"];
    const csvRows = [
      headers.join(','), // Setup top row label heads
      ...filteredAttendees.map(row => [
        `"${row.id}"`,
        `"${row.name.replace(/"/g, '""')}"`,
        `"${row.gender || 'Balak'}"`,
        `"${row.age}"`,
        `"${row.center}"`,
        `"${row.parent_contact}"`,
        `"${row.photo_url || ''}"`
      ].join(','))
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", encodedUri);
    downloadAnchor.setAttribute("download", `Master_Roster_Directory_${selectedGender}_${selectedCenter}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
  };

  // Trigger download of the active user's QR pass from external API stream
  const downloadQRImg = async (userId, userName) => {
    try {
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(userId)}&color=8a151b`;
      const response = await fetch(qrApiUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `QR_Pass_${userName.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      alert("Failed to initiate QR asset media fetch downpour.");
    }
  };

  const getAvatarUrl = (photoPath) => {
    if (!photoPath) return null;
    if (photoPath.startsWith("http://") || photoPath.startsWith("https://")) {
      return `${photoPath.split('?')[0]}?t=${new Date().getTime()}`;
    }
    let cleanFileName = photoPath.includes('/') ? photoPath.split('/').pop() : photoPath;
    cleanFileName = cleanFileName.replace('attendee-profiles/', '').replace('public/', '');
    const projectUrl = "https://bdqscvezobwshuyxqrvq.supabase.co/storage/v1/object/public/attendee-profiles";
    return `${projectUrl}/${cleanFileName}?t=${new Date().getTime()}`;
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name.trim().charAt(0).toUpperCase();
  };

  const handleImageError = (id) => {
    setImageErrors(prev => ({ ...prev, [id]: true }));
  };

  return (
    <div className={styles.rosterContainer}>
      
      {/* Top Banner Context Box for Master Directory view configurations */}
      <section className={styles.statsGrid} style={{ gridTemplateColumns: '1fr' }}>
        <div className={styles.statCard} style={{ textAlign: 'left', padding: '20px 24px' }}>
          <div className={styles.statLabel} style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Master Storage Registry System
          </div>
          <p className={styles.statValue} style={{ fontSize: '28px', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
            {filteredAttendees.length} <span style={{ fontSize: '15px', fontWeight: '500', color: '#64748b' }}>Active Filtered Rows Matching</span>
          </p>
        </div>
      </section>

      {/* Toolbox Manipulation Action Bar Grid Area */}
      <div className={styles.contentCard} style={{ marginBottom: '20px', padding: '16px' }}>
        <div className={styles.toolbarRow}>
          
          <div className={styles.searchWrapper}>
            <input
              type="text"
              placeholder="Filter list by name or phone numbers..."
              className={styles.inputField}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <FaSearch className={styles.searchIcon} />
          </div>

          <div className={styles.filterGroup}>
            {/* Center Selector */}
            <div className={styles.filterSelectContainer}>
              <FaMapMarkerAlt style={{ color: '#8a151b' }} />
              <select 
                value={selectedCenter} 
                onChange={(e) => setSelectedCenter(e.target.value)}
                className={styles.selectDropdown}
              >
                {centersList.map(center => (
                  <option key={center} value={center}>
                    {center === 'All' ? 'All Center Branches' : center}
                  </option>
                ))}
              </select>
            </div>

            {/* Balak / Balika Direct Separation Switch Dropdown */}
            <div className={styles.filterSelectContainer}>
              <FaUserFriends style={{ color: '#8a151b' }} />
              <select 
                value={selectedGender} 
                onChange={(e) => setSelectedGender(e.target.value)}
                className={styles.selectDropdown}
              >
                <option value="All">All Classifications</option>
                <option value="Balak">Balak (Boys Roster)</option>
                <option value="Balika">Balika (Girls Roster)</option>
              </select>
            </div>

            <button onClick={exportToCSV} className={styles.primaryActionBtn} style={{ backgroundColor: '#107c41', borderColor: '#107c41', color: '#fff' }}>
              <FaFileExport /> Export Spreadsheet
            </button>

            <button onClick={fetchAttendees} className={styles.primaryActionBtn}>
              <FaSync className={loading ? styles.spin : ''} />
            </button>
          </div>

        </div>
      </div>

      {/* Main Table Grid Row Interface View */}
      <div className={styles.contentCard}>
        {loading ? (
          <div className={styles.tableMessageBlock}>
            <p>Calling operational table buffers...</p>
          </div>
        ) : filteredAttendees.length === 0 ? (
          <div className={styles.tableMessageBlock}>
            <p>No matching directory definitions structured in this database layer selection view.</p>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Identity Avatar</th>
                  <th>Full Name</th>
                  <th>Classification Category</th>
                  <th>Age Allocation</th>
                  <th>Center Branch</th>
                  <th>Parent WhatsApp Destination</th>
                  <th style={{ textAlign: 'center' }}>Gateway Token Pass</th>
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
                              alt="" 
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
                      <td>
                        <span className={`${styles.badgeGenderTag} ${attendee.gender === 'Balak' ? styles.tagBalak : styles.tagBalika}`}>
                          {attendee.gender || 'Balak'}
                        </span>
                      </td>
                      <td>{attendee.age} Y/O</td>
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
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => setActiveQrModalUser(attendee)}
                          className={styles.viewPassBtn}
                        >
                          <FaQrcode style={{ fontSize: '13px' }} /> View Identity Card
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

            <h3 className={styles.modalTitle}>Attendee Entry Pass</h3>
            <p className={styles.modalSubtitle}>Master Directory Gateway Record</p>

            <div className={styles.qrContainer}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(activeQrModalUser.id)}&color=8a151b`} 
                alt="Verification Token Map"
                className={styles.qrImage}
              />
            </div>

            <div className={styles.modalInfoBox}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
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
                  <div style={{ fontSize: '12px', color: '#6e655f', fontWeight: '500' }}>
                    Category Designation: <strong style={{ color: activeQrModalUser.gender === 'Balika' ? '#c53030' : '#2b6cb0' }}>{activeQrModalUser.gender || 'Balak'}</strong>
                  </div>
                </div>
              </div>
              
              <div className={styles.modalDataRow} style={{ borderTop: '1px dashed #e6dfda', paddingTop: '8px' }}>
                <span>Center Region:</span>
                <span style={{ color: '#2d2926', fontWeight: '600' }}>{activeQrModalUser.center}</span>
              </div>
              <div className={styles.modalDataRow}>
                <span>System Tracking ID:</span>
                <span style={{ fontFamily: 'monospace', color: '#8a151b', fontWeight: '600' }}>
                  #{String(activeQrModalUser.id).toUpperCase()}
                </span>
              </div>
            </div>

            {/* Direct targeted QR image deployment handle download button */}
            <button 
              onClick={() => downloadQRImg(activeQrModalUser.id, activeQrModalUser.name)}
              className={styles.primaryActionBtn}
              style={{ width: '100%', marginTop: '12px', justifyContent: 'center', gap: '8px' }}
            >
              <FaDownload /> Download Ticket QR Code
            </button>

          </div>
        </div>
      )}

    </div>
  );
}