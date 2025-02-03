import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "@/lib/db";
import User from "@/models/User";

export async function POST(request: Request) {
  const { email, password } = await request.json();

  console.log("Received data:", { email, password }); // লগ যোগ করুন
  const database = process.env.MONGODB_URI as string;
  try {
    console.log("Connecting to MongoDB..."); // লগ যোগ করুন
    await db.connect(database);

    const user = await User.findOne({ email });
    if (!user) {
      console.log("User not found:", email); // লগ যোগ করুন
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 400 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log("Invalid password for user:", email); // লগ যোগ করুন
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 400 }
      );
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" }
    );

    console.log("User logged in successfully:", email); // লগ যোগ করুন
    return NextResponse.json({ token }, { status: 200 });
  } catch (error) {
    console.error("Error in login:", error); // লগ যোগ করুন
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
