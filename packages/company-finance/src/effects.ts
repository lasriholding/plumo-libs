import { mulMoney, toMoney } from "@plumo/money"
import type { DebtSide, LedgerEffect, LedgerEntry } from "./types.js"

/** Optional named effects — apps can ignore and pass custom effects. */
export const Effect = {
  chargeThem: { kind: "charge", side: "owedByThem" } as const satisfies LedgerEffect,
  chargeUs: { kind: "charge", side: "owedByUs" } as const satisfies LedgerEffect,
  settleThem: { kind: "settle", side: "owedByThem" } as const satisfies LedgerEffect,
  settleUs: { kind: "settle", side: "owedByUs" } as const satisfies LedgerEffect,
  netPlus: { kind: "net", sign: 1 } as const satisfies LedgerEffect,
  netMinus: { kind: "net", sign: -1 } as const satisfies LedgerEffect,
}

export function charge(side: DebtSide): LedgerEffect {
  return { kind: "charge", side }
}

export function settle(side: DebtSide): LedgerEffect {
  return { kind: "settle", side }
}

export function delta(
  owedByThem = 0,
  owedByUs = 0,
): LedgerEffect {
  return { kind: "delta", owedByThem, owedByUs }
}

export function netEffect(sign: 1 | -1): LedgerEffect {
  return { kind: "net", sign }
}

export function entryDelta(entry: LedgerEntry): {
  owedByThem: number
  owedByUs: number
} {
  const amount = Math.abs(toMoney(entry.amount))
  const effect = entry.effect

  switch (effect.kind) {
    case "charge":
      return effect.side === "owedByThem"
        ? { owedByThem: amount, owedByUs: 0 }
        : { owedByThem: 0, owedByUs: amount }
    case "settle":
      return effect.side === "owedByThem"
        ? { owedByThem: -amount, owedByUs: 0 }
        : { owedByThem: 0, owedByUs: -amount }
    case "delta":
      return {
        owedByThem: toMoney(effect.owedByThem ?? 0),
        owedByUs: toMoney(effect.owedByUs ?? 0),
      }
    case "net": {
      const signed = mulMoney(amount, effect.sign)
      // Represent net-only moves as receivable side for running net consistency.
      return signed >= 0
        ? { owedByThem: signed, owedByUs: 0 }
        : { owedByThem: 0, owedByUs: Math.abs(signed) }
    }
    default: {
      const _exhaustive: never = effect
      return _exhaustive
    }
  }
}

/** Signed impact on `balance.net`. */
export function netDelta(entry: LedgerEntry): number {
  const d = entryDelta(entry)
  return toMoney(d.owedByThem - d.owedByUs)
}
