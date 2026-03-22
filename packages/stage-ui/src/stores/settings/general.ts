import { resolveLocalePreference } from '@proj-alicization/i18n'
import { useLocalStorageManualReset } from '@proj-alicization/stage-shared/composables'
import { defineStore } from 'pinia'
import { onMounted } from 'vue'

export const useSettingsGeneral = defineStore('settings-general', () => {
  const language = useLocalStorageManualReset<string>('settings/language', '')

  const disableTransitions = useLocalStorageManualReset<boolean>('settings/disable-transitions', true)
  const usePageSpecificTransitions = useLocalStorageManualReset<boolean>('settings/use-page-specific-transitions', true)

  const websocketSecureEnabled = useLocalStorageManualReset<boolean>('settings/websocket/secure-enabled', false)

  function getLanguage() {
    return resolveLocalePreference(
      localStorage.getItem('settings/language')
      || navigator.language
      || 'en',
    )
  }

  function resetState() {
    language.reset()
    disableTransitions.reset()
    usePageSpecificTransitions.reset()
    websocketSecureEnabled.reset()
  }

  onMounted(() => language.value = getLanguage())

  return {
    language,
    disableTransitions,
    usePageSpecificTransitions,
    websocketSecureEnabled,
    getLanguage,
    resetState,
  }
})
