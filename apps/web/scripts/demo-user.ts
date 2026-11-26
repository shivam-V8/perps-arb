/**
 * LOCAL ONLY: a fictional demo job seeker for marketing screenshots and the demo
 * video (marketing/producthunt). Prints a signed session cookie for that user.
 *   pnpm tsx --env-file=.env.development.local scripts/demo-user.ts
 */
import { tokenFor } from "../src/lib/session-token";
import * as data from "../src/server/data";

const host = new URL(process.env.DATABASE_URL ?? "").hostname;
if (!["localhost", "127.0.0.1"].includes(host)) throw new Error("demo user is for the local database only");

export const DEMO_ID = "d3e0d3e0-0000-4000-8000-00000000d3e0";

async function main() {
  await data.setRole(DEMO_ID, "candidate");
  await data.upsertCandidate(DEMO_ID, {
    full_name: "Maya Fernandes",
    email: "maya@example.com",
    headline: "Senior Product Designer",
    summary:
      "Product designer with 8 years in fintech and health tech. Led a 60-component design system used by four product teams, and shipped onboarding redesigns that lifted activation by 18%. Comfortable from research to polished UI.",
    fields: ["design", "product"],
    skills: ["Figma", "Design systems", "User research", "Prototyping", "Accessibility", "Interaction design", "UX writing"],
    experience: [
      { title: "Senior Product Designer", company: "Fieldwork", start: "2022", end: "Present", highlights: ["Led the design system adopted by 4 product teams", "Redesigned onboarding, +18% activation"] },
      { title: "Product Designer", company: "Lumen Pay", start: "2019", end: "2022", highlights: ["Designed card management and disputes flows"] },
      { title: "UX Designer", company: "Northwind Health", start: "2017", end: "2019", highlights: ["Patient booking app used by 200k people"] },
    ],
    education: ["BA Communication Design, University of Lisbon"],
    location: "Lisbon, Portugal",
    remote_pref: "remote",
    seniority: "senior",
    salary_min: null,
    salary_currency: "EUR",
    visible_to_recruiters: false,
  });
  await data.upsertSubscription({
    userId: DEMO_ID,
    stripeCustomerId: "cus_demo_local",
    stripeSubscriptionId: "sub_demo_local",
    status: "active",
    priceId: "demo",
    currentPeriodEnd: new Date(Date.now() + 365 * 86400e3),
    cancelAtPeriodEnd: false,
  });
  await data.attachEmail(DEMO_ID, "maya@example.com", true);
  console.log(await tokenFor(DEMO_ID));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
