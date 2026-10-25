/** Who the amount is charged to / settled against. */
type DebtSide = "owedByThem" | "owedByUs";
/**
 * How an entry moves company debts.
 * - charge: increases a side (invoice / delivery)
 * - settle: decreases a side (payment / credit note)
 * - delta: explicit adjustments (fully custom)
 * - net: signed impact on net only (owedByThem - owedByUs)
 */
type LedgerEffect = {
    kind: "charge";
    side: DebtSide;
} | {
    kind: "settle";
    side: DebtSide;
} | {
    kind: "delta";
    owedByThem?: number;
    owedByUs?: number;
} | {
    kind: "net";
    sign: 1 | -1;
};
/** Normalized ledger row — schema-agnostic. */
type LedgerEntry = {
    id?: string;
    date: string;
    reference?: string;
    label?: string;
    /** Magnitude (usually >= 0). Sign comes from `effect`. */
    amount: number;
    effect: LedgerEffect;
    /** Pass-through app data (doc type, method, etc.). */
    meta?: Record<string, unknown>;
};
type CompanyBalance = {
    /** Receivable — they owe us. */
    owedByThem: number;
    /** Payable — we owe them. */
    owedByUs: number;
    /** owedByThem - owedByUs (positive ⇒ net receivable). */
    net: number;
};
type BalanceTotalsInput = {
    /** Charged to them (sales / outbound deliveries). */
    chargedToThem?: number;
    /** Charged to us (purchases / inbound deliveries). */
    chargedToUs?: number;
    /** Settlements reducing what they owe (incoming payments, sale credit notes). */
    settledByThem?: number;
    /** Settlements reducing what we owe (outgoing payments, purchase credit notes). */
    settledByUs?: number;
};
type TimelineRow = LedgerEntry & {
    /** Signed impact on net for this row. */
    netDelta: number;
    /** Delta applied to owedByThem / owedByUs. */
    delta: {
        owedByThem: number;
        owedByUs: number;
    };
    running: CompanyBalance;
};
type PeriodFilter = {
    from?: string;
    to?: string;
};
type BalanceState = "balanced" | "they_owe" | "we_owe" | "both";
type BalanceClassifyOptions = {
    /** Absolute net below this is treated as balanced (default 0.005). */
    epsilon?: number;
};
/** Credit / threshold filters for company lists (receivable vs limit). */
type CreditLimitState = "nearCreditLimit" | "exceededCreditLimit" | "allPaidUp";
type CreditLimitOptions = {
    /** Fraction of threshold that starts "near" (default 0.8). */
    nearRatio?: number;
    /** Absolute owedByThem at/below this is treated as paid up (default 0.005). */
    epsilon?: number;
};

declare function emptyBalance(): CompanyBalance;
declare function balanceOf(owedByThem: number, owedByUs: number): CompanyBalance;
/** Classic ERP formula from aggregate buckets (any source). */
declare function buildBalanceFromTotals(input: BalanceTotalsInput): CompanyBalance;
declare function applyDelta(balance: CompanyBalance, delta: {
    owedByThem?: number;
    owedByUs?: number;
}): CompanyBalance;
declare function buildBalanceFromEntries(entries: readonly LedgerEntry[], opening?: CompanyBalance): CompanyBalance;
declare function mergeBalances(balances: readonly CompanyBalance[]): CompanyBalance;
/** Map of entity id → balance (batch helpers). */
declare function indexBalances<TId extends string | number>(rows: ReadonlyArray<{
    id: TId;
    balance: CompanyBalance;
}>): Record<string, CompanyBalance>;
declare function balanceOrEmpty(map: Record<string, CompanyBalance> | Map<string, CompanyBalance>, id: string | number): CompanyBalance;
declare function invertBalance(balance: CompanyBalance): CompanyBalance;
declare function isBalanced(balance: CompanyBalance, epsilon?: number): boolean;

/** Optional named effects — apps can ignore and pass custom effects. */
declare const Effect: {
    chargeThem: {
        readonly kind: "charge";
        readonly side: "owedByThem";
    };
    chargeUs: {
        readonly kind: "charge";
        readonly side: "owedByUs";
    };
    settleThem: {
        readonly kind: "settle";
        readonly side: "owedByThem";
    };
    settleUs: {
        readonly kind: "settle";
        readonly side: "owedByUs";
    };
    netPlus: {
        readonly kind: "net";
        readonly sign: 1;
    };
    netMinus: {
        readonly kind: "net";
        readonly sign: -1;
    };
};
declare function charge(side: DebtSide): LedgerEffect;
declare function settle(side: DebtSide): LedgerEffect;
declare function delta(owedByThem?: number, owedByUs?: number): LedgerEffect;
declare function netEffect(sign: 1 | -1): LedgerEffect;
declare function entryDelta(entry: LedgerEntry): {
    owedByThem: number;
    owedByUs: number;
};
/** Signed impact on `balance.net`. */
declare function netDelta(entry: LedgerEntry): number;

type EntryMapper<T> = (item: T, index: number) => LedgerEntry | LedgerEntry[] | null | undefined;
type FieldMapper<T> = {
    date: (item: T) => string;
    amount: (item: T) => number;
    effect: (item: T) => LedgerEffect | null | undefined;
    id?: (item: T) => string | number | undefined;
    reference?: (item: T) => string | undefined;
    label?: (item: T) => string | undefined;
    meta?: (item: T) => Record<string, unknown> | undefined;
    /** Skip row when true. */
    skip?: (item: T) => boolean;
};
/** Map arbitrary rows into normalized ledger entries. */
declare function mapToLedger<T>(items: readonly T[], mapper: EntryMapper<T>): LedgerEntry[];
/** Declarative field-based mapper (most flexible for unknown shapes). */
declare function createFieldMapper<T>(fields: FieldMapper<T>): EntryMapper<T>;
/**
 * Rule table mapper: pick effect from a key on each item.
 * Ideal when apps have many document types but stable effect semantics.
 */
declare function createRuleMapper<T, TKey extends string | number>(options: {
    key: (item: T) => TKey;
    rules: Partial<Record<TKey, LedgerEffect | ((item: T) => LedgerEffect | null)>>;
    date: (item: T) => string;
    amount: (item: T) => number;
    id?: (item: T) => string | number | undefined;
    reference?: (item: T) => string | undefined;
    label?: (item: T) => string | undefined;
    meta?: (item: T) => Record<string, unknown> | undefined;
    skip?: (item: T) => boolean;
}): EntryMapper<T>;

type TimelineOptions = {
    opening?: CompanyBalance;
    /** Default: date asc, then reference asc. */
    compare?: (a: LedgerEntry, b: LedgerEntry) => number;
    period?: PeriodFilter;
};
declare function compareEntriesByDate(a: LedgerEntry, b: LedgerEntry): number;
declare function filterEntriesByPeriod(entries: readonly LedgerEntry[], period?: PeriodFilter): LedgerEntry[];
declare function sortEntries(entries: readonly LedgerEntry[], compare?: (a: LedgerEntry, b: LedgerEntry) => number): LedgerEntry[];
/** Running balance statement from any normalized ledger. */
declare function buildTimeline(entries: readonly LedgerEntry[], options?: TimelineOptions): TimelineRow[];
/**
 * Split entries into before / in period for opening + period timeline.
 * Opening = balance of entries strictly before `from` (plus optional seed).
 */
declare function buildPeriodTimeline(entries: readonly LedgerEntry[], period: PeriodFilter, seed?: CompanyBalance): {
    opening: CompanyBalance;
    rows: TimelineRow[];
    closing: CompanyBalance;
};

type LedgerBucketSummary = {
    chargeThem: number;
    chargeUs: number;
    settleThem: number;
    settleUs: number;
    count: number;
};
type PeriodSummary = {
    buckets: LedgerBucketSummary;
    balance: CompanyBalance;
};
declare function summarizeEntries(entries: readonly LedgerEntry[]): LedgerBucketSummary;
declare function summarizePeriod(entries: readonly LedgerEntry[], period?: PeriodFilter, opening?: CompanyBalance): PeriodSummary;
/** Group entries by arbitrary key (companyId, month, type, …). */
declare function groupEntries<TKey extends string | number>(entries: readonly LedgerEntry[], keyOf: (entry: LedgerEntry) => TKey): Map<TKey, LedgerEntry[]>;
declare function balancesByGroup<TKey extends string | number>(entries: readonly LedgerEntry[], keyOf: (entry: LedgerEntry) => TKey, opening?: CompanyBalance): Map<TKey, CompanyBalance>;

declare function classifyBalance(balance: CompanyBalance, options?: BalanceClassifyOptions): BalanceState;
declare function matchesBalanceState(balance: CompanyBalance, state: BalanceState | "all" | undefined, options?: BalanceClassifyOptions): boolean;
/** Filter helper for company lists with precomputed balances. */
declare function filterByBalanceState<T>(rows: readonly T[], getBalance: (row: T) => CompanyBalance, state: BalanceState | "all" | undefined, options?: BalanceClassifyOptions): T[];
/**
 * Classify receivable (`owedByThem`) against a company credit threshold.
 * Returns `null` when the balance is within limit (or no threshold applies).
 */
declare function creditLimitStatus(balance: CompanyBalance, threshold: number, options?: CreditLimitOptions): CreditLimitState | null;
declare function matchesCreditLimitState(balance: CompanyBalance, threshold: number, state: CreditLimitState | undefined, options?: CreditLimitOptions): boolean;

export { type BalanceClassifyOptions, type BalanceState, type BalanceTotalsInput, type CompanyBalance, type CreditLimitOptions, type CreditLimitState, type DebtSide, Effect, type EntryMapper, type FieldMapper, type LedgerBucketSummary, type LedgerEffect, type LedgerEntry, type PeriodFilter, type PeriodSummary, type TimelineOptions, type TimelineRow, applyDelta, balanceOf, balanceOrEmpty, balancesByGroup, buildBalanceFromEntries, buildBalanceFromTotals, buildPeriodTimeline, buildTimeline, charge, classifyBalance, compareEntriesByDate, createFieldMapper, createRuleMapper, creditLimitStatus, delta, emptyBalance, entryDelta, filterByBalanceState, filterEntriesByPeriod, groupEntries, indexBalances, invertBalance, isBalanced, mapToLedger, matchesBalanceState, matchesCreditLimitState, mergeBalances, netDelta, netEffect, settle, sortEntries, summarizeEntries, summarizePeriod };
