import { kindFromDelta } from "./apply.js"
import { qtyByItem } from "./lines.js"
import type {
  StockItemId,
  StockLine,
  StockMovementKind,
  StockHistoryEntry,
} from "./types.js"

export type DocumentStockSign = 1 | -1

/**
 * Diff previous vs next document lines into per-item stock deltas.
 *
 * `sign`: purchase/inbound docs = +1, sale/outbound docs = -1
 * Only counts lines that "apply" (pass your own filter before calling).
 *
 * Example (sale BL approved):
 *   prev qty A=2, next qty A=5 → delta = -1 * (5-2) = -3
 */
export function diffDocumentStock<TId extends StockItemId>(options: {
  prevItems?: readonly StockLine<TId>[] | null
  nextItems?: readonly StockLine<TId>[] | null
  /** +1 inbound (purchase), -1 outbound (sale). Default -1. */
  sign?: DocumentStockSign
}): Map<string, number> {
  const sign = options.sign ?? -1
  const before = qtyByItem(options.prevItems ?? [])
  const after = qtyByItem(options.nextItems ?? [])
  const ids = new Set([...before.keys(), ...after.keys()])
  const deltas = new Map<string, number>()

  for (const id of ids) {
    const delta = sign * ((after.get(id) ?? 0) - (before.get(id) ?? 0))
    if (delta !== 0) deltas.set(id, delta)
  }
  return deltas
}

/**
 * Build history drafts from deltas + current on-hand map.
 * Does not mutate stock — pair with `applyStockChange` / your DB write.
 */
export function planStockMovements<TId extends StockItemId = string>(options: {
  stocks: ReadonlyMap<string, number> | Record<string, number>
  deltas: ReadonlyMap<string, number> | Record<string, number>
  kind?: StockMovementKind
  referenceType?: string
  referenceId?: string
  reason?: string
  at?: string
  meta?: Record<string, unknown>
}): {
  entries: StockHistoryEntry<string>[]
  insufficient: Array<{ itemId: string; available: number; required: number }>
} {
  const getStock = (id: string): number => {
    if (options.stocks instanceof Map) return options.stocks.get(id) ?? 0
    const rec = options.stocks as Record<string, number>
    return Object.prototype.hasOwnProperty.call(rec, id) ? Number(rec[id]) || 0 : 0
  }

  const deltaEntries =
    options.deltas instanceof Map
      ? [...options.deltas.entries()]
      : Object.entries(options.deltas)

  const entries: StockHistoryEntry<string>[] = []
  const insufficient: Array<{
    itemId: string
    available: number
    required: number
  }> = []

  for (const [itemId, delta] of deltaEntries) {
    if (!delta) continue
    const quantityBefore = getStock(itemId)
    const quantityAfter = quantityBefore + delta
    if (quantityAfter < 0) {
      insufficient.push({
        itemId,
        available: Math.max(0, quantityBefore),
        required: Math.abs(delta),
      })
    }
    entries.push({
      itemId,
      delta,
      quantityBefore,
      quantityAfter,
      kind: kindFromDelta(delta, options.kind),
      referenceType: options.referenceType,
      referenceId: options.referenceId,
      reason: options.reason,
      at: options.at,
      meta: options.meta,
    })
  }

  return { entries, insufficient }
}
