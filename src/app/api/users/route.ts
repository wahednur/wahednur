import { NextResponse } from "next/server";
import User from "@/models/User";

// user signup
export async function POST(req: Request) {
  try {
    await connectDB();
    const { name, email, password } = await req.json();
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "please provide all fields" },
        { status: 400 }
      );
    }

    const newUser = new User({ name, email, password });
    await newUser.save();

    return NextResponse.json(
      { message: "User created successfully", user: newUser },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Something went wrong", error },
      { status: 500 }
    );
  }
}

//
