import { roundMoney } from "@plumo/money"
import type {
  BalanceClassifyOptions,
  BalanceState,
  CompanyBalance,
  CreditLimitOptions,
  CreditLimitState,
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

/**
 * Classify receivable (`owedByThem`) against a company credit threshold.
 * Returns `null` when the balance is within limit (or no threshold applies).
 */
export function creditLimitStatus(
  balance: CompanyBalance,
  threshold: number,
  options: CreditLimitOptions = {},
): CreditLimitState | null {
  const epsilon = options.epsilon ?? 0.005
  const nearRatio = options.nearRatio ?? 0.8
  const owed = roundMoney(balance.owedByThem)

  if (owed <= epsilon) return "allPaidUp"

  const limit = Number(threshold) || 0
  if (limit <= 0) return null

  if (owed >= limit) return "exceededCreditLimit"
  if (owed >= limit * nearRatio) return "nearCreditLimit"
  return null
}

export function matchesCreditLimitState(
  balance: CompanyBalance,
  threshold: number,
  state: CreditLimitState | undefined,
  options?: CreditLimitOptions,
): boolean {
  if (!state) return true
  return creditLimitStatus(balance, threshold, options) === state
}
