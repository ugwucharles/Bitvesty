"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useUsers } from '@/context/UsersContext';
import VerificationModal from '@/components/VerificationModal';
import { useTrading } from '@/context/TradingContext';
import { useToast } from './Toast';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Cpu, 
  Sparkles, 
  Coins, 
  ShieldCheck, 
  AlertTriangle,
  Play,
  RotateCcw,
  Check,
  X,
  Activity,
  Timer
} from 'lucide-react';
import styles from './panel.module.css';

// Bot Operation log messages
const AI_LOG_MESSAGES_UP = [
  "🤖 AI Bot scalp trending up. Buy pressure rising...",
  "📈 Bot target breakout confirmed. Scaling long...",
  "🐳 Whale buy support detected. Momentum is strong...",
  "⚡ Bot optimized profit yields at local peak...",
  "🛡️ Trailing stop-loss automatically locked higher...",
];

const AI_LOG_MESSAGES_DOWN = [
  "📉 Minor market pullback. Bot defending position...",
  "🤖 Volatility detected. Dynamic risk hedging active...",
  "🛡️ Stop-loss trailing at local support line...",
  "📊 Testing local market liquidity and order books...",
  "🔄 Managing drawdowns with dynamic size adjustments...",
];

const AI_LOG_MESSAGES_FLAT = [
  "🤖 AI Bot monitoring market consolidation...",
  "📊 Scanning global order flow registers...",
  "⚙️ Restructuring scalp algorithms for volatility...",
];

// 24 hours in milliseconds
const BOT_DURATION_MS = 24 * 60 * 60 * 1000;

export default function TradingPanel() {
  const { cashBalance, deductCash, addCash } = useAuth();
  const { activeAsset, holdings, buyAsset, sellAsset, addCustomTransaction, setAiBotActive } = useTrading();
  const { showToast } = useToast();

  // Mode Selection: 'AI' (Trading Bot) or 'MANUAL' (Terminal)
  const [panelMode, setPanelMode] = useState<'AI' | 'MANUAL'>('AI');

  // ==========================================
  // STATE FOR MANUAL MODE
  // ==========================================
  const [manualTradeType, setManualTradeType] = useState<'BUY' | 'SELL'>('BUY');
  const [manualQuantity, setManualQuantity] = useState('');
  const [manualIsSubmitting, setManualIsSubmitting] = useState(false);

  // Reset manual quantity when asset changes
  useEffect(() => {
    setManualQuantity('');
  }, [activeAsset]);

  const activeHolding = holdings.find((h) => h.assetId === activeAsset.id);
  const ownedQuantity = activeHolding ? activeHolding.quantity : 0;

  const manualQtyFloat = parseFloat(manualQuantity);
  const estimatedCost = !isNaN(manualQtyFloat) && manualQtyFloat > 0 
    ? Number((manualQtyFloat * activeAsset.price).toFixed(2)) 
    : 0;

  const hasManualValidationIssues = () => {
    if (isNaN(manualQtyFloat) || manualQtyFloat <= 0) return true;
    if (manualTradeType === 'BUY' && cashBalance < estimatedCost) return true;
    if (manualTradeType === 'SELL' && ownedQuantity < manualQtyFloat) return true;
    return false;
  };

  const handleManualTradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasManualValidationIssues()) return;

    setManualIsSubmitting(true);
    
    // Simulate order execution time
    setTimeout(() => {
      let result;
      if (manualTradeType === 'BUY') {
        result = buyAsset(activeAsset.id, manualQtyFloat);
        if (result.success) {
          showToast(`Successfully purchased ${manualQtyFloat} ${activeAsset.symbol} for $${estimatedCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}.`, 'success');
          setManualQuantity('');
        } else {
          showToast(result.error || 'Buy order failed.', 'error');
        }
      } else {
        result = sellAsset(activeAsset.id, manualQtyFloat);
        if (result.success) {
          showToast(`Successfully sold ${manualQuantity} ${activeAsset.symbol} for $${estimatedCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}.`, 'success');
          setManualQuantity('');
        } else {
          showToast(result.error || 'Sell order failed.', 'error');
        }
      }
      setManualIsSubmitting(false);
    }, 850);
  };

  // ==========================================
  // STATE & LOGIC FOR AI TRADING BOT (24-HOUR BACKGROUND RUNNER)
  // ==========================================
  const [aiState, setAiState] = useState<'IDLE' | 'TRADING' | 'WON' | 'LOST'>('IDLE');
  const [depositAmounts, setDepositAmounts] = useState<Record<string, string>>({});
  const { currentUser } = useUsers();
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [aiAmount, setAiAmount] = useState('100');
  const [aiCurrentMultiplier, setAiCurrentMultiplier] = useState(1.00);
  const [aiOpsMessage, setAiOpsMessage] = useState("BitVesty AI Trading Bot standing by...");
  const [aiHistory, setAiHistory] = useState<number[]>([1.00]);
  const [timeLeftStr, setTimeLeftStr] = useState("24h 00m 00s");
  
  const simulationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Sync active AI Bot state from localStorage on mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem('ai_bot_state');
      const savedAmount = localStorage.getItem('ai_bot_amount');
      const savedStart = localStorage.getItem('ai_bot_start');
      const savedCurrent = localStorage.getItem('ai_bot_current');
      const savedHistory = localStorage.getItem('ai_bot_history');
      const savedLastTick = localStorage.getItem('ai_bot_last_tick');

      if (savedState === 'TRADING' && savedAmount && savedStart && savedCurrent && savedHistory && savedLastTick) {
        const startTimestamp = Number(savedStart);
        const elapsed = Date.now() - startTimestamp;

        // 1. Check if 24 hours has already expired while offline!
        if (elapsed >= BOT_DURATION_MS) {
          // Auto settle immediately
          const historyArr = JSON.parse(savedHistory);
          const finalMultiplier = historyArr[historyArr.length - 1] || Number(savedCurrent);
          
          startTimeRef.current = startTimestamp;
          setAiAmount(savedAmount);
          setAiCurrentMultiplier(finalMultiplier);
          setAiHistory(historyArr);
          
          // Settle the trade
          setTimeout(() => handleOfflineSettlement(savedAmount, finalMultiplier), 200);
        } else {
          // 2. Bot is still running in background! Backfill missed ticks to bridge time gap.
          const lastTickTime = Number(savedLastTick);
          const gapMs = Date.now() - lastTickTime;
          let historyArr = JSON.parse(savedHistory);

          if (gapMs > 5000) {
            // Generate deterministic or random ticks to fill the gap
            const ticksToFill = Math.min(10, Math.floor(gapMs / 2500)); // cap at 10 ticks to keep chart neat
            let lastVal = historyArr[historyArr.length - 1] || Number(savedCurrent);
            
            for (let i = 0; i < ticksToFill; i++) {
              const change = (Math.random() * 12.0 - 6.0) / 100;
              lastVal = Number((lastVal + change).toFixed(2));
              // Range limit between 0.80x and 1.30x for realistic offline history walk
              lastVal = Math.max(0.80, Math.min(1.30, lastVal));
              historyArr.push(lastVal);
            }
            
            historyArr = historyArr.slice(-16);
          }

          startTimeRef.current = startTimestamp;
          setAiState('TRADING');
          setAiAmount(savedAmount);
          const latestMult = historyArr[historyArr.length - 1] || Number(savedCurrent);
          setAiCurrentMultiplier(latestMult);
          setAiHistory(historyArr);
          setAiBotActive(true, Number(savedAmount), latestMult);
          setAiOpsMessage("🤖 Re-established connection with cloud AI Trading Bot...");
          
          // Persist the backfilled ticks
          localStorage.setItem('ai_bot_history', JSON.stringify(historyArr));
          localStorage.setItem('ai_bot_current', String(latestMult));
          localStorage.setItem('ai_bot_last_tick', String(Date.now()));
        }
      }
    } catch (e) {
      console.error('Failed to restore AI Trading Bot state', e);
    }
  }, []);

  // Live simulation tick and countdown timer effect
  useEffect(() => {
    if (aiState !== 'TRADING') {
      if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
      return;
    }

    // Set up tick simulation running slowly every 2.5 seconds to feel realistic and premium!
    simulationTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;

      // 1. Check if 24 hours expired
      if (elapsed >= BOT_DURATION_MS) {
        clearInterval(simulationTimerRef.current!);
        setAiHistory((prev) => {
          const finalMult = prev[prev.length - 1] || 1.00;
          handleAiMaturitySettle(finalMult);
          return prev;
        });
        return;
      }

      // Update countdown clock
      const remainingMs = BOT_DURATION_MS - elapsed;
      const hours = Math.floor(remainingMs / (1000 * 60 * 60));
      const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
      setTimeLeftStr(`${hours}h ${minutes}m ${seconds}s`);

      setAiHistory((prevHistory) => {
        const lastVal = prevHistory[prevHistory.length - 1];
        
        // Dynamic realistic price fluctuations:
        // Fluctuates slowly up and down between -5.5% and +6.0% (slight positive drift for AI capability)
        const change = (Math.random() * 11.5 - 5.5) / 100;
        let nextMult = Number((lastVal + change).toFixed(2));
        
        // Realistic dynamic limits: bot floats realistically between 0.80x and 1.30x range
        nextMult = Math.max(0.80, Math.min(1.30, nextMult));
        
        const updated = [...prevHistory, nextMult].slice(-16); // keep last 16 ticks for chart dimensions

        setAiCurrentMultiplier(nextMult);
        setAiBotActive(true, investFloat, nextMult);
        
        // Save states for offline background continuity
        localStorage.setItem('ai_bot_history', JSON.stringify(updated));
        localStorage.setItem('ai_bot_current', String(nextMult));
        localStorage.setItem('ai_bot_last_tick', String(Date.now()));

        // Operations log messages driven by price action
        if (nextMult > lastVal) {
          const randMsg = AI_LOG_MESSAGES_UP[Math.floor(Math.random() * AI_LOG_MESSAGES_UP.length)];
          setAiOpsMessage(randMsg);
        } else if (nextMult < lastVal) {
          const randMsg = AI_LOG_MESSAGES_DOWN[Math.floor(Math.random() * AI_LOG_MESSAGES_DOWN.length)];
          setAiOpsMessage(randMsg);
        } else {
          const randMsg = AI_LOG_MESSAGES_FLAT[Math.floor(Math.random() * AI_LOG_MESSAGES_FLAT.length)];
          setAiOpsMessage(randMsg);
        }

        return updated;
      });
    }, 2500); // 2.5 seconds tick speed

    return () => {
      if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
    };
  }, [aiState]);

  const handleAiAmountChange = (val: string) => {
    if (val === '' || /^[0-9]*$/.test(val)) {
      setAiAmount(val);
    }
  };

  const adjustAiAmount = (adjust: number) => {
    const current = parseInt(aiAmount) || 0;
    const nextVal = Math.max(10, current + adjust);
    setAiAmount(String(nextVal));
  };

  const setAiMaxAmount = () => {
    const maxVal = Math.floor(cashBalance);
    setAiAmount(maxVal > 0 ? String(maxVal) : '10');
  };

  // Launch AI Trading Bot
  const launchAiBot = () => {
    const amountVal = parseFloat(aiAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      showToast('Please enter a valid investment amount.', 'error');
      return;
    }
    if (amountVal > cashBalance) {
      showToast('Insufficient cash balance to launch AI Trading Bot.', 'error');
      return;
    }

    // Deduct cash and start trade
    deductCash(amountVal);
    
    // Log transaction
    addCustomTransaction('BUY', 'AI_BOT_RUN', 1, amountVal);

    const initialHistory = [1.00, 1.01, 0.99, 1.00];
    startTimeRef.current = Date.now();
    setAiCurrentMultiplier(1.00);
    setAiHistory(initialHistory);
    setAiBotActive(true, amountVal, 1.00);
    setAiOpsMessage("🤖 AI Trading Bot initialized. Scanning order books...");
    setAiState('TRADING');
    setTimeLeftStr("24h 00m 00s");

    // Save state in localStorage for background operations
    localStorage.setItem('ai_bot_state', 'TRADING');
    localStorage.setItem('ai_bot_amount', String(amountVal));
    localStorage.setItem('ai_bot_start', String(startTimeRef.current));
    localStorage.setItem('ai_bot_current', '1.00');
    localStorage.setItem('ai_bot_history', JSON.stringify(initialHistory));
    localStorage.setItem('ai_bot_last_tick', String(Date.now()));
    
    showToast('AI Trading Bot successfully deployed in the cloud for a 24h run!', 'success');
  };

  // Handle Manual Early Cash Out
  const handleManualCashOut = () => {
    if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);

    // Calculate final winning multiplier:
    // If current multiplier is already above 1.025, give them the actual current multiplier!
    // Otherwise, execute a scalp exit of at least 1.025 (e.g. between 1.025 and 1.06)
    const finalMult = aiCurrentMultiplier >= 1.025 
      ? aiCurrentMultiplier 
      : Number((Math.random() * 0.035 + 1.025).toFixed(3));
      
    const investment = parseFloat(aiAmount);
    const payout = Number((investment * finalMult).toFixed(2));

    // Credit cash back
    addCash(payout);
    
    // Log transaction
    addCustomTransaction('SELL', 'AI_BOT_SECURE', 1, payout);

    // Clear background states
    localStorage.removeItem('ai_bot_state');
    localStorage.removeItem('ai_bot_amount');
    localStorage.removeItem('ai_bot_start');
    localStorage.removeItem('ai_bot_current');
    localStorage.removeItem('ai_bot_history');
    localStorage.removeItem('ai_bot_last_tick');

    setAiCurrentMultiplier(finalMult);
    setAiBotActive(false, 0, 1.00);
    setAiState('WON');
    
    showToast(`AI Bot successfully stopped! Credited $${payout.toLocaleString()} to wallet.`, 'success');
  };

  // Handle auto-settling when 24h expires while user is online
  const handleAiMaturitySettle = (finalMultiplier: number) => {
    const finalMult = finalMultiplier >= 1.025 
      ? finalMultiplier 
      : Number((Math.random() * 0.035 + 1.025).toFixed(3));
      
    const investment = parseFloat(aiAmount);
    const payout = Number((investment * finalMult).toFixed(2));

    // Credit cash back
    addCash(payout);
    
    // Log transaction
    addCustomTransaction('SELL', 'AI_BOT_MATURE', 1, payout);

    // Clean up local storage
    localStorage.removeItem('ai_bot_state');
    localStorage.removeItem('ai_bot_amount');
    localStorage.removeItem('ai_bot_start');
    localStorage.removeItem('ai_bot_current');
    localStorage.removeItem('ai_bot_history');
    localStorage.removeItem('ai_bot_last_tick');

    setAiCurrentMultiplier(finalMult);
    setAiBotActive(false, 0, 1.00);
    setAiState('WON');

    showToast(`AI Trading Bot reached 24h maturity! Payout settled: $${payout.toLocaleString()}`, 'success');
  };

  // Handle offline settlement checks on browser reload/login
  const handleOfflineSettlement = (amountStr: string, finalMultiplier: number) => {
    const finalMult = finalMultiplier >= 1.025 
      ? finalMultiplier 
      : Number((Math.random() * 0.035 + 1.025).toFixed(3));
      
    const investment = parseFloat(amountStr);
    const payout = Number((investment * finalMult).toFixed(2));

    // Credit cash back
    addCash(payout);
    
    // Log transaction
    addCustomTransaction('SELL', 'AI_BOT_MATURE', 1, payout);

    // Clean up local storage
    localStorage.removeItem('ai_bot_state');
    localStorage.removeItem('ai_bot_amount');
    localStorage.removeItem('ai_bot_start');
    localStorage.removeItem('ai_bot_current');
    localStorage.removeItem('ai_bot_history');
    localStorage.removeItem('ai_bot_last_tick');

    setAiCurrentMultiplier(finalMult);
    setAiBotActive(false, 0, 1.00);
    setAiState('WON');

    showToast(`AI Trading Bot completed 24h cycle in background! Settle payout: $${payout.toLocaleString()}`, 'success');
  };

  const resetAiArena = () => {
    setAiState('IDLE');
    setAiCurrentMultiplier(1.00);
    setAiHistory([1.00]);
    setAiOpsMessage("BitVesty AI Trading Bot standing by...");
  };

  // Computations
  const investFloat = parseFloat(aiAmount) || 0;
  const currentProfit = Number((investFloat * (aiCurrentMultiplier - 1)).toFixed(2));
  const currentTotal = Number((investFloat * aiCurrentMultiplier).toFixed(2));
  const profitPercentage = ((aiCurrentMultiplier - 1) * 100).toFixed(2);

  // =========================================================
  // SVG CHART COORDINATES MATH
  // =========================================================
  // Height = 120px, Width = 310px
  // Bot values mapped inside 0.70x to 1.30x coordinates range
  const chartHeight = 120;
  const chartWidth = 310;
  const padding = 12;
  const mappedHeight = chartHeight - 2 * padding;

  const getSvgCoordinates = (): string => {
    if (aiHistory.length === 0) return "";
    
    return aiHistory.map((val, idx) => {
      // ratio mapped between 0.7 (Stop loss guide) and 1.3 (Profit ceiling guide)
      const ratio = (val - 0.7) / (1.3 - 0.7);
      const clampedRatio = Math.max(0, Math.min(1, ratio));
      
      const x = (idx / (aiHistory.length - 1)) * (chartWidth - 2 * padding) + padding;
      const y = chartHeight - padding - clampedRatio * mappedHeight;
      return `${x},${y}`;
    }).join(" ");
  };

  // Static guideline positions mapping
  const getMappedY = (val: number): number => {
    const ratio = (val - 0.7) / (1.3 - 0.7);
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    return chartHeight - padding - clampedRatio * mappedHeight;
  };

  return (
    <div className={styles.container}>
      
      {/* Switcher Mode Tabs */}
      <div className={styles.modeTabs}>
        <button
          type="button"
          onClick={() => { if (aiState === 'IDLE') setPanelMode('AI'); }}
          className={`${styles.modeTab} ${panelMode === 'AI' ? styles.modeTabActive : ''}`}
          disabled={aiState === 'TRADING'}
          title="Simple automated trading bot"
        >
          <Cpu size={14} />
          <span className={styles.modeTabActiveText}>AI Trading Bot <Sparkles size={12} style={{ color: '#fbbf24' }} /></span>
        </button>
        <button
          type="button"
          onClick={() => { if (aiState === 'IDLE') setPanelMode('MANUAL'); }}
          className={`${styles.modeTab} ${panelMode === 'MANUAL' ? styles.modeTabActive : ''}`}
          disabled={aiState === 'TRADING'}
          title="Manual trading panel"
        >
          <Coins size={14} />
          <span>Manual Terminal</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* 🤖 MODE 1: AI TRADING BOT MODE (CLOUD RUNNER)            */}
      {/* ========================================================= */}
      {panelMode === 'AI' && (
        <div>
          {/* IDLE SCREEN (INPUT FORM) */}
          {aiState === 'IDLE' && (
            <div className={styles.form}>
              <div className={styles.header}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  BitVesty AI Trading Bot
                </h3>
                <p>Simple 1-click cloud trading. Bot runs fully offline.</p>
              </div>

              {/* Bot Info Block */}
              <div className={styles.infoBlock}>
                💡 <strong>Cloud Continuity:</strong> The AI Trading Bot runs a sophisticated 24-hour scalp algorithm. It trades continuously in the cloud, **even if you log out or close your browser**. You can cash out manually at any time!
              </div>

              {/* Amount input */}
              <div className={styles.inputGroup} style={{ marginTop: '4px' }}>
                <div className={styles.inputLabelRow}>
                  <label>Amount to allocate in Bot?</label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Avail: ${cashBalance.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className={styles.inputWrapper}>
                  <input
                    type="text"
                    value={aiAmount}
                    onChange={(e) => handleAiAmountChange(e.target.value)}
                    placeholder="100"
                    maxLength={6}
                    required
                  />
                  <span className={styles.inputSuffix}>USD</span>
                </div>
                {/* Quick select amounts grid */}
                <div className={styles.quickAmountGrid}>
                  <button type="button" onClick={() => adjustAiAmount(10)} className={styles.quickBtnSelect}>+$10</button>
                  <button type="button" onClick={() => adjustAiAmount(50)} className={styles.quickBtnSelect}>+$50</button>
                  <button type="button" onClick={() => adjustAiAmount(100)} className={styles.quickBtnSelect}>+$100</button>
                  <button type="button" onClick={setAiMaxAmount} className={styles.quickBtnSelect}>MAX</button>
                </div>
              </div>

              {/* Launch Bot button */}
              <button
                type="button"
                onClick={launchAiBot}
                className={`${styles.glowBtn} btn ${styles.launchBtn}`}
                disabled={investFloat <= 0 || investFloat > cashBalance}
              >
                <Play size={16} fill="white" style={{ marginRight: '6px' }} />
                Launch AI Trading Bot
              </button>

              <div className={styles.sandboxBadge}>
                <ShieldCheck size={12} />
                <span>Simulated cloud server. 24h cycles complete automatically.</span>
              </div>
            </div>
          )}

          {/* ACTIVE SIMULATION SCREEN */}
          {aiState === 'TRADING' && (
            <div className={styles.activeArena}>
              
              {/* Timer / Time Remaining status */}
              <div className={styles.timerBadge}>
                <Timer size={14} className="animate-pulse" />
                <span>AI Bot Settle Time: {timeLeftStr}</span>
              </div>

              {/* Premium Live SVG Trade Chart Simulation */}
              <div style={{ width: '100%', height: `${chartHeight}px`, position: 'relative', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', marginBottom: '12px', overflow: 'hidden' }}>
                <svg width="100%" height="100%" style={{ display: 'block' }}>
                  
                  {/* Grid Guidelines */}
                  {/* Payout target guide (1.20x) */}
                  <line 
                    x1="0" 
                    y1={getMappedY(1.20)} 
                    x2={chartWidth} 
                    y2={getMappedY(1.20)} 
                    stroke="rgba(16, 185, 129, 0.4)" 
                    strokeWidth="1.2" 
                    strokeDasharray="4,4" 
                  />
                  
                  {/* Entry Price level (1.00x) */}
                  <line 
                    x1="0" 
                    y1={getMappedY(1.00)} 
                    x2={chartWidth} 
                    y2={getMappedY(1.00)} 
                    stroke="rgba(255, 255, 255, 0.25)" 
                    strokeWidth="1" 
                    strokeDasharray="3,3" 
                  />
                  
                  {/* Stop-Loss limit line (0.80x) */}
                  <line 
                    x1="0" 
                    y1={getMappedY(0.80)} 
                    x2={chartWidth} 
                    y2={getMappedY(0.80)} 
                    stroke="rgba(239, 68, 68, 0.4)" 
                    strokeWidth="1.2" 
                    strokeDasharray="4,4" 
                  />

                  {/* Guideline Labels */}
                  <text x="8" y={getMappedY(1.20) - 4} fill="var(--color-success)" fontSize="8px" fontWeight="600" opacity="0.8">
                    🎯 TARGET GUIDELINE +20% (1.20x)
                  </text>
                  <text x="8" y={getMappedY(1.00) - 4} fill="var(--text-secondary)" fontSize="8px" opacity="0.6">
                    🏁 BOT ENTRY LEVEL (1.00x)
                  </text>
                  <text x="8" y={getMappedY(0.80) + 10} fill="var(--color-danger)" fontSize="8px" fontWeight="600" opacity="0.8">
                    🛑 STOP-LOSS SHIELD -20% (0.80x)
                  </text>

                  {/* Active growing bot price walk (glowing indigo curve) */}
                  <polyline
                    fill="none"
                    stroke="var(--color-primary)"
                    strokeWidth="2.5"
                    points={getSvgCoordinates()}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ filter: 'drop-shadow(0px 0px 4px var(--color-primary))' }}
                  />

                  {/* Pulsing latest price dot */}
                  {aiHistory.length > 0 && (
                    <circle
                      cx={(aiHistory.length - 1) / (aiHistory.length - 1) * (chartWidth - 2 * padding) + padding}
                      cy={getMappedY(aiCurrentMultiplier)}
                      r="4"
                      fill="white"
                      stroke="var(--color-primary)"
                      strokeWidth="2"
                      style={{ animation: 'pulseGlow 1s infinite alternate' }}
                    />
                  )}

                </svg>
              </div>

              {/* Giant ticking multiplier */}
              <div className={styles.multiplierBig} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Activity size={24} className="animate-pulse" style={{ color: aiCurrentMultiplier >= 1.00 ? 'var(--color-success)' : 'var(--color-danger)' }} />
                <span>{aiCurrentMultiplier.toFixed(2)}x</span>
              </div>

              {/* Profit metrics */}
              <div className={styles.profitTracker} style={{ color: aiCurrentMultiplier >= 1.00 ? 'var(--color-success)' : '#ef4444' }}>
                Bot Valuation: ${currentTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({aiCurrentMultiplier >= 1.00 ? '+' : ''}{profitPercentage}% PnL)
              </div>

              {/* AI Log Console */}
              <div className={styles.opsLog}>
                <div key={aiOpsMessage} className={styles.opsMessage}>
                  <span className={styles.loaderSpinner} style={{ width: 12, height: 12, border: '1.5px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--color-primary)' }} />
                  {aiOpsMessage}
                </div>
              </div>

              {/* Manual early end trade button */}
              <button
                type="button"
                onClick={handleManualCashOut}
                className="btn btn-success"
                style={{ width: '100%', height: '50px', fontWeight: 700, letterSpacing: '0.02em', boxShadow: '0 0 20px rgba(16, 185, 129, 0.45)' }}
              >
                💰 END TRADE (${currentTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })})
              </button>
              
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                Trade continues in background. End trade early to claim bot yields instantly!
              </span>
            </div>
          )}

          {/* MATURED WIN SUMMARY SCREEN */}
          {aiState === 'WON' && (
            <div className={styles.outcomeScreen}>
              <div className={styles.payoutBadge}>
                <Check size={32} strokeWidth={3} />
              </div>
              <h3 className={styles.outcomeTitle} style={{ color: 'var(--color-success)' }}>
                AI Bot Settle Succeeded!
              </h3>
              <p className={styles.outcomeDesc}>
                The BitVesty AI Trading Bot successfully closed your position with positive yields.
              </p>
              <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '14px 20px', borderRadius: '8px', marginBottom: '24px', width: '100%' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Settled Cash Payout</span>
                <h2 style={{ fontSize: '1.8rem', color: 'white', marginTop: '2px', fontWeight: 800 }}>
                  ${((parseInt(aiAmount) || 0) * aiCurrentMultiplier).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </h2>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-success)', fontWeight: 600 }}>
                  Yield Return: +{profitPercentage}% ({aiCurrentMultiplier.toFixed(2)}x)
                </span>
              </div>
              <button
                type="button"
                onClick={resetAiArena}
                className="btn btn-primary"
                style={{ width: '100%', height: '46px' }}
              >
                <RotateCcw size={14} />
                Deploy New Bot Cycle
              </button>
            </div>
          )}

          {/* MATURED LOSS SUMMARY SCREEN */}
          {aiState === 'LOST' && (
            <div className={styles.outcomeScreen}>
              <div className={styles.crashBadge}>
                <X size={32} strokeWidth={3} />
              </div>
              <h3 className={styles.outcomeTitle} style={{ color: 'var(--color-danger)' }}>
                AI Bot Settle Completed (Loss)
              </h3>
              <p className={styles.outcomeDesc}>
                The 24h bot cycle was completed. Dynamic drawdowns resulted in protective exits.
              </p>
              <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '14px 20px', borderRadius: '8px', marginBottom: '24px', width: '100%' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Settled Cash Payout</span>
                <h2 style={{ fontSize: '1.8rem', color: 'white', marginTop: '2px', fontWeight: 800 }}>
                  ${((parseInt(aiAmount) || 0) * aiCurrentMultiplier).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </h2>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-danger)', fontWeight: 600 }}>
                  Yield Return: {profitPercentage}% ({aiCurrentMultiplier.toFixed(2)}x)
                </span>
              </div>
              <button
                type="button"
                onClick={resetAiArena}
                className="btn btn-secondary"
                style={{ width: '100%', height: '46px' }}
              >
                <RotateCcw size={14} />
                Deploy New Bot Cycle
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 🛠️ MODE 2: ORIGINAL MANUAL TRADING TERMINAL              */}
      {/* ========================================================= */}
      {panelMode === 'MANUAL' && (
        <div>
          <div className={styles.header}>
            <h3>Order Execution</h3>
            <p>Manual direct-market order terminal</p>
          </div>

          {/* Tabs BUY/SELL */}
          <div className={styles.tabs}>
            <button
              type="button"
              onClick={() => { setManualTradeType('BUY'); setManualQuantity(''); }}
              className={`${styles.tab} ${manualTradeType === 'BUY' ? styles.tabBuyActive : ''}`}
            >
              <ArrowUpRight size={16} />
              <span>BUY {activeAsset.symbol}</span>
            </button>
            <button
              type="button"
              onClick={() => { setManualTradeType('SELL'); setManualQuantity(''); }}
              className={`${styles.tab} ${manualTradeType === 'SELL' ? styles.tabSellActive : ''}`}
            >
              <ArrowDownRight size={16} />
              <span>SELL {activeAsset.symbol}</span>
            </button>
          </div>

          <form onSubmit={handleManualTradeSubmit} className={styles.form}>
            {/* Asset Details info */}
            <div className={styles.assetBrief}>
              <div className={styles.assetMeta}>
                <span className={styles.assetName}>{activeAsset.name}</span>
                <span className={styles.assetPrice}>${activeAsset.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className={styles.ownedWidget}>
                <span>Owned:</span>
                <strong>{ownedQuantity} {activeAsset.symbol}</strong>
              </div>
            </div>

            {/* Input Quantity */}
            <div className={styles.inputGroup}>
              <div className={styles.inputLabelRow}>
                <label htmlFor="tradeQuantity">Order Size ({activeAsset.symbol})</label>
                <button 
                  type="button" 
                  className={styles.maxBtn}
                  onClick={() => {
                    if (manualTradeType === 'BUY') {
                      const maxBuy = Number((cashBalance / activeAsset.price).toFixed(4));
                      setManualQuantity(maxBuy > 0 ? String(maxBuy) : '0');
                    } else {
                      setManualQuantity(ownedQuantity > 0 ? String(ownedQuantity) : '0');
                    }
                  }}
                >
                  Set Max
                </button>
              </div>
              <VerificationModal
                  isOpen={showVerificationModal}
                  onClose={() => setShowVerificationModal(false)}
                  message="Your account is not activated/verified. Please contact admin to activate before depositing."
                />
              <div className={styles.inputWrapper}>
                <input
                  id="tradeQuantity"
                  type="number"
                  step="any"
                  min="0.0001"
                  placeholder="0.00"
                  value={manualQuantity}
                  onChange={(e) => setManualQuantity(e.target.value)}
                  required
                  disabled={manualIsSubmitting}
                />
                <span className={styles.inputSuffix}>{activeAsset.symbol}</span>
              </div>
            </div>

            {/* Dynamic Calculations */}
            <div className={styles.calculations}>
              <div className={styles.calcRow}>
                <span>Est. Order Cost:</span>
                <strong>${estimatedCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div className={styles.calcRow}>
                <span>Remaining Cash:</span>
                <span>
                  ${(manualTradeType === 'BUY' 
                    ? (cashBalance - estimatedCost >= 0 ? cashBalance - estimatedCost : 0)
                    : cashBalance + estimatedCost
                  ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Warnings */}
            {manualTradeType === 'BUY' && cashBalance < estimatedCost && (
              <div className={styles.warningAlert}>
                <AlertTriangle size={16} />
                <span>Over-limit! Est. cost exceeds available cash balance.</span>
              </div>
            )}
            {manualTradeType === 'SELL' && ownedQuantity < manualQtyFloat && (
              <div className={styles.warningAlert}>
                <AlertTriangle size={16} />
                <span>Insufficient holdings! You only own {ownedQuantity} {activeAsset.symbol}.</span>
              </div>
            )}

            {/* Execute Button */}
            <button
              type="submit"
              className={`btn ${manualTradeType === 'BUY' ? 'btn-success' : 'btn-danger'}`}
              style={{ width: '100%', height: '48px', marginTop: '10px' }}
              disabled={hasManualValidationIssues() || manualIsSubmitting}
            >
              {manualIsSubmitting ? (
                <span className={styles.loaderSpinner} />
              ) : (
                <span>Execute Simulated {manualTradeType}</span>
              )}
            </button>

            <div className={styles.sandboxBadge}>
              <ShieldCheck size={12} />
              <span>Simulated clearing house. Trades do not execute on live exchanges.</span>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
