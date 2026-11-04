import { describe, it, expect, vi } from 'vitest'
import { createQueue, createCache, fetchWithRetry, parseRetryAfter } from '../lib/http.js'

describe('createQueue', () => {
  it('spaces task starts by at least minGapMs and keeps order', async () => {
    let t = 0
    const sleep = async (ms) => { t += ms }
    const q = createQueue({ minGapMs: 400, sleep, now: () => t })
    const starts = []
    await Promise.all([1, 2, 3, 4].map((n) => q(async () => { starts.push([n, t]) })))
    expect(starts.map((s) => s[0])).toEqual([1, 2, 3, 4])
    for (let i = 1; i < starts.length; i++) expect(starts[i][1] - starts[i - 1][1]).toBeGreaterThanOrEqual(400)
    // 6 calls stay under 3 req/s: 5 gaps of 400 ms = 2 s
  })
  it('a failing task does not block later ones', async () => {
    const q = createQueue({ minGapMs: 0, sleep: async () => {}, now: () => 0 })
    await expect(q(async () => { throw new Error('x') })).rejects.toThrow('x')
    await expect(q(async () => 'ok')).resolves.toBe('ok')
  })
})

describe('createCache', () => {
  it('loads once per key, including concurrent callers', async () => {
    const cached = createCache()
    const load = vi.fn(async () => [1])
    await Promise.all([cached('a', load), cached('a', load)])
    await cached('a', load)
    expect(load).toHaveBeenCalledTimes(1)
  })
  it('does not cache failures', async () => {
    const cached = createCache()
    const load = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce('ok')
    await expect(cached('a', load)).rejects.toThrow('boom')
    await expect(cached('a', load)).resolves.toBe('ok')
  })
  it('persists to and reads from storage, tolerating a full storage', async () => {
    const data = {}
    const storage = { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v } }
    await createCache({ storage })('a', async () => [1, 2])
    const load = vi.fn()
    await expect(createCache({ storage })('a', load)).resolves.toEqual([1, 2])
    expect(load).not.toHaveBeenCalled()
    const full = { getItem: () => null, setItem: () => { throw new Error('quota') } }
    await expect(createCache({ storage: full })('b', async () => 5)).resolves.toBe(5)
  })
})

describe('fetchWithRetry', () => {
  const res = (status, retryAfter) => ({ status, headers: { get: () => retryAfter ?? null } })
  it('retries 429 with exponential backoff, then returns the success', async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(res(429)).mockResolvedValueOnce(res(429)).mockResolvedValueOnce(res(200))
    const delays = []
    const out = await fetchWithRetry('u', { fetchFn, sleep: async (ms) => delays.push(ms), baseDelayMs: 1000 })
    expect(out.status).toBe(200)
    expect(delays).toEqual([1000, 2000])
  })
  it('honors Retry-After', async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(res(429, '7')).mockResolvedValueOnce(res(200))
    const delays = []
    await fetchWithRetry('u', { fetchFn, sleep: async (ms) => delays.push(ms) })
    expect(delays).toEqual([7000])
  })
  it('gives up after maxRetries and returns the 429', async () => {
    const fetchFn = vi.fn().mockResolvedValue(res(429))
    const out = await fetchWithRetry('u', { fetchFn, sleep: async () => {}, maxRetries: 2 })
    expect(out.status).toBe(429)
    expect(fetchFn).toHaveBeenCalledTimes(3)
  })
  it('reports each retry', async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(res(429)).mockResolvedValueOnce(res(200))
    const onRetry = vi.fn()
    await fetchWithRetry('u', { fetchFn, sleep: async () => {}, onRetry })
    expect(onRetry).toHaveBeenCalledWith({ attempt: 1, maxRetries: 4, delayMs: 1000 })
  })
})

describe('parseRetryAfter', () => {
  it('parses seconds, ignores junk', () => {
    expect(parseRetryAfter('3')).toBe(3000)
    expect(parseRetryAfter(null)).toBeNull()
    expect(parseRetryAfter('soon')).toBeNull()
  })
})
