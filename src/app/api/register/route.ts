import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users, categories, accounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS } from "@/lib/defaults";

const registerSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(100),
  email: z.string().trim().toLowerCase().email("Email tidak valid").max(255),
  password: z.string().min(8, "Password minimal 8 karakter").max(100),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Data tidak valid";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { name, email, password } = parsed.data;

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing[0]) {
    return NextResponse.json(
      { error: "Email sudah terdaftar" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [user] = await db
    .insert(users)
    .values({ name, email, passwordHash })
    .returning();

  // Seed default categories for the new user
  await db
    .insert(categories)
    .values(
      DEFAULT_CATEGORIES.map((c, i) => ({
        userId: user.id,
        name: c.name,
        type: c.type,
        icon: c.icon,
        color: c.color,
        sortOrder: i,
      }))
    );

  // Seed default accounts (Tunai & Bank) for the new user
  await db
    .insert(accounts)
    .values(
      DEFAULT_ACCOUNTS.map((a) => ({
        userId: user.id,
        name: a.name,
        type: a.type,
        icon: a.icon,
        color: a.color,
        initialBalance: a.initialBalance,
        sortOrder: a.sortOrder,
      }))
    );

  return NextResponse.json(
    { id: user.id, name: user.name, email: user.email },
    { status: 201 }
  );
}
