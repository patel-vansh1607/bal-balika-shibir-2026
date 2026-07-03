import React, { useState, useEffect } from 'react';
import { userRoles } from '../../apiClient';
import { FaUserShield, FaSpinner, FaPlus, FaTimes, FaCheckCircle } from 'react-icons/fa';
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
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [form,         setForm]         = useState(emptyForm);
  const [submitting,   setSubmitting]   = useState(false);
  const [toast,        setToast]        = useState(null);
  const [updatingId,   setUpdatingId]   = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    userRoles.list()
      .then(({ data }) => setUsersList(data || []))
      .catch((err) => showToast(`Failed to load users: ${err.message}`, 'error'))
      .finally(() => setLoading(false));
  }, []);

  const toggleRegion = (region) => {
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
    setSubmitting(true);
    try {
      const { data: newUser } = await userRoles.create(form);
      setUsersList((prev) => [newUser, ...prev]);
      showToast(`${newUser.email} added and notified by email.`);
      setForm(emptyForm);
      setShowForm(false);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
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
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '12px 20px', borderRadius: 10, background: toast.type === 'error' ? '#fef2f2' : '#f0fdf4', border: `1px solid ${toast.type === 'error' ? '#fca5a5' : '#86efac'}`, color: toast.type === 'error' ? '#991b1b' : '#166534', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <FaCheckCircle /> {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <FaUserShield style={{ fontSize: 24, color: '#e78524' }} />
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#2d2926' }}>Manage System Access</h2>
            <p style={{ margin: 0, fontSize: 13, color: '#718096' }}>Add users and assign region permissions</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: showForm ? '#f1f5f9' : '#e78524', color: showForm ? '#2d2926' : '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
        >
          {showForm ? <><FaTimes /> Cancel</> : <><FaPlus /> Add User</>}
        </button>
      </div>

      {/* Add User Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, marginBottom: 28 }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 600, color: '#2d2926' }}>New User Details</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <label style={labelStyle}>
              Full Name
              <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mahendra Patel" />
            </label>
            <label style={labelStyle}>
              Email Address <span style={{ color: '#e53e3e' }}>*</span>
              <input type="email" style={inputStyle} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="user@example.com" />
            </label>
            <label style={labelStyle}>
              Password <span style={{ color: '#e53e3e' }}>*</span>
              <input type="text" style={inputStyle} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required placeholder="Min 8 characters" />
            </label>
            <label style={labelStyle}>
              Role
              <select style={inputStyle} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="operator">Gate Operator</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </label>
            <label style={labelStyle}>
              Primary Region
              <select style={inputStyle} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}>
                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
          </div>

          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: '0 0 10px 0', fontSize: 13, fontWeight: 600, color: '#4a5568' }}>Authorized Regions (can view/scan data from)</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {REGIONS.map((r) => {
                const active = form.authorized_regions.includes(r);
                return (
                  <button key={r} type="button" onClick={() => toggleRegion(r)}
                    style={{ padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${active ? '#e78524' : '#cbd5e0'}`, background: active ? '#e78524' : '#fff', color: active ? '#fff' : '#4a5568', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' }}>
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          <button type="submit" disabled={submitting} style={{ background: '#e78524', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 28px', fontWeight: 600, fontSize: 14, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            {submitting ? <><FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> Creating...</> : <><FaPlus /> Create & Send Email</>}
          </button>
        </form>
      )}

      {/* Users Table */}
      <div className={styles.userList}>
        {usersList.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#a0aec0', fontSize: 14 }}>No users found.</div>
        )}
        {usersList.map((u) => (
          <div key={u.id} className={styles.userItem}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#2d2926' }}>{u.name || '—'}</div>
              <div style={{ fontSize: 13, color: '#718096' }}>{u.email}</div>
              <div style={{ fontSize: 12, color: '#a0aec0', marginTop: 2 }}>Region: {u.region}</div>
            </div>
            <div>
              <span style={{ ...ROLE_COLORS[u.role], padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, display: 'inline-block' }}>
                {ROLE_LABELS[u.role] || u.role}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {u.role === 'master_admin' ? (
                <span style={{ fontSize: 12, color: '#a0aec0', fontStyle: 'italic' }}>Role locked</span>
              ) : (
                <>
                  <select
                    value={u.role}
                    disabled={updatingId === u.id}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    style={{ border: '1px solid #cbd5e0', borderRadius: 6, padding: '5px 10px', fontSize: 13, color: '#2d3748', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="operator">Gate Operator</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                  {updatingId === u.id && <FaSpinner style={{ animation: 'spin 1s linear infinite', color: '#e78524' }} />}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const labelStyle = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: '#4a5568' };
const inputStyle  = { padding: '9px 12px', border: '1px solid #cbd5e0', borderRadius: 6, fontSize: 14, color: '#2d3748', outline: 'none', background: '#fff', marginTop: 2 };
