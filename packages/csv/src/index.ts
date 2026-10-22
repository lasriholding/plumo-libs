import { buildCsv, buildExcelCsv } from "./build-csv.js"
import { downloadCsv } from "./download.js"
import type { CsvBuildOptions, CsvColumn, CsvDownloadOptions } from "./types.js"

export type {
  CsvColumn,
  CsvBuildOptions,
  CsvDownloadOptions,
  CsvPrimitive,
  CsvParseOptions,
  CsvParseResult,
} from "./types.js"

export {
  buildCsv,
  buildCsvFromMatrix,
  buildExcelCsv,
  defineCsvColumns,
  escapeCsvCell,
  activeColumns,
} from "./build-csv.js"

export {
  downloadCsv,
  csvFilename,
  csvToBlob,
  csvToUint8Array,
} from "./download.js"

export { parseCsv, parseCsvRecords } from "./parse-csv.js"
export { csvFormat } from "./format.js"

/** Build + download in one step. No-op when rows are empty. */
export function exportToCsv<T>(
  rows: readonly T[],
  columns: readonly CsvColumn<T>[],
  options: CsvDownloadOptions & CsvBuildOptions,
): boolean {
  if (!rows.length || !columns.length) return false
  const {
    filename,
    timestamp,
    bom,
    mimeType,
    delimiter,
    includeHeader,
    lineEnding,
    booleanLabels,
    dateFormat,
    quoteAll,
  } = options
  const content = buildCsv(rows, columns, {
    delimiter,
    includeHeader,
    lineEnding,
    booleanLabels,
    dateFormat,
    quoteAll,
  })
  downloadCsv(content, { filename, timestamp, bom, mimeType })
  return true
}

/** Excel FR export (`;` + CRLF + BOM). */
export function exportToExcelCsv<T>(
  rows: readonly T[],
  columns: readonly CsvColumn<T>[],
  options: CsvDownloadOptions & Omit<CsvBuildOptions, "delimiter" | "lineEnding">,
): boolean {
  if (!rows.length || !columns.length) return false
  const content = buildExcelCsv(rows, columns, options)
  downloadCsv(content, {
    filename: options.filename,
    timestamp: options.timestamp,
    bom: options.bom !== false,
    mimeType: options.mimeType,
  })
  return true
}

/** Map rows then export — useful for API list → CSV. */
export function exportMappedCsv<T, R>(
  rows: readonly T[],
  mapRow: (row: T, index: number) => R,
  columns: readonly CsvColumn<R>[],
  options: CsvDownloadOptions & CsvBuildOptions,
): boolean {
  return exportToCsv(rows.map(mapRow), columns, options)
}
