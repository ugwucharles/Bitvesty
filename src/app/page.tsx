"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getHomePathForRole } from '@/lib/routes';
import PageLoader from '@/components/PageLoader';

export default function Home() {
  const { isLoggedIn, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isLoggedIn && user) {
        router.replace(getHomePathForRole(user.role));
      } else if (!isLoggedIn) {
        router.replace('/login');
      }
    }
  }, [isLoggedIn, isLoading, user, router]);

  return <PageLoader message="Initializing BitVesty..." />;
}
