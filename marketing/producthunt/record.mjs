/**
 * Product Hunt demo video (~50 s, 1920x1080 MP4) recorded from the local app as
 * the fictional demo user. Each scene is recorded separately so slow steps
 * (AI drafting) are cut, then everything is joined with ffmpeg.
 *   node record.mjs        (dev server on http://localhost:3123, ffmpeg on PATH)
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "out");
const CLIPS = join(OUT, "clips");
rmSync(CLIPS, { recursive: true, force: true });
mkdirSync(CLIPS, { recursive: true });
const BASE = process.env.BASE_URL ?? "http://localhost:3123";
const COOKIE = readFileSync(join(OUT, ".demo-cookie"), "utf8").trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const RESUME = `Maya Fernandes — Senior Product Designer, Lisbon (open to remote)
Senior Product Designer, Fieldwork (2022–present): led a 60-component design system adopted by 4 product teams; redesigned onboarding, +18% activation.
Product Designer, Lumen Pay (2019–2022): card management and disputes flows for 300k customers.
UX Designer, Northwind Health (2017–2019): patient booking app used by 200k people.
Skills: Figma, design systems, user research, prototyping, accessibility, UX writing.
BA Communication Design, University of Lisbon.`;

const CSS = `
nextjs-portal, [data-nextjs-toast] { display: none !important; }
#cm-cap { position: fixed; left: 50%; bottom: 44px; transform: translateX(-50%) translateY(12px); z-index: 2147483647;
  background: #0b0d12; color: #fff; font: 600 22px/1.2 Inter, system-ui, sans-serif; padding: 14px 26px; border-radius: 999px;
  box-shadow: 0 20px 50px -15px rgba(0,0,0,.5); opacity: 0; transition: opacity .35s, transform .35s; white-space: nowrap; }
#cm-cap.on { opacity: 1; transform: translateX(-50%) translateY(0); }
#cm-cap b { color: #10b981; font-weight: 700; }
#cm-end { position: fixed; inset: 0; z-index: 2147483646; background: #0b0d12; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 28px; color: #fff; font-family: Inter, sans-serif; opacity: 0; transition: opacity .5s; }
#cm-end.on { opacity: 1; }
#cm-end h1 { font: 400 96px/0.95 Anton, Impact, sans-serif; text-transform: uppercase; text-align: center; }
#cm-end h1 span { color: #10b981; display: block; }
#cm-end p { font-size: 28px; font-weight: 600; opacity: .8; }
`;

async function prep(p) {
  await p.addStyleTag({ content: CSS });
}
async function caption(p, html) {
  await p.evaluate((h) => {
    let el = document.getElementById("cm-cap");
    if (!el) {
      el = document.createElement("div");
      el.id = "cm-cap";
      document.body.appendChild(el);
    }
    el.classList.remove("on");
    setTimeout(() => {
      el.innerHTML = h;
      el.classList.add("on");
    }, h ? 180 : 0);
  }, html);
}
async function smoothScrollTo(p, y, ms = 2400) {
  await p.evaluate(
    async (target, dur) => {
      const start = window.scrollY;
      const t0 = performance.now();
      await new Promise((done) => {
        const step = (t) => {
          const k = Math.min(1, (t - t0) / dur);
          const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          window.scrollTo(0, start + (target - start) * e);
          k < 1 ? requestAnimationFrame(step) : done();
        };
        requestAnimationFrame(step);
      });
    },
    y,
    ms,
  );
}
/** scroll target that centres feature row `i` (the numbered rows under #how) */
const featureY = (p, i) =>
  p.evaluate((k) => {
    const row = document.querySelectorAll("#how h3")[k].closest(".grid");
    const r = row.getBoundingClientRect();
    return r.top + window.scrollY - (window.innerHeight - r.height) / 2;
  }, i);
const yOf = (p, sel, offset = 0) => p.evaluate((s, o) => document.querySelector(s).getBoundingClientRect().top + window.scrollY + o, sel, offset);

let n = 0;
async function record(p, fn) {
  const file = join(CLIPS, `${String(++n).padStart(2, "0")}.webm`);
  const rec = await p.screencast({ path: file });
  await fn();
  await rec.stop();
  return file;
}

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--hide-scrollbars"],
});
await browser.setCookie({ name: "cm_sid", value: COOKIE, domain: "localhost", path: "/", httpOnly: true });
const p = await browser.newPage();
await p.setViewport({ width: 1440, height: 810, deviceScaleFactor: 1 });

try {
  // 1. landing: hero + scroll through the story
  await p.goto(BASE + "/", { waitUntil: "networkidle2" });
  await prep(p);
  await record(p, async () => {
    await caption(p, "<b>ChainMatch</b> · the career chain-matching engine");
    await sleep(3800);
    await caption(p, "Add a résumé or LinkedIn URL");
    await smoothScrollTo(p, await featureY(p, 0), 2600);
    await sleep(2000);
    await caption(p, "Every job <b>ranked by how it fits</b>");
    await smoothScrollTo(p, await featureY(p, 1), 2200);
    await sleep(2200);
    await caption(p, "Only jobs that are <b>still open</b>");
    await smoothScrollTo(p, await featureY(p, 2), 2200);
    await sleep(2200);
    await caption(p, "Every match shows <b>the chain</b> behind it");
    await smoothScrollTo(p, await yOf(p, "#chain", 120), 2200);
    await smoothScrollTo(p, await yOf(p, "#chain", 900), 3200);
    await sleep(1200);
  });

  // 2. onboarding: paste a résumé (the AI read is cut out)
  await p.goto(BASE + "/onboarding?redo=1", { waitUntil: "networkidle2" });
  await prep(p);
  await record(p, async () => {
    await caption(p, "Paste a résumé, upload a PDF, or use your LinkedIn URL");
    await sleep(1200);
    for (const b of await p.$$("button")) if ((await b.evaluate((x) => x.textContent)).includes("Paste text")) await b.click();
    await sleep(500);
    await p.type("textarea", RESUME.slice(0, 220), { delay: 6 });
    await p.evaluate((rest) => {
      const t = document.querySelector("textarea");
      const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
      set.call(t, t.value + rest);
      t.dispatchEvent(new Event("input", { bubbles: true }));
    }, RESUME.slice(220));
    await sleep(700);
    for (const b of await p.$$("button")) if ((await b.evaluate((x) => x.textContent)).includes("Read my résumé")) await b.click();
    await sleep(1200);
  });
  await p.waitForFunction(() => document.body.innerText.includes("Save") && document.querySelectorAll("input").length > 3, { timeout: 90_000 });
  await sleep(500);
  await record(p, async () => {
    await caption(p, "An editable profile in seconds");
    await sleep(1500);
    await smoothScrollTo(p, 520, 2200);
    await sleep(1200);
  });

  // 3. the job deck
  await p.goto(BASE + "/jobs", { waitUntil: "networkidle2" });
  await prep(p);
  await record(p, async () => {
    await caption(p, "Live jobs from company boards, <b>each with a fit score</b>");
    await sleep(3200);
    await caption(p, "Swipe left to pass, right to save");
    await p.keyboard.press("ArrowLeft");
    await sleep(1600);
    await p.keyboard.press("ArrowRight");
    await sleep(2200);
  });

  // 4. saved → cover note (drafting cut out)
  await p.goto(BASE + "/saved", { waitUntil: "networkidle2" });
  await prep(p);
  await record(p, async () => {
    await caption(p, "Saved jobs, confirmed open on the company's job board");
    await sleep(2600);
    for (const b of await p.$$("button")) if ((await b.evaluate((x) => x.textContent)).includes("cover note")) { await b.click(); break; }
    await sleep(900);
  });
  await p.waitForFunction(() => document.querySelector("[role=dialog] textarea")?.value.length > 200, { timeout: 90_000 });
  await record(p, async () => {
    await caption(p, "A cover note <b>from your real experience</b>");
    await sleep(4200);
    await p.keyboard.press("Escape");
    await sleep(300);
  });

  // 5. résumé fixes
  await p.goto(BASE + "/profile", { waitUntil: "networkidle2" });
  await prep(p);
  await p.waitForFunction(() => document.body.innerText.includes("EXPERIENCE") || document.body.innerText.includes("Experience:"), { timeout: 90_000 }).catch(() => {});
  await record(p, async () => {
    await caption(p, "Résumé fixes aimed at <b>the jobs you want</b>");
    await smoothScrollTo(p, await p.evaluate(() => [...document.querySelectorAll("section")].find((s) => s.innerText.includes("Fixes for your résumé")).getBoundingClientRect().top + window.scrollY - 120), 1800);
    await sleep(3200);
  });

  // 6. pricing + end card
  await p.goto(BASE + "/#pricing", { waitUntil: "networkidle2" });
  await prep(p);
  await p.evaluate(() => document.querySelector("#pricing").scrollIntoView());
  await sleep(1500);
  await record(p, async () => {
    await caption(p, "Start free. <b>Go Pro</b> for every match and a weekly email");
    await sleep(3400);
    // one more visible change so the hold above is kept (the recorder only stores changed frames)
    await caption(p, "Start free. <b>Go Pro</b> for every match and a weekly email.");
    await sleep(400);
  });

  // end card as a still image (appended with a fade when joining)
  await p.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await p.setContent(
    `<html><head><link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@600&display=block" rel="stylesheet"><style>${CSS}</style></head>
    <body style="margin:0"><div id="cm-end" class="on"><svg width="150" height="86" viewBox="0 0 28 16" fill="none"><rect x="1.2" y="1.2" width="15" height="13.6" rx="6.8" stroke="#fff" stroke-width="2.4"/><rect x="11.8" y="1.2" width="15" height="13.6" rx="6.8" stroke="#10b981" stroke-width="2.4"/></svg><h1 style="font-size:130px">Every job,<span>linked to you.</span></h1><p style="font-size:38px">chainmatch.ai</p></div></body></html>`,
    { waitUntil: "load" },
  );
  await p.evaluate(() => document.fonts.ready);
  await sleep(400);
  await p.screenshot({ path: join(CLIPS, "endcard.png") });
} finally {
  await browser.close();
}

// join clips → 1920x1080 30fps H.264
const list = join(CLIPS, "list.txt");
const clips = execFileSync("ls", [CLIPS]).toString().split("\n").filter((f) => f.endsWith(".webm"));
writeFileSync(list, clips.map((f) => `file '${join(CLIPS, f)}'`).join("\n"));
const mp4 = join(OUT, "chainmatch-demo.mp4");
execFileSync("ffmpeg", [
  "-v", "error", "-y",
  "-f", "concat", "-safe", "0", "-i", list,
  "-loop", "1", "-t", "4", "-i", join(CLIPS, "endcard.png"),
  "-filter_complex",
  "[0]fps=30,scale=1920:1080:flags=lanczos,format=yuv420p,setsar=1[m];[1]fps=30,scale=1920:1080,format=yuv420p,setsar=1,fade=in:0:15[e];[m][e]concat=n=2:v=1:a=0[v]",
  "-map", "[v]", "-c:v", "libx264", "-crf", "18", "-preset", "slow", "-movflags", "+faststart", "-an", mp4,
]);
// 15 s teaser GIF from the landing scene
execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", "0", "-t", "15", "-i", mp4, "-vf", "fps=12,scale=900:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer", join(OUT, "chainmatch-teaser.gif")]);
console.log("done:", mp4);
