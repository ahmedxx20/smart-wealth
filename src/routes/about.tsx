import { createFileRoute, Link } from "@tanstack/react-router";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import img1 from "@/assets/about-1.jpg";
import img2 from "@/assets/about-2.jpg";
import img3 from "@/assets/about-3.jpg";
import img4 from "@/assets/about-4.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [
    { title: "About — Smart Wealth" },
    { name: "description", content: "Smart Wealth: decentralized AI mining and automated investment." },
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
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 space-y-8">
        <h1 className="text-3xl font-bold text-grad text-center">About Smart Wealth</h1>

        <section className="glass-strong p-6 space-y-3">
          <h2 className="text-xl font-semibold">Who we are</h2>
          <p className="text-muted-foreground text-sm">Smart Wealth is a next-generation investment platform that combines decentralized artificial intelligence with autonomous mining strategies, designed to make passive income simple, transparent and secure for everyone.</p>
          <img src={img1} alt="Smart Wealth team and vision" className="rounded-2xl w-full"/>
        </section>

        <section className="glass-strong p-6 space-y-3">
          <h2 className="text-xl font-semibold">Our technology</h2>
          <p className="text-muted-foreground text-sm">Our AI mining bots analyze global markets in real time, allocating capital across the most profitable opportunities. Every transaction settles on TRON (TRC20 USDT) for low fees and instant confirmation.</p>
          <img src={img2} alt="AI mining technology" className="rounded-2xl w-full"/>
        </section>

        <section className="glass-strong p-6 space-y-3">
          <h2 className="text-xl font-semibold">Investment approach</h2>
          <p className="text-muted-foreground text-sm">Choose from five carefully calibrated robot plans. Each one runs for 24 hours, returning your principal plus profit automatically — no manual claiming, no hidden lockups.</p>
          <img src={img3} alt="Investment approach" className="rounded-2xl w-full"/>
        </section>

        <section className="glass-strong p-6 space-y-3">
          <h2 className="text-xl font-semibold">Security &amp; transparency</h2>
          <p className="text-muted-foreground text-sm">All balances, deposits and withdrawals are verifiable on-chain. Your account is protected by withdrawal PIN, encrypted storage and 24/7 monitoring.</p>
          <img src={img4} alt="Security and transparency" className="rounded-2xl w-full"/>
        </section>

        <section className="glass-strong p-6">
          <h2 className="text-xl font-semibold">Our commitment</h2>
          <p className="text-muted-foreground text-sm mt-2">We exist to democratize access to AI-driven wealth tools. From your first 30 USDT to scaling positions, Smart Wealth is built to grow with you.</p>
        </section>
      </main>
      <Footer/>
    </div>
  );
}
