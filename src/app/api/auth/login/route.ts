import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieName, authCookieOptions, authenticateUser, createSession } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe sua senha."),
});

export async function POST(request: Request) {
  try {
    const input = loginSchema.parse(await request.json());
    const user = await authenticateUser(input.email, input.password);
    if (!user) {
      return NextResponse.json({ message: "E-mail ou senha incorretos." }, { status: 401 });
    }

    const session = await createSession(user.id);
    const response = NextResponse.json({ user });
    response.cookies.set(authCookieName, session.id, authCookieOptions);
    return response;
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : "Não foi possível entrar agora.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
