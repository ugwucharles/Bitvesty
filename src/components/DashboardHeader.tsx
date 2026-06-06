"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { TrendingUp, LogOut, Wallet } from 'lucide-react';
import { useToast } from './Toast';
import styles from './header.module.css';

export default function DashboardHeader() {
  const { user, logout, cashBalance } = useAuth();
  const { showToast } = useToast();

  const [showLogout, setShowLogout] = React.useState(false);

  const handleLogoutClick = () => {
    logout();
    showToast('Logged out successfully.', 'info');
    setShowLogout(false);
  };

  const toggleLogout = () => setShowLogout((prev) => !prev);

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <TrendingUp size={16} strokeWidth={2.5} />
          </div>
          <h2>Bit<span>Vesty</span></h2>
        </div>

        <div className={styles.actions}>
          <div className={styles.balanceWidget}>
            <Wallet size={14} color="var(--text-secondary)" />
            <span>Cash</span>
            <strong className="tabular-nums">
              ${cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
          </div>

          <span className={styles.verticalDivider} />

          <div className={styles.profileWrap}>
            <button
              type="button"
              className={styles.profile}
              onClick={toggleLogout}
              title="Profile"
              aria-expanded={showLogout}
            >
              <div className={`${styles.avatar} ${user?.role === 'admin' ? styles.avatarAdmin : ''}`}>
                {user?.username?.substring(0, 1).toUpperCase() || 'U'}
              </div>
              <div className={styles.userInfo}>
                <span className={styles.username}>{user?.username || 'Guest'}</span>
              </div>
            </button>
            {showLogout && (
              <div className={styles.dropdown}>
                <button type="button" onClick={handleLogoutClick} className={styles.logoutBtn}>
                  <LogOut size={14} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
