import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

type Profile = {
  id: string; username: string; email: string; uid: string;
  balance: number; withdrawal_address: string | null; is_admin: boolean;
  is_blocked: boolean; referral_code: string; has_first_deposit: boolean;
};

type Ctx = { session: Session | null; profile: Profile | null; loading: boolean; refresh: () => Promise<void>; signOut: () => Promise<void>; };
const AuthCtx = createContext<Ctx>({ session: null, profile: null, loading: true, refresh: async () => {}, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    setProfile(data as Profile | null);
  };

  const refresh = async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    if (data.session?.user) await loadProfile(data.session.user.id);
    else setProfile(null);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) setTimeout(() => loadProfile(s.user.id), 0);
      else setProfile(null);
    });
    refresh().finally(() => setLoading(false));
    return () => sub.subscription.unsubscribe();
  }, []);

  // touch last_active
  useEffect(() => {
    if (!session) return;
    const tick = () => { supabase.rpc("touch_last_active"); };
    tick();
    const i = setInterval(tick, 60_000);
    return () => clearInterval(i);
  }, [session]);

  const signOut = async () => { await supabase.auth.signOut(); };
  return <AuthCtx.Provider value={{ session, profile, loading, refresh, signOut }}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => useContext(AuthCtx);
