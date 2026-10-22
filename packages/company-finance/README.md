# `@plumo/company-finance`

Generic company balance, ledger, and situation math. **Not tied to Nest, Prisma, or any ERP schema** — you map your documents into ledger entries.

Depends on `@plumo/money`.

## Install

```bash
pnpm add @plumo/company-finance
```

## Concepts

| Term | Meaning |
|------|---------|
| `owedByThem` | Receivable — they owe us |
| `owedByUs` | Payable — we owe them |
| `net` | `owedByThem - owedByUs` |
| `charge` | Increases a side (invoice / BL) |
| `settle` | Decreases a side (payment / credit note) |

## Quick start — aggregates

```ts
import { buildBalanceFromTotals } from '@plumo/company-finance'

buildBalanceFromTotals({
  chargedToThem: 1000, // sales
  chargedToUs: 400,    // purchases
  settledByThem: 200,  // incoming payments / sale returns
  settledByUs: 50,     // outgoing payments / purchase returns
})
// → { owedByThem: 800, owedByUs: 350, net: 450 }
```

## Any structure via mapper

```ts
import {
  mapToLedger,
  createRuleMapper,
  Effect,
  buildTimeline,
  buildBalanceFromEntries,
} from '@plumo/company-finance'

type MyDoc = {
  id: string
  kind: 'sale' | 'purchase' | 'pay_in' | 'pay_out'
  when: string
  total: number
  ref: string
}

const mapper = createRuleMapper<MyDoc, MyDoc['kind']>({
  key: (d) => d.kind,
  rules: {
    sale: Effect.chargeThem,
    purchase: Effect.chargeUs,
    pay_in: Effect.settleThem,
    pay_out: Effect.settleUs,
  },
  id: (d) => d.id,
  date: (d) => d.when,
  amount: (d) => d.total,
  reference: (d) => d.ref,
  meta: (d) => ({ kind: d.kind }),
})

const ledger = mapToLedger(docs, mapper)
const balance = buildBalanceFromEntries(ledger)
const rows = buildTimeline(ledger) // running balance per row
```

## Field mapper (fully custom effects)

```ts
import { createFieldMapper, mapToLedger, charge, settle } from '@plumo/company-finance'

const mapper = createFieldMapper<AnyRow>({
  date: (r) => r.postedAt.slice(0, 10),
  amount: (r) => r.amountTtc,
  effect: (r) => {
    if (r.type === 'X') return charge('owedByThem')
    if (r.type === 'Y') return settle('owedByUs')
    return { kind: 'delta', owedByThem: r.ar, owedByUs: r.ap }
  },
})
```

## Period statement

```ts
import { buildPeriodTimeline, summarizePeriod } from '@plumo/company-finance'

const { opening, rows, closing } = buildPeriodTimeline(ledger, {
  from: '2026-01-01',
  to: '2026-01-31',
})
```

## Balance filters

```ts
import { classifyBalance, filterByBalanceState } from '@plumo/company-finance'

classifyBalance(balance) // 'balanced' | 'they_owe' | 'we_owe' | 'both'
filterByBalanceState(companies, (c) => c.balance, 'they_owe')
```
