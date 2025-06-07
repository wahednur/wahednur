"use client";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginForm() {
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
      <p className="text-sm -mt-3.5">
        Forgot your password?{" "}
        <Link href={"/reset-pass"} className="text-ws-error">
          Reset Password
        </Link>
      </p>
      {error && <p className="text-red-500">{error}</p>}
      <button type="submit" className="btn btn-filled mx-auto">
        Login
      </button>
    </form>
  );
}
