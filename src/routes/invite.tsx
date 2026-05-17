import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "@/components/AuthShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/invite")({ component: Page });

function Page() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ invited: 0, valid: 0, earnings: 0 });

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data: refs } = await supabase.from("referrals").select("commission_earned, referred_id").eq("referrer_id", profile.id);
      const earnings = (refs || []).reduce((s, r) => s + Number(r.commission_earned || 0), 0);
      const { count: invited } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("referred_by", profile.id);
      const { count: valid } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("referred_by", profile.id).eq("has_first_deposit", true);
      setStats({ invited: invited || 0, valid: valid || 0, earnings });
    })();
  }, [profile]);

  const link = typeof window !== "undefined" ? `${window.location.origin}/register?ref=${profile?.referral_code || ""}` : "";

  const copy = async (val: string, msg: string) => { await navigator.clipboard.writeText(val); toast.success(msg); };

  return (
    <AuthShell>
      <h1 className="text-xl font-semibold mb-4">Invite friends</h1>

      <div className="glass-strong p-5 space-y-3">
        <div>
          <div className="text-xs text-muted-foreground">Your referral code</div>
          <div className="flex items-center gap-2 mt-1">
            <div className="font-mono text-lg text-primary">{profile?.referral_code}</div>
            <button onClick={() => copy(profile?.referral_code || "", "Code copied")} className="btn-glow !p-2 !rounded-full"><Copy size={14}/></button>
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Your invite link</div>
          <div className="flex items-center gap-2 mt-1">
            <div className="font-mono text-xs break-all glass p-2 flex-1">{link}</div>
            <button onClick={() => copy(link, "Link copied")} className="btn-glow !p-2 !rounded-full"><Copy size={14}/></button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="glass p-4 text-center"><div className="text-2xl font-bold text-grad">{stats.invited}</div><div className="text-xs text-muted-foreground">Invited</div></div>
        <div className="glass p-4 text-center"><div className="text-2xl font-bold text-grad">{stats.valid}</div><div className="text-xs text-muted-foreground">Valid</div></div>
        <div className="glass p-4 text-center"><div className="text-2xl font-bold text-grad">{stats.earnings.toFixed(2)}</div><div className="text-xs text-muted-foreground">Earnings USDT</div></div>
      </div>

      <div className="glass-strong p-5 mt-4">
        <h2 className="font-semibold mb-2">Commission tiers</h2>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li><b className="text-primary">Level 1</b> — 10% of every referred user's first deposit</li>
          <li><b className="text-primary">Level 2</b> — 4% from your level-1's invitees</li>
          <li><b className="text-primary">Level 3</b> — 1% from your level-2's invitees</li>
        </ul>
      </div>
    </AuthShell>
  );
}
