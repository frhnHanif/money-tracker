import { NextResponse } from "next/server";
import { getUserId } from "@/lib/session";
import {
  getAccounts,
  getAccountsMonthNetBatch,
  getUserResetDay,
} from "@/lib/db/queries";
import { getCurrentCycle } from "@/lib/cycle";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allAccounts = await getAccounts(userId);
  const resetDay = await getUserResetDay(userId);
  const now = new Date();
  const { month, year } = getCurrentCycle(resetDay, now);

  const monthNetMap = await getAccountsMonthNetBatch(userId, month, year, resetDay);

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
