import { cn } from "@/lib/utils";

export function MatchRing({ score, size = 52, className }: { score: number; size?: number; className?: string }) {
  const stroke = 3.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const tone = score >= 85 ? "text-brand" : score >= 72 ? "text-sky" : "text-amber";
  return (
    <div className={cn("relative grid shrink-0 place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-black/8" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          className={cn("stroke-current", tone)}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center leading-none">
        <span className={cn("font-mono text-sm font-semibold tabular", tone)}>
          {score}
          <span className="text-[0.6rem] opacity-70">%</span>
        </span>
      </div>
      <span className="sr-only">{score}% match</span>
    </div>
  );
}
