import type { CsvBuildOptions, CsvColumn, CsvPrimitive } from "./types.js"

const DEFAULT_BOOL = { true: "Oui", false: "Non" }

function formatDate(value: Date, options: CsvBuildOptions): string {
  if (typeof options.dateFormat === "function") return options.dateFormat(value)
  if (options.dateFormat === "iso") return value.toISOString()
  const y = value.getFullYear()
  const m = String(value.getMonth() + 1).padStart(2, "0")
  const d = String(value.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function cellToText(value: CsvPrimitive, options: CsvBuildOptions): string {
  if (value == null) return ""
  if (value instanceof Date) return formatDate(value, options)
  if (typeof value === "boolean") {
    const labels = options.booleanLabels ?? DEFAULT_BOOL
    return value ? labels.true : labels.false
  }
  return String(value)
}

export function escapeCsvCell(
  value: CsvPrimitive,
  delimiter = ",",
  options: CsvBuildOptions = {},
): string {
  const text = cellToText(value, options)
  const needsQuote =
    options.quoteAll ||
    text.includes(delimiter) ||
    text.includes('"') ||
    text.includes("\n") ||
    text.includes("\r")
  if (!needsQuote) return text
  return `"${text.replace(/"/g, '""')}"`
}

export function activeColumns<T>(
  columns: readonly CsvColumn<T>[],
  rows: readonly T[],
): CsvColumn<T>[] {
  return columns.filter((col) => {
    if (col.enabled == null) return true
    return typeof col.enabled === "function" ? col.enabled(rows) : col.enabled
  })
}

/** Pure CSV string builder — no DOM. */
export function buildCsv<T>(
  rows: readonly T[],
  columns: readonly CsvColumn<T>[],
  options: CsvBuildOptions = {},
): string {
  const delimiter = options.delimiter ?? ","
  const includeHeader = options.includeHeader !== false
  const lineEnding = options.lineEnding ?? "\n"
  const cols = activeColumns(columns, rows)
  const lines: string[] = []

  if (includeHeader) {
    lines.push(
      cols
        .map((col) => escapeCsvCell(col.header, delimiter, options))
        .join(delimiter),
    )
  }

  rows.forEach((row, index) => {
    lines.push(
      cols
        .map((col) => escapeCsvCell(col.value(row, index), delimiter, options))
        .join(delimiter),
    )
  })

  return lines.join(lineEnding)
}

/** Build from raw matrix (header optional as first row). */
export function buildCsvFromMatrix(
  matrix: readonly (readonly CsvPrimitive[])[],
  options: CsvBuildOptions = {},
): string {
  const delimiter = options.delimiter ?? ","
  const lineEnding = options.lineEnding ?? "\n"
  return matrix
    .map((row) =>
      row.map((cell) => escapeCsvCell(cell, delimiter, options)).join(delimiter),
    )
    .join(lineEnding)
}

export function defineCsvColumns<T>(
  columns: readonly CsvColumn<T>[],
): readonly CsvColumn<T>[] {
  return columns
}

/** Excel FR friendly: semicolon delimiter + CRLF. */
export function buildExcelCsv<T>(
  rows: readonly T[],
  columns: readonly CsvColumn<T>[],
  options: Omit<CsvBuildOptions, "delimiter" | "lineEnding"> = {},
): string {
  return buildCsv(rows, columns, {
    ...options,
    delimiter: ";",
    lineEnding: "\r\n",
  })
}
