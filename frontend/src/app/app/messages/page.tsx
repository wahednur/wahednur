import type { Metadata } from "next";
import MessageThread from "@/components/app/MessageThread";

export const metadata: Metadata = { title: "Messages" };

export default function MessagesPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
        <p className="mt-2 text-sm text-muted">A private conversation with Wahed Nur.</p>
      </div>
      <MessageThread />
    </div>
  );
}
