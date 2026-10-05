import { readonly, ref } from 'vue'

import en from './locales/en.json'
import de from './locales/de.json'

export type SupportedLocale = 'en' | 'de'

type Messages = Record<string, any>

const messages: Record<SupportedLocale, Messages> = { en, de }

const locale = ref<SupportedLocale>('en')

function normalizeLocale(value: unknown): SupportedLocale | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase().replace('_', '-')
  if (normalized === 'de' || normalized.startsWith('de-')) return 'de'
  if (normalized === 'en' || normalized.startsWith('en-')) return 'en'
  return null
}

export function browserLocale(): SupportedLocale {
  if (typeof navigator === 'undefined') return 'en'
  const candidates = [...(navigator.languages ?? []), navigator.language]
  for (const candidate of candidates) {
    const supported = normalizeLocale(candidate)
    if (supported) return supported
  }
  return 'en'
}

export function languageFromUser(user: any): SupportedLocale | null {
  return normalizeLocale(
    user?.settings?.language ??
    user?.user_settings?.language ??
    user?.language,
  )
}

export function setLocale(value: unknown) {
  locale.value = normalizeLocale(value) ?? 'en'
  if (typeof document !== 'undefined') document.documentElement.lang = locale.value
}

export function applyPreferredLocale(user?: any) {
  setLocale(languageFromUser(user) ?? browserLocale())
}

function lookup(path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object') return undefined
    return (current as Record<string, unknown>)[key]
  }, messages[locale.value])
}

export function t(path: string, params: Record<string, string | number> = {}): string {
  const translated = lookup(path)
  let value = typeof translated === 'string' ? translated : path
  for (const [key, replacement] of Object.entries(params)) {
    value = value.replaceAll(`{${key}}`, String(replacement))
  }
  return value
}

export function formatDateTime(value: string | number | Date): string {
  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(value))
}

export function useI18n() {
  return {
    locale: readonly(locale),
    t,
    formatDateTime,
  }
}

applyPreferredLocale()
