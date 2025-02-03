"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role: "user" }),
    });

    const data = await res.json();

    if (res.ok) {
      alert("User registered successfully");
      router.push("/login");
    } else {
      alert(data.message || "Something went wrong");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-300px)] ">
      <div className="w-full md:w-1/2 lg:w-5/12 bg-white rounded-xl overflow-hidden shadow-lg">
        <div className="bg-wahednur text-white py-6 text-center">
          <h1 className="sub-title text-center">Welcome</h1>
          <h1 className="sec-title text-white/70">Sign Up</h1>
        </div>
        <div className="flex justify-center items-center mt-10 ">
          <button className="shadow bg-wahednur/50 justify-center rounded-lg overflow-hidden cursor-pointer hover:bg-wahednur duration-300 text-white font-bold flex items-center gap-2">
            <Image
              className="bg-dark p-2"
              src="/g.svg"
              width={40}
              height={40}
              alt="google"
            />
            <p className="py-2 pr-6">Login with Google</p>
          </button>
        </div>
        <div className="p-8">
          <form onSubmit={handleSubmit}>
            <div className="frm-grp mb-4">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="frm-ctr"
              />
            </div>

            <div className="frm-grp mb-4">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="frm-ctr"
              />
            </div>
            <div className="frm-grp mb-4">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border border-gray-300 rounded-md px-4 py-2 mb-4"
              />
            </div>

            <div className="text-center">
              {" "}
              <button type="submit" className="btn">
                Sign Up
              </button>
            </div>
          </form>
          <p className="text-center mt-6">
            Already have an account?{" "}
            <a className="link" href="/login">
              Login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
