// Rate-limit helpers for the OpenF1 free tier (3 req/s, 30 req/min).
// Pure and injectable (sleep/now/fetch) so they can be unit tested without a network.

const defaultSleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Serial queue: each task starts at least `minGapMs` after the previous one started.
export function createQueue({ minGapMs = 400, sleep = defaultSleep, now = () => Date.now() } = {}) {
  let tail = Promise.resolve()
  let lastStart = -Infinity
  return function enqueue(task) {
    const run = tail.then(async () => {
      const wait = lastStart + minGapMs - now()
      if (wait > 0) await sleep(wait)
      lastStart = now()
      return task()
    })
    tail = run.catch(() => {}) // a failed task must not block the queue
    return run
  }
}

// Seconds from a Retry-After header (delta-seconds form), or null.
export function parseRetryAfter(value) {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n * 1000 : null
}

// Memoize async fetches by key. Successful results are cached (memory, plus optional
// storage such as sessionStorage); failures are never cached so a retry can succeed.
export function createCache({ storage = null, prefix = 'openf1:' } = {}) {
  const memory = new Map()
  const read = (key) => {
    try { const raw = storage?.getItem(prefix + key); return raw == null ? undefined : JSON.parse(raw) } catch { return undefined }
  }
  const write = (key, value) => {
    try { storage?.setItem(prefix + key, JSON.stringify(value)) } catch { /* quota exceeded: memory only */ }
  }
  return function cached(key, load) {
    if (memory.has(key)) return memory.get(key)
    const stored = read(key)
    if (stored !== undefined) { const p = Promise.resolve(stored); memory.set(key, p); return p }
    const p = load().then(
      (value) => { write(key, value); return value },
      (err) => { memory.delete(key); throw err },
    )
    memory.set(key, p)
    return p
  }
}

// fetch with retry on 429. Exponential backoff, honoring Retry-After.
export async function fetchWithRetry(url, {
  fetchFn = fetch, maxRetries = 4, baseDelayMs = 1000, maxDelayMs = 30000,
  sleep = defaultSleep, onRetry = () => {},
} = {}) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetchFn(url)
    if (res.status !== 429 || attempt >= maxRetries) return res
    const fromHeader = parseRetryAfter(res.headers?.get?.('Retry-After'))
    const delay = Math.min(fromHeader ?? baseDelayMs * 2 ** attempt, maxDelayMs)
    onRetry({ attempt: attempt + 1, maxRetries, delayMs: delay })
    await sleep(delay)
  }
}
