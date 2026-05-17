import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "@/components/AuthShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/settings")({ component: Page });

function Page() {
  const { profile, refresh, signOut } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState(profile?.username || "");
  const [addr, setAddr] = useState(profile?.withdrawal_address || "");
  const [newPw, setNewPw] = useState("");
  const [curPin, setCurPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [showLogout, setShowLogout] = useState(false);

  const saveProfile = async () => {
    const { error } = await supabase.from("profiles").update({ username: name, withdrawal_address: addr }).eq("id", profile!.id);
    if (error) return toast.error(error.message);
    toast.success("Saved"); refresh();
  };
  const changePw = async () => {
    if (newPw.length < 6) return toast.error("Min 6 characters");
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) return toast.error(error.message);
    toast.success("Password updated"); setNewPw("");
  };
  const changePin = async () => {
    if (newPin.length < 4) return toast.error("Min 4 digits");
    const { error } = await supabase.rpc("set_withdrawal_pin", { p_current: curPin || (null as unknown as string), p_new: newPin });
    if (error) return toast.error(error.message);
    toast.success("PIN updated"); setCurPin(""); setNewPin("");
  };
  const logout = async () => { await signOut(); nav({ to: "/login" }); };

  return (
    <AuthShell>
      <h1 className="text-xl font-semibold mb-4">Settings</h1>

      <div className="space-y-4">
        <div className="glass-strong p-5 space-y-3">
          <h2 className="font-semibold">Profile</h2>
          <input className="input-glass" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
          <input className="input-glass" placeholder="USDT TRC20 withdrawal address" value={addr} onChange={e => setAddr(e.target.value)} />
          <button onClick={saveProfile} className="btn-glow btn-glow-primary w-full">Save</button>
        </div>

        <div className="glass-strong p-5 space-y-3">
          <h2 className="font-semibold">Change password</h2>
          <input className="input-glass" type="password" placeholder="New password" value={newPw} onChange={e => setNewPw(e.target.value)} />
          <button onClick={changePw} className="btn-glow w-full">Update password</button>
        </div>

        <div className="glass-strong p-5 space-y-3">
          <h2 className="font-semibold">Withdrawal PIN</h2>
          <input className="input-glass" type="password" placeholder="Current PIN (if set)" value={curPin} onChange={e => setCurPin(e.target.value)} />
          <input className="input-glass" type="password" placeholder="New PIN" value={newPin} onChange={e => setNewPin(e.target.value)} />
          <button onClick={changePin} className="btn-glow w-full">Update PIN</button>
        </div>

        <button onClick={() => setShowLogout(true)} className="btn-glow w-full"><LogOut size={16}/> Logout</button>
      </div>

      {showLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-strong p-6 max-w-sm w-full text-center">
            <h3 className="font-semibold">Sign out?</h3>
            <p className="text-sm text-muted-foreground mt-1">You can sign back in anytime.</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowLogout(false)} className="btn-glow flex-1">Cancel</button>
              <button onClick={logout} className="btn-glow btn-glow-primary flex-1">Sign out</button>
            </div>
          </div>
        </div>
      )}
    </AuthShell>
  );
}
