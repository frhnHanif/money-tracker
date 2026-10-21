"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PinLockScreen } from "@/components/pin-lock-screen";

interface PinStatusResponse {
  pinEnabled: boolean;
  hasPin: boolean;
}

interface PinLockContextType {
  isLocked: boolean;
  pinEnabled: boolean;
  hasPin: boolean;
  lockApp: () => void;
  unlockApp: () => void;
  refreshPinStatus: () => Promise<void>;
}

const PinLockContext = createContext<PinLockContextType | undefined>(undefined);

const UNLOCKED_KEY = "money_tracker_unlocked";

export function PinLockProvider({ children }: { children: React.ReactNode }) {
  const { status, data: session } = useSession();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const [mounted, setMounted] = useState(false);
  const [unlockedState, setUnlockedState] = useState<boolean>(false);

  // Sync mounted and initial session storage state on mount
  useEffect(() => {
    setMounted(true);
    const isUnlocked = sessionStorage.getItem(UNLOCKED_KEY) === "true";
    setUnlockedState(isUnlocked);
  }, []);

  const isOnAuthPage = pathname?.startsWith("/login") || pathname?.startsWith("/register");
  const isAuthenticated = status === "authenticated" && !isOnAuthPage;

  // Query PIN status from API
  const { data: pinStatus } = useQuery<PinStatusResponse>({
    queryKey: ["pin-status", session?.user?.id],
    queryFn: async () => {
      const res = await fetch("/api/auth/pin");
      if (!res.ok) return { pinEnabled: false, hasPin: false };
      return res.json();
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const pinEnabled = Boolean(pinStatus?.pinEnabled);
  const hasPin = Boolean(pinStatus?.hasPin);

  // Determine if app is currently locked
  const isLocked = Boolean(
    mounted &&
      isAuthenticated &&
      pinEnabled &&
      !unlockedState
  );

  const unlockApp = useCallback(() => {
    sessionStorage.setItem(UNLOCKED_KEY, "true");
    setUnlockedState(true);
  }, []);

  const lockApp = useCallback(() => {
    sessionStorage.removeItem(UNLOCKED_KEY);
    setUnlockedState(false);
  }, []);

  const refreshPinStatus = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["pin-status"] });
  }, [queryClient]);

  // When user logs out, reset unlocked state
  useEffect(() => {
    if (status === "unauthenticated") {
      sessionStorage.removeItem(UNLOCKED_KEY);
      setUnlockedState(false);
    }
  }, [status]);

  return (
    <PinLockContext.Provider
      value={{
        isLocked,
        pinEnabled,
        hasPin,
        lockApp,
        unlockApp,
        refreshPinStatus,
      }}
    >
      {isLocked ? (
        <PinLockScreen
          userName={session?.user?.name || "Pengguna"}
          onUnlocked={unlockApp}
        />
      ) : (
        children
      )}
    </PinLockContext.Provider>
  );
}

export function usePinLock() {
  const context = useContext(PinLockContext);
  if (!context) {
    throw new Error("usePinLock must be used within a PinLockProvider");
  }
  return context;
}
