import type { PageTokens, PrintMargins, PrintPageSize } from "./page.js"
import { PAGE_SIZES } from "./page.js"

function marginValues(
  pageSize: PrintPageSize,
  margins?: PrintMargins | null,
): PrintMargins {
  if (
    margins &&
    [margins.top, margins.right, margins.bottom, margins.left].some(
      (v) => Number.isFinite(v) && v > 0,
    )
  ) {
    return {
      top: margins.top,
      right: margins.right,
      bottom: margins.bottom,
      left: margins.left,
    }
  }
  const fallback = Number.parseFloat(PAGE_SIZES[pageSize].fallbackMargin) || 12
  return { top: fallback, right: fallback, bottom: fallback, left: fallback }
}

export function buildDocumentCss(
  page: PageTokens,
  pageSize: PrintPageSize,
  margins?: PrintMargins | null,
): string {
  const m = marginValues(pageSize, margins)
  return `
    #temp-print-container {
      font-family: Arial, Helvetica, sans-serif;
      color: #000;
      background: #fff;
      font-size: ${page.body};
      line-height: 1.35;
      box-sizing: border-box;
      width: ${page.width};
    }
    #temp-print-container *,
    #temp-print-container *::before,
    #temp-print-container *::after { box-sizing: border-box; }
    #temp-print-container .doc-bg {
      position: fixed;
      top: 0;
      left: 0;
      width: ${page.width};
      height: ${page.height};
      margin: 0;
      padding: 0;
      border: 0;
      display: block;
      object-fit: fill;
      z-index: 0;
      pointer-events: none;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    #temp-print-container .doc {
      position: relative;
      z-index: 1;
      width: ${page.width};
      margin: 0;
      padding: ${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm;
      background: transparent;
    }
    #temp-print-container table {
      width: 100%;
      border-collapse: collapse;
    }
    #temp-print-container .title-table {
      margin-bottom: 10px;
      border-bottom: 1.5pt solid #000;
    }
    #temp-print-container .title-table td {
      vertical-align: bottom;
      padding: 0 0 8px;
    }
    #temp-print-container .org {
      font-family: Arial, Helvetica, sans-serif;
      font-size: ${page.th};
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    #temp-print-container h1 {
      margin: 0;
      font-size: ${page.title};
      font-weight: 700;
    }
    #temp-print-container .title-right {
      text-align: right;
      font-size: ${page.info};
      width: 38%;
    }
    #temp-print-container .ref-no {
      font-weight: 700;
      margin: 2px 0;
      font-variant-numeric: tabular-nums;
    }
    #temp-print-container .info {
      margin: 10px 0 14px;
      font-size: ${page.info};
      table-layout: fixed;
    }
    #temp-print-container .info td {
      width: 50%;
      padding: 2px 12px 2px 0;
      vertical-align: top;
    }
    #temp-print-container .info-cell {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      min-width: 0;
    }
    #temp-print-container .info-label {
      flex: 0 0 78px;
      width: 78px;
      color: #333;
      font-style: italic;
      white-space: nowrap;
    }
    #temp-print-container .info-value {
      flex: 1 1 auto;
      min-width: 0;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    #temp-print-container .ledger {
      font-size: ${page.table};
      margin-bottom: 12px;
    }
    #temp-print-container .ledger th {
      text-align: left;
      font-family: Arial, Helvetica, sans-serif;
      font-size: ${page.th};
      font-weight: 700;
      border-top: 1pt solid #000;
      border-bottom: 1pt solid #000;
      padding: 5px 6px;
      background: transparent;
    }
    #temp-print-container .ledger th.num,
    #temp-print-container .ledger th.qty,
    #temp-print-container .ledger th.price,
    #temp-print-container .ledger td.num,
    #temp-print-container .ledger td.qty,
    #temp-print-container .ledger td.price {
      text-align: right;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }
    #temp-print-container .ledger th.num,
    #temp-print-container .ledger td.num {
      text-align: left;
      width: 28px;
    }
    #temp-print-container .ledger .ref { width: 16%; }
    #temp-print-container .ledger .qty { width: 10%; }
    #temp-print-container .ledger .price { width: 16%; }
    #temp-print-container .ledger td {
      padding: 4px 6px;
      border-bottom: 0.5pt solid #bbb;
      vertical-align: top;
    }
    #temp-print-container .ledger em {
      display: block;
      font-style: italic;
      color: #444;
      font-size: 0.92em;
      margin-top: 1px;
    }
    #temp-print-container .ledger .empty {
      text-align: center;
      font-style: italic;
      padding: 16px 5px;
      color: #444;
    }
    #temp-print-container .recap {
      width: 48%;
      margin-left: auto;
      font-size: ${page.total};
      border-top: 1.5pt solid #000;
    }
    #temp-print-container .recap td { padding: 7px 0; }
    #temp-print-container .recap .num {
      text-align: right;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
      padding-left: 18px;
      font-weight: 700;
    }
    #temp-print-container .recap tr.total td { font-weight: 700; }
    #temp-print-container .notes {
      margin-top: 16px;
      padding-top: 8px;
      border-top: 0.5pt solid #000;
      font-size: ${page.notes};
      color: #222;
    }
    #temp-print-container .notes span {
      display: inline-block;
      min-width: 52px;
      font-style: italic;
      color: #333;
      margin-right: 6px;
    }
  `
}
