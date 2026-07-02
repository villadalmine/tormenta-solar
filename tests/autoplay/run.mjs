// run.mjs — RUNNER del Autoplay QA (specs/autoplay-qa.md): corre las suites, junta los AUTOPLAY_RESULT,
// escribe reporte.json + reporte.md y — si algo falló — GENERA EL PROMPT DE AUTO-FIX (F3a: listo para pegar
// en Claude Code / que hermes lo tome). Local: node tests/autoplay/run.mjs [suite...]
import { spawnSync } from 'child_process';
import { writeFileSync, readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.env.QA_OUT || DIR;
const pick = process.argv.slice(2);
const suites = readdirSync(DIR).filter(f => /^\d\d-.*\.mjs$/.test(f)).sort()
  .filter(f => !pick.length || pick.some(p => f.includes(p)));

const results = [];
for (const f of suites) {
  console.log('\n══════ ' + f + ' ══════');
  const r = spawnSync('node', [path.join(DIR, f)], { encoding: 'utf8', timeout: 180000 });
  const out = (r.stdout || '') + (r.stderr || '');
  process.stdout.write(out.split('\n').filter(l => !l.startsWith('AUTOPLAY_RESULT')).join('\n') + '\n');
  const m = out.match(/AUTOPLAY_RESULT (\{.*\})/);
  results.push(m ? JSON.parse(m[1]) : { suite: f, ok: false, checks: [], crash: true, detail: 'sin veredicto (crash/timeout)' });
}

// reporte
const meta = { fecha: new Date().toISOString(), target: process.env.TARGET_URL || 'prod' };
writeFileSync(path.join(OUT, 'reporte.json'), JSON.stringify({ meta, results }, null, 2));
let md = '# Autoplay QA — ' + meta.fecha + '\n\n| Suite | Estado | Checks |\n|---|---|---|\n';
for (const r of results) md += `| ${r.suite} | ${r.ok ? '✅' : '❌'} | ${(r.checks || []).map(c => (c.ok ? (c.warn ? '⚠' : '✓') : '✗') + ' ' + c.name).join(' · ')} |\n`;
writeFileSync(path.join(OUT, 'reporte.md'), md);

// F3a: el PROMPT de auto-fix
const fails = results.filter(r => !r.ok);
if (fails.length) {
  let p = 'Sos el mantenedor de TORMENTA SOLAR (repo villadalmine/tormenta-solar). El Autoplay QA corrió contra ' +
    meta.target + ' el ' + meta.fecha + ' y FALLÓ:\n\n';
  for (const r of fails) { p += '## ' + r.suite + '\n';
    for (const c of (r.checks || []).filter(c => !c.ok)) p += '- ✗ ' + c.name + (c.detail ? ' — ' + c.detail : '') + (c.shot ? ' (screenshot: ' + c.shot + ')' : '') + '\n';
    if (r.pageErrors && r.pageErrors.length) p += '- pageErrors: ' + JSON.stringify(r.pageErrors) + '\n';
    if (r.crash) p += '- la suite CRASHEÓ sin veredicto\n';
    p += '\n'; }
  p += 'REGLAS: (1) leé specs/autoplay-qa.md y el SDD de la parte que falla ANTES de tocar; (2) reproducí localmente\n' +
    '(node tests/autoplay/<suite>.mjs); (3) NO toques infra que anda (regla del dueño, memoria regla-no-tocar-infra);\n' +
    '(4) arreglá la CAUSA RAÍZ, corré node tests/e2e.js + la suite, y dejá el fix en una rama qa-fix/<fecha> con PR.\n';
  writeFileSync(path.join(OUT, 'prompt-autofix.md'), p);
  console.log('\n❌ ' + fails.length + ' suite(s) fallaron → prompt de auto-fix en ' + path.join(OUT, 'prompt-autofix.md'));
} else console.log('\n✅ TODO VERDE (' + results.length + ' suites) — reporte en ' + path.join(OUT, 'reporte.md'));
process.exit(fails.length ? 1 : 0);
