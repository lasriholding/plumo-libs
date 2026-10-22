/**
 * Learn @plumo/stock — structured walkthrough (no DB).
 *
 * Run:
 *   pnpm --filter @plumo/stock learn
 */

import {
  applyStockChange,
  adjustToQuantity,
  availableQuantity,
  reservedQuantity,
  exceedsAvailable,
  mapLines,
  qtyByItem,
  diffDocumentStock,
  planStockMovements,
  classifyStockLevel,
} from "../src/index.js"

function section(title: string) {
  console.log("\n" + "=".repeat(60))
  console.log(title)
  console.log("=".repeat(60))
}

function show(label: string, value: unknown) {
  console.log(`  ${label.padEnd(32)}`, value)
}

// ---------------------------------------------------------------------------
section("1) applyStockChange — pure delta")
// ---------------------------------------------------------------------------

show("sale -3 from 10", applyStockChange(10, -3))
show("sale -15 from 10 (fail)", applyStockChange(10, -15))
show("purchase +5", applyStockChange(10, 5))

// ---------------------------------------------------------------------------
section("2) adjustToQuantity — inventory count")
// ---------------------------------------------------------------------------

show("count 7 (was 10)", adjustToQuantity(10, 7))
show("count 12 (was 10)", adjustToQuantity(10, 12))

// ---------------------------------------------------------------------------
section("3) Availability while editing a sale")
// ---------------------------------------------------------------------------

const onHand = 10
const existingLines = [{ itemId: 1, quantity: 4 }]
const reserved = reservedQuantity(existingLines, 1)
const available = availableQuantity(onHand, reserved)

show("onHand", onHand)
show("reserved on this doc", reserved)
show("available for edit", available)
show("want 12?", exceedsAvailable(12, available))
show("want 20?", exceedsAvailable(20, available))

// ---------------------------------------------------------------------------
section("4) mapLines / qtyByItem")
// ---------------------------------------------------------------------------

const raw = [
  { productId: "A", qty: 2 },
  { productId: "A", qty: 3 },
  { productId: "B", qty: 1 },
]

const lines = mapLines(raw, {
  itemId: (r) => r.productId,
  quantity: (r) => r.qty,
})

show("mapped lines", lines)
show("qtyByItem", Object.fromEntries(qtyByItem(lines)))

// ---------------------------------------------------------------------------
section("5) diffDocumentStock — prev → next")
// ---------------------------------------------------------------------------

const prev = [{ itemId: "A", quantity: 4 }]
const next = [
  { itemId: "A", quantity: 5 },
  { itemId: "B", quantity: 1 },
]

const saleDeltas = diffDocumentStock({
  prevItems: prev,
  nextItems: next,
  sign: -1,
})
show("sale deltas (sign -1)", Object.fromEntries(saleDeltas))

const purchaseDeltas = diffDocumentStock({
  prevItems: [],
  nextItems: next,
  sign: 1,
})
show("purchase deltas (sign +1)", Object.fromEntries(purchaseDeltas))

// ---------------------------------------------------------------------------
section("6) planStockMovements — history drafts")
// ---------------------------------------------------------------------------

const stocks = { A: 10, B: 2 }
const plan = planStockMovements({
  stocks,
  deltas: saleDeltas,
  kind: "outgoing",
  referenceType: "delivery_note",
  referenceId: "BL-1",
})

show("entries", plan.entries)
show("insufficient", plan.insufficient)

// ---------------------------------------------------------------------------
section("7) classifyStockLevel")
// ---------------------------------------------------------------------------

show("0", classifyStockLevel(0))
show("3 minStock=5", classifyStockLevel(3, { minStock: 5 }))
show("20 minStock=5", classifyStockLevel(20, { minStock: 5 }))
show("100 maxStock=50", classifyStockLevel(100, { maxStock: 50 }))

// ---------------------------------------------------------------------------
section("8) Reject save when insufficient")
// ---------------------------------------------------------------------------

const bad = planStockMovements({
  stocks: { A: 2 },
  deltas: { A: -5 },
  kind: "outgoing",
  referenceId: "BL-BAD",
})

show("entries (still built)", bad.entries)
show("insufficient", bad.insufficient)
if (bad.insufficient.length) {
  console.log("  → REJECT SAVE")
}

section("Done")
console.log(`
  apply          applyStockChange / adjustToQuantity
  availability   reservedQuantity / availableQuantity / exceedsAvailable
  lines          mapLines / qtyByItem
  docs           diffDocumentStock (sign ±1)
  plan           planStockMovements → history / insufficient
  classify       out | low | ok | over
`)
