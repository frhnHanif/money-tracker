import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUserId } from "@/lib/session";

export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user] = await db
    .select({
      monthlySalary: users.monthlySalary,
      isBudgetingEnabled: users.budgetingEnabled,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    monthlySalary: user.monthlySalary ?? 0,
    isBudgetingEnabled: user.isBudgetingEnabled ?? true,
  });
}

const budgetSettingsSchema = z.object({
  monthlySalary: z.number().int().min(0).optional(),
  isBudgetingEnabled: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = budgetSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 }
    );
  }

  const update: Record<string, unknown> = {};
  if (parsed.data.monthlySalary !== undefined) {
    update.monthlySalary = parsed.data.monthlySalary;
  }
  if (parsed.data.isBudgetingEnabled !== undefined) {
    update.budgetingEnabled = parsed.data.isBudgetingEnabled;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No changes provided" }, { status: 400 });
  }

  const [updated] = await db
    .update(users)
    .set(update)
    .where(eq(users.id, userId))
    .returning({
      monthlySalary: users.monthlySalary,
      isBudgetingEnabled: users.budgetingEnabled,
    });

  return NextResponse.json({
    monthlySalary: updated.monthlySalary,
    isBudgetingEnabled: updated.isBudgetingEnabled,
  });
}
