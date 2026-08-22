import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieName, getUserFromSession } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const user = await getUserFromSession(cookieStore.get(authCookieName)?.value);
  return NextResponse.json({ user });
}
