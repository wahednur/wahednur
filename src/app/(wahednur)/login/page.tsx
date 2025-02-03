"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { BsEye, BsEyeSlash } from "react-icons/bs";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (res.ok) {
      localStorage.setItem("token", data.token);
      router.push("/dashboard");
    } else {
      alert(data.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-300px)] ">
      <div className="w-full md:w-1/2 lg:w-5/12 bg-white rounded-xl overflow-hidden shadow-lg">
        <div className="bg-wahednur text-white ">
          <h1 className="sec-title p-6 text-center">Login</h1>
          <h4 className="text-lg font-semibold text-center pb-6">
            Lon in to your account
          </h4>
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
        <form onSubmit={handleSubmit} className="p-6 lg:p-10">
          <div className="frm-grp mb-4">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="frm-ctr"
            />
          </div>
          <div className="frm-grp mb-4 relative">
            <label htmlFor="password">Password</label>
            <span
              className="absolute top-8 right-0 cursor-pointer p-4"
              onClick={() => {
                setOpen(!open);
              }}
            >
              {open ? <BsEye /> : <BsEyeSlash />}
            </span>
            <input
              type={open ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="frm-ctr"
            />
            <p className="text-sm">
              Forgot password{" "}
              <Link className="link" href={"/reset"}>
                reset
              </Link>{" "}
            </p>
          </div>
          <div className="text-center">
            <button type="submit" className="btn cursor-pointer">
              Login
            </button>
          </div>
        </form>
        <p className="text-center mb-10">
          Don&apos;t have no account?{" "}
          <Link className="link" href="/signup">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
