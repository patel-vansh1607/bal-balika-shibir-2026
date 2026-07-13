import React, { useState, useMemo } from 'react';
import { FaUserCheck, FaUserMinus, FaClock, FaSearch, FaGlobeAfrica, FaUsers } from 'react-icons/fa';
import styles from './TanzaniaSelectionRoster.module.css';

export default function TanzaniaSelectionRoster({ attendees = [], onUpdateStatus }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Compute live breakdown counts strictly for the Tanzania selection pool
  const stats = useMemo(() => {
    return attendees.reduce((acc, current) => {
      if (current.is_selected === 1) acc.selected += 1;
      else if (current.is_selected === 2) acc.notSelected += 1;
      else acc.pending += 1;
      return acc;
    }, { selected: 0, notSelected: 0, pending: 0, total: attendees.length });
  }, [attendees]);

  // Filter list by search query and chosen tab status
  const filteredAttendees = useMemo(() => {
    return attendees.filter(user => {
      // Check alternative common property paths if attendee.email is returning empty
      const emailText = (user.email || user.email_address || user.parent_email || '').toLowerCase();
      const nameText = (user.name || '').toLowerCase();
      const passportText = (user.passport_number || user.passport || '').toLowerCase();
      const searchLower = searchTerm.toLowerCase();

      const matchesSearch = 
        nameText.includes(searchLower) ||
        emailText.includes(searchLower) ||
        passportText.includes(searchLower);

      let matchesStatus = true;
      if (statusFilter === 'selected') matchesStatus = user.is_selected === 1;
      else if (statusFilter === 'not_selected') matchesStatus = user.is_selected === 2;
      else if (statusFilter === 'pending') matchesStatus = user.is_selected === 0 || user.is_selected === null || user.is_selected === undefined;

      return matchesSearch && matchesStatus;
    });
  }, [attendees, searchTerm, statusFilter]);

  return (
    <div className={styles.container}>
      {/* Header Banner */}
      <div className={styles.header}>
        <div className={styles.headerTitleBlock}>
          <FaGlobeAfrica className={styles.headerIcon} />
          <div>
            <h2>Tanzania Selection Roster</h2>
            <p></p>
          </div>
        </div>
      </div>

      {/* Metrics Summary Grid Cards */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.totalCard}`} onClick={() => setStatusFilter('all')}>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Tanzania Pool</span>
            <span className={styles.statNumber}>{stats.total}</span>
          </div>
          <FaUsers className={styles.cardContextIcon} />
        </div>

        <div className={`${styles.statCard} ${styles.selectedCard}`} onClick={() => setStatusFilter('selected')}>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Selected</span>
            <span className={styles.statNumber}>{stats.selected}</span>
          </div>
          <FaUserCheck className={styles.cardContextIcon} />
        </div>

        <div className={`${styles.statCard} ${styles.rejectedCard}`} onClick={() => setStatusFilter('not_selected')}>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Not Selected</span>
            <span className={styles.statNumber}>{stats.notSelected}</span>
          </div>
          <FaUserMinus className={styles.cardContextIcon} />
        </div>

        <div className={`${styles.statCard} ${styles.pendingCard}`} onClick={() => setStatusFilter('pending')}>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Pending</span>
            <span className={styles.statNumber}>{stats.pending}</span>
          </div>
          <FaClock className={styles.cardContextIcon} />
        </div>
      </div>

      {/* Controls & Navigation Search Row */}
      <div className={styles.controlBar}>
        <div className={styles.searchWrapper}>
          <FaSearch className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Search name, email, credentials..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterTabs}>
          <button className={`${styles.tab} ${statusFilter === 'all' ? styles.activeTab : ''}`} onClick={() => setStatusFilter('all')}>All ({attendees.length})</button>
          <button className={`${styles.tab} ${statusFilter === 'selected' ? styles.activeTab : ''}`} onClick={() => setStatusFilter('selected')}>Selected ({stats.selected})</button>
          <button className={`${styles.tab} ${statusFilter === 'not_selected' ? styles.activeTab : ''}`} onClick={() => setStatusFilter('not_selected')}>Not Selected ({stats.notSelected})</button>
          <button className={`${styles.tab} ${statusFilter === 'pending' ? styles.activeTab : ''}`} onClick={() => setStatusFilter('pending')}>Pending ({stats.pending})</button>
        </div>
      </div>

      {/* Main Roster List Layout Container */}
      <div className={styles.listTable}>
        <div className={styles.tableHeader}>
          <div style={{ flex: 2 }}>Attendee Information</div>
          <div style={{ flex: 1.5 }}>Email Address</div>
          <div style={{ flex: 1, textAlign: 'center' }}>Current Status</div>
          {onUpdateStatus && <div style={{ flex: 1.2, textAlign: 'right' }}>Quick Actions</div>}
        </div>

        {filteredAttendees.length === 0 ? (
          <div className={styles.emptyState}>No records match the current view criteria.</div>
        ) : (
          filteredAttendees.map((attendee) => {
            let statusBadgeClass = styles.badgePending;
            let statusLabelText = 'Pending Audit';
            
            if (attendee.is_selected === 1) {
              statusBadgeClass = styles.badgeSelected;
              statusLabelText = 'Selected';
            } else if (attendee.is_selected === 2) {
              statusBadgeClass = styles.badgeRejected;
              statusLabelText = 'Not Selected';
            }

            // Check alternative common property paths if attendee.email is returning empty
            const loadedEmail = attendee.email || attendee.email_address || attendee.parent_email || "—";

            return (
              <div key={attendee.id} className={styles.tableRow}>
                <div style={{ flex: 2, fontWeight: 600, color: '#1e293b' }}>
                  {attendee.name || 'Anonymous User'}
                </div>
                <div style={{ flex: 1.5, color: '#64748b', fontSize: '13px' }}>
                  {loadedEmail}
                </div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                  <span className={`${styles.statusBadge} ${statusBadgeClass}`}>
                    {statusLabelText}
                  </span>
                </div>
                {onUpdateStatus && (
                  <div style={{ flex: 1.2, display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                    {attendee.is_selected !== 1 && (
                      <button 
                        onClick={() => onUpdateStatus(attendee, 1)} 
                        className={`${styles.actionBtn} ${styles.btnSelect}`}
                        title="Mark Selected"
                      >
                        <FaUserCheck />
                      </button>
                    )}
                    {attendee.is_selected !== 2 && (
                      <button 
                        onClick={() => onUpdateStatus(attendee, 2)} 
                        className={`${styles.actionBtn} ${styles.btnReject}`}
                        title="Mark Not Selected"
                      >
                        <FaUserMinus />
                      </button>
                    )}
                    {attendee.is_selected !== 0 && attendee.is_selected !== null && attendee.is_selected !== undefined && (
                      <button 
                        onClick={() => onUpdateStatus(attendee, 0)} 
                        className={`${styles.actionBtn} ${styles.btnReset}`}
                        title="Reset to Pending"
                      >
                        <FaClock />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}