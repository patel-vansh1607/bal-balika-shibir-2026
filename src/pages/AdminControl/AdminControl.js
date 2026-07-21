import React, { useState, useEffect } from 'react';
import { userRoles } from '../../apiClient';
import { FaUserShield, FaSpinner, FaPlus, FaTimes, FaCheckCircle, FaPen, FaCheck } from 'react-icons/fa';
import styles from './AdminControl.module.css';

const REGIONS = ['All', 'Kenya', 'Tanzania', 'Uganda', 'Zambia', 'Malawi', 'Botswana', 'South Africa'];

const ROLE_LABELS = {
  master_admin: 'Master Admin',
  super_admin:  'Super Admin',
  admin:        'Admin',
  operator:     'Gate Operator',
};

const ROLE_COLORS = {
  master_admin: { bg: '#fef2f2', color: '#991b1b' },
  super_admin:  { bg: '#fff7ed', color: '#9a3412' },
  admin:        { bg: '#eff6ff', color: '#1d4ed8' },
  operator:     { bg: '#f0fdf4', color: '#166534' },
};

const emptyForm = {
  name:               '',
  email:              '',
  password:           '',
  role:               'operator',
  region:             'Kenya',
  authorized_regions: ['Kenya'],
};

export default function AdminControl() {
  const [usersList,    setUsersList]    = useState([]);
  const [currentUser,  setCurrentUser]  = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [form,         setForm]         = useState(emptyForm);
  const [submitting,   setSubmitting]   = useState(false);
  const [toast,        setToast]        = useState(null);
  const [updatingId,   setUpdatingId]   = useState(null);

  // States for updating an existing user's name
  const [editingUserId, setEditingUserId] = useState(null);
  const [editNameValue, setEditNameValue] = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    Promise.all([
      userRoles.list(),
      userRoles.me ? userRoles.me().catch(() => ({ data: null })) : Promise.resolve({ data: null })
    ])
      .then(([usersRes, meRes]) => {
        const fetchedUsers = usersRes.data || [];
        const me = meRes.data || null;

        setUsersList(fetchedUsers);
        setCurrentUser(me);

        // If the user is a super admin, automatically lock their form region to match theirs
        if (me?.region && me.region !== 'All') {
          setForm((prev) => ({
            ...prev,
            region: me.region,
            authorized_regions: [me.region]
          }));
        }
      })
      .catch((err) => showToast(`Failed to load users: ${err.message}`, 'error'))
      .finally(() => setLoading(false));
  }, []);

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const myRegion = currentUser?.region || 'Kenya';

  // Filter users list based on super admin scope if necessary
  const displayedUsers = isSuperAdmin && myRegion !== 'All'
    ? usersList.filter((u) => u.region === myRegion || (u.authorized_regions && u.authorized_regions.includes(myRegion)))
    : usersList;

  const toggleRegion = (region) => {
    if (isSuperAdmin) return;
    setForm((prev) => {
      const has = prev.authorized_regions.includes(region);
      return {
        ...prev,
        authorized_regions: has
          ? prev.authorized_regions.filter((r) => r !== region)
          : [...prev.authorized_regions, region],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return;
    
    // Explicitly set added_by to current logged-in user identification
    const addedBy = currentUser?.name || currentUser?.email || 'System Admin';

    const payload = isSuperAdmin ? { 
      ...form, 
      role: 'operator', 
      region: myRegion, 
      authorized_regions: [myRegion],
      added_by: addedBy
    } : {
      ...form,
      added_by: addedBy
    };

    setSubmitting(true);
    try {
      const { data: newUser } = await userRoles.create(payload);
      
      const userWithAddedBy = {
        ...newUser,
        added_by: newUser?.added_by || addedBy
      };

      setUsersList((prev) => [userWithAddedBy, ...prev]);
      showToast(`${userWithAddedBy.email} added and notified by email.`);
      setForm({
        ...emptyForm,
        region: isSuperAdmin ? myRegion : emptyForm.region,
        authorized_regions: isSuperAdmin ? [myRegion] : emptyForm.authorized_regions,
      });
      setShowForm(false);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    if (isSuperAdmin) return;
    setUpdatingId(userId);
    try {
      await userRoles.update(userId, { role: newRole });
      setUsersList((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      showToast('Role updated.');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const startEditingName = (user) => {
    setEditingUserId(user.id);
    setEditNameValue(user.name || '');
  };

  const handleSaveName = async (userId) => {
    if (!editNameValue.trim()) return showToast('Name cannot be empty', 'error');
    setUpdatingId(userId);
    try {
      await userRoles.update(userId, { name: editNameValue.trim() });
      setUsersList((prev) => prev.map((u) => (u.id === userId ? { ...u, name: editNameValue.trim() } : u)));
      showToast('Name updated successfully.');
      setEditingUserId(null);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className={styles.container} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12, color: '#718096' }}>
        <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        Loading users...
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Toast */}
      {toast && (
        <div className={styles.toast} style={{ background: toast.type === 'error' ? '#fef2f2' : '#f0fdf4', borderColor: toast.type === 'error' ? '#fca5a5' : '#86efac', color: toast.type === 'error' ? '#991b1b' : '#166534' }}>
          <FaCheckCircle /> {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <FaUserShield style={{ fontSize: 24, color: '#e78524', flexShrink: 0 }} />
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#2d2926' }}>Manage System Access</h2>
            <p style={{ margin: 0, fontSize: 13, color: '#718096' }}>
              {isSuperAdmin ? `Add gate operators for your assigned region (${myRegion})` : 'Add users and assign region permissions'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className={styles.toggleBtn}
          style={{ background: showForm ? '#f1f5f9' : '#e78524', color: showForm ? '#2d2926' : '#fff' }}
        >
          {showForm ? <><FaTimes /> Cancel</> : <><FaPlus /> {isSuperAdmin ? 'Add Gate Operator' : 'Add User'}</>}
        </button>
      </div>

      {/* Add User Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className={styles.form}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 600, color: '#2d2926' }}>
            {isSuperAdmin ? `New Gate Operator Details (${myRegion} Region)` : 'New User Details'}
          </h3>

          <div className={styles.formFieldsGrid}>
            <label className={styles.label}>
              Full Name
              <input className={styles.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. John Doe" />
            </label>
            <label className={styles.label}>
              Email Address
              <input type="email" className={styles.input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="user@example.com" />
            </label>
            <label className={styles.label}>
              Password
              <input type="text" className={styles.input} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required placeholder="Min 8 characters" />
            </label>
            
            {!isSuperAdmin && (
              <label className={styles.label}>
                Role
                <select className={styles.input} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="operator">Gate Operator</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </label>
            )}

            <label className={styles.label}>
              Primary Region
              <select 
                className={styles.input} 
                style={{ background: isSuperAdmin ? '#edf2f7' : '#fff', cursor: isSuperAdmin ? 'not-allowed' : 'pointer' }} 
                value={form.region} 
                disabled={isSuperAdmin}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
              >
                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
          </div>

          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: '0 0 10px 0', fontSize: 13, fontWeight: 600, color: '#4a5568' }}>
              Authorized Regions {isSuperAdmin && <span style={{ fontSize: 12, color: '#a0aec0', fontWeight: 'normal' }}>(Locked to your assigned region)</span>}
            </p>
            <div className={styles.regionList}>
              {REGIONS.map((r) => {
                const active = form.authorized_regions.includes(r);
                return (
                  <button 
                    key={r} 
                    type="button" 
                    onClick={() => toggleRegion(r)}
                    disabled={isSuperAdmin}
                    style={{ 
                      padding: '6px 14px', 
                      borderRadius: 20, 
                      border: `1.5px solid ${active ? '#e78524' : '#cbd5e0'}`, 
                      background: active ? '#e78524' : '#fff', 
                      color: active ? '#fff' : '#4a5568', 
                      fontSize: 13, 
                      fontWeight: 500, 
                      cursor: isSuperAdmin ? 'not-allowed' : 'pointer', 
                      opacity: isSuperAdmin && !active ? 0.5 : 1,
                      transition: 'all 0.15s' 
                    }}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          <button type="submit" disabled={submitting} className={styles.submitBtn}>
            {submitting ? <><FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> Creating...</> : <><FaPlus /> Create & Send Email</>}
          </button>
        </form>
      )}

      {/* Users List */}
      <div className={styles.userList}>
        {displayedUsers.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#a0aec0', fontSize: 14 }}>No users found.</div>
        )}
        {displayedUsers.map((u) => (
          <div key={u.id} className={styles.userItem}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {editingUserId === u.id ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <input
                    type="text"
                    value={editNameValue}
                    onChange={(e) => setEditNameValue(e.target.value)}
                    className={styles.input}
                    style={{ padding: '4px 8px', fontSize: 14 }}
                    autoFocus
                  />
                  <button 
                    onClick={() => handleSaveName(u.id)}
                    disabled={updatingId === u.id}
                    style={{ background: '#166534', border: 'none', color: '#fff', borderRadius: 4, padding: '6px 10px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                  >
                    <FaCheck style={{ fontSize: 12 }} />
                  </button>
                  <button 
                    onClick={() => setEditingUserId(null)}
                    disabled={updatingId === u.id}
                    style={{ background: '#cbd5e0', border: 'none', color: '#4a5568', borderRadius: 4, padding: '6px 10px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                  >
                    <FaTimes style={{ fontSize: 12 }} />
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#2d2926', wordBreak: 'break-word' }}>{u.name || '—'}</div>
                  {u.role !== 'master_admin' && (
                    <button 
                      onClick={() => startEditingName(u)}
                      style={{ background: 'none', border: 'none', color: '#a0aec0', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#e78524'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#a0aec0'}
                      title="Edit Name"
                    >
                      <FaPen style={{ fontSize: 11 }} />
                    </button>
                  )}
                </div>
              )}
              <div style={{ fontSize: 13, color: '#718096', wordBreak: 'break-all' }}>{u.email}</div>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 4, fontSize: 12, color: '#a0aec0' }}>
                <span>Region: <strong style={{ color: '#4a5568', fontWeight: 500 }}>{u.region}</strong></span>
                <span>•</span>
                <span>Added by: <strong style={{ color: '#4a5568', fontWeight: 500 }}>{u.added_by || 'System'}</strong></span>
              </div>
            </div>
            
            <div className={styles.userActions}>
              <span style={{ ...ROLE_COLORS[u.role], padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, display: 'inline-block', whiteSpace: 'nowrap' }}>
                {ROLE_LABELS[u.role] || u.role}
              </span>

              {u.role === 'master_admin' || isSuperAdmin ? (
                <span style={{ fontSize: 12, color: '#a0aec0', fontStyle: 'italic', whiteSpace: 'nowrap' }}>Role locked</span>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <select
                    value={u.role}
                    disabled={updatingId === u.id}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    className={styles.input}
                    style={{ padding: '5px 10px', fontSize: 13, width: 'auto' }}
                  >
                    <option value="operator">Gate Operator</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                  {updatingId === u.id && <FaSpinner style={{ animation: 'spin 1s linear infinite', color: '#e78524' }} />}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}