import { amountToFrench, escapeHtml, formatDate, formatMoney, money } from "@plumo/money"
import { getPrintTheme } from "./theme.js"

export type CommercialDocType =
  | "order"
  | "delivery_note"
  | "quote"
  | "invoice"
  | "credit_note"
  | "payment"
  | "return"

export const COMMERCIAL_TYPE_LABELS: Record<CommercialDocType, string> = {
  order: "Bon de Commande",
  delivery_note: "Bon de Livraison",
  quote: "Devis",
  invoice: "Facture",
  credit_note: "Avoir",
  payment: "Reçu de paiement",
  return: "Bon de Retour",
}

export type CommercialPrintItem = {
  reference?: string
  name: string
  quantity: number
  unit?: string
  unitPrice: number
  total: number
  taxPercent?: number
  notes?: string
}

export type CommercialPrintData = {
  documentType: CommercialDocType
  documentNumber: string
  date: string
  dueDate?: string
  clientName: string
  clientAddress?: string
  clientIce?: string
  clientPhone?: string
  orgName?: string
  items: CommercialPrintItem[]
  subtotal: number
  taxAmount: number
  discountAmount?: number
  totalAmount: number
  notes?: string
  showPrices?: boolean
  showTaxDetails?: boolean
  showAmountInWords?: boolean
  showSignatures?: boolean
  customTypeLabel?: string
}

function splitTtc(ttc: number, taxPercent: number): { ht: number; tax: number } {
  const p = Number(taxPercent)
  if (!Number.isFinite(p) || p <= 0) return { ht: ttc, tax: 0 }
  const ht = Number((ttc / (1 + p / 100)).toFixed(2))
  return { ht, tax: Number((ttc - ht).toFixed(2)) }
}

export function commercialContentStyles(): string {
  const c = getPrintTheme()
  return `
    .plumo-commercial thead { display: table-header-group; }
    .plumo-commercial tfoot { display: table-footer-group; }
    .plumo-commercial tr, .plumo-commercial .totals-container,
    .plumo-commercial .signatures, .plumo-commercial footer,
    .plumo-commercial .amount-words { page-break-inside: avoid; break-inside: avoid; }
    .plumo-commercial table { page-break-inside: auto; width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .plumo-commercial header {
      display: flex; flex-direction: column; margin-bottom: 28px;
      border-bottom: 2px solid ${c.primary}; padding-bottom: 16px;
    }
    .plumo-commercial .document-info { text-align: center; width: 100%; }
    .plumo-commercial .document-type {
      font-size: 28px; font-weight: 700; color: ${c.primary};
      text-transform: uppercase; margin: 0; line-height: 1;
    }
    .plumo-commercial .document-number {
      font-size: 15px; color: ${c.secondary}; margin-top: 4px; font-weight: 500;
    }
    .plumo-commercial .org-name {
      font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase;
      color: ${c.secondary}; margin-bottom: 6px;
    }
    .plumo-commercial .section-title {
      font-size: 11px; font-weight: 700; color: ${c.secondary};
      text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;
      border-bottom: 1px solid ${c.border}; padding-bottom: 4px;
    }
    .plumo-commercial .address-block { font-size: 13px; color: ${c.text}; }
    .plumo-commercial .address-name { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
    .plumo-commercial .header-row {
      display: flex; justify-content: space-between; align-items: flex-start;
      width: 100%; margin-top: 18px;
    }
    .plumo-commercial .meta-item {
      display: flex; justify-content: flex-end; gap: 8px; font-size: 13px; margin-bottom: 2px;
    }
    .plumo-commercial .meta-label { color: ${c.secondary}; font-weight: 500; }
    .plumo-commercial th {
      background-color: ${c.background}; color: ${c.secondary}; font-size: 11px;
      font-weight: 600; text-transform: uppercase; text-align: left;
      padding: 10px 6px; border-bottom: 2px solid ${c.border};
    }
    .plumo-commercial td {
      padding: 10px 6px; border-bottom: 1px solid ${c.border};
      font-size: 13px; vertical-align: top; color: ${c.text};
    }
    .plumo-commercial .text-right { text-align: right; }
    .plumo-commercial .text-center { text-align: center; }
    .plumo-commercial .font-bold { font-weight: 600; }
    .plumo-commercial .totals-container {
      display: flex; justify-content: space-between; align-items: flex-start;
      gap: 24px; margin-bottom: 28px;
    }
    .plumo-commercial .totals-table { width: 250px; flex-shrink: 0; margin-bottom: 0; }
    .plumo-commercial .totals-table td { padding: 8px; border-bottom: none; }
    .plumo-commercial .total-row td {
      border-top: 2px solid ${c.primary}; padding-top: 12px;
      font-size: 16px; font-weight: 700; color: ${c.primary};
    }
    .plumo-commercial .amount-words {
      flex: 1; min-width: 0; font-size: 12px; color: ${c.secondary};
      font-style: italic; margin: 0; padding-top: 4px;
    }
    .plumo-commercial .signatures {
      display: flex; justify-content: space-between; gap: 20px; margin-top: 32px;
    }
    .plumo-commercial .signature-box {
      flex: 1; height: 80px; border: 1px dashed ${c.border}; border-radius: 8px;
      display: flex; flex-direction: column; justify-content: flex-start; padding: 10px;
    }
    .plumo-commercial .signature-label {
      font-size: 11px; font-weight: 600; color: ${c.secondary}; text-align: center;
    }
    .plumo-commercial .notes {
      margin-top: 16px; padding-top: 8px; border-top: 1px solid ${c.border};
      font-size: 12px; color: ${c.text};
    }
  `
}

export function renderCommercialDocument(data: CommercialPrintData): string {
  const showPrices = data.showPrices !== false
  const showTax = data.showTaxDetails !== false
  const showWords = data.showAmountInWords !== false && showPrices
  const showSignatures = data.showSignatures === true
  const label =
    data.customTypeLabel ?? COMMERCIAL_TYPE_LABELS[data.documentType]
  const discount = data.discountAmount ?? 0
  const words = showWords ? amountToFrench(data.totalAmount) : ""

  const rows = data.items
    .map((item) => {
      const rate = item.taxPercent ?? 0
      const { tax: lineTax } = showPrices
        ? splitTtc(item.total, rate)
        : { tax: 0 }
      return `
        <tr>
          <td>${escapeHtml(item.reference || "—")}</td>
          <td><div class="font-bold">${escapeHtml(item.name)}</div>${
            item.notes
              ? `<div style="font-size:11px;opacity:.75">${escapeHtml(item.notes)}</div>`
              : ""
          }</td>
          <td class="text-center">${item.quantity}</td>
          <td class="text-center">${escapeHtml(item.unit || "U")}</td>
          ${
            showPrices
              ? `
            <td class="text-right">${formatMoney(item.unitPrice)}</td>
            ${
              showTax
                ? `<td class="text-center">${rate > 0 ? `${rate} %` : "—"}</td>
                   <td class="text-right">${formatMoney(lineTax)}</td>`
                : ""
            }
            <td class="text-right font-bold">${formatMoney(item.total)}</td>
          `
              : ""
          }
        </tr>`
    })
    .join("")

  return `
    <div class="plumo-commercial doc">
      <header>
        ${data.orgName ? `<div class="org-name">${escapeHtml(data.orgName)}</div>` : ""}
        <div class="document-info">
          <h1 class="document-type">${escapeHtml(label)}</h1>
          <div class="document-number">${escapeHtml(data.documentNumber)}</div>
        </div>
        <div class="header-row">
          <div>
            <div class="section-title">Destinataire</div>
            <div class="address-block">
              <div class="address-name">${escapeHtml(data.clientName)}</div>
              ${data.clientAddress ? `<div>${escapeHtml(data.clientAddress)}</div>` : ""}
              ${data.clientPhone ? `<div>Tél: ${escapeHtml(data.clientPhone)}</div>` : ""}
              ${data.clientIce ? `<div>ICE: ${escapeHtml(data.clientIce)}</div>` : ""}
            </div>
          </div>
          <div>
            <div class="meta-item"><span class="meta-label">Date:</span><span>${escapeHtml(formatDate(data.date))}</span></div>
            ${
              data.dueDate
                ? `<div class="meta-item"><span class="meta-label">Échéance:</span><span>${escapeHtml(formatDate(data.dueDate))}</span></div>`
                : ""
            }
          </div>
        </div>
      </header>

      <table>
        <thead>
          <tr>
            <th>Référence</th>
            <th>Désignation</th>
            <th class="text-center">Qté</th>
            <th class="text-center">Unité</th>
            ${
              showPrices
                ? `
              <th class="text-right">P.U.</th>
              ${showTax ? `<th class="text-center">TVA %</th><th class="text-right">TVA</th>` : ""}
              <th class="text-right">Total</th>
            `
                : ""
            }
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      ${
        showPrices
          ? `
      <div class="totals-container">
        <div class="amount-words">${
          showWords
            ? `Arrêté à la somme de : <strong>${escapeHtml(words)}</strong>`
            : ""
        }</div>
        <table class="totals-table">
          <tr><td>Sous-total HT</td><td class="text-right">${escapeHtml(money(data.subtotal))}</td></tr>
          ${
            showTax
              ? `<tr><td>Total TVA</td><td class="text-right">${escapeHtml(money(data.taxAmount))}</td></tr>`
              : ""
          }
          ${
            discount > 0
              ? `<tr><td>Remise</td><td class="text-right">-${escapeHtml(money(discount))}</td></tr>`
              : ""
          }
          <tr class="total-row"><td>Total TTC</td><td class="text-right">${escapeHtml(money(data.totalAmount))}</td></tr>
        </table>
      </div>`
          : ""
      }

      ${
        data.notes?.trim()
          ? `<div class="notes"><strong>Notes:</strong> ${escapeHtml(data.notes.trim())}</div>`
          : ""
      }

      ${
        showSignatures
          ? `<div class="signatures">
              <div class="signature-box"><div class="signature-label">Client</div></div>
              <div class="signature-box"><div class="signature-label">Société</div></div>
            </div>`
          : ""
      }
    </div>
  `
}
