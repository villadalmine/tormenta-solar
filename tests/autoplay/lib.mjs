// lib.mjs — helpers compartidos del AUTOPLAY QA (specs/autoplay-qa.md §2.1). Cada suite emite al final una línea
// `AUTOPLAY_RESULT {json}` con su veredicto y sale con código 0/1 (para que el DAG de Argo marque el nodo).
import { mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const TARGET = process.env.TARGET_URL || 'https://tormenta-solar.cybercirujas.club/';
export const PROXY = process.env.PROXY_URL || 'https://llm-tormenta-solar.cybercirujas.club';
export const SHOTS = process.env.QA_SHOTS || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'screenshots', 'autoplay');
try { mkdirSync(SHOTS, { recursive: true }); } catch (e) {}

export function suite(name) {
  const t0 = Date.now(), checks = [], logs = [], pageErrors = [];
  return {
    logs, pageErrors,
    check(cname, ok, detail, shot) {
      checks.push({ name: cname, ok: !!ok, ...(detail ? { detail: String(detail).slice(0, 300) } : {}), ...(shot ? { shot } : {}) });
      console.log((ok ? '  ✓ ' : '  ✗ ') + cname + (detail && !ok ? ' — ' + detail : ''));
      return !!ok;
    },
    warn(cname, detail) { checks.push({ name: cname, ok: true, warn: true, detail: String(detail || '').slice(0, 300) }); console.log('  ⚠ ' + cname + ' — ' + detail); },
    log(s) { logs.push(String(s).slice(0, 300)); },
    finish() {
      const ok = checks.every(c => c.ok);
      const res = { suite: name, ok, durMs: Date.now() - t0, checks, logs: logs.slice(-20), pageErrors: pageErrors.slice(0, 10) };
      console.log('AUTOPLAY_RESULT ' + JSON.stringify(res));
      process.exit(ok ? 0 : 1);
    },
  };
}

// navegador con el juego ADENTRO (patrón probado: contexts separados = jugadores distintos)
// opts.seed = { 'clave-localStorage': valor } plantado ANTES de cargar (seams: saves/flags, autoplay-qa.md §3)
// opts.continuar = true → clickea CONTINUAR (retomar el save plantado) en vez de EMPEZAR
export async function enterGame(browser, s, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 560 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => s.pageErrors.push(e.message.slice(0, 200)));
  if (opts.seed) await page.addInitScript(seed => { for (const k in seed) localStorage.setItem(k, typeof seed[k] === 'string' ? seed[k] : JSON.stringify(seed[k])); }, opts.seed);
  await page.goto(TARGET, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(500);
  const btn = await page.$(opts.continuar ? '#continueBtn' : '#startBtn'); if (btn) await btn.click();
  await page.waitForTimeout(700);
  const cv = await page.$('#screen'); if (cv) await cv.click();
  if (opts.toLavalle) { await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(2700); await page.keyboard.up('ArrowLeft'); }
  return page;
}
