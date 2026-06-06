"use client";

import React from 'react';
import { useTrading } from '@/context/TradingContext';
import { useToast } from './Toast';
import { ArrowUpRight, ArrowDownRight, RefreshCw, AlertCircle } from 'lucide-react';
import styles from './holdings.module.css';

export default function HoldingsTable() {
  const { holdings, liquidatePosition } = useTrading();
  const { showToast } = useToast();

  const handleLiquidateClick = (assetId: string, symbol: string, qty: number) => {
    const result = liquidatePosition(assetId);
    if (result.success) {
      showToast(`Successfully liquidated position! Sold entire ${qty} ${symbol} holding.`, 'success');
    } else {
      showToast(result.error || 'Failed to liquidate position.', 'error');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleMeta}>
          <h3>Active Position Holdings</h3>
          <p>Portfolio distributions and current valuation</p>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        {holdings.length === 0 ? (
          <div className={styles.emptyState}>
            <AlertCircle size={24} color="var(--text-muted)" />
            <p>No active positions found.</p>
            <span>Execute a Buy order on the terminal to start trading!</span>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Asset</th>
                <th>Qty</th>
                <th>Avg. Buy</th>
                <th>Current</th>
                <th>Value</th>
                <th>Returns (PnL)</th>
                <th className={styles.cellRight}>Action</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((holding) => {
                const totalCost = holding.quantity * holding.averageBuyPrice;
                const marketVal = holding.quantity * holding.currentPrice;
                
                const pnl = marketVal - totalCost;
                const pnlPct = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
                const isGain = pnl >= 0;

                return (
                  <tr key={holding.assetId} className={styles.row}>
                    {/* Name/Symbol */}
                    <td>
                      <div className={styles.assetCell}>
                        <span className={styles.symbol}>{holding.symbol}</span>
                        <span className={styles.name}>{holding.name}</span>
                      </div>
                    </td>
                    
                    {/* Quantity */}
                    <td>
                      <span className={styles.quantity}>{holding.quantity}</span>
                    </td>
                    
                    {/* Average buy Price */}
                    <td>
                      <span className={styles.price}>
                        ${holding.averageBuyPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    
                    {/* Current Market Price */}
                    <td>
                      <span className={styles.price}>
                        ${holding.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    
                    {/* Market Value */}
                    <td>
                      <span className={styles.marketVal}>
                        ${marketVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    
                    {/* Unrealized returns */}
                    <td>
                      <div className={`${styles.pnlCell} ${isGain ? styles.positiveText : styles.negativeText}`}>
                        <div className={styles.pnlValues}>
                          <strong>{isGain ? '+' : ''}${pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                          <span>{isGain ? '+' : ''}{pnlPct.toFixed(2)}%</span>
                        </div>
                        {isGain ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      </div>
                    </td>
                    
                    {/* Action */}
                    <td className={styles.cellRight}>
                      <button
                        onClick={() => handleLiquidateClick(holding.assetId, holding.symbol, holding.quantity)}
                        className={`${styles.liquidateBtn} btn`}
                        title="Liquidate Entire Position"
                      >
                        Sell All
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
