"use client";

import { useState } from "react";
import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { BalanceVisibilityProvider } from "@/contexts/balance-visibility-context";
import { PinLockProvider } from "@/contexts/pin-lock-context";

function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <BalanceVisibilityProvider>
          <PinLockProvider>
            {children}
            <Toaster position="top-center" richColors />
          </PinLockProvider>
        </BalanceVisibilityProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Providers>{children}</Providers>;
}
