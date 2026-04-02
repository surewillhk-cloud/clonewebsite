'use client';

import { SessionProvider } from 'next-auth/react';
import { LocaleProvider } from '@/contexts/LocaleContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LocaleProvider>
        {children}
      </LocaleProvider>
    </SessionProvider>
  );
}
