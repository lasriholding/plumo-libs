/** Product / SKU id — string or number, app decides. */
export type StockItemId = string | number

/**
 * Semantic movement kind (optional label for history).
 * Sign of the quantity change still comes from `delta`.
 */
export type StockMovementKind =
  | "incoming"
  | "outgoing"
  | "adjustment"
  | "return"
  | "transfer"
  | "reservation"
  | string

export type StockApplyOptions = {
  /** Disallow result < 0 (default true). */
  allowNegative?: boolean
  /** Treat tiny floats as zero (default 1e-9). */
  epsilon?: number
}

export type StockSnapshot = {
  quantityBefore: number
  quantityAfter: number
  delta: number
}

export type StockApplyResult =
  | { ok: true; snapshot: StockSnapshot }
  | {
      ok: false
      code: "insufficient_stock" | "invalid_quantity"
      quantityBefore: number
      delta: number
      available: number
      required: number
    }

/** Normalized history row — persist however you want. */
export type StockHistoryEntry<TId extends StockItemId = StockItemId> = {
  itemId: TId
  delta: number
  quantityBefore: number
  quantityAfter: number
  kind: StockMovementKind
  referenceType?: string
  referenceId?: string
  reason?: string
  at?: string
  meta?: Record<string, unknown>
}

export type StockLine<TId extends StockItemId = StockItemId> = {
  itemId: TId
  quantity: number
}

export type StockLevel = "ok" | "low" | "out" | "over"

export type StockLevelOptions = {
  /** At or below this → low (default 0 means only out/ok). */
  minStock?: number
  /** Above this → over (optional). */
  maxStock?: number
}
