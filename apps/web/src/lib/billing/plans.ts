/** What we sell, as shown in the app (Stripe holds the actual prices). Safe to import in the browser. */
export const PLAN_COPY = {
  pro_yearly: { name: "Pro yearly", price: "$79", per: "/year", note: "$6.58 a month · save 40%" },
  pro_monthly: { name: "Pro monthly", price: "$10.99", per: "/month", note: "Cancel anytime" },
  pack: { name: "5 job unlocks", price: "$4.99", per: "one-off", note: "Unlock any 5 jobs, yours to keep" },
} as const;

export const PRO_FEATURES = [
  "Every match unlocked: company, link and why it fits",
  "Daily fresh searches (free: 2 a week)",
  "Weekly email with new jobs and a cover note for each",
  "All résumé fixes, tailored to the jobs you match",
  "Unlimited cover notes",
];

export const FREE_FEATURES = ["Top 3 matches of every search", "2 searches a week", "1 résumé fix"];
