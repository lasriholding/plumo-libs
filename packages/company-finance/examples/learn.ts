/**
 * Learn @plumo/company-finance — build step by step.
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
  summarizePeriod
} from "../src/index.js"

interface FakeDoc {
  id: number
  type: 'sell_delivery_note' | 'buy_delivery_note' | 'payment' | 'avoir'
  date: string
  number: string
  total: number
  status: 'draft' | 'confirmed'
  paymentDirection?: 'in' | 'out'
  tradeSide?: 'sell' | 'buy'
}

const docs: FakeDoc[] = [
  {
    id: 1,
    type: 'sell_delivery_note',
    date: '2026-01-01',
    number: '123456',
    total: 1000,
    status: 'confirmed',
  },
  {
    id: 2,
    type: 'buy_delivery_note',
    date: '2026-01-02',
    number: '123457',
    total: 400,
    status: 'confirmed',
  },
  {
    id: 3,
    type: 'payment',
    date: '2026-01-03',
    number: 'PAY=1',
    total: 200,
    status: 'confirmed',
    paymentDirection: 'in',
  },
  {
    id: 4,
    type: 'sell_delivery_note',
    date: '2026-01-10',
    number: '123458',
    total: 300,
    status: 'confirmed',
  },
  {
    id: 5,
    type: 'avoir',
    date: '2026-01-04',
    number: 'AV-1',
    total: 100,
    status: 'confirmed',
    tradeSide: 'sell',
  }
]

const mapper = createRuleMapper<FakeDoc, FakeDoc['type']>({
  key: (d) => d.type,
  rules: {
    sell_delivery_note: Effect.chargeThem,
    buy_delivery_note: Effect.chargeUs,
    payment: (d) => 
      d.paymentDirection === 'in' ? Effect.settleThem : Effect.settleUs,
    avoir: (d) => 
      d.tradeSide === 'sell' ? Effect.settleThem : Effect.settleUs
  },
  id: (d) => d.id,
  date: (d) => d.date,
  amount: (d) => d.total,
  reference: (d) => d.number,
  skip: (d) => d.status === 'draft',
})

const ledger = mapToLedger(docs, mapper)
console.log(ledger)

const balance = buildBalanceFromEntries(ledger)
console.log('balance', balance)

const rows = buildTimeline(ledger)
for (const r of rows) {
  console.log(r.date, r.reference,'netDelta=', r.netDelta, 'running=', r.running)
}


const { opening, rows: periodRows, closing } = buildPeriodTimeline(ledger, {
  from: '2026-01-01',
  to: '2026-01-07', // only first 3 docs
})

console.log('opening', opening)
console.log('period rows', periodRows.map((r) => [r.reference, r.running.net]))
console.log('closing', closing)

console.log('state', classifyBalance(balance))

console.log('summarize period', summarizePeriod(periodRows))