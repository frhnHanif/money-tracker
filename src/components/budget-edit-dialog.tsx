"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil, Plus } from "lucide-react";
import { formatInputCurrency } from "@/lib/utils";

export function BudgetEditDialog({
  cat,
  current,
  onSave,
}: {
  cat: { id: number; name: string };
  current: number;
  onSave: (amount: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setDisplay(current > 0 ? current.toLocaleString("id-ID") : "");
  }, [open, current]);

  const submit = async () => {
    const amount = parseInt(display.replace(/\D/g, ""), 10);
    if (!amount || amount <= 0) return;
    setLoading(true);
    try {
      await onSave(amount);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {current > 0 ? (
          <button
            aria-label="Edit budget"
            className="flex h-8 w-8 items-center justify-center rounded text-[#7a7a7a] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] dark:text-[#cccccc] dark:hover:bg-[#2a2a2c] dark:hover:text-white"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        ) : (
          <Button variant="ghost" size="sm">
            <Plus className="h-4 w-4" />
            Atur
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Budget {cat.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nominal budget per bulan</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={display}
              onChange={(e) => setDisplay(formatInputCurrency(e.target.value))}
              placeholder="Rp0"
              className="h-12 text-center text-lg font-semibold"
            />
          </div>
          <DialogFooter>
            <Button
              onClick={submit}
              disabled={loading || !display}
              className="w-full"
            >
              {loading ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}