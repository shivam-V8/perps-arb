import "server-only";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { dbConfigured, getDb, schema } from "@/db";
import { USER_ID_HEADER } from "@/lib/session-token";
import type { Role } from "@/lib/types";

export interface Viewer {
  id: string;
  role: Role | null;
  fullName: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * The current browser's identity and role (role is null until they pick one).
 * The id comes from middleware, which verified the signed cookie and overwrote
 * this header, so it can't be supplied by the client.
 */
export async function currentViewer(): Promise<Viewer | null> {
  if (!dbConfigured()) return null;
  const id = (await headers()).get(USER_ID_HEADER);
  if (!id || !UUID.test(id)) return null;
  const [u] = await getDb().select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
  return { id, role: u?.role ?? null, fullName: u?.fullName ?? "" };
}

/** For server actions / routes that require a chosen role. */
export async function requireViewer(role?: Role): Promise<Viewer & { role: Role }> {
  const v = await currentViewer();
  if (!v || !v.role) throw new Error("No profile yet");
  if (role && v.role !== role) throw new Error("Not allowed");
  return v as Viewer & { role: Role };
}
