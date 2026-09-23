import { NextRequest, NextResponse } from "next/server";
import { getMonthlySummary, getDateRangeSummary } from "@/lib/db/queries";
import { getUserId } from "@/lib/session";

export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searchParams = req.nextUrl.searchParams;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (startDate && endDate) {
    const summary = await getDateRangeSummary(userId, startDate, endDate);
    return NextResponse.json(summary);
  }

  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

  const summary = await getMonthlySummary(userId, month, year);
  return NextResponse.json(summary);
}
