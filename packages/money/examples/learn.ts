/**
 * Learn @plumo/money — full walkthrough (no DB).
 *
 * Run:
 *   pnpm --filter @plumo/money learn
 */

import {
  configureMoney,
  getMoneyConfig,
  resetMoneyConfig,
  roundMoney,
  toMoney,
  parseMoney,
  addMoney,
  subMoney,
  mulMoney,
  divMoney,
  sumMoney,
  percentOf,
  applyPercent,
  discount,
  taxFromHt,
  htToTtc,
  ttcToHt,
  calcLine,
  calcLines,
  buildTotals,
  formatMoney,
  money,
  moneyCurrency,
  formatPercent,
  formatDate,
  amountToFrench,
  compareMoney,
  clampMoney,
  escapeHtml,
} from "../src/index.js"

function section(title: string) {
  console.log("\n" + "=".repeat(60))
  console.log(title)
  console.log("=".repeat(60))
}

function show(label: string, value: unknown) {
  console.log(`  ${label.padEnd(28)}`, value)
}

// ---------------------------------------------------------------------------
section("1) Config (locale / currency)")
// ---------------------------------------------------------------------------

resetMoneyConfig()
show("default", getMoneyConfig())

configureMoney({ locale: "fr-MA", currency: "MAD", fractionDigits: 2 })
show("configured", getMoneyConfig())

// ---------------------------------------------------------------------------
section("2) Round / parse / coerce")
// ---------------------------------------------------------------------------

show("roundMoney(10.555)", roundMoney(10.555))
show("toMoney(null)", toMoney(null))
show("toMoney('1 234,50 MAD')", toMoney("1 234,50 MAD"))
show("parseMoney('1.234,56')", parseMoney("1.234,56"))
show("parseMoney('1,234.56')", parseMoney("1,234.56"))
show("parseMoney('nope')", parseMoney("nope"))

// ---------------------------------------------------------------------------
section("3) Arithmetic (always rounded)")
// ---------------------------------------------------------------------------

show("addMoney(10.1, 0.2)", addMoney(10.1, 0.2))
show("subMoney(100, 0.3)", subMoney(100, 0.3))
show("mulMoney(12.5, 3)", mulMoney(12.5, 3))
show("divMoney(100, 3)", divMoney(100, 3))
show("sumMoney([10, 20.5, 0.25])", sumMoney([10, 20.5, 0.25]))

// ---------------------------------------------------------------------------
section("4) Percent / discount")
// ---------------------------------------------------------------------------

show("percentOf(200, 20)", percentOf(200, 20))
show("applyPercent(100, 20)", applyPercent(100, 20))
show("discount(100, 10)", discount(100, 10))

// ---------------------------------------------------------------------------
section("5) HT ↔ TTC (Morocco-style tax)")
// ---------------------------------------------------------------------------

show("taxFromHt(100, 20)", taxFromHt(100, 20))
show("htToTtc(100, 20)", htToTtc(100, 20))
show("ttcToHt(120, 20)", ttcToHt(120, 20))

// ---------------------------------------------------------------------------
section("6) calcLine / calcLines (invoice lines)")
// ---------------------------------------------------------------------------

const lineHt = calcLine({ quantity: 2, unitPrice: 50, taxRate: 20 })
show("HT prices", lineHt)
// → subtotal 100, tax 20, total 120

const lineTtc = calcLine({
  quantity: 1,
  unitPrice: 120,
  taxRate: 20,
  priceIncludesTax: true,
})
show("TTC prices", lineTtc)
// → subtotal 100, tax 20, total 120

const doc = calcLines([
  { quantity: 2, unitPrice: 50, taxRate: 20 },
  { quantity: 1, unitPrice: 100, taxRate: 0 },
])
show("calcLines totals", {
  subtotal: doc.subtotal,
  taxAmount: doc.taxAmount,
  total: doc.total,
})

// ---------------------------------------------------------------------------
section("7) buildTotals (document header)")
// ---------------------------------------------------------------------------

show(
  "buildTotals",
  buildTotals({
    subtotal: doc.subtotal,
    taxAmount: doc.taxAmount,
    discountAmount: 10,
  }),
)

// ---------------------------------------------------------------------------
section("8) Format for UI / print")
// ---------------------------------------------------------------------------

show("formatMoney(1234.5)", formatMoney(1234.5))
show("money(1234.5)", money(1234.5))
show("moneyCurrency(1234.5)", moneyCurrency(1234.5))
show("formatPercent(20)", formatPercent(20))
show("formatDate('2026-01-15')", formatDate("2026-01-15"))
show("amountToFrench(120.5)", amountToFrench(120.5))
show("escapeHtml('<b>x</b>')", escapeHtml("<b>x</b>"))

// ---------------------------------------------------------------------------
section("9) Compare / clamp")
// ---------------------------------------------------------------------------

show("compareMoney(10, 10.001)", compareMoney(10, 10.001))
show("clampMoney(150, 0, 100)", clampMoney(150, 0, 100))

// ---------------------------------------------------------------------------
section("Done — cheat sheet")
// ---------------------------------------------------------------------------

console.log(`
  round / parse     roundMoney, toMoney, parseMoney
  math              addMoney, subMoney, mulMoney, divMoney, sumMoney
  %                 percentOf, applyPercent, discount
  tax               taxFromHt, htToTtc, ttcToHt
  lines             calcLine, calcLines, buildTotals
  display           money, formatMoney, moneyCurrency, amountToFrench
  config            configureMoney({ locale, currency, fractionDigits })

  Edit numbers above and re-run to experiment.
`)
