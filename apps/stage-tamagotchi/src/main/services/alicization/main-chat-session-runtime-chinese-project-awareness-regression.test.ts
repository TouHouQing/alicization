import { describe, expect, it } from 'vitest'

import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import {
  normalizeProviderFacingMindTurnContract,
  rebuildProviderFacingMindTurnContract,
} from './main-chat-session-runtime'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

describe('main chat session runtime chinese project awareness regression', () => {
  it('prefers a richer Chinese same-her project brief over a thinner Chinese Phase 1 shell when provider-facing project awareness is rebuilt', () => {
    const thinChinesePhaseOneShell = '开口前先记住：这是同一个数字生命项目，她现在仍在 Phase 1。'
    const richerChineseSameHerBrief = '继续沿着这个数字生命主线往前，不要飘回泛化助手；Phase 1 里记忆、主动性和具身闭环还没收住。'

    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(createDefaultVisualPresenceState(91_000))
    runtimeSurface.dialogue = {
      ...runtimeSurface.dialogue,
      currentConsciousFrame: {
        reasonTags: ['project-state', 'same-her', 'phase-1-closure'],
        focusAnchor: 'same-her project awareness',
        projectState: {
          identity: 'Alicization is still the same local-first digital life project building one continuous her on the host machine.',
          currentPhase: 'Phase 1: Local Digital Life',
          preflightSummary: 'Before answering, remember this is still one local-first digital life project and the unfinished Phase 1 closure still belongs to one living her.',
          preDialogueAwarenessLine: thinChinesePhaseOneShell,
          awarenessLine: thinChinesePhaseOneShell,
          preDialogueAwarenessSummary: thinChinesePhaseOneShell,
          latestLandedProgress: 'Project-state continuity already survives into runtime preparation and visible-reply repair.',
          primaryOpenLoop: 'Memory, initiative, and embodiment still need one same-her closure seam before the turn widens outward.',
          nextClosureTarget: 'Keep memory, initiative, and embodiment arriving as one same-her loop before the next host-visible answer beat.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerDriftRisk: 'If the visible answer opens like detached project narration, the same-her line can collapse into generic guidance and project-summary voice.',
        },
      } as any,
    } as any

    const governance = {
      decisionTraceId: 'trace-chinese-phase-one-shell-provider-facing',
      turnMode: 'answer',
      truthState: 'live-observed',
      answerSubject: 'project-state',
      answerAct: 'answer',
      personaKernelMode: 'full',
    } as any

    const rawPayload = {
      preDialogueSendIdentity: {
        status: 'grounded',
        summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=memory, initiative, and embodiment still need stronger same-her closure',
        awarenessLine: thinChinesePhaseOneShell,
        companionHeadlineLine: null,
        companionBriefingLine: richerChineseSameHerBrief,
        companionNextClosureLine: 'Keep memory, initiative, and embodiment arriving as one same-her loop before the next host-visible answer beat.',
        reasonPreview: [
          'Primary open life loop still centers on keeping memory, initiative, and embodiment on one same-her line.',
        ],
      },
    } as any

    const rebuilt = rebuildProviderFacingMindTurnContract({
      contract: null,
      governance,
      runtimeSurface: {
        digitalLifeSpine: null,
        digitalLifeRuntimeSurface: runtimeSurface,
      } as any,
      rawPayload,
    })

    const normalized = normalizeProviderFacingMindTurnContract(rebuilt as any, rawPayload, {
      digitalLifeSpine: null,
      digitalLifeRuntimeSurface: runtimeSurface,
    } as any)

    expect(rebuilt?.projectState?.preDialogueAwarenessLine).toBe(richerChineseSameHerBrief)
    expect(rebuilt?.projectState?.awarenessLine).toBe(richerChineseSameHerBrief)
    expect(normalized?.projectState?.preDialogueAwarenessLine).toBe(richerChineseSameHerBrief)
    expect(normalized?.projectState?.awarenessLine).toBe(richerChineseSameHerBrief)
    expect(normalized?.projectState?.preDialogueAwarenessSummary).toBe(richerChineseSameHerBrief)
    expect(String(normalized?.projectState?.preDialogueAwarenessLine ?? '')).not.toBe(thinChinesePhaseOneShell)
  })
})
