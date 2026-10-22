export type {
  StockItemId,
  StockMovementKind,
  StockApplyOptions,
  StockSnapshot,
  StockApplyResult,
  StockHistoryEntry,
  StockLine,
  StockLevel,
  StockLevelOptions,
} from "./types.js"

export {
  normalizeQty,
  kindFromDelta,
  applyStockChange,
  applyStockChangeOrThrow,
  adjustToQuantity,
  applyMany,
} from "./apply.js"

export {
  reservedQuantity,
  availableQuantity,
  exceedsAvailable,
  canFulfill,
} from "./availability.js"

export { qtyByItem, mapLines, mergeQtyMaps } from "./lines.js"

export {
  diffDocumentStock,
  planStockMovements,
  type DocumentStockSign,
} from "./diff.js"

export {
  classifyStockLevel,
  isLowStock,
  filterByStockLevel,
} from "./classify.js"

export { buildHistoryEntry, sumHistoryDeltas } from "./history.js"
