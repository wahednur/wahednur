// app/api/register/route.ts
import { createUser, findUserByEmail } from "@/lib/users";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { name, email, password } = await req.json();

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    return NextResponse.json(
      { message: "Email already in use" },
      { status: 400 }
    );
  }

  await createUser(name, email, password);
  return NextResponse.json({ message: "User created" }, { status: 201 });
}
