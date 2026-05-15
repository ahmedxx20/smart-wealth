import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({
  validateSearch: (s: Record<string, unknown>) => ({ ref: typeof s.ref === "string" ? s.ref : "" }),
  component: Register,
});

function Register() {
  const { ref } = Route.useSearch();
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [pin, setPin] = useState("");
  const [referral, setReferral] = useState(ref || "");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [seconds, setSeconds] = useState(240);

  useEffect(() => { if (ref) setReferral(ref); }, [ref]);
  useEffect(() => {
    if (!otpSent) return;
    const i = setInterval(() => setSeconds(s => s > 0 ? s - 1 : 0), 1000);
    return () => clearInterval(i);
  }, [otpSent]);

  const sendCode = () => {
    if (!email) return toast.error("Enter your email first");
    setOtpSent(true); setSeconds(240);
    toast.success("Verification code sent to your email (use any 6-digit code in this demo)");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== pw2) return toast.error("Passwords do not match");
    if (pw.length < 6) return toast.error("Password must be at least 6 characters");
    if (pin.length < 4) return toast.error("Withdrawal pin must be at least 4 digits");
    if (otpSent && code.length < 4) return toast.error("Enter the verification code");
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email, password: pw,
      options: { data: { username, referral_code: referral.toUpperCase() } },
    });
    if (error) { setLoading(false); return toast.error(error.message); }
    if (data.session) {
      // set withdrawal pin
      await supabase.rpc("set_withdrawal_pin", { p_current: null as unknown as string, p_new: pin });
      toast.success("Account created");
      nav({ to: "/dashboard" });
    } else {
      toast.success("Check your email to confirm.");
      nav({ to: "/login" });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="glass-strong w-full max-w-md p-6 space-y-4">
        <div className="flex justify-center"><Logo size={42} /></div>
        <h1 className="text-center text-xl font-semibold">Create your account</h1>
        <input className="input-glass" placeholder="Name" value={username} onChange={e => setUsername(e.target.value)} required />
        <input className="input-glass" type="email" placeholder="Gmail address" value={email} onChange={e => setEmail(e.target.value)} required />
        <div className="flex gap-2">
          <input className="input-glass" placeholder="Verification code" value={code} onChange={e => setCode(e.target.value)} maxLength={6} />
          <button type="button" className="btn-glow whitespace-nowrap" onClick={sendCode}>
            {otpSent ? `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,"0")}` : "Send code"}
          </button>
        </div>
        <input className="input-glass" type="password" placeholder="Password" value={pw} onChange={e => setPw(e.target.value)} required />
        <input className="input-glass" type="password" placeholder="Confirm password" value={pw2} onChange={e => setPw2(e.target.value)} required />
        <input className="input-glass" type="password" placeholder="Withdrawal pin" value={pin} onChange={e => setPin(e.target.value)} required />
        <input className="input-glass" placeholder="Referral code (optional)" value={referral} onChange={e => setReferral(e.target.value)} />
        <button disabled={loading} className="btn-glow btn-glow-primary w-full">{loading ? "Creating…" : "Register"}</button>
        <p className="text-center text-sm text-muted-foreground">Already have an account? <Link to="/login" className="text-primary">Sign in</Link></p>
      </form>
    </div>
  );
}
