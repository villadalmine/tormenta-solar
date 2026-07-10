// gen-trenes-estado.mjs — v361: baja el ESTADO REAL del servicio de trenes (GTFS-RT service alerts de la API
// de Transporte de Buenos Aires, https://apitransporte.buenosaires.gob.ar — registro GRATIS, dominio del dueño)
// y lo escribe al PVC → el proxy lo sirve en GET /trenes con source:'real'. SIN credenciales sale limpio (skip):
// el endpoint sigue con el estado SIMULADO por seed horario. Pensado para cron cada 15-30 min.
//   env: APITRANSPORTE_CLIENT_ID + APITRANSPORTE_CLIENT_SECRET (secret k8s, opcional)
//        TRENES_POST_URL (default http://tormenta-ai-proxy/trenes-estado) — o TRENES_STORE si corre EN el pod
import fs from 'fs';

const ID = (process.env.APITRANSPORTE_CLIENT_ID || '').trim();
const SECRET = (process.env.APITRANSPORTE_CLIENT_SECRET || '').trim();
if (!ID || !SECRET) { console.error('ℹ️ sin credenciales APITRANSPORTE_* → el estado queda SIMULADO (registrarse gratis en apitransporte.buenosaires.gob.ar para el estado REAL)'); process.exit(0); }

const BASE = 'https://apitransporte.buenosaires.gob.ar';
const url = BASE + '/trenes/serviceAlerts?json=1&client_id=' + encodeURIComponent(ID) + '&client_secret=' + encodeURIComponent(SECRET);
const LINEAS = { roca: 'Roca', mitre: 'Mitre', 'san martin': 'San Martín', sanmartin: 'San Martín', belgrano: 'Belgrano Norte' };

try {
  const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!r.ok) { console.error('✗ apitransporte →', r.status); process.exit(1); }
  const d = await r.json();
  // GTFS-RT service alerts → { linea: {e, m, extra} }. Sin alerta = normal.
  const estados = { 'Roca': { e: 'normal' }, 'Mitre': { e: 'normal' }, 'San Martín': { e: 'normal' }, 'Belgrano Norte': { e: 'normal' } };
  const entities = (d && (d.entity || d.entities)) || [];
  for (const ent of entities) {
    const a = ent.alert || ent; if (!a) continue;
    const txt = JSON.stringify(a).toLowerCase();
    for (const k in LINEAS) {
      if (!txt.includes(k)) continue;
      const linea = LINEAS[k];
      const effect = (a.effect || '').toUpperCase();
      if (/NO_SERVICE|SUSPEND/.test(effect) || /suspend|interrumpid/.test(txt)) estados[linea] = { e: 'suspendido', m: 0 };
      else if (/REDUCED/.test(effect) || /limitado/.test(txt)) estados[linea] = { e: 'limitado', m: 1 };
      else estados[linea] = { e: 'demorado', m: 0, extra: 15 };
    }
  }
  const out = { ts: Date.now(), estados };
  const store = process.env.TRENES_STORE || '/data/trenes-estado.json';
  fs.writeFileSync(store, JSON.stringify(out));
  console.error('✓ estado REAL de trenes →', store, JSON.stringify(estados));
} catch (e) { console.error('✗', e.message); process.exit(1); }
