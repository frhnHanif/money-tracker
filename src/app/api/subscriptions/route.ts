import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { getSubscriptions } from "@/lib/db/queries";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getSubscriptions();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, price, interval, billingDay, status } = body;

  if (!name || typeof price !== "number" || price <= 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const [created] = await db
    .insert(subscriptions)
    .values({
      name: String(name).trim(),
      price: Math.round(price),
      interval: interval === "yearly" ? "yearly" : "monthly",
      billingDay:
        Number.isInteger(billingDay) && billingDay >= 1 && billingDay <= 31
          ? billingDay
          : 1,
      status: status === "inactive" ? "inactive" : "active",
    })
    .returning();

  return NextResponse.json(created);
}