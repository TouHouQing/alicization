import messages from '@proj-alicization/i18n/locales'

import { resolveLocalePreference } from '@proj-alicization/i18n'
import { createI18n } from 'vue-i18n'

function getLocale() {
  return resolveLocalePreference(
    localStorage.getItem('settings/language')
    || navigator.language
    || 'en',
  )
}

export const i18n = createI18n({
  legacy: false,
  locale: getLocale(),
  fallbackLocale: 'en',
  messages,
})
