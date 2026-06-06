"use client";

import React from 'react';
import { useTrading } from '@/context/TradingContext';
import { TrendingUp, TrendingDown, Eye } from 'lucide-react';
import styles from './market.module.css';

export default function MarketWatch() {
  const { assets, activeAsset, setActiveAssetId } = useTrading();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Market Watch</h3>
        <p>Real-time mock ticking prices</p>
      </div>

      <div className={styles.tableWrapper}>
        <table>
          <thead>
            <tr>
              <th>Asset</th>
              <th>Price</th>
              <th>24h Chg</th>
              <th className={styles.cellRight}>Action</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => {
              const isActive = asset.id === activeAsset.id;
              const isChangePositive = asset.change24h >= 0;
              
              // Flashing color trigger on price ticks
              let flashClass = '';
              if (asset.prevPrice !== undefined && asset.prevPrice !== asset.price) {
                flashClass = asset.price > asset.prevPrice ? 'price-up-flash' : 'price-down-flash';
              }

              return (
                <tr
                  key={asset.id}
                  className={`${styles.row} ${isActive ? styles.activeRow : ''}`}
                  onClick={() => setActiveAssetId(asset.id)}
                >
                  {/* Symbol & Name */}
                  <td>
                    <div className={styles.assetCell}>
                      <span className={styles.symbol}>{asset.symbol}</span>
                      <span className={styles.name}>{asset.name}</span>
                    </div>
                  </td>
                  
                  {/* Dynamic Price with key to re-trigger tick animations */}
                  <td>
                    <span 
                      key={asset.price} 
                      className={`${styles.price} ${flashClass}`}
                    >
                      ${asset.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  
                  {/* 24h Change percentage */}
                  <td>
                    <div className={`${styles.changeCell} ${isChangePositive ? styles.positiveText : styles.negativeText}`}>
                      {isChangePositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      <span>{isChangePositive ? '+' : ''}{asset.change24h.toFixed(2)}%</span>
                    </div>
                  </td>
                  
                  {/* View Asset details button */}
                  <td className={styles.cellRight}>
                    <button 
                      className={`${styles.viewBtn} ${isActive ? styles.viewBtnActive : ''}`}
                      title="Inspect Asset"
                    >
                      <Eye size={14} />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
