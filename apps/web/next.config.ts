import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // lets a production build run alongside `next dev` without sharing .next
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
