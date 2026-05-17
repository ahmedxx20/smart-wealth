import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bot, Clock } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "@/components/AuthShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/robots")({ component: Page });

const PLANS = [
  { id: "v1", name: "Robot V1", rate: 1.75, min: 30, max: 99 },
  { id: "v2", name: "Robot V2", rate: 2.2, min: 100, max: 299 },
  { id: "v3", name: "Robot V3", rate: 3.4, min: 300, max: 999 },
  { id: "v4", name: "Robot V4", rate: 6.5, min: 1000, max: 5000 },
  { id: "v5", name: "Robot V5 (Special)", rate: 9, min: 30, max: 100 },
];

type Inv = { id: string; plan: string; amount: number; profit: number; ends_at: string; status: string };

function Page() {
  const { profile, refresh } = useAuth();
  const [investments, setInvestments] = useState<Inv[]>([]);
  const [amounts, setAmounts] = useState<Record<string,string>>({});
  const [now, setNow] = useState(Date.now());

  const load = async () => {
    await supabase.rpc("settle_robots");
    const { data } = await supabase.from("robot_investments").select("*").order("started_at", { ascending: false });
    setInvestments((data as Inv[]) || []);
    refresh();
  };
  useEffect(() => { load(); const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);

  const start = async (planId: string) => {
    const amt = parseFloat(amounts[planId] || "");
    if (!amt) return toast.error("Enter amount");
    const { error } = await supabase.rpc("start_robot", { p_plan: planId, p_amount: amt });
    if (error) return toast.error(error.message);
    toast.success("Robot started"); setAmounts(a => ({ ...a, [planId]: "" })); load();
  };

  const countdown = (ends: string) => {
    const ms = new Date(ends).getTime() - now;
    if (ms <= 0) return "Settling…";
    const h = Math.floor(ms/3600000); const m = Math.floor((ms%3600000)/60000); const s = Math.floor((ms%60000)/1000);
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <AuthShell>
      <h1 className="text-xl font-semibold mb-4">AI mining robots</h1>
      <p className="text-sm text-muted-foreground mb-4">Balance: <b className="text-primary">{(profile?.balance ?? 0).toFixed(2)} USDT</b></p>

      <div className="grid sm:grid-cols-2 gap-3">
        {PLANS.map(p => (
          <div key={p.id} className="glass-strong p-4">
            <div className="flex items-center gap-2">
              <span className="mining-icon"><Bot size={18}/></span>
              <div>
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.min}–{p.max} USDT · {p.rate}% daily</div>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <input className="input-glass" type="number" placeholder={`${p.min}-${p.max}`}
                     value={amounts[p.id] || ""} onChange={e => setAmounts(a => ({ ...a, [p.id]: e.target.value }))}/>
              <button onClick={() => start(p.id)} className="btn-glow btn-glow-primary whitespace-nowrap">Start</button>
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-8 mb-3 font-semibold">Active investments</h2>
      <div className="space-y-2">
        {investments.filter(i => i.status === "active").length === 0 && (
          <div className="glass p-6 text-center text-muted-foreground text-sm">No active robots</div>
        )}
        {investments.filter(i => i.status === "active").map(i => (
          <div key={i.id} className="glass p-3 flex justify-between items-center">
            <div>
              <div className="font-medium">Robot {i.plan.toUpperCase()} — {Number(i.amount).toFixed(2)} USDT</div>
              <div className="text-xs text-muted-foreground">Profit on completion: +{Number(i.profit).toFixed(2)}</div>
            </div>
            <div className="text-xs text-primary flex items-center gap-1"><Clock size={12}/> {countdown(i.ends_at)}</div>
          </div>
        ))}
      </div>
    </AuthShell>
  );
}
