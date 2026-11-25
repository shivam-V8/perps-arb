/**
 * DEMO DATA for local development only: 8 fictional, opted-in candidates across
 * different fields, so recruiter search has someone to find. Never run in production.
 *   pnpm db:seed
 */
import { getDb, schema as s } from "../src/db";
import type { Experience } from "../src/lib/types";

if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed demo data in production");
// Only ever seed a local database: never put fake candidates into a hosted one (e.g. Neon).
const host = (() => {
  try {
    return new URL(process.env.DATABASE_URL ?? "").hostname;
  } catch {
    return "";
  }
})();
if (!["localhost", "127.0.0.1", "::1"].includes(host)) throw new Error(`Refusing to seed demo data into non-local database (${host || "unknown host"})`);

const job = (title: string, company: string, start: string, end = "Present"): Experience => ({ title, company, start, end, highlights: [] });

const DEMO = [
  { n: 1, name: "Demo Maria Santos", headline: "ICU Registered Nurse", fields: ["healthcare"], seniority: "senior", remote: "onsite", location: "Austin, USA",
    summary: "Critical care nurse with six years in a 24-bed ICU, including two as charge nurse. CCRN certified.",
    skills: ["Critical care", "CCRN", "ACLS", "Ventilator management", "Epic EHR"],
    exp: [job("Charge Nurse, ICU", "Lakeside Medical Center", "2022"), job("ICU Registered Nurse", "Northgate Health", "2018", "2022")] },
  { n: 2, name: "Demo Daniel Okoro", headline: "Data Analyst", fields: ["data"], seniority: "mid", remote: "hybrid", location: "London, UK",
    summary: "Analyst with four years in retail and fintech; built churn and retention dashboards used by product teams.",
    skills: ["SQL", "Python", "Looker", "A/B testing", "dbt"], exp: [job("Data Analyst", "Brightcart", "2021")] },
  { n: 3, name: "Demo Hannah Kim", headline: "B2B Sales Lead", fields: ["sales"], seniority: "lead", remote: "remote", location: "Toronto, Canada",
    summary: "SaaS seller with seven years of quota-carrying experience; built an SDR team from zero to six.",
    skills: ["Enterprise sales", "Salesforce", "MEDDICC", "Team leadership", "Negotiation"], exp: [job("Sales Lead", "Corvid Systems", "2020")] },
  { n: 4, name: "Demo Ravi Menon", headline: "Frontend Engineer", fields: ["engineering"], seniority: "senior", remote: "remote", location: "Bengaluru, India",
    summary: "React and TypeScript engineer focused on design systems and accessibility.",
    skills: ["React", "TypeScript", "Next.js", "Accessibility", "Design systems"], exp: [job("Frontend Engineer", "Parcelwise", "2019")] },
  { n: 5, name: "Demo Grace Adeyemi", headline: "Secondary Maths Teacher", fields: ["education"], seniority: "senior", remote: "onsite", location: "Manchester, UK",
    summary: "Maths teacher for ages 11-18 with exam-board marking experience and a head-of-year role.",
    skills: ["Curriculum design", "GCSE", "A-level", "Classroom management"], exp: [job("Maths Teacher & Head of Year", "Riverside Academy", "2017")] },
  { n: 6, name: "Demo Lea Moreau", headline: "Product Designer", fields: ["design", "product"], seniority: "mid", remote: "hybrid", location: "Paris, France",
    summary: "Product designer who takes features from research to shipped UI in small product teams.",
    skills: ["Figma", "User research", "Prototyping", "Design systems"], exp: [job("Product Designer", "Finlo", "2021")] },
  { n: 7, name: "Demo Tomas Novak", headline: "Financial Accountant", fields: ["finance"], seniority: "mid", remote: "hybrid", location: "Prague, Czechia",
    summary: "Qualified accountant handling month-end close, consolidation and audit prep for a mid-size group.",
    skills: ["ACCA", "IFRS", "Month-end close", "NetSuite", "Excel"], exp: [job("Financial Accountant", "Ledgerly", "2020")] },
  { n: 8, name: "Demo Sofia Marin", headline: "Operations Manager", fields: ["operations"], seniority: "senior", remote: "onsite", location: "Mexico City, Mexico",
    summary: "Ops manager for a 3-site logistics business; cut fulfilment errors by a third.",
    skills: ["Process improvement", "Lean", "Inventory", "Team management"], exp: [job("Operations Manager", "Plantly", "2019")] },
];

async function main() {
  const db = getDb();
  for (const d of DEMO) {
    const id = `00000000-0000-4000-8000-${String(d.n).padStart(12, "0")}`;
    await db.insert(s.users).values({ id, role: "candidate", fullName: d.name }).onConflictDoNothing();
    await db
      .insert(s.candidates)
      .values({
        userId: id,
        fullName: d.name,
        email: `demo${d.n}@example.com`,
        headline: d.headline,
        summary: d.summary,
        fields: d.fields,
        skills: d.skills,
        experience: d.exp,
        location: d.location,
        remotePref: d.remote,
        seniority: d.seniority,
        visibleToRecruiters: true,
      })
      .onConflictDoNothing();
  }
  console.log(`Seeded ${DEMO.length} demo candidates.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
