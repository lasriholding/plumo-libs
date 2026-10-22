import type { CsvParseOptions, CsvParseResult } from "./types.js"

function detectDelimiter(sample: string): string {
  const firstLine = sample.split(/\r?\n/).find((l) => l.trim()) ?? ""
  const counts = {
    ",": (firstLine.match(/,/g) ?? []).length,
    ";": (firstLine.match(/;/g) ?? []).length,
    "\t": (firstLine.match(/\t/g) ?? []).length,
  }
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  return best && best[1] > 0 ? best[0] : ","
}

function parseLine(line: string, delimiter: string): string[] {
  const cells: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
      continue
    }
    if (ch === '"') {
      inQuotes = true
      continue
    }
    if (ch === delimiter) {
      cells.push(current)
      current = ""
      continue
    }
    current += ch
  }
  cells.push(current)
  return cells
}

function castValue(raw: string): string | number | boolean {
  const v = raw
  if (v === "true" || v === "TRUE" || v === "Oui" || v === "oui") return true
  if (v === "false" || v === "FALSE" || v === "Non" || v === "non") return false
  if (v !== "" && /^-?\d+([.,]\d+)?$/.test(v)) {
    const n = Number(v.replace(",", "."))
    if (Number.isFinite(n)) return n
  }
  return v
}

/** RFC4180-ish parser with auto delimiter detection. */
export function parseCsv(
  content: string,
  options: CsvParseOptions = {},
): CsvParseResult {
  const text = content.replace(/^\uFEFF/, "")
  const delimiter = options.delimiter ?? detectDelimiter(text)
  const skipEmpty = options.skipEmptyLines !== false
  const trim = options.trim !== false
  const useHeader = options.header !== false

  const lines = text.split(/\r?\n/)
  const rows: string[][] = []

  for (const line of lines) {
    if (skipEmpty && !line.trim()) continue
    let cells = parseLine(line, delimiter)
    if (trim) cells = cells.map((c) => c.trim())
    rows.push(cells)
  }

  if (!rows.length) {
    return { headers: [], rows: [], records: [] }
  }

  if (!useHeader) {
    return { headers: [], rows, records: [] }
  }

  const headers = rows[0] ?? []
  const dataRows = rows.slice(1)
  const records = dataRows.map((row) => {
    const record: Record<string, string> = {}
    headers.forEach((header, i) => {
      const key = header || `col_${i}`
      record[key] = row[i] ?? ""
    })
    return record
  })

  if (options.cast) {
    for (const record of records) {
      for (const key of Object.keys(record)) {
        ;(record as Record<string, unknown>)[key] = castValue(record[key] ?? "")
      }
    }
  }

  return { headers, rows: dataRows, records }
}

export function parseCsvRecords<T extends Record<string, unknown> = Record<string, string>>(
  content: string,
  options: CsvParseOptions = {},
): T[] {
  return parseCsv(content, { ...options, header: true }).records as T[]
}
