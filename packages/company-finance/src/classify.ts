import { roundMoney } from "@plumo/money"
import type {
  BalanceClassifyOptions,
  BalanceState,
  CompanyBalance,
} from "./types.js"

export function classifyBalance(
  balance: CompanyBalance,
  options: BalanceClassifyOptions = {},
): BalanceState {
  const epsilon = options.epsilon ?? 0.005
  const them = Math.abs(roundMoney(balance.owedByThem)) > epsilon
  const us = Math.abs(roundMoney(balance.owedByUs)) > epsilon
  if (them && us) return "both"
  if (them) return "they_owe"
  if (us) return "we_owe"
  return "balanced"
}

export function matchesBalanceState(
  balance: CompanyBalance,
  state: BalanceState | "all" | undefined,
  options?: BalanceClassifyOptions,
): boolean {
  if (!state || state === "all") return true
  return classifyBalance(balance, options) === state
}

/** Filter helper for company lists with precomputed balances. */
export function filterByBalanceState<T>(
  rows: readonly T[],
  getBalance: (row: T) => CompanyBalance,
  state: BalanceState | "all" | undefined,
  options?: BalanceClassifyOptions,
): T[] {
  if (!state || state === "all") return [...rows]
  return rows.filter((row) =>
    matchesBalanceState(getBalance(row), state, options),
  )
}
