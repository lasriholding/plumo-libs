import { applyDelta, emptyBalance } from "./balance.js"
import { entryDelta, netDelta } from "./effects.js"
import type {
  CompanyBalance,
  LedgerEntry,
  PeriodFilter,
  TimelineRow,
} from "./types.js"

export type TimelineOptions = {
  opening?: CompanyBalance
  /** Default: date asc, then reference asc. */
  compare?: (a: LedgerEntry, b: LedgerEntry) => number
  period?: PeriodFilter
}

export function compareEntriesByDate(
  a: LedgerEntry,
  b: LedgerEntry,
): number {
  const byDate = a.date.localeCompare(b.date)
  if (byDate !== 0) return byDate
  return (a.reference ?? "").localeCompare(b.reference ?? "", "fr")
}

export function filterEntriesByPeriod(
  entries: readonly LedgerEntry[],
  period?: PeriodFilter,
): LedgerEntry[] {
  if (!period?.from && !period?.to) return [...entries]
  return entries.filter((entry) => {
    if (period.from && entry.date < period.from) return false
    if (period.to && entry.date > period.to) return false
    return true
  })
}

export function sortEntries(
  entries: readonly LedgerEntry[],
  compare: (a: LedgerEntry, b: LedgerEntry) => number = compareEntriesByDate,
): LedgerEntry[] {
  return [...entries].sort(compare)
}

/** Running balance statement from any normalized ledger. */
export function buildTimeline(
  entries: readonly LedgerEntry[],
  options: TimelineOptions = {},
): TimelineRow[] {
  const filtered = filterEntriesByPeriod(entries, options.period)
  const sorted = sortEntries(filtered, options.compare)
  let running = options.opening ?? emptyBalance()

  return sorted.map((entry) => {
    const delta = entryDelta(entry)
    running = applyDelta(running, delta)
    return {
      ...entry,
      netDelta: netDelta(entry),
      delta,
      running: { ...running },
    }
  })
}

/**
 * Split entries into before / in period for opening + period timeline.
 * Opening = balance of entries strictly before `from` (plus optional seed).
 */
export function buildPeriodTimeline(
  entries: readonly LedgerEntry[],
  period: PeriodFilter,
  seed: CompanyBalance = emptyBalance(),
): {
  opening: CompanyBalance
  rows: TimelineRow[]
  closing: CompanyBalance
} {
  const before = period.from
    ? entries.filter((e) => e.date < period.from!)
    : []
  const opening = before.reduce(
    (bal, entry) => applyDelta(bal, entryDelta(entry)),
    seed,
  )
  const rows = buildTimeline(entries, { opening, period })
  const closing =
    rows.length > 0 ? rows[rows.length - 1]!.running : opening
  return { opening, rows, closing }
}
