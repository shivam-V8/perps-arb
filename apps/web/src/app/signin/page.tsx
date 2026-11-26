import { PublicPage } from "@/components/site/site-chrome";
import { SignInForm } from "./sign-in-form";

export const metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <PublicPage width="max-w-md">
      <h1 className="poster text-5xl sm:text-6xl">Sign in</h1>
      <p className="mt-2 text-muted-foreground">
        We&apos;ll email you a one-time link. No password. New here? Adding your email keeps your profile and matches on every device.
      </p>
      {error === "expired" && <p className="mt-4 rounded-2xl bg-rose/10 p-3 text-sm text-rose">That link has expired or was already used. Ask for a new one.</p>}
      <div className="mt-6">
        <SignInForm />
      </div>
    </PublicPage>
  );
}
