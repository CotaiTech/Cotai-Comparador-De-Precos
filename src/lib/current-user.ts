import { cookies } from "next/headers";
import { authCookieName, getUserFromSession } from "@/lib/auth";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  return getUserFromSession(cookieStore.get(authCookieName)?.value);
}
