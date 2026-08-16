import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type MemberStatus = "loading" | "anonymous" | "not_approved" | "member" | "admin";

export type Profile = {
  id: string;
  phone: string;
  full_name: string;
  avatar_url: string | null;
};

type AuthValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  status: MemberStatus;
  isAdmin: boolean;
  isMember: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState<MemberStatus>("loading");

  const sync = useCallback(async (current: Session | null) => {
    if (!current) {
      setProfile(null);
      setStatus("anonymous");
      return;
    }
    const { data: role } = await supabase.rpc("bootstrap_me", { _full_name: "" });
    if (role === "admin" || role === "member") {
      const { data } = await supabase
        .from("profiles")
        .select("id, phone, full_name, avatar_url")
        .eq("id", current.user.id)
        .maybeSingle();
      setProfile(data ?? null);
      setStatus(role);
    } else {
      setProfile(null);
      setStatus("not_approved");
    }
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      void sync(data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      setSession(next);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        void sync(next);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [sync]);

  // keep "online" presence fresh for the members list
  useEffect(() => {
    if (!session) return;
    const beat = () => {
      void supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", session.user.id);
    };
    beat();
    const timer = window.setInterval(beat, 45_000);
    return () => window.clearInterval(timer);
  }, [session]);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      status,
      isAdmin: status === "admin",
      isMember: status === "admin" || status === "member",
      refresh: async () => {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        await sync(data.session);
      },
      signOut: async () => {
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
        setStatus("anonymous");
      },
    }),
    [session, profile, status, sync],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
