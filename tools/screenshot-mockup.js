// Capture du mockup character v2 (desktop + mobile).
// node tools/screenshot-mockup.js → tools/mockup-{desktop,mobile}.png
const { chromium } = require('/opt/node22/lib/node_modules/playwright/index.js');
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, 'mockup_character_v2.html');

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const v of [
    { w: 1100, h: 900, name: 'desktop' },
    { w:  380, h: 900, name: 'mobile'  }
  ]) {
    const ctx  = await browser.newContext({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const out = path.resolve(__dirname, `mockup-${v.name}.png`);
    await page.screenshot({ path: out, fullPage: false });
    console.log(`✅ ${v.name} → ${out}`);
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error('❌', e.message); process.exit(1); });
