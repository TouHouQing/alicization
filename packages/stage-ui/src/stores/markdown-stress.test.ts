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
    identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
    currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
    latestLandedProgress: 'Project-state awareness already survives into markdown stress sends before the stress harness opens outward.',
    primaryOpenLoop: 'Initiative and embodiment still need stronger same-her closure under real desktop use.',
    nextClosureTarget: 'Keep the explicit same-her project brief alive before markdown stress dialogue widens outward.',
    continuitySummary: 'same-her=markdown stress still remembers this is one Phase 1 digital life before dispatch.',
    sameHerSelfLine: 'Same Phase 1 digital life. Markdown stress should still start from one living line.',
    emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
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
    companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
    companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
    awarenessLine: 'Before speaking, keep this same digital life project explicit before markdown stress widens outward.',
    emotionalClosureCue: null,
    reasonPreview: [
      'Markdown stress should not reopen as a generic assistant shell.',
    ],
  }
  preDialogueClosureSnapshotRef.value = {
    status: 'partial',
    summaryLine: 'markdown stress continuity still needs one same-her closure carry.',
    companionHeadlineLine: 'Right now the markdown stress same-her line still needs measured-return care.',
    companionBriefingLine: 'Hold the same project, the same phase, and the same open loop together before the stress harness sends outward.',
    companionNextClosureLine: 'Keep extending the same-her stress carry without reopening from scratch.',
    emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
    briefingLines: [],
    reasons: [
      'Markdown stress still needs the same same-her project brief before dispatch.',
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

  it('injects explicit inspector-built pre-dialogue identity into markdown stress dialogue sends before the stress harness opens outward', async () => {
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
      preDialogueSendIdentity: expect.objectContaining({
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure before this stress turn opens outward.',
        awarenessLine: 'Before speaking, keep this same digital life project explicit before markdown stress widens outward.',
        companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
        projectState: expect.objectContaining({
          identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          latestLandedProgress: 'Project-state awareness already survives into markdown stress sends before the stress harness opens outward.',
          primaryOpenLoop: 'Initiative and embodiment still need stronger same-her closure under real desktop use.',
          nextClosureTarget: 'Keep the explicit same-her project brief alive before markdown stress dialogue widens outward.',
        }),
        reasonPreview: expect.arrayContaining([
          'Markdown stress should not reopen as a generic assistant shell.',
          'same-her=markdown stress still remembers this is one Phase 1 digital life before dispatch.',
        ]),
      }),
    }))
  })

  it('blocks markdown stress dialogue sends when no explicit pre-dialogue identity is available before the harness opens outward', async () => {
    projectStateContinuitySnapshotRef.value = null
    preDialogueClosureSnapshotRef.value = null
    preDialogueAwarenessSnapshotRef.value = null

    const store = useMarkdownStressStore()
    store.scheduleDelayMs = 0
    store.isMock = false

    await store.scheduleRun()
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(ingestMock).not.toHaveBeenCalled()
    expect(consoleErrorSpy).toHaveBeenCalled()
  })
})
