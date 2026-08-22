import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieName, authCookieOptions, createSession, registerUser } from "@/lib/auth";

const registerSchema = z.object({
  restaurantName: z.string().trim().min(2, "Informe o nome do restaurante."),
  email: z.string().trim().email("Informe um e-mail válido."),
  password: z.string().min(6, "A senha deve ter ao menos 6 caracteres."),
});

export async function POST(request: Request) {
  try {
    const input = registerSchema.parse(await request.json());
    const user = await registerUser(input);
    const session = await createSession(user.id);
    const response = NextResponse.json({ user }, { status: 201 });
    response.cookies.set(authCookieName, session.id, authCookieOptions);
    return response;
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : "Não foi possível criar sua conta.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
