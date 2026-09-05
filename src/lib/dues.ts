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
  Math.max((d.amount || 0) - (d.settledSum || 0), 0);