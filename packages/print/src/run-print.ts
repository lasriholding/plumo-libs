import { buildDocumentCss } from "./css.js"
import { PAGE_SIZES, type PrintMargins, type PrintPageSize } from "./page.js"

export type RunPrintOptions = {
  pageSize: PrintPageSize
  margins?: PrintMargins | null
  backgroundUrl?: string | null
  extraCss?: string
}

function escapeAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")
}

function waitForImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll("img"))
  if (images.length === 0) return Promise.resolve()
  return Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve()
            return
          }
          img.addEventListener("load", () => resolve(), { once: true })
          img.addEventListener("error", () => resolve(), { once: true })
        }),
    ),
  ).then(() => undefined)
}

export async function runPrint(
  html: string,
  options: RunPrintOptions,
): Promise<void> {
  if (typeof document === "undefined") {
    throw new Error("@plumo/print runPrint requires a browser DOM")
  }

  const page = PAGE_SIZES[options.pageSize]
  const bg = options.backgroundUrl?.trim() || ""
  const content = bg
    ? `<img class="doc-bg" src="${escapeAttr(bg)}" alt="" />${html}`
    : html

  const style = document.createElement("style")
  style.id = "temp-print-style"
  style.textContent = `
    ${buildDocumentCss(page, options.pageSize, options.margins)}
    ${options.extraCss ?? ""}
    @media print {
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      @page { size: ${options.pageSize} portrait; margin: 0; }
      html, body {
        width: ${page.width} !important;
        background: #fff !important;
        color: #000 !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      body > *:not(#temp-print-container) { display: none !important; }
      #temp-print-container {
        display: block !important;
        position: static !important;
        left: auto !important;
        top: auto !important;
        width: ${page.width} !important;
        max-width: ${page.width} !important;
        margin: 0 !important;
        padding: 0 !important;
        background: transparent !important;
        color: #000 !important;
      }
      #temp-print-container .doc-bg {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: ${page.width} !important;
        height: ${page.height} !important;
        display: block !important;
        object-fit: fill !important;
        z-index: 0 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      #temp-print-container .doc {
        position: relative !important;
        z-index: 1 !important;
      }
      #temp-print-container thead { display: table-header-group; }
      #temp-print-container tr { break-inside: avoid; }
    }
  `

  const container = document.createElement("div")
  container.id = "temp-print-container"
  container.style.position = "fixed"
  container.style.left = "-10000px"
  container.style.top = "0"
  container.style.width = page.width
  container.style.maxWidth = page.width
  container.innerHTML = content
  document.head.appendChild(style)
  document.body.appendChild(container)

  const cleanup = () => {
    window.removeEventListener("afterprint", cleanup)
    style.remove()
    container.remove()
  }
  window.addEventListener("afterprint", cleanup)

  await waitForImages(container)
  container.offsetHeight
  window.print()
  window.setTimeout(cleanup, 1500)
}
