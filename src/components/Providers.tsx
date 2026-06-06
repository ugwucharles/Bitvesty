"use client";

import React from 'react';
import { UsersProvider } from '@/context/UsersContext';
import { AuthProvider } from '@/context/AuthContext';
import { TradingProvider } from '@/context/TradingContext';
import { ToastProvider } from '@/components/Toast';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UsersProvider>
      <AuthProvider>
        <TradingProvider>
          <ToastProvider>{children}</ToastProvider>
        </TradingProvider>
      </AuthProvider>
    </UsersProvider>
  );
}
