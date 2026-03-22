export const all = {
  'en': 'English',
  'es': 'Español',
  'fr': 'Français',
  'ko': '한국어',
  'ja': '日本語',
  'ru': 'Русский',
  'vi': 'Tiếng Việt',
  'zh-Hans': '简体中文',
  'zh-Hant': '繁體中文',
}

export type SupportedLocale = keyof typeof all

export const supportedLocales = Object.keys(all) as SupportedLocale[]

export const languageRemap: Record<string, SupportedLocale> = {
  'zh-CN': 'zh-Hans',
  'zh-SG': 'zh-Hans',
  'zh-Hans': 'zh-Hans',
  'zh-TW': 'zh-Hant',
  'zh-HK': 'zh-Hant',
  'zh-MO': 'zh-Hant',
  'zh-Hant': 'zh-Hant',
  'en': 'en',
  'en-US': 'en',
  'en-GB': 'en',
  'en-AU': 'en',
  'en-CA': 'en',
  'es': 'es',
  'es-ES': 'es',
  'es-MX': 'es',
  'es-AR': 'es',
  'es-419': 'es',
  'fr': 'fr',
  'fr-FR': 'fr',
  'fr-CA': 'fr',
  'ja': 'ja',
  'ja-JP': 'ja',
  'ko': 'ko',
  'ko-KR': 'ko',
  'ru': 'ru',
  'ru-RU': 'ru',
  'vi': 'vi',
  'vi-VN': 'vi',
}

export function resolveLocalePreference(preferredLanguage?: string | null, fallbackLocale: SupportedLocale = 'en'): SupportedLocale {
  const normalized = preferredLanguage?.trim()
  if (!normalized)
    return fallbackLocale

  if (supportedLocales.includes(normalized as SupportedLocale))
    return normalized as SupportedLocale

  const remapped = languageRemap[normalized]
  if (remapped)
    return remapped

  const canonical = normalized.replaceAll('_', '-')
  if (supportedLocales.includes(canonical as SupportedLocale))
    return canonical as SupportedLocale

  const canonicalRemap = languageRemap[canonical]
  if (canonicalRemap)
    return canonicalRemap

  const base = canonical.split('-')[0]
  if (supportedLocales.includes(base as SupportedLocale))
    return base as SupportedLocale

  const baseRemap = languageRemap[base]
  if (baseRemap)
    return baseRemap

  return fallbackLocale
}
