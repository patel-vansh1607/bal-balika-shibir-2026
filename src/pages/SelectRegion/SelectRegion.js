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
      description: 'View and manage data across all Regions' 
    },
    { 
      id: 'Kenya (+254)', 
      idPrefix: 'MTRC-KE-',
      name: 'Kenya Region', 
      description: 'View and manage data across Kenya Region' 
    },
    { 
      id: 'Tanzania (+255)', 
      idPrefix: 'MTRC-TZ-',
      name: 'Tanzania Region', 
      description: 'View and manage data across Tanzania Region' 
    },
    { 
      id: 'Uganda (+256)', 
      idPrefix: 'MTRC-UG-',
      name: 'Uganda Region', 
      description: 'View and manage data across Uganda Region' 
    },
    { 
      id: 'Zambia (+260)', 
      idPrefix: 'MTRC-ZM-',
      name: 'Zambia Region', 
      description: 'View and manage data across Zambia Region' 
    },
    { 
      id: 'Malawi (+265)', 
      idPrefix: 'MTRC-MW-',
      name: 'Malawi Region', 
      description: 'View and manage data across Malawi Region' 
    },
    { 
      id: 'Botswana (+267)', 
      idPrefix: 'MTRC-BW-',
      name: 'Botswana Region', 
      description: 'View and manage data across Botswana Region' 
    },
    { 
      id: 'South Africa (+27)', 
      idPrefix: 'MTRC-ZA-',
      name: 'South Africa Region', 
      description: 'View and manage data across South Africa Region' 
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
      navigate('/');
    } catch (err) {
      console.error('Error logging out:', err.message);
      navigate('/');
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
          <h2 className={styles.title}> Choose Your Region</h2>
          <p className={styles.subtitle}>
            Choose your preferred region you would like to view and manage within the dashboard.<br></br> You can switch regions at any time from the dashboard view. 
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