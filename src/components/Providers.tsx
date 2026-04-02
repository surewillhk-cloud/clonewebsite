'use client';

import { SessionProvider } from 'next-auth/react';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { AuthGuard } from '@/components/auth/AuthGuard';

interface ProvidersProps {
  children: React.ReactNode;
  protectedRoutes?: string[];
}

export function Providers({ children, protectedRoutes = [] }: ProvidersProps) {
  return (
    <SessionProvider>
      <LocaleProvider>
        <AuthGuard>{children}</AuthGuard>
      </LocaleProvider>
    </SessionProvider>
  );
}
