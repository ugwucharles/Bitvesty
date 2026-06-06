export interface Asset {
  id: string;
  name: string;
  symbol: string;
  type: 'crypto' | 'stock';
  price: number;
  change24h: number;
  sparkline: number[];
  prevPrice?: number; // Used for price tick flashing animation tracking
}

export interface Holding {
  assetId: string;
  symbol: string;
  name: string;
  quantity: number;
  averageBuyPrice: number;
  currentPrice: number;
}

export interface Transaction {
  id: string;
  type: 'BUY' | 'SELL' | 'WITHDRAW';
  assetId: string;
  symbol: string;
  quantity: number;
  price: number;
  timestamp: string;
  status?: 'pending' | 'completed' | 'failed';
  bankInfo?: {
    accountName: string;
    routingNumber: string;
    accountNumber: string;
    bankName: string;
  };
}

export interface PendingDeposit {
  id: string;
  amount: number;
  currency: string;
  address: string;
  proofUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string;
  method: string;
}

export interface DepositMethodRequest {
  method: string;
  requestedAt: string;
  infoProvided?: string;
}

export interface UserSession {
  username: string;
  role: 'user' | 'admin';
  active?: boolean;
  pendingDeposits?: PendingDeposit[];
  depositMethodRequest?: DepositMethodRequest;
}
