// "use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useUsers } from '@/context/UsersContext';
import { useToast } from './Toast';
import styles from './adminHeader.module.css';

export default function AdminHeader() {
  const { user, logout } = useAuth();
  const { users } = useUsers();
  const { showToast } = useToast();
  const router = useRouter();
  const [showLogout, setShowLogout] = useState(false);

  const pendingCount = users.filter((u) => u.role === 'user' && !u.active).length;

  const handleLogout = () => {
    logout();
    showToast('Admin session ended.', 'info');
    router.replace('/login');
  };

  const toggleLogout = () => setShowLogout((prev) => !prev);

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.brand}>
          <div className={styles.logoIcon}>
            <Shield size={20} />
          </div>
          <div>
            <h2>Bit<span>Vesty</span> Admin</h2>
            <p>User Management Console</p>
          </div>
        </div>
        <div className={styles.actions}>
          
          <button
            type="button"
            className={styles.profile}
            onClick={toggleLogout}
            title="Profile"
          >
            <div className={styles.avatar}>
              {user?.username?.substring(0, 1).toUpperCase() || 'A'}
            </div>
            <div className={styles.userInfo}>
              <span className={styles.username}>{user?.username || 'Admin'}</span>
              <span className={styles.roleLabel}>Administrator</span>
            </div>
            <LogOut size={16} className={styles.logoutIcon} />
          </button>
          {showLogout && (
            <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
              Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
