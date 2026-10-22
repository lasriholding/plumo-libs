export type PrintTheme = {
  primary: string
  secondary: string
  border: string
  background: string
  text: string
}

export const DEFAULT_PRINT_THEME: PrintTheme = {
  primary: "#0f172a",
  secondary: "#64748b",
  border: "#e2e8f0",
  background: "#f8fafc",
  text: "#1e293b",
}

let theme: PrintTheme = { ...DEFAULT_PRINT_THEME }

export function configurePrintTheme(partial: Partial<PrintTheme>): PrintTheme {
  theme = { ...theme, ...partial }
  return getPrintTheme()
}

export function getPrintTheme(): PrintTheme {
  return { ...theme }
}

export function resetPrintTheme(): void {
  theme = { ...DEFAULT_PRINT_THEME }
}
