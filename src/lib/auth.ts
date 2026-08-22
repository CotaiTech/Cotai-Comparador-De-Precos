import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import {
  AccountProfile,
  AccountUser,
  createDefaultProfile,
  RadarItem,
  SavedPlanning,
  Subscription,
} from "@/lib/account-types";

const scrypt = promisify(scryptCallback);

const databasePath = path.join(process.cwd(), "data", "users.json");
const sessionDurationMs = 1000 * 60 * 60 * 24 * 30;

type StoredUser = {
  id: string;
  restaurantName: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  profile?: AccountProfile;
  subscription?: Subscription;
  radarItems?: RadarItem[];
  plannings?: SavedPlanning[];
};

type StoredSession = {
  id: string;
  userId: string;
  expiresAt: string;
};

type AuthDatabase = {
  users: StoredUser[];
  sessions: StoredSession[];
};

export type AuthUser = AccountUser;

async function readDatabase(): Promise<AuthDatabase> {
  try {
    const content = await fs.readFile(databasePath, "utf8");
    const database = JSON.parse(content) as Partial<AuthDatabase>;
    return {
      users: database.users ?? [],
      sessions: database.sessions ?? [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { users: [], sessions: [] };
    }
    throw error;
  }
}

async function writeDatabase(database: AuthDatabase) {
  await fs.mkdir(path.dirname(databasePath), { recursive: true });
  await fs.writeFile(databasePath, `${JSON.stringify(database, null, 2)}\n`, "utf8");
}

function publicUser(user: StoredUser): AuthUser {
  return {
    id: user.id,
    restaurantName: user.restaurantName,
    email: user.email,
    profile: user.profile ?? createDefaultProfile(),
    subscription: {
      ...(user.subscription ?? { plan: "CotaÍ Pro", status: "demo" }),
      price: 119.9,
    },
  };
}

async function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

async function passwordMatches(password: string, storedHash: string) {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;

  const derivedHash = (await scrypt(password, salt, 64)) as Buffer;
  return timingSafeEqual(Buffer.from(hash, "hex"), derivedHash);
}

export async function registerUser(input: {
  restaurantName: string;
  email: string;
  password: string;
}): Promise<AuthUser> {
  const database = await readDatabase();
  const email = input.email.trim().toLowerCase();

  if (database.users.some((user) => user.email === email)) {
    throw new Error("Já existe uma conta com este e-mail.");
  }

  const user: StoredUser = {
    id: randomBytes(18).toString("hex"),
    restaurantName: input.restaurantName.trim(),
    email,
    passwordHash: await hashPassword(input.password),
    createdAt: new Date().toISOString(),
    profile: createDefaultProfile(),
    subscription: { plan: "CotaÍ Pro", price: 119.9, status: "demo" },
    radarItems: [],
    plannings: [],
  };

  database.users.push(user);
  await writeDatabase(database);
  return publicUser(user);
}

export async function authenticateUser(email: string, password: string): Promise<AuthUser | null> {
  const database = await readDatabase();
  const user = database.users.find((candidate) => candidate.email === email.trim().toLowerCase());

  if (!user || !(await passwordMatches(password, user.passwordHash))) {
    return null;
  }

  return publicUser(user);
}

export async function createSession(userId: string) {
  const database = await readDatabase();
  const session = {
    id: randomBytes(32).toString("hex"),
    userId,
    expiresAt: new Date(Date.now() + sessionDurationMs).toISOString(),
  };

  database.sessions = database.sessions.filter((item) => new Date(item.expiresAt).getTime() > Date.now());
  database.sessions.push(session);
  await writeDatabase(database);
  return session;
}

export async function getUserFromSession(sessionId?: string): Promise<AuthUser | null> {
  if (!sessionId) return null;

  const database = await readDatabase();
  const session = database.sessions.find((item) => item.id === sessionId);
  if (!session || new Date(session.expiresAt).getTime() <= Date.now()) return null;

  const user = database.users.find((item) => item.id === session.userId);
  return user ? publicUser(user) : null;
}

export async function deleteSession(sessionId?: string) {
  if (!sessionId) return;
  const database = await readDatabase();
  database.sessions = database.sessions.filter((item) => item.id !== sessionId);
  await writeDatabase(database);
}

export async function updateUserProfile(userId: string, restaurantName: string, profile: AccountProfile) {
  const database = await readDatabase();
  const user = database.users.find((item) => item.id === userId);
  if (!user) return null;

  user.restaurantName = restaurantName.trim();
  user.profile = { ...profile, completed: true };
  await writeDatabase(database);
  return publicUser(user);
}

export async function getRadarItems(userId: string) {
  const database = await readDatabase();
  return database.users.find((item) => item.id === userId)?.radarItems ?? [];
}

export async function addRadarItem(userId: string, query: string) {
  const database = await readDatabase();
  const user = database.users.find((item) => item.id === userId);
  if (!user) return null;

  user.radarItems ??= [];
  const existing = user.radarItems.find((item) => item.query.toLowerCase() === query.trim().toLowerCase());
  if (existing) return existing;

  const item: RadarItem = {
    id: randomBytes(12).toString("hex"),
    query: query.trim(),
    createdAt: new Date().toISOString(),
  };
  user.radarItems.unshift(item);
  await writeDatabase(database);
  return item;
}

export async function removeRadarItem(userId: string, radarItemId: string) {
  const database = await readDatabase();
  const user = database.users.find((item) => item.id === userId);
  if (!user) return false;

  user.radarItems = (user.radarItems ?? []).filter((item) => item.id !== radarItemId);
  await writeDatabase(database);
  return true;
}

export async function getPlannings(userId: string) {
  const database = await readDatabase();
  return database.users.find((item) => item.id === userId)?.plannings ?? [];
}

export async function addPlanning(
  userId: string,
  input: Omit<SavedPlanning, "id" | "createdAt">
) {
  const database = await readDatabase();
  const user = database.users.find((item) => item.id === userId);
  if (!user) return null;

  const planning: SavedPlanning = {
    ...input,
    id: randomBytes(12).toString("hex"),
    createdAt: new Date().toISOString(),
  };
  user.plannings ??= [];
  user.plannings.unshift(planning);
  await writeDatabase(database);
  return planning;
}

export async function getPlanning(userId: string, planningId: string) {
  const plannings = await getPlannings(userId);
  return plannings.find((item) => item.id === planningId) ?? null;
}

export const authCookieName = "cotai_session";
export const authCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: Math.floor(sessionDurationMs / 1000),
};
