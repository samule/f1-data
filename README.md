# F1 Pit & Strategy Board

Pick a completed Grand Prix and see each driver's pit stops (lap, lane time, tyre fitted) and a tyre-strategy bar per stint.

> **Unofficial fan project.** Not affiliated with, endorsed or sponsored by Formula 1, the FIA or any team. F1 and related marks belong to their owners. Non-commercial use only.

## Data (no API keys)
- [OpenF1](https://openf1.org): sessions, drivers, stints (tyre compounds) and pit stops.
- [Jolpica](https://github.com/jolpica/jolpica-f1) (Ergast-compatible): season calendar and finishing order.

Both are free public APIs; please be gentle with request volume. Coverage starts in 2023 (OpenF1).

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
Static Vite build: import the repo in Vercel (framework preset "Vite", output `dist`).
