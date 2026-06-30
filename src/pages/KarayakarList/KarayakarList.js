import React, { useState, useEffect } from 'react';
import { FaSpinner, FaUser, FaTrash } from 'react-icons/fa';
import styles from './KarayakarList.module.css';
// Assuming you have an API client for Karayakars
import { karayakarApi } from '../../apiClient'; 

export default function KarayakarList() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchList();
  }, []);

  const fetchList = async () => {
    try {
      setLoading(true);
      const { data } = await karayakarApi.list();
      setList(data || []);
    } catch (err) {
      console.error("Failed to fetch Karayakars", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className={styles.center}><FaSpinner className={styles.spin} /></div>;

  return (
    <div className={styles.container}>
      <h2>Registered Karayakars</h2>
      <div className={styles.list}>
        {list.map((k) => (
          <div key={k.id} className={styles.item}>
            <div className={styles.info}>
              {k.profilePhoto ? (
                <img src={k.profilePhoto} alt={k.fullName} className={styles.avatar} />
              ) : (
                <div className={styles.avatarPlaceholder}><FaUser /></div>
              )}
              <div>
                <div className={styles.name}>{k.fullName}</div>
                <div className={styles.region}>{k.region}</div>
              </div>
            </div>
            <button className={styles.deleteBtn} onClick={() => console.log('Delete', k.id)}>
              <FaTrash />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}