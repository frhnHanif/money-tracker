"use client";

import { useState, useEffect, useCallback } from "react";
import { signOut } from "next-auth/react";
import { Lock, Delete, KeyRound, LogOut, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface PinLockScreenProps {
  userName: string;
  onUnlocked: () => void;
}

const PIN_LENGTH = 6;

export function PinLockScreen({ userName, onUnlocked }: PinLockScreenProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Forgot PIN dialog state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [accountPassword, setAccountPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState("");

  const triggerShake = useCallback(() => {
    setIsShaking(true);
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(200);
      } catch {
        // ignore
      }
    }
    setTimeout(() => setIsShaking(false), 500);
  }, []);

  const verifyPin = useCallback(
    async (candidate: string) => {
      setVerifying(true);
      setError("");
      try {
        const res = await fetch("/api/auth/pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: candidate }),
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok && data.valid) {
          onUnlocked();
        } else {
          setError(data.error || "PIN salah. Silakan coba lagi");
          triggerShake();
          setPin("");
        }
      } catch {
        setError("Gagal memverifikasi PIN");
        triggerShake();
        setPin("");
      } finally {
        setVerifying(false);
      }
    },
    [onUnlocked, triggerShake]
  );

  const handleDigit = useCallback(
    (digit: string) => {
      if (verifying || pin.length >= PIN_LENGTH) return;
      setError("");
      const nextPin = pin + digit;
      setPin(nextPin);

      if (nextPin.length === PIN_LENGTH) {
        verifyPin(nextPin);
      }
    },
    [pin, verifying, verifyPin]
  );

  const handleBackspace = useCallback(() => {
    if (verifying || pin.length === 0) return;
    setError("");
    setPin((prev) => prev.slice(0, -1));
  }, [verifying, pin.length]);

  // Support physical keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (forgotOpen) return;
      if (e.key >= "0" && e.key <= "9") {
        handleDigit(e.key);
      } else if (e.key === "Backspace" || e.key === "Delete") {
        handleBackspace();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleDigit, handleBackspace, forgotOpen]);

  const handleResetWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountPassword) return;

    setResetting(true);
    setResetError("");
    try {
      const res = await fetch("/api/auth/pin/reset-with-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: accountPassword }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setResetError(data.error || "Password salah");
      } else {
        toast.success("PIN berhasil direset. Aplikasi terbuka");
        setForgotOpen(false);
        onUnlocked();
      }
    } catch {
      setResetError("Gagal mereset PIN");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-white px-6 py-8 select-none dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-white">
      {/* Top Header */}
      <div className="flex flex-col items-center text-center pt-4">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-[#0066cc]/10 dark:bg-[#2997ff]/15">
          <Lock className="size-7 text-[#0066cc] dark:text-[#2997ff]" />
        </div>
        <p className="text-sm font-medium text-[#7a7a7a] dark:text-[#cccccc]">
          Halo, {userName}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#1d1d1f] dark:text-white">
          Masukkan PIN
        </h1>
        <p className="mt-1 text-xs text-[#7a7a7a] dark:text-[#cccccc]">
          Buka aplikasi untuk melihat data keuanganmu
        </p>
      </div>

      {/* PIN Dots Indicator */}
      <div className="flex flex-col items-center my-auto">
        <div
          className={`flex items-center gap-4 py-3 transition-transform ${
            isShaking ? "animate-[shake_0.5s_ease-in-out]" : ""
          }`}
        >
          {Array.from({ length: PIN_LENGTH }).map((_, i) => {
            const isFilled = i < pin.length;
            return (
              <div
                key={i}
                className={`size-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? "scale-110 bg-[#0066cc] shadow-sm dark:bg-[#2997ff]"
                    : "border-2 border-[#d2d2d7] bg-transparent dark:border-[#3a3a3c]"
                }`}
              />
            );
          })}
        </div>

        {error ? (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-red-500 dark:text-red-400">
            <AlertCircle className="size-3.5" />
            {error}
          </p>
        ) : (
          <p className="mt-3 text-xs text-transparent">.</p>
        )}
      </div>

      {/* Keypad */}
      <div className="w-full max-w-[280px] space-y-3 pb-2">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(String(digit))}
              disabled={verifying}
              className="flex size-18 items-center justify-center rounded-full bg-[#f5f5f7] text-2xl font-medium text-[#1d1d1f] transition-all active:scale-95 active:bg-[#e5e5ea] dark:bg-[#2a2a2c] dark:text-white dark:active:bg-[#3a3a3c]"
            >
              {digit}
            </button>
          ))}

          {/* Bottom row: Lupa PIN shortcut, 0, Backspace */}
          <button
            type="button"
            onClick={() => {
              setResetError("");
              setAccountPassword("");
              setForgotOpen(true);
            }}
            className="flex size-18 items-center justify-center rounded-full text-xs font-medium text-[#0066cc] transition-opacity active:opacity-70 dark:text-[#2997ff]"
          >
            Lupa?
          </button>

          <button
            type="button"
            onClick={() => handleDigit("0")}
            disabled={verifying}
            className="flex size-18 items-center justify-center rounded-full bg-[#f5f5f7] text-2xl font-medium text-[#1d1d1f] transition-all active:scale-95 active:bg-[#e5e5ea] dark:bg-[#2a2a2c] dark:text-white dark:active:bg-[#3a3a3c]"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            disabled={verifying || pin.length === 0}
            aria-label="Hapus digit"
            className="flex size-18 items-center justify-center rounded-full bg-[#f5f5f7] text-[#1d1d1f] transition-all active:scale-95 active:bg-[#e5e5ea] disabled:opacity-40 dark:bg-[#2a2a2c] dark:text-white dark:active:bg-[#3a3a3c]"
          >
            <Delete className="size-6" />
          </button>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-4 text-xs">
          <button
            type="button"
            onClick={() => {
              setResetError("");
              setAccountPassword("");
              setForgotOpen(true);
            }}
            className="flex items-center gap-1 font-medium text-[#7a7a7a] hover:text-[#1d1d1f] dark:text-[#cccccc] dark:hover:text-white"
          >
            <KeyRound className="size-3.5" />
            Lupa PIN
          </button>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1 font-medium text-red-500 hover:text-red-600 dark:text-red-400"
          >
            <LogOut className="size-3.5" />
            Keluar Akun
          </button>
        </div>
      </div>

      {/* Forgot PIN / Reset Dialog */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Reset Kunci PIN</DialogTitle>
            <DialogDescription className="text-xs">
              Masukkan password akun Money Tracker kamu untuk membuka aplikasi dan
              mereset PIN.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResetWithPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accountPassword">Password Akun</Label>
              <Input
                id="accountPassword"
                type="password"
                placeholder="Password akun kamu"
                value={accountPassword}
                onChange={(e) => setAccountPassword(e.target.value)}
                autoFocus
                required
              />
              {resetError && (
                <p className="text-xs text-red-500">{resetError}</p>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setForgotOpen(false)}
                disabled={resetting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={resetting || !accountPassword}>
                {resetting ? "Memverifikasi..." : "Verifikasi & Buka"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
