import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getAccounts,
  getAccountBalance,
  getAccountMonthNet,
} from "@/lib/db/queries";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allAccounts = await getAccounts();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const balances: Record<
    number,
    { balance: number; monthNet: number }
  > = {};

  for (const acc of allAccounts) {
    balances[acc.id] = {
      balance: await getAccountBalance(acc.id),
      monthNet: await getAccountMonthNet(acc.id, month, year),
    };
  }

  return NextResponse.json(balances);
}