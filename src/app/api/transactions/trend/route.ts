import { NextResponse } from "next/server";
import { getMonthlyTrend } from "@/lib/db/queries";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getMonthlyTrend(6);
  return NextResponse.json(data);
}
