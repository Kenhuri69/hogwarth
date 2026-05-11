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
    await page.evaluate(() => {
      const m = document.querySelector('.modal');
      if (m) m.style.maxHeight = 'none';
      const b = document.querySelector('.modal-body');
      if (b) b.style.overflowY = 'visible';
    });
    await page.waitForTimeout(400);

    const measure = await page.evaluate(() => {
      const img   = document.querySelector('.pd-portrait');
      const stage = document.querySelector('.paper-doll-stage');
      const main  = document.querySelector('.paper-doll-main');
      const pd    = document.querySelector('.paper-doll');
      const bot   = document.querySelector('.paper-doll-bottom');
      const spells = document.querySelector('.spells-strip');
      const inv    = document.querySelector('.inv-section');
      const gold   = document.querySelector('.gold-banner');
      if (!img || !stage || !pd) return null;
      const r = (el) => { const b = el.getBoundingClientRect(); return { x:b.x, y:b.y, w:b.width, h:b.height }; };
      return {
        img:r(img), stage:r(stage), main:r(main), pd:r(pd),
        bot:bot?r(bot):null,
        spells:spells?r(spells):null,
        inv:inv?r(inv):null,
        gold:gold?r(gold):null
      };
    });

    if (measure) {
      await page.evaluate((m) => {
        function box(rect, color, label) {
          const ov = document.createElement('div');
          ov.style.cssText = `position:fixed; left:${rect.x}px; top:${rect.y}px; width:${rect.w}px; height:${rect.h}px; border:2px solid ${color}; box-sizing:border-box; pointer-events:none; z-index:9999;`;
          document.body.appendChild(ov);
          if (label) {
            const lbl = document.createElement('div');
            lbl.textContent = label;
            lbl.style.cssText = `position:fixed; left:${rect.x}px; top:${rect.y - 22}px; background:${color}; color:#fff; padding:2px 6px; font-family:sans-serif; font-size:10px; font-weight:700; z-index:9999; border-radius:2px; white-space:nowrap;`;
            document.body.appendChild(lbl);
          }
        }
        box(m.pd,    '#ffaa00', `paper-doll ${Math.round(m.pd.w)}×${Math.round(m.pd.h)}`);
        box(m.main,  '#00aaff', `main ${Math.round(m.main.w)}×${Math.round(m.main.h)}`);
        box(m.stage, '#00ff44', `stage ${Math.round(m.stage.w)}×${Math.round(m.stage.h)}`);
        box(m.img,   '#ff2244', `img ${Math.round(m.img.w)}×${Math.round(m.img.h)}`);
        if (m.bot)   box(m.bot,'#ff00ff', `bottom ${Math.round(m.bot.w)}×${Math.round(m.bot.h)}`);
      }, measure);
      const out = path.resolve(__dirname, `mockup-${v.name}-${TAG}-PROOF.png`);
      await page.screenshot({ path: out, fullPage: true });
      console.log(`✅ ${v.name} → ${out}`);
      console.log(`   img:   ${Math.round(measure.img.w)}×${Math.round(measure.img.h)} @(${Math.round(measure.img.x)},${Math.round(measure.img.y)})`);
      console.log(`   stage: ${Math.round(measure.stage.w)}×${Math.round(measure.stage.h)} @(${Math.round(measure.stage.x)},${Math.round(measure.stage.y)})`);
      console.log(`   main:  ${Math.round(measure.main.w)}×${Math.round(measure.main.h)} @(${Math.round(measure.main.x)},${Math.round(measure.main.y)})`);
      if (measure.bot) {
        const gapTop = measure.stage.y - measure.main.y;
        const gapImgInStage = measure.img.y - measure.stage.y;
        const gapBot = measure.bot.y - (measure.stage.y + measure.stage.h);
        console.log(`   gap stage vs main (top):   ${Math.round(gapTop)}px`);
        console.log(`   gap img vs stage (top):    ${Math.round(gapImgInStage)}px`);
        console.log(`   gap stage→bottom (bottom): ${Math.round(gapBot)}px`);
      }
      if (measure.gold && measure.spells) {
        const gap = measure.spells.y - (measure.gold.y + measure.gold.h);
        console.log(`   gap gold-banner→spells:    ${Math.round(gap)}px`);
      }
      if (measure.spells && measure.inv) {
        const gap = measure.inv.y - (measure.spells.y + measure.spells.h);
        console.log(`   gap spells→inv:            ${Math.round(gap)}px`);
      }
    }
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error('❌', e.message); process.exit(1); });
