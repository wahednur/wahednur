import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export const authenticate = (handler: Function) => async (req: NextRequest) => {
  const token = req.headers.get("authorization")?.split(" ")[1];

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    (req as any).user = decoded;
    return handler(req);
  } catch (error) {
    return NextResponse.json(
      { message: "Unauthorized", error },
      { status: 401 }
    );
  }
};
