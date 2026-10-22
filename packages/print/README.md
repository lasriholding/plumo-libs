# `@plumo/print`

HTML browser print engine for Plumo commercial documents (classic ledger + invoice-style templates).

Depends on `@plumo/money`.

## Install

```bash
pnpm add @plumo/print
```

## Setup

```ts
import { configurePrintSettings, configurePrintTheme } from '@plumo/print'

configurePrintSettings(async () => ({
  margins: { top: 12, right: 12, bottom: 12, left: 12 },
  backgroundUrl: org.docTemplateUrl,
}))

configurePrintTheme({ primary: '#0f172a' })
```

## Usage

```ts
import {
  printCommercialDocument,
  printCommercialDocuments,
  previewCommercialDocument,
  renderDocument,
  printDocumentHtml,
} from '@plumo/print'

await printCommercialDocument({
  documentType: 'invoice',
  documentNumber: 'FAC-1',
  date: '2026-10-22',
  clientName: 'ACME',
  items: [
    { name: 'Service', quantity: 1, unitPrice: 120, total: 120, taxPercent: 20 },
  ],
  subtotal: 100,
  taxAmount: 20,
  totalAmount: 120,
  showSignatures: true,
})

// Bulk
await printCommercialDocuments([docA, docB])

// HTML string only (no print dialog)
const html = await previewCommercialDocument(doc)
```

## API highlights

- **Classic:** `renderDocument`, `mapProductLines`, `printDocumentHtml`, `runPrint`
- **Commercial:** `renderCommercialDocument`, `printCommercialDocument`, `printCommercialDocuments`
- **Preview:** `buildPrintHtml`, `openPrintPreview`, `previewCommercialDocument`
- **Config:** `configurePrintSettings`, `configurePrintTheme`, `PAGE_SIZES`
