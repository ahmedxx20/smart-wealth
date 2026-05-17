import { createFileRoute, Link } from "@tanstack/react-router";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [
    { title: "Terms & Privacy — Smart Wealth" },
    { name: "description", content: "Terms of service and privacy policy for Smart Wealth." },
  ]}),
  component: Page,
});

function Page() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-4 py-4 flex justify-between items-center max-w-5xl w-full mx-auto">
        <Link to="/"><Logo/></Link>
        <Link to="/login" className="btn-glow">Sign in</Link>
      </header>
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 space-y-6">
        <h1 className="text-3xl font-bold text-grad text-center">Terms &amp; Privacy</h1>

        <section className="glass-strong p-6 space-y-2 text-sm text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">Terms of service</h2>
          <p>By using Smart Wealth, you agree to use the platform only for lawful purposes. All investments carry risk; past performance does not guarantee future returns. Minimum withdrawal 20 USDT, with a 1% network/processing fee.</p>
          <p>Robot investments lock funds for 24 hours and automatically return principal plus profit on completion. Referral commissions (10% / 4% / 1%) are credited on a referred user's first successful deposit.</p>
        </section>

        <section className="glass-strong p-6 space-y-2 text-sm text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">Privacy policy</h2>
          <p>We collect only what is required to operate your account: name, email, withdrawal address and transaction history. Data is encrypted at rest and never sold to third parties.</p>
          <p>You may request account deletion at any time by contacting customer support from inside the app.</p>
        </section>
      </main>
      <Footer/>
    </div>
  );
}
