import { containsAlicizationFixedTemplateResidue } from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import {
  normalizeProviderFacingMindTurnContract,
  rebuildProviderFacingMindTurnContract,
} from './main-chat-session-runtime'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

function expectNoFixedTemplateResidue(value: unknown) {
  const serialized = JSON.stringify(value ?? '')
  expect(containsAlicizationFixedTemplateResidue(serialized), serialized).toBe(false)
}

describe('main chat session runtime chinese project awareness regression', () => {
  it('drops Chinese fixed shells while preserving factual landed open and next state', () => {
    const thinChinesePhaseOneShell = '开口前先记住：这是同一个数字生命项目，她现在仍在 Phase 1。'
    const richerChineseSameHerBrief = '继续沿着这个数字生命主线往前，不要飘回泛化助手；Phase 1 里记忆、主动性和具身闭环还没收住。'

    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(createDefaultVisualPresenceState(91_000))
    runtimeSurface.dialogue = {
      ...runtimeSurface.dialogue,
      currentConsciousFrame: {
        reasonTags: ['project-state', 'same-her', 'phase-1-closure'],
        focusAnchor: 'identity-continuity',
        projectState: {
          identity: 'Alicization is still the same local-first digital life project building identity continuity on the host machine.',
          currentPhase: 'Phase 1: Local Digital Life',
          preflightSummary: 'pre_turn_context_digest',
          preDialogueAwarenessLine: thinChinesePhaseOneShell,
          awarenessLine: thinChinesePhaseOneShell,
          preDialogueAwarenessSummary: thinChinesePhaseOneShell,
          latestLandedProgress: 'Project-state continuity already survives into runtime preparation and visible-reply repair.',
          primaryOpenLoop: 'Memory, initiative, and embodiment still need one identity-continuity',
          nextClosureTarget: 'Keep memory, initiative, and embodiment arriving as one same-her loop before the next host-visible answer beat.',
          sameHerSelfLine: 'structured continuity digest.',
          sameHerDriftRisk: 'If the visible answer opens like detached project narration, the identity-continuity',
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
        summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=memory, initiative, and embodiment still need stronger identity-continuity',
        awarenessLine: thinChinesePhaseOneShell,
        companionHeadlineLine: null,
        companionBriefingLine: richerChineseSameHerBrief,
        companionNextClosureLine: 'Keep memory, initiative, and embodiment arriving as one same-her loop before the next host-visible answer beat.',
        reasonPreview: [
          'Primary open life loop still centers on keeping memory, initiative, and embodiment on one identity-continuity',
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

    const awarenessLines = [rebuilt?.projectState, normalized?.projectState].map((projectState) => {
      const awarenessLine = String(projectState?.preDialogueAwarenessLine ?? '')
      expect(awarenessLine).toContain('Continuity progress is partial')
      expect(awarenessLine).toMatch(/memory, dialogue, and embodiment still need end-to-end proof/iu)
      expect(awarenessLine).not.toContain('open=')
      expect(awarenessLine).not.toContain('next=')
      expect(awarenessLine).not.toContain('same-her loop')
      expect(awarenessLine).not.toBe(thinChinesePhaseOneShell)
      expect(awarenessLine).not.toBe(richerChineseSameHerBrief)
      return awarenessLine
    })
    expect(awarenessLines.join(' ')).toContain('Extend embodiment-scale validation')
    expect(String(normalized?.projectState?.awarenessLine ?? '')).not.toContain('open=')
    expect(String(normalized?.projectState?.preDialogueAwarenessSummary ?? '')).not.toContain('open=')
    expectNoFixedTemplateResidue(rebuilt?.projectState)
    expectNoFixedTemplateResidue(normalized?.projectState)
  })
})
