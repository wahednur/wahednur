import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, authCall } from "./http";
import type { Me } from "./types";

type Flow = { id: string; is_pending?: boolean };
type Auth = {
  me: Me | null;
  loading: boolean;
  /** Returns "ok", "code" (a two-step code is needed) or an error message. */
  signIn: (email: string, password: string) => Promise<string>;
  verifyCode: (code: string) => Promise<string>;
  signOut: () => Promise<void>;
  isOwner: boolean;
  isStaff: boolean;
};

const Ctx = createContext<Auth | null>(null);
export const useAuth = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
};

const flowsOf = (raw: unknown): Flow[] => (raw as { data?: { flows?: Flow[] } } | null)?.data?.flows ?? [];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const r = await api<Me>("GET", "/auth/me/");
    setMe(r.ok ? r.data : null);
    setLoading(false);
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const r = await authCall("POST", "/auth/login", { email: email.trim(), password });
      if (r.status === 200) {
        await refresh();
        return "ok";
      }
      const flows = flowsOf(r.raw);
      if (flows.some((f) => f.id === "mfa_authenticate" && f.is_pending !== false)) return "code";
      if (flows.some((f) => f.id === "verify_email" && f.is_pending !== false))
        return "Verify your email first, using the link we sent you.";
      return r.status === 400 || r.status === 401 || r.status === 409
        ? "That did not work. Check your email and password."
        : r.error;
    },
    [refresh],
  );

  const verifyCode = useCallback(
    async (code: string) => {
      const r = await authCall("POST", "/auth/2fa/authenticate", { code: code.trim() });
      if (r.status === 200) {
        await refresh();
        return "ok";
      }
      return r.error || "That code did not work.";
    },
    [refresh],
  );

  const signOut = useCallback(async () => {
    await authCall("DELETE", "/auth/session");
    setMe(null);
  }, []);

  const isOwner = !!me?.roles.includes("owner");
  const isStaff = isOwner || !!me?.roles.includes("staff");
  return <Ctx.Provider value={{ me, loading, signIn, verifyCode, signOut, isOwner, isStaff }}>{children}</Ctx.Provider>;
}
