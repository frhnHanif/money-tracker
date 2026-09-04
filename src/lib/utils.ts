import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(
  date: Date | string,
  format: "short" | "long" | "month" = "short"
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  if (format === "month") {
    return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  }
  if (format === "long") {
    const weekday = d.toLocaleDateString("id-ID", { weekday: "long" });
    return `${weekday}, ${day}/${month}/${year}`;
  }
  return `${day}/${month}/${year}`;
}

export function parseRupiah(value: string): number {
  const cleaned = value.replace(/[Rp\s.,]/g, "");
  // Handle Indonesian format: "Rp1.000" -> 1000, "Rp75,000" -> 75000
  if (value.includes(",") && value.indexOf(",") > value.lastIndexOf(".")) {
    // Comma is decimal separator: "Rp75,000" -> 75000
    return parseInt(cleaned, 10);
  }
  return parseInt(cleaned, 10);
}

export function formatInputCurrency(value: string): string {
  const num = parseInt(value.replace(/\D/g, ""), 10);
  if (isNaN(num)) return "";
  return num.toLocaleString("id-ID");
}

/**
 * Group paired transfer transactions (transfer_out + transfer_in sharing a
 * transferGroupId) into a single row. Unmatched transfers stay as-is.
 */
type GroupedTx<T> = T & { transferIn?: T; groupedTransfer?: boolean };

export function groupTransactions<
  T extends { id: number; type: string; transferGroupId?: string | null }
>(txList: T[]): GroupedTx<T>[] {
  const rows: GroupedTx<T>[] = [];
  const used = new Set<number>();

  for (const tx of txList) {
    if (used.has(tx.id)) continue;

    if (tx.type === "transfer_out" && tx.transferGroupId) {
      const pair = txList.find(
        (t) =>
          t.id !== tx.id &&
          t.type === "transfer_in" &&
          t.transferGroupId === tx.transferGroupId
      );
      if (pair) {
        used.add(tx.id);
        used.add(pair.id);
        rows.push({ ...tx, transferIn: pair, groupedTransfer: true });
        continue;
      }
    }

    rows.push(tx);
  }

  return rows;
}
