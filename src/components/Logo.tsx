import logoImg from "@/assets/peptidoc-logo.png";

export default function Logo({ size = "md", iconOnly = false }: { size?: "sm" | "md" | "lg"; iconOnly?: boolean }) {
  const dims = { sm: 28, md: 36, lg: 48 }[size];
  const textSize = { sm: "text-sm", md: "text-lg", lg: "text-2xl" }[size];

  return (
    <div className="flex items-center gap-2">
      <img src={logoImg} alt="PeptiDOC" width={dims} height={dims} className="shrink-0" />
      {!iconOnly && (
        <div className="flex flex-col leading-none">
          <span className={`${textSize} font-bold tracking-tight`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <span className="text-primary">Pepti</span>
            <span className="text-foreground">DOC</span>
          </span>
        </div>
      )}
    </div>
  );
}
