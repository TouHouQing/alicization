import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  abortActiveTurns: vi.fn(async () => ({ aborted: 0 })),
  cancelPendingSends: vi.fn(),
  resetAllSessions: vi.fn(async () => {}),
  resetDisplayModels: vi.fn(async () => {}),
  resetProviderSettings: vi.fn(async () => {}),
  settingsResetState: vi.fn(async () => {}),
  updateStageModel: vi.fn(async () => {}),
  stageModelSelected: 'preset-live2d-1',
  audioSettingsResetState: vi.fn(),
  live2dResetState: vi.fn(),
  mcpResetState: vi.fn(),
  onboardingResetSetupState: vi.fn(),
  airiCardResetState: vi.fn(),
  hearingResetState: vi.fn(),
  speechResetState: vi.fn(),
  consciousnessResetState: vi.fn(),
  twitterResetState: vi.fn(),
  discordResetState: vi.fn(),
  factorioResetState: vi.fn(),
  minecraftResetState: vi.fn(),
  alicizationClearAllConversations: vi.fn(async () => {}),
  alicizationDeleteAllData: vi.fn(async () => {}),
}))

vi.mock('@proj-alicization/stage-shared', () => ({
  defaultAlicizationStageModelId: 'preset-live2d-1',
  isStageTamagotchi: () => true,
}))

vi.mock('@proj-alicization/stage-ui-live2d', () => ({
  useLive2d: () => ({
    resetState: mocks.live2dResetState,
  }),
}))

vi.mock('../stores/chat', () => ({
  useChatOrchestratorStore: () => ({
    abortActiveTurns: mocks.abortActiveTurns,
    cancelPendingSends: mocks.cancelPendingSends,
  }),
}))

vi.mock('../stores/chat/session-store', () => ({
  useChatSessionStore: () => ({
    resetAllSessions: mocks.resetAllSessions,
    exportSessions: vi.fn(async () => ({ format: 'chat-sessions-index:v1', index: { userId: 'local', characters: {} }, sessions: {} })),
    importSessions: vi.fn(async () => {}),
  }),
}))

vi.mock('../stores/display-models', () => ({
  useDisplayModelsStore: () => ({
    resetDisplayModels: mocks.resetDisplayModels,
  }),
}))

vi.mock('../stores/providers', () => ({
  useProvidersStore: () => ({
    resetProviderSettings: mocks.resetProviderSettings,
  }),
}))

vi.mock('../stores/settings', () => ({
  useSettings: () => ({
    stageModelSelected: mocks.stageModelSelected,
    updateStageModel: mocks.updateStageModel,
    resetState: mocks.settingsResetState,
  }),
  useSettingsAudioDevice: () => ({
    resetState: mocks.audioSettingsResetState,
  }),
}))

vi.mock('../stores/modules/hearing', () => ({
  useHearingStore: () => ({
    resetState: mocks.hearingResetState,
  }),
}))

vi.mock('../stores/modules/speech', () => ({
  useSpeechStore: () => ({
    resetState: mocks.speechResetState,
  }),
}))

vi.mock('../stores/modules/consciousness', () => ({
  useConsciousnessStore: () => ({
    resetState: mocks.consciousnessResetState,
  }),
}))

vi.mock('../stores/modules/twitter', () => ({
  useTwitterStore: () => ({
    resetState: mocks.twitterResetState,
  }),
}))

vi.mock('../stores/modules/discord', () => ({
  useDiscordStore: () => ({
    resetState: mocks.discordResetState,
  }),
}))

vi.mock('../stores/modules/gaming-factorio', () => ({
  useFactorioStore: () => ({
    resetState: mocks.factorioResetState,
  }),
}))

vi.mock('../stores/modules/gaming-minecraft', () => ({
  useMinecraftStore: () => ({
    resetState: mocks.minecraftResetState,
  }),
}))

vi.mock('../stores/mcp', () => ({
  useMcpStore: () => ({
    resetState: mocks.mcpResetState,
  }),
}))

vi.mock('../stores/onboarding', () => ({
  useOnboardingStore: () => ({
    resetSetupState: mocks.onboardingResetSetupState,
  }),
}))

vi.mock('../stores/modules/airi-card', () => ({
  useAiriCardStore: () => ({
    resetState: mocks.airiCardResetState,
  }),
}))

vi.mock('../stores/alicization-bridge', () => ({
  hasAlicizationBridge: () => true,
  getAlicizationBridge: () => ({
    clearAllConversations: mocks.alicizationClearAllConversations,
    deleteAllData: mocks.alicizationDeleteAllData,
  }),
}))

describe('useDataMaintenance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('awaits chat reset lifecycle when deleting all chat sessions', async () => {
    const { useDataMaintenance } = await import('./use-data-maintenance')

    let resolveReset: () => void
    const resetBarrier = new Promise<void>((resolve) => {
      resolveReset = resolve
    })
    mocks.resetAllSessions.mockImplementationOnce(async () => await resetBarrier)

    const { deleteAllChatSessions } = useDataMaintenance()
    let settled = false
    const pending = deleteAllChatSessions().then(() => {
      settled = true
    })

    await Promise.resolve()
    expect(mocks.abortActiveTurns).toHaveBeenCalledWith('session-reset')
    expect(mocks.cancelPendingSends).toHaveBeenCalledTimes(1)
    expect(mocks.alicizationClearAllConversations).toHaveBeenCalledTimes(1)
    await vi.waitFor(() => {
      expect(mocks.resetAllSessions).toHaveBeenCalledTimes(1)
    })
    expect(settled).toBe(false)

    resolveReset!()
    await pending
    expect(settled).toBe(true)
  })

  it('waits for chat reset before executing delete-all follow-up resets', async () => {
    const { useDataMaintenance } = await import('./use-data-maintenance')

    let resolveReset: () => void
    const resetBarrier = new Promise<void>((resolve) => {
      resolveReset = resolve
    })
    mocks.resetAllSessions.mockImplementationOnce(async () => await resetBarrier)

    const { deleteAllData } = useDataMaintenance()
    let settled = false
    const pending = deleteAllData().then(() => {
      settled = true
    })

    await vi.waitFor(() => {
      expect(mocks.resetAllSessions).toHaveBeenCalledTimes(1)
    })
    expect(mocks.alicizationDeleteAllData).toHaveBeenCalledTimes(1)
    expect(mocks.settingsResetState).not.toHaveBeenCalled()
    expect(settled).toBe(false)

    resolveReset!()
    await pending

    expect(mocks.settingsResetState).toHaveBeenCalledTimes(1)
    expect(settled).toBe(true)
  })
})
