import { buildDocumentCss } from "./css.js"
import { commercialContentStyles } from "./commercial.js"
import { PAGE_SIZES, type PrintMargins, type PrintPageSize } from "./page.js"

function escapeAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")
}

export type PreviewOptions = {
  pageSize?: PrintPageSize
  margins?: PrintMargins | null
  backgroundUrl?: string | null
  title?: string
  /** Include commercial document CSS. */
  commercial?: boolean
  extraCss?: string
}

/** Build a full printable HTML document string (no DOM side effects). */
export function buildPrintHtml(
  bodyHtml: string,
  options: PreviewOptions = {},
): string {
  const pageSize = options.pageSize ?? "A4"
  const page = PAGE_SIZES[pageSize]
  const bg = options.backgroundUrl?.trim() || ""
  const title = options.title ?? "Document"
  const content = bg
    ? `<img class="doc-bg" src="${escapeAttr(bg)}" alt="" />${bodyHtml}`
    : bodyHtml

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeAttr(title)}</title>
  <style>
    ${buildDocumentCss(page, pageSize, options.margins)}
    ${options.commercial ? commercialContentStyles() : ""}
    ${options.extraCss ?? ""}
    html, body {
      width: ${page.width};
      margin: 0;
      padding: 0;
      background: #fff;
    }
    body { color: #000; }
    .doc-bg {
      position: fixed; top: 0; left: 0;
      width: ${page.width}; height: ${page.height};
      object-fit: fill; z-index: 0; pointer-events: none;
    }
    .doc { position: relative; z-index: 1; }
    @media print {
      @page { size: ${pageSize} portrait; margin: 0; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
  </style>
</head>
<body>
  <div id="temp-print-container">${content}</div>
</body>
</html>`
}

/** Open HTML in a new window for preview (browser only). */
export function openPrintPreview(html: string): Window | null {
  if (typeof window === "undefined") {
    throw new Error("@plumo/print openPrintPreview requires a browser")
  }
  const w = window.open("", "_blank", "noopener,noreferrer")
  if (!w) return null
  w.document.open()
  w.document.write(html)
  w.document.close()
  return w
}
