// src/index.ts
var DEFAULT_CONFIG = {
  locale: "fr-MA",
  currency: "MAD",
  currencyDisplay: "code",
  fractionDigits: 2
};
var config = { ...DEFAULT_CONFIG };
function configureMoney(partial) {
  config = { ...config, ...partial };
  return getMoneyConfig();
}
function getMoneyConfig() {
  return { ...config };
}
function resetMoneyConfig() {
  config = { ...DEFAULT_CONFIG };
}
function digits() {
  return config.fractionDigits;
}
function factor() {
  return 10 ** digits();
}
function roundMoney(value) {
  const f = factor();
  return Math.round((Number(value) + Number.EPSILON) * f) / f;
}
function isFiniteMoney(value) {
  return typeof value === "number" && Number.isFinite(value);
}
function toMoney(value) {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? roundMoney(value) : 0;
  if (typeof value === "string") {
    const parsed = parseMoney(value);
    return parsed ?? 0;
  }
  const n = Number(value);
  return Number.isFinite(n) ? roundMoney(n) : 0;
}
function parseMoney(input) {
  let s = input.trim();
  if (!s) return null;
  s = s.replace(/\s/g, "").replace(/[^\d,.\-]/g, "");
  if (!s || s === "-" || s === "," || s === ".") return null;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    s = s.replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? roundMoney(n) : null;
}
function addMoney(...values) {
  return roundMoney(values.reduce((sum, v) => sum + toMoney(v), 0));
}
function subMoney(a, b) {
  return roundMoney(toMoney(a) - toMoney(b));
}
function mulMoney(a, b) {
  return roundMoney(toMoney(a) * Number(b));
}
function divMoney(a, b) {
  const denom = Number(b);
  if (!Number.isFinite(denom) || denom === 0) return 0;
  return roundMoney(toMoney(a) / denom);
}
function sumMoney(values) {
  let sum = 0;
  for (const v of values) sum += toMoney(v);
  return roundMoney(sum);
}
function percentOf(amount, percent) {
  return roundMoney(toMoney(amount) * (Number(percent) / 100));
}
function applyPercent(amount, percent) {
  return addMoney(amount, percentOf(amount, percent));
}
function discount(amount, percent) {
  return subMoney(amount, percentOf(amount, percent));
}
function taxFromHt(ht, taxPercent) {
  return percentOf(ht, taxPercent);
}
function htToTtc(ht, taxPercent) {
  return applyPercent(ht, taxPercent);
}
function ttcToHt(ttc, taxPercent) {
  const p = Number(taxPercent);
  const total = toMoney(ttc);
  if (!Number.isFinite(p) || p <= 0) {
    return { ht: total, tax: 0, ttc: total };
  }
  const ht = roundMoney(total / (1 + p / 100));
  const tax = subMoney(total, ht);
  return { ht, tax, ttc: total };
}
function calcLine(input) {
  const quantity = Number(input.quantity) || 0;
  const unitPrice = toMoney(input.unitPrice);
  const taxRate = Number(input.taxRate) || 0;
  const raw = roundMoney(quantity * unitPrice);
  if (input.priceIncludesTax && taxRate > 0) {
    const { ht, tax, ttc } = ttcToHt(raw, taxRate);
    return { quantity, unitPrice, taxRate, subtotal: ht, taxAmount: tax, total: ttc };
  }
  const taxAmount = taxFromHt(raw, taxRate);
  return {
    quantity,
    unitPrice,
    taxRate,
    subtotal: raw,
    taxAmount,
    total: addMoney(raw, taxAmount)
  };
}
function calcLines(lines) {
  const calculated = lines.map(calcLine);
  return {
    lines: calculated,
    subtotal: sumMoney(calculated.map((l) => l.subtotal)),
    taxAmount: sumMoney(calculated.map((l) => l.taxAmount)),
    total: sumMoney(calculated.map((l) => l.total))
  };
}
function buildTotals(input) {
  const subtotal = toMoney(input.subtotal ?? 0);
  const taxAmount = toMoney(input.taxAmount ?? 0);
  const linesTotal = toMoney(input.linesTotal ?? 0);
  const discountAmount = toMoney(input.discountAmount ?? 0);
  const base = subtotal > 0 || taxAmount > 0 ? addMoney(subtotal, taxAmount) : linesTotal;
  return {
    subtotal: subtotal > 0 ? subtotal : Math.max(0, subMoney(linesTotal, taxAmount)),
    taxAmount,
    discountAmount,
    totalAmount: subMoney(base, discountAmount)
  };
}
function numberFormatter(opts) {
  return new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: digits(),
    maximumFractionDigits: digits(),
    ...opts
  });
}
var moneyFmt = {
  format(value) {
    return numberFormatter().format(toMoney(value));
  }
};
function formatMoney(value) {
  return moneyFmt.format(value);
}
function money(value, currency = config.currency) {
  return `${formatMoney(value)} ${currency}`;
}
function moneyCurrency(value, options) {
  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: options?.currency ?? config.currency,
    currencyDisplay: options?.currencyDisplay ?? config.currencyDisplay,
    minimumFractionDigits: digits(),
    maximumFractionDigits: digits()
  }).format(toMoney(value));
}
function formatPercent(value, fractionDigits = 0) {
  return new Intl.NumberFormat(config.locale, {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(Number(value) / 100);
}
function formatDate(value, options) {
  const date = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? /* @__PURE__ */ new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(config.locale, options);
}
var formatDateFrMa = formatDate;
function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function frenchLessThan1000(n) {
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
    "neuf"
  ];
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
    "dix-neuf"
  ];
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
    "quatre-vingt"
  ];
  if (n === 0) return "";
  if (n < 10) return units[n] ?? "";
  if (n < 20) return teens[n - 10] ?? "";
  if (n < 100) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    if (t === 7 || t === 9) {
      return (tens[t] ?? "") + (u === 1 && t === 7 ? "-et-" : "-") + (teens[u] ?? "");
    }
    if (t === 8 && u === 0) return "quatre-vingts";
    return (tens[t] ?? "") + (u === 1 && t < 8 ? "-et-" : u > 0 ? "-" : "") + (units[u] ?? "");
  }
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const hStr = h === 1 ? "cent" : (units[h] ?? "") + " cent" + (rest === 0 ? "s" : "");
  return hStr + (rest > 0 ? " " + frenchLessThan1000(rest) : "");
}
function frenchInteger(intPart) {
  if (intPart === 0) return "z\xE9ro";
  if (intPart === 1) return "un";
  let result = "";
  const billions = Math.floor(intPart / 1e9);
  const millions = Math.floor(intPart % 1e9 / 1e6);
  const thousands = Math.floor(intPart % 1e6 / 1e3);
  const remainder = intPart % 1e3;
  if (billions > 0) {
    result += frenchLessThan1000(billions) + " milliard" + (billions > 1 ? "s" : "") + " ";
  }
  if (millions > 0) {
    result += frenchLessThan1000(millions) + " million" + (millions > 1 ? "s" : "") + " ";
  }
  if (thousands > 0) {
    result += (thousands === 1 ? "mille" : frenchLessThan1000(thousands) + " mille") + " ";
  }
  if (remainder > 0) result += frenchLessThan1000(remainder);
  return result.trim();
}
function amountToFrench(amount, options = {}) {
  const currencyName = options.currencyName ?? "dirhams";
  const centName = options.centName ?? "centimes";
  const value = toMoney(amount);
  const intPart = Math.floor(Math.abs(value));
  const decPart = Math.round((Math.abs(value) - intPart) * factor());
  let result = frenchInteger(intPart) + " " + currencyName;
  if (decPart > 0) {
    result += " et " + frenchLessThan1000(decPart) + " " + centName;
  }
  if (value < 0) result = "moins " + result;
  if (options.capitalize === false) return result;
  return result.charAt(0).toUpperCase() + result.slice(1);
}
function compareMoney(a, b) {
  const left = toMoney(a);
  const right = toMoney(b);
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
function clampMoney(value, min, max) {
  return roundMoney(Math.min(toMoney(max), Math.max(toMoney(min), toMoney(value))));
}
export {
  addMoney,
  amountToFrench,
  applyPercent,
  buildTotals,
  calcLine,
  calcLines,
  clampMoney,
  compareMoney,
  configureMoney,
  discount,
  divMoney,
  escapeHtml,
  formatDate,
  formatDateFrMa,
  formatMoney,
  formatPercent,
  getMoneyConfig,
  htToTtc,
  isFiniteMoney,
  money,
  moneyCurrency,
  moneyFmt,
  mulMoney,
  parseMoney,
  percentOf,
  resetMoneyConfig,
  roundMoney,
  subMoney,
  sumMoney,
  taxFromHt,
  toMoney,
  ttcToHt
};
