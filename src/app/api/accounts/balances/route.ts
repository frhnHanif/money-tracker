import { NextResponse } from "next/server";
import { getUserId } from "@/lib/session";
import {
  getAccounts,
  getAccountsMonthNetBatch,
} from "@/lib/db/queries";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allAccounts = await getAccounts(userId);
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const monthNetMap = await getAccountsMonthNetBatch(userId, month, year);

  const balances: Record<
    number,
    { balance: number; monthNet: number }
  > = {};

  for (const acc of allAccounts) {
    balances[acc.id] = {
      balance: acc.currentBalance ?? 0,
      monthNet: monthNetMap[acc.id] || 0,
    };
  }

  return NextResponse.json(balances);
}
