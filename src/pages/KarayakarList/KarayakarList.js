import React, { useState, useEffect } from 'react';
import { FaUser, FaSpinner, FaTrash } from 'react-icons/fa';
import { karayakars as karayakarsApi } from '../../apiClient';
import styles from './KarayakarList.module.css';

const REGIONS = ['All', 'Kenya', 'Tanzania', 'Uganda', 'Zambia', 'Malawi', 'Botswana', 'South Africa'];

export default function KarayakarList({ defaultRegion = '' }) {
  const [list, setList]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [region, setRegion]     = useState(defaultRegion || 'All');
  const [deleting, setDeleting] = useState(null);

  const userRole = localStorage.getItem('user_role');
  const canDelete = ['master_admin', 'super_admin'].includes(userRole);

  useEffect(() => {
    setLoading(true);
    karayakarsApi
      .list(region && region !== 'All' ? { region } : {})
      .then(res => setList(res.data || []))
      .catch(err => console.error('KarayakarList fetch error:', err))
      .finally(() => setLoading(false));
  }, [region]);

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this karayakar?')) return;
    setDeleting(id);
    try {
      await karayakarsApi.remove(id);
      setList(prev => prev.filter(k => k.id !== id));
    } catch (err) {
      alert(err.message || 'Delete failed.');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className={styles.container}>
      <h2>Karyakar List</h2>

      {!defaultRegion && (
        <select
          value={region}
          onChange={e => setRegion(e.target.value)}
          style={{ marginBottom: 16, padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e0', fontSize: 14 }}
        >
          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      )}

      {loading ? (
        <div className={styles.center}><FaSpinner className={styles.spin} size={24} /></div>
      ) : list.length === 0 ? (
        <div className={styles.center} style={{ color: '#718096', fontSize: 14 }}>No karayakars found.</div>
      ) : (
        <div className={styles.list}>
          {list.map(k => (
            <div key={k.id} className={styles.item}>
              <div className={styles.info}>
                {k.photo_url
                  ? <img src={k.photo_url} alt={k.full_name} className={styles.avatar} />
                  : <div className={styles.avatarPlaceholder}><FaUser /></div>
                }
                <div>
                  <div className={styles.name}>{k.full_name}</div>
                  <div className={styles.region}>
                    {k.region}{k.tshirt_size ? ` · T-shirt: ${k.tshirt_size}` : ''}
                  </div>
                </div>
              </div>

              {canDelete && (
                <button
                  onClick={() => handleDelete(k.id)}
                  disabled={deleting === k.id}
                  title="Delete"
                  style={{ background: 'none', border: 'none', color: '#c53030', cursor: 'pointer', fontSize: 16, padding: 6 }}
                >
                  {deleting === k.id ? <FaSpinner className={styles.spin} /> : <FaTrash />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
