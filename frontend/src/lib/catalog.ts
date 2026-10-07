import type { ServiceInfo } from "./api";

const API = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

/** Published services and packages. Returns null when the API cannot be reached. */
export async function getServices(): Promise<ServiceInfo[] | null> {
  if (!API) return null;
  try {
    const res = await fetch(`${API}/api/catalog/services/`, { next: { revalidate: 60 } });
    return res.ok ? ((await res.json()) as ServiceInfo[]) : null;
  } catch {
    return null;
  }
}
