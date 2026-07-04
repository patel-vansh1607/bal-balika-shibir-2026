import React, { useState, useEffect } from 'react';
import { FaUser, FaSpinner, FaTrash, FaUsers, FaFileExport, FaDownload } from 'react-icons/fa';
import { karayakars as karayakarsApi } from '../../apiClient';
import styles from '../ArchiveManager/ArchiveManager.module.css';

const REGIONS = ['All', 'Kenya', 'Tanzania', 'Uganda', 'Zambia', 'Malawi', 'Botswana', 'South Africa'];

export default function KarayakarList({ defaultRegion = '' }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState(defaultRegion || 'All');
  const [deleting, setDeleting] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const userRole = localStorage.getItem('user_role');
  const canDelete = ['master_admin', 'super_admin'].includes(userRole);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this karyakar?')) return;
    
    setDeleting(id);
    try {
      await karayakarsApi.remove(id);
      setList(prev => prev.filter(k => k.id !== id));
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

    const headers = ['ID', 'Full Name', 'Region', 'T-Shirt Size', 'Profile Photo URL'];
    const rows = list.map(k => [
      k.id,
      `"${k.full_name?.replace(/"/g, '""') || ''}"`,
      `"${k.region?.replace(/"/g, '""') || ''}"`,
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

  const downloadSinglePhoto = async (karyakar) => {
    if (!karyakar.photo_url) return;
    setDownloadingId(karyakar.id);

    try {
      const base64Data = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () {
          const reader = new FileReader();
          reader.onloadend = function () {
            resolve(reader.result);
          };
          reader.readAsDataURL(xhr.response);
        };
        xhr.onerror = function (err) {
          reject(err);
        };
        xhr.open('GET', karyakar.photo_url);
        xhr.responseType = 'blob';
        xhr.send();
      });

      const safeName = karyakar.full_name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const link = document.createElement('a');
      link.href = base64Data;
      link.download = `${safeName}_${karyakar.id}.png`;
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Individual image streaming failed:', error);
      alert('Could not download this image directly due to browser cross-origin limits.');
    } finally {
      setDownloadingId(null);
    }
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
            <p className={styles.viewSubtitle}>Manage registered karyakar profiles</p>
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
              <select value={region} onChange={e => setRegion(e.target.value)} className={styles.inputField} style={{ width: 'auto' }}>
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
          </div>
        </div>

        <div className={styles.tableContainer} style={{ width: '100%', overflowX: 'auto' }}>
          <table className={styles.dataTable} style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '14px 16px', textAlign: 'left' }}>Profile</th>
                <th style={{ padding: '14px 16px', textAlign: 'left' }}>Full Name</th>
                <th style={{ padding: '14px 16px', textAlign: 'left' }}>Region</th>
                <th style={{ padding: '14px 16px', textAlign: 'left' }}>T-Shirt</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', width: '100px' }}>Download</th>
                {canDelete && <th style={{ padding: '14px 16px', textAlign: 'center', width: '100px' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={canDelete ? 6 : 5} className={styles.emptyTablePlaceholder} style={{ textAlign: 'center', padding: '40px' }}>
                    <FaSpinner className={styles.spin} /> Loading records...
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={canDelete ? 6 : 5} className={styles.emptyTablePlaceholder} style={{ textAlign: 'center', padding: '40px' }}>No records found.</td>
                </tr>
              ) : list.map(k => (
                <tr key={k.id}>
                  <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                    {k.photo_url ? (
                      <img src={k.photo_url} alt="" style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#f0f3f4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bdc3c7' }}><FaUser /></div>
                    )}
                  </td>
                  <td className={styles.boldText} style={{ padding: '14px 16px', verticalAlign: 'middle' }}>{k.full_name}</td>
                  <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}><span className={styles.regionTag}>{k.region}</span></td>
                  <td className={styles.monospaceText} style={{ padding: '14px 16px', verticalAlign: 'middle' }}><code>{k.tshirt_size || 'N/A'}</code></td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', verticalAlign: 'middle' }}>
                    {k.photo_url ? (
                      <button
                        onClick={() => downloadSinglePhoto(k)}
                        disabled={downloadingId === k.id}
                        className={styles.downloadPhotoBtn}
                        style={{ padding: '10px', fontSize: '1.05rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Download profile photo"
                      >
                        {downloadingId === k.id ? <FaSpinner className={styles.spin} /> : <FaDownload />}
                      </button>
                    ) : (
                      <span className={styles.noPhotoLabel}>None</span>
                    )}
                  </td>
                  {canDelete && (
                    <td style={{ padding: '14px 16px', textAlign: 'center', verticalAlign: 'middle' }}>
                      <button 
                        onClick={() => handleDelete(k.id)} 
                        disabled={deleting === k.id}
                        className={styles.viewPassBtn}
                        style={{ padding: '10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        {deleting === k.id ? <FaSpinner className={styles.spin} /> : <FaTrash />}
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