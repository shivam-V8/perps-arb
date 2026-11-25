"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowUp, FileText, Loader2, RefreshCw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AvatarMark, toneFor } from "@/components/profile/avatar-mark";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { clock } from "@/lib/time";
import type { Message } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Chat for an accepted match (polls for new messages), with AI-suggested messages. */
export function ChatRoom({
  matchId,
  me,
  title,
  subtitle,
  roleTitle,
  resumeUrl,
  initial,
}: {
  matchId: string;
  me: string;
  title: string;
  subtitle: string;
  roleTitle: string;
  resumeUrl: string | null;
  initial: Message[];
}) {
  const [msgs, setMsgs] = useState<Message[]>(initial);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [showSuggest, setShowSuggest] = useState(initial.length === 0);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // new messages from the other side: poll while the tab is visible
  const lastAt = msgs.length ? msgs[msgs.length - 1].created_at : undefined;
  useEffect(() => {
    let stopped = false;
    async function poll() {
      if (document.hidden) return;
      const q = lastAt ? `?after=${encodeURIComponent(lastAt)}` : "";
      const res = await fetch(`/api/matches/${matchId}/messages${q}`, { cache: "no-store" }).catch(() => null);
      if (!res?.ok || stopped) return;
      const { messages } = (await res.json()) as { messages: Message[] };
      if (messages.length) setMsgs((list) => [...list, ...messages.filter((m) => !list.some((x) => x.id === m.id))]);
    }
    const t = setInterval(poll, 3000);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, [matchId, lastAt]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs.length]);

  const suggest = useCallback(async () => {
    setSuggesting(true);
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ matchId }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    setSuggesting(false);
    setSuggestions(json.ai ? json.messages : []);
  }, [matchId]);

  useEffect(() => {
    if (showSuggest && suggestions === null && !suggesting) suggest();
  }, [showSuggest, suggestions, suggesting, suggest]);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    const res = await fetch(`/api/matches/${matchId}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body }),
    }).catch(() => null);
    setSending(false);
    if (!res?.ok) return toast.error("Message not sent.");
    const { message } = (await res.json()) as { message: Message };
    setMsgs((list) => (list.some((x) => x.id === message.id) ? list : [...list, message]));
    setDraft("");
    setShowSuggest(false);
    setSuggestions(null);
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-3.5rem)] w-full max-w-2xl flex-col md:h-[calc(100dvh-3.5rem-2.5rem)]">
      <div className="flex items-center gap-3 border-b border-black/[0.06] py-3">
        <Button asChild variant="ghost" size="icon-sm" className="-ml-2 text-muted-foreground">
          <Link href="/matches" aria-label="Back">
            <ArrowLeft />
          </Link>
        </Button>
        <AvatarMark name={title} tone={toneFor(title)} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {resumeUrl && (
          <Button asChild variant="outline" size="sm" className="rounded-full border-black/10 bg-white">
            <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
              <FileText /> Résumé
            </a>
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-5">
        <p className="mb-5 text-center text-xs text-muted-foreground">Matched on “{roleTitle}”</p>
        <ul className="space-y-1">
          {msgs.map((m, i) => {
            const mine = m.sender_id === me;
            const grouped = msgs[i - 1]?.sender_id === m.sender_id;
            return (
              <motion.li
                key={m.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex", mine ? "justify-end" : "justify-start", grouped ? "mt-0.5" : "mt-3")}
              >
                <div className={cn("max-w-[82%] sm:max-w-[70%]", mine && "text-right")}>
                  <div
                    className={cn(
                      "inline-block rounded-2xl px-3.5 py-2 text-left text-sm leading-relaxed whitespace-pre-wrap",
                      mine ? "rounded-br-md bg-foreground text-background" : "rounded-bl-md border border-black/[0.06] bg-white",
                    )}
                  >
                    {m.body}
                  </div>
                  <p className="mt-1 px-1 text-[0.65rem] text-muted-foreground">{clock(new Date(m.created_at).getTime())}</p>
                </div>
              </motion.li>
            );
          })}
        </ul>
        <div ref={endRef} />
      </div>

      <AnimatePresence>
        {showSuggest && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mb-2 rounded-2xl border border-brand/20 bg-brand-wash/60 p-3"
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="flex items-center gap-1.5 text-xs font-medium text-brand">
                <Sparkles className="size-3.5" /> Suggested {msgs.length ? "replies" : "openers"}
              </p>
              {!suggesting && suggestions && suggestions.length > 0 && (
                <button type="button" onClick={suggest} aria-label="Regenerate" className="text-muted-foreground hover:text-foreground">
                  <RefreshCw className="size-3.5" />
                </button>
              )}
            </div>
            {suggesting ? (
              <p className="flex items-center gap-1.5 px-1 py-3 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> Drafting…
              </p>
            ) : suggestions && suggestions.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setDraft(s);
                      inputRef.current?.focus();
                    }}
                    className="rounded-xl border border-black/[0.06] bg-white px-3 py-2 text-left text-sm text-foreground/85 transition-colors hover:border-brand/40"
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-1 py-2 text-xs text-muted-foreground">Suggestions aren&apos;t available right now.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <form
        className="flex items-end gap-2 border-t border-black/[0.06] pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("shrink-0 text-muted-foreground", showSuggest && "text-brand")}
          onClick={() => {
            setShowSuggest((v) => !v);
            setSuggestions(null);
          }}
          aria-label="Suggest a message"
        >
          <Sparkles />
        </Button>
        <Textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, 4000))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder="Write a message…"
          className="max-h-36 min-h-10 resize-none rounded-xl bg-white py-2.5"
        />
        <Button type="submit" size="icon" className="size-10 shrink-0 rounded-xl" disabled={!draft.trim() || sending} aria-label="Send">
          {sending ? <Loader2 className="animate-spin" /> : <ArrowUp />}
        </Button>
      </form>
    </div>
  );
}
