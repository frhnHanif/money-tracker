"use client";

import React, { createContext, useContext, useState } from "react";

interface BalanceVisibilityContextType {
  showBalance: boolean;
  setShowBalance: React.Dispatch<React.SetStateAction<boolean>>;
  toggleBalance: () => void;
}

const BalanceVisibilityContext = createContext<
  BalanceVisibilityContextType | undefined
>(undefined);

export function BalanceVisibilityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // By default, balance remains hidden when the app is first opened
  const [showBalance, setShowBalance] = useState(false);

  const toggleBalance = () => setShowBalance((prev) => !prev);

  return (
    <BalanceVisibilityContext.Provider
      value={{ showBalance, setShowBalance, toggleBalance }}
    >
      {children}
    </BalanceVisibilityContext.Provider>
  );
}

export function useBalanceVisibility() {
  const context = useContext(BalanceVisibilityContext);
  if (!context) {
    throw new Error(
      "useBalanceVisibility must be used within a BalanceVisibilityProvider"
    );
  }
  return context;
}
