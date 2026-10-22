import { normalizeQty } from "./apply.js"
import type { StockItemId, StockLine } from "./types.js"

/** Sum quantities per item id (order/BL lines → map). */
export function qtyByItem<TId extends StockItemId>(
  items: readonly StockLine<TId>[] | undefined,
): Map<string, number> {
  const map = new Map<string, number>()
  for (const item of items ?? []) {
    if (item.itemId == null || item.itemId === "") continue
    const key = String(item.itemId)
    map.set(key, (map.get(key) ?? 0) + normalizeQty(item.quantity))
  }
  return map
}

/** Flexible mapper from arbitrary line shapes. */
export function mapLines<T, TId extends StockItemId = StockItemId>(
  rows: readonly T[],
  pick: {
    itemId: (row: T) => TId | null | undefined
    quantity: (row: T) => number
    skip?: (row: T) => boolean
  },
): StockLine<TId>[] {
  const out: StockLine<TId>[] = []
  for (const row of rows) {
    if (pick.skip?.(row)) continue
    const itemId = pick.itemId(row)
    if (itemId == null || itemId === "") continue
    out.push({ itemId, quantity: normalizeQty(pick.quantity(row)) })
  }
  return out
}

export function mergeQtyMaps(
  ...maps: Array<ReadonlyMap<string, number>>
): Map<string, number> {
  const out = new Map<string, number>()
  for (const map of maps) {
    for (const [id, qty] of map) {
      out.set(id, (out.get(id) ?? 0) + qty)
    }
  }
  return out
}
