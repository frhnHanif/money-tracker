"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Trash2,
  Plus,
  Tag,
} from "lucide-react";
import { toast } from "sonner";

interface CategoryLike {
  id: number;
  name: string;
  type: string;
  color: string;
}

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const { data: categories = [] } = useQuery<CategoryLike[]>({
    queryKey: ["categories"],
    queryFn: () => fetch("/api/categories").then((r) => r.json()),
  });

  const deleteCategory = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/categories/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Kategori dihapus");
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
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#7a7a7a] dark:text-[#cccccc]">
            {categories.length} kategori
          </p>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Tambah
          </Button>
        </div>

        <div className="divide-y divide-[#f0f0f0] overflow-hidden rounded-lg bg-white ring-1 ring-[#f0f0f0] dark:divide-white/10 dark:bg-[#272729] dark:ring-white/10">
          {categories.map((cat, idx) => (
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
                  <p className="text-xs text-[#7a7a7a] dark:text-[#cccccc]">
                    {cat.type}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
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
                  disabled={idx === categories.length - 1 || reorderCategory.isPending}
                  aria-label="Turunkan urutan"
                  className="flex h-8 w-8 items-center justify-center rounded text-[#7a7a7a] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] disabled:opacity-30 dark:text-[#cccccc] dark:hover:bg-[#2a2a2c] dark:hover:text-white"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget(cat)}
                  aria-label="Hapus kategori"
                  className="flex h-8 w-8 items-center justify-center rounded text-[#7a7a7a] hover:text-red-500 dark:text-[#cccccc] dark:hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {categories.length === 0 && (
            <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
              <Tag className="h-6 w-6 text-[#7a7a7a] dark:text-[#cccccc]" />
              <p className="text-sm text-[#7a7a7a] dark:text-[#cccccc]">
                Belum ada kategori
              </p>
            </div>
          )}
        </div>
      </div>

      <AddCategoryDialog open={addOpen} onOpenChange={setAddOpen} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`Hapus kategori ${deleteTarget?.name}?`}
        description="Transaksi dengan kategori ini akan berubah menjadi Uncategorized."
        onConfirm={() => {
          if (deleteTarget) deleteCategory.mutate(deleteTarget.id);
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