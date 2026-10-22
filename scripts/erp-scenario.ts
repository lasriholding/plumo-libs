/**
 * Dynamic ERP scenario runner — auto-generates many money + stock cases.
 *
 * Usage:
 *   pnpm erp-scenario
 *   pnpm erp-scenario -- --count=20
 *   pnpm erp-scenario -- --seed=42 --count=5 --verbose
 */

import {
  configureMoney,
  calcLines,
  buildTotals,
  htToTtc,
  ttcToHt,
  discount,
  addMoney,
  roundMoney,
  money,
} from "../packages/money/src/index.js"

import {
  applyStockChange,
  adjustToQuantity,
  mapLines,
  qtyByItem,
  diffDocumentStock,
  planStockMovements,
  classifyStockLevel,
  availableQuantity,
  reservedQuantity,
  exceedsAvailable,
} from "../packages/stock/src/index.js"

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

type Cli = { seed: number; count: number; verbose: boolean }

function parseCli(argv: string[]): Cli {
  let seed = Date.now() % 1_000_000
  let count = 12
  let verbose = false
  for (const arg of argv) {
    if (arg.startsWith("--seed=")) seed = Number(arg.slice(7)) || seed
    if (arg.startsWith("--count=")) count = Math.max(1, Number(arg.slice(8)) || count)
    if (arg === "--verbose" || arg === "-v") verbose = true
  }
  return { seed, count, verbose }
}

// ---------------------------------------------------------------------------
// Seeded RNG (mulberry32)
// ---------------------------------------------------------------------------

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Rng = () => number

function int(rng: Rng, min: number, max: number) {
  return min + Math.floor(rng() * (max - min + 1))
}

function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[int(rng, 0, items.length - 1)]!
}

function chance(rng: Rng, p: number) {
  return rng() < p
}

// ---------------------------------------------------------------------------
// Domain fixtures
// ---------------------------------------------------------------------------

type Product = {
  id: string
  sku: string
  name: string
  stock: number
  minStock: number
  buyPrice: number
  sellPrice: number
  taxRate: number
}

type Line = { productId: string; qty: number; unitPrice: number }

const NAMES = [
  ["CAB", "Câble"],
  ["SWT", "Switch"],
  ["RCK", "Baie"],
  ["RTR", "Routeur"],
  ["AP", "Access Point"],
  ["HDD", "Disque"],
  ["MON", "Moniteur"],
  ["UPS", "Onduleur"],
] as const

const TAX_RATES = [0, 7, 10, 14, 20] as const

function generateCatalog(rng: Rng, size: number): Record<string, Product> {
  const catalog: Record<string, Product> = {}
  for (let i = 0; i < size; i++) {
    const [code, label] = pick(rng, NAMES)
    const id = `P${i + 1}`
    const buy = int(rng, 5, 500)
    const margin = 1.2 + rng() * 0.8
    catalog[id] = {
      id,
      sku: `${code}-${String(i + 1).padStart(2, "0")}`,
      name: `${label} #${i + 1}`,
      stock: int(rng, 5, 80),
      minStock: int(rng, 1, 10),
      buyPrice: buy,
      sellPrice: roundMoney(buy * margin),
      taxRate: pick(rng, TAX_RATES),
    }
  }
  return catalog
}

function cloneCatalog(catalog: Record<string, Product>) {
  return Object.fromEntries(
    Object.entries(catalog).map(([k, p]) => [k, { ...p }]),
  ) as Record<string, Product>
}

function onHand(catalog: Record<string, Product>) {
  return Object.fromEntries(
    Object.values(catalog).map((p) => [p.id, p.stock]),
  )
}

function randomLines(
  rng: Rng,
  catalog: Record<string, Product>,
  opts: { maxLines: number; maxQty: number; price: "buy" | "sell" },
): Line[] {
  const ids = Object.keys(catalog)
  const n = int(rng, 1, Math.min(opts.maxLines, ids.length))
  const chosen = new Set<string>()
  while (chosen.size < n) chosen.add(pick(rng, ids))
  return [...chosen].map((productId) => {
    const p = catalog[productId]!
    const base = opts.price === "buy" ? p.buyPrice : p.sellPrice
    const jitter = 0.9 + rng() * 0.2
    return {
      productId,
      qty: int(rng, 1, opts.maxQty),
      unitPrice: roundMoney(base * jitter),
    }
  })
}

// ---------------------------------------------------------------------------
// Stock apply helper
// ---------------------------------------------------------------------------

function applyDeltas(
  catalog: Record<string, Product>,
  deltas: Map<string, number> | Record<string, number>,
  meta: { kind: string; referenceId: string },
): { ok: true } | { ok: false; insufficient: unknown } {
  const plan = planStockMovements({
    stocks: onHand(catalog),
    deltas,
    kind: meta.kind,
    referenceId: meta.referenceId,
  })
  if (plan.insufficient.length) {
    return { ok: false, insufficient: plan.insufficient }
  }
  for (const e of plan.entries) {
    const product = catalog[e.itemId]
    if (!product) throw new Error(`Unknown product ${e.itemId}`)
    const result = applyStockChange(product.stock, e.delta)
    if (!result.ok) {
      return {
        ok: false,
        insufficient: [
          {
            itemId: e.itemId,
            available: result.available,
            required: result.required,
          },
        ],
      }
    }
    product.stock = result.snapshot.quantityAfter
  }
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Invariant checks (money)
// ---------------------------------------------------------------------------

function checkMoneyInvariants(lines: Line[], taxByProduct: Record<string, number>) {
  const calc = calcLines(
    lines.map((l) => ({
      quantity: l.qty,
      unitPrice: l.unitPrice,
      taxRate: taxByProduct[l.productId] ?? 20,
    })),
  )
  const header = buildTotals({
    subtotal: calc.subtotal,
    taxAmount: calc.taxAmount,
  })

  // Manual expected
  let expSub = 0
  let expTax = 0
  for (const l of lines) {
    const line = calcLines([
      {
        quantity: l.qty,
        unitPrice: l.unitPrice,
        taxRate: taxByProduct[l.productId] ?? 20,
      },
    ])
    expSub = addMoney(expSub, line.subtotal)
    expTax = addMoney(expTax, line.taxAmount)
  }
  if (calc.subtotal !== expSub || calc.taxAmount !== expTax) {
    throw new Error(
      `Money line sum mismatch: got ${calc.subtotal}/${calc.taxAmount} expected ${expSub}/${expTax}`,
    )
  }
  if (header.totalAmount !== addMoney(header.subtotal, header.taxAmount)) {
    throw new Error("Header TTC != HT + TVA")
  }

  const rate = 20
  const ttc = htToTtc(100, rate)
  const back = ttcToHt(ttc, rate)
  if (back.ht !== 100 || back.tax !== 20) {
    throw new Error("HT↔TTC round-trip failed")
  }

  const d = discount(200, 10)
  if (d !== 180) throw new Error("discount(200,10) expected 180")

  return { calc, header }
}

// ---------------------------------------------------------------------------
// Scenario kinds
// ---------------------------------------------------------------------------

type ScenarioResult = {
  name: string
  seed: number
  ok: boolean
  detail: string
}

function runPurchaseScenario(
  rng: Rng,
  seed: number,
  verbose: boolean,
): ScenarioResult {
  const name = "purchase-inbound"
  const catalog = generateCatalog(rng, int(rng, 3, 6))
  const before = { ...onHand(catalog) }
  const lines = randomLines(rng, catalog, {
    maxLines: 3,
    maxQty: 15,
    price: "buy",
  })
  const taxBy = Object.fromEntries(
    Object.values(catalog).map((p) => [p.id, p.taxRate]),
  )
  const moneyResult = checkMoneyInvariants(lines, taxBy)

  const stockLines = mapLines(lines, {
    itemId: (l) => l.productId,
    quantity: (l) => l.qty,
  })
  const deltas = diffDocumentStock({
    prevItems: [],
    nextItems: stockLines,
    sign: 1,
  })
  const applied = applyDeltas(catalog, deltas, {
    kind: "incoming",
    referenceId: `PO-${seed}`,
  })
  if (!applied.ok) {
    return { name, seed, ok: false, detail: "unexpected insufficient on purchase" }
  }

  for (const [id, delta] of deltas) {
    const expected = before[id]! + delta
    if (catalog[id]!.stock !== expected) {
      return {
        name,
        seed,
        ok: false,
        detail: `${id} stock ${catalog[id]!.stock} != ${expected}`,
      }
    }
  }

  if (verbose) {
    console.log(`    money TTC ${money(moneyResult.header.totalAmount)}`)
    console.log(`    stock`, onHand(catalog))
  }
  return {
    name,
    seed,
    ok: true,
    detail: `+${[...deltas.values()].reduce((a, b) => a + b, 0)} units, TTC ${moneyResult.header.totalAmount}`,
  }
}

function runSaleScenario(
  rng: Rng,
  seed: number,
  verbose: boolean,
): ScenarioResult {
  const name = "sale-outbound"
  const catalog = generateCatalog(rng, int(rng, 3, 6))
  // Ensure enough stock for a small sale
  for (const p of Object.values(catalog)) {
    p.stock = Math.max(p.stock, 30)
  }
  const before = { ...onHand(catalog) }
  const lines = randomLines(rng, catalog, {
    maxLines: 3,
    maxQty: 8,
    price: "sell",
  })
  // Cap qty to available
  for (const l of lines) {
    l.qty = Math.min(l.qty, catalog[l.productId]!.stock)
  }

  const taxBy = Object.fromEntries(
    Object.values(catalog).map((p) => [p.id, p.taxRate]),
  )
  checkMoneyInvariants(lines, taxBy)

  const stockLines = mapLines(lines, {
    itemId: (l) => l.productId,
    quantity: (l) => l.qty,
  })

  // Availability while "editing" (reserved = same lines)
  for (const l of stockLines) {
    const reserved = reservedQuantity(stockLines, l.itemId)
    const available = availableQuantity(catalog[String(l.itemId)]!.stock, reserved)
    if (exceedsAvailable(l.quantity, available)) {
      return {
        name,
        seed,
        ok: false,
        detail: `availability check failed for ${l.itemId}`,
      }
    }
  }

  const deltas = diffDocumentStock({
    prevItems: [],
    nextItems: stockLines,
    sign: -1,
  })
  const applied = applyDeltas(catalog, deltas, {
    kind: "outgoing",
    referenceId: `SO-${seed}`,
  })
  if (!applied.ok) {
    return { name, seed, ok: false, detail: "sale should have succeeded" }
  }

  for (const [id, delta] of deltas) {
    const expected = before[id]! + delta
    if (catalog[id]!.stock !== expected) {
      return {
        name,
        seed,
        ok: false,
        detail: `${id} stock mismatch after sale`,
      }
    }
  }

  if (verbose) console.log(`    stock after sale`, onHand(catalog))
  return {
    name,
    seed,
    ok: true,
    detail: `sold ${stockLines.length} SKUs`,
  }
}

function runEditBlScenario(
  rng: Rng,
  seed: number,
  verbose: boolean,
): ScenarioResult {
  const name = "sale-bl-edit"
  const catalog = generateCatalog(rng, 4)
  for (const p of Object.values(catalog)) p.stock = 50

  const ids = Object.keys(catalog)
  const productId = pick(rng, ids)
  const qty1 = int(rng, 2, 10)
  const qty2 = qty1 + int(rng, 1, 8)

  const prev = [{ itemId: productId, quantity: qty1 }]
  const next = [{ itemId: productId, quantity: qty2 }]

  // First commit qty1
  let deltas = diffDocumentStock({ prevItems: [], nextItems: prev, sign: -1 })
  let applied = applyDeltas(catalog, deltas, {
    kind: "outgoing",
    referenceId: `BL-${seed}-v1`,
  })
  if (!applied.ok) {
    return { name, seed, ok: false, detail: "v1 apply failed" }
  }
  const afterV1 = catalog[productId]!.stock

  // Edit to qty2 → only delta -(qty2-qty1)
  deltas = diffDocumentStock({ prevItems: prev, nextItems: next, sign: -1 })
  const expectedDelta = -(qty2 - qty1)
  if (deltas.get(productId) !== expectedDelta) {
    return {
      name,
      seed,
      ok: false,
      detail: `edit delta ${deltas.get(productId)} != ${expectedDelta}`,
    }
  }
  applied = applyDeltas(catalog, deltas, {
    kind: "outgoing",
    referenceId: `BL-${seed}-v2`,
  })
  if (!applied.ok) {
    return { name, seed, ok: false, detail: "v2 apply failed" }
  }
  if (catalog[productId]!.stock !== afterV1 + expectedDelta) {
    return { name, seed, ok: false, detail: "stock after edit wrong" }
  }

  if (verbose) {
    console.log(`    ${productId} ${qty1}→${qty2}, stock ${catalog[productId]!.stock}`)
  }
  return {
    name,
    seed,
    ok: true,
    detail: `${productId} ${qty1}→${qty2}`,
  }
}

function runOversellRejectScenario(
  rng: Rng,
  seed: number,
  verbose: boolean,
): ScenarioResult {
  const name = "oversell-reject"
  const catalog = generateCatalog(rng, 3)
  const id = Object.keys(catalog)[0]!
  catalog[id]!.stock = int(rng, 2, 8)
  const want = catalog[id]!.stock + int(rng, 5, 20)
  const before = catalog[id]!.stock

  const deltas = diffDocumentStock({
    prevItems: [],
    nextItems: [{ itemId: id, quantity: want }],
    sign: -1,
  })
  const plan = planStockMovements({
    stocks: onHand(catalog),
    deltas,
    kind: "outgoing",
    referenceId: `BAD-${seed}`,
  })
  if (!plan.insufficient.length) {
    return { name, seed, ok: false, detail: "expected insufficient" }
  }
  // Do not apply — stock unchanged
  if (catalog[id]!.stock !== before) {
    return { name, seed, ok: false, detail: "stock mutated on reject" }
  }
  if (verbose) {
    console.log(`    reject ${id}: have ${before}, want ${want}`)
  }
  return {
    name,
    seed,
    ok: true,
    detail: `rejected ${id} need ${want} have ${before}`,
  }
}

function runInventoryAdjustScenario(
  rng: Rng,
  seed: number,
  verbose: boolean,
): ScenarioResult {
  const name = "inventory-adjust"
  const catalog = generateCatalog(rng, 3)
  const id = pick(rng, Object.keys(catalog))
  const before = catalog[id]!.stock
  const counted = int(rng, 0, before + 5)
  const adj = adjustToQuantity(before, counted)
  if (!adj.ok) {
    return { name, seed, ok: false, detail: "adjustToQuantity failed" }
  }
  if (adj.snapshot.delta !== counted - before) {
    return { name, seed, ok: false, detail: "wrong adjustment delta" }
  }
  const result = applyStockChange(before, adj.snapshot.delta, {
    allowNegative: true,
  })
  if (!result.ok || result.snapshot.quantityAfter !== counted) {
    return { name, seed, ok: false, detail: "apply adjustment failed" }
  }
  catalog[id]!.stock = result.snapshot.quantityAfter

  const level = classifyStockLevel(catalog[id]!.stock, {
    minStock: catalog[id]!.minStock,
  })
  if (verbose) {
    console.log(`    ${id} ${before}→${counted} level=${level}`)
  }
  return {
    name,
    seed,
    ok: true,
    detail: `${id} ${before}→${counted} (${level})`,
  }
}

function runFullDayScenario(
  rng: Rng,
  seed: number,
  verbose: boolean,
): ScenarioResult {
  const name = "full-trading-day"
  const catalog = generateCatalog(rng, int(rng, 4, 7))
  for (const p of Object.values(catalog)) {
    p.stock = int(rng, 20, 60)
  }
  const start = cloneCatalog(catalog)

  // Purchase
  const buy = randomLines(rng, catalog, {
    maxLines: 3,
    maxQty: 12,
    price: "buy",
  })
  const buyLines = mapLines(buy, {
    itemId: (l) => l.productId,
    quantity: (l) => l.qty,
  })
  let deltas = diffDocumentStock({
    prevItems: [],
    nextItems: buyLines,
    sign: 1,
  })
  let applied = applyDeltas(catalog, deltas, {
    kind: "incoming",
    referenceId: `DAY-BUY-${seed}`,
  })
  if (!applied.ok) {
    return { name, seed, ok: false, detail: "day purchase failed" }
  }

  const taxBy = Object.fromEntries(
    Object.values(catalog).map((p) => [p.id, p.taxRate]),
  )
  const buyMoney = checkMoneyInvariants(buy, taxBy)

  // Sale (capped)
  const sell = randomLines(rng, catalog, {
    maxLines: 3,
    maxQty: 10,
    price: "sell",
  })
  for (const l of sell) {
    l.qty = Math.min(l.qty, Math.max(1, Math.floor(catalog[l.productId]!.stock * 0.4)))
  }
  const sellLines = mapLines(sell, {
    itemId: (l) => l.productId,
    quantity: (l) => l.qty,
  })
  deltas = diffDocumentStock({
    prevItems: [],
    nextItems: sellLines,
    sign: -1,
  })
  applied = applyDeltas(catalog, deltas, {
    kind: "outgoing",
    referenceId: `DAY-SELL-${seed}`,
  })
  if (!applied.ok) {
    return { name, seed, ok: false, detail: "day sale failed" }
  }
  const sellMoney = checkMoneyInvariants(sell, taxBy)

  // Optional promo on sale TTC
  const promoPct = pick(rng, [0, 5, 10])
  const afterPromo =
    promoPct === 0
      ? sellMoney.header.totalAmount
      : discount(sellMoney.header.totalAmount, promoPct)

  // Inventory tweak on random SKU
  const id = pick(rng, Object.keys(catalog))
  const counted = Math.max(0, catalog[id]!.stock + int(rng, -3, 3))
  const adj = adjustToQuantity(catalog[id]!.stock, counted)
  if (adj.ok) {
    const r = applyStockChange(catalog[id]!.stock, adj.snapshot.delta, {
      allowNegative: true,
    })
    if (r.ok) catalog[id]!.stock = r.snapshot.quantityAfter
  }

  // Totals consistency: purchase increased stock vs start
  for (const [pid, qty] of qtyByItem(buyLines)) {
    const expectedMin = start[pid]!.stock + qty - (qtyByItem(sellLines).get(pid) ?? 0) - 10
    // loose bound — inventory adjust can move ±3
    if (catalog[pid]!.stock < expectedMin) {
      // only fail hard if way off
      if (catalog[pid]!.stock < start[pid]!.stock + qty - (qtyByItem(sellLines).get(pid) ?? 0) - 5) {
        return {
          name,
          seed,
          ok: false,
          detail: `inconsistent stock for ${pid}`,
        }
      }
    }
  }

  if (verbose) {
    console.log(`    buy TTC ${money(buyMoney.header.totalAmount)}`)
    console.log(`    sell TTC ${money(sellMoney.header.totalAmount)} promo→ ${money(afterPromo)}`)
    console.log(`    end stock`, onHand(catalog))
  }

  return {
    name,
    seed,
    ok: true,
    detail: `buy ${buy.length} / sell ${sell.length} / promo ${promoPct}%`,
  }
}

const SCENARIO_BUILDERS = [
  runPurchaseScenario,
  runSaleScenario,
  runEditBlScenario,
  runOversellRejectScenario,
  runInventoryAdjustScenario,
  runFullDayScenario,
] as const

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

function main() {
  configureMoney({ locale: "fr-MA", currency: "MAD", fractionDigits: 2 })
  const cli = parseCli(process.argv.slice(2))
  const rootRng = mulberry32(cli.seed)

  console.log("═".repeat(72))
  console.log(`  ERP dynamic scenarios`)
  console.log(`  seed=${cli.seed}  count=${cli.count}  verbose=${cli.verbose}`)
  console.log("═".repeat(72))

  const results: ScenarioResult[] = []
  let failed = 0

  for (let i = 0; i < cli.count; i++) {
    const caseSeed = (cli.seed + i * 9973) >>> 0
    const rng = mulberry32(caseSeed)
    const builder = pick(rootRng, SCENARIO_BUILDERS)
    // re-seed builder rng from caseSeed for reproducibility of that case alone
    const caseRng = mulberry32(caseSeed)
    let result: ScenarioResult
    try {
      result = builder(caseRng, caseSeed, cli.verbose)
    } catch (err) {
      result = {
        name: builder.name.replace("run", "").replace("Scenario", ""),
        seed: caseSeed,
        ok: false,
        detail: err instanceof Error ? err.message : String(err),
      }
    }
    results.push(result)
    const mark = result.ok ? "PASS" : "FAIL"
    if (!result.ok) failed++
    console.log(
      `  [${String(i + 1).padStart(2, "0")}/${cli.count}] ${mark}  ${result.name.padEnd(22)} seed=${caseSeed}  ${result.detail}`,
    )
  }

  const byName = new Map<string, { pass: number; fail: number }>()
  for (const r of results) {
    const row = byName.get(r.name) ?? { pass: 0, fail: 0 }
    if (r.ok) row.pass++
    else row.fail++
    byName.set(r.name, row)
  }

  console.log("\n" + "─".repeat(72))
  console.log("  Coverage")
  for (const [name, row] of [...byName.entries()].sort()) {
    console.log(`    ${name.padEnd(22)} pass=${row.pass} fail=${row.fail}`)
  }
  console.log("─".repeat(72))
  console.log(
    failed === 0
      ? `  ALL ${cli.count} SCENARIOS PASSED`
      : `  ${failed}/${cli.count} FAILED`,
  )
  console.log("═".repeat(72))

  if (failed > 0) process.exit(1)
}

main()
