import React, { useState } from 'react';
import { FaUndo, FaSearch, FaArchive } from 'react-icons/fa';
import styles from '../Dashboard/Dashboard.module.css'; // Importing your main stylesheet

export default function ArchiveManager({ attendees, toggleArchiveStatus, regionScope, userRole }) {
  const [searchTerm, setSearchTerm] = useState('');

  const archivedRecords = attendees.filter(a => 
    a.is_archived === true && 
    (a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     (a.member_id && a.member_id.toString().includes(searchTerm)))
  );

  return (
    <div className={styles.rosterContainer}>
      <div className={styles.contentCard}>
        
        {/* Toolbar Header */}
        <div className={styles.toolbarRow} style={{ padding: '20px' }}>
          <h2><FaArchive /> System Archive</h2>
          <div className={styles.searchWrapper}>
            <FaSearch className={styles.searchIcon} />
            <input 
              className={styles.inputField}
              placeholder="Search by name or ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table matches Roster class structure */}
        <div className={styles.tableContainer}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Member ID</th>
                <th>Full Name</th>
                <th>Region</th>
                {(userRole === 'master_admin' || userRole === 'super_admin') && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {archivedRecords.map(a => (
                <tr key={a.id}>
                  <td className={styles.monospaceText}>{a.member_id}</td>
                  <td className={styles.boldText}>{a.name}</td>
                  <td>{a.region}</td>
                  {(userRole === 'master_admin' || userRole === 'super_admin') && (
                    <td>
                      <button 
                        onClick={() => toggleArchiveStatus(a, false)} 
                        className={styles.viewPassBtn}
                      >
                        <FaUndo /> Restore
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}