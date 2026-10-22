import assert from "node:assert/strict"
import {
  addMoney,
  amountToFrench,
  buildTotals,
  calcLine,
  htToTtc,
  money,
  parseMoney,
  roundMoney,
  ttcToHt,
} from "../packages/money/dist/index.js"
import {
  buildCsv,
  buildExcelCsv,
  defineCsvColumns,
  parseCsv,
} from "../packages/csv/dist/index.js"
import {
  renderCommercialDocument,
  renderDocument,
  buildPrintHtml,
} from "../packages/print/dist/index.js"

assert.equal(roundMoney(10.555), 10.56)
assert.equal(parseMoney("1 234,50 MAD"), 1234.5)
assert.equal(addMoney(10.1, 0.2), 10.3)
assert.equal(htToTtc(100, 20), 120)
assert.equal(ttcToHt(120, 20).ht, 100)

const line = calcLine({ quantity: 2, unitPrice: 50, taxRate: 20 })
assert.equal(line.subtotal, 100)
assert.equal(line.taxAmount, 20)
assert.equal(line.total, 120)

const totals = buildTotals({
  subtotal: 100,
  taxAmount: 20,
  discountAmount: 10,
})
assert.equal(totals.totalAmount, 110)
assert.ok(money(1234.5).includes("MAD"))
assert.ok(amountToFrench(120).toLowerCase().includes("dirhams"))

const cols = defineCsvColumns([
  { id: "name", header: "Name", value: (r) => r.name },
  { id: "qty", header: "Qty", value: (r) => r.qty },
])
const csv = buildCsv([{ name: 'A,B', qty: 1 }], cols)
assert.ok(csv.includes('"A,B"'))

const excel = buildExcelCsv([{ name: "A", qty: 1 }], cols)
assert.ok(excel.includes(";"))

const parsed = parseCsv("Name;Qty\nFoo;2", { delimiter: ";" })
assert.equal(parsed.records[0].Name, "Foo")
assert.equal(parsed.records[0].Qty, "2")

const classic = renderDocument({
  orgName: "Plumo",
  title: "Facture",
  code: "FAC",
  ref: "FAC-1",
  date: "2026-10-22",
  infoRows: [[{ label: "Client", value: "ACME" }]],
  lines: [
    { reference: "P1", name: "Item", quantity: 2, unit: "U", unitPrice: 50 },
  ],
  includePrices: true,
  totalAmount: 100,
})
assert.ok(classic.includes("ACME"))

const commercial = renderCommercialDocument({
  documentType: "invoice",
  documentNumber: "FAC-2",
  date: "2026-10-22",
  clientName: "ACME",
  items: [
    {
      reference: "P1",
      name: "Item",
      quantity: 1,
      unitPrice: 120,
      total: 120,
      taxPercent: 20,
    },
  ],
  subtotal: 100,
  taxAmount: 20,
  totalAmount: 120,
})
assert.ok(commercial.includes("Facture"))
assert.ok(commercial.includes("dirhams") || commercial.includes("Dirhams") || commercial.toLowerCase().includes("arrêté"))

const html = buildPrintHtml(commercial, {
  pageSize: "A4",
  commercial: true,
  title: "FAC-2",
})
assert.ok(html.includes("<!DOCTYPE html>"))

console.log("smoke ok — money / csv / print")
