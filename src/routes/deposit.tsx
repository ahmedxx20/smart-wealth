import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "@/components/AuthShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/deposit")({ component: Page });

function Page() {
  const { session } = useAuth();
  const [address, setAddress] = useState("");
  const [seconds, setSeconds] = useState(300);
  const [amount, setAmount] = useState("");
  const [txid, setTxid] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchAddr = async () => {
    const { data } = await supabase.rpc("get_current_deposit_address");
    if (data && data[0]) { setAddress(data[0].address); setSeconds(data[0].rotates_in_seconds); }
  };

  useEffect(() => { fetchAddr(); }, []);
  useEffect(() => {
    const i = setInterval(() => setSeconds(s => { if (s <= 1) { fetchAddr(); return 300; } return s - 1; }), 1000);
    return () => clearInterval(i);
  }, []);

  const copy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
    toast.success("Address copied");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Invalid amount");
    if (!txid.trim()) return toast.error("Enter transaction ID");
    setSubmitting(true);
    const { error } = await supabase.from("deposits").insert({
      user_id: session!.user.id, amount: amt, address, txid: txid.trim(),
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Deposit submitted. It will reflect after admin approval.");
    setAmount(""); setTxid("");
  };

  const mm = String(Math.floor(seconds/60)).padStart(2,"0");
  const ss = String(seconds%60).padStart(2,"0");

  return (
    <AuthShell>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass-strong p-5 text-center">
          <h2 className="font-semibold">USDT TRC20 deposit</h2>
          <p className="text-xs text-muted-foreground mt-1">Address rotates in <span className="text-primary font-mono">{mm}:{ss}</span></p>
          {address && (
            <div className="mt-4 inline-block p-3 bg-white rounded-xl">
              <QRCodeSVG value={address} size={180} />
            </div>
          )}
          <div className="mt-3 break-all font-mono text-xs glass p-3">{address || "Loading…"}</div>
          <button onClick={copy} className="btn-glow mt-3">{copied ? <Check size={16}/> : <Copy size={16}/>} Copy address</button>
        </div>

        <form onSubmit={submit} className="glass-strong p-5 space-y-3">
          <h2 className="font-semibold">Confirm your deposit</h2>
          <label className="text-xs text-muted-foreground">Amount (USDT)</label>
          <input className="input-glass" type="number" step="0.01" min="1" value={amount} onChange={e => setAmount(e.target.value)} required />
          <label className="text-xs text-muted-foreground">Transaction hash (TxID)</label>
          <input className="input-glass" value={txid} onChange={e => setTxid(e.target.value)} required />
          <button disabled={submitting} className="btn-glow btn-glow-primary w-full">{submitting ? "Submitting…" : "Submit for approval"}</button>
          <p className="text-xs text-muted-foreground">First deposit gets a 20% bonus automatically. Only TRC20 USDT to the address above.</p>
        </form>
      </div>
    </AuthShell>
  );
}
