"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTrading } from '@/context/TradingContext';
import { useToast } from './Toast';
import { useUsers } from '@/context/UsersContext';
import VerificationModal from '@/components/VerificationModal';
import DepositModal from '@/components/DepositModal';
import { ArrowUpRight, ArrowDownRight, DollarSign, Wallet, Percent, PlusCircle, MinusCircle, X, Building2, CreditCard, User, Hash } from 'lucide-react';
import styles from './summary.module.css';

export default function PortfolioSummary() {
  const { cashBalance, withdrawFunds } = useAuth();
  const { holdings, aiBotActive, aiBotAmount, aiBotCurrentMultiplier } = useTrading();
  const { addWithdrawTransaction } = useTrading();
  const { showToast } = useToast();
  const { currentUser } = useUsers();

  const [activeModal, setActiveModal] = useState<'deposit' | 'withdraw' | null>(null);
  // withdraw flow: 'amount' → 'bank' → 'done'
  const [withdrawStep, setWithdrawStep] = useState<'amount' | 'bank' | 'done'>('amount');
  const [modalAmount, setModalAmount] = useState('');
  const [bankInfo, setBankInfo] = useState({ accountName: '', routingNumber: '', accountNumber: '', bankName: '' });
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  // Calculate portfolio values (manual holdings)
  const holdingsValue = holdings.reduce((sum, h) => sum + (h.quantity * h.currentPrice), 0);
  const holdingsCost = holdings.reduce((sum, h) => sum + (h.quantity * h.averageBuyPrice), 0);

  // Include AI Bot live unrealized value
  const aiBotCurrentValue = aiBotActive ? aiBotAmount * aiBotCurrentMultiplier : 0;
  const aiBotCostBasis = aiBotActive ? aiBotAmount : 0;

  const totalValue = holdingsValue + aiBotCurrentValue;
  const totalCost = holdingsCost + aiBotCostBasis;
  const netAssetValue = cashBalance + totalValue;
  
  const totalPnL = totalValue - totalCost;
  const pnlPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;
  const isGain = totalPnL >= 0;

  const handleDepositClick = () => {
    if (!currentUser?.active) {
      setShowVerificationModal(true);
      return;
    }
    setActiveModal('deposit');
  };

  const handleWithdrawAmountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(modalAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast('Please enter a valid withdrawal amount.', 'error');
      return;
    }
    if (amt > cashBalance) {
      showToast(`Insufficient balance. You only have $${cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} available.`, 'error');
      return;
    }
    // Enough balance — move to bank info step
    setWithdrawStep('bank');
  };

  const handleWithdrawBankSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(modalAmount);
    // Deduct balance
    withdrawFunds(amt);
    // Log pending withdrawal in ledger
    addWithdrawTransaction(amt, { ...bankInfo });
    // Move to done step
    setWithdrawStep('done');
  };

  const closeWithdrawModal = () => {
    setActiveModal(null);
    setWithdrawStep('amount');
    setModalAmount('');
    setBankInfo({ accountName: '', routingNumber: '', accountNumber: '', bankName: '' });
  };

  return (
    <div className={styles.summaryGrid}>
      {/* Net Asset Value (NAV) */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span>Net Asset Value (NAV)</span>
          <div className={`${styles.iconBg} ${styles.navIcon}`}>
            <DollarSign size={18} />
          </div>
        </div>
        <div className={styles.cardContent}>
          <h3 className="tabular-nums">${netAssetValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          <p className={styles.subtext}>
            {aiBotActive 
              ? `Cash + Holdings + AI Bot ($${aiBotCurrentValue.toLocaleString('en-US', { minimumFractionDigits: 2 })})` 
              : 'Cash + Active Holdings Valuation'}
          </p>
        </div>
      </div>

      {/* Available Cash Balance */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span>Available Cash</span>
          <div className={`${styles.iconBg} ${styles.cashIcon}`}>
            <Wallet size={18} />
          </div>
        </div>
        <div className={styles.cardContent}>
          <h3 className="tabular-nums">${cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          <div className={styles.actionButtons}>
            <button onClick={handleDepositClick} className={`${styles.actionBtn} ${styles.depositBtn}`}>
              <PlusCircle size={14} />
              <span>Deposit</span>
            </button>
            <button onClick={() => { setActiveModal('withdraw'); setWithdrawStep('amount'); }} className={`${styles.actionBtn} ${styles.withdrawBtn}`}>
              <MinusCircle size={14} />
              <span>Withdraw</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Portfolio Unrealized Return */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span>Unrealized Returns (PnL)</span>
          <div className={`${styles.iconBg} ${isGain ? styles.gainIcon : styles.lossIcon}`}>
            {isGain ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
          </div>
        </div>
        <div className={styles.cardContent}>
          <h3 className={`tabular-nums ${isGain ? styles.valuePositive : styles.valueNegative}`}>
            {isGain ? '+' : ''}${totalPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <div className={styles.pnlPercentRow}>
            <Percent size={14} color={isGain ? 'var(--buy)' : 'var(--sell)'} />
            <span className={isGain ? styles.pnlPositive : styles.pnlNegative}>
              {isGain ? '+' : ''}{pnlPercent.toFixed(2)}%
            </span>
            <span className={styles.subtext}>all-time holdings yield</span>
          </div>
        </div>
      </div>

      {/* Verification Modal */}
      <VerificationModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        message="Your account is not activated/verified. Please contact admin to activate before depositing."
      />

      {activeModal === 'deposit' && (
        <DepositModal isOpen={true} onClose={() => setActiveModal(null)} />
      )}

      {activeModal === 'withdraw' && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} animate-slide-up`}>

            {/* ── STEP 1: Enter amount ── */}
            {withdrawStep === 'amount' && (
              <>
                <div className={styles.modalHeader}>
                  <h4>Withdraw Funds</h4>
                  <button onClick={closeWithdrawModal} className={styles.modalClose}><X size={18} /></button>
                </div>
                <form onSubmit={handleWithdrawAmountSubmit}>
                  <p className={styles.modalSub}>
                    Available balance: <strong>${cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                  </p>
                  <div className={styles.inputContainer}>
                    <span className={styles.currencyPrefix}>$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={modalAmount}
                      inputMode="decimal"
                      onKeyDown={(e) => {
                        const allowed = ['Backspace','Delete','Tab','Escape','Enter','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','.'];
                        if (allowed.includes(e.key)) return;
                        if (!/^\d$/.test(e.key)) e.preventDefault();
                      }}
                      onChange={(e) => setModalAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                      autoFocus
                      required
                    />
                  </div>
                  <div className={styles.modalFooter}>
                    <button type="button" onClick={closeWithdrawModal} className="btn btn-secondary">Cancel</button>
                    <button type="submit" className="btn btn-danger">Continue</button>
                  </div>
                </form>
              </>
            )}

            {/* ── STEP 2: Bank info ── */}
            {withdrawStep === 'bank' && (
              <>
                <div className={styles.modalHeader}>
                  <h4>Bank Account Details</h4>
                  <button onClick={closeWithdrawModal} className={styles.modalClose}><X size={18} /></button>
                </div>
                <p className={styles.modalSub}>
                  Withdrawing <strong>${parseFloat(modalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>. Enter your US bank details below.
                </p>
                <form onSubmit={handleWithdrawBankSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Account Name */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Account Holder Name</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 12px' }}>
                      <User size={15} color="var(--text-muted)" />
                      <input
                        type="text"
                        placeholder="Full legal name"
                        value={bankInfo.accountName}
                        onChange={(e) => setBankInfo(p => ({ ...p, accountName: e.target.value }))}
                        required
                        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', padding: '10px 0', fontSize: '14px' }}
                      />
                    </div>
                  </div>
                  {/* Bank Name */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Bank Name</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 12px' }}>
                      <Building2 size={15} color="var(--text-muted)" />
                      <input
                        type="text"
                        placeholder="e.g. Chase, Bank of America"
                        value={bankInfo.bankName}
                        onChange={(e) => setBankInfo(p => ({ ...p, bankName: e.target.value }))}
                        required
                        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', padding: '10px 0', fontSize: '14px' }}
                      />
                    </div>
                  </div>
                  {/* Routing Number */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Routing Number (9 digits)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 12px' }}>
                      <Hash size={15} color="var(--text-muted)" />
                      <input
                        type="text"
                        placeholder="000000000"
                        value={bankInfo.routingNumber}
                        inputMode="numeric"
                        maxLength={9}
                        onKeyDown={(e) => { if (!/^\d$/.test(e.key) && !['Backspace','Delete','Tab','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault(); }}
                        onChange={(e) => setBankInfo(p => ({ ...p, routingNumber: e.target.value.replace(/\D/g, '').slice(0, 9) }))}
                        required
                        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', padding: '10px 0', fontSize: '14px', letterSpacing: '2px' }}
                      />
                    </div>
                  </div>
                  {/* Account Number */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Account Number</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 12px' }}>
                      <CreditCard size={15} color="var(--text-muted)" />
                      <input
                        type="text"
                        placeholder="Enter account number"
                        value={bankInfo.accountNumber}
                        inputMode="numeric"
                        maxLength={17}
                        onKeyDown={(e) => { if (!/^\d$/.test(e.key) && !['Backspace','Delete','Tab','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault(); }}
                        onChange={(e) => setBankInfo(p => ({ ...p, accountNumber: e.target.value.replace(/\D/g, '').slice(0, 17) }))}
                        required
                        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', padding: '10px 0', fontSize: '14px', letterSpacing: '2px' }}
                      />
                    </div>
                  </div>
                  <div className={styles.modalFooter}>
                    <button type="button" onClick={() => setWithdrawStep('amount')} className="btn btn-secondary">Back</button>
                    <button type="submit" className="btn btn-danger">Confirm Withdrawal</button>
                  </div>
                </form>
              </>
            )}

            {/* ── STEP 3: Pending confirmation ── */}
            {withdrawStep === 'done' && (
              <div style={{ textAlign: 'center', padding: '32px 20px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(251,191,36,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </div>
                <h4 style={{ marginBottom: '10px' }}>Withdrawal Pending</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '8px' }}>
                  Your withdrawal of <strong>${parseFloat(modalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong> has been submitted.
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.6', marginBottom: '28px' }}>
                  Funds will be processed and deposited to <strong>{bankInfo.bankName}</strong> within <strong>7 working days</strong>. You will be notified once the transfer is complete.
                </p>
                <button onClick={closeWithdrawModal} className="btn btn-primary" style={{ width: '100%' }}>Done</button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
