import { groupTransactions } from "@/lib/utils";

export type SplitBillStatus = "open" | "partial" | "settled";

export interface SplitBillFriendDetail {
  dueId: number;
  person: string;
  amount: number;
  settledSum: number;
  status: "open" | "settled";
}

export interface SplitBillMeta {
  splitKey: string;
  eventTitle: string;
  personalAmount: number;
  talanganAmount: number;
  totalPaid: number;
  splitStatus: SplitBillStatus;
  friends: SplitBillFriendDetail[];
}

export interface SplitSettlementMeta {
  splitKey: string;
  originTxId: number;
  eventTitle: string;
  dueId: number;
  person: string;
  dueAmount: number;
  settledAmount: number;
  splitStatus: SplitBillStatus;
  totalReceivable: number;
  totalSettled: number;
  settledFriendCount: number;
  totalFriendCount: number;
}

export interface TxRow {
  id: number;
  type: string;
  description?: string;
  categoryName?: string;
  categoryColor?: string;
  categoryId?: number | null;
  amount?: number;
  accountName?: string;
  accountColor?: string;
  accountId?: number;
  date?: string;
  notes?: string;
  fee?: number;
  source?: string | null;
  transferGroupId?: string | null;
  splitGroupId?: string | null;
  splitBillMeta?: SplitBillMeta;
  splitSettlementMeta?: SplitSettlementMeta;
  transferIn?: {
    id?: number;
    accountId?: number;
    accountName?: string;
    amount?: number;
  };
  groupedTransfer?: boolean;
}

export interface SplitBillGroupItem {
  kind: "split_bill";
  groupId: string;
  date: string;
  eventTitle: string;
  accountName?: string;
  accountColor?: string;
  categoryName?: string;
  categoryColor?: string;
  notes?: string;
  personalAmount: number;
  talanganAmount: number;
  totalPaid: number;
  splitStatus: SplitBillStatus;
  friends: SplitBillFriendDetail[];
  personalTx?: TxRow;
  talanganTx?: TxRow;
  primaryTx: TxRow;
}

export interface SplitBillSettlementEntry {
  tx: TxRow;
  person: string;
  amount: number;
  date: string;
  accountName?: string;
  accountColor?: string;
}

export interface SplitBillSettlementGroupItem {
  kind: "split_settlement";
  groupId: string;
  date: string;
  eventTitle: string;
  splitKey: string;
  totalSettledAmount: number;
  uniqueFriendCount: number;
  accountNames: string[];
  splitStatus: SplitBillStatus;
  totalReceivable: number;
  totalSettledOverall: number;
  items: SplitBillSettlementEntry[];
}

export interface RegularTxItem {
  kind: "regular";
  tx: TxRow;
}

export type DisplayTransactionItem =
  | RegularTxItem
  | SplitBillGroupItem
  | SplitBillSettlementGroupItem;

function cleanSplitBillNotes(personalTx?: TxRow, talanganTx?: TxRow): string | undefined {
  const pNotes = personalTx?.notes?.trim();
  if (pNotes) return pNotes;
  const tNotes = talanganTx?.notes?.trim();
  if (!tNotes) return undefined;
  // Omit the auto-generated default talangan note to avoid duplicate noise
  if (/^Talangan split bill untuk \d+ orang$/i.test(tNotes)) return undefined;
  return tNotes;
}

export function groupTransactionsWithSplitBill(
  txList: TxRow[]
): DisplayTransactionItem[] {
  const afterTransfers = groupTransactions(txList);
  const usedIds = new Set<number>();
  const result: DisplayTransactionItem[] = [];

  for (const tx of afterTransfers) {
    if (usedIds.has(tx.id)) continue;

    // 1. Group Split Bill activity (personal expense + talangan adjustment_out)
    if (tx.source === "split_bill" && tx.splitBillMeta) {
      const meta = tx.splitBillMeta;
      const splitKey = meta.splitKey;

      const members = afterTransfers.filter(
        (t) =>
          !usedIds.has(t.id) &&
          t.source === "split_bill" &&
          t.splitBillMeta?.splitKey === splitKey
      );

      for (const m of members) {
        usedIds.add(m.id);
      }

      const personalTx = members.find((m) => m.type === "expense");
      const talanganTx = members.find((m) => m.type === "adjustment_out");
      const primaryTx = personalTx ?? talanganTx ?? tx;

      result.push({
        kind: "split_bill",
        groupId: `sb-${splitKey}`,
        date: primaryTx.date || tx.date || "unknown",
        eventTitle: meta.eventTitle,
        accountName: primaryTx.accountName,
        accountColor: primaryTx.accountColor,
        categoryName: personalTx?.categoryName,
        categoryColor: personalTx?.categoryColor,
        notes: cleanSplitBillNotes(personalTx, talanganTx),
        personalAmount: meta.personalAmount,
        talanganAmount: meta.talanganAmount,
        totalPaid: meta.totalPaid,
        splitStatus: meta.splitStatus,
        friends: meta.friends,
        personalTx,
        talanganTx,
        primaryTx,
      });
      continue;
    }

    // 2. Group Split Bill Settlements by (splitKey, date) — Option A
    if (tx.splitSettlementMeta) {
      const sMeta = tx.splitSettlementMeta;
      const txDate = tx.date || "unknown";
      const splitKey = sMeta.splitKey;

      const members = afterTransfers.filter(
        (t) =>
          !usedIds.has(t.id) &&
          t.splitSettlementMeta?.splitKey === splitKey &&
          (t.date || "unknown") === txDate
      );

      for (const m of members) {
        usedIds.add(m.id);
      }

      const items: SplitBillSettlementEntry[] = members.map((m) => ({
        tx: m,
        person: m.splitSettlementMeta?.person || m.notes || "Teman",
        amount: m.amount ?? m.splitSettlementMeta?.settledAmount ?? 0,
        date: m.date || txDate,
        accountName: m.accountName,
        accountColor: m.accountColor,
      }));

      const totalSettledAmount = items.reduce((sum, item) => sum + item.amount, 0);
      const uniqueFriendCount = new Set(
        items.map((item) => item.person.trim().toLowerCase())
      ).size;
      const accountNames = Array.from(
        new Set(items.map((item) => item.accountName).filter((n): n is string => Boolean(n)))
      );

      result.push({
        kind: "split_settlement",
        groupId: `ss-${splitKey}-${txDate}`,
        date: txDate,
        eventTitle: sMeta.eventTitle,
        splitKey,
        totalSettledAmount,
        uniqueFriendCount,
        accountNames,
        splitStatus: sMeta.splitStatus,
        totalReceivable: sMeta.totalReceivable,
        totalSettledOverall: sMeta.totalSettled,
        items,
      });
      continue;
    }

    // 3. Regular transaction or transfer
    usedIds.add(tx.id);
    result.push({ kind: "regular", tx });
  }

  return result;
}

export function matchesDisplayItemSearch(
  item: DisplayTransactionItem,
  searchLower: string
): boolean {
  if (!searchLower) return true;

  if (item.kind === "regular") {
    const tx = item.tx;
    const desc = (tx.description || "").toLowerCase();
    const cat = (tx.categoryName || "").toLowerCase();
    const acc = (tx.accountName || "").toLowerCase();
    const notes = (tx.notes || "").toLowerCase();
    const toAcc = (tx.transferIn?.accountName || "").toLowerCase();
    return (
      desc.includes(searchLower) ||
      cat.includes(searchLower) ||
      acc.includes(searchLower) ||
      notes.includes(searchLower) ||
      toAcc.includes(searchLower)
    );
  }

  if (item.kind === "split_bill") {
    const title = item.eventTitle.toLowerCase();
    const acc = (item.accountName || "").toLowerCase();
    const cat = (item.categoryName || "").toLowerCase();
    const notes = (item.notes || "").toLowerCase();
    const friendsMatch = item.friends.some((f) =>
      f.person.toLowerCase().includes(searchLower)
    );
    return (
      title.includes(searchLower) ||
      acc.includes(searchLower) ||
      cat.includes(searchLower) ||
      notes.includes(searchLower) ||
      "split bill".includes(searchLower) ||
      friendsMatch
    );
  }

  // split_settlement
  const title = item.eventTitle.toLowerCase();
  const accMatch = item.accountNames.some((a) =>
    a.toLowerCase().includes(searchLower)
  );
  const personMatch = item.items.some((e) =>
    e.person.toLowerCase().includes(searchLower)
  );
  return (
    title.includes(searchLower) ||
    "pelunasan".includes(searchLower) ||
    "split bill".includes(searchLower) ||
    accMatch ||
    personMatch
  );
}
