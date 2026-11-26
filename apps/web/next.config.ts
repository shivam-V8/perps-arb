import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // let the Cloudflare build resolve postgres.js's Workers entry instead of webpack bundling its Node one
  serverExternalPackages: ["postgres"],
  // lets a production build run alongside `next dev` without sharing .next
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;

// Makes Cloudflare bindings (getCloudflareContext) available during `next dev` only;
// production runs as a plain Node server (AWS) and must not start the local emulator.
if (process.env.NODE_ENV === "development") initOpenNextCloudflareForDev();
