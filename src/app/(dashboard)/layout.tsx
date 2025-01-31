import React from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full">
      <div className="flex gap-6">
        <div>Left sidebar</div>
        <div>Right content {children}</div>
      </div>
    </div>
  );
}
