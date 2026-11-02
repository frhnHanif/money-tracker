"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronUp,
  ChevronDown,
  Archive,
  ArchiveRestore,
  Plus,
  Pencil,
  Tag,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";

interface CategoryLike {
  id: number;
  name: string;
  type: string;
  color: string;
  isArchived?: boolean;
}

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [archiveTarget, setArchiveTarget] = useState<CategoryLike | null>(null);
  const [editTarget, setEditTarget] = useState<CategoryLike | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  // Active categories
  const { data: activeCategories = [] } = useQuery<CategoryLike[]>({
    queryKey: ["categories", "active"],
    queryFn: () => fetch("/api/categories?status=active").then((r) => r.json()),
  });

  // Archived categories
  const { data: archivedCategories = [] } = useQuery<CategoryLike[]>({
    queryKey: ["categories", "archived"],
    queryFn: () => fetch("/api/categories?status=archived").then((r) => r.json()),
  });

  const archiveCategory = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: true }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["four-pockets"] });
      toast.success("Kategori berhasil diarsipkan");
      setArchiveTarget(null);
    },
  });

  const restoreCategory = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: false }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["four-pockets"] });
      toast.success("Kategori berhasil dipulihkan");
    },
  });

  const reorderCategory = useMutation({
    mutationFn: ({ id, direction }: { id: number; direction: "up" | "down" }) =>
      fetch("/api/categories/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, direction }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  return (
    <AppShell>
      <div className="space-y-4 pb-4">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[#1d1d1f] dark:text-white">
              Kelola Kategori
            </h2>
            <p className="mt-0.5 text-xs text-[#7a7a7a] dark:text-[#cccccc]">
              Atur kategori transaksi. Kategori terarsip tidak akan muncul di form transaksi baru.
            </p>
          </div>
          {activeTab === "active" && (
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Tambah
            </Button>
          )}
        </div>

        {/* Tab Switch: Aktif vs Diarsipkan */}
        <div className="flex rounded-lg bg-[#f5f5f7] p-1 dark:bg-[#2a2a2c]">
          <button
            onClick={() => setActiveTab("active")}
            className={`flex-1 rounded-md py-2 text-xs font-medium transition-colors ${
              activeTab === "active"
                ? "bg-white text-[#1d1d1f] shadow-xs dark:bg-[#3a3a3c] dark:text-white"
                : "text-[#7a7a7a] dark:text-[#cccccc]"
            }`}
          >
            Aktif ({activeCategories.length})
          </button>
          <button
            onClick={() => setActiveTab("archived")}
            className={`flex-1 rounded-md py-2 text-xs font-medium transition-colors ${
              activeTab === "archived"
                ? "bg-white text-[#1d1d1f] shadow-xs dark:bg-[#3a3a3c] dark:text-white"
                : "text-[#7a7a7a] dark:text-[#cccccc]"
            }`}
          >
            Diarsipkan ({archivedCategories.length})
          </button>
        </div>

        {/* ACTIVE CATEGORIES LIST */}
        {activeTab === "active" && (
          <div className="divide-y divide-[#f0f0f0] overflow-hidden rounded-lg bg-white ring-1 ring-[#f0f0f0] dark:divide-white/10 dark:bg-[#272729] dark:ring-white/10">
            {activeCategories.map((cat, idx) => (
              <div
                key={cat.id}
                className="flex items-center justify-between gap-2 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-medium text-[#1d1d1f] dark:text-white">
                      {cat.name}
                    </p>
                    <p className="text-xs text-[#7a7a7a] dark:text-[#cccccc] capitalize">
                      {cat.type}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    onClick={() => setEditTarget(cat)}
                    aria-label="Edit kategori"
                    title="Edit kategori"
                    className="flex h-8 w-8 items-center justify-center rounded text-[#7a7a7a] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] dark:text-[#cccccc] dark:hover:bg-[#2a2a2c] dark:hover:text-white"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() =>
                      reorderCategory.mutate({ id: cat.id, direction: "up" })
                    }
                    disabled={idx === 0 || reorderCategory.isPending}
                    aria-label="Naikkan urutan"
                    className="flex h-8 w-8 items-center justify-center rounded text-[#7a7a7a] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] disabled:opacity-30 dark:text-[#cccccc] dark:hover:bg-[#2a2a2c] dark:hover:text-white"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() =>
                      reorderCategory.mutate({ id: cat.id, direction: "down" })
                    }
                    disabled={idx === activeCategories.length - 1 || reorderCategory.isPending}
                    aria-label="Turunkan urutan"
                    className="flex h-8 w-8 items-center justify-center rounded text-[#7a7a7a] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] disabled:opacity-30 dark:text-[#cccccc] dark:hover:bg-[#2a2a2c] dark:hover:text-white"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setArchiveTarget(cat)}
                    aria-label="Arsipkan kategori"
                    title="Arsipkan kategori"
                    className="flex h-8 w-8 items-center justify-center rounded text-[#7a7a7a] hover:bg-amber-50 hover:text-amber-600 dark:text-[#cccccc] dark:hover:bg-amber-950/40 dark:hover:text-amber-400"
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {activeCategories.length === 0 && (
              <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
                <Tag className="h-6 w-6 text-[#7a7a7a] dark:text-[#cccccc]" />
                <p className="text-sm text-[#7a7a7a] dark:text-[#cccccc]">
                  Belum ada kategori aktif
                </p>
              </div>
            )}
          </div>
        )}

        {/* ARCHIVED CATEGORIES LIST */}
        {activeTab === "archived" && (
          <div className="divide-y divide-[#f0f0f0] overflow-hidden rounded-lg bg-white ring-1 ring-[#f0f0f0] dark:divide-white/10 dark:bg-[#272729] dark:ring-white/10">
            {archivedCategories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between gap-2 px-4 py-3 bg-zinc-50/50 dark:bg-zinc-900/40"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="h-3 w-3 shrink-0 rounded-full opacity-60"
                    style={{ backgroundColor: cat.color }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[15px] font-medium text-zinc-600 dark:text-zinc-300">
                        {cat.name}
                      </p>
                      <span className="rounded bg-zinc-200/80 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        Diarsipkan
                      </span>
                    </div>
                    <p className="text-xs text-[#7a7a7a] dark:text-[#cccccc] capitalize">
                      {cat.type}
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => restoreCategory.mutate(cat.id)}
                  disabled={restoreCategory.isPending}
                  className="h-8 gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                >
                  <ArchiveRestore className="h-3.5 w-3.5" />
                  Pulihkan
                </Button>
              </div>
            ))}
            {archivedCategories.length === 0 && (
              <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                <Inbox className="h-7 w-7 text-zinc-400" />
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                  Tidak ada kategori yang diarsipkan
                </p>
                <p className="text-xs text-zinc-400">
                  Kategori yang diarsipkan akan muncul di sini dan dapat dipulihkan kapan saja.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <AddCategoryDialog open={addOpen} onOpenChange={setAddOpen} />

      {editTarget && (
        <EditCategoryDialog
          category={editTarget}
          open={!!editTarget}
          onOpenChange={(open) => {
            if (!open) setEditTarget(null);
          }}
        />
      )}

      {/* Confirmation Dialog for Archiving */}
      <ConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null);
        }}
        title={`Arsipkan kategori "${archiveTarget?.name}"?`}
        description="Kategori ini tidak akan muncul lagi saat memilih kategori di transaksi baru. Riwayat transaksi lama yang menggunakan kategori ini tetap aman dan tidak akan diubah."
        confirmLabel="Arsipkan"
        destructive={false}
        onConfirm={() => {
          if (archiveTarget) archiveCategory.mutate(archiveTarget.id);
        }}
      />
    </AppShell>
  );
}

/* ---------- Add category dialog ---------- */
function AddCategoryDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [type, setType] = useState("expense");
  const [color, setColor] = useState("#6b7280");

  const mutation = useMutation({
    mutationFn: (data: { name: string; type: string; color: string }) =>
      fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      onOpenChange(false);
      setName("");
      toast.success("Kategori ditambahkan");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Tambah Kategori</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nama Kategori</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama kategori"
            />
          </div>
          <div>
            <Label>Tipe</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Warna</Label>
            <Input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-20"
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => mutation.mutate({ name, type, color })}
              disabled={!name}
              className="w-full"
            >
              Simpan
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Edit category dialog ---------- */
function EditCategoryDialog({
  category,
  open,
  onOpenChange,
}: {
  category: CategoryLike;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(category.name);
  const [type, setType] = useState(category.type);
  const [color, setColor] = useState(category.color || "#6b7280");

  const mutation = useMutation({
    mutationFn: (data: { name: string; type: string; color: string }) =>
      fetch(`/api/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      onOpenChange(false);
      toast.success("Kategori diperbarui");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Edit Kategori</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nama Kategori</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama kategori"
            />
          </div>
          <div>
            <Label>Tipe</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Warna</Label>
            <Input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-20"
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => mutation.mutate({ name, type, color })}
              disabled={!name}
              className="w-full"
            >
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
