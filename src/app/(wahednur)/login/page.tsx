"use client";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { BsEye, BsEyeSlash } from "react-icons/bs";

export default function Login() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (result?.ok) {
      router.push("/");
    } else {
      alert("Invalid credential");
    }
  };
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-300px)] container">
      <div className="w-full md:w-5/12">
        <div className="bg-white p-4 md:p-8 rounded-2xl border-primary/10 border shadow-lg py-10">
          <h1 className="title text-center text-wahednur">Login</h1>
          <form className="w-full">
            <div className="frm-grp mb-4">
              <label htmlFor="email">Email</label>
              <input
                onChange={(e) => setEmail(e.target.value)}
                type="text"
                name="email"
                placeholder="Email"
                className="frm-ctr"
              />
            </div>
            <div className="frm-grp mb-4 relative">
              <label htmlFor="password">Email</label>
              <input
                onChange={(e) => setPassword(e.target.value)}
                name="password"
                placeholder="Password"
                className="frm-ctr"
                type={`${open ? "text" : "password"}`}
              />
              <span
                onClick={() => setOpen(!open)}
                className="absolute right-4 top-3/5"
              >
                {open ? <BsEyeSlash /> : <BsEye />}
              </span>
            </div>
            <button onClick={handleLogin} className="btn" type="submit">
              Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
