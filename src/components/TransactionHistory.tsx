"use client";

import React from 'react';
import { useTrading } from '@/context/TradingContext';
import { ClipboardList } from 'lucide-react';
import styles from './history.module.css';

export default function TransactionHistory() {
  const { transactions } = useTrading();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Transaction Ledger</h3>
        <p>Audit trail of all executed orders</p>
      </div>

      <div className={styles.ledgerWrapper}>
        {transactions.length === 0 ? (
          <div className={styles.emptyState}>
            <ClipboardList size={22} color="var(--text-muted)" />
            <p>No transactions recorded yet.</p>
            <span>Your orders will be logged here as you trade.</span>
          </div>
        ) : (
          <div className={styles.scrollArea}>
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Asset / Details</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                  <th className={styles.cellRight}>Time</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  /* ── Withdrawal row ── */
                  if (tx.type === 'WITHDRAW') {
                    return (
                      <tr key={tx.id} className={styles.row}>
                        <td>
                          <span
                            className="badge"
                            style={{
                              background: 'rgba(251,191,36,0.15)',
                              color: '#fbbf24',
                              border: '1px solid rgba(251,191,36,0.3)',
                            }}
                          >
                            WITHDRAW
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <strong className={styles.symbol}>USD</strong>
                            {tx.bankInfo && (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {tx.bankInfo.bankName}&nbsp;···{tx.bankInfo.accountNumber.slice(-4)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={styles.value}>—</span>
                        </td>
                        <td>
                          <span className={styles.value}>
                            ${tx.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span className={styles.totalVal}>
                              ${tx.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                            <span style={{ fontSize: '11px', color: '#fbbf24' }}>● Pending</span>
                          </div>
                        </td>
                        <td className={styles.cellRight}>
                          <span className={styles.time}>{tx.timestamp}</span>
                        </td>
                      </tr>
                    );
                  }

                  /* ── Buy / Sell row ── */
                  const isBuy = tx.type === 'BUY';
                  const total = tx.quantity * tx.price;

                  return (
                    <tr key={tx.id} className={styles.row}>
                      <td>
                        <span className={`badge ${isBuy ? 'badge-success' : 'badge-danger'}`}>
                          {tx.type}
                        </span>
                      </td>
                      <td>
                        <strong className={styles.symbol}>{tx.symbol}</strong>
                      </td>
                      <td>
                        <span className={styles.value}>{tx.quantity}</span>
                      </td>
                      <td>
                        <span className={styles.value}>
                          ${tx.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td>
                        <span className={styles.totalVal}>
                          ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className={styles.cellRight}>
                        <span className={styles.time}>{tx.timestamp}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
