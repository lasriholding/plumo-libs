import { addMoney, roundMoney, subMoney, toMoney } from "@plumo/money"
import type { BalanceTotalsInput, CompanyBalance, LedgerEntry } from "./types.js"
import { entryDelta } from "./effects.js"

export function emptyBalance(): CompanyBalance {
  return { owedByThem: 0, owedByUs: 0, net: 0 }
}

export function balanceOf(
  owedByThem: number,
  owedByUs: number,
): CompanyBalance {
  const them = toMoney(owedByThem)
  const us = toMoney(owedByUs)
  return {
    owedByThem: them,
    owedByUs: us,
    net: subMoney(them, us),
  }
}

/** Classic ERP formula from aggregate buckets (any source). */
export function buildBalanceFromTotals(
  input: BalanceTotalsInput,
): CompanyBalance {
  const owedByThem = subMoney(
    toMoney(input.chargedToThem ?? 0),
    toMoney(input.settledByThem ?? 0),
  )
  const owedByUs = subMoney(
    toMoney(input.chargedToUs ?? 0),
    toMoney(input.settledByUs ?? 0),
  )
  return balanceOf(owedByThem, owedByUs)
}

export function applyDelta(
  balance: CompanyBalance,
  delta: { owedByThem?: number; owedByUs?: number },
): CompanyBalance {
  return balanceOf(
    addMoney(balance.owedByThem, delta.owedByThem ?? 0),
    addMoney(balance.owedByUs, delta.owedByUs ?? 0),
  )
}

export function buildBalanceFromEntries(
  entries: readonly LedgerEntry[],
  opening: CompanyBalance = emptyBalance(),
): CompanyBalance {
  let current = opening
  for (const entry of entries) {
    current = applyDelta(current, entryDelta(entry))
  }
  return current
}

export function mergeBalances(
  balances: readonly CompanyBalance[],
): CompanyBalance {
  return balances.reduce(
    (acc, b) =>
      balanceOf(
        addMoney(acc.owedByThem, b.owedByThem),
        addMoney(acc.owedByUs, b.owedByUs),
      ),
    emptyBalance(),
  )
}

/** Map of entity id → balance (batch helpers). */
export function indexBalances<TId extends string | number>(
  rows: ReadonlyArray<{ id: TId; balance: CompanyBalance }>,
): Record<string, CompanyBalance> {
  const out: Record<string, CompanyBalance> = {}
  for (const row of rows) {
    out[String(row.id)] = row.balance
  }
  return out
}

export function balanceOrEmpty(
  map: Record<string, CompanyBalance> | Map<string, CompanyBalance>,
  id: string | number,
): CompanyBalance {
  const key = String(id)
  if (map instanceof Map) return map.get(key) ?? emptyBalance()
  return map[key] ?? emptyBalance()
}

export function invertBalance(balance: CompanyBalance): CompanyBalance {
  return balanceOf(balance.owedByUs, balance.owedByThem)
}

export function isBalanced(balance: CompanyBalance, epsilon = 0.005): boolean {
  return Math.abs(roundMoney(balance.net)) <= epsilon
}
