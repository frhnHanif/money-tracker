"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
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
import { formatCurrency, formatInputCurrency } from "@/lib/utils";
import { dueRemaining, type DueItem } from "@/lib/dues";

const formSchema = z.object({
  type: z.enum(["expense", "income", "transfer"]),
  amount: z.string().min(1, "Nominal harus diisi"),
  categoryId: z.string().optional(),
  accountId: z.string().min(1, "Akun harus dipilih"),
  toAccountId: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  date: z.string(),
});

type FormData = z.infer<typeof formSchema>;

type DueMode =
  | "none"
  | "new_receivable"
  | "new_payable"
  | "settle_receivable"
  | "settle_payable";

interface AddTransactionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: { id: number; name: string }[];
  categories: { id: number; name: string; type: string }[];
  onSuccess?: () => void;
}

export function AddTransactionSheet({
  open,
  onOpenChange,
  accounts,
  categories,
  onSuccess,
}: AddTransactionSheetProps) {
  const [transactionType, setTransactionType] = useState("expense");
  const [loading, setLoading] = useState(false);
  const [displayAmount, setDisplayAmount] = useState("");
  const [dueMode, setDueMode] = useState<DueMode>("none");
  const [duePerson, setDuePerson] = useState("");
  const [dueId, setDueId] = useState("");

  const { data: openDues = [] } = useQuery<DueItem[]>({
    queryKey: ["dues", "open"],
    queryFn: () => fetch("/api/dues?status=open").then((r) => r.json()),
  });

  const people = Array.from(new Set(openDues.map((d) => d.person))).sort();

  const dueOptions =
    transactionType === "expense"
      ? ([
          { value: "none", label: "Tidak ada" },
          { value: "new_receivable", label: "Tagih ke orang (piutang baru)" },
          { value: "settle_payable", label: "Lunasi utangku (utang saya)" },
        ] as const)
      : ([
          { value: "none", label: "Tidak ada" },
          { value: "settle_receivable", label: "Piutang dilunasi orang" },
          { value: "new_payable", label: "Pinjam dari orang (utang baru)" },
        ] as const);

  const matchingDues = openDues.filter((d) =>
    transactionType === "expense"
      ? d.direction === "payable"
      : d.direction === "receivable"
  );

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
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

  const filteredCategories = categories.filter(
    (c) => c.type === "both" || c.type === transactionType
  );

  const runDueAction = async (txId: number, data: FormData) => {
    if (dueMode === "none") return;

    if (dueMode === "new_receivable" || dueMode === "new_payable") {
      await fetch("/api/dues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direction: dueMode === "new_receivable" ? "receivable" : "payable",
          person: duePerson.trim() || "Orang",
          title: data.description || (dueMode === "new_receivable" ? "Piutang" : "Utang"),
          amount: parseInt(data.amount.replace(/\D/g, ""), 10),
          transactionId: txId,
        }),
      });
    } else if (dueMode === "settle_receivable" || dueMode === "settle_payable") {
      if (!dueId) return;
      await fetch(`/api/dues/${dueId}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseInt(data.amount.replace(/\D/g, ""), 10),
          transactionId: txId,
        }),
      });
    }
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const body: any = {
        type: data.type,
        amount: parseInt(data.amount.replace(/\D/g, ""), 10),
        accountId: parseInt(data.accountId),
        categoryId: data.categoryId ? parseInt(data.categoryId) : null,
        description: data.description || "",
        notes: data.notes || "",
        date: data.date,
      };

      if (data.type === "transfer" && data.toAccountId) {
        body.toAccountId = parseInt(data.toAccountId);
      }

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const result = await res.json();
        const txId = result?.id ?? result?.out?.id;
        if (txId) await runDueAction(txId, data);
        reset();
        setDisplayAmount("");
        setTransactionType("expense");
        setDueMode("none");
        setDuePerson("");
        setDueId("");
        onOpenChange(false);
        onSuccess?.();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>Tambah Transaksi</SheetTitle>
          <SheetDescription>Catat pemasukan atau pengeluaran baru</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Type Toggle */}
          <SegmentedControl
            options={[
              { value: "expense", label: "Expense", color: "#ef4444" },
              { value: "income", label: "Income", color: "#16a34a" },
              { value: "transfer", label: "Transfer", color: "#3b82f6" },
            ]}
            value={transactionType}
            onChange={(v) => {
              setTransactionType(v);
              setValue("type", v as any);
              setValue("categoryId", "");
            }}
          />

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
              className="text-2xl font-bold text-center h-14"
            />
            {errors.amount && (
              <p className="text-sm text-destructive">{errors.amount.message}</p>
            )}
          </div>

          {/* Category */}
          {transactionType !== "transfer" && (
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select
                onValueChange={(v) => setValue("categoryId", v)}
                defaultValue=""
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
            <Label>{transactionType === "transfer" ? "Dari Akun" : "Akun"}</Label>
            <Select
              onValueChange={(v) => setValue("accountId", v)}
              defaultValue=""
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
          </div>

          {/* To Account (transfer only) */}
          {transactionType === "transfer" && (
            <div className="space-y-2">
              <Label>Ke Akun</Label>
              <Select
                onValueChange={(v) => setValue("toAccountId", v)}
                defaultValue=""
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
            <Input
              {...register("notes")}
              placeholder="Catatan tambahan..."
            />
          </div>

          {/* Due / Split-bill (expense & income only) */}
          {transactionType !== "transfer" && (
            <div className="space-y-2">
              <Label>Utang / Piutang (opsional)</Label>
              <Select
                value={dueMode}
                onValueChange={(v) => {
                  setDueMode(v as DueMode);
                  setDuePerson("");
                  setDueId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dueOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(dueMode === "new_receivable" || dueMode === "new_payable") && (
                <div className="space-y-2">
                  <Label>
                    {dueMode === "new_receivable"
                      ? "Ditagihkan ke siapa?"
                      : "Pinjam dari siapa?"}
                  </Label>
                  <Input
                    list="due-people"
                    value={duePerson}
                    onChange={(e) => setDuePerson(e.target.value)}
                    placeholder="Nama orang..."
                  />
                  <datalist id="due-people">
                    {people.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </div>
              )}

              {(dueMode === "settle_receivable" ||
                dueMode === "settle_payable") && (
                <div className="space-y-2">
                  <Label>
                    {dueMode === "settle_receivable"
                      ? "Piutang mana yang dilunasi?"
                      : "Utang mana yang dibayar?"}
                  </Label>
                  <Select value={dueId} onValueChange={setDueId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih tagihan..." />
                    </SelectTrigger>
                    <SelectContent>
                      {matchingDues.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {d.person} — {d.title || "Tagihan"} (sisa{" "}
                          {formatCurrency(dueRemaining(d))})
                        </SelectItem>
                      ))}
                      {matchingDues.length === 0 && (
                        <SelectItem value="__none" disabled>
                          Tidak ada tagihan terbuka
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Date */}
          <div className="space-y-2">
            <Label>Tanggal</Label>
            <Input
              type="text"
              placeholder="DD/MM/YYYY"
              value={(() => {
                const d = watch("date");
                if (!d) return "";
                const [y, m, day] = d.split("-");
                return `${day}/${m}/${y}`;
              })()}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "");
                if (raw.length === 8) {
                  const day = raw.slice(0, 2);
                  const month = raw.slice(2, 4);
                  const year = raw.slice(4, 8);
                  setValue("date", `${year}-${month}-${day}`);
                } else {
                  setValue("date", "");
                }
              }}
              onFocus={(e) => {
                // Clear for easier editing
                const d = watch("date");
                if (d) {
                  const [y, m, day] = d.split("-");
                  e.target.value = `${day}${m}${y}`;
                }
              }}
            />
          </div>

          <SheetFooter className="pt-4">
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan Transaksi"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
