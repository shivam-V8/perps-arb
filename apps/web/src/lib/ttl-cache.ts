/** Tiny in-memory cache with per-entry expiry (per server process). */
export class TtlCache<V> {
  private map = new Map<string, { v: V; exp: number }>();
  constructor(
    private ttlMs: number,
    private max = 1000,
  ) {}

  get(key: string, now = Date.now()): V | undefined {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    if (hit.exp <= now) {
      this.map.delete(key);
      return undefined;
    }
    return hit.v;
  }

  set(key: string, v: V, now = Date.now()) {
    if (this.map.size >= this.max) this.map.delete(this.map.keys().next().value!); // drop oldest
    this.map.set(key, { v, exp: now + this.ttlMs });
  }
}
