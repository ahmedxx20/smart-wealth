import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, ArrowDownToLine, ArrowUpFromLine, ListOrdered, Bot, Users, Settings, Sparkles, X } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/dashboard")({ component: Page });

function Page() {
  const { profile } = useAuth();
  const [hide, setHide] = useState(false);
  const [showOffer, setShowOffer] = useState(false);
  useEffect(() => {
    if (!profile) return;
    const seen = localStorage.getItem(`sw_offer_${profile.id}`);
    if (!seen) { setShowOffer(true); localStorage.setItem(`sw_offer_${profile.id}`, "1"); }
  }, [profile]);

  const actions = [
    { to: "/deposit", icon: ArrowDownToLine, label: "Deposit" },
    { to: "/withdraw", icon: ArrowUpFromLine, label: "Withdraw" },
    { to: "/transactions", icon: ListOrdered, label: "Transactions" },
    { to: "/robots", icon: Bot, label: "Mining robots" },
    { to: "/team", icon: Users, label: "Team" },
    { to: "/invite", icon: Sparkles, label: "Invite" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ] as const;

  return (
    <AuthShell>
      <div className="space-y-6">
        <section className="glass-strong p-6 pulse-glow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Total balance (USDT)</div>
              <div className="mt-1 text-4xl font-bold text-grad">
                {hide ? "••••••" : (profile?.balance ?? 0).toFixed(2)}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">UID: {profile?.uid}</div>
            </div>
            <button onClick={() => setHide(h => !h)} className="btn-glow !p-2 !rounded-full" aria-label="Toggle balance">
              {hide ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="mt-5 flex gap-2 flex-wrap">
            <Link to="/deposit" className="btn-glow btn-glow-primary"><ArrowDownToLine size={16}/> Deposit</Link>
            <Link to="/withdraw" className="btn-glow"><ArrowUpFromLine size={16}/> Withdraw</Link>
            <Link to="/transactions" className="btn-glow"><ListOrdered size={16}/> History</Link>
          </div>
        </section>

        <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {actions.map(a => (
            <Link key={a.to} to={a.to} className="glass p-4 flex flex-col items-center justify-center gap-2 hover:scale-[1.02] transition-transform">
              <span className="mining-icon"><a.icon size={18}/></span>
              <span className="text-sm">{a.label}</span>
            </Link>
          ))}
        </section>
      </div>

      {showOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-strong p-6 max-w-sm w-full text-center relative pulse-glow">
            <button onClick={() => setShowOffer(false)} className="absolute right-3 top-3 btn-glow !p-1.5 !rounded-full"><X size={14}/></button>
            <Sparkles className="mx-auto text-primary" size={36}/>
            <h2 className="mt-3 text-xl font-bold text-grad">Exclusive offer</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Get a <b className="text-primary">20% bonus</b> on your first deposit + start earning daily with our AI mining robots.
            </p>
            <Link to="/deposit" onClick={() => setShowOffer(false)} className="btn-glow btn-glow-primary mt-4 w-full">Deposit now</Link>
          </div>
        </div>
      )}
    </AuthShell>
  );
}
