import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    nav({ to: "/dashboard" });
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="glass-strong w-full max-w-md p-6 space-y-4">
        <div className="flex justify-center"><Logo size={42} /></div>
        <h1 className="text-center text-xl font-semibold">Welcome back</h1>
        <input className="input-glass" type="email" placeholder="Gmail address" value={email} onChange={e => setEmail(e.target.value)} required />
        <input className="input-glass" type="password" placeholder="Password" value={pw} onChange={e => setPw(e.target.value)} required />
        <button disabled={loading} className="btn-glow btn-glow-primary w-full">{loading ? "Signing in…" : "Sign in"}</button>
        <p className="text-center text-sm text-muted-foreground">No account? <Link to="/register" className="text-primary">Register</Link></p>
      </form>
    </div>
  );
}
