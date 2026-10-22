import { addMoney, toMoney } from "@plumo/money"
import { buildBalanceFromEntries, emptyBalance } from "./balance.js"
import type { CompanyBalance, LedgerEntry, PeriodFilter } from "./types.js"
import { filterEntriesByPeriod } from "./timeline.js"

export type LedgerBucketSummary = {
  chargeThem: number
  chargeUs: number
  settleThem: number
  settleUs: number
  count: number
}

export type PeriodSummary = {
  buckets: LedgerBucketSummary
  balance: CompanyBalance
}

export function summarizeEntries(
  entries: readonly LedgerEntry[],
): LedgerBucketSummary {
  const buckets: LedgerBucketSummary = {
    chargeThem: 0,
    chargeUs: 0,
    settleThem: 0,
    settleUs: 0,
    count: entries.length,
  }

  for (const entry of entries) {
    const amount = Math.abs(toMoney(entry.amount))
    switch (entry.effect.kind) {
      case "charge":
        if (entry.effect.side === "owedByThem") {
          buckets.chargeThem = addMoney(buckets.chargeThem, amount)
        } else {
          buckets.chargeUs = addMoney(buckets.chargeUs, amount)
        }
        break
      case "settle":
        if (entry.effect.side === "owedByThem") {
          buckets.settleThem = addMoney(buckets.settleThem, amount)
        } else {
          buckets.settleUs = addMoney(buckets.settleUs, amount)
        }
        break
      case "delta":
        if ((entry.effect.owedByThem ?? 0) > 0) {
          buckets.chargeThem = addMoney(
            buckets.chargeThem,
            entry.effect.owedByThem ?? 0,
          )
        } else if ((entry.effect.owedByThem ?? 0) < 0) {
          buckets.settleThem = addMoney(
            buckets.settleThem,
            Math.abs(entry.effect.owedByThem ?? 0),
          )
        }
        if ((entry.effect.owedByUs ?? 0) > 0) {
          buckets.chargeUs = addMoney(
            buckets.chargeUs,
            entry.effect.owedByUs ?? 0,
          )
        } else if ((entry.effect.owedByUs ?? 0) < 0) {
          buckets.settleUs = addMoney(
            buckets.settleUs,
            Math.abs(entry.effect.owedByUs ?? 0),
          )
        }
        break
      case "net":
        if (entry.effect.sign > 0) {
          buckets.chargeThem = addMoney(buckets.chargeThem, amount)
        } else {
          buckets.chargeUs = addMoney(buckets.chargeUs, amount)
        }
        break
    }
  }

  return buckets
}

export function summarizePeriod(
  entries: readonly LedgerEntry[],
  period?: PeriodFilter,
  opening: CompanyBalance = emptyBalance(),
): PeriodSummary {
  const filtered = filterEntriesByPeriod(entries, period)
  return {
    buckets: summarizeEntries(filtered),
    balance: buildBalanceFromEntries(filtered, opening),
  }
}

/** Group entries by arbitrary key (companyId, month, type, …). */
export function groupEntries<TKey extends string | number>(
  entries: readonly LedgerEntry[],
  keyOf: (entry: LedgerEntry) => TKey,
): Map<TKey, LedgerEntry[]> {
  const map = new Map<TKey, LedgerEntry[]>()
  for (const entry of entries) {
    const key = keyOf(entry)
    const list = map.get(key)
    if (list) list.push(entry)
    else map.set(key, [entry])
  }
  return map
}

export function balancesByGroup<TKey extends string | number>(
  entries: readonly LedgerEntry[],
  keyOf: (entry: LedgerEntry) => TKey,
  opening: CompanyBalance = emptyBalance(),
): Map<TKey, CompanyBalance> {
  const grouped = groupEntries(entries, keyOf)
  const out = new Map<TKey, CompanyBalance>()
  for (const [key, list] of grouped) {
    out.set(key, buildBalanceFromEntries(list, opening))
  }
  return out
}
