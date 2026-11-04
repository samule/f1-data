# F1 Race Replay & Pit Board

Pick a completed Grand Prix. **Race replay** shows lap-by-lap positions (chart + lap slider) and the gap to the leader at the end of each lap. **Pit & strategy** shows each driver's pit stops (lap, lane time, tyre fitted) and a tyre-strategy bar per stint.

> **Unofficial fan project.** Not affiliated with, endorsed or sponsored by Formula 1, the FIA or any team. F1 and related marks belong to their owners. Non-commercial use only.

## Data (no API keys)
- [OpenF1](https://openf1.org): sessions, drivers, laps, position changes, stints (tyre compounds) and pit stops.
- [Jolpica](https://github.com/jolpica/jolpica-f1) (Ergast-compatible): season calendar and finishing order.

Both are free public APIs; please be gentle with request volume. Coverage starts in 2023 (OpenF1).

Gap to leader = difference between each car's end-of-lap time and the leader's, derived from `/laps` and `/position` (not the heavier `/intervals`), so it is approximate.

## Run
```bash
npm install
npm run dev     # local dev server
npm test        # unit tests (fixtures, no network)
npm run build   # production build in dist/
```

## Bruno collection
Open the `bruno/` folder in [Bruno](https://www.usebruno.com) to try every endpoint the app uses.

## Deploy
Published on GitHub Pages at https://samule.github.io/f1-data/ by `.github/workflows/deploy.yml`: on every push to `main` it runs `npm ci`, `npm test` and `npm run build`, then publishes `dist/`.

One-time setup: repo **Settings > Pages > Build and deployment > Source = "GitHub Actions"** (not "Deploy from a branch", which serves the unbuilt source and shows a blank page).

The Vite `base` is `/f1-data/`. For another host that serves from the root (Vercel, custom domain) build with `VITE_BASE=/ npm run build`.

## Note on API headers

Browsers cannot set `User-Agent`, and Jolpica's CORS config does not allow custom headers such as `X-Client`, so browser fetches to Jolpica must be plain GETs with no custom headers.
