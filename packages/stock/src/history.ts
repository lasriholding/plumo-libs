import { kindFromDelta } from "./apply.js"
import type {
  StockHistoryEntry,
  StockItemId,
  StockMovementKind,
  StockSnapshot,
} from "./types.js"

export function buildHistoryEntry<TId extends StockItemId>(options: {
  itemId: TId
  snapshot: StockSnapshot
  kind?: StockMovementKind
  referenceType?: string
  referenceId?: string
  reason?: string
  at?: string
  meta?: Record<string, unknown>
}): StockHistoryEntry<TId> {
  return {
    itemId: options.itemId,
    delta: options.snapshot.delta,
    quantityBefore: options.snapshot.quantityBefore,
    quantityAfter: options.snapshot.quantityAfter,
    kind: kindFromDelta(options.snapshot.delta, options.kind),
    referenceType: options.referenceType,
    referenceId: options.referenceId,
    reason: options.reason,
    at: options.at,
    meta: options.meta,
  }
}

/** Sum signed deltas from history (e.g. for stats). */
export function sumHistoryDeltas(
  entries: readonly Pick<StockHistoryEntry, "delta">[],
): { in: number; out: number; net: number } {
  let incoming = 0
  let outgoing = 0
  for (const e of entries) {
    if (e.delta > 0) incoming += e.delta
    else if (e.delta < 0) outgoing += Math.abs(e.delta)
  }
  return { in: incoming, out: outgoing, net: incoming - outgoing }
}
