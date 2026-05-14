# Horizontal Stack Method — PWA

A study tool for HSC students. Installs as an app on your phone and desktop.
No AI, no subscriptions, no internet required after install.

---

## Features
- 📱 Installs as a real app (PWA) — works offline, appears on home screen
- 🖼️ Upload images of past paper sections per level
- 🎲 Random set picker for each difficulty level
- 🔥 Daily streak tracker
- ⏱️ Session timer with per-set logging
- 📝 Notes per set and per practice session
- 🎓 Graduate a level when you're ready to move up
- 📊 Stats dashboard (sessions per level, streak, totals)
- ⬇️ Export/import backup as JSON (never lose your data)

---

## Run locally (2 minutes)

Install [Node.js](https://nodejs.org) (LTS), then:

```bash
cd horizontal-stack-method
npm install
npm run dev
```

Open **http://localhost:5173**

---

## Deploy free (get a permanent URL + install as app)

### Vercel — recommended

1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → sign in with GitHub
3. "Add New Project" → import your repo → click **Deploy**
4. You get a URL like `yourapp.vercel.app`

### Netlify

1. Push to GitHub
2. [netlify.com](https://netlify.com) → "Add new site" → import project
3. Build command: `npm run build` | Publish directory: `dist`

---

## Install as an app (after deploying)

**iPhone / iPad:**
1. Open your deployed URL in Safari
2. Tap the Share button → "Add to Home Screen"
3. Tap Add — it appears like a real app

**Android:**
1. Open in Chrome
2. Tap the three-dot menu → "Add to Home Screen" or "Install App"

**Desktop (Chrome/Edge):**
1. Visit your URL
2. Look for the install icon (⊕) in the address bar → click Install

---

## Data

All data lives in your browser's localStorage. To back up:
- Home screen → **Export backup** → saves a `.json` file
- To restore on another device: **Import backup** → pick that file
