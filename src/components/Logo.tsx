export default function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dims = { sm: 28, md: 36, lg: 48 }[size];
  const textSize = { sm: "text-sm", md: "text-lg", lg: "text-2xl" }[size];

  return (
    <div className="flex items-center gap-2">
      <svg
        width={dims}
        height={dims}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Shield body */}
        <path
          d="M24 4L6 12v12c0 11.1 7.7 21.5 18 24 10.3-2.5 18-12.9 18-24V12L24 4z"
          className="fill-primary/15 stroke-primary"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Caduceus staff */}
        <line x1="24" y1="14" x2="24" y2="36" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
        {/* DNA helix left */}
        <path
          d="M18 16c0 3 6 3 6 6s-6 3-6 6"
          className="stroke-accent"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
        {/* DNA helix right */}
        <path
          d="M30 16c0 3-6 3-6 6s6 3 6 6"
          className="stroke-accent"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
        {/* Cross bars */}
        <line x1="19" y1="19" x2="29" y2="19" className="stroke-primary/50" strokeWidth="1" />
        <line x1="19" y1="25" x2="29" y2="25" className="stroke-primary/50" strokeWidth="1" />
        {/* Wings */}
        <path d="M18 14l-4-2-2 1" className="stroke-primary" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M30 14l4-2 2 1" className="stroke-primary" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      <div className="flex flex-col leading-none">
        <span className={`${textSize} font-bold tracking-tight`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          <span className="text-primary">DOC</span>
          <span className="text-foreground">assist</span>
        </span>
      </div>
    </div>
  );
}
