import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/AuthShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/team")({ component: Page });

type Row = { level: number; commission_earned: number; created_at: string; referred_id: string };

function Page() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    if (!profile) return;
    supabase.from("referrals").select("level, commission_earned, created_at, referred_id")
      .eq("referrer_id", profile.id).order("created_at", { ascending: false })
      .then(({ data }) => setRows((data as Row[]) || []));
  }, [profile]);

  const byLevel = [1,2,3].map(l => ({ l, count: rows.filter(r => r.level === l).length, sum: rows.filter(r => r.level === l).reduce((s,r) => s + Number(r.commission_earned), 0) }));

  return (
    <AuthShell>
      <h1 className="text-xl font-semibold mb-4">My team</h1>
      <div className="grid grid-cols-3 gap-3">
        {byLevel.map(b => (
          <div key={b.l} className="glass p-4 text-center">
            <div className="text-xs text-muted-foreground">Level {b.l}</div>
            <div className="text-2xl font-bold text-grad mt-1">{b.count}</div>
            <div className="text-xs text-primary mt-1">{b.sum.toFixed(2)} USDT</div>
          </div>
        ))}
      </div>
      <div className="mt-6 space-y-2">
        {rows.length === 0 && <div className="glass p-6 text-center text-muted-foreground text-sm">No team members yet — share your invite link!</div>}
        {rows.map((r,i) => (
          <div key={i} className="glass p-3 flex justify-between text-sm">
            <span>L{r.level} member · {new Date(r.created_at).toLocaleDateString()}</span>
            <span className="text-primary font-semibold">+{Number(r.commission_earned).toFixed(2)}</span>
          </div>
        ))}
      </div>
    </AuthShell>
  );
}
