import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist_Mono, Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display-face" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "ChainMatch — Upload your résumé, swipe on jobs that fit",
    template: "%s · ChainMatch",
  },
  description:
    "Upload a résumé or LinkedIn export and get live job postings ranked for you. Recruiters find candidates who fit. Any field.",
};

export const viewport: Viewport = {
  themeColor: "#f6f7f9",
  width: "device-width",
  initialScale: 1,
};

/**
 * Dev only: some browser extensions (e.g. ones that add `bis_skin_checked`) write
 * attributes into the page before React hydrates, which floods the dev overlay with
 * hydration warnings that aren't app bugs. Strip those attributes as they appear.
 */
const STRIP_EXTENSION_ATTRS = `(() => {
  const bad = (n) => n.startsWith("bis_") || (n.startsWith("__processed_") && n.endsWith("__"));
  const clean = (el) => { for (const a of Array.from(el.attributes || [])) if (bad(a.name)) el.removeAttribute(a.name); };
  new MutationObserver((ms) => { for (const m of ms) if (m.type === "attributes" && bad(m.attributeName || "")) clean(m.target); })
    .observe(document.documentElement, { attributes: true, subtree: true });
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable} ${geistMono.variable}`}>
      {process.env.NODE_ENV === "development" && (
        <head>
          <script dangerouslySetInnerHTML={{ __html: STRIP_EXTENSION_ATTRS }} />
        </head>
      )}
      <body className="min-h-dvh font-sans">
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
