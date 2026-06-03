import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { FaUserShield, FaSave, FaSpinner } from 'react-icons/fa';
import styles from './RoleManagement.module.css';

export default function RoleManagement() {
  const [usersList, setUsersList] = useState([]);
  const [updatingId, setUpdatingId] = useState(null);
  const [globalLoading, setGlobalLoading] = useState(true);

  useEffect(() => {
    fetchRegisteredUserRoles();
  }, []);

  const fetchRegisteredUserRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setUsersList(data || []);
    } catch (err) {
      alert(`Failed to load access mapping stream: ${err.message}`);
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleRoleMutation = async (userId, targetRole) => {
    setUpdatingId(userId);
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: targetRole, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;
      
      // Update local state arrays seamlessly
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, role: targetRole } : u));
    } catch (err) {
      alert(`Authorization mutation rejected: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  if (globalLoading) return <div className={styles.centerPad}><FaSpinner className={styles.spin} /> Loading Credentials...</div>;

  return (
    <div className={styles.managementPanelCard}>
      <div className={styles.panelHeader}>
        <FaUserShield className={styles.headerIcon} />
        <div>
          <h3>System Role Registry</h3>
          <p>Mutate environment permission scopes and manage gate operator privilege tiers.</p>
        </div>
      </div>

      <table className={styles.adminTable}>
        <thead>
          <tr>
            <th>User Email</th>
            <th>Account UUID Reference Token</th>
            <th>Assigned Authorization Tier</th>
          </tr>
        </thead>
        <tbody>
          {usersList.map((account) => (
            <tr key={account.id}>
              <td className={styles.emailCell}>{account.email}</td>
              <td className={styles.uuidToken}>{account.id}</td>
              <td>
                <select
                  value={account.role}
                  className={styles.roleDropdown}
                  disabled={updatingId === account.id}
                  onChange={(e) => handleRoleMutation(account.id, e.target.value)}
                >
                  <option value="operator">Gate Operator</option>
                  <option value="admin">System Admin</option>
                  <option value="super_admin">Super Admin Manager</option>
                </select>
                {updatingId === account.id && <FaSpinner className={`${styles.spin} ${styles.inlineLoader}`} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}