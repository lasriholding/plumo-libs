# `@plumo/csv`

CSV build/parse, Excel-FR export, and browser download helpers for Plumo ERPs.

## Install

```bash
pnpm add @plumo/csv
```

## Usage

```ts
import {
  defineCsvColumns,
  buildCsv,
  exportToExcelCsv,
  parseCsv,
  csvFormat,
} from '@plumo/csv'

const columns = defineCsvColumns([
  { id: 'name', header: 'Nom', value: (r) => r.name },
  { id: 'total', header: 'Total', value: (r) => csvFormat.money(r.total) },
])

buildCsv(rows, columns)
exportToExcelCsv(rows, columns, { filename: 'clients' }) // `;` + CRLF + BOM

const { records } = parseCsv(fileText) // auto-detects `,` / `;` / tab
```

## API highlights

- **Build:** `buildCsv`, `buildCsvFromMatrix`, `buildExcelCsv`, `defineCsvColumns`
- **Parse:** `parseCsv`, `parseCsvRecords`
- **Download:** `downloadCsv`, `exportToCsv`, `exportToExcelCsv`, `exportMappedCsv`, `csvToBlob`, `csvToUint8Array`
- **Format:** `csvFormat.date` / `money` / `text` / `bool` / `list`
