import type { Language } from "@/contexts/I18nContext"

type TranslateFn = (key: string, params?: Record<string, string | number>) => string

export const formatRelativeTime = (
  isoDate: string,
  language: Language,
  t: TranslateFn
) => {
  const now = Date.now()
  const created = new Date(isoDate).getTime()
  const diff = Math.max(0, now - created)
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) return t("time.justNow")
  if (diff < hour) return t("time.minutesAgo", { count: Math.floor(diff / minute) })
  if (diff < day) return t("time.hoursAgo", { count: Math.floor(diff / hour) })
  if (diff < 7 * day) return t("time.daysAgo", { count: Math.floor(diff / day) })

  return new Date(isoDate).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US")
}
