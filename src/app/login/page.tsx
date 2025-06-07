"use client";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
// app/login/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | User Authentication",
  description:
    "Login to your account to access services and products securely.",
  keywords: ["login", "authentication", "user login", "WS Auth"],
  robots: "noindex",
};

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await signIn("credentials", {
      redirect: false,
      email: form.email,
      password: form.password,
    });

    if (res?.ok) {
      router.push("/dashboard");
    } else {
      setError("Invalid credentials");
    }
  };

  return (
    <div className="vh-height flex justify-center items-center flex-col">
      <div className="mb-10">
        <h1 className="heading">User Login</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
        <input
          name="email"
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="Email"
          className="w-full border p-2 rounded"
        />
        <input
          name="password"
          type="password"
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder="Password"
          className="w-full border p-2 rounded"
        />
        {error && <p className="text-red-500">{error}</p>}
        <button type="submit" className="btn btn-filled">
          Login
        </button>
      </form>
    </div>
  );
}
