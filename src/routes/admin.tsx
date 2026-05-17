import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, Wallet, ArrowDownToLine, ArrowUpFromLine, Check, X, Ban, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "@/components/AuthShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/admin")({ component: Page });

type Profile = { id: string; username: string; email: string; uid: string; balance: number; withdrawal_address: string | null; is_blocked: boolean; last_active: string };
type Dep = { id: string; user_id: string; amount: number; txid: string; address: string; created_at: string };
type Wd = { id: string; user_id: string; amount: number; fee: number; address: string; created_at: string };

function beep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.15, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    o.start(); o.stop(ctx.currentTime + 0.4);
  } catch {}
}

function Page() {
  const { profile } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<"stats"|"users"|"deposits"|"withdrawals">("stats");
  const [stats, setStats] = useState({ deposits: 0, withdrawals: 0, users: 0, online: 0 });
  const [users, setUsers] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [deps, setDeps] = useState<Dep[]>([]);
  const [wds, setWds] = useState<Wd[]>([]);

  useEffect(() => { if (profile && !profile.is_admin) nav({ to: "/dashboard" }); }, [profile, nav]);

  const loadAll = async () => {
    const [{ data: dSum }, { data: wSum }, { count: uCount }, { count: onCount }] = await Promise.all([
      supabase.from("deposits").select("amount").eq("status","success"),
      supabase.from("withdrawals").select("amount").eq("status","success"),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).gte("last_active", new Date(Date.now()-2*60_000).toISOString()),
    ]);
    setStats({
      deposits: (dSum || []).reduce((s, r: any) => s + Number(r.amount), 0),
      withdrawals: (wSum || []).reduce((s, r: any) => s + Number(r.amount), 0),
      users: uCount || 0, online: onCount || 0,
    });
    const [{ data: pend }, { data: pendW }] = await Promise.all([
      supabase.from("deposits").select("*").eq("status","pending").order("created_at"),
      supabase.from("withdrawals").select("*").eq("status","pending").order("created_at"),
    ]);
    setDeps((pend as Dep[]) || []); setWds((pendW as Wd[]) || []);
  };

  const loadUsers = async () => {
    let q = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(100);
    if (search) q = q.or(`uid.ilike.%${search}%,email.ilike.%${search}%,username.ilike.%${search}%`);
    const { data } = await q;
    setUsers((data as Profile[]) || []);
  };

  useEffect(() => { loadAll(); loadUsers(); }, []);
  useEffect(() => { const i = setInterval(loadAll, 15000); return () => clearInterval(i); }, []);

  // realtime notifications
  useEffect(() => {
    if (!profile?.is_admin) return;
    const ch = supabase.channel("admin-pending")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "deposits" }, () => { beep(); toast("New deposit pending"); loadAll(); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "withdrawals" }, () => { beep(); toast("New withdrawal pending"); loadAll(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile?.is_admin]);

  const approveDep = async (id: string) => { const { error } = await supabase.rpc("approve_deposit", { p_id: id }); if (error) return toast.error(error.message); toast.success("Approved"); loadAll(); };
  const rejectDep = async (id: string) => { const r = prompt("Reason?") || ""; const { error } = await supabase.rpc("reject_deposit", { p_id: id, p_reason: r }); if (error) return toast.error(error.message); toast.success("Rejected"); loadAll(); };
  const approveWd = async (id: string) => { const { error } = await supabase.rpc("approve_withdrawal", { p_id: id }); if (error) return toast.error(error.message); toast.success("Approved"); loadAll(); };
  const rejectWd = async (id: string) => { const r = prompt("Reason?") || ""; const { error } = await supabase.rpc("reject_withdrawal", { p_id: id, p_reason: r }); if (error) return toast.error(error.message); toast.success("Rejected"); loadAll(); };
  const adjust = async (uid: string) => {
    const d = prompt("Amount (negative to deduct):"); if (!d) return;
    const note = prompt("Note?") || "";
    const { error } = await supabase.rpc("admin_adjust_balance", { p_user: uid, p_delta: parseFloat(d), p_note: note });
    if (error) return toast.error(error.message); toast.success("Updated"); loadUsers();
  };
  const block = async (uid: string, b: boolean) => {
    const { error } = await supabase.rpc("admin_set_blocked", { p_user: uid, p_blocked: b });
    if (error) return toast.error(error.message); toast.success(b ? "Blocked" : "Unblocked"); loadUsers();
  };

  if (!profile?.is_admin) return null;

  const Stat = ({ icon:Icon, label, val }: any) => (
    <div className="glass-strong p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs"><Icon size={14}/> {label}</div>
      <div className="mt-1 text-2xl font-bold text-grad">{val}</div>
    </div>
  );

  return (
    <AuthShell>
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="text-primary"/><h1 className="text-xl font-semibold">Admin panel</h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat icon={ArrowDownToLine} label="Total deposits" val={`${stats.deposits.toFixed(2)}`}/>
        <Stat icon={ArrowUpFromLine} label="Total withdrawals" val={`${stats.withdrawals.toFixed(2)}`}/>
        <Stat icon={Users} label="Total users" val={stats.users}/>
        <Stat icon={Wallet} label="Online now" val={stats.online}/>
      </div>

      <div className="flex gap-2 mt-6 flex-wrap">
        {(["users","deposits","withdrawals"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`btn-glow ${tab===t?"btn-glow-primary":""}`}>
            {t === "deposits" ? `Pending deposits (${deps.length})` : t === "withdrawals" ? `Pending withdrawals (${wds.length})` : "Users"}
          </button>
        ))}
      </div>

      {tab === "users" && (
        <div className="mt-4">
          <div className="flex gap-2 mb-3">
            <input className="input-glass" placeholder="Search uid / email / name" value={search} onChange={e => setSearch(e.target.value)} />
            <button onClick={loadUsers} className="btn-glow">Search</button>
          </div>
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="glass p-3 text-sm">
                <div className="flex justify-between flex-wrap gap-2">
                  <div>
                    <div className="font-medium">{u.username} <span className="text-muted-foreground text-xs">· {u.email}</span></div>
                    <div className="text-xs text-muted-foreground">UID {u.uid} · {u.is_blocked && <span className="text-destructive">BLOCKED</span>}</div>
                    <div className="text-xs font-mono break-all">{u.withdrawal_address || "—"}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-primary font-bold">{Number(u.balance).toFixed(2)}</div>
                    <div className="flex gap-1 mt-1">
                      <button onClick={() => adjust(u.id)} className="btn-glow !py-1 !px-2 text-xs">± Balance</button>
                      <button onClick={() => block(u.id, !u.is_blocked)} className="btn-glow !py-1 !px-2 text-xs"><Ban size={12}/></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "deposits" && (
        <div className="mt-4 space-y-2">
          {deps.length === 0 && <div className="glass p-6 text-center text-muted-foreground text-sm">No pending deposits</div>}
          {deps.map(d => (
            <div key={d.id} className="glass p-3 text-sm flex justify-between items-center flex-wrap gap-2">
              <div>
                <div className="font-semibold text-primary">{Number(d.amount).toFixed(2)} USDT</div>
                <div className="text-xs font-mono break-all">TxID: {d.txid}</div>
                <div className="text-xs text-muted-foreground">user {d.user_id.slice(0,8)} · {new Date(d.created_at).toLocaleString()}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => approveDep(d.id)} className="btn-glow btn-glow-primary !py-1 !px-3"><Check size={14}/></button>
                <button onClick={() => rejectDep(d.id)} className="btn-glow !py-1 !px-3"><X size={14}/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "withdrawals" && (
        <div className="mt-4 space-y-2">
          {wds.length === 0 && <div className="glass p-6 text-center text-muted-foreground text-sm">No pending withdrawals</div>}
          {wds.map(w => (
            <div key={w.id} className="glass p-3 text-sm flex justify-between items-center flex-wrap gap-2">
              <div>
                <div className="font-semibold text-primary">{Number(w.amount).toFixed(2)} USDT <span className="text-xs text-muted-foreground">(fee {Number(w.fee).toFixed(2)})</span></div>
                <div className="text-xs font-mono break-all">{w.address}</div>
                <div className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleString()}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => approveWd(w.id)} className="btn-glow btn-glow-primary !py-1 !px-3"><Check size={14}/></button>
                <button onClick={() => rejectWd(w.id)} className="btn-glow !py-1 !px-3"><X size={14}/></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AuthShell>
  );
}
