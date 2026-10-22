import { commercialContentStyles, renderCommercialDocument } from "./commercial.js"
import type { CommercialPrintData } from "./commercial.js"
import type { PrintMargins, PrintPageSize } from "./page.js"
import { buildPrintHtml } from "./preview.js"
import { runPrint } from "./run-print.js"
import { loadPrintSettings } from "./settings.js"

export type { PrintPageSize, PrintMargins } from "./page.js"
export { PAGE_SIZES, resolveMargins } from "./page.js"
export {
  renderDocument,
  mapProductLines,
  type PrintInfoRow,
  type PrintLine,
  type DocumentPrintModel,
  type PrintInfoCell,
} from "./document.js"
export { runPrint } from "./run-print.js"
export {
  configurePrintSettings,
  loadPrintSettings,
  invalidatePrintSettingsCache,
  type PrintSettings,
  type PrintSettingsSource,
} from "./settings.js"
export { buildDocumentCss } from "./css.js"
export {
  configurePrintTheme,
  getPrintTheme,
  resetPrintTheme,
  DEFAULT_PRINT_THEME,
  type PrintTheme,
} from "./theme.js"
export {
  renderCommercialDocument,
  commercialContentStyles,
  COMMERCIAL_TYPE_LABELS,
  type CommercialDocType,
  type CommercialPrintData,
  type CommercialPrintItem,
} from "./commercial.js"
export {
  buildPrintHtml,
  openPrintPreview,
  type PreviewOptions,
} from "./preview.js"

export type PrintOptions = {
  pageSize: PrintPageSize
  margins?: PrintMargins | null
  backgroundUrl?: string | null
  /** When true (default), load configured settings if margins/template omitted. */
  useSettings?: boolean
  extraCss?: string
}

async function withSettings(options: PrintOptions) {
  if (options.useSettings === false) {
    return {
      pageSize: options.pageSize,
      margins: options.margins ?? null,
      backgroundUrl: options.backgroundUrl ?? null,
      extraCss: options.extraCss,
    }
  }

  const settings = await loadPrintSettings()
  return {
    pageSize: options.pageSize,
    margins: options.margins ?? settings.margins,
    backgroundUrl:
      options.backgroundUrl !== undefined
        ? options.backgroundUrl
        : settings.backgroundUrl,
    extraCss: options.extraCss,
  }
}

export async function printDocumentHtml(
  html: string,
  options: PrintOptions,
): Promise<void> {
  const resolved = await withSettings(options)
  await runPrint(html, resolved)
}

export async function printCommercialDocument(
  data: CommercialPrintData,
  options: Omit<PrintOptions, "pageSize"> & { pageSize?: PrintPageSize } = {},
): Promise<void> {
  const html = renderCommercialDocument(data)
  await printDocumentHtml(html, {
    pageSize: options.pageSize ?? "A4",
    ...options,
    extraCss: [commercialContentStyles(), options.extraCss ?? ""]
      .filter(Boolean)
      .join("\n"),
  })
}

/** Multi-document print with page breaks. */
export async function printCommercialDocuments(
  documents: CommercialPrintData[],
  options: Omit<PrintOptions, "pageSize"> & { pageSize?: PrintPageSize } = {},
): Promise<void> {
  if (!documents.length) return
  const html = documents
    .map((data, index) => {
      const body = renderCommercialDocument(data)
      const breakClass =
        index < documents.length - 1
          ? ' style="page-break-after:always;break-after:page"'
          : ""
      return `<div${breakClass}>${body}</div>`
    })
    .join("")

  await printDocumentHtml(html, {
    pageSize: options.pageSize ?? "A4",
    ...options,
    extraCss: [commercialContentStyles(), options.extraCss ?? ""]
      .filter(Boolean)
      .join("\n"),
  })
}

export async function previewCommercialDocument(
  data: CommercialPrintData,
  options: Omit<PrintOptions, "pageSize"> & { pageSize?: PrintPageSize } = {},
): Promise<string> {
  const resolved = await withSettings({
    pageSize: options.pageSize ?? "A4",
    ...options,
  })
  return buildPrintHtml(renderCommercialDocument(data), {
    pageSize: resolved.pageSize,
    margins: resolved.margins,
    backgroundUrl: resolved.backgroundUrl,
    title: `${data.documentNumber} - ${data.clientName}`,
    commercial: true,
    extraCss: options.extraCss,
  })
}
