// Capture annotée du mockup pour comparaison côte à côte des versions.
// Mesure la bbox du buste, dessine un cadre rouge dessus + la dimension.
// node tools/screenshot-mockup-annotated.js
//   → tools/mockup-desktop-v25-PROOF.png
//   → tools/mockup-mobile-v25-PROOF.png
const { chromium } = require('/opt/node22/lib/node_modules/playwright/index.js');
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, 'mockup_character_v2.html');
const TAG = 'v25';

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const v of [
    { w: 1100, h: 900, name: 'desktop' },
    { w:  380, h: 900, name: 'mobile'  }
  ]) {
    const ctx  = await browser.newContext({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);

    const measure = await page.evaluate(() => {
      const img = document.querySelector('.pd-portrait');
      const wrap = document.querySelector('.pd-portrait-wrapper');
      const pd  = document.querySelector('.paper-doll');
      if (!img || !wrap || !pd) return null;
      const r = img.getBoundingClientRect();
      const rw = wrap.getBoundingClientRect();
      const rp = pd.getBoundingClientRect();
      return {
        img:  { x:r.x,  y:r.y,  w:r.width,  h:r.height  },
        wrap: { x:rw.x, y:rw.y, w:rw.width, h:rw.height },
        pd:   { x:rp.x, y:rp.y, w:rp.width, h:rp.height }
      };
    });

    if (measure) {
      await page.evaluate((m) => {
        const ov = document.createElement('div');
        ov.style.cssText = `position:fixed; left:${m.img.x}px; top:${m.img.y}px; width:${m.img.w}px; height:${m.img.h}px; border:3px solid #ff2244; box-sizing:border-box; pointer-events:none; z-index:9999; box-shadow:0 0 0 1px rgba(255,255,255,0.4);`;
        document.body.appendChild(ov);
        const lbl = document.createElement('div');
        lbl.textContent = `Buste rendu : ${Math.round(m.img.w)} × ${Math.round(m.img.h)} px`;
        lbl.style.cssText = `position:fixed; left:${m.img.x}px; top:${m.img.y - 26}px; background:#ff2244; color:#fff; padding:3px 8px; font-family:sans-serif; font-size:12px; font-weight:700; z-index:9999; border-radius:3px;`;
        document.body.appendChild(lbl);
        const lbl2 = document.createElement('div');
        lbl2.textContent = `Zone wrapper : ${Math.round(m.wrap.w)} × ${Math.round(m.wrap.h)} (paper-doll ${Math.round(m.pd.w)} × ${Math.round(m.pd.h)})`;
        lbl2.style.cssText = `position:fixed; left:${m.img.x}px; top:${m.img.y + m.img.h + 4}px; background:#222; color:#fff; padding:3px 8px; font-family:sans-serif; font-size:11px; z-index:9999; border-radius:3px;`;
        document.body.appendChild(lbl2);
      }, measure);
    }

    const out = path.resolve(__dirname, `mockup-${v.name}-${TAG}-PROOF.png`);
    await page.screenshot({ path: out, fullPage: false });
    console.log(`✅ ${v.name} → ${out}`);
    if (measure) {
      console.log(`   buste:   ${Math.round(measure.img.w)} × ${Math.round(measure.img.h)} px`);
      console.log(`   wrapper: ${Math.round(measure.wrap.w)} × ${Math.round(measure.wrap.h)} px`);
      console.log(`   paper :  ${Math.round(measure.pd.w)} × ${Math.round(measure.pd.h)} px`);
    }
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error('❌', e.message); process.exit(1); });
