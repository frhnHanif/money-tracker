"use client";

import { useState } from "react";
import { Lock, KeyRound, ShieldCheck, ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { usePinLock } from "@/contexts/pin-lock-context";

interface PinSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step =
  | "menu"
  | "setup_new"
  | "setup_confirm"
  | "change_current"
  | "change_new"
  | "change_confirm"
  | "disable_confirm";

export function PinSettingsDialog({ open, onOpenChange }: PinSettingsDialogProps) {
  const { pinEnabled, hasPin, refreshPinStatus, lockApp } = usePinLock();

  const [step, setStep] = useState<Step>("menu");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Input states
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const resetForm = () => {
    setStep("menu");
    setError("");
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    setLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // Setup PIN Flow
  const handleSetupSubmit = async () => {
    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      setError("PIN harus berupa 6 digit angka");
      return;
    }
    if (newPin !== confirmPin) {
      setError("Konfirmasi PIN tidak cocok");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/pin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: newPin }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal membuat PIN");
      } else {
        toast.success("Kunci PIN 6-digit berhasil diaktifkan");
        await refreshPinStatus();
        handleClose();
      }
    } catch {
      setError("Gagal membuat PIN");
    } finally {
      setLoading(false);
    }
  };

  // Change PIN Flow
  const handleChangeSubmit = async () => {
    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      setError("PIN baru harus berupa 6 digit angka");
      return;
    }
    if (newPin !== confirmPin) {
      setError("Konfirmasi PIN baru tidak cocok");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/pin/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin, newPin }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal mengganti PIN");
      } else {
        toast.success("PIN berhasil diperbarui");
        await refreshPinStatus();
        handleClose();
      }
    } catch {
      setError("Gagal mengganti PIN");
    } finally {
      setLoading(false);
    }
  };

  // Disable PIN Flow
  const handleDisableSubmit = async () => {
    if (currentPin.length !== 6 || !/^\d{6}$/.test(currentPin)) {
      setError("Masukkan 6 digit PIN saat ini");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/pin/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: false, pin: currentPin }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "PIN salah");
      } else {
        toast.success("Kunci PIN dinonaktifkan");
        await refreshPinStatus();
        handleClose();
      }
    } catch {
      setError("Gagal menonaktifkan PIN");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? handleClose() : onOpenChange(true))}>
      <DialogContent className="max-w-sm">
        {/* Menu View (when already active or inactive) */}
        {step === "menu" && (
          <>
            <DialogHeader>
              <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-[#0066cc]/10 dark:bg-[#2997ff]/15">
                <Lock className="size-6 text-[#0066cc] dark:text-[#2997ff]" />
              </div>
              <DialogTitle className="text-center text-base">
                Kunci Aplikasi (PIN)
              </DialogTitle>
              <DialogDescription className="text-center text-xs">
                {pinEnabled
                  ? "Kunci PIN 6-digit aktif saat membuka aplikasi."
                  : "Amankan data keuanganmu dengan PIN 6 digit saat membuka aplikasi."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              {!pinEnabled ? (
                <Button
                  onClick={() => {
                    setError("");
                    setNewPin("");
                    setConfirmPin("");
                    setStep("setup_new");
                  }}
                  className="w-full bg-[#0066cc] hover:bg-[#0055b3] text-white"
                >
                  <ShieldCheck className="mr-2 size-4" />
                  Aktifkan Kunci PIN
                </Button>
              ) : (
                <>
                  <div className="flex items-center justify-between rounded-lg bg-[#f5f5f7] p-3 dark:bg-[#2a2a2c]">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#1d1d1f] dark:text-white">
                        Status Kunci PIN
                      </p>
                      <p className="text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
                        Aktif saat membuka aplikasi
                      </p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      Aktif
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setError("");
                      setCurrentPin("");
                      setNewPin("");
                      setConfirmPin("");
                      setStep("change_current");
                    }}
                    className="w-full justify-start"
                  >
                    <KeyRound className="mr-2 size-4 text-[#7a7a7a]" />
                    Ubah PIN
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      handleClose();
                      lockApp();
                    }}
                    className="w-full justify-start text-[#0066cc] hover:text-[#0055b3] dark:text-[#2997ff]"
                  >
                    <Lock className="mr-2 size-4" />
                    Kunci Aplikasi Sekarang
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={() => {
                      setError("");
                      setCurrentPin("");
                      setStep("disable_confirm");
                    }}
                    className="w-full justify-start text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 dark:text-red-400"
                  >
                    <ShieldAlert className="mr-2 size-4" />
                    Nonaktifkan Kunci PIN
                  </Button>
                </>
              )}
            </div>
          </>
        )}

        {/* Step: Setup New PIN */}
        {step === "setup_new" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-base">Buat PIN 6-Digit</DialogTitle>
              <DialogDescription className="text-center text-xs">
                Masukkan 6 angka yang mudah kamu ingat.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label htmlFor="newPin">PIN Baru</Label>
                <Input
                  id="newPin"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setNewPin(val);
                    if (val.length === 6) setError("");
                  }}
                  placeholder="••••••"
                  className="h-12 text-center text-2xl font-semibold tracking-[0.4em]"
                  autoFocus
                />
              </div>

              {error && <p className="text-center text-xs text-red-500">{error}</p>}

              <DialogFooter className="grid grid-cols-2 gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep("menu")}>
                  Batal
                </Button>
                <Button
                  onClick={() => {
                    if (newPin.length !== 6) {
                      setError("PIN harus 6 digit angka");
                      return;
                    }
                    setError("");
                    setStep("setup_confirm");
                  }}
                  disabled={newPin.length !== 6}
                >
                  Lanjut
                </Button>
              </DialogFooter>
            </div>
          </>
        )}

        {/* Step: Setup Confirm PIN */}
        {step === "setup_confirm" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-base">Konfirmasi PIN</DialogTitle>
              <DialogDescription className="text-center text-xs">
                Masukkan ulang 6 digit PIN kamu untuk memastikan.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label htmlFor="confirmPin">Konfirmasi PIN</Label>
                <Input
                  id="confirmPin"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setConfirmPin(val);
                    if (val.length === 6) setError("");
                  }}
                  placeholder="••••••"
                  className="h-12 text-center text-2xl font-semibold tracking-[0.4em]"
                  autoFocus
                />
              </div>

              {error && <p className="text-center text-xs text-red-500">{error}</p>}

              <DialogFooter className="grid grid-cols-2 gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep("setup_new")} disabled={loading}>
                  Kembali
                </Button>
                <Button
                  onClick={handleSetupSubmit}
                  disabled={loading || confirmPin.length !== 6}
                >
                  {loading ? "Menyimpan..." : "Simpan & Aktifkan"}
                </Button>
              </DialogFooter>
            </div>
          </>
        )}

        {/* Step: Change PIN - Current */}
        {step === "change_current" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-base">Ubah PIN</DialogTitle>
              <DialogDescription className="text-center text-xs">
                Masukkan PIN kamu saat ini terlebih dahulu.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label htmlFor="currentPin">PIN Saat Ini</Label>
                <Input
                  id="currentPin"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={currentPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setCurrentPin(val);
                    if (val.length === 6) setError("");
                  }}
                  placeholder="••••••"
                  className="h-12 text-center text-2xl font-semibold tracking-[0.4em]"
                  autoFocus
                />
              </div>

              {error && <p className="text-center text-xs text-red-500">{error}</p>}

              <DialogFooter className="grid grid-cols-2 gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep("menu")}>
                  Batal
                </Button>
                <Button
                  onClick={() => {
                    if (currentPin.length !== 6) {
                      setError("Masukkan 6 digit PIN saat ini");
                      return;
                    }
                    setError("");
                    setStep("change_new");
                  }}
                  disabled={currentPin.length !== 6}
                >
                  Lanjut
                </Button>
              </DialogFooter>
            </div>
          </>
        )}

        {/* Step: Change PIN - New */}
        {step === "change_new" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-base">PIN Baru</DialogTitle>
              <DialogDescription className="text-center text-xs">
                Masukkan 6 digit PIN baru yang kamu inginkan.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label htmlFor="changeNewPin">PIN Baru</Label>
                <Input
                  id="changeNewPin"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setNewPin(val);
                    if (val.length === 6) setError("");
                  }}
                  placeholder="••••••"
                  className="h-12 text-center text-2xl font-semibold tracking-[0.4em]"
                  autoFocus
                />
              </div>

              {error && <p className="text-center text-xs text-red-500">{error}</p>}

              <DialogFooter className="grid grid-cols-2 gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep("change_current")}>
                  Kembali
                </Button>
                <Button
                  onClick={() => {
                    if (newPin.length !== 6) {
                      setError("PIN baru harus 6 digit");
                      return;
                    }
                    if (newPin === currentPin) {
                      setError("PIN baru harus berbeda dengan PIN lama");
                      return;
                    }
                    setError("");
                    setStep("change_confirm");
                  }}
                  disabled={newPin.length !== 6}
                >
                  Lanjut
                </Button>
              </DialogFooter>
            </div>
          </>
        )}

        {/* Step: Change PIN - Confirm */}
        {step === "change_confirm" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-base">Konfirmasi PIN Baru</DialogTitle>
              <DialogDescription className="text-center text-xs">
                Masukkan ulang PIN baru kamu.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label htmlFor="changeConfirmPin">Konfirmasi PIN Baru</Label>
                <Input
                  id="changeConfirmPin"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setConfirmPin(val);
                    if (val.length === 6) setError("");
                  }}
                  placeholder="••••••"
                  className="h-12 text-center text-2xl font-semibold tracking-[0.4em]"
                  autoFocus
                />
              </div>

              {error && <p className="text-center text-xs text-red-500">{error}</p>}

              <DialogFooter className="grid grid-cols-2 gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep("change_new")} disabled={loading}>
                  Kembali
                </Button>
                <Button
                  onClick={handleChangeSubmit}
                  disabled={loading || confirmPin.length !== 6}
                >
                  {loading ? "Menyimpan..." : "Simpan PIN Baru"}
                </Button>
              </DialogFooter>
            </div>
          </>
        )}

        {/* Step: Disable PIN Confirm */}
        {step === "disable_confirm" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-base">
                Nonaktifkan Kunci PIN
              </DialogTitle>
              <DialogDescription className="text-center text-xs">
                Masukkan PIN saat ini untuk menonaktifkan kunci aplikasi.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label htmlFor="disablePin">PIN Saat Ini</Label>
                <Input
                  id="disablePin"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={currentPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setCurrentPin(val);
                    if (val.length === 6) setError("");
                  }}
                  placeholder="••••••"
                  className="h-12 text-center text-2xl font-semibold tracking-[0.4em]"
                  autoFocus
                />
              </div>

              {error && <p className="text-center text-xs text-red-500">{error}</p>}

              <DialogFooter className="grid grid-cols-2 gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep("menu")} disabled={loading}>
                  Batal
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDisableSubmit}
                  disabled={loading || currentPin.length !== 6}
                >
                  {loading ? "Menonaktifkan..." : "Ya, Matikan Kunci"}
                </Button>
              </DialogFooter>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
