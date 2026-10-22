# Plumo libs inventory

Monorepo: `plumo-libs`  
Stack target: Nest API + Next app + Prisma + Postgres + Clerk (OBS-shaped)

## Packages

| Package | Version | Path | Depends on |
|---------|---------|------|------------|
| `@plumo/money` | `0.1.0` | [`packages/money`](packages/money) | — |
| `@plumo/csv` | `0.1.0` | [`packages/csv`](packages/csv) | — |
| `@plumo/print` | `0.1.0` | [`packages/print`](packages/print) | `@plumo/money` |
| `@plumo/company-finance` | `0.1.0` | [`packages/company-finance`](packages/company-finance) | `@plumo/money` |

---

### `@plumo/money`

Currency math and display for Moroccan ERP docs.

| Area | Exports |
|------|---------|
| Config | `configureMoney`, `getMoneyConfig`, `resetMoneyConfig` |
| Core | `roundMoney`, `toMoney`, `parseMoney`, `isFiniteMoney`, `compareMoney`, `clampMoney` |
| Arithmetic | `addMoney`, `subMoney`, `mulMoney`, `divMoney`, `sumMoney` |
| Tax / % | `percentOf`, `applyPercent`, `discount`, `taxFromHt`, `htToTtc`, `ttcToHt` |
| Lines / docs | `calcLine`, `calcLines`, `buildTotals` |
| Format | `money`, `moneyCurrency`, `formatMoney`, `moneyFmt`, `formatPercent`, `formatDate`, `escapeHtml` |
| Words | `amountToFrench` |

**Extracted from**

- BHL: `old_projects/bhl/src/lib/print/format.ts`
- OBS: amount-in-words + HT/TTC helpers in `old_projects/obs/obs-app/obs-app/src/lib/print.ts`
- Shared totals: OBS `document-totals.util.ts` / `custom-line-items.util.ts` (folded here; no separate package)

---

### `@plumo/csv`

Build, parse, and download CSV (including Excel FR).

| Area | Exports |
|------|---------|
| Build | `buildCsv`, `buildCsvFromMatrix`, `buildExcelCsv`, `defineCsvColumns`, `escapeCsvCell`, `activeColumns` |
| Parse | `parseCsv`, `parseCsvRecords` |
| Download | `downloadCsv`, `csvToBlob`, `csvToUint8Array`, `csvFilename`, `exportToCsv`, `exportToExcelCsv`, `exportMappedCsv` |
| Format | `csvFormat` (`date`, `datetime`, `money`, `number`, `text`, `bool`, `list`) |

**Extracted from**

- BHL: `old_projects/bhl/src/lib/csv/*`
- OBS: `old_projects/obs/obs-app/obs-app/src/lib/csv.ts`

---

### `@plumo/print`

Browser HTML print: classic ledger + commercial documents.

| Area | Exports |
|------|---------|
| Config | `configurePrintSettings`, `loadPrintSettings`, `invalidatePrintSettingsCache`, `configurePrintTheme`, `getPrintTheme` |
| Classic | `renderDocument`, `mapProductLines`, `printDocumentHtml`, `runPrint`, `buildDocumentCss`, `PAGE_SIZES` |
| Commercial | `renderCommercialDocument`, `printCommercialDocument`, `printCommercialDocuments`, `COMMERCIAL_TYPE_LABELS` |
| Preview | `buildPrintHtml`, `openPrintPreview`, `previewCommercialDocument` |

**Extracted from**

- BHL: `old_projects/bhl/src/lib/print/*` (engine, CSS, settings pattern)
- OBS: `old_projects/obs/obs-app/obs-app/src/lib/print.ts` (commercial layout, bulk print)

---

---

### `@plumo/company-finance`

Schema-agnostic company AR/AP balances, ledger mapping, timeline, period summary.

| Area | Exports |
|------|---------|
| Balance | `buildBalanceFromTotals`, `buildBalanceFromEntries`, `balanceOf`, `emptyBalance`, `mergeBalances`, `indexBalances` |
| Effects | `Effect`, `charge`, `settle`, `delta`, `entryDelta`, `netDelta` |
| Mapping | `mapToLedger`, `createFieldMapper`, `createRuleMapper` |
| Timeline | `buildTimeline`, `buildPeriodTimeline`, `filterEntriesByPeriod` |
| Period | `summarizeEntries`, `summarizePeriod`, `groupEntries`, `balancesByGroup` |
| Classify | `classifyBalance`, `filterByBalanceState` |

**Design:** apps supply mappers/rules for *their* document shapes — no Nest/Prisma/OBS/BHL types in the package.

**Inspired by**

- BHL: `old_projects/bhl/src/server/crud/financial.ts` (owedByThem / owedByUs / net)
- OBS: `company-financial-summary.util.ts`, `lib/company-situation.ts` (running balance)

## Not packaged (by design)

| Idea | Status |
|------|--------|
| `@plumo/document-math` | Removed — use `@plumo/money` (`calcLine`, `buildTotals`, `ttcToHt`, …) |
| `@plumo/permissions` | Keep role matrices in each ERP until RBAC is unified |
| Nest org / approval | Intentionally out of scope (framework-specific) |
| `@plumo/react-crud` | Next candidate |

## Source ERPs

| Codebase | Path |
|----------|------|
| BHL System v2 | `old_projects/bhl` |
| OutBox (OBS) | `old_projects/obs/obs-api`, `old_projects/obs/obs-app/obs-app` |
