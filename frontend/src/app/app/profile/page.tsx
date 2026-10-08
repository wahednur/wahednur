import type { Metadata } from "next";
import ProfilePanel from "@/components/app/profile/ProfilePanel";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-2 text-sm text-muted">Your name, phone and the addresses used for delivery and invoices.</p>
      </div>
      <ProfilePanel />
    </div>
  );
}
