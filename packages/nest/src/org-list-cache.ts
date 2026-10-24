import { Injectable } from "@nestjs/common"

const DEFAULT_TTL_MS = 5 * 60 * 1000
const MAX_ENTRIES = 500

export type OrgListCacheOptions = {
  ttlMs?: number
}

/**
 * In-memory org-scoped list cache.
 * Opt-in via defineResource({ listCache: { scope } }) — CUD auto-invalidates.
 */
@Injectable()
export class OrgListCache {
  private readonly store = new Map<
    string,
    { expiresAt: number; value: unknown }
  >()

  async getOrSet<T>(
    scope: string,
    orgId: string,
    variant: unknown,
    load: () => Promise<T>,
    options: OrgListCacheOptions = {},
  ): Promise<T> {
    const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS
    const key = this.key(scope, orgId, variant)
    const hit = this.store.get(key)
    if (hit && hit.expiresAt > Date.now()) {
      this.store.delete(key)
      this.store.set(key, hit)
      return hit.value as T
    }
    const value = await load()
    this.set(key, value, ttlMs)
    return value
  }

  invalidate(scope: string, orgId: string) {
    const prefix = `${scope}:${orgId}:`
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key)
    }
  }

  private set(key: string, value: unknown, ttlMs: number) {
    this.store.delete(key)
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs })
    this.evict()
  }

  private evict() {
    const now = Date.now()
    for (const [k, v] of this.store) {
      if (v.expiresAt <= now) this.store.delete(k)
    }
    while (this.store.size > MAX_ENTRIES) {
      const oldest = this.store.keys().next().value
      if (oldest === undefined) break
      this.store.delete(oldest)
    }
  }

  private key(scope: string, orgId: string, variant: unknown) {
    return `${scope}:${orgId}:${stableJson(variant)}`
  }
}

/** Optional singleton when Nest DI is not used. */
export const defaultOrgListCache = new OrgListCache()

function stableJson(value: unknown): string {
  if (value == null) return ""
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value)
  }
  if (typeof value !== "object") return ""
  if (Array.isArray(value)) return JSON.stringify(value)
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
  if (entries.length === 0) return ""
  return JSON.stringify(Object.fromEntries(entries))
}
