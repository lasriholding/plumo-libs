import type {
  StockApplyOptions,
  StockApplyResult,
  StockMovementKind,
  StockSnapshot,
} from "./types.js"

function eps(options?: StockApplyOptions): number {
  return options?.epsilon ?? 1e-9
}

export function normalizeQty(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/** Infer history kind from signed delta when app doesn't specify. */
export function kindFromDelta(
  delta: number,
  preferred?: StockMovementKind,
): StockMovementKind {
  if (preferred === "adjustment" || preferred === "return" || preferred === "transfer") {
    return preferred
  }
  if (preferred === "incoming" || preferred === "outgoing") {
    return preferred
  }
  return delta >= 0 ? "incoming" : "outgoing"
}

/**
 * Pure apply: current stock + delta → after.
 * Does not touch a database.
 */
export function applyStockChange(
  quantityBefore: number,
  delta: number,
  options: StockApplyOptions = {},
): StockApplyResult {
  const before = normalizeQty(quantityBefore)
  const change = normalizeQty(delta)
  const allowNegative = options.allowNegative === true

  if (!Number.isFinite(before) || !Number.isFinite(change)) {
    return {
      ok: false,
      code: "invalid_quantity",
      quantityBefore: before,
      delta: change,
      available: Math.max(0, before),
      required: Math.abs(change),
    }
  }

  if (Math.abs(change) <= eps(options)) {
    return {
      ok: true,
      snapshot: { quantityBefore: before, quantityAfter: before, delta: 0 },
    }
  }

  const after = before + change
  if (!allowNegative && after < -eps(options)) {
    return {
      ok: false,
      code: "insufficient_stock",
      quantityBefore: before,
      delta: change,
      available: Math.max(0, before),
      required: Math.abs(change),
    }
  }

  return {
    ok: true,
    snapshot: {
      quantityBefore: before,
      quantityAfter: after,
      delta: change,
    },
  }
}

/** Throw-friendly wrapper for apps that prefer exceptions. */
export function applyStockChangeOrThrow(
  quantityBefore: number,
  delta: number,
  options: StockApplyOptions = {},
): StockSnapshot {
  const result = applyStockChange(quantityBefore, delta, options)
  if (!result.ok) {
    const err = new Error(
      result.code === "insufficient_stock"
        ? `Insufficient stock: available ${result.available}, required ${result.required}`
        : "Invalid stock quantity",
    )
    ;(err as Error & { code: string }).code = result.code
    throw err
  }
  return result.snapshot
}

/** Set absolute stock level (adjustment to target). */
export function adjustToQuantity(
  quantityBefore: number,
  targetQuantity: number,
  options: StockApplyOptions = {},
): StockApplyResult {
  const before = normalizeQty(quantityBefore)
  const target = normalizeQty(targetQuantity)
  return applyStockChange(before, target - before, {
    ...options,
    allowNegative: options.allowNegative ?? true,
  })
}

export function applyMany(
  stocks: ReadonlyMap<string, number> | Record<string, number>,
  deltas: ReadonlyMap<string, number> | Record<string, number>,
  options: StockApplyOptions = {},
): {
  ok: boolean
  results: Map<string, StockApplyResult>
  next: Map<string, number>
} {
  const get = (
    src: ReadonlyMap<string, number> | Record<string, number>,
    id: string,
  ): number => {
    if (src instanceof Map) return src.get(id) ?? 0
    return Object.prototype.hasOwnProperty.call(src, id)
      ? Number((src as Record<string, number>)[id]) || 0
      : 0
  }

  const ids = new Set<string>([
    ...(stocks instanceof Map ? stocks.keys() : Object.keys(stocks)),
    ...(deltas instanceof Map ? deltas.keys() : Object.keys(deltas)),
  ])

  const results = new Map<string, StockApplyResult>()
  const next = new Map<string, number>()
  let ok = true

  for (const id of ids) {
    const result = applyStockChange(get(stocks, id), get(deltas, id), options)
    results.set(id, result)
    if (result.ok) next.set(id, result.snapshot.quantityAfter)
    else {
      ok = false
      next.set(id, get(stocks, id))
    }
  }

  return { ok, results, next }
}
