import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { ConflictException } from "@nestjs/common"
import {
  mapPrismaUnique,
  prismaUniqueError,
  prismaUniqueFields,
} from "./map-prisma-unique.js"

describe("mapPrismaUnique", () => {
  it("maps field message", () => {
    const err = prismaUniqueError(["orgId", "quoteId"])
    assert.deepEqual(prismaUniqueFields(err), ["orgId", "quoteId"])
    assert.throws(
      () =>
        mapPrismaUnique(err, {
          quoteId: "Already converted",
          orderNumber: "Number clash",
        }),
      (e: unknown) =>
        e instanceof ConflictException && e.message === "Already converted",
    )
  })

  it("ignores non-P2002", () => {
    const other = new Error("boom")
    mapPrismaUnique(other, { quoteId: "x" })
    // did not throw
  })
})
