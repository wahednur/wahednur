import { Metadata } from "next";

import OAuthProviders from "@/components/auth/OAuthProviders";
import Link from "next/link";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Login | Login you account",
  description:
    "Login to your account to access services and products securely.",
  keywords: ["login", "authentication", "user login", "WS Auth"],
  robots: "noindex",
};

export default function LoginPage() {
  return (
    <div className="vh-height flex justify-center items-center flex-col">
      <div className="w-full md:w-lg border border-ws-primary/30 shadow-xl bg-white/30 p-10 rounded-2xl backdrop-blur-sm">
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-ws-heading">
            Sign in to your account
          </h2>
          <p className="text-sm text-ws-text mt-2">
            We’re glad to see you again — continue where you left off.
          </p>
        </div>
        <LoginForm />
        <div>
          <div className="flex justify-center items-center my-5 text-gray-400">
            <span className="flex-1">
              <hr />
            </span>
            <span className="px-3 text-ws-text">or</span>
            <span className="flex-1">
              <hr />
            </span>
          </div>
          <p className="text-sm -mt-5 text-center">Sign in with</p>
        </div>
        <div className="mt-5">
          <OAuthProviders />
        </div>

        <p className="text-sm text-gray-600 mt-5">
          Don’t have an account yet?{" "}
          <Link
            href="/register"
            className="text-ws-primary hover:underline font-medium"
          >
            Create one now
          </Link>
        </p>
      </div>
    </div>
  );
}
