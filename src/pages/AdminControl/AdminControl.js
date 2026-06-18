// src/pages/AdminControl/AdminControl.js
import React, { useState } from 'react';
import styles from './AdminControl.module.css';

const AdminControl = () => {
  const [users, setUsers] = useState([
    { id: 1, email: "operator@shibir.com", role: "operator" }
  ]);
  const [formData, setFormData] = useState({ email: '', password: '', role: 'operator' });

  const handleCreateUser = (e) => {
    e.preventDefault();
    // Simply add to local state for UI preview
    const newUser = { id: Date.now(), ...formData };
    setUsers([...users, newUser]);
    alert(`User ${formData.email} created as ${formData.role}!`);
  };

  return (
    <div className={styles.container}>
      <h2>Manage User Access</h2>
      <form onSubmit={handleCreateUser} className={styles.form}>
        <input type="email" placeholder="Email" onChange={e => setFormData({...formData, email: e.target.value})} required />
        <input type="password" placeholder="Password" onChange={e => setFormData({...formData, password: e.target.value})} required />
        <select onChange={e => setFormData({...formData, role: e.target.value})}>
          <option value="operator">Operator</option>
          <option value="admin">Admin</option>
          <option value="master_admin">Master Admin</option>
        </select>
        <button type="submit">Create User</button>
      </form>

      {/* List display */}
      <div className={styles.userList}>
        {users.map(u => (
          <div key={u.id} className={styles.userItem}>
            <span>{u.email}</span>
            <span>{u.role}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminControl;