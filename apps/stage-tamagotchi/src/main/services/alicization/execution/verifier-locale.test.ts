import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { expect, it } from 'vitest'
import { createI18n } from 'vue-i18n'
import { parse } from 'yaml'

const workspace = resolve(import.meta.dirname, '../../../../../../..')
const locales = ['en', 'es', 'fr', 'ja', 'ko', 'ru', 'vi', 'zh-Hans', 'zh-Hant']
const component = readFileSync(resolve(workspace, 'apps/stage-tamagotchi/src/renderer/pages/settings/components/execution-verifiers.vue'), 'utf8')
const keys = [...new Set([...component.matchAll(/t\('settings\.life\.verifiers\.([^']+)'\)/gu)].map(match => match[1]))]
const required = [...keys, ...['quality', 'external', 'reconciliation'].map(scope => `scope.${scope}`)]
const messages = Object.fromEntries(locales.map(locale => [locale, { settings: parse(readFileSync(resolve(workspace, `packages/i18n/src/locales/${locale}/settings.yaml`), 'utf8')) }]))

it.each(locales)('renders every verifier control through actual locale data and English fallback: %s', (locale) => {
  const runtime = createI18n({ legacy: false, locale, fallbackLocale: 'en', missingWarn: false, fallbackWarn: false, messages })
  // Dynamic inventory keys do not need the full application's typed key expansion.
  const i18n = runtime.global as unknown as { te: (key: string, locale: string) => boolean, t: (key: string) => string }
  expect(keys.length).toBeGreaterThan(10)
  for (const key of required) {
    const qualified = `settings.life.verifiers.${key}`
    expect(i18n.te(qualified, 'en'), qualified).toBe(true)
    const translated = i18n.t(qualified)
    expect(translated.trim().length, qualified).toBeGreaterThan(0)
    expect(translated, qualified).not.toContain('settings.life.verifiers.')
  }
  if (locale === 'zh-Hans') {
    expect(i18n.t('settings.life.verifiers.title')).toBe('结果验收规则')
    expect(i18n.t('settings.life.verifiers.saved')).toBe('验收规则已保存。')
  }
})
