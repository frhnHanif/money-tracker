export type DueDirection = "receivable" | "payable";

export interface DueItem {
  id: number;
  direction: DueDirection;
  person: string;
  title: string;
  amount: number;
  settledSum: number;
  status: "open" | "settled";
  transactionId: number | null;
  createdAt?: string | Date;
}

export const dueRemaining = (d: DueItem) =>
  d.status === "settled" ? 0 : Math.max((d.amount || 0) - (d.settledSum || 0), 0);

export const isDueSettled = (d: DueItem) =>
  d.status === "settled" || dueRemaining(d) <= 0;

export const isDueForgiven = (d: DueItem) =>
  d.status === "settled" && (d.settledSum || 0) < d.amount;

export const dueForgivenAmount = (d: DueItem) =>
  isDueForgiven(d) ? Math.max((d.amount || 0) - (d.settledSum || 0), 0) : 0;
