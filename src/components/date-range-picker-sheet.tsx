"use client";

import { useState, useEffect } from "react";
import type { DateRange } from "react-day-picker";
import { format, subDays, startOfMonth, endOfMonth, subMonths, isSameDay } from "date-fns";
import { id } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ArrowRight, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateRangePickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateRange: { from: Date; to: Date };
  onApply: (range: { from: Date; to: Date }, presetLabel?: string) => void;
  onResetToDefault: () => void;
}

export function DateRangePickerSheet({
  open,
  onOpenChange,
  dateRange,
  onApply,
  onResetToDefault,
}: DateRangePickerSheetProps) {
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>({
    from: dateRange.from,
    to: dateRange.to,
  });

  // Keep internal range in sync when opening or props change
  useEffect(() => {
    if (open) {
      setSelectedRange({
        from: dateRange.from,
        to: dateRange.to,
      });
    }
  }, [open, dateRange.from, dateRange.to]);

  const handlePreset = (days: number, label: string) => {
    const today = new Date();
    const from = subDays(today, days - 1);
    setSelectedRange({ from, to: today });
  };

  const handleThisMonth = () => {
    const today = new Date();
    setSelectedRange({
      from: startOfMonth(today),
      to: endOfMonth(today),
    });
  };

  const handleLastMonth = () => {
    const lastMonth = subMonths(new Date(), 1);
    setSelectedRange({
      from: startOfMonth(lastMonth),
      to: endOfMonth(lastMonth),
    });
  };

  // Determine active preset
  const isPreset7Days =
    selectedRange?.from &&
    selectedRange?.to &&
    isSameDay(selectedRange.to, new Date()) &&
    isSameDay(selectedRange.from, subDays(new Date(), 6));

  const isPreset30Days =
    selectedRange?.from &&
    selectedRange?.to &&
    isSameDay(selectedRange.to, new Date()) &&
    isSameDay(selectedRange.from, subDays(new Date(), 29));

  const isPresetThisMonth =
    selectedRange?.from &&
    selectedRange?.to &&
    isSameDay(selectedRange.from, startOfMonth(new Date())) &&
    isSameDay(selectedRange.to, endOfMonth(new Date()));

  const isPresetLastMonth =
    selectedRange?.from &&
    selectedRange?.to &&
    isSameDay(selectedRange.from, startOfMonth(subMonths(new Date(), 1))) &&
    isSameDay(selectedRange.to, endOfMonth(subMonths(new Date(), 1)));

  const handleApply = () => {
    if (!selectedRange?.from) return;
    const from = selectedRange.from;
    const to = selectedRange.to || selectedRange.from;

    let label: string | undefined = undefined;
    if (isPreset7Days) label = "7 Hari Terakhir";
    else if (isPreset30Days) label = "30 Hari Terakhir";
    else if (isPresetThisMonth) label = "Bulan Ini";
    else if (isPresetLastMonth) label = "Bulan Lalu";

    onApply({ from, to }, label);
    onOpenChange(false);
  };

  const handleReset = () => {
    onResetToDefault();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92vh] overflow-y-auto rounded-t-3xl px-5 pb-6 pt-3 focus:outline-none"
      >
        {/* Grab bar pill khas iOS */}
        <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-[#d2d2d7] dark:bg-[#444446]" />

        <SheetHeader className="mb-3 text-center">
          <SheetTitle className="text-base font-semibold text-[#1d1d1f] dark:text-white">
            Filter Rentang Tanggal
          </SheetTitle>
          <SheetDescription className="text-xs text-[#7a7a7a] dark:text-[#cccccc]">
            Pilih periode transaksi yang ingin ditampilkan
          </SheetDescription>
        </SheetHeader>

        {/* Quick Presets */}
        <div className="mb-3 flex flex-wrap items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => handlePreset(7, "7 Hari Terakhir")}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              isPreset7Days
                ? "bg-[#0066cc] text-white dark:bg-[#2997ff]"
                : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed] dark:bg-[#2a2a2c] dark:text-white dark:hover:bg-[#343438]"
            )}
          >
            7 Hari Terakhir
          </button>
          <button
            type="button"
            onClick={() => handlePreset(30, "30 Hari Terakhir")}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              isPreset30Days
                ? "bg-[#0066cc] text-white dark:bg-[#2997ff]"
                : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed] dark:bg-[#2a2a2c] dark:text-white dark:hover:bg-[#343438]"
            )}
          >
            30 Hari Terakhir
          </button>
          <button
            type="button"
            onClick={handleThisMonth}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              isPresetThisMonth
                ? "bg-[#0066cc] text-white dark:bg-[#2997ff]"
                : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed] dark:bg-[#2a2a2c] dark:text-white dark:hover:bg-[#343438]"
            )}
          >
            Bulan Ini
          </button>
          <button
            type="button"
            onClick={handleLastMonth}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              isPresetLastMonth
                ? "bg-[#0066cc] text-white dark:bg-[#2997ff]"
                : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed] dark:bg-[#2a2a2c] dark:text-white dark:hover:bg-[#343438]"
            )}
          >
            Bulan Lalu
          </button>
        </div>

        {/* Selected Range Display Card */}
        <div className="mb-3 flex items-center justify-between rounded-xl bg-[#f5f5f7] p-3 text-center dark:bg-[#2a2a2c]">
          <div className="flex-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#7a7a7a] dark:text-[#cccccc]">
              Dari
            </span>
            <p className="text-sm font-semibold text-[#1d1d1f] dark:text-white">
              {selectedRange?.from
                ? format(selectedRange.from, "d MMM yyyy", { locale: id })
                : "Pilih tanggal"}
            </p>
          </div>
          <ArrowRight className="mx-2 h-4 w-4 shrink-0 text-[#7a7a7a] dark:text-[#cccccc]" />
          <div className="flex-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#7a7a7a] dark:text-[#cccccc]">
              Sampai
            </span>
            <p className="text-sm font-semibold text-[#1d1d1f] dark:text-white">
              {selectedRange?.to
                ? format(selectedRange.to, "d MMM yyyy", { locale: id })
                : selectedRange?.from
                  ? "Pilih tanggal akhir..."
                  : "Pilih tanggal"}
            </p>
          </div>
        </div>

        {/* Calendar Picker */}
        <div className="flex justify-center rounded-2xl border border-[#e0e0e0] bg-white p-2 shadow-sm dark:border-white/10 dark:bg-[#242426]">
          <Calendar
            mode="range"
            selected={selectedRange}
            onSelect={setSelectedRange}
            numberOfMonths={1}
          />
        </div>

        {/* Footer Actions */}
        <div className="mt-4 flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleReset}
            className="h-10 w-10 shrink-0 rounded-xl border-[#e0e0e0] text-[#7a7a7a] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] dark:border-white/15 dark:text-[#cccccc] dark:hover:bg-[#2a2a2c] dark:hover:text-white"
            title="Reset ke 7 Hari Terakhir"
            aria-label="Reset ke 7 Hari Terakhir"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={!selectedRange?.from}
            className="flex-1 h-10 rounded-xl bg-[#0066cc] text-xs font-medium text-white hover:bg-[#0055b3] dark:bg-[#2997ff] dark:hover:bg-[#1a88ff]"
          >
            Terapkan Filter
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
