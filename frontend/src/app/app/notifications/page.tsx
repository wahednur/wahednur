import type { Metadata } from "next";
import NotificationsList from "@/components/app/NotificationsList";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="mt-2 text-sm text-muted">What changed on your projects, invoices and messages, newest first.</p>
      </div>
      <NotificationsList />
    </div>
  );
}
