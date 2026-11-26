/**
 * Product Hunt media: logo (240/512/1024) + 6 gallery slides (1270x760 @2x).
 * Captures the real app on the local dev server as the fictional demo user
 * (apps/web/scripts/demo-user.ts), then composes slides with slides.html.
 *   node render.mjs            (dev server on http://localhost:3123)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "out");
const SHOTS = join(OUT, "shots");
mkdirSync(SHOTS, { recursive: true });
const BASE = process.env.BASE_URL ?? "http://localhost:3123";
const COOKIE = readFileSync(join(OUT, ".demo-cookie"), "utf8").trim();
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** hide the Next.js dev badge and toasts in captures */
const CLEAN_CSS = `nextjs-portal, [data-nextjs-toast], [data-sonner-toaster] { display: none !important; }`;

async function page(browser, { width = 1440, height = 900, auth = true } = {}) {
  const p = await browser.newPage();
  await p.setViewport({ width, height, deviceScaleFactor: 2 });
  if (auth) await browser.setCookie({ name: "cm_sid", value: COOKIE, domain: "localhost", path: "/", httpOnly: true });
  return p;
}

async function open(p, path) {
  await p.goto(BASE + path, { waitUntil: "networkidle2", timeout: 90_000 });
  await p.addStyleTag({ content: CLEAN_CSS });
  await sleep(1800); // entrance animations
}

/** scroll through the page so every in-view animation has played */
async function playScroll(p) {
  await p.evaluate(async () => {
    const step = window.innerHeight / 3;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
  });
  await sleep(1500);
}

async function shotEl(p, selector, file, pad = 0) {
  const el = await p.$(selector);
  if (!el) throw new Error(`missing ${selector}`);
  await el.scrollIntoView();
  await sleep(1200);
  // the floating nav would sit on top of section captures
  await p.evaluate(() => document.querySelectorAll('nav[aria-label="Main"], header.sticky').forEach((n) => ((n.parentElement.tagName === "DIV" && n.tagName === "NAV" ? n.parentElement : n).style.display = "none")));
  await sleep(200);
  await el.screenshot({ path: join(SHOTS, file) });
}

async function captureScreens(browser) {
  // 1. landing hero
  let p = await page(browser);
  await open(p, "/");
  await sleep(1500);
  await p.screenshot({ path: join(SHOTS, "hero.png") });

  // 3. chain section with every link lit, 6. pricing + digest
  await playScroll(p);
  await p.evaluate(() => {
    const el = document.querySelector("#chain");
    window.scrollTo(0, el.getBoundingClientRect().bottom + window.scrollY - window.innerHeight * 0.55);
  });
  await sleep(1500);
  await shotEl(p, "#chain > div", "chain.png");
  await shotEl(p, "#pricing > div", "pricing.png");
  await p.close();

  // 2. job deck (Pro demo user: everything unlocked)
  p = await page(browser);
  await open(p, "/jobs");
  await sleep(2500);
  await p.screenshot({ path: join(SHOTS, "jobs.png") });
  await p.close();

  // 4. saved jobs (live-on-ATS badges) and 5. cover note
  p = await page(browser);
  await open(p, "/saved");
  await p.screenshot({ path: join(SHOTS, "saved.png") });
  const draft = await p.$$("button");
  for (const b of draft) {
    if ((await b.evaluate((x) => x.textContent || "")).includes("cover note")) {
      await b.click();
      break;
    }
  }
  await p.waitForFunction(() => document.querySelector("[role=dialog] textarea")?.value.length > 200, { timeout: 90_000 });
  await sleep(800);
  await shotEl(p, "[role=dialog]", "cover-note.png", 6);
  await p.close();

  // 5b. résumé fixes
  p = await page(browser);
  await open(p, "/profile");
  await p.waitForFunction(() => document.body.innerText.includes("BEFORE") || document.querySelectorAll("ol li").length > 1, { timeout: 90_000 }).catch(() => {});
  await sleep(1000);
  // only the first three fixes, so the card stays a sensible height
  await p.evaluate(() => {
    const sec = [...document.querySelectorAll("section")].find((s) => s.innerText.includes("Fixes for your résumé"));
    sec.id = "fixes-card";
    [...sec.querySelectorAll("ol > li")].slice(3).forEach((li) => (li.style.display = "none"));
  });
  await shotEl(p, "#fixes-card", "fixes.png");
  await p.close();
}

async function composeSlides(browser) {
  const tpl = readFileSync(join(HERE, "slides.html"), "utf8");
  const slides = JSON.parse(readFileSync(join(HERE, "slides.json"), "utf8"));
  for (const [i, s] of slides.entries()) {
    // screenshots are referenced as local files (inlining MBs of base64 crashes the renderer)
    const html = tpl.replace("{{SLIDE}}", () => JSON.stringify({ ...s, images: s.images.map((f) => `shots/${f}`) }));
    const file = join(OUT, `slide-${i + 1}.html`);
    writeFileSync(file, html);
    const p = await browser.newPage();
    await p.setViewport({ width: 1270, height: 760, deviceScaleFactor: 2 });
    await p.goto(`file://${file}`, { waitUntil: "load", timeout: 120_000 });
    await p.evaluate(() => document.fonts.ready);
    await p.evaluate(() => Promise.all([...document.images].map((im) => im.decode().catch(() => {}))));
    await sleep(300);
    await p.screenshot({ path: join(OUT, `gallery-${i + 1}.png`) });
    await p.close();
    console.log("gallery", i + 1, s.lines.join(" "));
  }
}

async function renderLogos(browser) {
  const p = await browser.newPage();
  for (const [name, bg, ring1] of [
    ["logo", "#0b0d12", "#ffffff"],
    ["logo-emerald", "#059669", "#ffffff"],
  ]) {
    for (const size of [240, 512, 1024]) {
      await p.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
      const r = size * 0.22; // ring radius
      const sw = size * 0.075; // stroke
      await p.setContent(`<html><body style="margin:0;background:transparent">
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${bg}"/>
  <rect x="${size / 2 - r * 1.62}" y="${size / 2 - r * 0.9}" width="${r * 2}" height="${r * 1.8}" rx="${r * 0.9}" fill="none" stroke="${ring1}" stroke-width="${sw}"/>
  <rect x="${size / 2 - r * 0.38}" y="${size / 2 - r * 0.9}" width="${r * 2}" height="${r * 1.8}" rx="${r * 0.9}" fill="none" stroke="${bg === "#059669" ? "#0b0d12" : "#10b981"}" stroke-width="${sw}"/>
</svg></body></html>`);
      await p.screenshot({ path: join(OUT, `${name}-${size}.png`), omitBackground: true });
    }
    console.log("logo", name);
  }
  await p.close();
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--hide-scrollbars"] });
try {
  if (!process.argv.includes("--compose-only")) await captureScreens(browser);
  await composeSlides(browser);
  await renderLogos(browser);
} finally {
  await browser.close();
}
writeFileSync(join(OUT, ".rendered"), new Date().toISOString());
