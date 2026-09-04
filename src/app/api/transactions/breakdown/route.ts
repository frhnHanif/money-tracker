import { NextRequest, NextResponse } from "next/server";
import { getCategoryBreakdown } from "@/lib/db/queries";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searchParams = req.nextUrl.searchParams;
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
  const type = (searchParams.get("type") as "expense" | "income") || "expense";

  const data = await getCategoryBreakdown(month, year, type);
  return NextResponse.json(data);
}
