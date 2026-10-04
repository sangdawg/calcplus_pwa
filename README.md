# CalcPlus

A calculator + foreign-exchange converter in **one self-contained HTML file**, installable as a PWA on Android and iOS. Built from `PRD.md`.

## The Package

**`CalcPlus.html`** (<100 KB) is the entire app: markup, styles, code, icons, and the web-app manifest are all embedded. No build step, no dependencies, no network needed to render. Send that one file to anyone.

## Install on a phone

Browsers only offer "install app" / "Add to Home Screen" for pages loaded over HTTP(S), so the file needs to be reachable at a URL first. Pick whichever is easiest:

| Option | How |
|---|---|
| **Host it (best)** | Drop `CalcPlus.html` on any static host — GitHub Pages, Netlify Drop (drag & drop), Cloudflare Pages, your own server. Open the URL once. |
| **On your own machine** | `python3 -m http.server` in this folder → open `http://<your-ip>:8000/CalcPlus.html` on the phone (same Wi-Fi). |
| **Just open the file** | Works too (double-click / share to a browser); every feature works except the formal "install" prompt. |

Then:

- **Android (Chrome):** menu ⋮ → **Install app** (or **Add to Home screen**). Launches full-screen with its own icon.
- **iOS (Safari):** tap **Share** → **Add to Home Screen**. Launches standalone with its own icon.

Once installed it runs offline (the whole app is local); FX rates need a connection and are cached with a staleness indicator.

## Features

- **Calculator** — `+ − × ÷`, `C`/`CE`, `%` (calculator-style: `100 + 10 % =` 110), `±`, decimals, divide-by-zero error state, history line, live thousands grouping.
- **FX converter** — sticky base currency card, amount input, live-converted list with per-row `1 BASE = x CUR` rate line. Every row's value is editable: change any currency and the base plus all other rows recalculate; each field has an in-place clear (✕) button, and the keyboard's Enter/Done key commits the value and dismisses the keypad. Reorder rows by dragging the handle on the left of any row; long-press a row to remove it (confirmation dialog).
- **Rates with failover** — primary: `open.er-api.com` (ExchangeRate-API, ~160 currencies); fallback: `api.frankfurter.dev` (Frankfurter; the PRD's `api.frankfurter.app` URL now 301s there). 10 s timeout each; if both fail, last cached rates are shown with a "Rates may be outdated" warning. Rates older than 1 h auto-refresh when you enter FX mode or bring the app back from background.
- **API status monitoring** (Settings) — 🟢 Live / 🟡 Timeout (failing or slow) / 🔴 Dead (failing for > 24 h) per provider, plus time since last check and the last successful refresh timestamp.
- **Currencies** — searchable picker (~160 currencies with flags), drag-handle reordering, add/remove, change base (auto-refetches).
- **Settings** — default launch mode, decimal precision (2–6, default 4), persisted in `localStorage`.
- **Mode switching** — floating action button toggles Calculator ↔ FX with a slide transition; the icon always shows the mode you'd switch *to*.
- Mobile-first dark UI, safe-area aware (notch), haptic tick on keys (Android), keyboard shortcuts on desktop (`0-9 . + - * /`, Enter, Esc, Backspace, `c`, `e`, `n`).

## Repo Layout

```
CalcPlus.html        ← the app (generated; share this file)
index.html           ← same file, root-friendly for static hosts
src/app.template.html← source (with __ICON*__ placeholders)
tools/make_icons.py  ← regenerates PNG icons (pure stdlib) → assets/
tools/build.py       ← injects icon data URIs → CalcPlus.html + index.html
assets/              ← generated icons + icons.json
```

To rebuild after editing the template:

```sh
python3 tools/make_icons.py   # only if you want new icons
python3 tools/build.py
```

## Notes

- **Single-file PWA tricks:** the manifest is injected at runtime as a `data:application/manifest+json` URI (with absolute `start_url`/`scope` derived from the current URL) and icons are embedded base64 PNGs — this keeps everything in one file while staying installable on Chrome/Android. iOS uses the classic `apple-mobile-web-app-*` meta tags plus an `apple-touch-icon` data URI. Modern Chrome no longer requires a service worker for installability, and the app is inherently offline (single local file + `localStorage` cache), so no SW is included.
- **CORS:** both FX APIs send `Access-Control-Allow-Origin: *`, so no proxy is needed.
- **Privacy:** no analytics, no accounts; everything (settings, currency list, cached rates, API status) stays in the browser's `localStorage`.
