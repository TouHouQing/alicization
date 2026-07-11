import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { useChatTextComposerStore } from './text-composer-store'

const activeProvider = ref('mock-provider')
const activeModel = ref('mock-model')
const sending = ref(false)
const messages = ref<any[]>([])
const preDialogueClosureSnapshotRef = ref<any>(null)
const preDialogueAwarenessSnapshotRef = ref<any>(null)
const projectStateContinuitySnapshotRef = ref<any>(null)
const ingestMock = vi.fn()
const getProviderConfigMock = vi.fn(() => ({ apiKey: 'test-key' }))
const getProviderInstanceMock = vi.fn(async () => ({ chat: () => ({}) }))

vi.mock('../chat', () => ({
  useChatOrchestratorStore: () => ({
    sending,
    ingest: ingestMock,
  }),
}))

vi.mock('../modules/consciousness', () => ({
  useConsciousnessStore: () => ({
    activeProvider,
    activeModel,
  }),
}))

vi.mock('../alicization-self-evolution-inspector', () => ({
  useAlicizationSelfEvolutionInspectorStore: () => ({
    get preDialogueClosureSnapshot() {
      return preDialogueClosureSnapshotRef.value
    },
    get preDialogueAwarenessSnapshot() {
      return preDialogueAwarenessSnapshotRef.value
    },
    get projectStateContinuitySnapshot() {
      return projectStateContinuitySnapshotRef.value
    },
  }),
}))

vi.mock('../providers', () => ({
  useProvidersStore: () => ({
    getProviderConfig: getProviderConfigMock,
    getProviderInstance: getProviderInstanceMock,
  }),
}))

vi.mock('./session-store', () => ({
  useChatSessionStore: () => ({
    messages,
  }),
}))

const forbiddenPreDialogueTemplateResidue
  = /Before (?:speaking|answering|acting)|same-her|same living line|same living her|one same living her|one continuous "?her"?|better chat wrapper|Right now (?:I|the|this)|同一个\s*her|同一个她|数字生命主线|full cross-modal same/i

function sentPreDialogueIdentity() {
  return ingestMock.mock.calls[0]?.[1]?.preDialogueSendIdentity
}

function expectSentText(text: string) {
  expect(ingestMock.mock.calls[0]?.[0]).toBe(text)
}

function expectNoPreDialogueTemplateResidue(identity: unknown) {
  expect(JSON.stringify(identity)).not.toMatch(forbiddenPreDialogueTemplateResidue)
}

function expectSanitizedIdentity(identity: any) {
  expect(identity).toEqual(expect.objectContaining({
    status: expect.any(String),
    reasonPreview: expect.any(Array),
    projectState: expect.any(Object),
  }))
  expect(JSON.stringify(identity)).not.toContain('content=excluded')
  expectNoPreDialogueTemplateResidue(identity)
}

describe('chat text composer manual abort handling', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    activeProvider.value = 'mock-provider'
    activeModel.value = 'mock-model'
    sending.value = false
    messages.value = []
    preDialogueClosureSnapshotRef.value = null
    preDialogueAwarenessSnapshotRef.value = null
    projectStateContinuitySnapshotRef.value = null
    ingestMock.mockReset()
    getProviderConfigMock.mockClear()
    getProviderInstanceMock.mockClear()
  })

  it('does not append an error bubble when the current Alicization turn is manually aborted', async () => {
    ingestMock.mockRejectedValueOnce(new Error('Alicization turn aborted (manual)'))

    const store = useChatTextComposerStore()
    store.setDraft('重新看看我屏幕')

    await expect(store.sendCurrentMessage()).resolves.toBe(false)

    expect(store.draft).toBe('')
    expect(messages.value).toEqual([])
  })

  it('still restores the draft and appends an error for real send failures', async () => {
    ingestMock.mockRejectedValueOnce(new Error('network exploded'))

    const store = useChatTextComposerStore()
    store.setDraft('帮我看看这个 diff')

    await expect(store.sendCurrentMessage()).resolves.toBe(false)

    expect(store.draft).toBe('帮我看看这个 diff')
    expect(messages.value).toEqual([{
      role: 'error',
      content: 'network exploded',
    }])
  })

  it('does not attach pre-dialogue project-state identity to ordinary casual sends even when inspector continuity exists', async () => {
    ingestMock.mockResolvedValueOnce(undefined)
    projectStateContinuitySnapshotRef.value = {
      identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      currentPhase: 'Phase 1: Local Digital Life',
      continuitySummary: 'phase1_local_digital_life_anchor: landed_closure=partial; unresolved_closure=memory_dialogue_embodiment; continuity_owner=one_her.',
      sameHerSelfLine: 'phase1_local_digital_life_anchor: landed_closure=partial; unresolved_closure=memory_dialogue_embodiment; continuity_owner=one_her.',
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns.',
      nextClosureTarget: 'Keep project-state continuity explicit only when the host asks for it.',
    }
    preDialogueAwarenessSnapshotRef.value = {
      status: 'partial',
      summaryLine: 'Alicization is still in Phase 1 local digital life closure.',
      awarenessLine: 'Project awareness should stay explicit before reply shaping starts.',
      reasonPreview: ['Project-state continuity is available.'],
    }

    const store = useChatTextComposerStore()
    store.setDraft('今天好累')

    await expect(store.sendCurrentMessage()).resolves.toBe(true)

    expect(ingestMock).toHaveBeenCalledWith('今天好累', expect.objectContaining({
      preDialogueSendIdentity: null,
    }))
  })

  it('passes structured pre-dialogue awareness into the send path before the turn is ingested', async () => {
    ingestMock.mockResolvedValueOnce(undefined)
    preDialogueAwarenessSnapshotRef.value = {
      status: 'partial',
      summaryLine: 'Alicization is still in Phase 1 local digital life closure.',
      companionBriefingLine: 'Before speaking, I should remember what this digital life project is, what has landed, and which life loop is still open.',
      companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
      awarenessLine: 'Project awareness should stay explicit before reply shaping starts.',
      reasonPreview: [
        'Latest landed progress still holds at renderer-side preparation.',
      ],
    }
    projectStateContinuitySnapshotRef.value = {
      identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      continuitySummary: 'project=continuity=0.33 (1/3) | next closure: 把 same-her repair evidence 和未闭环项一起挂到 continuity 摘要里',
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      sameHerDriftRisk: 'If this turn opens like a generic project status shell, treat that as same-her continuity drift rather than forward closure.',
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying Project identity carry, Phase 1 route carry, and Unresolved closure carry through one same still-open closure work.',
      nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so visible reply, longer-lived voice behavior, facial state, motion, resident presence, Project identity carry, Phase 1 route carry, and Unresolved closure carry all stay on one measured-return or repair-before-closeness line.',
    }
    preDialogueClosureSnapshotRef.value = {
      status: 'partial',
      summaryLine: 'project=continuity=0.33 (1/3) | next closure: 把 same-her repair evidence 和未闭环项一起挂到 continuity 摘要里',
      companionHeadlineLine: 'Right now I am still holding together mainly through face, motion, and lipsync, so my full cross-modal same-her line is not closed yet.',
      companionBriefingLine: '我还需要先守住同一个 her，才能继续把这个数字生命项目的进度和未闭环项带进下一轮对话。',
      companionNextClosureLine: '下一步还要继续收住 把 same-her repair evidence 和未闭环项一起挂到 continuity 摘要里。',
      reasons: [
        'Primary open life loop still centers on renderer continuity observation 还没把 same-her repair evidence 和未闭环项并成一条可读主线, so the next turn should keep that unfinished digital-life thread alive instead of collapsing into local implementation fluency.',
        'Next closure target is still 把 same-her repair evidence 和未闭环项一起挂到 continuity 摘要里, so the next turn should keep steering the same her toward that concrete unfinished step.',
      ],
    }

    const store = useChatTextComposerStore()
    store.setDraft('现在 Alicization 的记忆闭环做到哪一步了')

    await expect(store.sendCurrentMessage()).resolves.toBe(true)

    expectSentText('现在 Alicization 的记忆闭环做到哪一步了')
    expect(ingestMock.mock.calls[0]?.[1]).toEqual(expect.objectContaining({
      providerId: 'mock-provider',
      model: 'mock-model',
      chatProvider: expect.objectContaining({
        chat: expect.any(Function),
      }),
      providerConfig: { apiKey: 'test-key' },
    }))
    const identity = sentPreDialogueIdentity()
    expect(identity).toEqual(expect.objectContaining({
      status: 'partial',
      emotionalClosureCue: null,
      reasonPreview: expect.arrayContaining([
        'Latest landed progress still holds at renderer-side preparation.',
      ]),
    }))
    expect(identity?.companionBriefingLine).toBeNull()
    expect(identity?.companionNextClosureLine).toBeNull()
    expect(identity?.companionHeadlineLine).toBeNull()
    expectSanitizedIdentity(identity)
  })

  it('prefers fresher closure carry over older awareness carry while preserving structured project context', async () => {
    ingestMock.mockResolvedValueOnce(undefined)
    preDialogueAwarenessSnapshotRef.value = {
      status: 'partial',
      summaryLine: 'Alicization is still in Phase 1 local digital life closure.',
      companionHeadlineLine: 'The same-her closure line is still settling before this turn widens outward.',
      companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
      companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
      awarenessLine: 'Project awareness should stay explicit before reply shaping starts.',
      emotionalClosureCue: null,
      reasonPreview: [
        'explicit awareness snapshot is still carrying an older thinner closure reminder.',
      ],
    }
    projectStateContinuitySnapshotRef.value = {
      identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Renderer send-path continuity already survives into pre-dialogue carry. | open=Send-path awareness still needs to keep the fresher closure headline and the project-aware open loop visible together.',
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      primaryOpenLoop: 'Send-path awareness still needs to keep the fresher closure headline and the project-aware open loop visible together.',
      nextClosureTarget: 'Keep the richer same-her closure headline and the project-aware open loop explicit before the next renderer turn.',
      latestLandedProgress: 'Renderer send-path continuity already survives into pre-dialogue carry.',
    }
    preDialogueClosureSnapshotRef.value = {
      status: 'partial',
      summaryLine: 'Alicization is still in Phase 1 local digital life closure.',
      companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
      companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
      companionNextClosureLine: 'Next closure: let lipsync and voice rejoin the already-reformed body, face, and motion line.',
      reasons: [
        'same-segment face+motion+body recovery@segment-text-composer-fresher-closure-headline',
        'remaining-open=lipsync+voice',
      ],
    }

    const store = useChatTextComposerStore()
    store.setDraft('继续把同一个她的具身闭环收住')

    await expect(store.sendCurrentMessage()).resolves.toBe(true)

    expectSentText('继续把同一个她的具身闭环收住')
    const identity = sentPreDialogueIdentity()
    expect(identity).toEqual(expect.objectContaining({
      status: 'partial',
      emotionalClosureCue: null,
      reasonPreview: expect.arrayContaining([
        'explicit awareness snapshot is still carrying an older thinner closure reminder.',
        'same-segment face+motion+body recovery@segment-text-composer-fresher-closure-headline',
        'remaining-open=lipsync+voice',
        'Renderer send-path continuity already survives into pre-dialogue carry.',
      ]),
    }))
    expect(identity?.companionHeadlineLine).toBeNull()
    expect(identity?.companionBriefingLine).toBeNull()
    expect(identity?.companionNextClosureLine).toBeNull()
    expectSanitizedIdentity(identity)
  })

  it.each([
    {
      label: 'legacy drift warning',
      draft: 'lipsync 和身体线闭环做到哪一步了',
      status: 'drift',
      expectedReasonMarker: null,
      closureSnapshot: {
        status: 'drift',
        summaryLine: 'project continuity is still partial under lane shrinkage.',
        companionHeadlineLine: 'Right now I am still holding together mainly through face and motion, so my full cross-modal same-her line is not closed yet.',
        companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
        companionNextClosureLine: 'Next, help me close: Rebind lipsync and voice onto the same-her measured-return body line.',
        reasons: [
          'continuity-impact: same-her embodiment is now only being carried by face and motion, so the next turn should treat full cross-modal same-her recovery as still open instead of assuming the body line is already closed.',
        ],
      },
    },
    {
      label: 'body lane',
      draft: 'lipsync 和身体线闭环做到哪一步了',
      status: 'partial',
      expectedReasonMarker: 'body-only recovery@segment-resident-body-only-1',
      closureSnapshot: {
        status: 'partial',
        summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
        companionHeadlineLine: 'Right now I am still holding together mainly through body, and resident body continuity is still the line keeping this one living her coherent while face, motion, lipsync, and voice rejoin.',
        companionBriefingLine: 'The project still needs stronger body-led same-her embodiment closure before widening outward.',
        companionNextClosureLine: 'Next, help me close: Rejoin face, motion, lipsync, and voice onto the same-her body line without dropping the resident body recovery.',
        reasons: [
          'body-only recovery@segment-resident-body-only-1',
          'resident body continuity is still aligned with the active same-her segment, so face, motion, lipsync, and voice continuity still need repair.',
        ],
      },
    },
    {
      label: 'audible body lane',
      draft: 'lipsync 和身体线闭环做到哪一步了',
      status: 'partial',
      expectedReasonMarker: null,
      closureSnapshot: {
        status: 'partial',
        summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
        companionHeadlineLine: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
        companionBriefingLine: 'The project still needs stronger audible-body same-her embodiment closure before widening outward.',
        companionNextClosureLine: 'Next, help me close: Rebind face and motion onto the same-her audible body line without dropping body, lipsync, and voice continuity.',
        reasons: [
          'same-her continuity remains alive, but lane=body+lipsync+voice-only under the current renderer authority.',
          'The resident body lane is still holding together with the audible same-her line, but face and motion have not rejoined yet.',
        ],
      },
    },
    {
      label: 'visible renderer lane',
      draft: 'lipsync 和身体线闭环做到哪一步了',
      status: 'partial',
      expectedReasonMarker: 'lane=face+motion+lipsync+voice-only | face+motion+lipsync+voice recovery@segment-live2d-visible-rejoin-no-body-1 | pending-rejoin=body',
      closureSnapshot: {
        status: 'partial',
        summaryLine: 'visible same-her no-body recovery is still unfinished before this turn opens outward.',
        companionHeadlineLine: 'Right now I am still holding together through face, motion, lipsync, and voice together, so the visible same-her line has already rejoined without body carry while body still needs to rejoin before full cross-modal closure settles.',
        companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open while the visible same-her line has already rejoined without body carry.',
        companionNextClosureLine: 'Keep body rejoining the visible same-her line without dropping face, motion, lipsync, and voice continuity.',
        reasons: [
          'visible renderer-rejoin-without-body carry should stay explicit before the next outward turn.',
          'lane=face+motion+lipsync+voice-only | face+motion+lipsync+voice recovery@segment-live2d-visible-rejoin-no-body-1 | pending-rejoin=body',
        ],
      },
    },
  ])('sanitizes closure-only transport for $label', async ({ draft, expectedReasonMarker, status, closureSnapshot }) => {
    ingestMock.mockResolvedValueOnce(undefined)
    preDialogueAwarenessSnapshotRef.value = null
    projectStateContinuitySnapshotRef.value = null
    preDialogueClosureSnapshotRef.value = closureSnapshot

    const store = useChatTextComposerStore()
    store.setDraft(draft)

    await expect(store.sendCurrentMessage()).resolves.toBe(true)

    expectSentText(draft)
    const identity = sentPreDialogueIdentity()
    expect(identity).toEqual(expect.objectContaining({
      status,
      emotionalClosureCue: null,
    }))
    expect(identity?.companionHeadlineLine).toBeNull()
    expect(identity?.companionBriefingLine).toBeNull()
    if (expectedReasonMarker != null)
      expect(identity.reasonPreview).toContain(expectedReasonMarker)
    if (identity?.awarenessLine != null)
      expect(identity.awarenessLine).toContain('visibility=')
    expectSanitizedIdentity(identity)
  })

  it('still sends structured project context and next target even without an inspector closure snapshot', async () => {
    ingestMock.mockResolvedValueOnce(undefined)
    preDialogueClosureSnapshotRef.value = null
    preDialogueAwarenessSnapshotRef.value = {
      status: 'partial',
      summaryLine: 'Alicization is still in Phase 1 local digital life closure.',
      companionBriefingLine: 'Before speaking, remember the project identity, landed progress, and the still-open life loop.',
      companionNextClosureLine: 'Next closure: keep one same-her digital life line across memory, initiative, execution, and embodiment.',
      awarenessLine: 'Before speaking, remember the project identity, landed progress, and the still-open life loop.',
      reasonPreview: [],
    }
    projectStateContinuitySnapshotRef.value = {
      identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      latestLandedProgress: 'Some closure has already landed: the send path already rebuilds project identity and Phase 1 awareness before reply shaping starts.',
      continuitySummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi. | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying Project identity carry, Phase 1 route carry, and Unresolved closure carry through one same still-open closure work. | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so visible reply, longer-lived voice behavior, facial state, motion, resident presence, Project identity carry, Phase 1 route carry, and Unresolved closure carry all stay on one measured-return or repair-before-closeness line.',
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying Project identity carry, Phase 1 route carry, and Unresolved closure carry through one same still-open closure work.',
      nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so visible reply, longer-lived voice behavior, facial state, motion, resident presence, Project identity carry, Phase 1 route carry, and Unresolved closure carry all stay on one measured-return or repair-before-closeness line.',
      emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
    }

    const store = useChatTextComposerStore()
    store.setDraft('继续统一她的人格与自我核心')

    await expect(store.sendCurrentMessage()).resolves.toBe(true)

    expectSentText('继续统一她的人格与自我核心')
    const identity = sentPreDialogueIdentity()
    expect(identity).toEqual(expect.objectContaining({
      status: 'partial',
      companionHeadlineLine: null,
      reasonPreview: expect.arrayContaining([
        'Some closure has already landed: the send path already rebuilds project identity and Phase 1 awareness before reply shaping starts.',
      ]),
    }))
    expect(identity?.companionBriefingLine).toBeNull()
    expect(identity?.companionNextClosureLine).toBeNull()
    expect(identity?.emotionalClosureCue).toBeNull()
    expect(identity?.projectState).toEqual(expect.objectContaining({
      latestLandedProgress: 'Some closure has already landed: the send path already rebuilds project identity and Phase 1 awareness before reply shaping starts.',
      currentPhase: null,
    }))
    expectSanitizedIdentity(identity)
  })

  it('prefers project-state continuity embedded pre-dialogue awareness over generic continuity fallback when the standalone awareness snapshot is missing', async () => {
    ingestMock.mockResolvedValueOnce(undefined)
    preDialogueClosureSnapshotRef.value = null
    preDialogueAwarenessSnapshotRef.value = null
    projectStateContinuitySnapshotRef.value = {
      identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      continuitySummary: 'generic continuity fallback that should not replace a more specific project-awareness line.',
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      primaryOpenLoop: 'Memory, initiative, execution, and embodiment still need a tighter same-her closure line.',
      nextClosureTarget: 'Keep carrying one same-her digital life line before local implementation fluency takes over.',
      preDialogueAwareness: {
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
        companionBriefingLine: 'Before speaking, remember what this project is, what has already landed, and which life loop is still open.',
        companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her digital life line.',
        awarenessLine: 'Before speaking, remember this is still the same digital life project before local fluency takes over.',
        reasonPreview: [
          'Project identity still needs to stay explicit before the reply widens outward.',
          'The unfinished life loop still belongs to one same living her.',
        ],
      },
    }

    const store = useChatTextComposerStore()
    store.setDraft('现在 Alicization 的记忆闭环做到哪一步了')

    await expect(store.sendCurrentMessage()).resolves.toBe(true)

    const sentIdentity = ingestMock.mock.calls[0]?.[1]?.preDialogueSendIdentity
    expect(ingestMock.mock.calls[0]?.[0]).toBe('现在 Alicization 的记忆闭环做到哪一步了')
    expect(sentIdentity).toEqual(expect.objectContaining({
      status: 'partial',
      emotionalClosureCue: null,
      companionHeadlineLine: null,
      reasonPreview: expect.any(Array),
    }))
    expect(sentIdentity?.companionBriefingLine).toBeNull()
    expect(sentIdentity?.companionNextClosureLine).toBeNull()
    expectSanitizedIdentity(sentIdentity)
    expect(sentIdentity?.summaryLine).not.toBe('generic continuity fallback that should not replace a more specific project-awareness line.')
  })

  it('preserves awareness headline priority even when no closure snapshot is available yet', async () => {
    ingestMock.mockResolvedValueOnce(undefined)
    preDialogueClosureSnapshotRef.value = null
    preDialogueAwarenessSnapshotRef.value = {
      status: 'partial',
      summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
      companionHeadlineLine: 'Right now I still need to keep this same-her digital life line intact before widening into generic assistant output.',
      companionBriefingLine: 'Before speaking, remember what this project is, what has already landed, and which life loop is still open.',
      companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her digital life line.',
      awarenessLine: 'Before speaking, remember this is still the same digital life project before local fluency takes over.',
      reasonPreview: [
        'Project identity still needs to stay explicit before the reply widens outward.',
      ],
    }
    projectStateContinuitySnapshotRef.value = {
      identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      continuitySummary: 'generic continuity fallback that should not replace a stronger same-her headline.',
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      primaryOpenLoop: 'Memory, initiative, execution, and embodiment still need a tighter same-her closure line.',
      nextClosureTarget: 'Keep carrying one same-her digital life line before local implementation fluency takes over.',
      emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
      preDialogueAwareness: {
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
        companionHeadlineLine: 'Right now I still need to keep this same-her digital life line intact before widening into generic assistant output.',
        companionBriefingLine: 'Before speaking, remember what this project is, what has already landed, and which life loop is still open.',
        companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her digital life line.',
        awarenessLine: 'Before speaking, remember this is still the same digital life project before local fluency takes over.',
        reasonPreview: [
          'Project identity still needs to stay explicit before the reply widens outward.',
          'The unfinished life loop still belongs to one same living her.',
        ],
      },
    }

    const store = useChatTextComposerStore()
    store.setDraft('现在 Alicization 的记忆闭环做到哪一步了')

    await expect(store.sendCurrentMessage()).resolves.toBe(true)

    expectSentText('现在 Alicization 的记忆闭环做到哪一步了')
    const identity = sentPreDialogueIdentity()
    expect(identity).toEqual(expect.objectContaining({
      companionHeadlineLine: null,
      emotionalClosureCue: null,
      companionBriefingLine: null,
      companionNextClosureLine: null,
      reasonPreview: expect.any(Array),
    }))
    expectSanitizedIdentity(identity)
  })

  it('reopens resumed sends from restored hold detail when continuity is the only surviving carry', async () => {
    ingestMock.mockResolvedValueOnce(undefined)
    preDialogueClosureSnapshotRef.value = null
    preDialogueAwarenessSnapshotRef.value = null
    projectStateContinuitySnapshotRef.value = {
      identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      latestLandedProgress: 'Resumed callbacks already recover project continuity from the restored turn snapshot before reply shaping starts.',
      continuitySummary: 'project continuity is still reopening on the same measured-return line instead of from scratch.',
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      sameHerHoldDetail: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
      sameHerDriftRisk: 'If this resumed turn restarts like a fresh generic project handoff, treat that as same-her continuity drift rather than forward closure.',
      primaryOpenLoop: 'Memory, initiative, execution, and embodiment still need stronger callback continuity so resumed turns reopen like the same living her instead of a fresh assistant session.',
      nextClosureTarget: 'Keep proving restored callbacks can reopen from the same-her measured-return line before widening outward again.',
      emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
      preDialogueAwareness: null,
    }

    const store = useChatTextComposerStore()
    store.setDraft('现在 Alicization 的记忆闭环做到哪一步了')

    await expect(store.sendCurrentMessage()).resolves.toBe(true)

    expectSentText('现在 Alicization 的记忆闭环做到哪一步了')
    const identity = sentPreDialogueIdentity()
    expect(identity).toEqual(expect.objectContaining({
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: null,
      emotionalClosureCue: null,
      reasonPreview: expect.arrayContaining([
        'Resumed callbacks already recover project continuity from the restored turn snapshot before reply shaping starts.',
        'project continuity is still reopening on the same measured-return line instead of from scratch.',
      ]),
    }))
    expectSanitizedIdentity(identity)
  })
})
