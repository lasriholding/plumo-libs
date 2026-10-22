# plumo-libs

Shared npm packages for Plumo ERP systems.

## Packages

| Package | Purpose |
|---------|---------|
| `@plumo/money` | Money math, HT/TTC, formatting, French amount-in-words |
| `@plumo/csv` | Build, parse, Excel-FR export, browser download |
| `@plumo/print` | HTML print engine, commercial templates, preview/bulk |
| `@plumo/company-finance` | Generic company balance / ledger / situation (any schema) |

## Develop

```bash
pnpm install
pnpm build
pnpm smoke
```

## Consume

`.npmrc`:

```
@plumo:registry=https://npm.pkg.github.com
```

```bash
pnpm add @plumo/money @plumo/csv @plumo/print
```

### money

```ts
import { calcLine, htToTtc, money, amountToFrench, parseMoney } from '@plumo/money'

calcLine({ quantity: 2, unitPrice: 50, taxRate: 20 })
// → { subtotal: 100, taxAmount: 20, total: 120 }
```

### csv

```ts
import { exportToExcelCsv, parseCsv, defineCsvColumns } from '@plumo/csv'

exportToExcelCsv(rows, defineCsvColumns([
  { id: 'name', header: 'Nom', value: r => r.name },
]), { filename: 'clients' })
```

### print

```ts
import { configurePrintSettings, printCommercialDocument } from '@plumo/print'

configurePrintSettings(async () => ({
  margins: { top: 12, right: 12, bottom: 12, left: 12 },
  backgroundUrl: org.docTemplateUrl,
}))

await printCommercialDocument({
  documentType: 'invoice',
  documentNumber: 'FAC-1',
  date: '2026-10-22',
  clientName: 'ACME',
  items: [{ name: 'Service', quantity: 1, unitPrice: 120, total: 120, taxPercent: 20 }],
  subtotal: 100,
  taxAmount: 20,
  totalAmount: 120,
})
```
