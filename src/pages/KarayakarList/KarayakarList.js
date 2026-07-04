import React, { useState, useEffect } from 'react';
import { FaUser, FaSpinner, FaTrash, FaUsers, FaFileExport, FaFileImage } from 'react-icons/fa';
import { karayakars as karayakarsApi } from '../../apiClient';
import JSZip from 'jszip';
import styles from '../ArchiveManager/ArchiveManager.module.css';

const REGIONS = ['All', 'Kenya', 'Tanzania', 'Uganda', 'Zambia', 'Malawi', 'Botswana', 'South Africa'];

export default function KarayakarList({ defaultRegion = '' }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState(defaultRegion || 'All');
  const [deleting, setDeleting] = useState(null);
  const [exportingImages, setExportingImages] = useState(false);

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

  // Safe alternative extraction strategy that uses base64 data streams
  const downloadExternalImageAsBlob = async (imageUrl) => {
    try {
      // Direct asset fetch targeting the source host
      const res = await fetch(imageUrl);
      if (res.ok) {
        return await res.blob();
      }
    } catch (e) {
      console.log('Direct image stream fetch blocked by header rules, trying fallback extraction method...');
    }

    // Secondary fallback pipeline: Extract directly from existing images if available
    return new Promise((resolve, reject) => {
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
      xhr.open('GET', imageUrl);
      xhr.responseType = 'blob';
      xhr.send();
    });
  };

  const handleDownloadPhotosZip = async () => {
    const targets = list.filter(k => k.photo_url && k.photo_url.trim() !== '');
    if (targets.length === 0) {
      alert('No profile photos found in the current view to download.');
      return;
    }

    setExportingImages(true);
    const zip = new JSZip();
    const folderName = `Karyakar_Photos_${region.replace(/\s+/g, '_')}`;
    const imgFolder = zip.folder(folderName);
    
    let processedCount = 0;

    try {
      const downloadPromises = targets.map(async (karyakar) => {
        try {
          const rawPayload = await downloadExternalImageAsBlob(karyakar.photo_url);
          let base64Data = '';
          
          if (rawPayload instanceof Blob) {
            imgFolder.file(`${karyakar.full_name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${karyakar.id}.png`, rawPayload);
            processedCount++;
          } else if (typeof rawPayload === 'string') {
            if (rawPayload.includes('base64,')) {
              base64Data = rawPayload.split('base64,')[1];
            } else {
              base64Data = btoa(rawPayload);
            }
            imgFolder.file(`${karyakar.full_name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${karyakar.id}.png`, base64Data, { base64: true });
            processedCount++;
          }
        } catch (error) {
          console.error(`Skipping file stream mapping processes for ${karyakar.full_name}:`, error);
        }
      });

      await Promise.all(downloadPromises);

      if (processedCount === 0) {
        alert('Could not compile asset downloads due to infrastructure security limitations.');
        return;
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${folderName}.zip`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('ZIP package compression failure:', err);
      alert('Failed to package image files.');
    } finally {
      setExportingImages(false);
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
              <FaFileExport /> Export CSV
            </button>

            <button 
              onClick={handleDownloadPhotosZip} 
              className={styles.exportImagesBtn}
              disabled={loading || exportingImages || list.length === 0}
            >
              {exportingImages ? <FaSpinner className={styles.spin} /> : <FaFileImage />} 
              {exportingImages ? 'Packaging ZIP...' : 'Download Photos (ZIP)'}
            </button>

            {!defaultRegion && (
              <select value={region} onChange={e => setRegion(e.target.value)} className={styles.inputField} style={{ width: 'auto' }}>
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
          </div>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Profile</th>
                <th>Full Name</th>
                <th>Region</th>
                <th>T-Shirt</th>
                {canDelete && <th style={{ textAlign: 'center' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={canDelete ? 5 : 4} className={styles.emptyTablePlaceholder}>
                    <FaSpinner className={styles.spin} /> Loading records...
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={canDelete ? 5 : 4} className={styles.emptyTablePlaceholder}>No records found.</td>
                </tr>
              ) : list.map(k => (
                <tr key={k.id}>
                  <td>
                    {k.photo_url ? <img src={k.photo_url} alt="" style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover' }} /> : <FaUser />}
                  </td>
                  <td className={styles.boldText}>{k.full_name}</td>
                  <td><span className={styles.regionTag}>{k.region}</span></td>
                  <td className={styles.monospaceText}><code>{k.tshirt_size || 'N/A'}</code></td>
                  {canDelete && (
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        onClick={() => handleDelete(k.id)} 
                        disabled={deleting === k.id}
                        className={styles.viewPassBtn}
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