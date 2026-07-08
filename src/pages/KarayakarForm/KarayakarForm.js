import React, { useState, useEffect, useRef } from 'react';
import { FaPlus, FaUser, FaCamera, FaMagnifyingGlass, FaCheck, FaCircleCheck, FaCircleXmark, FaXmark } from 'react-icons/fa6';
import { karayakars as karayakarsApi, upload } from '../../apiClient';
import styles from './KarayakarForm.module.css';

const regionDataset = {
  Kenya: {
    code: "+254",
    centers: [
      "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Malindi", 
      "Kericho", "Kakamega", "Nyeri", "Machakos", "Meru", "Kitale", "Garissa", 
      "Voi", "Naivasha", "Narok", "Embu", "Lamu", "Nanyuki", "Athi River", 
      "Nyahururu", "Bomet", "Busia", "Homabay", "Kisii", "Bungoma"
    ],
  },
  Tanzania: {
    code: "+255",
    centers: [
      "Dar es Salaam", "Arusha", "Mwanza", "Zanzibar City", "Dodoma", "Moshi", 
      "Tanga", "Morogoro", "Mbeya", "Iringa", "Kigoma", "Songea", "Tabora", 
      "Musoma", "Shinyanga", "Sumbawanga", "Lindi", "Singida", "Bukoba"
    ],
  },
  Uganda: {
    code: "+256",
    centers: [
      "Kampala", "Entebbe", "Jinja", "Mbarara", "Gulu", "Mbale", "Masaka", 
      "Arua", "Lira", "Fort Portal", "Kabale", "Tororo", "Soroti", "Mukono", 
      "Hoima", "Kasese", "Busia", "Iganga", "Wakiso", "Mityana", "Mubende", 
      "Luwero", "Kyenjojo", "Masindi", "Kitgum"
    ],
  },
  Zambia: {
    code: "+260",
    centers: [
      "Lusaka", "Kitwe", "Ndola", "Livingstone", "Kabwe", "Chingola", "Mufulira", 
      "Luanshya", "Kasama", "Chipata", "Chinsali", "Mansa", "Solwezi", "Mongu", 
      "Mazabuka", "Monze", "Choma", "Kapiri Mposhi"
    ],
  },
  Malawi: {
    code: "+265",
    centers: [
      "Lilongwe", "Blantyre", "Mzuzu", "Zomba", "Kasungu", "Mangochi", "Karonga", 
      "Salima", "Nkhotakota", "Liwonde", "Balaka", "Luchenza", "Dedza", "Mchinji", 
      "Chikwawa", "Nsanje", "Rumphi"
    ],
  },
  Botswana: {
    code: "+267",
    centers: [
      "Gaborone", "Francistown", "Molepolole", "Maun", "Mogoditshane", "Serowe", 
      "Selebi-Phikwe", "Kanye", "Lobatse", "Palapye", "Mahalapye", "Mochudi", 
      "Ghanzi", "Kasane", "Orapa", "Jwaneng", "Sowa"
    ],
  },
  "South Africa": {
    code: "+27",
    centers: [
      "Johannesburg", "Cape Town", "Durban", "Pretoria", "Port Elizabeth", 
      "Bloemfontein", "East London", "Polokwane", "Nelspruit", "Kimberley", 
      "Pietermaritzburg", "Rustenburg", "George", "Welkom", "Klerksdorp", 
      "Vereeniging", "Stellenbosch", "Paarl", "Upington", "Mthatha", "Soweto", 
      "Benoni", "Tembisa", "Mayfair", "Laudium", "Germiston", "Lenasia", 
      "Louis Trichard", "Mogwase", "Tzaneen", "North Riding"
    ],
  },
};

const ALL_REGIONS     = Object.keys(regionDataset);
const TSHIRT_REGIONS  = ['South Africa', 'Botswana','Kenya','Tanzania','Uganda','Malawi','Zambia'];
const TSHIRT_SIZES    = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const SEVA_DESIGNATIONS = ['Shishu Sanchalak', 'Shishu Sah-Sanchalak', 'Shishu I.C','Shishu Helper', 'Shishika Sanchalak', 'Shishika Sah-Sanchalak', 'Shishika I.C','Shishika Helper', 'Bal Sanchalak', 'Bal Sah-Sanchalak', 'Bal I.C','Bal Helper', 'Balika Sanchalak', 'Balika Sah-Sanchalak', 'Balika I.C','Balika Helper'];

export default function KarayakarForm() {
  const currentRegionSetting = localStorage.getItem("selected_shibir_region") || "Kenya";
  const isGlobalAdmin = currentRegionSetting === "All";

  const [form, setForm] = useState({
    fullName:        '',
    region:          isGlobalAdmin ? '' : currentRegionSetting,
    center:          '',
    sevaDesignation: [],
    tshirtSize:      '',
    profilePhoto:    null,
  });

  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview]       = useState(null);
  
  // Refactored popup system state structure
  const [toast, setToast] = useState({ show: false, type: '', title: '', message: '' });

  const [regionSearch, setRegionSearch] = useState('');
  const [showRegionList, setShowRegionList] = useState(false);
  const [centerSearch, setCenterSearch] = useState('');
  const [showCenterList, setShowCenterList] = useState(false);

  const regionRef = useRef(null);
  const centerRef = useRef(null);

  const showNotification = (type, title, message) => {
    setToast({ show: true, type, title, message });
  };

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast(t => ({ ...t, show: false })), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (regionRef.current && !regionRef.current.contains(event.target)) setShowRegionList(false);
      if (centerRef.current && !centerRef.current.contains(event.target)) setShowCenterList(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const initialRegion = isGlobalAdmin ? '' : currentRegionSetting;
    setForm(f => ({ ...f, region: initialRegion, center: '', tshirtSize: '' }));
    setRegionSearch(initialRegion);
    setCenterSearch('');
  }, [currentRegionSetting, isGlobalAdmin]);

  const needsTshirt = TSHIRT_REGIONS.includes(form.region);
  const availableCenters = regionDataset[form.region]?.centers || [];

  const filteredRegions = ALL_REGIONS.filter(r => 
    r.toLowerCase().includes(regionSearch.toLowerCase())
  );
  const filteredCenters = availableCenters.filter(c => 
    c.toLowerCase().includes(centerSearch.toLowerCase())
  );

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const maxBytes = 2 * 1024 * 1024; 
    if (file.size > maxBytes) {
      showNotification('error', 'File limit exceeded', 'Please select a photo smaller than 2MB.');
      e.target.value = null;
      return;
    }

    setForm(f => ({ ...f, profilePhoto: file }));
    setPreview(URL.createObjectURL(file));
  };

  const handleSevaToggle = (designation) => {
    setForm(f => {
      const alreadySelected = f.sevaDesignation.includes(designation);
      const updated = alreadySelected 
        ? f.sevaDesignation.filter(item => item !== designation)
        : [...f.sevaDesignation, designation];
      return { ...f, sevaDesignation: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.region) {
      showNotification('error', 'Missing Region', 'Please select a valid region context.');
      return;
    }
    if (!form.center) {
      showNotification('error', 'Missing Center', 'Please select an active center deployment hub.');
      return;
    }
    if (form.sevaDesignation.length === 0) {
      showNotification('error', 'Missing Designation', 'Please select at least one Seva Designation.');
      return;
    }


    setSubmitting(true);
    try {
      let photo_url = '';
      if (form.profilePhoto) {
        const ext = form.profilePhoto.name.split('.').pop();
        const filename = `karayakar_${Date.now()}.${ext}`;
        const res = await upload.photo(form.profilePhoto, filename);
        photo_url = res.url || '';
      }

      await karayakarsApi.create({
        full_name:        form.fullName,
        region:           form.region,
        center:           form.center,
        seva_designation: form.sevaDesignation.join(', '), 
        photo_url,
        tshirt_size:      needsTshirt ? form.tshirtSize : null,
      });

      showNotification('success', 'Registration Successful', `${form.fullName} has been added safely to the directory.`);
      
      setForm({ 
        fullName: '', 
        region: isGlobalAdmin ? '' : currentRegionSetting, 
        center: '', 
        sevaDesignation: [], 
        tshirtSize: '', 
        profilePhoto: null 
      });
      setPreview(null);
      setRegionSearch(isGlobalAdmin ? '' : currentRegionSetting);
      setCenterSearch('');
    } catch (err) {
      showNotification('error', 'Registration Failed', err.message || 'System encountered an execution error.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      {/* Toast Popup Notification Module */}
      {toast.show && (
        <div className={`${styles.toastPopup} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}>
          <div className={styles.toastIconWrapper}>
            {toast.type === 'success' ? <FaCircleCheck /> : <FaCircleXmark />}
          </div>
          <div className={styles.toastBody}>
            <span className={styles.toastTitle}>{toast.title}</span>
            <p className={styles.toastMessage}>{toast.message}</p>
          </div>
          <button className={styles.toastCloseBtn} onClick={() => setToast(t => ({ ...t, show: false }))}>
            <FaXmark />
          </button>
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.headerGroup}>
          <h2 className={styles.title}>Register Karayakar</h2>
          <p className={styles.subtitle}>Fill in credentials to register members securely.</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.formElement}>
          
          <div className={styles.avatarSection}>
            <label className={styles.photoUploadTrigger}>
              <div className={styles.photoUpload}>
                {preview ? <img src={preview} alt="Preview" className={styles.preview} /> : <FaUser className={styles.placeholderIcon} />}
                <div className={styles.cameraOverlay}><FaCamera /></div>
              </div>
              <span className={styles.uploadText}>Upload Photo (Max 2MB)</span>
              <input type="file" accept="image/*" onChange={handleFileChange} hidden />
            </label>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Full Name</label>
            <input className={styles.input} required placeholder="e.g. Jayesh Patel" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup} ref={regionRef}>
              <label className={styles.label}>Region</label>
              {isGlobalAdmin ? (
                <div className={styles.searchDropdownWrapper}>
                  <div className={styles.inputWithIcon}>
                    <FaMagnifyingGlass className={styles.searchFieldIcon} />
                    <input 
                      type="text"
                      className={styles.input}
                      placeholder="Search Region..."
                      value={regionSearch}
                      onFocus={() => setShowRegionList(true)}
                      onChange={(e) => {
                        setRegionSearch(e.target.value);
                        setForm(f => ({ ...f, region: '', center: '' }));
                        setCenterSearch('');
                      }}
                    />
                  </div>
                  {showRegionList && (
                    <ul className={styles.dropdownResultsList}>
                      {filteredRegions.length > 0 ? (
                        filteredRegions.map(r => (
                          <li 
                            key={r} 
                            onClick={() => {
                              setForm(f => ({ ...f, region: r, center: '', tshirtSize: '' }));
                              setRegionSearch(r);
                              setShowRegionList(false);
                            }}
                          >
                            {r}
                          </li>
                        ))
                      ) : (
                        <li className={styles.noResults}>No regions found</li>
                      )}
                    </ul>
                  )}
                </div>
              ) : (
                <input className={styles.inputReadOnly} readOnly value={form.region} />
              )}
            </div>

            <div className={styles.formGroup} ref={centerRef}>
              <label className={styles.label}>Center</label>
              <div className={styles.searchDropdownWrapper}>
                <div className={styles.inputWithIcon}>
                  <FaMagnifyingGlass className={styles.searchFieldIcon} />
                  <input 
                    type="text"
                    className={styles.input}
                    placeholder={form.region ? "Search Center..." : "Select region first"}
                    disabled={!form.region}
                    value={centerSearch}
                    onFocus={() => form.region && setShowCenterList(true)}
                    onChange={(e) => {
                      setCenterSearch(e.target.value);
                      setForm(f => ({ ...f, center: '' }));
                    }}
                  />
                </div>
                {showCenterList && form.region && (
                  <ul className={styles.dropdownResultsList}>
                    {filteredCenters.length > 0 ? (
                      filteredCenters.map(c => (
                        <li 
                          key={c} 
                          onClick={() => {
                            setForm(f => ({ ...f, center: c }));
                            setCenterSearch(c);
                            setShowCenterList(false);
                          }}
                        >
                          {c}
                        </li>
                      ))
                    ) : (
                      <li className={styles.noResults}>No matching centers found</li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Seva Designation <span className={styles.labelOptional}>(Select all that apply)</span></label>
            <div className={styles.badgeGrid}>
              {SEVA_DESIGNATIONS.map(d => {
                const isSelected = form.sevaDesignation.includes(d);
                return (
                  <button
                    type="button"
                    key={d}
                    className={`${styles.sevaBadge} ${isSelected ? styles.sevaBadgeActive : ''}`}
                    onClick={() => handleSevaToggle(d)}
                  >
                    {isSelected && <FaCheck className={styles.badgeCheckIcon} />}
                    {d}
                  </button>
                );
              })}
            </div>
          </div>


{needsTshirt && (
  <div className={styles.formGroup}>
    <label className={styles.label}>T-Shirt Size <span className={styles.labelOptional}>(Optional)</span></label>
    <div className={styles.selectWrapper}>
      <select 
        className={styles.selectInput} 
        value={form.tshirtSize} 
        onChange={e => setForm(f => ({ ...f, tshirtSize: e.target.value }))}
      >
        <option value="">Select size</option>
        {TSHIRT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>
  </div>
)}

          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? (
              <div className={styles.btnLoadingState}><div className={styles.spinner} /> Processing...</div>
            ) : (
              <><FaPlus className={styles.btnIcon} /> Add Member</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}