import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { OrgListCache } from "./org-list-cache.js"
import { OrgCrudService } from "./crud.service.js"
import { defineResource } from "./resource.js"
import { createMockDelegate } from "./test-mock-delegate.js"

describe("OrgListCache", () => {
  it("caches getOrSet until invalidate", async () => {
    const cache = new OrgListCache()
    let loads = 0
    const load = async () => {
      loads += 1
      return { n: loads }
    }
    await cache.getOrSet("brands", "o1", "", load, { ttlMs: 60_000 })
    await cache.getOrSet("brands", "o1", "", load, { ttlMs: 60_000 })
    assert.equal(loads, 1)
    cache.invalidate("brands", "o1")
    await cache.getOrSet("brands", "o1", "", load, { ttlMs: 60_000 })
    assert.equal(loads, 2)
  })
})

describe("OrgCrudService listCache", () => {
  it("invalidates on create", async () => {
    const brand = createMockDelegate()
    const cache = new OrgListCache()
    const resource = defineResource({
      model: "brand",
      listCache: { scope: "brands", ttlMs: 60_000 },
    })
    const svc = new OrgCrudService({ brand }, resource, cache)

    await svc.create("o1", { name: "A" })
    const first = await svc.list("o1", {})
    assert.ok(!Array.isArray(first))
    assert.equal(first.data.length, 1)

    // mutate underlying store without going through service — cache would be stale
    await brand.create({ data: { orgId: "o1", name: "ghost" } })
    const cached = await svc.list("o1", {})
    assert.ok(!Array.isArray(cached))
    assert.equal(cached.data.length, 1)

    await svc.create("o1", { name: "B" })
    const after = await svc.list("o1", {})
    assert.ok(!Array.isArray(after))
    assert.equal(after.data.length, 3)
  })
})
