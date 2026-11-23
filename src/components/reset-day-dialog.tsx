"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CalendarDays, CalendarClock, Minus, Plus, Info, Check } from "lucide-react";
import { toast } from "sonner";
import { getCycleRange, getCurrentCycle, MONTHS_SHORT } from "@/lib/cycle";

interface ResetDayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentResetDay: number;
  onSave: (day: number) => Promise<unknown> | void;
}

const PRESETS = [
  { day: 1, label: "Tgl 1" },
  { day: 20, label: "Tgl 20" },
  { day: 23, label: "Tgl 23" },
  { day: 25, label: "Tgl 25" },
  { day: 28, label: "Tgl 28" },
  { day: 30, label: "Tgl 30" },
];

export function ResetDayDialog({
  open,
  onOpenChange,
  currentResetDay,
  onSave,
}: ResetDayDialogProps) {
  const [selectedDay, setSelectedDay] = useState(currentResetDay || 1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedDay(currentResetDay || 1);
    }
  }, [open, currentResetDay]);

  // Live preview calculations
  const preview = useMemo(() => {
    const now = new Date();
    const active = getCurrentCycle(selectedDay, now);
    const range = getCycleRange(active.year, active.month, selectedDay);

    // Calculate next reset date
    const nextCycleMonth = active.month === 12 ? 1 : active.month + 1;
    const nextCycleYear = active.month === 12 ? active.year + 1 : active.year;
    const nextRange = getCycleRange(nextCycleMonth, nextCycleYear, selectedDay);

    return {
      activeRange: range,
      nextResetDate: nextRange.startDate,
      nextResetLabel: `${selectedDay} ${MONTHS_SHORT[nextCycleMonth - 1]} ${nextCycleYear}`,
    };
  }, [selectedDay]);

  const handleStep = (delta: number) => {
    setSelectedDay((prev) => {
      const next = prev + delta;
      if (next < 1) return 31;
      if (next > 31) return 1;
      return next;
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave(selectedDay);
      toast.success(
        selectedDay === 1
          ? "Siklus statistik diatur ulang ke tanggal 1 (Awal bulan)"
          : `Siklus statistik diatur ulang ke setiap tanggal ${selectedDay}`
      );
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Gagal menyimpan tanggal reset");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#10b981]/15 text-[#10b981]">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-[#1d1d1f] dark:text-white">
                Tanggal Reset Statistik
              </DialogTitle>
              <DialogDescription className="text-xs text-[#7a7a7a] dark:text-[#cccccc]">
                Tentukan kapan siklus statistik bulanan di-reset
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Stepper Input */}
          <div className="flex items-center justify-between rounded-xl bg-[#f5f5f7] p-4 dark:bg-[#2a2a2c]">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => handleStep(-1)}
              className="h-10 w-10 shrink-0 rounded-full bg-white dark:bg-[#3a3a3c]"
              aria-label="Kurang satu hari"
            >
              <Minus className="h-4 w-4" />
            </Button>

            <div className="text-center">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#7a7a7a] dark:text-[#cccccc]">
                Setiap Tanggal
              </span>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold tracking-tight text-[#1d1d1f] dark:text-white">
                  {selectedDay}
                </span>
                <span className="text-xs text-[#7a7a7a] dark:text-[#cccccc]">
                  tiap bulan
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => handleStep(1)}
              className="h-10 w-10 shrink-0 rounded-full bg-white dark:bg-[#3a3a3c]"
              aria-label="Tambah satu hari"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Quick Presets */}
          <div>
            <p className="mb-2 text-xs font-medium text-[#7a7a7a] dark:text-[#cccccc]">
              Pilihan Cepat
            </p>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((p) => {
                const isActive = selectedDay === p.day;
                return (
                  <button
                    key={p.day}
                    type="button"
                    onClick={() => setSelectedDay(p.day)}
                    className={`flex items-center justify-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-[#0066cc] text-white shadow-sm"
                        : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed] dark:bg-[#2a2a2c] dark:text-white dark:hover:bg-[#333336]"
                    }`}
                  >
                    {isActive && <Check className="h-3 w-3 shrink-0" />}
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="rounded-lg border border-[#e0e0e0] bg-white p-3.5 dark:border-white/10 dark:bg-[#232325]">
            <div className="flex items-center gap-1.5 text-xs font-medium text-[#0066cc] dark:text-[#2997ff]">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>Pratinjau Siklus Keuangan</span>
            </div>

            <div className="mt-2.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#7a7a7a] dark:text-[#cccccc]">Periode aktif saat ini:</span>
                <span className="font-semibold text-[#1d1d1f] dark:text-white">
                  {preview.activeRange.label}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#7a7a7a] dark:text-[#cccccc]">Reset statistik berikutnya:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {preview.nextResetLabel}
                </span>
              </div>
            </div>

            <div className="mt-3 flex items-start gap-1.5 rounded-md bg-[#f5f5f7] p-2 text-[11px] text-[#7a7a7a] dark:bg-[#2a2a2c] dark:text-[#cccccc]">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0066cc]" />
              <p>
                {selectedDay === 1
                  ? "Statistik pengeluaran dihitung per bulan kalender (tanggal 1 s.d. akhir bulan)."
                  : `Transaksi mulai tanggal ${selectedDay} dihitung dalam siklus berjalan. Transaksi sebelum tanggal ${selectedDay} masuk ke siklus sebelumnya.`}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row justify-end gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-[#0066cc] text-white hover:bg-[#0055b3]"
          >
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
