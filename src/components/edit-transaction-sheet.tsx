"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { formatInputCurrency } from "@/lib/utils";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { TransactionItemData } from "@/components/transaction-action-sheet";

const formSchema = z.object({
  type: z.enum(["expense", "income", "transfer"]),
  amount: z.string().min(1, "Nominal harus diisi"),
  fee: z.string().optional(),
  categoryId: z.string().optional(),
  accountId: z.string().min(1, "Akun harus dipilih"),
  toAccountId: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  date: z.string(),
});

type FormData = z.infer<typeof formSchema>;

interface EditTransactionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: TransactionItemData | null;
  accounts: { id: number; name: string }[];
  categories: { id: number; name: string; type: string }[];
  onSuccess?: () => void;
}

export function EditTransactionSheet({
  open,
  onOpenChange,
  transaction,
  accounts,
  categories,
  onSuccess,
}: EditTransactionSheetProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [transactionType, setTransactionType] = useState<string>("expense");
  const [displayAmount, setDisplayAmount] = useState("");
  const [displayFee, setDisplayFee] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isDatePickerExpanded, setIsDatePickerExpanded] = useState(false);

  const isTransfer =
    transaction?.groupedTransfer ||
    transaction?.type === "transfer_out" ||
    transaction?.type === "transfer_in";
  const isAdjustment =
    transaction?.type === "adjustment_in" ||
    transaction?.type === "adjustment_out";

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "expense",
      date: format(new Date(), "yyyy-MM-dd"),
      amount: "",
      description: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (open && transaction) {
      const type = isTransfer
        ? "transfer"
        : transaction.type === "income"
          ? "income"
          : "expense";

      setTransactionType(type);
      setValue("type", type as "expense" | "income" | "transfer");

      const amtStr = String(transaction.amount || "");
      setDisplayAmount(formatInputCurrency(amtStr));
      setValue("amount", amtStr.replace(/\D/g, ""));

      const feeStr = String(transaction.fee || "");
      setDisplayFee(transaction.fee ? formatInputCurrency(feeStr) : "");
      setValue("fee", feeStr.replace(/\D/g, ""));

      const cId = transaction.categoryId ? String(transaction.categoryId) : "";
      setCategoryId(cId);
      setValue("categoryId", cId);

      const aId = transaction.accountId ? String(transaction.accountId) : "";
      setAccountId(aId);
      setValue("accountId", aId);

      const toAId = transaction.transferIn?.accountId
        ? String(transaction.transferIn.accountId)
        : "";
      setToAccountId(toAId);
      setValue("toAccountId", toAId);

      setValue("description", transaction.description || "");
      setValue("notes", transaction.notes || "");

      const txDate = transaction.date
        ? typeof transaction.date === "string"
          ? parseISO(transaction.date)
          : new Date(transaction.date)
        : new Date();
      setSelectedDate(txDate);
      setValue("date", format(txDate, "yyyy-MM-dd"));
      setIsDatePickerExpanded(false);
    }
  }, [open, transaction, isTransfer, setValue]);

  const filteredCategories = categories.filter(
    (c) => c.type === "both" || c.type === transactionType
  );

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["summary"] });
    queryClient.invalidateQueries({ queryKey: ["balances"] });
    queryClient.invalidateQueries({ queryKey: ["breakdown"] });
    queryClient.invalidateQueries({ queryKey: ["trend"] });
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
  };

  const onSubmit = async (data: FormData) => {
    if (!transaction) return;
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        amount: parseInt(data.amount.replace(/\D/g, ""), 10),
        accountId: parseInt(data.accountId, 10),
        date: data.date,
        description: data.description || "",
        notes: data.notes || "",
      };

      if (isTransfer) {
        if (data.toAccountId) {
          body.toAccountId = parseInt(data.toAccountId, 10);
        }
        body.fee = parseInt(data.fee?.replace(/\D/g, "") || "0", 10) || 0;
      } else if (!isAdjustment) {
        body.type = data.type;
        body.categoryId = data.categoryId ? parseInt(data.categoryId, 10) : null;
      }

      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success("Transaksi berhasil diperbarui");
        invalidateAll();
        onOpenChange(false);
        reset();
        onSuccess?.();
      } else {
        const err = await res.json();
        toast.error(err.error || "Gagal memperbarui transaksi");
      }
    } catch {
      toast.error("Terjadi kesalahan sistem");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>Edit Transaksi</SheetTitle>
          <SheetDescription>Perbarui rincian transaksi</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Type Toggle (hanya untuk non-transfer dan non-penyesuaian) */}
          {!isTransfer && !isAdjustment && (
            <SegmentedControl
              options={[
                { value: "expense", label: "Expense", color: "#ef4444" },
                { value: "income", label: "Income", color: "#16a34a" },
              ]}
              value={transactionType}
              onChange={(v) => {
                setTransactionType(v);
                setValue("type", v as "expense" | "income" | "transfer");
                setValue("categoryId", "");
                setCategoryId("");
              }}
            />
          )}

          {/* Amount */}
          <div className="space-y-2">
            <Label>Nominal</Label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="Rp0"
              value={displayAmount}
              onChange={(e) => {
                const formatted = formatInputCurrency(e.target.value);
                setDisplayAmount(formatted);
                setValue("amount", e.target.value.replace(/\D/g, ""));
              }}
              className="h-14 text-center text-2xl font-bold"
            />
            {errors.amount && (
              <p className="text-sm text-destructive">{errors.amount.message}</p>
            )}
          </div>

          {/* Admin Fee (transfer only) */}
          {isTransfer && (
            <div className="space-y-2">
              <Label>Biaya Admin (opsional)</Label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="Rp0"
                value={displayFee}
                onChange={(e) => {
                  const formatted = formatInputCurrency(e.target.value);
                  setDisplayFee(formatted);
                  setValue("fee", e.target.value.replace(/\D/g, ""));
                }}
                className="h-12 text-center text-lg font-semibold"
              />
            </div>
          )}

          {/* Category (non-transfer only) */}
          {!isTransfer && !isAdjustment && (
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select
                value={categoryId || undefined}
                onValueChange={(v) => {
                  setCategoryId(v);
                  setValue("categoryId", v);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Account */}
          <div className="space-y-2">
            <Label>{isTransfer ? "Dari Akun" : "Akun"}</Label>
            <Select
              value={accountId || undefined}
              onValueChange={(v) => {
                setAccountId(v);
                setValue("accountId", v);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih akun" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={String(acc.id)}>
                    {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.accountId && (
              <p className="text-sm text-destructive">{errors.accountId.message}</p>
            )}
          </div>

          {/* To Account (transfer only) */}
          {isTransfer && (
            <div className="space-y-2">
              <Label>Ke Akun</Label>
              <Select
                value={toAccountId || undefined}
                onValueChange={(v) => {
                  setToAccountId(v);
                  setValue("toAccountId", v);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih akun tujuan" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={String(acc.id)}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label>Deskripsi</Label>
            <Input
              {...register("description")}
              placeholder="Contoh: Makan siang, Bensin..."
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Catatan (opsional)</Label>
            <Input {...register("notes")} placeholder="Catatan tambahan..." />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Tanggal</Label>
            <button
              type="button"
              onClick={() => setIsDatePickerExpanded(!isDatePickerExpanded)}
              className="flex h-12 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <span className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 opacity-50" />
                {format(selectedDate, "d MMMM yyyy", { locale: id })}
              </span>
              <ChevronDown
                className={`h-4 w-4 opacity-50 transition-transform duration-200 ${
                  isDatePickerExpanded ? "rotate-180" : ""
                }`}
              />
            </button>
            {isDatePickerExpanded && (
              <div className="flex justify-center rounded-md border bg-popover p-3 shadow-sm">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(day) => {
                    if (day) {
                      setSelectedDate(day);
                      setValue("date", format(day, "yyyy-MM-dd"));
                      setIsDatePickerExpanded(false);
                    }
                  }}
                />
              </div>
            )}
          </div>

          <SheetFooter className="pt-4">
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
