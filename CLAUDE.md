# F1 Race Replay & Pit Board

Static React + Vite app on GitHub Pages (https://samule.github.io/f1-data/). Pick a completed GP: race replay (positions, gap to leader) and pit / strategy board. Data comes from the free OpenF1 and Jolpica APIs. No API keys. See `README.md` for the overview.

## Commands
- `npm run dev`: local dev server
- `npm test`: unit tests (fixtures, no network)
- `npm run build`: production build in `dist/`

Run `npm test` and `npm run build` after every change. The deploy workflow runs both on every push to `main`.

## OpenF1 rate limits (important)
The free tier allows **3 requests/second and 30 requests/minute**. A 429 breaks the replay.
- Every OpenF1 call must go through `src/api/openf1.js`. Never call `fetch` on `api.openf1.org` directly.
- That module sends all calls through one queue (>= 400 ms apart), caches each URL (memory + `sessionStorage`) and retries 429s with backoff, honoring `Retry-After`. The helpers live in `src/lib/http.js`.
- One race load is about 6 OpenF1 calls. A new call site adds to that, so check the budget before adding one.
- Use `onOpenF1Retry` to show a status message while waiting out a 429.

## Layout
- `src/api/`: network code (`openf1.js`, `jolpica.js`)
- `src/lib/`: pure logic with unit tests (`replay.js`, `strategy.js`, `http.js`)
- `src/test/`: vitest tests using fixtures, never the network. Add a test for new logic in `src/lib/`.
- `src/App.jsx`, `src/Replay.jsx`: UI
- `bruno/`: Bruno collection with every endpoint the app uses

## Deploy and git
- Pushing to `main` publishes the site (GitHub Pages via `.github/workflows/deploy.yml`).
- The cloud routine never pushes to `main`: it works on `agent/<slug>` branches and opens a PR. Only Santiago merges.

## Secrets
No tokens in client code (the bundle is public). Authenticated OpenF1 access (6 req/s, 60 req/min) would need a server-side proxy. Do not put secrets in Notion either.

## Notes
- Unofficial fan project, non-commercial. Keep the disclaimer in the README.
- Open card in Notion: a CORS bug is linked from the rate-limit card ("Fix OpenF1 429 rate limit on race replay"). Check Tasks and ideas before touching fetch code.
