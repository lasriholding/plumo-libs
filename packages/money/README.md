# `@plumo/money`

Money math, HT/TTC, parsing, locale formatting, and French amount-in-words for Plumo ERPs.

## Install

```bash
pnpm add @plumo/money
```

## Usage

```ts
import {
  configureMoney,
  calcLine,
  htToTtc,
  ttcToHt,
  money,
  parseMoney,
  amountToFrench,
} from '@plumo/money'

configureMoney({ locale: 'fr-MA', currency: 'MAD' })

calcLine({ quantity: 2, unitPrice: 50, taxRate: 20 })
// → { subtotal: 100, taxAmount: 20, total: 120 }

htToTtc(100, 20) // 120
ttcToHt(120, 20) // { ht: 100, tax: 20, ttc: 120 }

parseMoney('1 234,50 MAD') // 1234.5
money(1234.5)              // "1 234,50 MAD"
amountToFrench(120)        // "Cent vingt dirhams"
```

## API highlights

- **Math:** `roundMoney`, `addMoney`, `subMoney`, `mulMoney`, `divMoney`, `sumMoney`
- **Tax:** `taxFromHt`, `htToTtc`, `ttcToHt`, `percentOf`, `discount`
- **Lines / docs:** `calcLine`, `calcLines`, `buildTotals`
- **Format:** `money`, `moneyCurrency`, `formatMoney`, `formatPercent`, `formatDate`
- **Words:** `amountToFrench`
