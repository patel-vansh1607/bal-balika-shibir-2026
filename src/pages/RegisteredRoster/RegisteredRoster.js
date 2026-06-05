import React, { useState } from 'react';
import { 
  FaSearch, 
  FaPhoneAlt, 
  FaMapMarkerAlt,
  FaQrcode,
  FaTimes,
  FaUserFriends,
  FaFileExport,
  FaDownload,
  FaSpinner,
  FaGlobe // Added this icon
} from 'react-icons/fa';
import styles from './RegisteredRoster.module.css'; 

export default function RegisteredRoster({ attendees = [], dataFetching = false, regionScope = 'All' }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('All'); // Added this state
  const [selectedCenter, setSelectedCenter] = useState('All');
  const [selectedGender, setSelectedGender] = useState('All'); 
  
  const [imageErrors, setImageErrors] = useState({});
  const [activeQrModalUser, setActiveQrModalUser] = useState(null);

  // Derive unique lists dynamically
  const regionsList = ['All', ...new Set(attendees.map(a => a.region).filter(Boolean))];
  
  // Centers are filtered by the selected region
  const centersList = ['All', ...new Set(
    attendees
      .filter(a => selectedRegion === 'All' || a.region === selectedRegion)
      .map(a => a.center)
      .filter(Boolean)
  )];

  // Apply all filters
  const filteredAttendees = attendees.filter(attendee => {
    const nameSafe = attendee.name ? attendee.name.toLowerCase() : '';
    const contactSafe = attendee.parent_contact || attendee.parentContact || '';
    const customIdSafe = attendee.member_id || attendee.memberId || '';
    
    const matchesSearch = 
      nameSafe.includes(searchTerm.toLowerCase()) || 
      String(contactSafe).includes(searchTerm) ||
      String(customIdSafe).toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesRegion = selectedRegion === 'All' || attendee.region === selectedRegion;
    const matchesCenter = selectedCenter === 'All' || attendee.center === selectedCenter;
    const matchesGender = selectedGender === 'All' || attendee.gender === selectedGender;
    
    return matchesSearch && matchesRegion && matchesCenter && matchesGender;
  });

  const exportToCSV = () => {
    if (filteredAttendees.length === 0) {
      alert("No matched dataset found to extract.");
      return;
    }

    const headers = ["Member ID", "Full Name", "Mandal", "Age", "Region", "Center Branch", "Parent Contact", "Photo Link"];
    const csvRows = [
      headers.join(','),
      ...filteredAttendees.map(row => {
        const finalId = row.member_id || row.memberId || row.id;
        const finalContact = row.parent_contact || row.parentContact || '';
        return [
          `"${finalId}"`, 
          `"${row.name.replace(/"/g, '""')}"`,
          `"${row.gender || 'Balak'}"`,
          `"${row.age}"`,
          `"${row.region || ''}"`,
          `"${row.center}"`,
          `"${finalContact}"`,
          `"${row.photo_url || row.photoUrl || ''}"`
        ].join(',');
      })
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", encodedUri);
    // Updated dynamic filename
    downloadAnchor.setAttribute("download", `Roster_${selectedRegion}_${selectedCenter}_${selectedGender}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
  };

  const downloadQRImg = async (memberId, userName) => {
    try {
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(memberId)}&color=8a151b`;
      const response = await fetch(qrApiUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Pass_${memberId}_${userName.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      alert("Failed to initiate QR asset media fetch download.");
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

  const getGenderTagClass = (genderCategory) => {
    switch(genderCategory) {
      case 'Balak': return styles.tagBalak;
      case 'Balika': return styles.tagBalika;
      case 'Shishu': return styles.tagShishu;
      case 'Shishika': return styles.tagShishika;
      default: return styles.tagBalak;
    }
  };

  return (
    <div className={styles.rosterContainer}>
      <section className={styles.statsGrid}>
        <div className={styles.statCard}><div className={styles.statLabel}>Total Registered</div><p className={styles.statValue}>{filteredAttendees.length}</p></div>
        <div className={styles.statCard}><div className={styles.statLabel} style={{ color: '#2b6cb0' }}>Balak</div><p className={styles.statValue}>{filteredAttendees.filter(a => a.gender === 'Balak').length}</p></div>
        <div className={styles.statCard}><div className={styles.statLabel} style={{ color: '#c53030' }}>Balika</div><p className={styles.statValue}>{filteredAttendees.filter(a => a.gender === 'Balika').length}</p></div>
        <div className={styles.statCard}><div className={styles.statLabel} style={{ color: '#319795' }}>Shishu</div><p className={styles.statValue}>{filteredAttendees.filter(a => a.gender === 'Shishu').length}</p></div>
        <div className={styles.statCard}><div className={styles.statLabel} style={{ color: '#b7791f' }}>Shishika</div><p className={styles.statValue}>{filteredAttendees.filter(a => a.gender === 'Shishika').length}</p></div>
      </section>

      <div className={styles.contentCard} style={{ marginBottom: '24px', padding: '20px' }}>
        <div className={styles.toolbarRow}>
          <div className={styles.searchWrapper}>
            <input type="text" placeholder="Search by name, ID or contacts..." className={styles.inputField} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <FaSearch className={styles.searchIcon} />
          </div>

          <div className={styles.filterGroup}>
            {/* Added Region Selector */}
            <div className={styles.filterSelectContainer}>
              <FaGlobe style={{ color: 'var(--accent-primary)' }} />
              <select value={selectedRegion} onChange={(e) => { setSelectedRegion(e.target.value); setSelectedCenter('All'); }} className={styles.selectDropdown}>
                {regionsList.map(r => <option key={r} value={r}>{r === 'All' ? 'All Regions' : r}</option>)}
              </select>
            </div>
            <div className={styles.filterSelectContainer}>
              <FaMapMarkerAlt style={{ color: 'var(--accent-primary)' }} />
              <select value={selectedCenter} onChange={(e) => setSelectedCenter(e.target.value)} className={styles.selectDropdown}>
                {centersList.map(center => <option key={center} value={center}>{center === 'All' ? 'All Center Branches' : center}</option>)}
              </select>
            </div>
            <div className={styles.filterSelectContainer}>
              <FaUserFriends style={{ color: 'var(--accent-primary)' }} />
              <select value={selectedGender} onChange={(e) => setSelectedGender(e.target.value)} className={styles.selectDropdown}>
                <option value="All">All Mandals</option>
                <option value="Balak">Balak</option>
                <option value="Balika">Balika</option>
                <option value="Shishu">Shishu</option>
                <option value="Shishika">Shishika</option>
              </select>
            </div>
            <button onClick={exportToCSV} className={styles.exportBtn}><FaFileExport /> Export CSV</button>
          </div>
        </div>
      </div>

      <div className={styles.contentCard}>
        {dataFetching ? (
          <div className={styles.tableMessageBlock}><FaSpinner className={`${styles.spin} ${styles.loaderSpinner}`} /><p>Updating regional partition data view...</p></div>
        ) : filteredAttendees.length === 0 ? (
          <div className={styles.tableMessageBlock}><p>No attendees found.</p></div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.dataTable}>
              <thead>
                <tr><th>Picture</th><th>Member ID</th><th>Full Name</th><th>Mandal</th><th>Age</th><th>Center</th><th>Parent Contact</th><th style={{ textAlign: 'center' }}>Identity Pass</th></tr>
              </thead>
              <tbody>
                {filteredAttendees.map((attendee) => {
                  const resolvedAvatarUrl = getAvatarUrl(attendee.photo_url || attendee.photoUrl);
                  const hasImageError = imageErrors[attendee.id];
                  const systemIdCode = attendee.member_id || attendee.memberId || `MTRC-${attendee.id}`;
                  const parentContactDisplay = attendee.parent_contact || attendee.parentContact;
                  return (
                    <tr key={attendee.id}>
                      <td><div className={styles.avatarWrapper}>{resolvedAvatarUrl && !hasImageError ? <img src={resolvedAvatarUrl} className={styles.avatarImage} onError={() => handleImageError(attendee.id)} /> : <div className={styles.avatarFallback}>{getInitials(attendee.name)}</div>}</div></td>
                      <td className={styles.monospaceText} style={{ fontWeight: '700', color: 'var(--accent-primary)' }}>{systemIdCode}</td>
                      <td className={styles.boldText}>{attendee.name}</td>
                      <td><span className={`${styles.badgeGenderTag} ${getGenderTagClass(attendee.gender)}`}>{attendee.gender || 'Balak'}</span></td>
                      <td>{attendee.age}</td>
                      <td><span className={styles.inlineIconFlex}><FaMapMarkerAlt className={styles.mutedIcon} /> {attendee.center}</span></td>
                      <td className={styles.monospaceText}>{parentContactDisplay ? <span className={styles.inlineIconFlex}><FaPhoneAlt className={styles.mutedIcon} /> {parentContactDisplay}</span> : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>N/A</span>}</td>
                      <td style={{ textAlign: 'center' }}><button onClick={() => setActiveQrModalUser(attendee)} className={styles.viewPassBtn}><FaQrcode style={{ fontSize: '13px' }} /> View Pass</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {activeQrModalUser && (
        <div className={styles.modalOverlay} onClick={() => setActiveQrModalUser(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalCloseBtn} onClick={() => setActiveQrModalUser(null)}><FaTimes /></button>
            <h3 className={styles.modalTitle}>QR Code</h3>
            <div className={styles.qrContainer}>
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(activeQrModalUser.member_id || activeQrModalUser.memberId || activeQrModalUser.id)}&color=8a151b`} className={styles.qrImage} />
            </div>
            <button onClick={() => downloadQRImg(activeQrModalUser.member_id || activeQrModalUser.memberId || activeQrModalUser.id, activeQrModalUser.name)} className={styles.modalDownloadBtn}><FaDownload /> Download QR Code</button>
          </div>
        </div>
      )}
    </div>
  );
}