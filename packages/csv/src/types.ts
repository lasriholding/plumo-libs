export type CsvPrimitive = string | number | boolean | null | undefined | Date

export type CsvColumn<T> = {
  /** Stable id (also used as fallback header). */
  id: string
  /** CSV header label. */
  header: string
  /** Extract a cell value from a row. */
  value: (row: T, index: number) => CsvPrimitive
  /** Skip column when false. */
  enabled?: boolean | ((rows: readonly T[]) => boolean)
}

export type CsvBuildOptions = {
  /** Default `,`. Use `;` for Excel FR. */
  delimiter?: string
  includeHeader?: boolean
  /** Line ending (default `\n`). */
  lineEnding?: "\n" | "\r\n"
  /** How booleans are written. */
  booleanLabels?: { true: string; false: string }
  /** Format dates (default ISO date `YYYY-MM-DD`). */
  dateFormat?: "iso-date" | "iso" | ((value: Date) => string)
  /** Quote all fields. */
  quoteAll?: boolean
}

export type CsvDownloadOptions = {
  filename: string
  /** Append `_YYYY-MM-DD_HH-mm-ss` (default true). */
  timestamp?: boolean
  /** UTF-8 BOM for Excel (default true). */
  bom?: boolean
  mimeType?: string
}

export type CsvParseOptions = {
  delimiter?: string
  /** First row is header (default true). */
  header?: boolean
  /** Skip empty lines (default true). */
  skipEmptyLines?: boolean
  /** Trim cell whitespace (default true). */
  trim?: boolean
  /** Cast numeric / boolean cells (default false). */
  cast?: boolean
}

export type CsvParseResult = {
  headers: string[]
  rows: string[][]
  records: Record<string, string>[]
}
