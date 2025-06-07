"use client";

import { signIn } from "next-auth/react";
import { FaFacebook, FaGithub } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";

const providers = [
  {
    id: "google",
    name: "Google",
    icon: <FcGoogle className="text-xl" />,
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: <FaFacebook className="text-blue-600 text-xl" />,
  },
  {
    id: "github",
    name: "GitHub",
    icon: <FaGithub className="text-gray-800 text-xl" />,
  },
];

export default function OAuthProviders() {
  return (
    <div className="space-y-3">
      {providers.map((provider) => (
        <button
          key={provider.id}
          onClick={() => signIn(provider.id)}
          className="flex items-center justify-center gap-2 w-full px-4 py-2 border rounded-lg hover:bg-gray-100 transition text-sm font-medium"
        >
          {provider.icon}
          Continue with {provider.name}
        </button>
      ))}
    </div>
  );
}
