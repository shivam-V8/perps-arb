"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Heart, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Decision } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SwipeCard, type ExitDir } from "./swipe-card";

/**
 * Generic swipe stack. The parent owns the queue and removes an item when
 * `onDecide` runs; the deck handles gestures, buttons, keys and animation.
 */
export function SwipeDeck<T extends { id: string }>({
  items,
  render,
  onDecide,
  likeLabel,
  passLabel,
  empty,
}: {
  items: T[];
  render: (item: T) => React.ReactNode;
  onDecide: (item: T, d: Decision) => void;
  likeLabel: string;
  passLabel: string;
  empty: React.ReactNode;
}) {
  const [exitDir, setExitDir] = useState<ExitDir>("none");
  const top = items[0];

  const act = useCallback(
    (d: Decision) => {
      if (!top) return;
      setExitDir(d);
      if (typeof navigator !== "undefined") navigator.vibrate?.(8);
      onDecide(top, d);
    },
    [top, onDecide],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, [contenteditable], [role=dialog]")) return;
      if (e.key === "ArrowRight") act("like");
      else if (e.key === "ArrowLeft") act("pass");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [act]);

  return (
    <div className="flex flex-col">
      <div className="relative mx-auto h-[clamp(430px,calc(100dvh-300px),620px)] w-full max-w-[420px]">
        <AnimatePresence custom={exitDir} initial={false}>
          {items
            .slice(0, 3)
            .map((item, depth) => (
              <SwipeCard key={item.id} depth={depth} onDecide={act} likeLabel={likeLabel} passLabel={passLabel}>
                {render(item)}
              </SwipeCard>
            ))
            .reverse()}
        </AnimatePresence>
        {!top && <div className="absolute inset-0">{empty}</div>}
      </div>

      <div className="mt-5 flex items-center justify-center gap-5">
        <Control label={`${passLabel} (←)`} onClick={() => act("pass")} disabled={!top} tone="rose">
          <X className="size-6" strokeWidth={2.5} />
        </Control>
        <Control label={`${likeLabel} (→)`} onClick={() => act("like")} disabled={!top} tone="brand">
          <Heart className="size-6" strokeWidth={2.5} />
        </Control>
      </div>
      <p className="mt-3 hidden text-center text-xs text-muted-foreground md:block">Drag the card, or use ← →</p>
    </div>
  );
}

const TONE = {
  brand: "text-brand hover:border-brand/60 hover:bg-brand/10",
  rose: "text-rose hover:border-rose/60 hover:bg-rose/10",
};

function Control({
  label,
  onClick,
  disabled,
  tone,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone: keyof typeof TONE;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          whileTap={{ scale: 0.88 }}
          className={cn(
            "grid size-16 place-items-center rounded-full border border-black/[0.06] bg-white shadow-soft transition-colors disabled:pointer-events-none disabled:opacity-35",
            TONE[tone],
          )}
        >
          {children}
        </motion.button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
