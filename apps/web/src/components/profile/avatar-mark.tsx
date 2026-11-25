import { cn, initials } from "@/lib/utils";

export type AvatarTone = "mint" | "sky" | "amber" | "rose" | "slate" | "lime";

const TONES: Record<AvatarTone, string> = {
  mint: "bg-[#dcf5ea] text-[#047857] ring-[#059669]/15",
  sky: "bg-[#dcefff] text-[#0369a1] ring-[#0284c7]/15",
  amber: "bg-[#fdf0d8] text-[#b45309] ring-[#d97706]/15",
  rose: "bg-[#fde4ea] text-[#be123c] ring-[#e11d48]/15",
  slate: "bg-[#e9edf2] text-[#334155] ring-black/10",
  lime: "bg-[#e8f5d6] text-[#4d7c0f] ring-[#65a30d]/15",
};

/** Soft top-down wash for card headers, keyed by the same tone. */
export const TONE_WASH: Record<AvatarTone, string> = {
  mint: "from-[#e3f7ee]",
  sky: "from-[#e1f0fd]",
  amber: "from-[#fdf3e2]",
  rose: "from-[#fde9ee]",
  slate: "from-[#eceff4]",
  lime: "from-[#ecf7de]",
};

const SIZES = {
  sm: "size-9 text-xs rounded-lg",
  md: "size-12 text-sm rounded-xl",
  lg: "size-16 text-lg rounded-2xl",
  xl: "size-24 text-2xl rounded-3xl",
};

export function AvatarMark({
  name,
  tone,
  size = "md",
  square = false,
  className,
}: {
  name: string;
  tone: AvatarTone;
  size?: keyof typeof SIZES;
  /** companies get a square mark, people a rounded one */
  square?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center font-semibold tracking-tight ring-1 ring-inset select-none",
        TONES[tone],
        SIZES[size],
        !square && "rounded-full",
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}

const TONE_ORDER: AvatarTone[] = ["mint", "sky", "amber", "rose", "slate", "lime"];

/** Stable tone for any string (company name, id). */
export function toneFor(key: string): AvatarTone {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return TONE_ORDER[h % TONE_ORDER.length];
}
