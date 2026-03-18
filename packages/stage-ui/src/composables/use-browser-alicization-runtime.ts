import type { AlicizationLlmConfigPayload } from '../stores/alicization-bridge'

import { storeToRefs } from 'pinia'
import { onUnmounted, ref, watch } from 'vue'

import { getAlicizationBridge, hasAlicizationBridge } from '../stores/alicization-bridge'
import { installBrowserAlicizationBridge } from '../stores/alicization-browser-bridge'
import { useAlicizationEpoch1Store } from '../stores/alicization-epoch1'
import { useChatSessionStore } from '../stores/chat/session-store'
import { useAiriCardStore } from '../stores/modules/airi-card'
import { useConsciousnessStore } from '../stores/modules/consciousness'
import { useProvidersStore } from '../stores/providers'

type BrowserRuntimeKind = 'web' | 'mobile'

interface UseBrowserAlicizationRuntimeOptions {
  runtime: BrowserRuntimeKind
}

export function useBrowserAlicizationRuntime(options: UseBrowserAlicizationRuntimeOptions) {
  const disposeBridge = installBrowserAlicizationBridge({ runtime: options.runtime })

  const alicizationEpoch1Store = useAlicizationEpoch1Store()
  const cardStore = useAiriCardStore()
  const chatSessionStore = useChatSessionStore()
  const consciousnessStore = useConsciousnessStore()
  const providersStore = useProvidersStore()

  const { activeCardId } = storeToRefs(cardStore)
  const { activeSessionId } = storeToRefs(chatSessionStore)
  const { activeProvider, activeModel } = storeToRefs(consciousnessStore)
  const { providers } = storeToRefs(providersStore)

  let llmSyncTimer: ReturnType<typeof setTimeout> | undefined
  let lastLlmSyncSignature = ''
  let llmConfigHydrating = false
  const llmConfigHydrated = ref(false)

  function cloneProviderCredentials() {
    return JSON.parse(JSON.stringify(providers.value || {})) as Record<string, Record<string, unknown>>
  }

  function createLlmConfigPayload(): AlicizationLlmConfigPayload {
    return {
      activeProviderId: activeProvider.value || '',
      activeModelId: activeModel.value || '',
      providerCredentials: cloneProviderCredentials(),
    }
  }

  function scheduleLlmConfigSync() {
    if (!llmConfigHydrated.value || !hasAlicizationBridge())
      return

    const payload = createLlmConfigPayload()
    const signature = JSON.stringify(payload)
    if (signature === lastLlmSyncSignature)
      return

    if (llmSyncTimer)
      clearTimeout(llmSyncTimer)

    llmSyncTimer = setTimeout(() => {
      lastLlmSyncSignature = signature
      void getAlicizationBridge().syncLlmConfig?.(payload)
    }, 120)
  }

  async function hydrateLlmConfig() {
    if (!hasAlicizationBridge() || llmConfigHydrating)
      return

    llmConfigHydrating = true
    try {
      const remote = await getAlicizationBridge().getLlmConfig?.()
      if (!remote) {
        lastLlmSyncSignature = JSON.stringify(createLlmConfigPayload())
        return
      }

      const remoteCredentials = remote.providerCredentials && typeof remote.providerCredentials === 'object'
        ? remote.providerCredentials
        : {}

      if (Object.keys(remoteCredentials).length > 0)
        providers.value = JSON.parse(JSON.stringify(remoteCredentials))

      if (remote.activeProviderId?.trim())
        activeProvider.value = remote.activeProviderId.trim()

      if (remote.activeModelId?.trim())
        activeModel.value = remote.activeModelId.trim()

      lastLlmSyncSignature = JSON.stringify({
        activeProviderId: remote.activeProviderId || '',
        activeModelId: remote.activeModelId || '',
        providerCredentials: remoteCredentials,
      } satisfies AlicizationLlmConfigPayload)
    }
    finally {
      llmConfigHydrating = false
      llmConfigHydrated.value = true
    }
  }

  watch(activeCardId, () => {
    if (!hasAlicizationBridge())
      return

    void alicizationEpoch1Store.refreshSoul()
    void alicizationEpoch1Store.syncKillSwitchState()
    void alicizationEpoch1Store.refreshMemoryStats()
    void alicizationEpoch1Store.refreshOrganicMemorySnapshot()
  }, { immediate: true })

  watch(activeSessionId, (sessionId) => {
    const normalizedSessionId = sessionId?.trim()
    if (!normalizedSessionId || !hasAlicizationBridge())
      return

    void getAlicizationBridge().setActiveSession?.({
      sessionId: normalizedSessionId,
    })
  }, { immediate: true })

  watch([activeProvider, activeModel, providers], () => {
    scheduleLlmConfigSync()
  }, { deep: true, immediate: true })

  async function initialize() {
    await alicizationEpoch1Store.initialize()
    await hydrateLlmConfig()
    scheduleLlmConfigSync()
  }

  function dispose() {
    if (llmSyncTimer)
      clearTimeout(llmSyncTimer)

    alicizationEpoch1Store.dispose()
    disposeBridge()
  }

  onUnmounted(() => {
    dispose()
  })

  return {
    initialize,
    dispose,
  }
}
