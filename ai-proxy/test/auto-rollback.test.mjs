// Camino AUTOMÁTICO: gen-ia-health.mjs hace POST /ia-chain con { reset:true, reason:'auto-rollback del health...' }
// (sin baseline). Este test levanta el server real y manda ese mismo body con un override caído.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('auto-rollback del health cae a cheap-first, no al env caro', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'iachain-'));
  const store = path.join(dir, 'chain.json');
  fs.writeFileSync(store, JSON.stringify({ chat: ['gemma4-paid'], reason: 'tune', ts: 1 }));
  const port = 18700 + Math.floor(Math.random() * 200);
  const p = spawn(process.execPath, ['server.js'], { env: { ...process.env, AI_API_KEY: 'x', PORT: String(port), GEN_TOKEN: 't',
    AI_MODEL: 'claude-sonnet,cheap', IACHAIN_STORE: store, IAREPORTS_STORE: path.join(dir, 'r.json') }, stdio: 'ignore' });
  try {
    const url = `http://127.0.0.1:${port}/ia-chain`;
    for (let i = 0; i < 50; i++) { try { await fetch(url); break; } catch { await new Promise(r => setTimeout(r, 100)); } }
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-gen-token': 't' },
      body: JSON.stringify({ reset: true, reason: 'auto-rollback del health: salud crítica con override activo' }) });
    const j = await r.json();
    assert.ok(!j.effective.includes('claude-sonnet'), 'no debe caer en sonnet: ' + j.effective);
    assert.equal(j.effective[0], 'gemma4-paid');
  } finally { p.kill(); fs.rmSync(dir, { recursive: true, force: true }); }
});
