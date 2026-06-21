# 🚀 Cómo publicar el juego en GitHub

Guía paso a paso de cómo se sube este proyecto a GitHub y se deja **jugable online** con
GitHub Pages. Es 100% estático (no hay build), así que alcanza con subir los archivos.

> Requisitos (una sola vez): tener instalado **git** y el **GitHub CLI** (`gh`), y estar
> logueado con `gh auth login`. Verificás con `gh auth status`.

---

## 1. Crear el repo y subir todo (primera vez)

Desde la carpeta del proyecto:

```bash
cd /var/home/dalmine/Nextcloud/Repos/shooter

git init                 # inicializa el repo local
git branch -M main       # rama principal "main"
git add .                # agrega todos los archivos
git commit -m "Tormenta Solar — Nivel 1: Florida y Lavalle"

# crea el repo en tu cuenta de GitHub y lo sube de una:
gh repo create tormenta-solar --public --source=. --remote=origin --push
```

Eso crea **`https://github.com/villadalmine/tormenta-solar`** y pushea la rama `main`.

**Variantes:**
- Privado: cambiá `--public` por `--private`.
- Otro nombre: cambiá `tormenta-solar`.

---

## 2. Dejarlo jugable online (GitHub Pages)

```bash
gh api -X POST repos/villadalmine/tormenta-solar/pages \
  -f 'source[branch]=main' -f 'source[path]=/'
```

En ~1 minuto queda jugable en:
**https://villadalmine.github.io/tormenta-solar/**

> Alternativa por la web: **Settings → Pages → Branch `main` / carpeta `/root` → Save**.

Como el juego se abre desde `index.html` en la raíz, no hay que configurar nada más.

---

## 3. Subir cambios (las próximas veces)

Cada vez que toques el juego:

```bash
# 1) acordate de subir el cache-busting en index.html:  ?v=N -> ?v=N+1  (todos los src)
# 2) validar:
node tests/e2e.js
# 3) commitear y pushear:
git add .
git commit -m "describe el cambio acá"
git push
```

GitHub Pages se actualiza solo en cada `push` a `main` (esperá ~1 min y refrescá con
Ctrl+Shift+R para saltear el cache del navegador).

---

## 4. Comandos útiles

```bash
gh repo view --web          # abre el repo en el navegador
gh browse                   # idem
git status                  # qué cambió
git log --oneline           # historial de commits
gh api repos/villadalmine/tormenta-solar/pages   # estado de Pages (url incluida)
```

---

## Checklist antes de publicar / compartir

- [ ] `node tests/e2e.js` pasa (boot + auditoría de assets + sub-modos).
- [ ] El `?v=N` de `index.html` está actualizado.
- [ ] Hay un archivo de **licencia** si el repo es público (MIT, etc.). *(Pendiente.)*
- [ ] El README describe bien el juego y los controles.

---

### Apéndice: si NO tenés `gh`

Podés crear el repo a mano en github.com (botón **New repository**) y después:

```bash
git init && git branch -M main
git add . && git commit -m "primer commit"
git remote add origin https://github.com/villadalmine/tormenta-solar.git
git push -u origin main
```

Y activar Pages desde **Settings → Pages** como en el paso 2.
