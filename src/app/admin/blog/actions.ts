"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb, tutorials, sources } from "@/lib/db";

function nowSqlite(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

export async function rejectTutorial(id: string, reason: string): Promise<void> {
  const db = getDb();
  await db
    .update(tutorials)
    .set({
      status: "rejected",
      rejected_reason: `admin_manual:${reason}`.slice(0, 500),
      updated_at: nowSqlite(),
    })
    .where(eq(tutorials.id, id));
  revalidatePath("/admin/blog");
  revalidatePath("/admin/blog/tutorials");
  revalidatePath("/admin/blog/queue");
  revalidatePath("/admin/blog/rejected");
  revalidatePath("/blog");
}

export async function forcePublish(id: string): Promise<void> {
  const db = getDb();
  const now = nowSqlite();
  await db
    .update(tutorials)
    .set({
      status: "published",
      published_at: now,
      updated_at: now,
    })
    .where(eq(tutorials.id, id));
  revalidatePath("/admin/blog");
  revalidatePath("/admin/blog/queue");
  revalidatePath("/blog");
}

export async function toggleSourceActive(id: string): Promise<void> {
  const db = getDb();
  const rows = await db.select().from(sources).where(eq(sources.id, id)).limit(1);
  if (rows.length === 0) return;
  const current = Boolean(rows[0].is_active);
  await db
    .update(sources)
    .set({
      is_active: !current,
      updated_at: nowSqlite(),
    })
    .where(eq(sources.id, id));
  revalidatePath("/admin/blog/sources");
}
