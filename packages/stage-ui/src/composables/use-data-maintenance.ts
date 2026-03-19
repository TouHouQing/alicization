import type { ChatSessionsExport } from '../types/chat-session'

import { defaultAlicizationStageModelId } from '@proj-alicization/stage-shared'
import { useLive2d } from '@proj-alicization/stage-ui-live2d'

import { getAlicizationBridge, hasAlicizationBridge } from '../stores/alicization-bridge'
import { useChatOrchestratorStore } from '../stores/chat'
import { useChatSessionStore } from '../stores/chat/session-store'
import { useDisplayModelsStore } from '../stores/display-models'
import { useMcpStore } from '../stores/mcp'
import { useAiriCardStore } from '../stores/modules/airi-card'
import { useConsciousnessStore } from '../stores/modules/consciousness'
import { useDiscordStore } from '../stores/modules/discord'
import { useFactorioStore } from '../stores/modules/gaming-factorio'
import { useMinecraftStore } from '../stores/modules/gaming-minecraft'
import { useHearingStore } from '../stores/modules/hearing'
import { useSpeechStore } from '../stores/modules/speech'
import { useTwitterStore } from '../stores/modules/twitter'
import { useOnboardingStore } from '../stores/onboarding'
import { useProvidersStore } from '../stores/providers'
import { useSettings, useSettingsAudioDevice } from '../stores/settings'

export function useDataMaintenance() {
  const chatStore = useChatSessionStore()
  const chatOrchestrator = useChatOrchestratorStore()
  const displayModelsStore = useDisplayModelsStore()
  const providersStore = useProvidersStore()
  const settingsStore = useSettings()
  const audioSettingsStore = useSettingsAudioDevice()
  const live2dStore = useLive2d()
  const hearingStore = useHearingStore()
  const speechStore = useSpeechStore()
  const consciousnessStore = useConsciousnessStore()
  const twitterStore = useTwitterStore()
  const discordStore = useDiscordStore()
  const factorioStore = useFactorioStore()
  const minecraftStore = useMinecraftStore()
  const mcpStore = useMcpStore()
  const onboardingStore = useOnboardingStore()
  const airiCardStore = useAiriCardStore()

  async function deleteAllModels() {
    await displayModelsStore.resetDisplayModels()
    settingsStore.stageModelSelected = defaultAlicizationStageModelId
    await settingsStore.updateStageModel()
  }

  async function resetProvidersSettings() {
    await providersStore.resetProviderSettings()
  }

  function resetModulesSettings() {
    hearingStore.resetState()
    speechStore.resetState()
    consciousnessStore.resetState()
    twitterStore.resetState()
    discordStore.resetState()
    factorioStore.resetState()
    minecraftStore.resetState()
  }

  async function deleteAllChatSessions() {
    await chatOrchestrator.abortActiveTurns('session-reset')
    chatOrchestrator.cancelPendingSends()
    if (hasAlicizationBridge()) {
      await getAlicizationBridge().clearAllConversations?.()
    }
    await chatStore.resetAllSessions()
  }

  async function exportChatSessions() {
    const data = await chatStore.exportSessions()
    return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  }

  function isChatSessionsPayload(payload: unknown): payload is ChatSessionsExport {
    if (!payload || typeof payload !== 'object')
      return false
    return (payload as { format?: string }).format === 'chat-sessions-index:v1'
  }

  async function importChatSessions(payload: Record<string, unknown>) {
    if (!isChatSessionsPayload(payload))
      throw new Error('Invalid chat session export format')
    await chatStore.importSessions(payload)
  }

  async function resetSettingsState() {
    await settingsStore.resetState()
    audioSettingsStore.resetState()
    live2dStore.resetState()
    mcpStore.resetState()
    onboardingStore.resetSetupState()
    airiCardStore.resetState()
  }

  async function deleteAllData() {
    await chatOrchestrator.abortActiveTurns('session-reset')
    chatOrchestrator.cancelPendingSends()

    if (hasAlicizationBridge()) {
      await getAlicizationBridge().deleteAllData?.()
    }

    await deleteAllModels()
    await resetProvidersSettings()
    resetModulesSettings()
    await chatStore.resetAllSessions()
    await resetSettingsState()
  }

  async function resetLocalApplicationState() {
    await resetSettingsState()
    resetModulesSettings()
  }

  return {
    deleteAllModels,
    resetProvidersSettings,
    resetModulesSettings,
    deleteAllChatSessions,
    exportChatSessions,
    importChatSessions,
    deleteAllData,
    resetLocalApplicationState,
  }
}
