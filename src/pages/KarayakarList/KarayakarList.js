import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FaUser, FaSpinner, FaTrash, FaFileExport, 
  FaCheck, FaXmark, FaPenToSquare, FaListOl, 
  FaMagnifyingGlass, FaEllipsisVertical, FaCircleCheck, FaCircleXmark, FaCamera, FaWallet
} from 'react-icons/fa6';
import { karayakars as karayakarsApi, upload } from '../../apiClient';
import styles from './KarayakarList.module.css';
import toast from 'react-hot-toast';

const REGIONS = ['All', 'Kenya', 'Tanzania', 'Uganda', 'Zambia', 'Malawi', 'Botswana', 'South Africa'];

const REGION_CENTERS = {
  All: [],
  Kenya: ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Malindi", "Kericho", "Kakamega", "Nyeri", "Machakos", "Meru", "Kitale", "Garissa", "Voi", "Naivasha", "Narok", "Embu", "Lamu", "Nanyuki", "Athi River", "Nyahururu", "Bomet", "Busia", "Homabay", "Kisii", "Bungoma"],
  Tanzania: ["Dar es Salaam", "Arusha", "Mwanza", "Zanzibar City", "Dodoma", "Moshi", "Tanga", "Morogoro", "Mbeya", "Iringa", "Kigoma", "Songea", "Tabora", "Musoma", "Shinyanga", "Sumbawanga", "Lindi", "Singida", "Bukoba"],
  Uganda: ["Kampala", "Entebbe", "Jinja", "Mbarara", "Gulu", "Mbale", "Masaka", "Arua", "Lira", "Fort Portal", "Kabale", "Tororo", "Soroti", "Mukono", "Hoima", "Kasese", "Busia", "Iganga", "Wakiso", "Mityana", "Mubende", "Luwero", "Kyenjojo", "Masindi", "Kitgum"],
  Zambia: ["Lusaka", "Kitwe", "Ndola", "Livingstone", "Kabwe", "Chingola", "Mufulira", "Luanshya", "Kasama", "Chipata", "Chinsali", "Mansa", "Solwezi", "Mongu", "Mazabuka", "Monze", "Choma", "Kapiri Mposhi"],
  Malawi: ["Lilongwe", "Blantyre", "Mzuzu", "Zomba", "Kasungu", "Mangochi", "Karonga", "Salima", "Nkhotakota", "Liwonde", "Balaka", "Luchenza", "Dedza", "Mchinji", "Chikwawa", "Nsanje", "Rumphi"],
  Botswana: ["Gaborone", "Francistown", "Molepolole", "Maun", "Mogoditshane", "Serowe", "Selebi-Phikwe", "Kanye", "Lobatse", "Palapye", "Mahalapye", "Mochudi", "Ghanzi", "Kasane", "Orapa", "Jwaneng", "Sowa"],
  "South Africa": ["Johannesburg", "Cape Town", "Durban", "Pretoria", "Port Elizabeth", "Bloemfontein", "East London", "Polokwane", "Nelspruit", "Kimberley", "Pietermaritzburg", "Rustenburg", "George", "Welkom", "Klerksdorp", "Vereeniging", "Stellenbosch", "Paarl", "Upington", "Mthatha", "Soweto", "Benoni", "Tembisa", "Mayfair", "Laudium", "Germiston", "Lenasia", "Louis Trichard", "Mogwase", "Tzaneen", "North Riding"]
};

REGION_CENTERS.All = Object.values(REGION_CENTERS).flat();

const SEVA_DESIGNATIONS = ['NC','I-NC','NOC', 'I-NOC','RC', 'I-RC','Shishu Sanchalak', 'Shishu Sah-Sanchalak', 'Shishu I.C','Shishu Helper', 'Shishika Sanchalak', 'Shishika Sah-Sanchalak', 'Shishika I.C','Shishika Helper', 'Bal Sanchalak', 'Bal Sah-Sanchalak', 'Bal I.C','Bal Helper', 'Balika Sanchalak', 'Balika Sah-Sanchalak', 'Balika I.C','Balika Helper'];
const TSHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL','XXXL'];

export default function KarayakarList({ defaultRegion = '' }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [region, setRegion] = useState(defaultRegion || 'All');
  const [centerFilter, setCenterFilter] = useState('All');
  const [nameSearch, setNameSearch] = useState('');
  const [sevaFilter, setSevaFilter] = useState('');
  
  const [activeMenuId, setActiveMenuId] = useState(null);
  
  const [deleting, setDeleting] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [modalUploading, setModalUploading] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    center: '',
    sevaDesignation: [],
    tshirt_size: '',
    is_paid: 0,
    photo_url: '',
    newFile: null
  });

  const [editPreview, setEditPreview] = useState(null);
  const menuRef = useRef(null);

  const userRole = localStorage.getItem('user_role');
  const canDelete = ['master_admin', 'super_admin'].includes(userRole);
  const canEdit = ['master_admin', 'super_admin', 'admin'].includes(userRole);

  const fetchData = useCallback(() => {
    setLoading(true);
    karayakarsApi
      .list(region && region !== 'All' ? { region } : {})
      .then(res => setList(res.data || []))
      .catch(err => console.error('Fetch error:', err))
      .finally(() => setLoading(false));
  }, [region]);

  useEffect(() => {
    setCenterFilter('All');
  }, [region]);

  useEffect(() => {
    fetchData();
    
    function closeDropdownsOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener("mousedown", closeDropdownsOutside);
    return () => document.removeEventListener("mousedown", closeDropdownsOutside);
  }, [fetchData]);
const handleTogglePayment = async (karyakar) => {
  const newStatus = Number(karyakar.is_paid) === 1 ? 0 : 1;
  try {
    await karayakarsApi.update(karyakar.id, { ...karyakar, is_paid: newStatus });
    setList(prev => prev.map(k => k.id === karyakar.id ? { ...k, is_paid: newStatus } : k));
    setActiveMenuId(null);
    // Professional Toast Message
    toast.success(`${karyakar.full_name} is now ${newStatus === 1 ? 'Paid' : 'Unpaid'}`);
  } catch (err) {
    console.error(err);
    toast.error('Failed to update status');
  }
};
  const filteredList = list.filter(k => {
    const matchesCenter = centerFilter === 'All' || k.center === centerFilter;
    const matchesSeva = k.seva_designation?.toLowerCase().includes(sevaFilter.toLowerCase().trim());
    const matchesName = k.full_name?.toLowerCase().includes(nameSearch.toLowerCase().trim());
    return matchesCenter && matchesSeva && matchesName;
  });

  const getGenderStats = () => {
    let male = 0;
    let female = 0;
    filteredList.forEach(k => {
      if (!k.seva_designation) return;
      const designations = k.seva_designation.split(', ');
      const hasFemaleRole = designations.some(role => {
        const r = role.toUpperCase();
        return r === 'I-NC' || r === 'I-NOC' || r === 'I-RC' || r.includes('SHISHIKA') || r.includes('BALIKA');
      });
      if (hasFemaleRole) female++;
      else male++;
    });
    return { male, female };
  };

  const { male: maleCount, female: femaleCount } = getGenderStats();

const handleConfirmDelete = async (id) => {
  setDeleting(id);
  try {
    await karayakarsApi.remove(id);
    setList(prev => prev.filter(k => k.id !== id));
    setConfirmDeleteId(null);
    setActiveMenuId(null);
    // Professional Toast Message
    toast.success('Member removed from directory');
  } catch (err) {
    console.error(err);
    toast.error('Failed to delete member');
  } finally {
    setDeleting(null);
  }
};

  const handleOpenEditModal = (karyakar) => {
    setEditingItem(karyakar);
    const currentDesignations = karyakar.seva_designation 
      ? karyakar.seva_designation.split(', ').filter(Boolean)
      : [];

    setEditForm({
      full_name: karyakar.full_name || '',
      center: karyakar.center || '',
      sevaDesignation: currentDesignations,
      tshirt_size: karyakar.tshirt_size || '',
      is_paid: Number(karyakar.is_paid) === 1 ? 1 : 0,
      photo_url: karyakar.photo_url || '',
      newFile: null
    });
    setEditPreview(karyakar.photo_url || null);
    setIsEditModalOpen(true);
    setActiveMenuId(null);
  };

  const handleModalFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setEditForm(prev => ({ ...prev, newFile: file }));
    setEditPreview(URL.createObjectURL(file));
  };

  const handleModalSevaToggle = (designation) => {
    setEditForm(prev => {
      const exists = prev.sevaDesignation.includes(designation);
      const updated = exists 
        ? prev.sevaDesignation.filter(d => d !== designation)
        : [...prev.sevaDesignation, designation];
      return { ...prev, sevaDesignation: updated };
    });
  };

  const handleSaveModalEdit = async () => {
    if (!editForm.full_name.trim()) return alert('Name field is required');
    if (!editForm.center) return alert('Please select a center');
    if (editForm.sevaDesignation.length === 0) return alert('Select at least one designation');

    setModalUploading(true);
    try {
      let finalPhotoUrl = editForm.photo_url;
      if (editForm.newFile) {
        const ext = editForm.newFile.name.split('.').pop();
        const filename = `karayakar_${Date.now()}.${ext}`;
        const res = await upload.photo(editForm.newFile, filename);
        finalPhotoUrl = res.url || '';
      }

      const updatePayload = {
        full_name: editForm.full_name,
        center: editForm.center,
        seva_designation: editForm.sevaDesignation.join(', '),
        tshirt_size: editForm.tshirt_size || null,
        is_paid: Number(editForm.is_paid),
        photo_url: finalPhotoUrl
      };

      if (karayakarsApi.update) {
        await karayakarsApi.update(editingItem.id, updatePayload);
      }
      
      setList(prev => prev.map(item => item.id === editingItem.id ? { ...item, ...updatePayload } : item));
      setIsEditModalOpen(false);
      setEditingItem(null);
    } catch (err) {
      console.error(err);
      alert('Failed to update profile changes.');
    } finally {
      setModalUploading(false);
    }
  };

  const handleExportCSV = () => {
    if (filteredList.length === 0) return;
    const headers = ['No.', 'Full Name', 'Region', 'Center', 'Seva Designations', 'T-Shirt Size', 'Payment Status'];
    const rows = filteredList.map((k, idx) => [
      idx + 1,
      `"${k.full_name || ''}"`,
      `"${k.region || ''}"`,
      `"${k.center || ''}"`,
      `"${k.seva_designation || 'None'}"`,
      `"${k.tshirt_size || 'N/A'}"`,
      Number(k.is_paid) === 1 ? 'Paid' : 'Unpaid'
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Directory_Report.csv`;
    link.click();
  };

  return (
    <div className={styles.rosterContainer}>
      <div className={styles.directoryBentoStats}>
        <div className={styles.statBox}>
          <span className={styles.statLabel}>TOTAL REGISTERED</span>
          <span className={styles.statCount}>{filteredList.length}</span>
        </div>
        <div className={styles.statBoxBlue}>
          <span className={styles.statLabelBlue}>MALE</span>
          <span className={styles.statCountBlue}>{maleCount}</span>
        </div>
        <div className={styles.statBoxRed}>
          <span className={styles.statLabelRed}>FEMALE</span>
          <span className={styles.statCountRed}>{femaleCount}</span>
        </div>
      </div>

      <div className={styles.contentCard}>
        <div className={styles.searchFilterControlBlock}>
          <div className={styles.searchBarWrapper}>
            <FaMagnifyingGlass className={styles.searchIcon} />
            <input 
              type="text" 
              placeholder="Search by name..." 
              value={nameSearch}
              onChange={e => setNameSearch(e.target.value)}
              className={styles.mainSearchBar}
            />
          </div>

          <div className={styles.filterActionLayoutRow}>
            {!defaultRegion && (
              <div className={styles.selectWrapper}>
                <select value={region} onChange={e => setRegion(e.target.value)} className={styles.styledSelect}>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            )}

            <div className={styles.selectWrapper}>
              <select value={centerFilter} onChange={e => setCenterFilter(e.target.value)} className={styles.styledSelect}>
                <option value="All">All Center Branches</option>
                {(REGION_CENTERS[region] || []).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className={styles.searchBarWrapperHalf}>
              <input 
                type="text" 
                placeholder="All Mandals / Designations..." 
                value={sevaFilter}
                onChange={e => setSevaFilter(e.target.value)}
                className={styles.mandalSearchBar}
              />
            </div>

            <button onClick={handleExportCSV} className={styles.exportExcelButton} disabled={filteredList.length === 0}>
              <FaFileExport /> Export to Excel
            </button>
          </div>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th><FaListOl /> No.</th>
                <th>Profile</th>
                <th>Full Name</th>
                <th>Region</th>
                <th>Center</th>
                <th>Seva Designation</th>
                <th>T-Shirt</th>
                <th>Status</th>
                {(canEdit || canDelete) && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className={styles.emptyTablePlaceholder}>
                    <FaSpinner className={styles.spin} /> Loading directory records...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className={styles.emptyTablePlaceholder}>No registered members found matching filters.</td>
                </tr>
              ) : filteredList.map((k, index) => (
                <tr key={k.id} className={confirmDeleteId === k.id ? styles.rowWarningHighlight : ''}>
                  <td className={styles.centerAlignCell}>{index + 1}</td>
                  <td className={styles.centerAlignCell}>
                    <div className={styles.avatarFrame}>
                      {k.photo_url ? (
                        <img src={k.photo_url} alt="" className={styles.tableImage} />
                      ) : (
                        <FaUser className={styles.avatarPlaceholder} />
                      )}
                    </div>
                  </td>
                  <td className={`${styles.boldText} ${styles.centerAlignCell}`}>{k.full_name}</td>
                  <td className={styles.centerAlignCell}><span className={styles.regionTag}>{k.region}</span></td>
                  <td className={styles.centerAlignCell}><span className={styles.centerText}>{k.center || '—'}</span></td>
                  <td className={styles.centerAlignCell}>
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
                  <td className={styles.centerAlignCell}>
                    {k.tshirt_size ? <span className={styles.tshirtTag}><code>{k.tshirt_size}</code></span> : <span className={styles.textHyphen}>—</span>}
                  </td>
                  <td className={styles.centerAlignCell}>
                    {Number(k.is_paid) === 1 ? (
                      <span className={styles.paidBadge}><FaCircleCheck /> Paid</span>
                    ) : (
                      <span className={styles.unpaidBadge}><FaCircleXmark /> Unpaid</span>
                    )}
                  </td>
                  {(canEdit || canDelete) && (
                    <td className={styles.centerAlignCell}>
                      <div className={styles.actionMenuRelativeAnchor}>
                        <button 
                          className={styles.ellipsisTriggerBtn} 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === k.id ? null : k.id);
                          }}
                        >
                          <FaEllipsisVertical />
                        </button>
                        
                        {activeMenuId === k.id && (
                          <div className={styles.dropdownActionPopover} ref={menuRef}>
                            {confirmDeleteId === k.id ? (
  <div className={styles.menuDeleteConfirmBlock}>
    <span className={styles.confirmDeleteMsgLabel}>Confirm Delete?</span>
    <div className={styles.confirmActionBtnRow}>
      <button onClick={() => handleConfirmDelete(k.id)} disabled={deleting === k.id} className={styles.popoverConfirmBtn}>
        {deleting === k.id ? <FaSpinner className={styles.spin} /> : 'Yes'}
      </button>
      <button onClick={() => setConfirmDeleteId(null)} disabled={deleting === k.id} className={styles.popoverCancelBtn}>No</button>
    </div>
  </div>
) : (
  <>
    {canEdit && (
      <>
        <button onClick={() => handleOpenEditModal(k)} className={styles.dropdownOptionRowItem}>
          <FaPenToSquare className={styles.editIconBtn} /> Edit Profile
        </button>
        <button onClick={() => handleTogglePayment(k)} className={styles.dropdownOptionRowItem}>
          <FaWallet className={Number(k.is_paid) === 1 ? styles.statusPaidIcon : styles.statusUnpaidIcon} />
          {Number(k.is_paid) === 1 ? 'Mark as Unpaid' : 'Mark as Paid'}
        </button>
      </>
    )}
    {canDelete && (
      <button onClick={() => setConfirmDeleteId(k.id)} className={styles.dropdownOptionRowItem}>
        <FaTrash className={styles.deleteIconBtn} /> Delete Member
      </button>
    )}
  </>
)}
                          </div>
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

      {isEditModalOpen && editingItem && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContentCard}>
            <div className={styles.modalHeader}>
              <h3>Edit Karayakar Profile</h3>
              <button className={styles.modalCloseIconBtn} onClick={() => setIsEditModalOpen(false)}><FaXmark /></button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.modalAvatarSection}>
                <label className={styles.photoUploadTrigger}>
                  <div className={styles.photoUploadBoxFrame}>
                    {editPreview ? (
                      <img src={editPreview} alt="Preview" className={styles.modalPreviewImg} />
                    ) : (
                      <FaUser className={styles.modalPlaceholderIcon} />
                    )}
                    <div className={styles.cameraOverlay}><FaCamera /></div>
                  </div>
                  <span className={styles.uploadTextLabel}>Update Profile Photo</span>
                  <input type="file" accept="image/*" onChange={handleModalFileChange} hidden />
                </label>
              </div>

              <div className={styles.modalFormGroup}>
                <label>Full Name</label>
                <input 
                  type="text" 
                  value={editForm.full_name} 
                  onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))}
                  className={styles.modalInput}
                />
              </div>

              <div className={styles.modalFormGroup}>
                <label>Center Location</label>
                <select 
                  value={editForm.center} 
                  onChange={e => setEditForm(p => ({ ...p, center: e.target.value }))}
                  className={styles.modalSelect}
                >
                  <option value="">Select Center Hub...</option>
                  {(REGION_CENTERS[editingItem.region] || REGION_CENTERS['All']).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className={styles.modalFormGroup}>
                <label>Seva Designation Badges <span className={styles.subtextLabel}>(Select all that apply)</span></label>
                <div className={styles.modalBadgeSelectionGrid}>
                  {SEVA_DESIGNATIONS.map(d => {
                    const isSelected = editForm.sevaDesignation.includes(d);
                    return (
                      <button
                        type="button"
                        key={d}
                        className={`${styles.modalFormBadge} ${isSelected ? styles.modalFormBadgeActive : ''}`}
                        onClick={() => handleModalSevaToggle(d)}
                      >
                        {isSelected && <FaCheck style={{ marginRight: '4px' }} />}
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={styles.modalFormRowHalfLayout}>
                <div className={styles.modalFormGroup}>
                  <label>T-Shirt Size</label>
                  <select 
                    value={editForm.tshirt_size} 
                    onChange={e => setEditForm(p => ({ ...p, tshirt_size: e.target.value }))}
                    className={styles.modalSelect}
                  >
                    <option value="">Select Size...</option>
                    {TSHIRT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className={styles.modalFormGroup}>
                  <label>Payment Status</label>
                  <select 
                    value={String(editForm.is_paid)} 
                    onChange={e => setEditForm(p => ({ ...p, is_paid: parseInt(e.target.value, 10) }))}
                    className={styles.modalSelect}
                  >
                    <option value="0">Unpaid</option>
                    <option value="1">Paid</option>
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.modalFooterActions}>
              <button onClick={() => setIsEditModalOpen(false)} className={styles.modalCancelBtn} disabled={modalUploading}>Cancel</button>
              <button onClick={handleSaveModalEdit} className={styles.modalSaveBtn} disabled={modalUploading}>
                {modalUploading ? <><FaSpinner className={styles.spin} /> Processing...</> : 'Save Profile Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}