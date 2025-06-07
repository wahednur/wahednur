import OAuthProviders from "@/components/auth/OAuthProviders";
import { Metadata } from "next";
import Link from "next/link";
import RegisterForm from "./RegisterForm";

export const metadata: Metadata = {
  title: "Sign Up | Create your account",
  description:
    "Create a new account to start using our services securely and efficiently.",
  keywords: ["signup", "register", "user registration", "WS Auth"],
  robots: "noindex",
};

export default function RegisterPage() {
  return (
    <div className="vh-height flex justify-center items-center flex-col">
      <div className="w-full md:w-lg border border-ws-primary/30 shadow-xl bg-white/30 p-10 rounded-2xl backdrop-blur-sm">
        <div className="mb-10 ">
          <h2 className="text-2xl font-bold text-ws-heading">
            Sign up to get started
          </h2>
          <p className="text-sm text-ws-text mt-2">
            Join us today and enjoy exclusive services tailored just for you.
          </p>
        </div>

        <RegisterForm />

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

        <div className="mt-5">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-ws-primary hover:underline font-medium"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
