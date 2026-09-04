"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Hapus",
  destructive = true,
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30">
            <AlertTriangle className="size-5 text-red-500 dark:text-red-400" />
          </div>
          <DialogTitle className="text-center text-base">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-center text-sm">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            className="w-full sm:w-auto"
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            Batal
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            className="w-full sm:w-auto"
            disabled={loading}
            onClick={() => {
              onOpenChange(false);
              onConfirm();
            }}
          >
            {loading ? "Menghapus..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}