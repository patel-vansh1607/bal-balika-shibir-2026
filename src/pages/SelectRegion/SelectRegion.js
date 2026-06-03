import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { 
  FaGlobeAfrica, 
  FaMapMarkerAlt, 
  FaSignOutAlt, 
  FaChevronRight 
} from 'react-icons/fa';
import styles from './SelectRegion.module.css';

export default function SelectRegion() {
  const navigate = useNavigate();

  // Expanded explicit regional database partitions matching all target Shibir countries
  const regions = [
    { 
      id: 'All', 
      idPrefix: 'MTRC-',
      name: 'All African Regions', 
      description: 'Master administrative clearance. View all synchronized country datasets.' 
    },
    { 
      id: 'Kenya (+254)', 
      idPrefix: 'MTRC-KE-',
      name: 'Kenya Hub', 
      description: 'Isolate data rows matching Nairobi, Mombasa, Nakuru, and local centers (MTRC-KE-0000).' 
    },
    { 
      id: 'Tanzania (+255)', 
      idPrefix: 'MTRC-TZ-',
      name: 'Tanzania Hub', 
      description: 'Isolate data rows matching Dar es Salaam, Arusha, Mwanza, and local centers (MTRC-TZ-0000).' 
    },
    { 
      id: 'Uganda (+256)', 
      idPrefix: 'MTRC-UG-',
      name: 'Uganda Hub', 
      description: 'Isolate data rows matching Kampala, Entebbe, Jinja, and local centers (MTRC-UG-0000).' 
    },
    { 
      id: 'Zambia (+260)', 
      idPrefix: 'MTRC-ZM-',
      name: 'Zambia Hub', 
      description: 'Isolate data rows matching Lusaka, Kitwe, Ndola, and local centers (MTRC-ZM-0000).' 
    },
    { 
      id: 'Malawi (+265)', 
      idPrefix: 'MTRC-MW-',
      name: 'Malawi Hub', 
      description: 'Isolate data rows matching Lilongwe, Blantyre, Mzuzu, and local centers (MTRC-MW-0000).' 
    },
    { 
      id: 'Botswana (+267)', 
      idPrefix: 'MTRC-BW-',
      name: 'Botswana Hub', 
      description: 'Isolate data rows matching Gaborone, Francistown, Maun, and local centers (MTRC-BW-0000).' 
    },
    { 
      id: 'South Africa (+27)', 
      idPrefix: 'MTRC-ZA-',
      name: 'South Africa Hub', 
      description: 'Isolate data rows matching Johannesburg, Cape Town, Durban, and local centers (MTRC-ZA-0000).' 
    }
  ];

  const handleRegionSelect = (region) => {
    // Commit the text identifier name key (matches database "region" strings exactly)
    localStorage.setItem('selected_shibir_region', region.id);
    
    // Commit the specific alphanumeric prefix string key to safely constrain query filters
    localStorage.setItem('selected_shibir_prefix', region.idPrefix);
    
    // Push the session forward into the management dashboard layer
    navigate('/dashboard');
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      localStorage.removeItem('selected_shibir_region');
      localStorage.removeItem('selected_shibir_prefix');
      navigate('/login');
    } catch (err) {
      console.error('Error logging out:', err.message);
      navigate('/login');
    }
  };

  return (
    <div className={styles.regionWrapper}>
      <div className={styles.regionCard}>
        
        {/* Partition Header Context */}
        <div className={styles.regionHeader}>
          <div className={styles.iconGlobeWrapper}>
            <FaGlobeAfrica className={styles.globalIcon} />
          </div>
          <h2 className={styles.title}>Data Partition Gateway</h2>
          <p className={styles.subtitle}>
            Select your assigned operational region below to isolate database rows.
          </p>
        </div>

        {/* Partition Selection Stack List */}
        <div className={styles.regionGrid}>
          {regions.map((region) => (
            <button 
              key={region.id} 
              className={styles.partitionBtn}
              onClick={() => handleRegionSelect(region)}
            >
              <div className={styles.btnContentLeft}>
                <div className={styles.markerCircle}>
                  <FaMapMarkerAlt className={styles.markerIcon} />
                </div>
                <div className={styles.textMetadata}>
                  <div className={styles.regionName}>{region.name}</div>
                  <div className={styles.regionDesc}>{region.description}</div>
                </div>
              </div>
              <FaChevronRight className={styles.arrowIcon} />
            </button>
          ))}
        </div>

        {/* System Sign Out Footer Action */}
        <div className={styles.footerActionRow}>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            <FaSignOutAlt /> Sign Out Safely
          </button>
        </div>

      </div>
    </div>
  );
}