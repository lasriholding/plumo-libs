type CurrencyCode = "MAD" | "EUR" | "USD" | string;
type MoneyConfig = {
    locale: string;
    currency: CurrencyCode;
    currencyDisplay: "code" | "symbol" | "narrowSymbol" | "name";
    fractionDigits: number;
};
declare function configureMoney(partial: Partial<MoneyConfig>): MoneyConfig;
declare function getMoneyConfig(): MoneyConfig;
declare function resetMoneyConfig(): void;
/** Round half-up to configured fraction digits. */
declare function roundMoney(value: number): number;
declare function isFiniteMoney(value: unknown): value is number;
/** Safe number → money; null/NaN → 0. */
declare function toMoney(value: unknown): number;
/**
 * Parse common FR/EN money strings: `1 234,56`, `1,234.56`, `1234.56 MAD`.
 * Returns null when unparseable.
 */
declare function parseMoney(input: string): number | null;
declare function addMoney(...values: number[]): number;
declare function subMoney(a: number, b: number): number;
declare function mulMoney(a: number, b: number): number;
declare function divMoney(a: number, b: number): number;
declare function sumMoney(values: Iterable<number>): number;
declare function percentOf(amount: number, percent: number): number;
declare function applyPercent(amount: number, percent: number): number;
declare function discount(amount: number, percent: number): number;
/** HT → tax amount at rate %. */
declare function taxFromHt(ht: number, taxPercent: number): number;
/** HT → TTC. */
declare function htToTtc(ht: number, taxPercent: number): number;
/** TTC → HT + tax. */
declare function ttcToHt(ttc: number, taxPercent: number): {
    ht: number;
    tax: number;
    ttc: number;
};
type LineCalcInput = {
    quantity: number;
    unitPrice: number;
    /** Tax rate percent (e.g. 20). */
    taxRate?: number;
    /** Unit prices are TTC when true (default HT). */
    priceIncludesTax?: boolean;
};
type LineCalc = {
    quantity: number;
    unitPrice: number;
    taxRate: number;
    subtotal: number;
    taxAmount: number;
    total: number;
};
declare function calcLine(input: LineCalcInput): LineCalc;
declare function calcLines(lines: LineCalcInput[]): {
    lines: LineCalc[];
    subtotal: number;
    taxAmount: number;
    total: number;
};
type DocumentTotalsInput = {
    subtotal: number;
    taxAmount: number;
    discountAmount?: number;
};
declare function buildTotals(input: {
    subtotal?: number;
    taxAmount?: number;
    linesTotal?: number;
    discountAmount?: number;
}): {
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
};
declare const moneyFmt: {
    format(value: number): string;
};
/** Number only, locale-aware. */
declare function formatMoney(value: number): string;
/** e.g. `1 234,56 MAD` */
declare function money(value: number, currency?: string): string;
/** Native currency style when locale supports it. */
declare function moneyCurrency(value: number, options?: {
    currency?: CurrencyCode;
    currencyDisplay?: MoneyConfig["currencyDisplay"];
}): string;
declare function formatPercent(value: number, fractionDigits?: number): string;
declare function formatDate(value: string | number | Date, options?: Intl.DateTimeFormatOptions): string;
/** @deprecated use formatDate */
declare const formatDateFrMa: typeof formatDate;
declare function escapeHtml(text: string): string;
type AmountInWordsOptions = {
    currencyName?: string;
    centName?: string;
    capitalize?: boolean;
};
/** French amount-in-words (default: dirhams / centimes). */
declare function amountToFrench(amount: number, options?: AmountInWordsOptions): string;
declare function compareMoney(a: number, b: number): -1 | 0 | 1;
declare function clampMoney(value: number, min: number, max: number): number;

export { type AmountInWordsOptions, type CurrencyCode, type DocumentTotalsInput, type LineCalc, type LineCalcInput, type MoneyConfig, addMoney, amountToFrench, applyPercent, buildTotals, calcLine, calcLines, clampMoney, compareMoney, configureMoney, discount, divMoney, escapeHtml, formatDate, formatDateFrMa, formatMoney, formatPercent, getMoneyConfig, htToTtc, isFiniteMoney, money, moneyCurrency, moneyFmt, mulMoney, parseMoney, percentOf, resetMoneyConfig, roundMoney, subMoney, sumMoney, taxFromHt, toMoney, ttcToHt };
