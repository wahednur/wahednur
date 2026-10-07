import { Boxes, LayoutDashboard, Rocket, Server, Sparkles, Store, Wrench } from "lucide-react";
import type { Service } from "@/lib/services";

const icons = {
  store: Store,
  boxes: Boxes,
  layout: LayoutDashboard,
  server: Server,
  sparkles: Sparkles,
  wrench: Wrench,
  rocket: Rocket,
} as const;

export default function ServiceIcon({ name }: { name: Service["icon"] }) {
  const Icon = icons[name];
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-brand/30 bg-surface-2 text-brand">
      <Icon className="h-5 w-5" aria-hidden />
    </span>
  );
}
