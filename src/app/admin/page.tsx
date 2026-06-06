"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Users,
  UserCheck,
  UserX,
  Wallet,
  Mail,
  Phone,
  Shield,
  Key,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useUsers } from '@/context/UsersContext';
import AdminHeader from '@/components/AdminHeader';
import PageLoader from '@/components/PageLoader';
import styles from './admin.module.css';

type FilterTab = 'all' | 'pending' | 'active';

export default function AdminPage() {
  const router = useRouter();
  const { user, isLoggedIn, isLoading } = useAuth();
  const { users, activateUser, adminDepositToUser, deleteAccount, adminProvideDepositInfo } = useUsers();

  const [filter, setFilter] = useState<FilterTab>('all');
  const [depositAmounts, setDepositAmounts] = useState<Record<string, string>>({});
  const [infoInputs, setInfoInputs] = useState<Record<string, Record<string, string>>>({});

  const getFieldsForMethod = (method: string) => {
    switch (method) {
      case 'cash_app': return ['Cashtag', 'Display Name'];
      case 'crypto': return ['Network / Asset', 'Wallet Address'];
      case 'paypal': return ['PayPal Email', 'Payment Type'];
      case 'venmo': return ['Venmo Username', 'Payment Type'];
      case 'zelle': return ['Zelle Email', 'Recipient Name'];
      default: return ['Payment Details'];
    }
  };

  useEffect(() => {
    if (isLoading) return;
    if (!isLoggedIn) {
      router.replace('/login');
      return;
    }
    if (user?.role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [isLoading, isLoggedIn, user, router]);

  const stats = useMemo(() => {
    const regularUsers = users.filter((u) => u.role === 'user');
    return {
      total: regularUsers.length,
      pending: regularUsers.filter((u) => !u.active).length,
      active: regularUsers.filter((u) => u.active).length,
      totalBalance: regularUsers.reduce((sum, u) => sum + u.balance, 0),
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const regularUsers = users.filter((u) => u.role === 'user');
    if (filter === 'pending') return regularUsers.filter((u) => !u.active);
    if (filter === 'active') return regularUsers.filter((u) => u.active);
    return regularUsers;
  }, [users, filter]);

  const handleToggle = (id: string, current: boolean) => {
    activateUser(id, !current);
  };

  const handleDepositChange = (id: string, value: string) => {
    setDepositAmounts((prev) => ({ ...prev, [id]: value }));
  };

  const handleDeposit = (id: string) => {
    const amount = parseFloat(depositAmounts[id]);
    if (!isNaN(amount) && amount > 0) {
      adminDepositToUser(id, amount);
      setDepositAmounts((prev) => ({ ...prev, [id]: '' }));
    }
  };

  if (isLoading || !isLoggedIn || user?.role !== 'admin') {
    return <PageLoader message="Loading admin console..." />;
  }

  return (
    <div className={styles.adminPage}>
      <AdminHeader />

      <main className={styles.main}>
        <div className={styles.pageInner}>
          <section className={styles.pageIntro}>
            <h1>User Management</h1>
            <p>Activate accounts, review registrations, and manage user balances.</p>
          </section>

          <section className={`scroll-rail ${styles.statsRail}`}>
            <div className={`${styles.statCard} scroll-rail-item`}>
              <div className={styles.statIcon}><Users size={18} /></div>
              <div>
                <span className={styles.statLabel}>Total Users</span>
                <strong>{stats.total}</strong>
              </div>
            </div>
            <div className={`${styles.statCard} scroll-rail-item`}>
              <div className={`${styles.statIcon} ${styles.statIconPending}`}><UserX size={18} /></div>
              <div>
                <span className={styles.statLabel}>Pending Approval</span>
                <strong>{stats.pending}</strong>
              </div>
            </div>
            <div className={`${styles.statCard} scroll-rail-item`}>
              <div className={`${styles.statIcon} ${styles.statIconActive}`}><UserCheck size={18} /></div>
              <div>
                <span className={styles.statLabel}>Active Users</span>
                <strong>{stats.active}</strong>
              </div>
            </div>
          </section>

          <section className={styles.usersSection}>
            <div className={styles.sectionHeader}>
              <div>
                <h2>Registered Users</h2>
                <p>{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} shown</p>
              </div>
              <div className={styles.filterTabs}>
                {(['all', 'pending', 'active'] as FilterTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={`${styles.filterTab} ${filter === tab ? styles.filterTabActive : ''}`}
                    onClick={() => setFilter(tab)}
                  >
                    {tab === 'all' ? 'All' : tab === 'pending' ? 'Pending' : 'Active'}
                  </button>
                ))}
              </div>
            </div>

            {filteredUsers.length === 0 ? (
              <div className={styles.emptyState}>
                <Users size={32} />
                <p>No users in this view.</p>
              </div>
            ) : (
              <>
                <div className={`scroll-rail ${styles.cardsRail}`}>
                  {filteredUsers.map((u) => (
                    <article key={u.id} className={`${styles.userCard} scroll-rail-item`}>
                      <div className={styles.userCardTop}>
                        <div className={styles.userAvatar}>{u.username.charAt(0).toUpperCase()}</div>
                        <div className={styles.userMeta}>
                          <strong>{u.username}</strong>
                          <span>ID: {u.id}</span>
                        </div>
                        <span className={`badge ${u.active ? 'badge-success' : 'badge-danger'}`}>
                          {u.active ? 'Active' : 'Pending'}
                        </span>
                      </div>

                      <div className={styles.userDetails}>
                        {u.email && (
                          <div className={styles.detailRow}>
                            <Mail size={14} />
                            <span>{u.email}</span>
                          </div>
                        )}
                        {u.phone && (
                          <div className={styles.detailRow}>
                            <Phone size={14} />
                            <span>{u.phone}</span>
                          </div>
                        )}
                        {u.password && (
                          <div className={styles.detailRow}>
                            <Key size={14} />
                            <span>{u.password}</span>
                          </div>
                        )}
                        <div className={styles.detailRow}>
                          <Wallet size={14} />
                          <span>{u.balance.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</span>
                        </div>

                        {/* Identity Verification */}
                        {u.idType && (
                          <div className={styles.detailRow} style={{ marginTop: '8px', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                            <strong style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ID Verification</strong>
                            <span style={{ fontSize: '12px', background: 'rgba(99,102,241,0.15)', color: '#818cf8', padding: '2px 8px', borderRadius: '4px' }}>
                              {u.idType.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                            </span>
                            {u.idFields && Object.entries(u.idFields).filter(([, v]) => v).map(([key, val]) => (
                              <div key={key} style={{ display: 'flex', gap: '6px', fontSize: '12px', width: '100%' }}>
                                <span style={{ color: 'var(--text-secondary)', minWidth: '110px', textTransform: 'capitalize' }}>
                                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                                </span>
                                <span>{val}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* ID Document image */}
                        {u.idDocumentUrl && (
                          <div className={styles.detailRow} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                            <strong style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ID Document</strong>
                            <img src={u.idDocumentUrl} alt="ID Document" style={{ maxWidth: '100%', borderRadius: '6px' }} />
                          </div>
                        )}
                        {/* Proof of deposit */}
                        {u.proofUrl && (
                          <div className={styles.detailRow} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                            <strong style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Proof of Deposit</strong>
                            <img src={u.proofUrl} alt="Proof of Deposit" style={{ maxWidth: '100%', borderRadius: '6px' }} />
                          </div>
                        )}

                        {/* Deposit Method Request */}
                        {u.depositMethodRequest && (
                          <div className={styles.detailRow} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px', marginTop: '8px' }}>
                            <strong style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Deposit Request</strong>
                            <span style={{ fontSize: '12px' }}>Method: <b>{u.depositMethodRequest.method}</b></span>
                            <span style={{ fontSize: '12px' }}>At: {new Date(u.depositMethodRequest.requestedAt).toLocaleString()}</span>
                            {u.depositMethodRequest.infoProvided && (
                              <span style={{ fontSize: '12px' }}>Info sent: {u.depositMethodRequest.infoProvided}</span>
                            )}
                          </div>
                        )}

                        {/* Pending Deposits */}
                        {u.pendingDeposits && u.pendingDeposits.length > 0 && (
                          <div className={styles.detailRow} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px', marginTop: '8px' }}>
                            <strong style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pending Deposits</strong>
                            {u.pendingDeposits.map((dep) => (
                              <div key={dep.id} style={{ fontSize: '12px', padding: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', width: '100%' }}>
                                <p style={{ margin: '2px 0' }}><b>${dep.amount.toLocaleString()}</b> via {dep.currency}</p>
                                <p style={{ margin: '2px 0', color: 'var(--text-secondary)' }}>Status: {dep.status}</p>
                                <p style={{ margin: '2px 0', color: 'var(--text-secondary)', fontSize: '11px' }}>{new Date(dep.timestamp).toLocaleString()}</p>
                                {dep.proofUrl && <img src={dep.proofUrl} alt="Deposit Proof" style={{ maxWidth: '100%', borderRadius: '4px', marginTop: '4px' }} />}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className={styles.userActions}>
                        <button
                          type="button"
                          className={u.active ? styles.deactivateBtn : styles.activateBtn}
                          onClick={() => handleToggle(u.id, u.active)}
                        >
                          {u.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <div className={styles.depositRow}>
                          <input
                            type="number"
                            placeholder="Deposit $"
                            value={depositAmounts[u.id] || ''}
                            onChange={(e) => handleDepositChange(u.id, e.target.value)}
                            className={styles.depositInput}
                            min="0"
                          />
                          <button type="button" className={styles.depositBtn} onClick={() => handleDeposit(u.id)}>
                            <Plus size={16} />
                          </button>
                        </div>
                        <button
                          type="button"
                          className={styles.deleteBtn}
                          onClick={() => {
                            if (confirm('Delete this account?')) {
                              deleteAccount(u.id);
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                      
                      {u.depositMethodRequest && !u.depositMethodRequest.infoProvided && (
                        <div className={styles.infoFormBox}>
                          <p className={styles.infoFormTitle}>
                            <strong>Action Required:</strong> Provide info for <strong>{u.depositMethodRequest.method}</strong>.
                          </p>
                          <div className={styles.infoFormFields}>
                            {getFieldsForMethod(u.depositMethodRequest.method).map((field) => (
                              <div key={field} className={styles.infoFormRow}>
                                <label className={styles.infoFormLabel}>{field}:</label>
                                <input
                                  type="text"
                                  placeholder={`Enter ${field}...`}
                                  value={infoInputs[u.id]?.[field] || ''}
                                  onChange={(e) => setInfoInputs((prev) => ({ 
                                    ...prev, 
                                    [u.id]: { ...(prev[u.id] || {}), [field]: e.target.value } 
                                  }))}
                                  className={styles.infoFormInput}
                                />
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                const userInputs = infoInputs[u.id];
                                if (userInputs && Object.keys(userInputs).length > 0) {
                                  const formattedInfo = Object.entries(userInputs).map(([label, value]) => ({ label, value }));
                                  adminProvideDepositInfo(u.id, JSON.stringify(formattedInfo));
                                  setInfoInputs((prev) => {
                                    const next = { ...prev };
                                    delete next[u.id];
                                    return next;
                                  });
                                }
                              }}
                              className={styles.infoFormSubmit}
                            >
                              Send Details
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  ))}
                </div>

                <div className={styles.tableWrap}>
                  <table className={styles.userTable}>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Contact</th>
                        <th>Status</th>
                        <th>Balance</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => (
                        <tr key={u.id}>
                          <td>
                            <div className={styles.tableUser}>
                              <div className={styles.userAvatar}>{u.username.charAt(0).toUpperCase()}</div>
                              <div>
                                <strong>{u.username}</strong>
                                <span>ID {u.id}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className={styles.tableContact}>
                              {u.email && <span>{u.email}</span>}
                              {u.phone && <span>{u.phone}</span>}
                              {u.password && <span><Key size={12} className={styles.inlineKey} />{u.password}</span>}
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${u.active ? 'badge-success' : 'badge-danger'}`}>
                              {u.active ? 'Active' : 'Pending'}
                            </span>
                          </td>
                          <td>{u.balance.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</td>
                          <td>
                            <div className={styles.tableActions}>
                              <button
                                type="button"
                                className={u.active ? styles.deactivateBtn : styles.activateBtn}
                                onClick={() => handleToggle(u.id, u.active)}
                              >
                                {u.active ? 'Deactivate' : 'Activate'}
                              </button>
                              <div className={styles.depositRow}>
                                <input
                                  type="number"
                                  placeholder="Amount"
                                  value={depositAmounts[u.id] || ''}
                                  onChange={(e) => handleDepositChange(u.id, e.target.value)}
                                  className={styles.depositInput}
                                  min="0"
                                />
                                <button type="button" className={styles.depositBtn} onClick={() => handleDeposit(u.id)}>
                                  <Plus size={14} />
                                </button>
                              </div>
                              <button
                                type="button"
                                className={styles.deleteBtn}
                                onClick={() => {
                                  if (confirm('Delete this account?')) {
                                    deleteAccount(u.id);
                                  }
                                }}
                              >
                                Delete
                              </button>
                            </div>
                            {u.depositMethodRequest && !u.depositMethodRequest.infoProvided && (
                              <div className={styles.tableInfoForm}>
                                {getFieldsForMethod(u.depositMethodRequest.method).map((field) => (
                                  <div key={field} className={styles.tableInfoRow}>
                                    <span className={styles.tableInfoLabel}>{field}:</span>
                                    <input
                                      type="text"
                                      placeholder="..."
                                      value={infoInputs[u.id]?.[field] || ''}
                                      onChange={(e) => setInfoInputs((prev) => ({ 
                                        ...prev, 
                                        [u.id]: { ...(prev[u.id] || {}), [field]: e.target.value } 
                                      }))}
                                      className={styles.tableInfoInput}
                                    />
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const userInputs = infoInputs[u.id];
                                    if (userInputs && Object.keys(userInputs).length > 0) {
                                      const formattedInfo = Object.entries(userInputs).map(([label, value]) => ({ label, value }));
                                      adminProvideDepositInfo(u.id, JSON.stringify(formattedInfo));
                                      setInfoInputs((prev) => {
                                        const next = { ...prev };
                                        delete next[u.id];
                                        return next;
                                      });
                                    }
                                  }}
                                  className={styles.tableInfoSubmit}
                                >
                                  Send Details
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          <section className={styles.adminNote}>
            <Shield size={18} />
            <p>Admin accounts are hidden from this list. Only registered traders appear here for activation and funding.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
