import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { balanceOf } from "./balance.js"
import {
  creditLimitStatus,
  matchesCreditLimitState,
} from "./classify.js"

describe("creditLimitStatus", () => {
  it("returns allPaidUp when owedByThem is ~0", () => {
    assert.equal(creditLimitStatus(balanceOf(0, 100), 1000), "allPaidUp")
    assert.equal(creditLimitStatus(balanceOf(0.001, 0), 1000), "allPaidUp")
  })

  it("returns null when threshold is 0 and still owing", () => {
    assert.equal(creditLimitStatus(balanceOf(500, 0), 0), null)
  })

  it("returns exceededCreditLimit at/above threshold", () => {
    assert.equal(creditLimitStatus(balanceOf(1000, 0), 1000), "exceededCreditLimit")
    assert.equal(creditLimitStatus(balanceOf(1200, 0), 1000), "exceededCreditLimit")
  })

  it("returns nearCreditLimit in [nearRatio, 1) of threshold", () => {
    assert.equal(creditLimitStatus(balanceOf(800, 0), 1000), "nearCreditLimit")
    assert.equal(creditLimitStatus(balanceOf(999, 0), 1000), "nearCreditLimit")
  })

  it("returns null when within limit below nearRatio", () => {
    assert.equal(creditLimitStatus(balanceOf(799, 0), 1000), null)
    assert.equal(creditLimitStatus(balanceOf(100, 0), 1000), null)
  })

  it("respects custom nearRatio", () => {
    assert.equal(
      creditLimitStatus(balanceOf(900, 0), 1000, { nearRatio: 0.95 }),
      null,
    )
    assert.equal(
      creditLimitStatus(balanceOf(950, 0), 1000, { nearRatio: 0.95 }),
      "nearCreditLimit",
    )
  })
})

describe("matchesCreditLimitState", () => {
  it("matches when undefined state", () => {
    assert.equal(
      matchesCreditLimitState(balanceOf(500, 0), 1000, undefined),
      true,
    )
  })

  it("matches exact credit states", () => {
    const near = balanceOf(850, 0)
    assert.equal(
      matchesCreditLimitState(near, 1000, "nearCreditLimit"),
      true,
    )
    assert.equal(
      matchesCreditLimitState(near, 1000, "exceededCreditLimit"),
      false,
    )
    assert.equal(
      matchesCreditLimitState(balanceOf(0, 0), 1000, "allPaidUp"),
      true,
    )
  })
})
