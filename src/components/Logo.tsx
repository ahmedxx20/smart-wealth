export function Logo({ size = 32 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="32" y2="32">
            <stop offset="0%" stopColor="oklch(0.85 0.21 150)" />
            <stop offset="100%" stopColor="oklch(0.7 0.16 200)" />
          </linearGradient>
        </defs>
        <path d="M6 22 L12 8 L16 18 L20 12 L26 24" stroke="url(#lg)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <circle cx="26" cy="24" r="2.5" fill="url(#lg)" />
      </svg>
      <span className="font-bold tracking-tight text-grad">Smart Wealth</span>
    </div>
  );
}
