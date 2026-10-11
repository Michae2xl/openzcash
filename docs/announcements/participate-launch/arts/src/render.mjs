// Renders every *.html in this folder to ../<name>.png at 1600x900 (scale 1).
// Playwright is resolved from the current working directory, so run it from a
// folder where it is installed, for example a scratch folder after
//   npm i playwright && npx playwright install chromium
//   node /path/to/docs/announcements/participate-launch/arts/src/render.mjs
import { readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(join(process.cwd(), "package.json"));
const { chromium } = require("playwright");

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "..");
const only = process.argv.slice(2);
const pages = readdirSync(here).filter((file) => file.endsWith(".html") && (!only.length || only.includes(file)));

const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  for (const file of pages) {
    const page = await context.newPage();
    await page.goto(pathToFileURL(join(here, file)).href, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(150);
    const target = join(out, file.replace(/\.html$/, ".png"));
    await page.screenshot({ path: target, clip: { x: 0, y: 0, width: 1600, height: 900 } });
    console.log("rendered", target);
    await page.close();
  }
} finally {
  await browser.close();
}
