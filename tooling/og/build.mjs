// Genera assets/img/og-image-{es,en,pt}.jpg (1200×630) desde tooling/og/og.html con Chrome headless.
// Uso: python3 -m http.server 8798 (en la raíz) y node tooling/og/build.mjs
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const T = {
  es: { roles: 'Analista · Estratega · Media buyer', title1: 'Tu equipo de marketing', title2: 'en tu WhatsApp.', sub: 'Te dice qué funciona en tus anuncios de Meta y TikTok y qué cambiar, en segundos.', q: '¿Qué campaña me está gastando sin traer leads?', a: '🔴 <strong>«Remarketing»</strong> · US$ <strong>96</strong> en 3 días y 0 leads. Renueva el creativo.' },
  en: { roles: 'Analyst · Strategist · Media buyer', title1: 'Your marketing team', title2: 'on WhatsApp.', sub: 'It tells you what works in your Meta and TikTok ads and what to change, in seconds.', q: 'Which campaign is spending without bringing leads?', a: '🔴 <strong>"Remarketing"</strong> · US$ <strong>96</strong> in 3 days and 0 leads. Refresh the creative.' },
  pt: { roles: 'Analista · Estrategista · Mídia', title1: 'Sua equipe de marketing', title2: 'no WhatsApp.', sub: 'Diz o que funciona nos seus anúncios da Meta e do TikTok e o que mudar.', q: 'Qual campanha está gastando sem trazer leads?', a: '🔴 <strong>«Remarketing»</strong> · US$ <strong>96</strong> em 3 dias e 0 leads. Renove o criativo.' },
};
const tpl = readFileSync('tooling/og/og.html', 'utf8');
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'og-'))}`, '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let t; for (let i = 0; i < 50 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((x) => x.type === 'page'); } catch {} if (!t) await sleep(200); }
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0; const p = new Map(); ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (p.has(m.id)) { p.get(m.id)(m); p.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const n = ++id; p.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false });
for (const [lang, words] of Object.entries(T)) {
  writeFileSync(`tooling/og/_${lang}.html`, tpl.replace(/{{(\w+)}}/g, (_, k) => words[k]));
  await send('Page.navigate', { url: `http://localhost:8798/tooling/og/_${lang}.html` });
  await sleep(1800);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const png = join(tmpdir(), `og-${lang}.png`);
  writeFileSync(png, Buffer.from(shot.result.data, 'base64'));
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '88', png, '--out', `assets/img/og-image-${lang}.jpg`], { stdio: 'ignore' });
  execFileSync('rm', [`tooling/og/_${lang}.html`]);
  console.log('ok', lang);
}
chrome.kill('SIGKILL'); process.exit(0);
