import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toYMD(input: unknown): string {
  if (!input) return ""
  if (input instanceof Date) {
    const y = input.getFullYear()
    const m = String(input.getMonth() + 1).padStart(2, "0")
    const d = String(input.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  }
  const s = String(input)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/)
  if (m) return m[1]
  return ""
}

export function formatYMDSafe(input: unknown) {
  const ymd = toYMD(input)
  if (!ymd) return "-"
  const d = new Date(`${ymd}T00:00:00`)
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })
}
