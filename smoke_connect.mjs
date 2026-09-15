import { chromium } from "playwright-core";

const BASE = "https://ascend-eight-mauve.vercel.app";
const stamp = Date.now();
const email = `smoketest+${stamp}@ascend-test.dev`;
const password = "SmokeTest!2026xyz";
const username = `smoketest${stamp}`.slice(0, 20);

const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const page = await browser.newPage();

await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
await page.fill('input[type="email"]', email);
await page.fill('input[type="password"]', password);
await page.fill('input#username, input[name="username"]', username);
await page.getByRole("button", { name: /continuer/i }).click();
await page.getByText("Continue ton profil").waitFor({ timeout: 10000 }).catch(() => {});
await page.waitForTimeout(800);
const textInputs = await page.locator('input:not([type="email"]):not([type="password"]):not([type="checkbox"])').all();
for (const input of textInputs) {
  const val = await input.inputValue();
  if (val === "") await input.fill("Smoke Test");
}
await page.getByRole("button", { name: /continuer/i }).click();
await page.getByText(/parle.*toi|bio/i).first().waitFor({ timeout: 10000 }).catch(() => {});
await page.waitForTimeout(800);
await page.getByRole("button", { name: /continuer/i }).first().click();
await page.getByRole("button", { name: /connecter stripe/i }).waitFor({ timeout: 10000 }).catch(() => {});
await page.waitForTimeout(800);

const resp = await page.goto(`${BASE}/api/stripe/connect`, { waitUntil: "domcontentloaded" });
console.log("status:", resp.status());
console.log("landed on:", page.url());
await page.waitForTimeout(1000);
await page.screenshot({ path: "/tmp/stripe-connect-error.png", fullPage: true });
console.log("page text:", (await page.locator("body").innerText()).slice(0, 500));

console.log("EMAIL_USED:", email);
await browser.close();
