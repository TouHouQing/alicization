import type { ElectronServerChannelConfig } from '../../../shared/eventa'

import { useElectronEventaInvoke } from '@proj-alicization/electron-vueuse'
import { useAsyncState, useLocalStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { watch } from 'vue'

import { electronApplyServerChannelConfig, electronGetServerChannelConfig } from '../../../shared/eventa'

export const useServerChannelSettingsStore = defineStore('tamagotchi-server-channel-settings', () => {
  const websocketTlsConfig = useLocalStorage<{ cert?: string, key?: string, passphrase?: string } | null | undefined>('settings/server-channel/websocket-tls-config', null)

  const getServerChannelConfig = useElectronEventaInvoke(electronGetServerChannelConfig) as () => Promise<ElectronServerChannelConfig>
  const applyServerChannelConfig = useElectronEventaInvoke(electronApplyServerChannelConfig) as (config: Partial<ElectronServerChannelConfig>) => Promise<ElectronServerChannelConfig>

  const serverChannelConfig = useAsyncState<ElectronServerChannelConfig>(
    async () => await getServerChannelConfig(),
    { tlsConfig: null },
  )

  watch(websocketTlsConfig, async (newValue) => {
    websocketTlsConfig.value = newValue
    await applyServerChannelConfig({ tlsConfig: newValue ? {} : null })
  })

  watch(serverChannelConfig.state, (newConfig) => {
    websocketTlsConfig.value = newConfig.tlsConfig ?? null
  })

  return {
    websocketTlsConfig,
  }
})
