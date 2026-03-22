import type { SupportedLocale } from '@proj-alicization/i18n'

import messages from '@proj-alicization/i18n/locales'

import { resolveLocalePreference } from '@proj-alicization/i18n'

type MessageTree = Record<string, unknown>
const localizedMessages = messages as Record<SupportedLocale, MessageTree>

function getStageUiLocale() {
  const storedLanguage = typeof localStorage !== 'undefined'
    ? localStorage.getItem('settings/language')
    : null
  const navigatorLanguage = typeof navigator !== 'undefined'
    ? navigator.language
    : null

  return resolveLocalePreference(storedLanguage || navigatorLanguage || undefined)
}

function getNestedMessage(source: MessageTree | undefined, path: string): unknown {
  if (!source)
    return undefined

  return path
    .split('.')
    .reduce<unknown>((current, segment) => {
      if (!current || typeof current !== 'object' || Array.isArray(current))
        return undefined
      return (current as MessageTree)[segment]
    }, source)
}

function formatMessage(template: string, params?: Record<string, unknown>) {
  if (!params)
    return template

  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    if (!(key in params))
      return `{${key}}`
    const value = params[key]
    return value == null ? '' : String(value)
  })
}

function readLocalizedMessage(key: string, locale: SupportedLocale) {
  const localized = getNestedMessage(localizedMessages[locale], key)
  if (typeof localized === 'string')
    return localized

  const fallback = getNestedMessage(localizedMessages.en, key)
  return typeof fallback === 'string' ? fallback : key
}

export function translateStageUi(key: string, params?: Record<string, unknown>) {
  return formatMessage(readLocalizedMessage(key, getStageUiLocale()), params)
}

export function getStageUiMessageVariants(key: string) {
  const variants = new Set<string>()

  for (const locale of Object.keys(localizedMessages) as SupportedLocale[]) {
    const value = getNestedMessage(localizedMessages[locale], key)
    if (typeof value === 'string' && value.trim())
      variants.add(value)
  }

  return [...variants]
}
