export type CurrencyCode = "MAD" | "EUR" | "USD" | string

export type MoneyConfig = {
  locale: string
  currency: CurrencyCode
  currencyDisplay: "code" | "symbol" | "narrowSymbol" | "name"
  fractionDigits: number
}

const DEFAULT_CONFIG: MoneyConfig = {
  locale: "fr-MA",
  currency: "MAD",
  currencyDisplay: "code",
  fractionDigits: 2,
}

let config: MoneyConfig = { ...DEFAULT_CONFIG }

export function configureMoney(partial: Partial<MoneyConfig>): MoneyConfig {
  config = { ...config, ...partial }
  return getMoneyConfig()
}

export function getMoneyConfig(): MoneyConfig {
  return { ...config }
}

export function resetMoneyConfig(): void {
  config = { ...DEFAULT_CONFIG }
}

function digits(): number {
  return config.fractionDigits
}

function factor(): number {
  return 10 ** digits()
}

/** Round half-up to configured fraction digits. */
export function roundMoney(value: number): number {
  const f = factor()
  return Math.round((Number(value) + Number.EPSILON) * f) / f
}

export function isFiniteMoney(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

/** Safe number → money; null/NaN → 0. */
export function toMoney(value: unknown): number {
  if (value == null || value === "") return 0
  if (typeof value === "number") return Number.isFinite(value) ? roundMoney(value) : 0
  if (typeof value === "string") {
    const parsed = parseMoney(value)
    return parsed ?? 0
  }
  const n = Number(value)
  return Number.isFinite(n) ? roundMoney(n) : 0
}

/**
 * Parse common FR/EN money strings: `1 234,56`, `1,234.56`, `1234.56 MAD`.
 * Returns null when unparseable.
 */
export function parseMoney(input: string): number | null {
  let s = input.trim()
  if (!s) return null
  s = s.replace(/\s/g, "").replace(/[^\d,.\-]/g, "")
  if (!s || s === "-" || s === "," || s === ".") return null

  const hasComma = s.includes(",")
  const hasDot = s.includes(".")
  if (hasComma && hasDot) {
    // Last separator is decimal
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".")
    } else {
      s = s.replace(/,/g, "")
    }
  } else if (hasComma) {
    s = s.replace(",", ".")
  }

  const n = Number(s)
  return Number.isFinite(n) ? roundMoney(n) : null
}

export function addMoney(...values: number[]): number {
  return roundMoney(values.reduce((sum, v) => sum + toMoney(v), 0))
}

export function subMoney(a: number, b: number): number {
  return roundMoney(toMoney(a) - toMoney(b))
}

export function mulMoney(a: number, b: number): number {
  return roundMoney(toMoney(a) * Number(b))
}

export function divMoney(a: number, b: number): number {
  const denom = Number(b)
  if (!Number.isFinite(denom) || denom === 0) return 0
  return roundMoney(toMoney(a) / denom)
}

export function sumMoney(values: Iterable<number>): number {
  let sum = 0
  for (const v of values) sum += toMoney(v)
  return roundMoney(sum)
}

export function percentOf(amount: number, percent: number): number {
  return roundMoney(toMoney(amount) * (Number(percent) / 100))
}

export function applyPercent(amount: number, percent: number): number {
  return addMoney(amount, percentOf(amount, percent))
}

export function discount(amount: number, percent: number): number {
  return subMoney(amount, percentOf(amount, percent))
}

/** HT → tax amount at rate %. */
export function taxFromHt(ht: number, taxPercent: number): number {
  return percentOf(ht, taxPercent)
}

/** HT → TTC. */
export function htToTtc(ht: number, taxPercent: number): number {
  return applyPercent(ht, taxPercent)
}

/** TTC → HT + tax. */
export function ttcToHt(
  ttc: number,
  taxPercent: number,
): { ht: number; tax: number; ttc: number } {
  const p = Number(taxPercent)
  const total = toMoney(ttc)
  if (!Number.isFinite(p) || p <= 0) {
    return { ht: total, tax: 0, ttc: total }
  }
  const ht = roundMoney(total / (1 + p / 100))
  const tax = subMoney(total, ht)
  return { ht, tax, ttc: total }
}

export type LineCalcInput = {
  quantity: number
  unitPrice: number
  /** Tax rate percent (e.g. 20). */
  taxRate?: number
  /** Unit prices are TTC when true (default HT). */
  priceIncludesTax?: boolean
}

export type LineCalc = {
  quantity: number
  unitPrice: number
  taxRate: number
  subtotal: number
  taxAmount: number
  total: number
}

export function calcLine(input: LineCalcInput): LineCalc {
  const quantity = Number(input.quantity) || 0
  const unitPrice = toMoney(input.unitPrice)
  const taxRate = Number(input.taxRate) || 0
  const raw = roundMoney(quantity * unitPrice)

  if (input.priceIncludesTax && taxRate > 0) {
    const { ht, tax, ttc } = ttcToHt(raw, taxRate)
    return { quantity, unitPrice, taxRate, subtotal: ht, taxAmount: tax, total: ttc }
  }

  const taxAmount = taxFromHt(raw, taxRate)
  return {
    quantity,
    unitPrice,
    taxRate,
    subtotal: raw,
    taxAmount,
    total: addMoney(raw, taxAmount),
  }
}

export function calcLines(lines: LineCalcInput[]): {
  lines: LineCalc[]
  subtotal: number
  taxAmount: number
  total: number
} {
  const calculated = lines.map(calcLine)
  return {
    lines: calculated,
    subtotal: sumMoney(calculated.map((l) => l.subtotal)),
    taxAmount: sumMoney(calculated.map((l) => l.taxAmount)),
    total: sumMoney(calculated.map((l) => l.total)),
  }
}

export type DocumentTotalsInput = {
  subtotal: number
  taxAmount: number
  discountAmount?: number
  /** When true, `total` is treated as already TTC and tax is derived if needed. */
}

export function buildTotals(input: {
  subtotal?: number
  taxAmount?: number
  linesTotal?: number
  discountAmount?: number
}): {
  subtotal: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
} {
  const subtotal = toMoney(input.subtotal ?? 0)
  const taxAmount = toMoney(input.taxAmount ?? 0)
  const linesTotal = toMoney(input.linesTotal ?? 0)
  const discountAmount = toMoney(input.discountAmount ?? 0)
  const base =
    subtotal > 0 || taxAmount > 0
      ? addMoney(subtotal, taxAmount)
      : linesTotal
  return {
    subtotal: subtotal > 0 ? subtotal : Math.max(0, subMoney(linesTotal, taxAmount)),
    taxAmount,
    discountAmount,
    totalAmount: subMoney(base, discountAmount),
  }
}

function numberFormatter(opts?: Intl.NumberFormatOptions): Intl.NumberFormat {
  return new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: digits(),
    maximumFractionDigits: digits(),
    ...opts,
  })
}

export const moneyFmt = {
  format(value: number): string {
    return numberFormatter().format(toMoney(value))
  },
}

/** Number only, locale-aware. */
export function formatMoney(value: number): string {
  return moneyFmt.format(value)
}

/** e.g. `1 234,56 MAD` */
export function money(value: number, currency = config.currency): string {
  return `${formatMoney(value)} ${currency}`
}

/** Native currency style when locale supports it. */
export function moneyCurrency(
  value: number,
  options?: { currency?: CurrencyCode; currencyDisplay?: MoneyConfig["currencyDisplay"] },
): string {
  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: options?.currency ?? config.currency,
    currencyDisplay: options?.currencyDisplay ?? config.currencyDisplay,
    minimumFractionDigits: digits(),
    maximumFractionDigits: digits(),
  }).format(toMoney(value))
}

export function formatPercent(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat(config.locale, {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(Number(value) / 100)
}

export function formatDate(
  value: string | number | Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T00:00:00`)
      : new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString(config.locale, options)
}

/** @deprecated use formatDate */
export const formatDateFrMa = formatDate

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function frenchLessThan1000(n: number): string {
  const units = [
    "",
    "un",
    "deux",
    "trois",
    "quatre",
    "cinq",
    "six",
    "sept",
    "huit",
    "neuf",
  ]
  const teens = [
    "dix",
    "onze",
    "douze",
    "treize",
    "quatorze",
    "quinze",
    "seize",
    "dix-sept",
    "dix-huit",
    "dix-neuf",
  ]
  const tens = [
    "",
    "dix",
    "vingt",
    "trente",
    "quarante",
    "cinquante",
    "soixante",
    "soixante",
    "quatre-vingt",
    "quatre-vingt",
  ]

  if (n === 0) return ""
  if (n < 10) return units[n] ?? ""
  if (n < 20) return teens[n - 10] ?? ""
  if (n < 100) {
    const t = Math.floor(n / 10)
    const u = n % 10
    if (t === 7 || t === 9) {
      return (tens[t] ?? "") + (u === 1 && t === 7 ? "-et-" : "-") + (teens[u] ?? "")
    }
    if (t === 8 && u === 0) return "quatre-vingts"
    return (
      (tens[t] ?? "") +
      (u === 1 && t < 8 ? "-et-" : u > 0 ? "-" : "") +
      (units[u] ?? "")
    )
  }
  const h = Math.floor(n / 100)
  const rest = n % 100
  const hStr =
    h === 1 ? "cent" : (units[h] ?? "") + " cent" + (rest === 0 ? "s" : "")
  return hStr + (rest > 0 ? " " + frenchLessThan1000(rest) : "")
}

function frenchInteger(intPart: number): string {
  if (intPart === 0) return "zéro"
  if (intPart === 1) return "un"

  let result = ""
  const billions = Math.floor(intPart / 1_000_000_000)
  const millions = Math.floor((intPart % 1_000_000_000) / 1_000_000)
  const thousands = Math.floor((intPart % 1_000_000) / 1000)
  const remainder = intPart % 1000

  if (billions > 0) {
    result +=
      frenchLessThan1000(billions) +
      " milliard" +
      (billions > 1 ? "s" : "") +
      " "
  }
  if (millions > 0) {
    result +=
      frenchLessThan1000(millions) +
      " million" +
      (millions > 1 ? "s" : "") +
      " "
  }
  if (thousands > 0) {
    result +=
      (thousands === 1 ? "mille" : frenchLessThan1000(thousands) + " mille") +
      " "
  }
  if (remainder > 0) result += frenchLessThan1000(remainder)
  return result.trim()
}

export type AmountInWordsOptions = {
  currencyName?: string
  centName?: string
  capitalize?: boolean
}

/** French amount-in-words (default: dirhams / centimes). */
export function amountToFrench(
  amount: number,
  options: AmountInWordsOptions = {},
): string {
  const currencyName = options.currencyName ?? "dirhams"
  const centName = options.centName ?? "centimes"
  const value = toMoney(amount)
  const intPart = Math.floor(Math.abs(value))
  const decPart = Math.round((Math.abs(value) - intPart) * factor())

  let result = frenchInteger(intPart) + " " + currencyName
  if (decPart > 0) {
    result += " et " + frenchLessThan1000(decPart) + " " + centName
  }
  if (value < 0) result = "moins " + result
  if (options.capitalize === false) return result
  return result.charAt(0).toUpperCase() + result.slice(1)
}

export function compareMoney(a: number, b: number): -1 | 0 | 1 {
  const left = toMoney(a)
  const right = toMoney(b)
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

export function clampMoney(value: number, min: number, max: number): number {
  return roundMoney(Math.min(toMoney(max), Math.max(toMoney(min), toMoney(value))))
}
