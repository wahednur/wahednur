import { NextResponse } from "next/server";
import { authenticate } from "@/lib/middleware";

const handler = (req: Request) => {
  const user = (req as any).user;
  return NextResponse.json(
    { message: "You are authenticated", user },
    { status: 200 }
  );
};

export const POST = authenticate(handler);
