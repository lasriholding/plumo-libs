/**
 * Learn @plumo/company-finance — structured walkthrough (no DB).
 *
 * Run:
 *   pnpm --filter @plumo/company-finance learn
 */

import {
  Effect,
  createRuleMapper,
  mapToLedger,
  buildBalanceFromEntries,
  buildTimeline,
  buildPeriodTimeline,
  classifyBalance,
  summarizePeriod,
} from "../src/index.js"

function section(title: string) {
  console.log("\n" + "=".repeat(60))
  console.log(title)
  console.log("=".repeat(60))
}

function show(label: string, value: unknown) {
  console.log(`  ${label.padEnd(28)}`, value)
}

// ---------------------------------------------------------------------------
section("1) Fake docs (any schema)")
// ---------------------------------------------------------------------------

type DocType =
  | "sell_delivery_note"
  | "buy_delivery_note"
  | "payment"
  | "avoir"

type FakeDoc = {
  id: number
  type: DocType
  date: string
  number: string
  total: number
  status: "draft" | "confirmed"
  paymentDirection?: "in" | "out"
  tradeSide?: "sell" | "buy"
}

const docs: FakeDoc[] = [
  {
    id: 1,
    type: "sell_delivery_note",
    date: "2026-01-01",
    number: "BL-S-1",
    total: 1000,
    status: "confirmed",
  },
  {
    id: 2,
    type: "buy_delivery_note",
    date: "2026-01-02",
    number: "BL-B-1",
    total: 400,
    status: "confirmed",
  },
  {
    id: 3,
    type: "payment",
    date: "2026-01-03",
    number: "PAY-1",
    total: 200,
    status: "confirmed",
    paymentDirection: "in",
  },
  {
    id: 4,
    type: "avoir",
    date: "2026-01-04",
    number: "AV-S-1",
    total: 100,
    status: "confirmed",
    tradeSide: "sell",
  },
  {
    id: 5,
    type: "sell_delivery_note",
    date: "2026-01-10",
    number: "BL-S-2",
    total: 300,
    status: "confirmed",
  },
]

show(
  "docs",
  docs.map((d) => `${d.number} ${d.type} ${d.total}`),
)

// ---------------------------------------------------------------------------
section("2) Map → ledger")
// ---------------------------------------------------------------------------

const mapper = createRuleMapper<FakeDoc, DocType>({
  key: (d) => d.type,
  rules: {
    sell_delivery_note: Effect.chargeThem,
    buy_delivery_note: Effect.chargeUs,
    payment: (d) =>
      d.paymentDirection === "in" ? Effect.settleThem : Effect.settleUs,
    avoir: (d) =>
      d.tradeSide === "buy" ? Effect.settleUs : Effect.settleThem,
  },
  id: (d) => d.id,
  date: (d) => d.date,
  amount: (d) => d.total,
  reference: (d) => d.number,
  skip: (d) => d.status === "draft",
})

const ledger = mapToLedger(docs, mapper)
for (const e of ledger) {
  console.log(
    `  ${e.date}  ${(e.reference ?? "").padEnd(10)}  ${e.amount}  ${JSON.stringify(e.effect)}`,
  )
}

// ---------------------------------------------------------------------------
section("3) Balance")
// ---------------------------------------------------------------------------

const balance = buildBalanceFromEntries(ledger)
show("balance", balance)
show("classifyBalance", classifyBalance(balance))

// ---------------------------------------------------------------------------
section("4) Timeline (running situation)")
// ---------------------------------------------------------------------------

const rows = buildTimeline(ledger)
console.log("  date        ref         netDelta   running.net")
for (const r of rows) {
  console.log(
    `  ${r.date}  ${(r.reference ?? "").padEnd(10)}  ${String(r.netDelta).padStart(8)}  ${String(r.running.net).padStart(11)}`,
  )
}

// ---------------------------------------------------------------------------
section("5) Period 1–7 Jan (opening / closing)")
// ---------------------------------------------------------------------------

const period = buildPeriodTimeline(ledger, {
  from: "2026-01-01",
  to: "2026-01-07",
})
show("opening", period.opening)
show(
  "period rows",
  period.rows.map((r) => [r.reference, r.running.net]),
)
show("closing", period.closing)

// ---------------------------------------------------------------------------
section("6) summarizePeriod")
// ---------------------------------------------------------------------------

show(
  "summary",
  summarizePeriod(ledger, { from: "2026-01-01", to: "2026-01-31" }),
)

section("Done")
console.log(`
  map        createRuleMapper + mapToLedger
  balance    buildBalanceFromEntries / classifyBalance
  statement  buildTimeline / buildPeriodTimeline
  totals     summarizePeriod
`)
