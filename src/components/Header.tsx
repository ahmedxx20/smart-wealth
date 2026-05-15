import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { Headphones, Shield, ArrowLeft } from "lucide-react";
import { Logo } from "./Logo";
import { ThemeToggle } from "@/lib/theme";
import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";

declare global { interface Window { Tawk_API?: any; Tawk_LoadStart?: Date; } }

export function Header({ showBack = true }: { showBack?: boolean }) {
  const { profile } = useAuth();
  const router = useRouter();
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined" || document.getElementById("tawk-script")) return;
    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();
    const s = document.createElement("script");
    s.id = "tawk-script"; s.async = true;
    s.src = "https://embed.tawk.to/69eca1efb5e2bb1c2e1f8923/default";
    s.charset = "UTF-8"; s.setAttribute("crossorigin", "*");
    document.body.appendChild(s);
  }, []);

  const openChat = () => { try { window.Tawk_API?.maximize?.(); } catch {} };

  return (
    <header className="sticky top-0 z-40 glass !rounded-none !border-x-0 !border-t-0 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {showBack && router.state.location.pathname !== "/dashboard" && (
          <button onClick={() => navigate({ to: "/dashboard" })} className="btn-glow !p-2 !rounded-full" aria-label="Back">
            <ArrowLeft size={16} />
          </button>
        )}
        <Link to="/dashboard"><Logo /></Link>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button onClick={openChat} className="btn-glow !p-2 !rounded-full" aria-label="Customer service"><Headphones size={16} /></button>
        {profile?.is_admin && (
          <Link to="/admin" className="btn-glow !p-2 !rounded-full" aria-label="Admin"><Shield size={16} /></Link>
        )}
      </div>
    </header>
  );
}
