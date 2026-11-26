"use client";

import { useState } from "react";
import { AvatarMark, toneFor } from "@/components/profile/avatar-mark";
import { logoUrl } from "@/lib/company-logo";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { box: "size-9 rounded-lg p-1.5", px: 36 },
  md: { box: "size-12 rounded-xl p-2", px: 48 },
  lg: { box: "size-16 rounded-2xl p-2.5", px: 64 },
};

/**
 * A company's logo on a white tile; falls back to its initials when there's no
 * domain, the image fails, or the service only has a tiny generic icon.
 */
export function CompanyLogo({
  name,
  domain,
  size = "md",
  className,
}: {
  name: string;
  domain: string | null | undefined;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!domain || failed) return <AvatarMark name={name} tone={toneFor(name)} size={size} square className={className} />;
  const s = SIZES[size];
  return (
    <div className={cn("grid shrink-0 place-items-center bg-white ring-1 ring-black/[0.08] ring-inset", s.box, className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- external logo, tiny, no optimisation needed */}
      <img
        src={logoUrl(domain)}
        alt={`${name} logo`}
        width={s.px}
        height={s.px}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="size-full object-contain"
        onError={() => setFailed(true)}
        onLoad={(e) => {
          // Google returns a 16px globe when it has nothing for the domain
          if (e.currentTarget.naturalWidth < 32) setFailed(true);
        }}
      />
    </div>
  );
}
