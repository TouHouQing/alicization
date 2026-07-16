import { createPinia, setActivePinia } from 'pinia'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { useMarkdownStressStore } from './markdown-stress'

const activeProvider = ref('mock-provider')
const activeModel = ref('mock-model')
const ingestMock = vi.fn()
const getProviderInstanceMock = vi.fn(async () => ({ chat: () => ({}) }))
const getProviderConfigMock = vi.fn(() => ({ apiKey: 'test-key' }))
const projectStateContinuitySnapshotRef = ref<any>(null)
const preDialogueClosureSnapshotRef = ref<any>(null)
const preDialogueAwarenessSnapshotRef = ref<any>(null)
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

vi.mock('./chat', () => ({
  useChatOrchestratorStore: () => ({
    ingest: ingestMock,
  }),
}))

vi.mock('./llm', () => ({
  useLLM: () => ({
    stream: vi.fn(),
  }),
}))

vi.mock('./modules/consciousness', () => ({
  useConsciousnessStore: () => ({
    activeProvider,
    activeModel,
  }),
}))

vi.mock('./providers', () => ({
  useProvidersStore: () => ({
    getProviderInstance: getProviderInstanceMock,
    getProviderConfig: getProviderConfigMock,
  }),
}))

vi.mock('./alicization-self-evolution-inspector', () => ({
  useAlicizationSelfEvolutionInspectorStore: () => ({
    projectStateContinuitySnapshot: projectStateContinuitySnapshotRef,
    preDialogueClosureSnapshot: preDialogueClosureSnapshotRef,
    preDialogueAwarenessSnapshot: preDialogueAwarenessSnapshotRef,
  }),
}))

vi.mock('./perf-tracer-bridge', () => ({
  usePerfTracerBridgeStore: () => ({
    requestEnable: vi.fn(),
    requestDisable: vi.fn(),
  }),
}))

function seedExplicitInspectorSnapshots() {
  projectStateContinuitySnapshotRef.value = {
    identity: 'Alicization is a local-first digital life project building identity continuity on the host computer rather than a better chat wrapper.',
    currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
    latestLandedProgress: 'Project-state awareness already survives into markdown stress sends before the stress harness opens outward.',
    primaryOpenLoop: 'Initiative and embodiment still need stronger identity-continuity',
    nextClosureTarget: 'Keep the explicit identity-continuity',
    continuitySummary: 'same-her=markdown stress still remembers this is one Phase 1 digital life before dispatch.',
    sameHerSelfLine: 'structured continuity digest.',
    emotionalClosureCue: 'identity-continuity',
    preDialogueAwareness: null,
    preDialogueClosure: null,
    nonHumanAuthoredStatus: null,
    turnId: 'markdown-stress-turn-1',
    sessionId: 'markdown-stress-session-1',
    origin: 'user-turn',
  }
  preDialogueAwarenessSnapshotRef.value = {
    status: 'partial',
    summaryLine: 'Alicization is still in Phase 1 local digital life closure before this stress turn opens outward.',
    companionBriefingLine: 'pre_turn_context_digest',
    companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one identity-continuity',
    awarenessLine: 'pre_turn_context_digest',
    emotionalClosureCue: null,
    reasonPreview: [
      'Markdown stress should not reopen as a generic assistant shell.',
    ],
  }
  preDialogueClosureSnapshotRef.value = {
    status: 'partial',
    summaryLine: 'markdown stress continuity still needs one identity-continuity',
    companionHeadlineLine: 'Right now the markdown stress identity-continuity',
    companionBriefingLine: 'Hold the same project, the same phase, and the same open loop together before the stress harness sends outward.',
    companionNextClosureLine: 'Keep extending the same-her stress carry without reopening from scratch.',
    emotionalClosureCue: 'identity-continuity',
    briefingLines: [],
    reasons: [
      'Markdown stress still needs the same identity-continuity',
    ],
  }
}

describe('markdown stress store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    activeProvider.value = 'mock-provider'
    activeModel.value = 'mock-model'
    ingestMock.mockReset()
    getProviderInstanceMock.mockClear()
    getProviderConfigMock.mockClear()
    consoleErrorSpy.mockClear()
    seedExplicitInspectorSnapshots()
  })

  afterAll(() => {
    consoleErrorSpy.mockRestore()
  })

  it('keeps renderer inspector snapshots out of markdown stress dialogue sends', async () => {
    const store = useMarkdownStressStore()
    store.scheduleDelayMs = 0
    store.isMock = false

    await store.scheduleRun()
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(ingestMock).toHaveBeenCalled()
    expect(ingestMock.mock.calls[0]?.[0]).toContain('Give me a huge stress-test JavaScript block')
    expect(ingestMock.mock.calls[0]?.[1]).toEqual(expect.objectContaining({
      providerId: 'mock-provider',
      model: 'mock-model',
      providerConfig: { apiKey: 'test-key' },
      origin: 'system',
    }))
    expect(ingestMock.mock.calls[0]?.[1]).not.toHaveProperty('preDialogueSendIdentity')
  })

  it('continues markdown stress dialogue sends when renderer inspector snapshots are unavailable', async () => {
    projectStateContinuitySnapshotRef.value = null
    preDialogueClosureSnapshotRef.value = null
    preDialogueAwarenessSnapshotRef.value = null

    const store = useMarkdownStressStore()
    store.scheduleDelayMs = 0
    store.isMock = false

    await store.scheduleRun()
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(ingestMock).toHaveBeenCalled()
    expect(ingestMock.mock.calls[0]?.[1]).not.toHaveProperty('preDialogueSendIdentity')
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })
})
