// save.js — GUARDADO automático en localStorage (capa ADITIVA).
// El estado del juego vive en game.js (privado); este módulo SOLO persiste el snapshot que
// expone Game.serialize() y, en la intro, ofrece "Continuar" para retomar con Game.continueGame().
// Sin localStorage / sin Game → no hace nada y el juego anda exactamente igual.
// El autosave lo dispara game.js (cada ~5s jugando) llamando a SaveStore.write; acá solo guardamos.
(() => {
  if (typeof window === 'undefined') return;
  const KEY = 'tormenta-solar-save-v1';
  const ls = () => { try { return window.localStorage; } catch (e) { return null; } };

  const Store = {
    write(snap) { const s = ls(); if (!s || !snap) return; try { s.setItem(KEY, JSON.stringify(snap)); } catch (e) {} },
    read()  { const s = ls(); if (!s) return null; try { return JSON.parse(s.getItem(KEY) || 'null'); } catch (e) { return null; } },
    clear() { const s = ls(); if (!s) return; try { s.removeItem(KEY); } catch (e) {} },
    has()   { return !!Store.read(); },
  };
  window.SaveStore = Store;

  // --- UI: botón "Continuar" en la intro (solo si hay partida guardada) ---
  if (typeof document === 'undefined') return;
  function wire() {
    const btn = document.getElementById('continueBtn');
    if (!btn) return;
    const refresh = () => btn.classList.toggle('hidden', !Store.has());
    refresh();
    btn.addEventListener('click', () => {
      const snap = Store.read();
      if (snap && window.Game && window.Game.continueGame) window.Game.continueGame(snap);
    });
    // al volver a la intro tras reintentar, re-evaluamos si quedó (o no) guardado
    const restart = document.getElementById('restartBtn');
    if (restart) restart.addEventListener('click', () => setTimeout(refresh, 50));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
