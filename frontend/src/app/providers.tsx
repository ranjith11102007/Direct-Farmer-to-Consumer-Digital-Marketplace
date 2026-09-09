'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/ui/error-boundary';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 30_000,
          },
          mutations: {
            retry: 0,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>{children}</ErrorBoundary>
    </QueryClientProvider>
  );
}