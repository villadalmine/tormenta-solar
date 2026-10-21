import test from 'node:test';
import assert from 'node:assert/strict';
import { pickFallbackChain } from '../fallback-chain.js';

const bad = m => ({ [`model="${m}",result="timeout"`]: 20 });
const good = m => ({ [`model="${m}",result="ok"`]: 20 });
const C = ['claude-sonnet', 'cheap', 'gemma4-paid'];

test('incidente 2026-10-21: gemma4-paid caído -> cheap, nunca claude-sonnet primero', () => {
  const r = pickFallbackChain({ candidates: C, attempts: { ...bad('gemma4-paid'), ...good('cheap'), ...good('claude-sonnet') } });
  assert.deepEqual(r.chain, ['cheap']); assert.equal(r.warn, null);
});
test('todo sano: más barato primero y sonnet fuera', () => {
  const r = pickFallbackChain({ candidates: C, attempts: { ...good('gemma4-paid'), ...good('cheap') } });
  assert.deepEqual(r.chain, ['gemma4-paid', 'cheap']);
});
test('sin datos se asume sano', () => {
  assert.deepEqual(pickFallbackChain({ candidates: C }).chain, ['gemma4-paid', 'cheap']);
});
test('solo sonnet sano: lo usa pero avisa fuerte', () => {
  const r = pickFallbackChain({ candidates: C, attempts: { ...bad('gemma4-paid'), ...bad('cheap'), ...good('claude-sonnet') } });
  assert.deepEqual(r.chain, ['claude-sonnet']); assert.match(r.warn, /MÁS CARO/);
});
test('nada sano: deja lo barato y avisa', () => {
  const r = pickFallbackChain({ candidates: C, attempts: { ...bad('gemma4-paid'), ...bad('cheap'), ...bad('claude-sonnet') } });
  assert.deepEqual(r.chain, ['gemma4-paid', 'cheap']); assert.match(r.warn, /NINGÚN/);
});
test('modelo desconocido cuenta como caro', () => {
  assert.deepEqual(pickFallbackChain({ candidates: ['raro', 'cheap'] }).chain, ['cheap']);
});
