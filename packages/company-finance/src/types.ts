/** Who the amount is charged to / settled against. */
export type DebtSide = "owedByThem" | "owedByUs"

/**
 * How an entry moves company debts.
 * - charge: increases a side (invoice / delivery)
 * - settle: decreases a side (payment / credit note)
 * - delta: explicit adjustments (fully custom)
 * - net: signed impact on net only (owedByThem - owedByUs)
 */
export type LedgerEffect =
  | { kind: "charge"; side: DebtSide }
  | { kind: "settle"; side: DebtSide }
  | { kind: "delta"; owedByThem?: number; owedByUs?: number }
  | { kind: "net"; sign: 1 | -1 }

/** Normalized ledger row — schema-agnostic. */
export type LedgerEntry = {
  id?: string
  date: string
  reference?: string
  label?: string
  /** Magnitude (usually >= 0). Sign comes from `effect`. */
  amount: number
  effect: LedgerEffect
  /** Pass-through app data (doc type, method, etc.). */
  meta?: Record<string, unknown>
}

export type CompanyBalance = {
  /** Receivable — they owe us. */
  owedByThem: number
  /** Payable — we owe them. */
  owedByUs: number
  /** owedByThem - owedByUs (positive ⇒ net receivable). */
  net: number
}

export type BalanceTotalsInput = {
  /** Charged to them (sales / outbound deliveries). */
  chargedToThem?: number
  /** Charged to us (purchases / inbound deliveries). */
  chargedToUs?: number
  /** Settlements reducing what they owe (incoming payments, sale credit notes). */
  settledByThem?: number
  /** Settlements reducing what we owe (outgoing payments, purchase credit notes). */
  settledByUs?: number
}

export type TimelineRow = LedgerEntry & {
  /** Signed impact on net for this row. */
  netDelta: number
  /** Delta applied to owedByThem / owedByUs. */
  delta: { owedByThem: number; owedByUs: number }
  running: CompanyBalance
}

export type PeriodFilter = {
  from?: string
  to?: string
}

export type BalanceState =
  | "balanced"
  | "they_owe"
  | "we_owe"
  | "both"

export type BalanceClassifyOptions = {
  /** Absolute net below this is treated as balanced (default 0.005). */
  epsilon?: number
}

/** Credit / threshold filters for company lists (receivable vs limit). */
export type CreditLimitState =
  | "nearCreditLimit"
  | "exceededCreditLimit"
  | "allPaidUp"

export type CreditLimitOptions = {
  /** Fraction of threshold that starts "near" (default 0.8). */
  nearRatio?: number
  /** Absolute owedByThem at/below this is treated as paid up (default 0.005). */
  epsilon?: number
}
