"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  Effect: () => Effect,
  applyDelta: () => applyDelta,
  balanceOf: () => balanceOf,
  balanceOrEmpty: () => balanceOrEmpty,
  balancesByGroup: () => balancesByGroup,
  buildBalanceFromEntries: () => buildBalanceFromEntries,
  buildBalanceFromTotals: () => buildBalanceFromTotals,
  buildPeriodTimeline: () => buildPeriodTimeline,
  buildTimeline: () => buildTimeline,
  charge: () => charge,
  classifyBalance: () => classifyBalance,
  compareEntriesByDate: () => compareEntriesByDate,
  createFieldMapper: () => createFieldMapper,
  createRuleMapper: () => createRuleMapper,
  creditLimitStatus: () => creditLimitStatus,
  delta: () => delta,
  emptyBalance: () => emptyBalance,
  entryDelta: () => entryDelta,
  filterByBalanceState: () => filterByBalanceState,
  filterEntriesByPeriod: () => filterEntriesByPeriod,
  groupEntries: () => groupEntries,
  indexBalances: () => indexBalances,
  invertBalance: () => invertBalance,
  isBalanced: () => isBalanced,
  mapToLedger: () => mapToLedger,
  matchesBalanceState: () => matchesBalanceState,
  matchesCreditLimitState: () => matchesCreditLimitState,
  mergeBalances: () => mergeBalances,
  netDelta: () => netDelta,
  netEffect: () => netEffect,
  settle: () => settle,
  sortEntries: () => sortEntries,
  summarizeEntries: () => summarizeEntries,
  summarizePeriod: () => summarizePeriod
});
module.exports = __toCommonJS(index_exports);

// src/balance.ts
var import_money2 = require("@plumo/money");

// src/effects.ts
var import_money = require("@plumo/money");
var Effect = {
  chargeThem: { kind: "charge", side: "owedByThem" },
  chargeUs: { kind: "charge", side: "owedByUs" },
  settleThem: { kind: "settle", side: "owedByThem" },
  settleUs: { kind: "settle", side: "owedByUs" },
  netPlus: { kind: "net", sign: 1 },
  netMinus: { kind: "net", sign: -1 }
};
function charge(side) {
  return { kind: "charge", side };
}
function settle(side) {
  return { kind: "settle", side };
}
function delta(owedByThem = 0, owedByUs = 0) {
  return { kind: "delta", owedByThem, owedByUs };
}
function netEffect(sign) {
  return { kind: "net", sign };
}
function entryDelta(entry) {
  const amount = Math.abs((0, import_money.toMoney)(entry.amount));
  const effect = entry.effect;
  switch (effect.kind) {
    case "charge":
      return effect.side === "owedByThem" ? { owedByThem: amount, owedByUs: 0 } : { owedByThem: 0, owedByUs: amount };
    case "settle":
      return effect.side === "owedByThem" ? { owedByThem: -amount, owedByUs: 0 } : { owedByThem: 0, owedByUs: -amount };
    case "delta":
      return {
        owedByThem: (0, import_money.toMoney)(effect.owedByThem ?? 0),
        owedByUs: (0, import_money.toMoney)(effect.owedByUs ?? 0)
      };
    case "net": {
      const signed = (0, import_money.mulMoney)(amount, effect.sign);
      return signed >= 0 ? { owedByThem: signed, owedByUs: 0 } : { owedByThem: 0, owedByUs: Math.abs(signed) };
    }
    default: {
      const _exhaustive = effect;
      return _exhaustive;
    }
  }
}
function netDelta(entry) {
  const d = entryDelta(entry);
  return (0, import_money.toMoney)(d.owedByThem - d.owedByUs);
}

// src/balance.ts
function emptyBalance() {
  return { owedByThem: 0, owedByUs: 0, net: 0 };
}
function balanceOf(owedByThem, owedByUs) {
  const them = (0, import_money2.toMoney)(owedByThem);
  const us = (0, import_money2.toMoney)(owedByUs);
  return {
    owedByThem: them,
    owedByUs: us,
    net: (0, import_money2.subMoney)(them, us)
  };
}
function buildBalanceFromTotals(input) {
  const owedByThem = (0, import_money2.subMoney)(
    (0, import_money2.toMoney)(input.chargedToThem ?? 0),
    (0, import_money2.toMoney)(input.settledByThem ?? 0)
  );
  const owedByUs = (0, import_money2.subMoney)(
    (0, import_money2.toMoney)(input.chargedToUs ?? 0),
    (0, import_money2.toMoney)(input.settledByUs ?? 0)
  );
  return balanceOf(owedByThem, owedByUs);
}
function applyDelta(balance, delta2) {
  return balanceOf(
    (0, import_money2.addMoney)(balance.owedByThem, delta2.owedByThem ?? 0),
    (0, import_money2.addMoney)(balance.owedByUs, delta2.owedByUs ?? 0)
  );
}
function buildBalanceFromEntries(entries, opening = emptyBalance()) {
  let current = opening;
  for (const entry of entries) {
    current = applyDelta(current, entryDelta(entry));
  }
  return current;
}
function mergeBalances(balances) {
  return balances.reduce(
    (acc, b) => balanceOf(
      (0, import_money2.addMoney)(acc.owedByThem, b.owedByThem),
      (0, import_money2.addMoney)(acc.owedByUs, b.owedByUs)
    ),
    emptyBalance()
  );
}
function indexBalances(rows) {
  const out = {};
  for (const row of rows) {
    out[String(row.id)] = row.balance;
  }
  return out;
}
function balanceOrEmpty(map, id) {
  const key = String(id);
  if (map instanceof Map) return map.get(key) ?? emptyBalance();
  return map[key] ?? emptyBalance();
}
function invertBalance(balance) {
  return balanceOf(balance.owedByUs, balance.owedByThem);
}
function isBalanced(balance, epsilon = 5e-3) {
  return Math.abs((0, import_money2.roundMoney)(balance.net)) <= epsilon;
}

// src/map.ts
var import_money3 = require("@plumo/money");
function mapToLedger(items, mapper) {
  const out = [];
  items.forEach((item, index) => {
    const mapped = mapper(item, index);
    if (mapped == null) return;
    if (Array.isArray(mapped)) {
      for (const entry of mapped) {
        if (entry) out.push(normalizeEntry(entry));
      }
      return;
    }
    out.push(normalizeEntry(mapped));
  });
  return out;
}
function createFieldMapper(fields) {
  return (item) => {
    if (fields.skip?.(item)) return null;
    const effect = fields.effect(item);
    if (!effect) return null;
    const amount = (0, import_money3.toMoney)(fields.amount(item));
    if (!Number.isFinite(amount)) return null;
    const id = fields.id?.(item);
    return normalizeEntry({
      id: id == null ? void 0 : String(id),
      date: fields.date(item),
      amount,
      effect,
      reference: fields.reference?.(item),
      label: fields.label?.(item),
      meta: fields.meta?.(item)
    });
  };
}
function createRuleMapper(options) {
  return createFieldMapper({
    date: options.date,
    amount: options.amount,
    id: options.id,
    reference: options.reference,
    label: options.label,
    meta: options.meta,
    skip: options.skip,
    effect: (item) => {
      const rule = options.rules[options.key(item)];
      if (rule == null) return null;
      if (typeof rule === "function") return rule(item);
      return rule;
    }
  });
}
function normalizeEntry(entry) {
  return {
    ...entry,
    date: String(entry.date),
    amount: (0, import_money3.toMoney)(entry.amount),
    reference: entry.reference?.trim() || void 0,
    label: entry.label?.trim() || void 0
  };
}

// src/timeline.ts
function compareEntriesByDate(a, b) {
  const byDate = a.date.localeCompare(b.date);
  if (byDate !== 0) return byDate;
  return (a.reference ?? "").localeCompare(b.reference ?? "", "fr");
}
function filterEntriesByPeriod(entries, period) {
  if (!period?.from && !period?.to) return [...entries];
  return entries.filter((entry) => {
    if (period.from && entry.date < period.from) return false;
    if (period.to && entry.date > period.to) return false;
    return true;
  });
}
function sortEntries(entries, compare = compareEntriesByDate) {
  return [...entries].sort(compare);
}
function buildTimeline(entries, options = {}) {
  const filtered = filterEntriesByPeriod(entries, options.period);
  const sorted = sortEntries(filtered, options.compare);
  let running = options.opening ?? emptyBalance();
  return sorted.map((entry) => {
    const delta2 = entryDelta(entry);
    running = applyDelta(running, delta2);
    return {
      ...entry,
      netDelta: netDelta(entry),
      delta: delta2,
      running: { ...running }
    };
  });
}
function buildPeriodTimeline(entries, period, seed = emptyBalance()) {
  const before = period.from ? entries.filter((e) => e.date < period.from) : [];
  const opening = before.reduce(
    (bal, entry) => applyDelta(bal, entryDelta(entry)),
    seed
  );
  const rows = buildTimeline(entries, { opening, period });
  const closing = rows.length > 0 ? rows[rows.length - 1].running : opening;
  return { opening, rows, closing };
}

// src/period.ts
var import_money4 = require("@plumo/money");
function summarizeEntries(entries) {
  const buckets = {
    chargeThem: 0,
    chargeUs: 0,
    settleThem: 0,
    settleUs: 0,
    count: entries.length
  };
  for (const entry of entries) {
    const amount = Math.abs((0, import_money4.toMoney)(entry.amount));
    switch (entry.effect.kind) {
      case "charge":
        if (entry.effect.side === "owedByThem") {
          buckets.chargeThem = (0, import_money4.addMoney)(buckets.chargeThem, amount);
        } else {
          buckets.chargeUs = (0, import_money4.addMoney)(buckets.chargeUs, amount);
        }
        break;
      case "settle":
        if (entry.effect.side === "owedByThem") {
          buckets.settleThem = (0, import_money4.addMoney)(buckets.settleThem, amount);
        } else {
          buckets.settleUs = (0, import_money4.addMoney)(buckets.settleUs, amount);
        }
        break;
      case "delta":
        if ((entry.effect.owedByThem ?? 0) > 0) {
          buckets.chargeThem = (0, import_money4.addMoney)(
            buckets.chargeThem,
            entry.effect.owedByThem ?? 0
          );
        } else if ((entry.effect.owedByThem ?? 0) < 0) {
          buckets.settleThem = (0, import_money4.addMoney)(
            buckets.settleThem,
            Math.abs(entry.effect.owedByThem ?? 0)
          );
        }
        if ((entry.effect.owedByUs ?? 0) > 0) {
          buckets.chargeUs = (0, import_money4.addMoney)(
            buckets.chargeUs,
            entry.effect.owedByUs ?? 0
          );
        } else if ((entry.effect.owedByUs ?? 0) < 0) {
          buckets.settleUs = (0, import_money4.addMoney)(
            buckets.settleUs,
            Math.abs(entry.effect.owedByUs ?? 0)
          );
        }
        break;
      case "net":
        if (entry.effect.sign > 0) {
          buckets.chargeThem = (0, import_money4.addMoney)(buckets.chargeThem, amount);
        } else {
          buckets.chargeUs = (0, import_money4.addMoney)(buckets.chargeUs, amount);
        }
        break;
    }
  }
  return buckets;
}
function summarizePeriod(entries, period, opening = emptyBalance()) {
  const filtered = filterEntriesByPeriod(entries, period);
  return {
    buckets: summarizeEntries(filtered),
    balance: buildBalanceFromEntries(filtered, opening)
  };
}
function groupEntries(entries, keyOf) {
  const map = /* @__PURE__ */ new Map();
  for (const entry of entries) {
    const key = keyOf(entry);
    const list = map.get(key);
    if (list) list.push(entry);
    else map.set(key, [entry]);
  }
  return map;
}
function balancesByGroup(entries, keyOf, opening = emptyBalance()) {
  const grouped = groupEntries(entries, keyOf);
  const out = /* @__PURE__ */ new Map();
  for (const [key, list] of grouped) {
    out.set(key, buildBalanceFromEntries(list, opening));
  }
  return out;
}

// src/classify.ts
var import_money5 = require("@plumo/money");
function classifyBalance(balance, options = {}) {
  const epsilon = options.epsilon ?? 5e-3;
  const them = Math.abs((0, import_money5.roundMoney)(balance.owedByThem)) > epsilon;
  const us = Math.abs((0, import_money5.roundMoney)(balance.owedByUs)) > epsilon;
  if (them && us) return "both";
  if (them) return "they_owe";
  if (us) return "we_owe";
  return "balanced";
}
function matchesBalanceState(balance, state, options) {
  if (!state || state === "all") return true;
  return classifyBalance(balance, options) === state;
}
function filterByBalanceState(rows, getBalance, state, options) {
  if (!state || state === "all") return [...rows];
  return rows.filter(
    (row) => matchesBalanceState(getBalance(row), state, options)
  );
}
function creditLimitStatus(balance, threshold, options = {}) {
  const epsilon = options.epsilon ?? 5e-3;
  const nearRatio = options.nearRatio ?? 0.8;
  const owed = (0, import_money5.roundMoney)(balance.owedByThem);
  if (owed <= epsilon) return "allPaidUp";
  const limit = Number(threshold) || 0;
  if (limit <= 0) return null;
  if (owed >= limit) return "exceededCreditLimit";
  if (owed >= limit * nearRatio) return "nearCreditLimit";
  return null;
}
function matchesCreditLimitState(balance, threshold, state, options) {
  if (!state) return true;
  return creditLimitStatus(balance, threshold, options) === state;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Effect,
  applyDelta,
  balanceOf,
  balanceOrEmpty,
  balancesByGroup,
  buildBalanceFromEntries,
  buildBalanceFromTotals,
  buildPeriodTimeline,
  buildTimeline,
  charge,
  classifyBalance,
  compareEntriesByDate,
  createFieldMapper,
  createRuleMapper,
  creditLimitStatus,
  delta,
  emptyBalance,
  entryDelta,
  filterByBalanceState,
  filterEntriesByPeriod,
  groupEntries,
  indexBalances,
  invertBalance,
  isBalanced,
  mapToLedger,
  matchesBalanceState,
  matchesCreditLimitState,
  mergeBalances,
  netDelta,
  netEffect,
  settle,
  sortEntries,
  summarizeEntries,
  summarizePeriod
});
