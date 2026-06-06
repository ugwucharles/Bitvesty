"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AlertCircle } from 'lucide-react';

import DashboardHeader from '@/components/DashboardHeader';
import PortfolioSummary from '@/components/PortfolioSummary';
import MarketWatch from '@/components/MarketWatch';
import PriceChart from '@/components/PriceChart';
import TradingPanel from '@/components/TradingPanel';
import HoldingsTable from '@/components/HoldingsTable';
import TransactionHistory from '@/components/TransactionHistory';
import PageLoader from '@/components/PageLoader';

import styles from './dashboard.module.css';

export default function DashboardPage() {
  const { isLoggedIn, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isLoggedIn) {
      router.replace('/login');
      return;
    }
    if (user?.role === 'admin') {
      router.replace('/admin');
    }
  }, [isLoggedIn, isLoading, user, router]);

  if (isLoading || !isLoggedIn || user?.role === 'admin') {
    return <PageLoader message="Verifying credentials..." />;
  }

  return (
    <div className={`${styles.dashboardContainer} animate-fade-in`}>
      <DashboardHeader />

      <main className={styles.mainContent}>
        <div className={styles.container}>
          {!user?.active && (
            <div className={`alert alert-warning ${styles.verificationBanner}`}>
              <AlertCircle size={18} />
              <span>Your account is in review. Once verified by an admin, you can start trading.</span>
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
              Welcome, {user?.username}!
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              Here is your portfolio overview.
            </p>
          </div>

          <section className={styles.sectionSummary}>
            <PortfolioSummary />
          </section>

          {user?.active ? (
            <div className={styles.tradingGrid}>
              <div className={styles.leftColumn}>
                <div className={styles.gridRowChart}>
                  <PriceChart />
                </div>
                <div className={styles.gridRowHoldings}>
                  <HoldingsTable />
                </div>
                <div className={styles.gridRowHistory}>
                  <TransactionHistory />
                </div>
              </div>

              <div className={styles.rightColumn}>
                <div className={styles.gridRowPanel}>
                  <TradingPanel />
                </div>
                <div className={styles.gridRowMarkets}>
                  <MarketWatch />
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.lockedState}>
              Trading and market features are locked pending account verification.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
