# IronLog

IronLog is a private, mobile-first fitness tracker for workout logging, body measurements, body composition estimates, coaching insights, and progress charts.

The app is a static React + Vite frontend. There is no backend, no account system, and no server database.

## Brand

- App name: IronLog
- Logo concept: a minimal barbell mark with a data-pulse center line
- Palette: ink `#080d16`, panel `#0d1422`, steel `#263245`, mint `#36d399`, cyan `#60a5fa`, paper `#edf4ff`
- Typography: Inter first, system UI fallback
- Design language: dark by default, compact cards, thumb-friendly controls, clean data-first surfaces

## Features

- Local weight, measurement, workout, body composition, and preference storage
- IndexedDB primary storage with localStorage fallback
- Migration-safe schema versioning and validated backup imports
- U.S. Navy body fat estimate from height, waist, and neck
- Lean mass and fat mass history for graphing
- Workout templates, substitutions, warm-ups, timers, set logging, PR summaries, and progressive overload hints
- Body and workout charts powered by Recharts
- Coaching cards for bulk, cut, recomp, plateau, and fat-gain signals
- PWA metadata, standalone display mode, safe-area spacing, and offline caching after first production load

## Local Development

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

## Production Build

```bash
npm run build
```

The static production site is generated in `dist/`.

## GitHub Pages Deployment

### Option 1: GitHub Actions

1. Push this project to a GitHub repository.
2. In GitHub, open **Settings -> Pages**.
3. Set **Build and deployment -> Source** to **GitHub Actions**.
4. Push to the `main` branch.
5. The workflow at `.github/workflows/pages.yml` installs dependencies, runs `npm run build`, uploads `dist/`, and deploys Pages.

### Option 2: Manual `gh-pages`

```bash
npm install
npm run deploy
```

The `predeploy` script runs `npm run build`, then `gh-pages -d dist` publishes the built site.

## Vite Base Path

The app uses a relative base by default:

```js
base: process.env.VITE_BASE_PATH || './'
```

This works for GitHub Pages project URLs such as:

```text
https://USERNAME.github.io/REPOSITORY/
```

To force a specific base path:

```bash
VITE_BASE_PATH=/REPOSITORY/ npm run build
```

PowerShell:

```powershell
$env:VITE_BASE_PATH="/REPOSITORY/"; npm run build
```

## iPhone Install

1. Open the deployed IronLog URL in Safari on iPhone.
2. Tap **Share**.
3. Tap **Add to Home Screen**.
4. Confirm the name **IronLog**.

IronLog opens in standalone mode from the Home Screen and remains client-side. Data stays in that browser/site storage.

## Data Privacy

All personal data remains in browser storage for the current site origin. Export JSON backups before clearing browser data, changing domains, or moving to a different GitHub Pages URL.
