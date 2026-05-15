import { Link } from "@tanstack/react-router";
export function Footer() {
  return (
    <footer className="mt-16 px-4 py-8 text-center">
      <div className="text-2xl font-bold text-grad">Smart Wealth</div>
      <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto">
        Smart mining and a safe and automated investment using the most powerful decentralized artificial intelligence tools.
      </p>
      <div className="mt-3 text-sm flex justify-center gap-3">
        <Link to="/about" className="hover:text-primary">About us</Link>
        <span className="text-muted-foreground">|</span>
        <Link to="/terms" className="hover:text-primary">Terms &amp; Privacy</Link>
      </div>
      <div className="mt-3 text-xs text-muted-foreground">© 2026 Smart Wealth. All rights reserved.</div>
    </footer>
  );
}
