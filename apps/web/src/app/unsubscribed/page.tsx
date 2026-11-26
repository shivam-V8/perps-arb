import Link from "next/link";
import { PublicPage } from "@/components/site/site-chrome";

export const metadata = { title: "Unsubscribed" };

export default async function UnsubscribedPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <PublicPage width="max-w-md">
      <h1 className="poster text-5xl sm:text-6xl">{error ? "That link didn't work" : "You're unsubscribed"}</h1>
      <p className="mt-2 text-muted-foreground">
        {error ? "Turn the weekly email off from your profile instead." : "You won't get the weekly job email any more. Your Pro plan isn't affected."}{" "}
        You can switch it back on any time in{" "}
        <Link href="/profile" className="font-medium text-foreground underline underline-offset-2">
          your profile
        </Link>
        .
      </p>
    </PublicPage>
  );
}
