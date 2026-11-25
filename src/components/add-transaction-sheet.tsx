"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
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
import {
  filterTransferCategories,
  formatCurrency,
  formatInputCurrency,
} from "@/lib/utils";
import { dueRemaining, type DueItem } from "@/lib/dues";
import {
  CalendarIcon,
  ChevronDown,
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

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

export type DueMode =
  | "none"
  | "split_bill"
  | "new_receivable"
  | "new_payable"
  | "settle_receivable"
  | "settle_payable";

interface AddTransactionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: { id: number; name: string }[];
  categories: { id: number; name: string; type: string; pocket?: string | null }[];
  initialDueMode?: DueMode;
  onSuccess?: () => void;
}

interface SplitFriendItem {
  id: string;
  person: string;
  amount: string;
}

export function AddTransactionSheet({
  open,
  onOpenChange,
  accounts,
  categories,
  initialDueMode = "none",
  onSuccess,
}: AddTransactionSheetProps) {
  const queryClient = useQueryClient();
  const [transactionType, setTransactionType] = useState("expense");
  const [loading, setLoading] = useState(false);
  const [displayAmount, setDisplayAmount] = useState("");
  const [displayFee, setDisplayFee] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [dueMode, setDueMode] = useState<DueMode>("none");
  const [duePerson, setDuePerson] = useState("");
  const [dueId, setDueId] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isDatePickerExpanded, setIsDatePickerExpanded] = useState(false);

  // Split bill states
  const [splitMyShare, setSplitMyShare] = useState("");
  const [splitFriends, setSplitFriends] = useState<SplitFriendItem[]>([
    { id: "1", person: "", amount: "" },
  ]);

  useEffect(() => {
    if (open && initialDueMode && initialDueMode !== "none") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDueMode(initialDueMode);
      if (initialDueMode === "split_bill") {
        setTransactionType("expense");
      }
    }
  }, [open, initialDueMode]);

  const totalBillNum = parseInt(displayAmount.replace(/\D/g, "") || "0", 10) || 0;
  const myShareNum = parseInt(splitMyShare.replace(/\D/g, "") || "0", 10) || 0;
  const friendsSumNum = splitFriends.reduce(
    (sum, f) => sum + (parseInt(f.amount.replace(/\D/g, "") || "0", 10) || 0),
    0
  );
  const totalSplitNum = myShareNum + friendsSumNum;
  const splitDiff = totalBillNum - totalSplitNum;

  const addFriend = () => {
    setSplitFriends((prev) => [
      ...prev,
      { id: String(Date.now() + Math.random()), person: "", amount: "" },
    ]);
  };

  const removeFriend = (id: string) => {
    setSplitFriends((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFriend = (id: string, field: "person" | "amount", value: string) => {
    setSplitFriends((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        if (field === "amount") {
          return { ...f, amount: formatInputCurrency(value) };
        }
        return { ...f, [field]: value };
      })
    );
  };

  const handleAutoSplitAll = () => {
    if (totalBillNum <= 0) {
      toast.error("Masukkan total tagihan terlebih dahulu");
      return;
    }
    const count = 1 + splitFriends.length;
    const perPerson = Math.floor(totalBillNum / count);
    const remainder = totalBillNum - perPerson * count;

    setSplitMyShare(formatInputCurrency(String(perPerson + remainder)));
    setSplitFriends((prev) =>
      prev.map((f) => ({
        ...f,
        amount: formatInputCurrency(String(perPerson)),
      }))
    );
    toast.success(`Dibagi rata ke ${count} orang (${formatCurrency(perPerson)}/orang)`);
  };

  const handleSplitRemainderToFriends = () => {
    if (totalBillNum <= 0) {
      toast.error("Masukkan total tagihan terlebih dahulu");
      return;
    }
    if (splitFriends.length === 0) {
      toast.error("Tambahkan minimal 1 teman");
      return;
    }
    const remainingForFriends = totalBillNum - myShareNum;
    if (remainingForFriends < 0) {
      toast.error("Porsi pribadi melebihi total tagihan");
      return;
    }
    const perFriend = Math.floor(remainingForFriends / splitFriends.length);
    const remainder = remainingForFriends - perFriend * splitFriends.length;

    setSplitFriends((prev) =>
      prev.map((f, idx) => ({
        ...f,
        amount: formatInputCurrency(String(idx === 0 ? perFriend + remainder : perFriend)),
      }))
    );
    toast.success(
      `Sisa ${formatCurrency(remainingForFriends)} dibagi rata ke ${splitFriends.length} teman`
    );
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["summary"] });
    queryClient.invalidateQueries({ queryKey: ["balances"] });
    queryClient.invalidateQueries({ queryKey: ["breakdown"] });
    queryClient.invalidateQueries({ queryKey: ["trend"] });
    queryClient.invalidateQueries({ queryKey: ["dues"] });
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
    queryClient.invalidateQueries({ queryKey: ["budgets"] });
    queryClient.invalidateQueries({ queryKey: ["four-pockets"] });
  };

  const { data: openDues = [] } = useQuery<DueItem[]>({
    queryKey: ["dues", "open"],
    queryFn: () => fetch("/api/dues?status=open").then((r) => r.json()),
  });

  const people = Array.from(new Set(openDues.map((d) => d.person))).sort();

  const dueOptions =
    transactionType === "expense"
      ? ([
          { value: "none", label: "Tidak ada" },
          { value: "split_bill", label: "Split Bill" },
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
  const transferCategories = filterTransferCategories(categories);
  const selectedTransferCategory = transferCategories.find(
    (c) => String(c.id) === categoryId
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
    if (dueMode === "split_bill") {
      const totalAmount = parseInt(data.amount.replace(/\D/g, "") || "0", 10);
      const myShare = parseInt(splitMyShare.replace(/\D/g, "") || "0", 10) || 0;

      if (!data.accountId) {
        toast.error("Pilih akun pembayar");
        return;
      }
      if (!totalAmount || totalAmount <= 0) {
        toast.error("Nominal total tagihan harus lebih dari 0");
        return;
      }
      if (splitFriends.length === 0) {
        toast.error("Tambahkan minimal 1 teman yang ditalangi");
        return;
      }
      for (const f of splitFriends) {
        if (!f.person.trim()) {
          toast.error("Nama teman tidak boleh kosong");
          return;
        }
        const famt = parseInt(f.amount.replace(/\D/g, "") || "0", 10);
        if (!famt || famt <= 0) {
          toast.error(`Nominal tagihan untuk ${f.person} harus lebih dari 0`);
          return;
        }
      }

      const friendsTotal = splitFriends.reduce(
        (acc, f) => acc + (parseInt(f.amount.replace(/\D/g, "") || "0", 10) || 0),
        0
      );
      if (myShare + friendsTotal !== totalAmount) {
        toast.error(
          `Total pembagian (${formatCurrency(myShare + friendsTotal)}) belum pas dengan total tagihan (${formatCurrency(totalAmount)})`
        );
        return;
      }

      setLoading(true);
      try {
        const res = await fetch("/api/split-bill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: data.description || "Split Bill",
            date: data.date,
            accountId: parseInt(data.accountId),
            categoryId: data.categoryId ? parseInt(data.categoryId) : null,
            totalAmount,
            myShare,
            friends: splitFriends.map((f) => ({
              person: f.person.trim(),
              amount: parseInt(f.amount.replace(/\D/g, "") || "0", 10),
            })),
            notes: data.notes || "",
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Gagal menyimpan split bill");
        }

        const result = await res.json();
        toast.success(result.message || "Split bill berhasil disimpan");
        invalidateAll();
        reset();
        setDisplayAmount("");
        setDisplayFee("");
        setCategoryId("");
        setSplitMyShare("");
        setSplitFriends([{ id: "1", person: "", amount: "" }]);
        setTransactionType("expense");
        setDueMode("none");
        setDuePerson("");
        setDueId("");
        setSelectedDate(new Date());
        setIsDatePickerExpanded(false);
        onOpenChange(false);
        onSuccess?.();
        return;
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Gagal menyimpan split bill");
        return;
      } finally {
        setLoading(false);
      }
    }

    setLoading(true);
    try {
      const body: {
        type: string;
        amount: number;
        accountId: number;
        categoryId: number | null;
        description: string;
        notes: string;
        date: string;
        toAccountId?: number;
        fee?: number;
      } = {
        type: data.type,
        amount: parseInt(data.amount.replace(/\D/g, ""), 10),
        accountId: parseInt(data.accountId),
        categoryId:
          data.categoryId && data.categoryId !== "__none"
            ? parseInt(data.categoryId, 10)
            : null,
        description: data.description || "",
        notes: data.notes || "",
        date: data.date,
      };

      if (data.type === "transfer" && data.toAccountId) {
        body.toAccountId = parseInt(data.toAccountId);
        body.fee = parseInt(data.fee?.replace(/\D/g, "") || "0", 10) || 0;
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
        invalidateAll();
        reset();
        setDisplayAmount("");
        setDisplayFee("");
        setCategoryId("");
        setTransactionType("expense");
        setDueMode("none");
        setDuePerson("");
        setDueId("");
        setSelectedDate(new Date());
        setIsDatePickerExpanded(false);
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
              setValue("type", v as "expense" | "income" | "transfer");
              setCategoryId("");
              setValue("categoryId", "");
              if (v !== "expense" && dueMode === "split_bill") {
                setDueMode("none");
              }
            }}
          />

          {/* Quick Split Bill Toggle when expense */}
          {/* {transactionType === "expense" && (
            <div className="flex items-center justify-between rounded-lg border border-[#f0f0f0] bg-[#f9f9fb] p-2.5 dark:border-white/10 dark:bg-[#1f1f21]">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Users className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-[#1d1d1f] dark:text-white">
                    Mode Split Bill / Nalangi
                  </p>
                  <p className="text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
                    Bayar rame-rame & catat piutang teman
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDueMode((m) => (m === "split_bill" ? "none" : "split_bill"));
                }}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  dueMode === "split_bill"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "bg-white text-[#7a7a7a] ring-1 ring-black/10 hover:bg-slate-50 dark:bg-[#2c2c2e] dark:text-[#cccccc] dark:ring-white/10"
                }`}
              >
                {dueMode === "split_bill" ? "Aktif ✓" : "Aktifkan"}
              </button>
            </div>
          )} */}

          {/* Amount */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                {dueMode === "split_bill"
                  ? "Total Tagihan (Dipotong dari Rekening)"
                  : "Nominal"}
              </Label>
              {dueMode === "split_bill" && (
                <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  Total dibayar di kasir
                </span>
              )}
            </div>
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

          {/* Admin Fee (transfer only) */}
          {transactionType === "transfer" && (
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
                className="text-lg font-semibold text-center h-12"
              />
              {(() => {
                const numAmt = parseInt(displayAmount.replace(/\D/g, "") || "0", 10) || 0;
                const numFee = parseInt(displayFee.replace(/\D/g, "") || "0", 10) || 0;
                if (numAmt > 0) {
                  return (
                    <div className="rounded-lg bg-[#f5f5f7] p-2.5 text-xs text-[#7a7a7a] dark:bg-[#272729] dark:text-[#cccccc] space-y-1">
                      <div className="flex justify-between">
                        <span>Pengirim terpotong:</span>
                        <span className="font-semibold text-red-500 dark:text-red-400">
                          {formatCurrency(numAmt + numFee)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Penerima masuk:</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(numAmt)}
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
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

          {/* Category */}
          {transactionType !== "transfer" ? (
            <div className="space-y-2">
              <Label>
                {dueMode === "split_bill" ? "Kategori (Porsi Pribadi)" : "Kategori"}
              </Label>
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
          ) : (
            <div className="space-y-1.5">
              <Label>Kategori Transfer (opsional)</Label>
              <Select
                value={categoryId || "__none"}
                onValueChange={(v) => {
                  const actual = v === "__none" ? "" : v;
                  setCategoryId(actual);
                  setValue("categoryId", actual);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tanpa kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Tanpa kategori</SelectItem>
                  {transferCategories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                      {cat.pocket === "saving" ? " (Saving)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* <p
                className={`text-[11px] ${
                  selectedTransferCategory?.pocket === "saving"
                    ? "text-emerald-600 dark:text-emerald-400 font-medium"
                    : "text-[#7a7a7a] dark:text-[#cccccc]"
                }`}
              >
                {selectedTransferCategory?.pocket === "saving"
                  ? "Masuk ke progress kantong Saving (4-Pockets) tanpa menambah pengeluaran."
                  : "Pilih kategori Saving (mis. Dana Darurat) untuk mencatat tabungan, atau Topup."}
              </p> */}
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
            <div className="space-y-3">
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

              {/* Split Bill Expanded Form */}
              {dueMode === "split_bill" && (
                <div className="space-y-4 rounded-xl border border-amber-200/80 bg-amber-50/40 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/20">
                  {/* Anti-Bengkak Explanation Banner */}
                  {/* <div className="flex items-start gap-2.5 rounded-lg bg-amber-100/60 p-2.5 text-xs text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div className="space-y-0.5">
                      <p className="font-semibold">Solusi Anti-Bengkak Pengeluaran</p>
                      <p className="text-[11px] leading-relaxed opacity-90">
                        Saldo rekeningmu dipotong penuh ({formatCurrency(totalBillNum)}), tapi yang masuk ke statistik & budget pengeluaranmu <strong>hanya porsi pribadimu</strong>. Sisanya otomatis dicatat sebagai piutang teman.
                      </p>
                    </div>
                  </div> */}

                  {/* Quick Split Buttons */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleAutoSplitAll}
                      className="flex-1 text-xs border-amber-300 dark:border-amber-800 bg-white/80 dark:bg-[#202022]"
                    >
                      <Users className="mr-1.5 h-3.5 w-3.5" />
                      Bagi Rata Semua
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleSplitRemainderToFriends}
                      className="flex-1 text-xs border-amber-300 dark:border-amber-800 bg-white/80 dark:bg-[#202022]"
                    >
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                      Bagi Sisa ke Teman
                    </Button>
                  </div>

                  {/* Section: Porsi Saya */}
                  <div className="space-y-1.5 rounded-lg bg-white/70 p-3 dark:bg-[#2a2a2c]/60">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Porsi Saya</Label>
                      {/* <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        Masuk Statistik & Budget
                      </span> */}
                    </div>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="Rp0"
                      value={splitMyShare}
                      onChange={(e) => {
                        setSplitMyShare(formatInputCurrency(e.target.value));
                      }}
                      className="h-10 text-base font-semibold"
                    />
                    {/* <p className="text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
                      Hanya nominal ini yang memengaruhi grafik pengeluaran & budget
                    </p> */}
                  </div>

                  {/* Section: Teman-teman yang Ditalangi */}
                  <div className="space-y-2 rounded-lg bg-white/70 p-3 dark:bg-[#2a2a2c]/60">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">
                        Split Bill
                      </Label>
                      <span className="text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
                        {splitFriends.length} orang
                      </span>
                    </div>

                    <div className="space-y-2">
                      {splitFriends.map((f, idx) => (
                        <div
                          key={f.id}
                          className="flex items-center gap-2 rounded-lg bg-white/70 p-2 dark:bg-[#2a2a2c]/60"
                        >
                          <div className="flex-1 min-w-0">
                            <Input
                              list="split-people"
                              placeholder={`Nama teman ${idx + 1}`}
                              value={f.person}
                              onChange={(e) => updateFriend(f.id, "person", e.target.value)}
                              className="h-9 text-xs"
                            />
                          </div>
                          <div className="w-32 shrink-0">
                            <Input
                              type="text"
                              inputMode="numeric"
                              placeholder="Rp0"
                              value={f.amount}
                              onChange={(e) => updateFriend(f.id, "amount", e.target.value)}
                              className="h-9 text-xs font-semibold text-right"
                            />
                          </div>
                          {splitFriends.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFriend(f.id)}
                              className="h-9 w-9 shrink-0 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    <datalist id="split-people">
                      {people.map((p) => (
                        <option key={p} value={p} />
                      ))}
                    </datalist>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addFriend}
                      className="w-full text-xs border-dashed"
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Tambah Teman
                    </Button>
                  </div>

                  {/* Live Allocation Status Summary */}
                  <div className="space-y-1.5 rounded-lg bg-white/80 p-2.5 text-xs dark:bg-[#202022]">
                    <div className="flex justify-between text-[#7a7a7a] dark:text-[#cccccc]">
                      <span>Total Tagihan:</span>
                      <span className="font-semibold text-[#1d1d1f] dark:text-white">
                        {formatCurrency(totalBillNum)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[#7a7a7a] dark:text-[#cccccc]">
                      <span>Porsi Saya:</span>
                      <span className="font-semibold text-[#1d1d1f] dark:text-white">
                        {formatCurrency(myShareNum)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[#7a7a7a] dark:text-[#cccccc]">
                      <span>Total Ditalangi ({splitFriends.length} teman):</span>
                      <span className="font-semibold text-[#1d1d1f] dark:text-white">
                        {formatCurrency(friendsSumNum)}
                      </span>
                    </div>
                    <div className="border-t border-[#f0f0f0] pt-1.5 dark:border-white/10">
                      {splitDiff === 0 && totalBillNum > 0 ? (
                        <div className="flex items-center justify-between font-semibold text-emerald-600 dark:text-emerald-400">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" />
                            Pembagian Pas
                          </span>
                          <span>{formatCurrency(totalSplitNum)}</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between font-semibold text-amber-600 dark:text-amber-400">
                          <span className="flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            {splitDiff > 0
                              ? `Kurang ${formatCurrency(splitDiff)}`
                              : `Kelebihan ${formatCurrency(Math.abs(splitDiff))}`}
                          </span>
                          <span>
                            {formatCurrency(totalSplitNum)} / {formatCurrency(totalBillNum)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

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
              <div className="rounded-md border bg-popover p-3 shadow-sm flex justify-center">
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
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={
                loading ||
                (dueMode === "split_bill" &&
                  (splitDiff !== 0 || totalBillNum <= 0))
              }
            >
              {loading
                ? "Menyimpan..."
                : dueMode === "split_bill"
                ? `Simpan Split Bill (${formatCurrency(totalBillNum)})`
                : "Simpan Transaksi"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
