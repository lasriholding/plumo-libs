import { normalizeQty } from "./apply.js"
import type { StockLevel, StockLevelOptions } from "./types.js"

export function classifyStockLevel(
  quantity: number,
  options: StockLevelOptions = {},
): StockLevel {
  const qty = normalizeQty(quantity)
  const min = options.minStock ?? 0
  const max = options.maxStock

  if (qty <= 0) return "out"
  if (max != null && qty > max) return "over"
  if (min > 0 && qty <= min) return "low"
  return "ok"
}

export function isLowStock(
  quantity: number,
  minStock: number,
): boolean {
  const level = classifyStockLevel(quantity, { minStock })
  return level === "low" || level === "out"
}

export function filterByStockLevel<T>(
  rows: readonly T[],
  getQuantity: (row: T) => number,
  level: StockLevel | "all" | undefined,
  options?: StockLevelOptions | ((row: T) => StockLevelOptions),
): T[] {
  if (!level || level === "all") return [...rows]
  return rows.filter((row) => {
    const opts = typeof options === "function" ? options(row) : options
    return classifyStockLevel(getQuantity(row), opts) === level
  })
}
