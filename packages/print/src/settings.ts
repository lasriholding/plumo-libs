import type { PrintMargins } from "./page.js"

export type PrintSettings = {
  margins: PrintMargins
  backgroundUrl?: string | null
}

export type PrintSettingsSource = () => Promise<PrintSettings>

const DEFAULT_SETTINGS: PrintSettings = {
  margins: { top: 0, right: 0, bottom: 0, left: 0 },
  backgroundUrl: null,
}

let settingsSource: PrintSettingsSource | null = null
let cached: PrintSettings | null = null
let cachedAt = 0
const CACHE_MS = 30_000

/** Wire app-specific settings fetch (Clerk org / Nest / local). */
export function configurePrintSettings(source: PrintSettingsSource): void {
  settingsSource = source
  invalidatePrintSettingsCache()
}

export function invalidatePrintSettingsCache(): void {
  cached = null
  cachedAt = 0
}

export async function loadPrintSettings(): Promise<PrintSettings> {
  const now = Date.now()
  if (cached && now - cachedAt <= CACHE_MS) return cached

  if (!settingsSource) return DEFAULT_SETTINGS

  try {
    cached = await settingsSource()
    cachedAt = now
    return cached
  } catch (error) {
    console.warn("[@plumo/print] failed to load settings", error)
    return DEFAULT_SETTINGS
  }
}
