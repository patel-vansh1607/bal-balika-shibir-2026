import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { FaGlobeAfrica, FaSignOutAlt } from 'react-icons/fa';
import styles from './SelectRegion.module.css';

export default function SelectRegion() {
  const navigate = useNavigate();
  const [hoveredRegion, setHoveredRegion] = useState(null);

  const regions = [
    { id: 'All', idPrefix: 'MTRC-', name: 'All Africa', flagMapUrl: 'https://res.cloudinary.com/dxgkcyfrl/image/upload/v1780577973/africa-01_jjhu7b.svg' },
    { id: 'Kenya', idPrefix: 'MTRC-KE-', name: 'Kenya', flagMapUrl: 'https://res.cloudinary.com/dxgkcyfrl/image/upload/v1780575889/kenya-01_xeerfd.svg' },
    { id: 'Tanzania', idPrefix: 'MTRC-TZ-', name: 'Tanzania', flagMapUrl: 'https://res.cloudinary.com/dxgkcyfrl/image/upload/v1780576370/tanazani-01_eaabsq.svg' },
    { id: 'Uganda', idPrefix: 'MTRC-UG-', name: 'Uganda', flagMapUrl: 'https://res.cloudinary.com/dxgkcyfrl/image/upload/v1780576575/ug-01_sunvac.svg' },
    { id: 'Zambia', idPrefix: 'MTRC-ZM-', name: 'Zambia', flagMapUrl: 'https://res.cloudinary.com/dxgkcyfrl/image/upload/v1780576863/zambia-01_gs6kaj.svg' },
    { id: 'Malawi', idPrefix: 'MTRC-MW-', name: 'Malawi', flagMapUrl: 'https://res.cloudinary.com/dxgkcyfrl/image/upload/v1780577014/mw-01_jf4mka.svg' },
    { id: 'Botswana', idPrefix: 'MTRC-BW-', name: 'Botswana', flagMapUrl: 'https://res.cloudinary.com/dxgkcyfrl/image/upload/v1780577157/botswana-01_nt9yiv.svg' },
    { id: 'South Africa', idPrefix: 'MTRC-ZA-', name: 'South Africa', flagMapUrl: 'https://res.cloudinary.com/dxgkcyfrl/image/upload/v1780577502/south_africa-01_vkpcbk.svg' }
  ];

  const handleRegionSelect = (region) => {
    localStorage.setItem('selected_shibir_region', region.id);
    localStorage.setItem('selected_shibir_prefix', region.idPrefix);
    navigate('/dashboard');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    navigate('/');
  };

  return (
    <div className={styles.regionWrapper}>
      <div className={styles.regionCard} style={{ maxWidth: '1150px' }}>
        
        <div className={styles.regionHeader}>
          <div className={styles.iconGlobeWrapper}><FaGlobeAfrica className={styles.globalIcon} /></div>
          <h2 className={styles.title}>Choose Your Region</h2>
          <p className={styles.subtitle}>Select the region you want to view data.</p>
        </div>

        {/* --- HORIZONTAL PREMIUM ROW ONLY --- */}
        <div className={styles.badgeScrollContainer}>
          {regions.map((region) => (
            <div 
              key={region.id}
              onClick={() => handleRegionSelect(region)}
              onMouseEnter={() => setHoveredRegion(region.id)}
              onMouseLeave={() => setHoveredRegion(null)}
              className={styles.badgeItem}
            >
              <span className={styles.badgeText} style={{ color: hoveredRegion === region.id ? '#8a151b' : '#2d2926' }}>
                {region.name}
              </span>
              <div className={styles.badgeCircle} style={{ borderColor: hoveredRegion === region.id ? '#8a151b' : 'transparent' }}>
                <img src={region.flagMapUrl} alt={region.name} className={styles.badgeImg} />
              </div>
            </div>
          ))}
        </div>

        <div className={styles.footerActionRow}>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            <FaSignOutAlt /> Sign Out Safely
          </button>
        </div>
      </div>
    </div>
  );
}