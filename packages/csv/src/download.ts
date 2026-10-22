import type { CsvDownloadOptions } from "./types.js"

function timestampSuffix(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  const hh = String(now.getHours()).padStart(2, "0")
  const mm = String(now.getMinutes()).padStart(2, "0")
  const ss = String(now.getSeconds()).padStart(2, "0")
  return `${y}-${m}-${d}_${hh}-${mm}-${ss}`
}

export function csvFilename(options: CsvDownloadOptions): string {
  const stamp = options.timestamp === false ? "" : `_${timestampSuffix()}`
  const base = options.filename.replace(/\.csv$/i, "")
  return `${base}${stamp}.csv`
}

/** UTF-8 CSV bytes (optional BOM) — works in Node and browser. */
export function csvToUint8Array(
  content: string,
  options: Pick<CsvDownloadOptions, "bom"> = {},
): Uint8Array {
  const withBom = options.bom === false ? content : `\uFEFF${content}`
  return new TextEncoder().encode(withBom)
}

export function csvToBlob(
  content: string,
  options: Pick<CsvDownloadOptions, "bom" | "mimeType"> = {},
): Blob {
  if (typeof Blob === "undefined") {
    throw new Error("@plumo/csv csvToBlob requires Blob support")
  }
  const withBom = options.bom === false ? content : `\uFEFF${content}`
  return new Blob([withBom], {
    type: options.mimeType ?? "text/csv;charset=utf-8;",
  })
}

/** Trigger a browser file download for CSV text. */
export function downloadCsv(content: string, options: CsvDownloadOptions): void {
  if (typeof document === "undefined") {
    throw new Error("@plumo/csv downloadCsv requires a browser DOM")
  }
  const filename = csvFilename(options)
  const blob = csvToBlob(content, options)
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.rel = "noopener"
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
