# `@plumo/company-finance`

Schema-agnostic company AR/AP balances, ledger mapping, and account statements for Plumo ERPs.

**Not tied to Nest, Prisma, Clerk, or any document table.** You map *your* docs into a normalized ledger; the library only does the math.

Depends on [`@plumo/money`](../money).

---

## Install

```bash
pnpm add @plumo/company-finance
```

Local learn script (no DB):

```bash
pnpm --filter @plumo/company-finance learn
```

---

## Mental model

```text
your docs (any shape)
      │  createRuleMapper / createFieldMapper
      ▼
 LedgerEntry[]          ← amount + effect + date
      │
      ├─ buildBalanceFromEntries  → CompanyBalance
      ├─ buildTimeline            → running statement rows
      ├─ buildPeriodTimeline      → opening / period / closing
      ├─ summarizePeriod          → totals buckets + balance
      └─ classifyBalance          → they_owe | we_owe | both | balanced
```

### Balance sides

| Field | Meaning |
|-------|---------|
| `owedByThem` | Receivable — they owe us |
| `owedByUs` | Payable — we owe them |
| `net` | `owedByThem - owedByUs` (positive ⇒ net receivable) |

### Formula

```text
owedByThem = charges_to_them − settlements_on_them
owedByUs   = charges_to_us   − settlements_on_us
net        = owedByThem − owedByUs
```

Typical ERP mapping:

```text
owedByThem = sales − sale_returns − payments_in
owedByUs   = purchases − purchase_returns − payments_out
```

### Effects

| Effect | Meaning | Typical docs |
|--------|---------|--------------|
| `Effect.chargeThem` | + receivable | sell BL / sale invoice |
| `Effect.chargeUs` | + payable | buy BL / purchase invoice |
| `Effect.settleThem` | − receivable | payment in / sale avoir |
| `Effect.settleUs` | − payable | payment out / buy avoir |
| `delta(them, us)` | raw adjustment | manual journal |
| `netEffect(+1\|-1)` | net-only shortcut | rare |

`amount` is the magnitude; **sign comes from the effect**.

---

## Quick start

### 1. Map your documents

```ts
import {
  Effect,
  createRuleMapper,
  mapToLedger,
  buildBalanceFromEntries,
  buildTimeline,
  classifyBalance,
} from '@plumo/company-finance'

type Doc = {
  id: number
  type: 'sell_delivery_note' | 'buy_delivery_note' | 'payment' | 'avoir'
  date: string
  number: string
  total: number
  status: 'draft' | 'confirmed'
  paymentDirection?: 'in' | 'out'
  tradeSide?: 'sell' | 'buy'
}

const mapper = createRuleMapper<Doc, Doc['type']>({
  key: (d) => d.type,
  rules: {
    sell_delivery_note: Effect.chargeThem,
    buy_delivery_note: Effect.chargeUs,
    payment: (d) =>
      d.paymentDirection === 'in' ? Effect.settleThem : Effect.settleUs,
    avoir: (d) =>
      d.tradeSide === 'buy' ? Effect.settleUs : Effect.settleThem,
  },
  id: (d) => d.id,
  date: (d) => d.date,
  amount: (d) => d.total,
  reference: (d) => d.number,
  skip: (d) => d.status === 'draft',
})

const ledger = mapToLedger(docs, mapper)
const balance = buildBalanceFromEntries(ledger)
// { owedByThem, owedByUs, net }

classifyBalance(balance) // 'both' | 'they_owe' | 'we_owe' | 'balanced'
```

### 2. Account statement (timeline)

```ts
const rows = buildTimeline(ledger)

for (const r of rows) {
  // r.netDelta  → impact of this doc on net
  // r.running   → balance after this doc
  console.log(r.date, r.reference, r.netDelta, r.running.net)
}
```

### 3. Period situation (opening / closing)

```ts
import { buildPeriodTimeline } from '@plumo/company-finance'

const { opening, rows, closing } = buildPeriodTimeline(ledger, {
  from: '2026-01-01',
  to: '2026-01-31',
})
```

- **opening** — balance of entries with `date < from`
- **rows** — entries inside `[from, to]` with running balance from opening
- **closing** — balance after the last period row

### 4. Totals for header cards

```ts
import { summarizePeriod } from '@plumo/company-finance'

const { buckets, balance } = summarizePeriod(ledger, {
  from: '2026-01-01',
  to: '2026-01-31',
})
// buckets.chargeThem / chargeUs / settleThem / settleUs / count
```

### 5. Aggregates only (no ledger)

When SQL already summed the buckets:

```ts
import { buildBalanceFromTotals } from '@plumo/company-finance'

buildBalanceFromTotals({
  chargedToThem: 1000,
  chargedToUs: 400,
  settledByThem: 300,
  settledByUs: 100,
})
// → { owedByThem: 700, owedByUs: 300, net: 400 }
```

---

## Mapping options

| Helper | When |
|--------|------|
| `createRuleMapper` | Stable doc `type` → effect table (most ERPs) |
| `createFieldMapper` | Fully custom `effect(item)` logic |
| `mapToLedger(items, fn)` | Manual one-off mapper |

Rule values can be a fixed `LedgerEffect` or a function `(item) => LedgerEffect | null`.

Return `null` from `effect` / use `skip` to ignore rows (drafts, cancelled, …).

---

## Company list filters

### AR / AP side

```ts
import { classifyBalance, filterByBalanceState } from '@plumo/company-finance'

filterByBalanceState(companies, (c) => c.balance, 'they_owe')
```

| State | Meaning |
|-------|---------|
| `they_owe` | only receivable |
| `we_owe` | only payable |
| `both` | both sides non-zero |
| `balanced` | both ~0 (within epsilon) |

### Credit / threshold

Compares `owedByThem` to a company credit limit (`threshold`).

```ts
import {
  creditLimitStatus,
  matchesCreditLimitState,
} from '@plumo/company-finance'

creditLimitStatus(balance, company.threshold)
// 'allPaidUp' | 'nearCreditLimit' | 'exceededCreditLimit' | null

matchesCreditLimitState(balance, company.threshold, 'nearCreditLimit')
```

| State | Meaning |
|-------|---------|
| `allPaidUp` | `owedByThem` ≤ epsilon |
| `nearCreditLimit` | ≥ `nearRatio` × threshold and < threshold (default ratio 0.8) |
| `exceededCreditLimit` | ≥ threshold (threshold must be > 0) |
| `null` (status only) | owing but under the near band, or no threshold |

---

## Batch helpers

```ts
import { balancesByGroup, indexBalances, balanceOrEmpty } from '@plumo/company-finance'

// one balance per companyId stored in entry.meta
const byCompany = balancesByGroup(ledger, (e) => String(e.meta?.companyId))

const map = indexBalances([{ id: 12, balance }])
balanceOrEmpty(map, 12)
```

---

## API surface

| Area | Exports |
|------|---------|
| Types | `LedgerEntry`, `LedgerEffect`, `CompanyBalance`, `TimelineRow`, `PeriodFilter`, `BalanceState`, `CreditLimitState`, `CreditLimitOptions` |
| Effects | `Effect`, `charge`, `settle`, `delta`, `netEffect`, `entryDelta`, `netDelta` |
| Map | `mapToLedger`, `createRuleMapper`, `createFieldMapper` |
| Balance | `buildBalanceFromTotals`, `buildBalanceFromEntries`, `balanceOf`, `emptyBalance`, `applyDelta`, `mergeBalances`, `indexBalances`, `balanceOrEmpty`, `invertBalance`, `isBalanced` |
| Timeline | `buildTimeline`, `buildPeriodTimeline`, `filterEntriesByPeriod`, `sortEntries` |
| Period | `summarizeEntries`, `summarizePeriod`, `groupEntries`, `balancesByGroup` |
| Classify | `classifyBalance`, `matchesBalanceState`, `filterByBalanceState`, `creditLimitStatus`, `matchesCreditLimitState` |

---

## What this package does *not* do

- Load documents from a database
- Know Nest guards, Prisma models, or Clerk orgs
- Render HTML / PDF (use `@plumo/print` for that)
- Enforce approval workflows or document status machines beyond what you put in `skip`

Keep I/O and schema in the ERP app; keep debt math here.

---

## Example file

See [`examples/learn.ts`](./examples/learn.ts) for a full in-memory walkthrough.
