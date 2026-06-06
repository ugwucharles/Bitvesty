"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Asset, Holding, Transaction } from '@/types/trading';
import { useAuth } from './AuthContext';
import { useUsers } from '@/context/UsersContext';

interface TradingContextType {
  assets: Asset[];
  activeAsset: Asset;
  holdings: Holding[];
  transactions: Transaction[];
  setHoldings: (holdings: Holding[]) => void;
  buyAsset: (assetId: string, quantity: number) => { success: boolean; error?: string };
  sellAsset: (assetId: string, quantity: number) => { success: boolean; error?: string };
  liquidatePosition: (assetId: string) => { success: boolean; error?: string };
  addCustomTransaction: (type: 'BUY' | 'SELL', symbol: string, quantity: number, price: number) => void;
  addWithdrawTransaction: (amount: number, bankInfo: { accountName: string; routingNumber: string; accountNumber: string; bankName: string }) => void;
  aiBotActive: boolean;
  aiBotAmount: number;
  aiBotCurrentMultiplier: number;
  setAiBotActive: (active: boolean, amount: number, currentMultiplier: number) => void;
}

const INITIAL_ASSETS: Asset[] = [
  {
    id: 'btc',
    name: 'Bitcoin',
    symbol: 'BTC',
    type: 'crypto',
    price: 64250.50,
    change24h: 2.45,
    sparkline: [62800, 63100, 62900, 63500, 64100, 63900, 64250.50],
  },
  {
    id: 'eth',
    name: 'Ethereum',
    symbol: 'ETH',
    type: 'crypto',
    price: 3420.25,
    change24h: -1.15,
    sparkline: [3480, 3450, 3460, 3390, 3410, 3430, 3420.25],
  },
  {
    id: 'sol',
    name: 'Solana',
    symbol: 'SOL',
    type: 'crypto',
    price: 148.75,
    change24h: 5.82,
    sparkline: [138, 140, 142, 141, 145, 146, 148.75],
  },
  {
    id: 'aapl',
    name: 'Apple Inc.',
    symbol: 'AAPL',
    type: 'stock',
    price: 182.30,
    change24h: 0.45,
    sparkline: [181.20, 181.80, 180.50, 182.10, 181.90, 182.50, 182.30],
  },
  {
    id: 'tsla',
    name: 'Tesla Inc.',
    symbol: 'TSLA',
    type: 'stock',
    price: 178.60,
    change24h: -3.42,
    sparkline: [185.40, 183.10, 182.80, 179.90, 181.20, 177.50, 178.60],
  },
  {
    id: 'nvda',
    name: 'NVIDIA Corp.',
    symbol: 'NVDA',
    type: 'stock',
    price: 915.40,
    change24h: 8.12,
    sparkline: [840, 855, 862, 885, 875, 902, 915.40],
  },
];

const TradingContext = createContext<TradingContextType | undefined>(undefined);

export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { cashBalance, deductCash, addCash } = useAuth();
  
  const [assets, setAssets] = useState<Asset[]>(INITIAL_ASSETS);
  const [activeAssetId, setActiveAssetId] = useState<string>('btc');
  const { submitDepositRequest, currentUser } = useUsers();

  const [holdings, setHoldings] = useState<Holding[]>([]);
  const requestDeposit = (amount: number, method: string) => {
    if (!currentUser) return;
    // For simplicity, use method as currency placeholder
    submitDepositRequest(currentUser.id, amount, method);
  };
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // AI Bot global synchronization states
  const [aiBotActive, setAiBotActiveState] = useState<boolean>(false);
  const [aiBotAmount, setAiBotAmount] = useState<number>(0);
  const [aiBotCurrentMultiplier, setAiBotCurrentMultiplier] = useState<number>(1.00);

  const setAiBotActive = (active: boolean, amount: number, currentMultiplier: number) => {
    setAiBotActiveState(active);
    setAiBotAmount(amount);
    setAiBotCurrentMultiplier(currentMultiplier);
  };

  // Load holdings and transactions from localStorage
  useEffect(() => {
    try {
      const storedHoldings = localStorage.getItem('trader_holdings');
      const storedTx = localStorage.getItem('trader_transactions');
      
      if (storedHoldings) {
        setHoldings(JSON.parse(storedHoldings));
      }
      if (storedTx) {
        setTransactions(JSON.parse(storedTx));
      }
    } catch (e) {
      console.error('Failed to load trading states', e);
    }
  }, []);

  // Real-time crypto prices via local Next.js API proxy (CoinGecko)
  useEffect(() => {
    const fetchCrypto = async () => {
      try {
        const res = await fetch('/api/prices');
        if (!res.ok) return;
        const data = await res.json();
        if (!data) return;

        // Map CoinGecko IDs to our asset symbols
        const mapping: Record<string, string> = {
          bitcoin: 'btc',
          ethereum: 'eth',
          solana: 'sol'
        };

        const assetMap: Record<string, { price: number; change: number }> = {};
        for (const [cgId, symbol] of Object.entries(mapping)) {
          if (data[cgId]) {
            assetMap[symbol] = {
              price: Number(parseFloat(data[cgId].usd).toFixed(2)),
              change: Number(parseFloat(data[cgId].usd_24h_change).toFixed(2))
            };
          }
        }

        setAssets((prevAssets) => {
          return prevAssets.map((asset) => {
            if (asset.type === 'crypto' && assetMap[asset.id]) {
              const newData = assetMap[asset.id];
              if (asset.price === newData.price) return asset;

              const newSpark = [...asset.sparkline];
              newSpark[newSpark.length - 1] = newData.price;

              return {
                ...asset,
                price: newData.price,
                prevPrice: asset.price,
                change24h: newData.change,
                sparkline: newSpark,
              };
            }
            return asset;
          });
        });
      } catch (err) {
        console.error('Crypto fetch error:', err);
      }
    };

    fetchCrypto(); // Initial fetch
    const intervalId = setInterval(fetchCrypto, 10000); // Update every 10 seconds to respect rate limits

    return () => clearInterval(intervalId);
  }, []);

  // Real-time tick simulation ONLY for stocks
  useEffect(() => {
    const tickInterval = setInterval(() => {
      setAssets((prevAssets) => {
        return prevAssets.map((asset) => {
          if (asset.type !== 'stock') return asset;

          // Fluctuate price by minor percentage: between -0.6% and +0.6%
          const pct = (Math.random() * 1.2 - 0.6) / 100;
          const currentPrice = asset.price;
          const newPrice = Number((currentPrice * (1 + pct)).toFixed(2));
          
          // Re-estimate 24h change
          const pctChange = Number((asset.change24h + pct * 100).toFixed(2));
          
          // Shift sparkline
          const newSpark = [...asset.sparkline.slice(1), newPrice];

          return {
            ...asset,
            price: newPrice,
            prevPrice: currentPrice, // Store old price for ticking animations
            change24h: pctChange,
            sparkline: newSpark,
          };
        });
      });
    }, 3500); // Trigger every 3.5 seconds

    return () => clearInterval(tickInterval);
  }, []);

  // Keep holdings currentPrices in sync with asset ticks
  useEffect(() => {
    setHoldings((prevHoldings) => {
      const updated = prevHoldings.map((h) => {
        const matchingAsset = assets.find((a) => a.id === h.assetId);
        if (matchingAsset) {
          return {
            ...h,
            currentPrice: matchingAsset.price,
          };
        }
        return h;
      });
      
      // Save holdings in localStorage if changed
      if (JSON.stringify(prevHoldings) !== JSON.stringify(updated)) {
        localStorage.setItem('trader_holdings', JSON.stringify(updated));
      }
      
      return updated;
    });
  }, [assets]);

  const activeAsset = assets.find((a) => a.id === activeAssetId) || assets[0];

  const buyAsset = (assetId: string, quantity: number): { success: boolean; error?: string } => {
    if (quantity <= 0) {
      return { success: false, error: 'Quantity must be greater than zero.' };
    }
    
    const targetAsset = assets.find((a) => a.id === assetId);
    if (!targetAsset) {
      return { success: false, error: 'Asset not found.' };
    }

    const cost = Number((targetAsset.price * quantity).toFixed(2));
    if (cashBalance < cost) {
      return { success: false, error: 'Insufficient cash balance.' };
    }

    // Deduct cash
    deductCash(cost);

    // Create or update holdings
    let updatedHoldings: Holding[];
    const existingHoldingIndex = holdings.findIndex((h) => h.assetId === assetId);
    
    if (existingHoldingIndex >= 0) {
      const existing = holdings[existingHoldingIndex];
      const newQuantity = existing.quantity + quantity;
      
      // Re-average the buy price: (old total cost + new cost) / total qty
      const totalCost = (existing.averageBuyPrice * existing.quantity) + cost;
      const newAverageBuyPrice = Number((totalCost / newQuantity).toFixed(2));
      
      const newHolding: Holding = {
        ...existing,
        quantity: newQuantity,
        averageBuyPrice: newAverageBuyPrice,
        currentPrice: targetAsset.price,
      };
      
      updatedHoldings = [...holdings];
      updatedHoldings[existingHoldingIndex] = newHolding;
    } else {
      const newHolding: Holding = {
        assetId: targetAsset.id,
        symbol: targetAsset.symbol,
        name: targetAsset.name,
        quantity: quantity,
        averageBuyPrice: targetAsset.price,
        currentPrice: targetAsset.price,
      };
      updatedHoldings = [...holdings, newHolding];
    }
    
    setHoldings(updatedHoldings);
    localStorage.setItem('trader_holdings', JSON.stringify(updatedHoldings));

    // Log transaction
    const newTx: Transaction = {
      id: Math.random().toString(36).substring(2, 11).toUpperCase(),
      type: 'BUY',
      assetId: targetAsset.id,
      symbol: targetAsset.symbol,
      quantity,
      price: targetAsset.price,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    const updatedTx = [newTx, ...transactions];
    setTransactions(updatedTx);
    localStorage.setItem('trader_transactions', JSON.stringify(updatedTx));

    return { success: true };
  };

  const sellAsset = (assetId: string, quantity: number): { success: boolean; error?: string } => {
    if (quantity <= 0) {
      return { success: false, error: 'Quantity must be greater than zero.' };
    }

    const existingHoldingIndex = holdings.findIndex((h) => h.assetId === assetId);
    if (existingHoldingIndex < 0) {
      return { success: false, error: 'You do not own this asset.' };
    }

    const targetAsset = assets.find((a) => a.id === assetId);
    if (!targetAsset) {
      return { success: false, error: 'Asset not found.' };
    }

    const existing = holdings[existingHoldingIndex];
    if (existing.quantity < quantity) {
      return { success: false, error: `Insufficient quantity. You only own ${existing.quantity} ${existing.symbol}.` };
    }

    const proceeds = Number((targetAsset.price * quantity).toFixed(2));
    
    // Credit cash
    addCash(proceeds);

    let updatedHoldings: Holding[];
    if (existing.quantity === quantity) {
      // Remove holding completely
      updatedHoldings = holdings.filter((_, idx) => idx !== existingHoldingIndex);
    } else {
      // Decrease quantity
      const newHolding: Holding = {
        ...existing,
        quantity: existing.quantity - quantity,
      };
      updatedHoldings = [...holdings];
      updatedHoldings[existingHoldingIndex] = newHolding;
    }

    setHoldings(updatedHoldings);
    localStorage.setItem('trader_holdings', JSON.stringify(updatedHoldings));

    // Log transaction
    const newTx: Transaction = {
      id: Math.random().toString(36).substring(2, 11).toUpperCase(),
      type: 'SELL',
      assetId: targetAsset.id,
      symbol: targetAsset.symbol,
      quantity,
      price: targetAsset.price,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    const updatedTx = [newTx, ...transactions];
    setTransactions(updatedTx);
    localStorage.setItem('trader_transactions', JSON.stringify(updatedTx));

    return { success: true };
  };

  const liquidatePosition = (assetId: string): { success: boolean; error?: string } => {
    const holding = holdings.find((h) => h.assetId === assetId);
    if (!holding) {
      return { success: false, error: 'Position not found.' };
    }
    return sellAsset(assetId, holding.quantity);
  };

  const addWithdrawTransaction = (amount: number, bankInfo: { accountName: string; routingNumber: string; accountNumber: string; bankName: string }) => {
    const newTx: Transaction = {
      id: Math.random().toString(36).substring(2, 11).toUpperCase(),
      type: 'WITHDRAW',
      assetId: 'withdraw',
      symbol: 'USD',
      quantity: 1,
      price: amount,
      timestamp: new Date().toLocaleString(),
      status: 'pending',
      bankInfo,
    };
    setTransactions((prev) => {
      const updated = [newTx, ...prev];
      localStorage.setItem('trader_transactions', JSON.stringify(updated));
      return updated;
    });
  };

  const addCustomTransaction = (type: 'BUY' | 'SELL', symbol: string, quantity: number, price: number) => {
    const newTx: Transaction = {
      id: Math.random().toString(36).substring(2, 11).toUpperCase(),
      type,
      assetId: symbol.toLowerCase(),
      symbol,
      quantity,
      price,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    setTransactions((prev) => {
      const updated = [newTx, ...prev];
      localStorage.setItem('trader_transactions', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <TradingContext.Provider
      value={{
        assets,
        activeAsset,
        holdings,
        transactions,
        setActiveAssetId,
        setHoldings,
        buyAsset,
        sellAsset,
        liquidatePosition,
        addCustomTransaction,
        addWithdrawTransaction,
        aiBotActive,
        aiBotAmount,
        aiBotCurrentMultiplier,
        setAiBotActive,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
};

export const useTrading = () => {
  const context = useContext(TradingContext);
  if (context === undefined) {
    throw new Error('useTrading must be used within a TradingProvider');
  }
  return context;
};
