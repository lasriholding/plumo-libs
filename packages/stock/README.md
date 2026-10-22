# `@plumo/stock`

Generic stock movements, adjustments, availability checks, and history planning.

**Nest / Prisma / schema agnostic.** You supply quantities and deltas; the library computes results and history drafts. Persist them in your ERP.

## Install

```bash
pnpm add @plumo/stock
```

Learn script:

```bash
pnpm --filter @plumo/stock learn
```

## Mental model

```text
on-hand qty + delta
      → applyStockChange → { before, after, delta } | insufficient

document lines (prev / next)
      → diffDocumentStock(sign ±1) → Map<itemId, delta>
      → planStockMovements → history entries to insert
```

| Sign | Use |
|------|-----|
| `+1` | Purchase / inbound / return-in |
| `-1` | Sale / outbound / delivery |

## Quick start

### Apply a change

```ts
import { applyStockChange, adjustToQuantity } from '@plumo/stock'

applyStockChange(10, -3)
// { ok: true, snapshot: { quantityBefore: 10, quantityAfter: 7, delta: -3 } }

applyStockChange(10, -15)
// { ok: false, code: 'insufficient_stock', available: 10, required: 15 }

adjustToQuantity(10, 7) // inventory count → delta -3
```

### Availability while editing a sale

```ts
import { reservedQuantity, availableQuantity, exceedsAvailable } from '@plumo/stock'

const reserved = reservedQuantity(existingLines, productId)
const available = availableQuantity(product.stock, reserved)
exceedsAvailable(wantedQty, available)
```

### Document save (sale BL qty changed)

```ts
import { diffDocumentStock, planStockMovements, applyStockChange } from '@plumo/stock'

const deltas = diffDocumentStock({
  prevItems: oldLines.map((l) => ({ itemId: l.productId, quantity: l.qty })),
  nextItems: newLines.map((l) => ({ itemId: l.productId, quantity: l.qty })),
  sign: -1, // sale
})

const { entries, insufficient } = planStockMovements({
  stocks: Object.fromEntries(products.map((p) => [String(p.id), p.stock])),
  deltas,
  referenceType: 'delivery_note',
  referenceId: bl.number,
})

if (insufficient.length) throw new Error('Stock insuffisant')

// then in a DB transaction: update product.stock + insert history from entries
for (const e of entries) {
  applyStockChange(e.quantityBefore, e.delta) // validate again if needed
}
```

### Map arbitrary lines

```ts
import { mapLines, qtyByItem } from '@plumo/stock'

const lines = mapLines(rows, {
  itemId: (r) => r.productId,
  quantity: (r) => r.quantity,
  skip: (r) => r.voided,
})
qtyByItem(lines) // Map<string, number>
```

### Stock level labels

```ts
import { classifyStockLevel, filterByStockLevel } from '@plumo/stock'

classifyStockLevel(3, { minStock: 5 }) // 'low'
classifyStockLevel(0)                  // 'out'
```

## API

| Area | Exports |
|------|---------|
| Apply | `applyStockChange`, `applyStockChangeOrThrow`, `adjustToQuantity`, `applyMany`, `kindFromDelta` |
| Availability | `reservedQuantity`, `availableQuantity`, `exceedsAvailable`, `canFulfill` |
| Lines | `qtyByItem`, `mapLines`, `mergeQtyMaps` |
| Docs | `diffDocumentStock`, `planStockMovements` |
| History | `buildHistoryEntry`, `sumHistoryDeltas` |
| Classify | `classifyStockLevel`, `isLowStock`, `filterByStockLevel` |

## What this package does *not* do

- Read/write your database
- Lock rows or run transactions
- Know product tables, orgs, or warehouses (pass ids as you like)

Keep I/O in the app; keep stock math here.

## Example

See [`examples/learn.ts`](./examples/learn.ts).
