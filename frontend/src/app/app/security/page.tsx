import type { Metadata } from "next";
import SecurityPanel from "@/components/auth/SecurityPanel";
import { getMe } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Security" };

export default async function SecurityPage() {
  const me = (await getMe())!;
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Security</h1>
        <p className="mt-2 text-sm text-muted">Your password and two-factor authentication.</p>
      </div>
      <SecurityPanel hasPassword={me.has_password} />
    </div>
  );
}
