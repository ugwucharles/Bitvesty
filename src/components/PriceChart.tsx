"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Asset } from '@/types/trading';
import { useTrading } from '@/context/TradingContext';
import { Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import styles from './chart.module.css';

type Timeframe = '1D' | '1W' | '1M' | '1Y';

export default function PriceChart() {
  const { activeAsset } = useTrading();
  const [timeframe, setTimeframe] = useState<Timeframe>('1D');
  
  // Custom mock data generator based on selected asset price and timeframe
  const [chartData, setChartData] = useState<{ price: number; label: string }[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<{ price: number; label: string; x: number; y: number } | null>(null);
  
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Generate historical curve data
  useEffect(() => {
    const endPrice = activeAsset.price;
    const pointsCount = timeframe === '1D' ? 24 : timeframe === '1W' ? 30 : timeframe === '1M' ? 30 : 45;
    
    // Generate simulated wave curve that ends exactly at current active price
    const generated: { price: number; label: string }[] = [];
    const baseSeed = activeAsset.id === 'btc' ? 0.05 : activeAsset.id === 'eth' ? 0.06 : 0.08;
    
    for (let i = 0; i < pointsCount; i++) {
      const progress = i / (pointsCount - 1);
      
      // Multi-frequency sine waves to look like organic trading curves
      const wave = Math.sin(progress * Math.PI * 3.5) * baseSeed * 0.4 + 
                   Math.cos(progress * Math.PI * 1.5) * baseSeed * 0.3 +
                   Math.sin(progress * Math.PI * 7) * baseSeed * 0.1;
      
      // Calculate multiplier making sure progress = 1 ends at 100% of endPrice
      const targetVal = progress === 1 ? 1 : 1 + wave - (Math.sin(Math.PI * 3.5) * baseSeed * 0.4 + Math.cos(Math.PI * 1.5) * baseSeed * 0.3 + Math.sin(Math.PI * 7) * baseSeed * 0.1) * (1 - progress);
      const price = Number((endPrice * targetVal).toFixed(2));
      
      // Labels
      let label = '';
      if (timeframe === '1D') {
        const hour = Math.floor(progress * 24);
        label = `${hour}:00`;
      } else if (timeframe === '1W') {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const dayIdx = Math.floor(progress * 7) % 7;
        label = days[dayIdx];
      } else if (timeframe === '1M') {
        const dayNum = Math.floor(progress * 30) + 1;
        label = `Day ${dayNum}`;
      } else {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthIdx = Math.floor(progress * 12) % 12;
        label = months[monthIdx];
      }

      generated.push({ price, label });
    }
    
    setChartData(generated);
    setHoveredPoint(null);
  }, [activeAsset.price, activeAsset.id, timeframe]);

  if (chartData.length === 0) return null;

  // Viewport parameters
  const svgWidth = 600;
  const svgHeight = 260;
  const paddingX = 40;
  const paddingY = 30;

  // Compute scale boundaries
  const prices = chartData.map((d) => d.price);
  const minPrice = Math.min(...prices) * 0.995;
  const maxPrice = Math.max(...prices) * 1.005;
  const deltaPrice = maxPrice - minPrice;

  // Convert data items into absolute X/Y coordinate pairs
  const points = chartData.map((item, idx) => {
    const x = paddingX + (idx / (chartData.length - 1)) * (svgWidth - paddingX * 2);
    const y = svgHeight - paddingY - ((item.price - minPrice) / deltaPrice) * (svgHeight - paddingY * 2);
    return { x, y, price: item.price, label: item.label };
  });

  // Polyline points string
  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  // Gradient area points string (appends bottom anchors)
  const gradientPoints = `${points[0].x},${svgHeight - paddingY} ${polylinePoints} ${points[points.length - 1].x},${svgHeight - paddingY}`;

  // Interactive mouse move listener to trace crosshair
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    // Scale client X to SVG local width
    const clientX = e.clientX - rect.left;
    const localX = (clientX / rect.width) * svgWidth;

    // Constrain within mapping bounds
    if (localX < paddingX || localX > svgWidth - paddingX) {
      setHoveredPoint(null);
      return;
    }

    // Find closest index
    const relativeX = (localX - paddingX) / (svgWidth - paddingX * 2);
    const index = Math.round(relativeX * (chartData.length - 1));
    
    if (index >= 0 && index < points.length) {
      const p = points[index];
      setHoveredPoint({ price: p.price, label: p.label, x: p.x, y: p.y });
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  const isGain = activeAsset.change24h >= 0;
  const strokeColor = isGain ? '#0ECB81' : '#F6465D';
  const gradientColor = isGain ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';

  return (
    <div className={styles.container}>
      {/* Chart Header */}
      <div className={styles.header}>
        <div className={styles.assetMeta}>
          <span className={styles.assetSymbol}>{activeAsset.symbol} / USD</span>
          <div className={styles.pricing}>
            <span className={styles.currentPrice}>
              ${activeAsset.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className={`${styles.change} ${isGain ? styles.positive : styles.negative}`}>
              {isGain ? '+' : ''}{activeAsset.change24h.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Timeline controls */}
        <div className={styles.controls}>
          {(['1D', '1W', '1M', '1Y'] as Timeframe[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`${styles.tfBtn} ${timeframe === tf ? styles.tfBtnActive : ''}`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Graphics Container */}
      <div className={styles.chartWrapper}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className={styles.svgElement}
        >
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Gridlines */}
          <line x1={paddingX} y1={paddingY} x2={svgWidth - paddingX} y2={paddingY} className={styles.gridline} />
          <line x1={paddingX} y1={svgHeight / 2} x2={svgWidth - paddingX} y2={svgHeight / 2} className={styles.gridline} />
          <line x1={paddingX} y1={svgHeight - paddingY} x2={svgWidth - paddingX} y2={svgHeight - paddingY} className={styles.gridline} />

          {/* Filled Gradient Area */}
          <polygon points={gradientPoints} fill="url(#areaGradient)" />

          {/* Asset Curve Polyline */}
          <polyline
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={polylinePoints}
          />

          {/* Spark dots on the boundaries */}
          <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3.5" fill={strokeColor} />

          {/* Interactive hover crosshair vertical line */}
          {hoveredPoint && (
            <>
              <line
                x1={hoveredPoint.x}
                y1={paddingY}
                x2={hoveredPoint.x}
                y2={svgHeight - paddingY}
                className={styles.crosshair}
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r="6"
                fill={strokeColor}
                stroke="var(--bg-primary)"
                strokeWidth="2"
                style={{ boxShadow: '0 0 10px rgba(0,0,0,0.5)' }}
              />
            </>
          )}
        </svg>

        {/* Hover Tooltip display */}
        {hoveredPoint && (
          <div
            className={styles.tooltip}
            style={{
              left: `${(hoveredPoint.x / svgWidth) * 100}%`,
              top: `${(hoveredPoint.y / svgHeight) * 100 - 22}%`,
            }}
          >
            <strong>${hoveredPoint.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
            <span>{hoveredPoint.label}</span>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <Calendar size={12} color="var(--text-muted)" />
        <span>Past historical indices are simulated curves</span>
      </div>
    </div>
  );
}
