import { NextRequest, NextResponse } from "next/server";
import { getCategoryBreakdown } from "@/lib/db/queries";
import { getUserId } from "@/lib/session";

export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searchParams = req.nextUrl.searchParams;
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
  const type = (searchParams.get("type") as "expense" | "income") || "expense";

  const data = await getCategoryBreakdown(userId, month, year, type);
  return NextResponse.json(data);
}
