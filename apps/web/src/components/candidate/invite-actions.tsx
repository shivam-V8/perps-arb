"use client";

import { Check, Loader2, X } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { respondInvite } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function InviteActions({ matchId }: { matchId: string }) {
  const [pending, start] = useTransition();
  const respond = (accept: boolean) =>
    start(async () => {
      try {
        await respondInvite(matchId, accept);
        if (!accept) toast("Invite declined");
      } catch (e) {
        // redirect() after accepting surfaces as a thrown navigation; only real errors reach the toast
        if (!(e instanceof Error && e.message.includes("NEXT_REDIRECT"))) toast.error("Couldn't respond. Try again.");
        else throw e;
      }
    });
  return (
    <div className="mt-4 flex gap-2">
      <Button size="sm" className="rounded-full" disabled={pending} onClick={() => respond(true)}>
        {pending ? <Loader2 className="animate-spin" /> : <Check />} Accept & chat
      </Button>
      <Button size="sm" variant="ghost" className="rounded-full text-muted-foreground" disabled={pending} onClick={() => respond(false)}>
        <X /> Decline
      </Button>
    </div>
  );
}
