import { escapeHtml, formatDateFrMa, money, moneyFmt } from "@plumo/money"

export type PrintInfoCell = { label: string; value: string }
export type PrintInfoRow = [PrintInfoCell, PrintInfoCell?]

export type PrintLine = {
  reference: string
  name: string
  quantity: number
  unit: string
  unitPrice: number
}

export type DocumentPrintModel = {
  orgName?: string
  title: string
  code: string
  ref: string
  date: string
  infoRows: PrintInfoRow[]
  lines?: PrintLine[]
  includePrices?: boolean
  totalAmount?: number
  totalLabel?: string
  notes?: string | null
  beforeLedgerHtml?: string
  afterLedgerHtml?: string
}

function renderInfoCell(cell: PrintInfoCell) {
  return `<div class="info-cell"><span class="info-label">${escapeHtml(cell.label)}</span><span class="info-value">${escapeHtml(cell.value)}</span></div>`
}

function renderInfoRows(rows: PrintInfoRow[]) {
  return rows
    .map((row) => {
      const [left, right] = row
      if (!right) {
        return `<tr><td colspan="2">${renderInfoCell(left)}</td></tr>`
      }
      return `<tr>
        <td>${renderInfoCell(left)}</td>
        <td>${renderInfoCell(right)}</td>
      </tr>`
    })
    .join("")
}

function renderLedger(lines: PrintLine[], includePrices: boolean) {
  const cols = includePrices ? 6 : 4
  const rows = lines
    .map(
      (line, index) => `
      <tr>
        <td class="num">${index + 1}</td>
        <td class="ref">${escapeHtml(line.reference)}</td>
        <td>
          ${escapeHtml(line.name)}
          <em>${escapeHtml(line.unit)}</em>
        </td>
        <td class="qty">${line.quantity}</td>
        ${
          includePrices
            ? `
          <td class="price">${moneyFmt.format(line.unitPrice)}</td>
          <td class="price">${moneyFmt.format(line.quantity * line.unitPrice)}</td>
        `
            : ""
        }
      </tr>`,
    )
    .join("")

  return `
    <table class="ledger">
      <thead>
        <tr>
          <th class="num">N°</th>
          <th class="ref">Réf</th>
          <th>Produit</th>
          <th class="qty">Qté</th>
          ${includePrices ? `<th class="price">P.U.</th><th class="price">Montant</th>` : ""}
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="${cols}" class="empty">Aucun article</td></tr>`}
      </tbody>
    </table>
  `
}

export function renderDocument(model: DocumentPrintModel): string {
  const includePrices = Boolean(model.includePrices)
  const notes = model.notes?.trim()
  const showLedger = model.lines != null
  const showTotal = includePrices && model.totalAmount != null

  return `
    <div class="doc">
      <table class="title-table">
        <tr>
          <td class="title-left">
            <div class="org">${escapeHtml(model.orgName ?? "")}</div>
            <h1>${escapeHtml(model.title)}</h1>
          </td>
          <td class="title-right">
            <div>${escapeHtml(model.code)}</div>
            <div class="ref-no">${escapeHtml(model.ref)}</div>
            <div>${escapeHtml(formatDateFrMa(model.date))}</div>
          </td>
        </tr>
      </table>

      <table class="info">
        ${renderInfoRows(model.infoRows)}
      </table>

      ${model.beforeLedgerHtml ?? ""}
      ${showLedger ? renderLedger(model.lines ?? [], includePrices) : ""}
      ${model.afterLedgerHtml ?? ""}

      ${
        showTotal
          ? `
      <table class="recap">
        <tr class="total">
          <td>${escapeHtml(model.totalLabel ?? "Total TTC")}</td>
          <td class="num">${escapeHtml(money(model.totalAmount!))}</td>
        </tr>
      </table>`
          : ""
      }

      ${notes ? `<div class="notes"><span>Notes</span>${escapeHtml(notes)}</div>` : ""}
    </div>
  `
}

export function mapProductLines(
  items: Array<{ productId: number; quantity: number; unitPrice: number }>,
  products: Array<{
    id: number
    reference: number | string
    name: string
    unit: string
  }>,
  customItems: Array<{ name: string; quantity: number; unitPrice: number }> = [],
): PrintLine[] {
  const productById = new Map(products.map((p) => [p.id, p]))
  return [
    ...items.map((item) => {
      const product = productById.get(item.productId)
      return {
        reference: product ? String(product.reference) : "—",
        name: product?.name ?? `#${item.productId}`,
        quantity: item.quantity,
        unit: product?.unit ?? "—",
        unitPrice: item.unitPrice,
      }
    }),
    ...customItems.map((item) => ({
      reference: "—",
      name: item.name,
      quantity: item.quantity,
      unit: "—",
      unitPrice: item.unitPrice,
    })),
  ]
}
