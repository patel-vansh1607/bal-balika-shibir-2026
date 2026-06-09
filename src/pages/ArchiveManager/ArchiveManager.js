import React, { useState } from 'react';
import { FaUndo, FaSearch, FaArchive } from 'react-icons/fa';
import styles from './ArchiveManager.module.css';

export default function ArchiveManager({ attendees, toggleArchiveStatus, regionScope }) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter by archived status AND search term
  const archivedRecords = attendees.filter(a => 
    a.is_archived === true && 
    (a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     (a.member_id && a.member_id.toString().includes(searchTerm)))
  );

  const handleRestore = (attendee) => {
    if (window.confirm(`Restore ${attendee.name} to the active roster?`)) {
      toggleArchiveStatus(attendee, false);
    }
  };

  return (
<div className={styles.archiveWrapper}>
  <div className={styles.headerSection}>
    <h2><FaArchive /> System Archive</h2>
    <div className={styles.searchBox}>
       <FaSearch /> 
       <input placeholder="Search..." onChange={(e) => setSearchTerm(e.target.value)} />
    </div>
  </div>
  
  <p>Region: <strong>{regionScope}</strong></p>

  <table className={styles.archiveTable}>
    <thead>
      <tr>
        <th>Member ID</th>
        <th>Name</th>
        <th>Region</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {archivedRecords.map(a => (
        <tr key={a.id}>
          <td>{a.member_id}</td>
          <td>{a.name}</td>
          <td>{a.region}</td>
          <td>
            <button onClick={() => handleRestore(a)} className={styles.restoreBtn}>
              <FaUndo /> Restore
            </button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>  );
}