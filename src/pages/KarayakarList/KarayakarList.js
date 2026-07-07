import React, { useState, useEffect } from 'react';
import { FaUser, FaSpinner, FaTrash, FaUsers, FaFileExport, FaCheck, FaXmark } from 'react-icons/fa6';
import { karayakars as karayakarsApi } from '../../apiClient';
import styles from './KarayakarList.module.css';

const REGIONS = ['All', 'Kenya', 'Tanzania', 'Uganda', 'Zambia', 'Malawi', 'Botswana', 'South Africa'];

export default function KarayakarList({ defaultRegion = '' }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState(defaultRegion || 'All');
  const [deleting, setDeleting] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const userRole = localStorage.getItem('user_role');
  const canDelete = ['master_admin', 'super_admin'].includes(userRole);

  const handleDeleteClick = (id) => {
    setConfirmDeleteId(id);
  };

  const handleCancelDelete = () => {
    setConfirmDeleteId(null);
  };

  const handleConfirmDelete = async (id) => {
    setDeleting(id);
    try {
      await karayakarsApi.remove(id);
      setList(prev => prev.filter(k => k.id !== id));
      setConfirmDeleteId(null);
    } catch (err) {
      console.error('Delete operation failed:', err);
      alert(err.message || 'Failed to remove karyakar.');
    } finally {
      setDeleting(null);
    }
  };

  const handleExportCSV = () => {
    if (list.length === 0) {
      alert('No data available to export.');
      return;
    }

    const headers = ['ID', 'Full Name', 'Region', 'Center', 'Seva Designations', 'T-Shirt Size', 'Profile Photo URL'];
    
    const rows = list.map(k => [
      k.id,
      `"${k.full_name?.replace(/"/g, '""') || ''}"`,
      `"${k.region?.replace(/"/g, '""') || ''}"`,
      `"${k.center?.replace(/"/g, '""') || ''}"`,
      `"${k.seva_designation?.replace(/"/g, '""') || 'None'}"`,
      `"${k.tshirt_size || 'N/A'}"`,
      `"${k.photo_url || 'No Photo'}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.setAttribute('href', url);
    link.setAttribute('download', `Karyakar_Directory_${region.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    setLoading(true);
    karayakarsApi
      .list(region && region !== 'All' ? { region } : {})
      .then(res => setList(res.data || []))
      .catch(err => console.error('Fetch error:', err))
      .finally(() => setLoading(false));
  }, [region]);

  return (
    <div className={styles.rosterContainer}>
      <div className={styles.contentCard}>
        <div className={styles.toolbarRow}>
          <div className={styles.titleArea}>
            <h2>
              <span className={styles.iconFallbackWrapper}>
                <FaUsers className={styles.archiveHeaderIcon} />
              </span>
              Karyakar Directory
            </h2>
            <p className={styles.viewSubtitle}>Manage registered karyakar profiles and roles</p>
          </div>
          
          <div className={styles.actionsWrapper}>
            <button 
              onClick={handleExportCSV} 
              className={styles.exportBtn}
              disabled={loading || list.length === 0}
            >
              <FaFileExport /> Export Profiles
            </button>

            {!defaultRegion && (
              <div className={styles.selectWrapper}>
                <select value={region} onChange={e => setRegion(e.target.value)} className={styles.inputField}>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Profile</th>
                <th>Full Name</th>
                <th>Region</th>
                <th>Center</th>
                <th>Seva Designation</th>
                <th style={{ width: '120px' }}>T-Shirt</th>
                {canDelete && <th style={{ textAlign: 'center', width: '140px' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={canDelete ? 7 : 6} className={styles.emptyTablePlaceholder}>
                    <FaSpinner className={styles.spin} /> Loading records...
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={canDelete ? 7 : 6} className={styles.emptyTablePlaceholder}>No records found.</td>
                </tr>
              ) : list.map(k => (
                <tr key={k.id} className={confirmDeleteId === k.id ? styles.rowWarningHighlight : ''}>
                  <td>
                    <div className={styles.avatarFrame}>
                      {k.photo_url ? (
                        <img src={k.photo_url} alt="" className={styles.tableImage} />
                      ) : (
                        <FaUser className={styles.avatarPlaceholder} />
                      )}
                    </div>
                  </td>
                  <td className={styles.boldText}>{k.full_name}</td>
                  <td><span className={styles.regionTag}>{k.region}</span></td>
                  <td><span className={styles.centerText}>{k.center || '—'}</span></td>
                  <td>
                    <div className={styles.sevaBadgeContainer}>
                      {k.seva_designation ? (
                        k.seva_designation.split(', ').map((role, idx) => (
                          <span key={idx} className={styles.sevaTableBadge}>{role}</span>
                        ))
                      ) : (
                        <span className={styles.noSevaText}>None assigned</span>
                      )}
                    </div>
                  </td>
                  <td>
                    {k.tshirt_size ? (
                      <span className={styles.tshirtTag}>
                        <code>{k.tshirt_size}</code>
                      </span>
                    ) : (
                      <span className={styles.textHyphen}>—</span>
                    )}
                  </td>
                  {canDelete && (
                    <td style={{ textAlign: 'center' }}>
                      <div className={styles.actionsCellWrapper}>
                        {confirmDeleteId === k.id ? (
                          <div className={styles.inlineConfirmGroup}>
                            <button 
                              onClick={() => handleConfirmDelete(k.id)} 
                              disabled={deleting === k.id}
                              className={styles.confirmActionBtn}
                              title="Confirm Removal"
                            >
                              {deleting === k.id ? <FaSpinner className={styles.spin} /> : <FaCheck />}
                            </button>
                            <button 
                              onClick={handleCancelDelete} 
                              disabled={deleting === k.id}
                              className={styles.cancelActionBtn}
                              title="Cancel"
                            >
                              <FaXmark />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleDeleteClick(k.id)} 
                            className={styles.deleteActionBtn}
                            title="Remove Karyakar"
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
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