import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieName, deleteSession } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  await deleteSession(cookieStore.get(authCookieName)?.value);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(authCookieName, "", { path: "/", maxAge: 0 });
  return response;
}
