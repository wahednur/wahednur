import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import User from "@/models/User";

export async function POST(request: Request) {
  const { name, email, password, role } = await request.json();
  const database = process.env.MONGODB_URI as string;
  console.log("Received data:", { name, email, password, role }); // লগ যোগ করুন

  try {
    console.log("Connecting to MongoDB..."); // লগ যোগ করুন
    await db.connect(database);

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("User already exists:", email); // লগ যোগ করুন
      return NextResponse.json(
        { message: "User already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: role || "user",
    });

    await user.save();
    console.log("User registered successfully:", email); // লগ যোগ করুন
    return NextResponse.json(
      { message: "User registered successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in registration:", error); // লগ যোগ করুন
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
