"use client";

import { motion, useMotionValue, useTransform, type PanInfo, type Variants } from "framer-motion";
import type { Decision } from "@/lib/types";
import { cn } from "@/lib/utils";

const SWIPE_X = 110;
const FLICK_V = 650;
const EASE = [0.32, 0.72, 0, 1] as const;

export type ExitDir = Decision | "none";

/** Exit animation per direction; the deck passes the direction through AnimatePresence `custom`. */
export const cardVariants: Variants = {
  exit: (dir: ExitDir) => {
    if (dir === "like") return { x: 520, y: 40, opacity: 0, transition: { duration: 0.38, ease: EASE } };
    if (dir === "pass") return { x: -520, y: 40, opacity: 0, transition: { duration: 0.38, ease: EASE } };
    return { opacity: 0, scale: 0.96, transition: { duration: 0.2 } };
  },
};

/** A draggable card in the stack. Content comes from `children`. */
export function SwipeCard({
  depth,
  onDecide,
  likeLabel,
  passLabel,
  children,
}: {
  /** 0 = top of the stack */
  depth: number;
  onDecide: (d: Decision) => void;
  likeLabel: string;
  passLabel: string;
  children: React.ReactNode;
}) {
  const isTop = depth === 0;
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-320, 0, 320], [-14, 0, 14]);
  const likeOpacity = useTransform(x, [24, SWIPE_X], [0, 1]);
  const passOpacity = useTransform(x, [-SWIPE_X, -24], [1, 0]);
  const glow = useTransform(
    x,
    [-SWIPE_X, 0, SWIPE_X],
    ["0 0 0 2px rgb(225 29 72 / 0.55)", "0 0 0 0px rgb(0 0 0 / 0)", "0 0 0 2px rgb(5 150 105 / 0.6)"],
  );

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x > SWIPE_X || info.velocity.x > FLICK_V) onDecide("like");
    else if (info.offset.x < -SWIPE_X || info.velocity.x < -FLICK_V) onDecide("pass");
  }

  return (
    <motion.div
      className={cn("absolute inset-0 touch-none select-none", isTop ? "cursor-grab active:cursor-grabbing" : "pointer-events-none")}
      style={{ x, rotate, zIndex: 10 - depth, boxShadow: isTop ? glow : undefined, borderRadius: 28 }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      dragTransition={{ bounceStiffness: 320, bounceDamping: 24 }}
      onDragEnd={onDragEnd}
      initial={{ scale: 0.92, y: 26, opacity: 0 }}
      animate={{ scale: 1 - depth * 0.045, y: depth * 16, opacity: depth > 2 ? 0 : 1 - depth * 0.15 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      variants={cardVariants}
      exit="exit"
      aria-hidden={!isTop}
    >
      {children}
      {isTop && (
        <>
          <Stamp style={{ opacity: likeOpacity }} className="top-7 left-6 -rotate-12 border-brand text-brand">
            {likeLabel}
          </Stamp>
          <Stamp style={{ opacity: passOpacity }} className="top-7 right-6 rotate-12 border-rose text-rose">
            {passLabel}
          </Stamp>
        </>
      )}
    </motion.div>
  );
}

function Stamp({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style: React.ComponentProps<typeof motion.div>["style"];
}) {
  return (
    <motion.div
      style={style}
      className={cn(
        "pointer-events-none absolute rounded-lg border-2 bg-white/90 px-3 py-1 text-sm font-bold tracking-[0.18em] uppercase shadow-soft",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}
