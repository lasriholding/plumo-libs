import { toMoney } from "@plumo/money"
import type { LedgerEffect, LedgerEntry } from "./types.js"

export type EntryMapper<T> = (
  item: T,
  index: number,
) => LedgerEntry | LedgerEntry[] | null | undefined

export type FieldMapper<T> = {
  date: (item: T) => string
  amount: (item: T) => number
  effect: (item: T) => LedgerEffect | null | undefined
  id?: (item: T) => string | number | undefined
  reference?: (item: T) => string | undefined
  label?: (item: T) => string | undefined
  meta?: (item: T) => Record<string, unknown> | undefined
  /** Skip row when true. */
  skip?: (item: T) => boolean
}

/** Map arbitrary rows into normalized ledger entries. */
export function mapToLedger<T>(
  items: readonly T[],
  mapper: EntryMapper<T>,
): LedgerEntry[] {
  const out: LedgerEntry[] = []
  items.forEach((item, index) => {
    const mapped = mapper(item, index)
    if (mapped == null) return
    if (Array.isArray(mapped)) {
      for (const entry of mapped) {
        if (entry) out.push(normalizeEntry(entry))
      }
      return
    }
    out.push(normalizeEntry(mapped))
  })
  return out
}

/** Declarative field-based mapper (most flexible for unknown shapes). */
export function createFieldMapper<T>(fields: FieldMapper<T>): EntryMapper<T> {
  return (item) => {
    if (fields.skip?.(item)) return null
    const effect = fields.effect(item)
    if (!effect) return null
    const amount = toMoney(fields.amount(item))
    if (!Number.isFinite(amount)) return null

    const id = fields.id?.(item)
    return normalizeEntry({
      id: id == null ? undefined : String(id),
      date: fields.date(item),
      amount,
      effect,
      reference: fields.reference?.(item),
      label: fields.label?.(item),
      meta: fields.meta?.(item),
    })
  }
}

/**
 * Rule table mapper: pick effect from a key on each item.
 * Ideal when apps have many document types but stable effect semantics.
 */
export function createRuleMapper<T, TKey extends string | number>(options: {
  key: (item: T) => TKey
  rules: Partial<Record<TKey, LedgerEffect | ((item: T) => LedgerEffect | null)>>
  date: (item: T) => string
  amount: (item: T) => number
  id?: (item: T) => string | number | undefined
  reference?: (item: T) => string | undefined
  label?: (item: T) => string | undefined
  meta?: (item: T) => Record<string, unknown> | undefined
  skip?: (item: T) => boolean
}): EntryMapper<T> {
  return createFieldMapper({
    date: options.date,
    amount: options.amount,
    id: options.id,
    reference: options.reference,
    label: options.label,
    meta: options.meta,
    skip: options.skip,
    effect: (item): LedgerEffect | null => {
      const rule = options.rules[options.key(item)]
      if (rule == null) return null
      if (typeof rule === "function") return rule(item)
      return rule
    },
  })
}

function normalizeEntry(entry: LedgerEntry): LedgerEntry {
  return {
    ...entry,
    date: String(entry.date),
    amount: toMoney(entry.amount),
    reference: entry.reference?.trim() || undefined,
    label: entry.label?.trim() || undefined,
  }
}
