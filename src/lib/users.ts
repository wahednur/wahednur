import bcrypt from "bcryptjs";
import clientPromise from "./mongodb";

export async function findUserByEmail(email: string) {
  const client = await clientPromise;
  const db = client.db();
  return db.collection("users").findOne({ email });
}

export async function createUser(
  name: string,
  email: string,
  password: string
) {
  const client = await clientPromise;
  const db = client.db();
  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await db.collection("users").insertOne({
    name,
    email,
    password: hashedPassword,
    createAt: new Date(),
  });
  return result;
}
