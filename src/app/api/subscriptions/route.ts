import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { getSubscriptions } from "@/lib/db/queries";
import { getUserId } from "@/lib/session";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getSubscriptions(userId);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, price, interval, billingDay, status, lastPaidAt, nextDueDate } = body;

  if (!name || typeof price !== "number" || price <= 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const [created] = await db
    .insert(subscriptions)
    .values({
      userId,
      name: String(name).trim(),
      price: Math.round(price),
      interval: interval === "yearly" ? "yearly" : "monthly",
      billingDay:
        Number.isInteger(billingDay) && billingDay >= 1 && billingDay <= 31
          ? billingDay
          : 1,
      status: status === "inactive" ? "inactive" : "active",
      lastPaidAt:
        lastPaidAt && typeof lastPaidAt === "string" && lastPaidAt.length === 10
          ? lastPaidAt
          : null,
      nextDueDate:
        nextDueDate && typeof nextDueDate === "string" && nextDueDate.length === 10
          ? nextDueDate
          : null,
    })
    .returning();

  return NextResponse.json(created);
}
