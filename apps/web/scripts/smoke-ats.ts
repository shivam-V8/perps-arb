/** Live smoke test of the ATS feed readers against real public boards. `pnpm tsx scripts/smoke-ats.ts` */
import { fetchBoards } from "../src/lib/jobs/ats";
import { prefilter } from "../src/lib/jobs/relevance";

const boards = [
  { ats: "greenhouse", token: "stripe", company: "Stripe" },
  { ats: "lever", token: "palantir", company: "Palantir" },
  { ats: "ashby", token: "openai", company: "OpenAI" },
  { ats: "workable", token: "huggingface", company: "Hugging Face" },
  { ats: "smartrecruiters", token: "BoschGroup", company: "Bosch" },
  { ats: "greenhouse", token: "this-board-does-not-exist-xyz", company: "Nope" },
] as const;

async function main() {
  const t = Date.now();
  const res = await fetchBoards(boards.map((b) => ({ ...b })));
  for (const r of res) {
    const p = r.postings?.[0];
    console.log(
      `${r.board.ats.padEnd(15)} ${r.board.token.padEnd(30)} ${r.postings ? `${String(r.postings.length).padStart(4)} jobs` : `ERROR ${r.error}`}`,
      p ? `| ${p.title.slice(0, 40)} | ${p.location.slice(0, 25)} | ${p.remote} | ${p.posted} | ${p.url.slice(0, 60)}` : "",
    );
  }
  console.log(`fetched in ${Date.now() - t}ms`);
  const all = res.flatMap((r) => r.postings ?? []);
  const top = prefilter(all, {
    full_name: "", email: "", headline: "Data Analyst", summary: "", fields: ["data"], skills: ["SQL", "Python", "Looker"],
    experience: [], education: [], location: "London, UK", remote_pref: "hybrid", seniority: "mid", salary_min: null, salary_currency: "USD", visible_to_recruiters: false,
  }, 5);
  console.log(`\nprefilter for a London data analyst, top 5 of ${all.length}:`);
  for (const p of top) console.log(`  - ${p.title} — ${p.company} (${p.location})`);
}
main();
