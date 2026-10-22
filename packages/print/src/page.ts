export type PrintPageSize = "A4" | "A5"

export type PrintMargins = {
  top: number
  right: number
  bottom: number
  left: number
}

export type PageTokens = {
  width: string
  height: string
  fallbackMargin: string
  title: string
  body: string
  info: string
  table: string
  th: string
  total: string
  notes: string
}

export const PAGE_SIZES: Record<PrintPageSize, PageTokens> = {
  A4: {
    width: "210mm",
    height: "297mm",
    fallbackMargin: "12mm",
    title: "20pt",
    body: "12pt",
    info: "11.5pt",
    table: "11pt",
    th: "10pt",
    total: "13pt",
    notes: "11pt",
  },
  A5: {
    width: "148mm",
    height: "210mm",
    fallbackMargin: "8mm",
    title: "15pt",
    body: "10pt",
    info: "9.5pt",
    table: "9pt",
    th: "8.5pt",
    total: "11pt",
    notes: "9.5pt",
  },
}

export function resolveMargins(
  pageSize: PrintPageSize,
  margins?: PrintMargins | null,
): string {
  if (
    margins &&
    [margins.top, margins.right, margins.bottom, margins.left].some(
      (v) => Number.isFinite(v) && v > 0,
    )
  ) {
    return `${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm`
  }
  return PAGE_SIZES[pageSize].fallbackMargin
}
