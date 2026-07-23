import { describe, expect, it } from 'vitest'

import {
  normalizeDialogueRespondedPayload as normalizeDialogueRespondedPayloadBase,
} from './runtime-governance'

type CharacterPerformanceCapabilitiesManifest = Record<string, any>

function normalizeDialogueRespondedPayload(
  input: unknown,
  manifest?: CharacterPerformanceCapabilitiesManifest | null,
  options?: Parameters<typeof normalizeDialogueRespondedPayloadBase>[2],
) {
  return normalizeDialogueRespondedPayloadBase(
    input as Parameters<typeof normalizeDialogueRespondedPayloadBase>[0],
    manifest as Parameters<typeof normalizeDialogueRespondedPayloadBase>[1],
    options,
  )
}

describe('runtime governance project awareness route', () => {
  it('keeps merge-readiness project-state audit boundaries explicit when host-visible normalization rebuilds the reply payload', () => {
    const dialoguePayload = normalizeDialogueRespondedPayload({
      turnId: 'turn-normalize-project-state-merge-readiness-audit-1',
      sessionId: 'session-normalize-project-state-merge-readiness-audit',
      assistantText: '这次 project-state 追问里，已验证和未闭环的边界不能被磨平。',
      structured: {
        thought: 'project-state merge-readiness follow-up should keep verified and still-open closure boundaries explicit all the way to the host-visible payload',
        emotion: 'thinking',
        reply: '这次 project-state 追问里，已验证和未闭环的边界不能被磨平。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        projectState: {
          identity: 'Alicization is a local-first digital life project building identity continuity on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          latestLandedProgress: 'The runtime contract already keeps merge-readiness governance rules explicit through rebuild and normalization.',
          primaryOpenLoop: 'Host-visible continuity still needs to keep verified proof separate from what is still open before claiming merge readiness.',
          nextClosureTarget: 'Keep the host-visible project-state audit explicit about what is verified now and what still needs closure next.',
          sameHerSelfLine: 'structured continuity digest.',
          preDialogueAwarenessLine: 'Pre-reply whether this can merge to main, remember what is already verified and what is still unproven or still open.',
        },
      },
      visibleReplyRealization: {
        version: 'visible-reply-realization-v1',
        expectedAuthority: 'llm-mind',
        actualAuthority: 'llm-mind',
        providerMindExecuted: true,
        mode: 'provider-one-shot',
        visibleText: '这次 project-state 追问里，已验证和未闭环的边界不能被磨平。',
        visibleReplyValidationStatus: 'approved',
        projectStateEvidenceStatus: 'present',
        nonHumanAuthoredStatus: null,
        blockedReasons: [],
        emotionalClosureAudit: null,
        selfAuthorityAudit: null,
        projectStateAudit: {
          sameHerSummary: 'structured continuity digest.',
          currentPhaseSummary: 'Phase 1: Local Digital Life',
          landedProgressSummary: 'Verified now: the runtime contract already keeps merge-readiness governance rules explicit through rebuild and normalization.',
          openClosureSummary: 'Still open: host-visible continuity still needs to keep verified proof separate from what is still open before claiming merge readiness.',
          nextClosureTargetSummary: 'Next closure target: keep the host-visible project-state audit explicit about what is verified now and what still needs closure next.',
          preDialogueAwarenessSummary: 'Pre-reply whether this can merge to main, remember what is already verified and what is still unproven or still open.',
          continuitySummary: 'same-her=structured continuity digest.',
        },
        reason: 'mind-authored-project-state-merge-readiness',
      },
      origin: 'user-turn',
      createdAt: Date.now(),
    })

    expect((dialoguePayload as any)?.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      landedProgressSummary: 'Verified now: the runtime contract already keeps merge-readiness governance rules explicit through rebuild and normalization.',
      openClosureSummary: 'Still open: host-visible continuity still needs to keep verified proof separate from what is still open before claiming merge readiness.',
      nextClosureTargetSummary: 'Next closure target: keep the host-visible project-state audit explicit about what is verified now and what still needs closure next.',
      preDialogueAwarenessSummary: 'Pre-reply whether this can merge to main, remember what is already verified and what is still unproven or still open.',
    }))
    expect((dialoguePayload as any)?.visibleReplyRealization).toEqual(expect.objectContaining({
      visibleReplyValidationStatus: 'approved',
      projectStateEvidenceStatus: 'present',
    }))
  })

  it('keeps completion-timing and language-drift project-state audit boundaries explicit when host-visible normalization rebuilds the reply payload', () => {
    const dialoguePayload = normalizeDialogueRespondedPayload({
      turnId: 'turn-normalize-project-state-timeline-language-drift-audit-1',
      sessionId: 'session-normalize-project-state-timeline-language-drift-audit',
      assistantText: '这次 project-state 追问里，我会把已落地、预计收口时机、以及为什么刚才跑出了英文一起交代清楚。',
      structured: {
        thought: 'project-state completion-timing and language-drift follow-up should keep landed progress, closure timing, and host-language drift repair boundaries explicit all the way to the host-visible payload',
        emotion: 'thinking',
        reply: '这次 project-state 追问里，我会把已落地、预计收口时机、以及为什么刚才跑出了英文一起交代清楚。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        projectState: {
          identity: 'Alicization is a local-first digital life project building identity continuity on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          latestLandedProgress: 'The runtime contract already keeps current landed progress explicit through rebuild and normalization.',
          primaryOpenLoop: 'Host-visible continuity still needs to explain what remains open and why the closure line is not finished yet before promising the goal timeline.',
          nextClosureTarget: 'Keep the host-visible project-state audit explicit about the next closure beat and return to Chinese before this same-her answer widens outward.',
          sameHerSelfLine: 'structured continuity digest.',
          preDialogueAwarenessLine: 'Pre-reply how far this has landed, when the goal is expected to close, and why the thread drifted into English, remember what is already verified, what still remains open, and return on the same project line in the host language.',
        },
      },
      visibleReplyRealization: {
        version: 'visible-reply-realization-v1',
        expectedAuthority: 'llm-mind',
        actualAuthority: 'llm-mind',
        providerMindExecuted: true,
        mode: 'provider-one-shot',
        visibleText: '这次 project-state 追问里，我会把已落地、预计收口时机、以及为什么刚才跑出了英文一起交代清楚。',
        visibleReplyValidationStatus: 'approved',
        projectStateEvidenceStatus: 'present',
        nonHumanAuthoredStatus: null,
        blockedReasons: [],
        emotionalClosureAudit: null,
        selfAuthorityAudit: null,
        projectStateAudit: {
          sameHerSummary: 'structured continuity digest.',
          currentPhaseSummary: 'Phase 1: Local Digital Life',
          landedProgressSummary: 'Verified now: the runtime contract already keeps current landed progress explicit through rebuild and normalization.',
          openClosureSummary: 'Still open: host-visible continuity still needs to explain what remains open and why the closure line is not finished yet before promising the goal timeline.',
          nextClosureTargetSummary: 'Next closure target: keep the host-visible project-state audit explicit about the next closure beat and return to Chinese before this same-her answer widens outward.',
          preDialogueAwarenessSummary: 'Pre-reply how far this has landed, when the goal is expected to close, and why the thread drifted into English, remember what is already verified, what still remains open, and return on the same project line in the host language.',
          continuitySummary: 'same-her=structured continuity digest.',
        },
        reason: 'mind-authored-project-state-completion-timing-language-drift',
      },
      origin: 'user-turn',
      createdAt: Date.now(),
    })

    expect((dialoguePayload as any)?.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      landedProgressSummary: 'Verified now: the runtime contract already keeps current landed progress explicit through rebuild and normalization.',
      openClosureSummary: 'Still open: host-visible continuity still needs to explain what remains open and why the closure line is not finished yet before promising the goal timeline.',
      nextClosureTargetSummary: 'Next closure target: keep the host-visible project-state audit explicit about the next closure beat and return to Chinese before this same-her answer widens outward.',
      preDialogueAwarenessSummary: 'Pre-reply how far this has landed, when the goal is expected to close, and why the thread drifted into English, remember what is already verified, what still remains open, and return on the same project line in the host language.',
    }))
    expect((dialoguePayload as any)?.visibleReplyRealization).toEqual(expect.objectContaining({
      visibleReplyValidationStatus: 'approved',
      projectStateEvidenceStatus: 'present',
    }))
  })

  it('keeps real runtime diagnostics and the LLM reply without reattaching project governance payloads', () => {
    const runtimeDigest = {
      projectState: {
        identity: 'Alicization is a local-first digital life project building identity continuity on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Accepted-start authority already lands on the renderer before the first outward reply.',
        primaryOpenLoop: 'The real speech path still needs to keep the same project awareness and runtime digest explicit before fallback voice opens.',
        nextClosureTarget: 'Keep the same project-aware line through normalized dialogue payloads and fallback speech metadata.',
        sameHerSelfLine: 'structured continuity digest.',
        sameHerHoldDetail: 'Pre-speech outward, keep one identity-continuity',
        preDialogueAwarenessLine: 'Before fallback voice opens, remember what has already landed, what is still open, and keep the same project-aware line.',
        awarenessLine: 'Same renderer-ready project awareness must survive all the way into the speech path.',
        preflightSummary: 'Renderer authority already landed; speech-path authority still needs to stay equally explicit.',
      },
      currentConsciousFrame: {
        subject: 'general',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'keep same-her speech continuity explicit',
        consciousTension: 'renderer already knows; fallback speech must not drift thinner',
        speakingIntention: 'carry project-aware same-her authority into the outward reply',
        focusAnchor: '继续往真实发声链收口',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.91,
        reasonTags: ['project-awareness', 'speech-authority'],
        continuityPreferredTiming: 'immediate',
        continuityCadence: 'measured-return',
        updatedAt: Date.now(),
      },
    }

    const dialoguePayload = normalizeDialogueRespondedPayload({
      turnId: 'turn-normalize-project-awareness-speech-authority-1',
      sessionId: 'session-normalize-project-awareness-speech-authority',
      assistantText: '我先把这条真实发声链上的 project awareness 接稳，再往外说。',
      structured: {
        thought: 'the normalized dialogue payload should keep the same project-aware line and runtime digest before the real speech path opens',
        emotion: 'thinking',
        reply: '我先把这条真实发声链上的 project awareness 接稳，再往外说。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        projectState: runtimeDigest.projectState,
        preDialogueAwareness: {
          status: 'grounded',
          summaryLine: 'Renderer-side identity-continuity',
          companionBriefingLine: 'Renderer authority is already grounded; keep that same project-aware line through speech.',
          companionNextClosureLine: 'Carry the same project awareness and runtime digest into the real speech path.',
          awarenessLine: 'Before fallback voice opens, remember what has already landed, what is still open, and keep the same project-aware line.',
          emotionalClosureCue: 'Let the voice rejoin softly without splitting the identity-continuity',
          reasonPreview: [
            'Accepted-start authority already landed on the renderer.',
            'Speech-side fallback still needs the same project-aware authority.',
          ],
        },
        runtimeDigest,
      },
      origin: 'user-turn',
      createdAt: Date.now(),
    } as any)

    expect((dialoguePayload as any)?.structured).toEqual(expect.objectContaining({
      reply: '我先把这条真实发声链上的 project awareness 接稳，再往外说。',
      visibleReplyAuthority: 'llm-mind',
      runtimeDigest: expect.objectContaining({
        projectState: expect.objectContaining({
          latestLandedProgress: 'Accepted-start authority already lands on the renderer before the first outward reply.',
          primaryOpenLoop: 'The real speech path still needs to keep the same project awareness and runtime digest explicit before fallback voice opens.',
          preDialogueAwarenessLine: 'Before fallback voice opens, remember what has already landed, what is still open, and keep the same project-aware line.',
        }),
        currentConsciousFrame: expect.objectContaining({
          focusAnchor: '继续往真实发声链收口',
          continuityCadence: 'measured-return',
        }),
      }),
    }))
    expect((dialoguePayload as any)?.structured).not.toHaveProperty('projectState')
    expect((dialoguePayload as any)?.structured).not.toHaveProperty('preDialogueAwareness')
    expect(JSON.stringify((dialoguePayload as any)?.structured)).not.toMatch(
      /opening_policy|relationship_cadence|visibility\s*=\s*redacted_internal/iu,
    )
  })
})
