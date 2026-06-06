"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserSession } from '@/types/trading';
import { useUsers } from '@/context/UsersContext';

interface AuthContextType {
  user: UserSession | null;
  isLoggedIn: boolean;
  cashBalance: number;
  login: (username: string, password: string) => { success: boolean; error?: string; user?: { username: string; role: string; active: boolean; balance: number } };
  logout: () => void;
  registerUser: (data: { id: string; username: string; email: string; phone: string; password: string }) => { success: boolean; error?: string };
  depositFunds: (amount: number) => void;
  withdrawFunds: (amount: number) => { success: boolean; error?: string };
  deductCash: (amount: number) => void;
  addCash: (amount: number) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, updateBalance, login: usersLogin, logout: usersLogout, registerUser, isReady } = useUsers();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync current user to state
  const [user, setUser] = useState<UserSession | null>(null);
  const [cashBalance, setCashBalance] = useState<number>(0);

  useEffect(() => {
    if (!isReady) return;
    if (currentUser) {
      setUser({ username: currentUser.username, role: currentUser.role, active: currentUser.active });
      setCashBalance(currentUser.balance);
    } else {
      setUser(null);
      setCashBalance(0);
    }
    setIsLoading(false);
  }, [currentUser, isReady]);

  const login = (username: string, password: string) => {
    const result = usersLogin(username, password);
    if (result.success && result.user) {
      setUser({ username: result.user.username, role: result.user.role, active: result.user.active });
      setCashBalance(result.user.balance);
    }
    return result;
  };

  const logout = () => {
    usersLogout();
    setUser(null);
    setCashBalance(0);
  };

  const depositFunds = (amount: number) => {
    if (!currentUser) return;
    const newBal = currentUser.balance + amount;
    updateBalance(currentUser.id, newBal);
    setCashBalance(newBal);
  };

  const withdrawFunds = (amount: number) => {
    if (amount <= 0) return { success: false, error: 'Amount must be greater than zero.' };
    if (!currentUser) return { success: false, error: 'No user logged in.' };
    if (currentUser.balance < amount) return { success: false, error: 'Insufficient cash balance.' };
    const newBal = currentUser.balance - amount;
    updateBalance(currentUser.id, newBal);
    setCashBalance(newBal);
    return { success: true };
  };

  const deductCash = (amount: number) => {
    if (!currentUser) return;
    const newBal = currentUser.balance - amount;
    updateBalance(currentUser.id, newBal);
    setCashBalance(newBal);
  };

  const addCash = (amount: number) => {
    if (!currentUser) return;
    const newBal = currentUser.balance + amount;
    updateBalance(currentUser.id, newBal);
    setCashBalance(newBal);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        cashBalance,
        login,
        logout,
        registerUser,
        depositFunds,
        withdrawFunds,
        deductCash,
        addCash,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
