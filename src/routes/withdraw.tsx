import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/AuthShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/withdraw")({ component: Page });

function Page() {
  const { profile, refresh } = useAuth();
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt < 20) return toast.error("Minimum withdrawal is 20 USDT");
    setLoading(true);
    const { error } = await supabase.rpc("request_withdrawal", { p_amount: amt, p_pin: pin });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Withdrawal requested");
    setAmount(""); setPin(""); refresh();
  };

  const fee = (parseFloat(amount) || 0) * 0.01;

  return (
    <AuthShell>
      <div className="max-w-md mx-auto glass-strong p-5 space-y-3">
        <h2 className="font-semibold text-center">Withdraw USDT (TRC20)</h2>
        <div className="glass p-3 text-sm flex justify-between">
          <span className="text-muted-foreground">Available</span>
          <span className="font-semibold text-primary">{(profile?.balance ?? 0).toFixed(2)} USDT</span>
        </div>
        <div className="glass p-3 text-xs">
          <div className="text-muted-foreground">Withdrawal address</div>
          <div className="font-mono break-all mt-1">{profile?.withdrawal_address || <Link to="/settings" className="text-primary">Set address in settings →</Link>}</div>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <label className="text-xs text-muted-foreground">Amount</label>
          <input className="input-glass" type="number" step="0.01" min="20" value={amount} onChange={e => setAmount(e.target.value)} required />
          <label className="text-xs text-muted-foreground">Withdrawal PIN</label>
          <input className="input-glass" type="password" value={pin} onChange={e => setPin(e.target.value)} required />
          <div className="text-xs text-muted-foreground flex justify-between">
            <span>Fee (1%)</span><span>{fee.toFixed(2)} USDT</span>
          </div>
          <button disabled={loading || !profile?.withdrawal_address} className="btn-glow btn-glow-primary w-full">{loading ? "Processing…" : "Request withdrawal"}</button>
        </form>
      </div>
    </AuthShell>
  );
}
