import { NextResponse } from "next/server";
import { getMonthlyTrend } from "@/lib/db/queries";
import { getUserId } from "@/lib/session";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getMonthlyTrend(userId, 6);
  return NextResponse.json(data);
}
