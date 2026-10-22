import { normalizeQty } from "./apply.js"
import type { StockLine, StockItemId } from "./types.js"

/** Qty already reserved by the document being edited (won't double-consume). */
export function reservedQuantity<TId extends StockItemId>(
  items: readonly StockLine<TId>[] | undefined,
  itemId: TId,
): number {
  const key = String(itemId)
  return (items ?? [])
    .filter((item) => String(item.itemId) === key)
    .reduce((sum, item) => sum + normalizeQty(item.quantity), 0)
}

/**
 * Sale availability when editing a doc:
 * on-hand stock + qty this doc already reserved.
 */
export function availableQuantity(stock: number, reserved = 0): number {
  return normalizeQty(stock) + normalizeQty(reserved)
}

export function exceedsAvailable(
  quantity: number,
  available: number | undefined,
): boolean {
  if (available == null) return false
  return normalizeQty(quantity) > normalizeQty(available) + 1e-9
}

/** Can we take `need` from `stock` (optionally counting reserved)? */
export function canFulfill(
  stock: number,
  need: number,
  reserved = 0,
): boolean {
  return !exceedsAvailable(need, availableQuantity(stock, reserved))
}
