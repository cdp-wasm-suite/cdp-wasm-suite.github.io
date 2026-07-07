// og-image generator for the CDP WASM Suite landing page.
// Renders a 1200×630 social card in the site's 1-bit Atari GEM aesthetic
// (putty #9c978b + dot pattern, hard black rules, GEM-green #00aa00 title bar,
// VT323 + Silkscreen) and screenshots it with headless Chrome.
//   node scripts/make-og.mjs           -> writes og-image.png
//   OUT=public/og-image.png node ...    -> custom path
// The right-hand GEM window frames a real app screenshot (shots/patch-gem.png).

import puppeteer from 'puppeteer-core';
import { readFile, writeFile } from 'node:fs/promises';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = process.env.OUT || 'og-image.png';
const SHOT = process.env.SHOT || 'shots/patch-gem.png';
const W = 1200, H = 630;

const ATARI = `<svg viewBox="0 2.346 24 19.308" width="30" height="30" style="display:block;"><path fill="#000" d="m0 21.653s3.154-0.355 5.612-2.384c2.339-1.93 3.185-3.592 3.77-5.476 0.584-1.885 0.671-6.419 0.671-7.764v-3.683h-1.455v1.365c-0.024 2.041-0.2 5.918-1.135 8.444-2.26 6.087-7.463 6.62-7.463 6.62zm24 0s-3.154-0.355-5.61-2.384c-2.342-1.93-3.187-3.592-3.772-5.476-0.583-1.885-0.671-6.419-0.671-7.764v-3.683h1.453l1e-3 1.365c0.024 2.041 0.202 5.918 1.138 8.444 2.258 6.087 7.46 6.62 7.46 6.62zm-13.341-19.305h2.685v19.306h-2.684z"></path></svg>`;

// Ableton's grid mark (the "Icon" element from Wikimedia's Ableton.svg wordmark).
const ABLETON = `<svg viewBox="0 0 53.4 28" width="42" height="22" style="display:block;"><path fill="#000" d="M5.295,25.651c0,0.209-0.176,0.359-0.352,0.359H2.428c-0.205,0-0.381-0.15-0.381-0.359V2.695c0-0.15,0.176-0.33,0.381-0.33h2.516c0.176,0,0.352,0.18,0.352,0.33V25.651z M11.878,25.651c0,0.209-0.176,0.359-0.352,0.359H9.011c-0.205,0-0.38-0.15-0.38-0.359V2.695c0-0.15,0.175-0.33,0.38-0.33h2.516c0.176,0,0.352,0.18,0.352,0.33V25.651z M18.461,25.651c0,0.209-0.175,0.359-0.352,0.359h-2.516c-0.205,0-0.38-0.15-0.38-0.359V2.695c0-0.15,0.175-0.33,0.38-0.33h2.516c0.177,0,0.352,0.18,0.352,0.33V25.651z M25.073,25.651c0,0.209-0.176,0.359-0.351,0.359h-2.516c-0.205,0-0.381-0.15-0.381-0.359V2.695c0-0.15,0.176-0.33,0.381-0.33h2.516c0.175,0,0.351,0.18,0.351,0.33V25.651z M50.966,2.334c0.204,0,0.351,0.182,0.351,0.361v2.588c0,0.211-0.146,0.391-0.351,0.391H28.642c-0.146,0-0.321-0.18-0.321-0.391V2.695c0-0.18,0.176-0.361,0.321-0.361H50.966z M50.966,9.134c0.204,0,0.351,0.181,0.351,0.361v2.587c0,0.21-0.146,0.391-0.351,0.391H28.642c-0.146,0-0.321-0.181-0.321-0.391V9.495c0-0.181,0.176-0.361,0.321-0.361H50.966z M50.966,15.903c0.204,0,0.351,0.18,0.351,0.361v2.586c0,0.213-0.146,0.393-0.351,0.393H28.642c-0.146,0-0.321-0.18-0.321-0.393v-2.586c0-0.182,0.176-0.361,0.321-0.361H50.966z M50.966,22.67c0.204,0,0.351,0.182,0.351,0.361v2.588c0,0.211-0.146,0.391-0.351,0.391H28.642c-0.146,0-0.321-0.18-0.321-0.391v-2.588c0-0.18,0.176-0.361,0.321-0.361H50.966z"></path></svg>`;

const shotB64 = (await readFile(SHOT)).toString('base64');
const shotURI = `data:image/png;base64,${shotB64}`;

// Inline the pixel fonts as data URIs so headless Chrome needs no network at
// render time (its sandbox can't reach fonts.googleapis.com even though the
// shell can). Fetch the css2 sheet with a modern UA to get woff2, then embed
// each referenced font file.
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36';
async function inlineFonts() {
  const cssUrl = 'https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&family=VT323&display=swap';
  let css = await (await fetch(cssUrl, { headers: { 'User-Agent': UA } })).text();
  const urls = [...new Set([...css.matchAll(/url\((https:[^)]+)\)/g)].map((m) => m[1]))];
  for (const u of urls) {
    const b = Buffer.from(await (await fetch(u)).arrayBuffer());
    css = css.split(u).join(`data:font/woff2;base64,${b.toString('base64')}`);
  }
  return css;
}
const fontCss = await inlineFonts();

const html = `<!doctype html><html><head><meta charset="utf-8">
<style>
  ${fontCss}
  *{margin:0;padding:0;box-sizing:border-box;}
  html,body{width:${W}px;height:${H}px;overflow:hidden;}
  .card{width:${W}px;height:${H}px;position:relative;
    background-color:#9c978b;background-image:radial-gradient(#8d887c 1px,transparent 1px);background-size:3px 3px;
    color:#211e18;-webkit-font-smoothing:antialiased;}
  /* GEM desktop frame */
  .frame{position:absolute;inset:26px;background:#fff;border:3px solid #000;box-shadow:10px 10px 0 #000;
    display:flex;flex-direction:column;}
  .titlebar{display:flex;align-items:stretch;background:#fff;border-bottom:3px solid #000;font:26px/1 'VT323',monospace;color:#000;}
  .titlebar .k{width:44px;border-right:3px solid #000;display:flex;align-items:center;justify-content:center;}
  .titlebar .t{flex:1;align-self:center;padding-left:16px;letter-spacing:2px;display:flex;align-items:center;gap:14px;}
  .titlebar .wm{font:22px/1 'Silkscreen',monospace;letter-spacing:1px;}
  .titlebar .x{width:44px;border-left:3px solid #000;display:flex;align-items:center;justify-content:center;}
  .titlebar .x span{width:16px;height:16px;border:3px solid #000;}
  /* desk area */
  .desk{flex:1;display:flex;gap:22px;padding:26px 28px 26px;align-items:stretch;}
  .left{flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden;}
  .kicker{font:19px/1 'Silkscreen',monospace;letter-spacing:2px;color:#000;background:#fff;border:2px solid #000;
    display:inline-block;align-self:flex-start;padding:6px 10px;box-shadow:3px 3px 0 #000;}
  .mid{margin:auto 0;}
  .h1{font:42px/1.1 'VT323',monospace;color:#000;letter-spacing:0px;white-space:nowrap;}
  .sub{font:30px/1.3 'VT323',monospace;color:#111;margin-top:20px;}
  .btns{display:flex;gap:13px;margin-top:auto;}
  .btn{font:25px/1 'VT323',monospace;letter-spacing:1px;color:#000;background:#fff;border:2px solid #000;
    padding:10px 15px;box-shadow:4px 4px 0 #000;display:inline-flex;align-items:center;gap:8px;}
  .btn b{font-weight:400;}
  /* right: framed app screenshot window */
  .win{width:400px;flex:none;background:#fff;border:3px solid #000;box-shadow:6px 6px 0 #000;
    display:flex;flex-direction:column;align-self:center;}
  .wbar{display:flex;align-items:stretch;border-bottom:3px solid #000;font:22px/1 'VT323',monospace;color:#000;}
  .wbar .wk{width:34px;border-right:3px solid #000;display:flex;align-items:center;justify-content:center;}
  .wbar .wt{flex:1;text-align:center;align-self:center;letter-spacing:1px;}
  .wbar .wx{width:34px;border-left:3px solid #000;display:flex;align-items:center;justify-content:center;}
  .wbar .sq{width:12px;height:12px;border:2px solid #000;}
  .shot{width:100%;height:346px;object-fit:cover;object-position:0 0;display:block;image-rendering:pixelated;}
</style></head><body>
<div class="card">
  <div class="frame">
    <div class="titlebar">
      <div class="k">${ATARI}</div>
      <div class="t"><span class="wm">CDP&nbsp;WASM&nbsp;SUITE</span></div>
      <div class="x"><span></span></div>
    </div>
    <div class="desk">
      <div class="left">
          <div class="h1">A unique sound transformation toolkit,<br>compiled to run anywhere.</div>
          <div class="sub">Available as an audio plug-in, web app<br>and Ableton Live extension with a retro computing themed node-graph patcher</div>
          <div class="btns">
            <div class="btn">▚ <b>PLUGIN</b></div>
            <div class="btn">${ABLETON}<b>LIVE EXTENSION</b></div>
            <div class="btn">▶ <b>WEB APP</b></div>
          </div>
      </div>
      <div class="win">
        <div class="wbar"><div class="wk"><span class="sq"></span></div><div class="wt">PATCH</div><div class="wx"><span class="sq"></span></div></div>
        <img class="shot" src="${shotURI}" alt="">
      </div>
    </div>
  </div>
</div>
</body></html>`;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2'],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 });
await page.setContent(html, { waitUntil: 'load', timeout: 60000 });
await page.evaluate(async () => { await document.fonts.ready; });
await new Promise((r) => setTimeout(r, 300));
const buf = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: W, height: H } });
await writeFile(OUT, buf);
await browser.close();
console.log(`✓ ${OUT}  (${W}×${H} @2x)`);
