/** Shared formatters for resource CSV columns. */
export const csvFormat = {
  date(value: string | Date | null | undefined): string {
    if (value == null || value === "") return ""
    const date = value instanceof Date ? value : new Date(
      String(value).includes("T") ? String(value) : `${value}T00:00:00`,
    )
    if (Number.isNaN(date.getTime())) return String(value)
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, "0")
    const d = String(date.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  },
  datetime(value: string | Date | null | undefined): string {
    if (value == null || value === "") return ""
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return String(value)
    return date.toISOString().replace("T", " ").slice(0, 19)
  },
  money(value: number | null | undefined): string {
    if (value == null || Number.isNaN(Number(value))) return ""
    return Number(value).toFixed(2)
  },
  number(value: number | null | undefined, fractionDigits = 0): string {
    if (value == null || Number.isNaN(Number(value))) return ""
    return Number(value).toFixed(fractionDigits)
  },
  text(value: string | null | undefined): string {
    return value?.trim() ?? ""
  },
  bool(value: boolean | null | undefined, labels = { true: "Oui", false: "Non" }): string {
    if (value == null) return ""
    return value ? labels.true : labels.false
  },
  list(values: readonly string[] | null | undefined, separator = ", "): string {
    if (!values?.length) return ""
    return values.filter(Boolean).join(separator)
  },
}
