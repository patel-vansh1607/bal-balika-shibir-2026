import React, { useState } from 'react';
import { FaUndo, FaSearch, FaArchive, FaSpinner } from 'react-icons/fa';
import styles from './ArchiveManager.module.css';

export default function ArchiveManager({ attendees, toggleArchiveStatus, userRole }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const archivedRecords = attendees.filter(a => 
    a.is_archived === true && 
    (a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     (a.member_id && a.member_id.toString().includes(searchTerm)))
  );

  const handleRestore = async () => {
    setIsProcessing(true);
    await toggleArchiveStatus(confirmAction, false); // Pass to parent
    setIsProcessing(false);
    setConfirmAction(null);
  };

  return (
    <div className={styles.rosterContainer}>
      <div className={styles.contentCard}>
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
                  <td>
                    <button 
                      onClick={() => setConfirmAction(a)} 
                      className={styles.viewPassBtn}
                    >
                      <FaUndo /> Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className={styles.modalOverlay} onClick={() => !isProcessing && setConfirmAction(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Restoration</h3>
            <p>Restore <strong>{confirmAction.name}</strong> to the active roster?</p>
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'center' }}>
              <button 
                onClick={() => setConfirmAction(null)} 
                className={styles.cancelBtn}
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button 
                onClick={handleRestore} 
                className={styles.confirmBtn} 
                disabled={isProcessing}
                style={{ 
                  backgroundColor: 'green', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px' 
                }}
              >
                {isProcessing ? (
                  <>
                    <FaSpinner className={styles.spin} /> Restoring...
                  </>
                ) : 'Confirm Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}