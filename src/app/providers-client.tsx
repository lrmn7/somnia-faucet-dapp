'use client';

import { Providers } from '@/lib/providers';

export default function ClientOnlyProviders({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>;
}
