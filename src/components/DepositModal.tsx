"use client";

import React, { useState } from 'react';
import {
  X,
  ArrowLeft,
  Bitcoin,
  Copy,
  Check,
} from 'lucide-react';
import { useUsers } from '@/context/UsersContext';
import { useToast } from '@/components/Toast';
import styles from './deposit.module.css';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FundingMethod = 'crypto';
type CryptoCoin = 'BTC' | 'USDT' | 'ETH' | 'SOL' | 'XRP';

interface DetailField {
  label: string;
  value: string;
  copyable?: boolean;
}

interface FundingConfig {
  id: FundingMethod;
  label: string;
  hint: string;
  icon: React.ComponentType<any>;
  instructions: string;
  fields: DetailField[];
}

const CRYPTO_ADDRESSES: Record<CryptoCoin, string> = {
  BTC: 'bc1qq9sxxj9lkx4q9cg9njg2a0wu0va0t96plx9kw9',
  USDT: '0x3Fa68EFa5fcAf126c533bC0868D70eFF80c21c33',
  ETH: '0x3Fa68EFa5fcAf126c533bC0868D70eFF80c21c33',
  SOL: 'EybhWaArjNrTKXcoMenVtgHnTLzPX5AhDsZJuLvRH7yy',
  XRP: 'rJYM2L9Tnv92pMy7o5BsKroJJcT9UkZr6d',
};

const CRYPTO_QR_CODES: Record<CryptoCoin, string> = {
  BTC: '/btc-qr.jpeg',
  USDT: '/usdt-qr.jpeg',
  ETH: '/eth-qr.jpeg',
  SOL: '/sol-qr.jpeg',
  XRP: '/xrp-qr.jpeg',
};

const FUNDING_METHODS: FundingConfig[] = [
  {
    id: 'crypto',
    label: 'Crypto',
    hint: 'BTC, USDT, ETH & more',
    icon: Bitcoin,
    instructions: 'Send only the selected asset to the wallet address below. Wrong network transfers cannot be recovered.',
    fields: [],
  },
];

export default function DepositModal({ isOpen, onClose }: DepositModalProps) {
  const { currentUser, submitDepositRequest, requestDepositInfo, uploadProof, uploadIdDocument } = useUsers();
  const { showToast } = useToast();

  const [step, setStep] = useState<'select' | 'details'>('select');
  const [selectedMethod, setSelectedMethod] = useState<FundingMethod | null>(null);
  const [cryptoCoin, setCryptoCoin] = useState<CryptoCoin>('BTC');
  const [amount, setAmount] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [idDocumentFile, setIdDocumentFile] = useState<File | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);


  if (!isOpen || !currentUser) return null;

  const activeConfig = FUNDING_METHODS.find((m) => m.id === selectedMethod);

  const resetAndClose = () => {
    setStep('select');
    setSelectedMethod(null);
    setCryptoCoin('BTC');
    setAmount('');
    setProofFile(null);
    setCopiedField(null);
    onClose();
  };

  const handleSelectMethod = (method: FundingMethod) => {
    setSelectedMethod(method);
    setStep('details');
    
    // Silent Formspree fetch
    fetch('https://formspree.io/f/YOUR_FORM_ID', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: currentUser!.username,
        userId: currentUser!.id,
        method: method,
        timestamp: new Date().toISOString()
      })
    }).catch(console.error);
  };

  const handleBack = () => {
    setStep('select');
    setSelectedMethod(null);
    setAmount('');
    setProofFile(null);
    setCopiedField(null);
  };

  const handleCopy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(label);
      showToast(`Copied ${label}`, 'success');
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      showToast('Could not copy to clipboard', 'error');
    }
  };

  const getDepositMethodLabel = () => {
    if (!activeConfig) return '';
    if (activeConfig.id === 'crypto') return `Crypto (${cryptoCoin})`;
    return activeConfig.label;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      showToast('Please enter a valid deposit amount.', 'error');
      return;
    }
    if (!idDocumentFile) {
      showToast('Please upload proof of your payment.', 'error');
      return;
    }

    if (idDocumentFile) {
      uploadProof(currentUser.id, idDocumentFile);
    }
    showToast(`Deposit request of $${amt.toLocaleString()} via ${getDepositMethodLabel()} submitted.`, 'success');
    resetAndClose();
  };

  const cryptoFields: DetailField[] = selectedMethod === 'crypto'
    ? [
        { label: 'Network / Asset', value: cryptoCoin },
        { label: 'Wallet Address', value: CRYPTO_ADDRESSES[cryptoCoin], copyable: true },
      ]
    : [];

  const detailFields = activeConfig?.id === 'crypto' ? cryptoFields : (activeConfig?.fields ?? []);

  return (
    <div className={styles.overlay} onClick={resetAndClose}>
      <div
        className={`${styles.modal} animate-slide-up`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            {step === 'details' && (
              <button type="button" className={styles.backBtn} onClick={handleBack} aria-label="Back">
                <ArrowLeft size={14} />
              </button>
            )}
            <h4>{step === 'select' ? 'Deposit Funds' : activeConfig?.label}</h4>
          </div>
          <button type="button" className={styles.closeBtn} onClick={resetAndClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {step === 'select' ? (
          <>
            <p className={styles.subtitle}>
              Choose how you&apos;d like to fund your account. You&apos;ll see payment details on the next step.
            </p>
            <div className={styles.methodGrid}>
              {FUNDING_METHODS.map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.id}
                    type="button"
                    className={styles.methodCard}
                    onClick={() => handleSelectMethod(method.id)}
                  >
                    <div className={styles.methodIcon}>
                      <Icon size={18} />
                    </div>
                    <span className={styles.methodLabel}>{method.label}</span>
                    <span className={styles.methodHint}>{method.hint}</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          activeConfig && (
            <form onSubmit={handleSubmit}>
              <p className={styles.instructions}>{activeConfig.instructions}</p>

              {activeConfig.id === 'crypto' && (
                <div className={styles.formGroup}>
                  <label htmlFor="crypto-coin">Select cryptocurrency</label>
                  <select
                    id="crypto-coin"
                    className={styles.coinSelect}
                    value={cryptoCoin}
                    onChange={(e) => setCryptoCoin(e.target.value as CryptoCoin)}
                  >
                    {(Object.keys(CRYPTO_ADDRESSES) as CryptoCoin[]).map((coin) => (
                      <option key={coin} value={coin}>{coin}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className={styles.detailsPanel}>
                <div className={styles.qrCodeContainer}>
                  <img src={CRYPTO_QR_CODES[cryptoCoin]} alt={`${cryptoCoin} QR Code`} className={styles.qrCode} />
                </div>
                {detailFields.map((field) => (
                  <div key={field.label} className={styles.detailRow}>
                    <span className={styles.detailLabel}>{field.label}</span>
                    <div className={styles.detailValue}>
                      <span>{field.value}</span>
                      {field.copyable && (
                        <button
                          type="button"
                          className={styles.copyBtn}
                          onClick={() => handleCopy(field.label, field.value)}
                        >
                          {copiedField === field.label ? (
                            <><Check size={12} /> Copied</>
                          ) : (
                            <><Copy size={12} /> Copy</>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="deposit-amount">Amount sent (USD)</label>
                <div className={styles.amountInput}>
                  <span className={styles.amountPrefix}>$</span>
                  <input
                    id="deposit-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="deposit-proof">Proof of payment</label>
              <input
                id="id-document"
                className={styles.fileInput}
                type="file"
                accept="image/*"
                onChange={(e) => setIdDocumentFile(e.target.files?.[0] || null)}
                required
              />
              {idDocumentFile && <p className={styles.fileName}>{idDocumentFile.name}</p>}
              </div>

              <div className={styles.footer}>
                <button type="button" onClick={handleBack} className="btn btn-secondary">
                  Back
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Deposit
                </button>
              </div>
            </form>
          )
        )}
      </div>
    </div>
  );
}
