import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertPlay, InsertUser, plays, studyLinks, users } from "../drizzle/schema";
import { ENV } from './_core/env';
import { nanoid } from "nanoid";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function listPlaysForCoach(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select().from(plays).where(eq(plays.userId, userId)).orderBy(desc(plays.updatedAt));
}

export async function getPlayForCoach(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.select().from(plays).where(and(eq(plays.id, id), eq(plays.userId, userId))).limit(1);
  return result[0];
}

export async function createPlayForCoach(userId: number, values: Omit<InsertPlay, "id" | "userId" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(plays).values({ ...values, userId });
  return getPlayForCoach(Number(result[0].insertId), userId);
}

export async function updatePlayForCoach(id: number, userId: number, values: Omit<InsertPlay, "id" | "userId" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(plays).set(values).where(and(eq(plays.id, id), eq(plays.userId, userId)));
  return getPlayForCoach(id, userId);
}

export async function deletePlayForCoach(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.delete(plays).where(and(eq(plays.id, id), eq(plays.userId, userId)));
  return result[0].affectedRows > 0;
}

export async function getOrCreateStudyLinkForCoach(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = await db.select().from(studyLinks).where(eq(studyLinks.userId, userId)).limit(1);
  if (existing[0]) return existing[0];

  const token = nanoid(32);
  await db.insert(studyLinks).values({ userId, token });
  const created = await db.select().from(studyLinks).where(eq(studyLinks.userId, userId)).limit(1);
  if (!created[0]) throw new Error("Could not create study link");
  return created[0];
}

export async function regenerateStudyLinkForCoach(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const token = nanoid(32);
  const existing = await db.select().from(studyLinks).where(eq(studyLinks.userId, userId)).limit(1);
  if (existing[0]) {
    await db.update(studyLinks).set({ token }).where(eq(studyLinks.userId, userId));
  } else {
    await db.insert(studyLinks).values({ userId, token });
  }
  return { token };
}

export async function getSharedStudyPlaybook(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const link = await db.select().from(studyLinks).where(eq(studyLinks.token, token)).limit(1);
  if (!link[0]) return undefined;
  const coach = await db.select({ name: users.name }).from(users).where(eq(users.id, link[0].userId)).limit(1);
  const sharedPlays = await listPlaysForCoach(link[0].userId);
  return {
    coachName: coach[0]?.name ?? "Your coach",
    plays: sharedPlays,
  };
}
