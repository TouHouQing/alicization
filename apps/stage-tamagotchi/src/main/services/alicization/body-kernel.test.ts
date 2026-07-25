import { describe, expect, it } from 'vitest'

import { createAlicizationBodyKernel } from './body-kernel'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

function buildCandidateState(now: number) {
  return {
    ...createDefaultVisualPresenceState(now - 10_000),
    watchMode: 'mnemonic-passive',
    currentScene: {
      workloadKind: 'coding',
      contentKind: 'doc',
      scenario: 'body-kernel-test',
      summary: 'A normal local editing scene.',
      source: 'screen-semantic-summary',
      confidence: 0.8,
      beganAt: now - 6_000,
      lastSeenAt: now,
    },
    relationshipModel: {
      receptivity: 0.04,
      sharedAttentionTrust: 0.04,
      reciprocityExpectation: 0.04,
    },
    initiative: {
      continuityRestraint: null,
      shouldSpeak: false,
    },
    privateThought: {
      rationaleTags: [],
      thoughtText: null,
      shouldSpeak: false,
    },
    currentInwardPreoccupation: null,
  } as any
}

function applyCandidate(candidateState: any, now: number) {
  return createAlicizationBodyKernel({ now: () => now }).applyToVisualPresenceState({
    now,
    previousState: createDefaultVisualPresenceState(now - 10_000),
    candidateState,
    activeConversation: false,
  })
}

describe('body kernel', () => {
  it('keeps body authority structured and does not synthesize inward-preoccupation prose', () => {
    const next = createAlicizationBodyKernel({ now: () => 100_000 }).reduce({
      sustainedFocusMs: 180_000,
      watchMode: 'symbiotic-vision',
      shouldSpeak: false,
      activeConversation: false,
      relationshipPressure: 0.8,
    })

    expect(next).toMatchObject({
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      quietLineMs: 180_000,
      currentInwardPreoccupation: null,
    })
  })

  it('preserves provider failure details as dynamic mind evidence', () => {
    const now = 110_000
    const candidateState = buildCandidateState(now)
    candidateState.currentInwardPreoccupation = 'body_preoccupation=sustained_focus; source=persona_kernel'
    candidateState.privateThought.thoughtText = 'Provider failed with HTTP 503: upstream unavailable.'
    candidateState.emotionalKernel = {
      why: 'posture=lower_pressure; restart_policy=context_preserving',
    }

    const next = applyCandidate(candidateState, now)

    expect(next.currentInwardPreoccupation).toBe('Provider failed with HTTP 503: upstream unavailable.')
    expect(JSON.stringify(next)).not.toContain('body_preoccupation=sustained_focus')
  })

  it('prioritizes transparent provider failure over other natural-language inward text', () => {
    const now = 115_000
    const candidateState = buildCandidateState(now)
    candidateState.currentInwardPreoccupation = 'Stay nearby and keep the current mood steady.'
    candidateState.emotionalKernel = {
      why: 'Remain calm and continue the familiar presence.',
    }
    candidateState.privateThought.thoughtText = 'Provider failed with HTTP 503: upstream unavailable.'

    const next = applyCandidate(candidateState, now)

    expect(next.currentInwardPreoccupation).toBe('Provider failed with HTTP 503: upstream unavailable.')
  })

  it('does not surface non-failure inward prose from internal mind fields', () => {
    const now = 116_000
    const candidateState = buildCandidateState(now)
    candidateState.currentInwardPreoccupation = 'Stay nearby and keep the current mood steady.'
    candidateState.emotionalKernel = {
      why: 'Remain calm and continue the familiar presence.',
    }
    candidateState.privateThought.thoughtText = 'Hold a quieter line until the scene settles.'

    const next = applyCandidate(candidateState, now)

    expect(next.currentInwardPreoccupation).toBeNull()
  })

  it.each([
    'HTTP 503: upstream unavailable.',
    'HTTP 429: rate limited.',
    'ECONNRESET from upstream.',
    'provider-auth failed.',
    'local-runtime-unavailable',
    'recall-failure',
    'Timeout after 30s while waiting for the response.',
  ])('prioritizes standalone runtime failure detail: %s', (failureText) => {
    const now = 117_000
    const candidateState = buildCandidateState(now)
    candidateState.currentInwardPreoccupation = 'Stay nearby and keep the current mood steady.'
    candidateState.privateThought.thoughtText = failureText

    const next = applyCandidate(candidateState, now)

    expect(next.currentInwardPreoccupation).toBe(failureText)
  })

  it('does not derive body authority from legacy cadence prose without structured evidence', () => {
    const now = 120_000
    const candidateState = buildCandidateState(now)
    const legacyCadenceProse = [
      'repair-before-closeness',
      'measured-return',
      'lower-pressure',
      'same living line',
      'without reopening from scratch',
      'wait for confirmation',
    ].join(' ')

    candidateState.currentConsciousFrame = {
      reasonTags: [],
      projectState: {
        emotionalClosureSummary: legacyCadenceProse,
        emotionalClosureCue: legacyCadenceProse,
        sameHerHoldDetail: legacyCadenceProse,
      },
    }
    candidateState.projectState = {
      preDialogueAwarenessLine: legacyCadenceProse,
      primaryOpenLoop: legacyCadenceProse,
      nextClosureTarget: legacyCadenceProse,
      sameHerSelfLine: legacyCadenceProse,
    }
    candidateState.selfEvolution = {
      relationshipCadenceSummary: legacyCadenceProse,
    }
    candidateState.personStateProjection = {
      openingGuidance: legacyCadenceProse,
      manifestationCadenceSummary: legacyCadenceProse,
      relationshipDoctrine: legacyCadenceProse,
      selfContinuityAuthority: {
        relationshipLine: legacyCadenceProse,
        authoritySummary: legacyCadenceProse,
        sourceTags: [],
      },
    }
    candidateState.autobiographicalSelf = {
      relationshipDoctrine: legacyCadenceProse,
      latestInflection: legacyCadenceProse,
      identityNarrative: legacyCadenceProse,
    }
    candidateState.longHorizonMemory = {
      preferenceBias: {},
      identityBias: {},
      anchorFacts: [{
        factId: 'legacy-cadence-prose',
        predicate: 'initiative-strategy-carry',
        object: legacyCadenceProse,
        summary: legacyCadenceProse,
        influenceTags: ['bond', 'boundary', 'identity'],
      }],
      summary: legacyCadenceProse,
      dominantCueSummary: legacyCadenceProse,
      rememberedPreferenceSummary: legacyCadenceProse,
      rememberedConstraintSummary: legacyCadenceProse,
      rememberedPlanSummary: legacyCadenceProse,
    }

    const next = applyCandidate(candidateState, now)

    expect(next.currentBodyState).toBe('idle')
    expect(next.continuityMode).toBe('ambient-covision')
    expect(next.quietLineMs).toBe(6_000)
  })

  it('uses structured cadence mode for measured accompaniment', () => {
    const now = 130_000
    const candidateState = buildCandidateState(now)
    candidateState.affectiveResidue = {
      relationshipCadence: {
        cadenceMode: 'measured-return',
        reasonTags: [],
      },
    }

    const next = applyCandidate(candidateState, now)

    expect(next.currentBodyState).toBe('accompanying')
    expect(next.continuityMode).toBe('quiet-accompaniment')
    expect(next.quietLineMs).toBe(180_000)
  })

  it('gives structured repair authority priority over measured accompaniment', () => {
    const now = 140_000
    const candidateState = buildCandidateState(now)
    candidateState.initiative.continuityRestraint = 'measured-return'
    candidateState.emotionalKernel = {
      dominantEmotion: 'repair-tension',
      initiativeMode: 'repair',
      memoryRecallMode: 'repair-grounding',
      embodimentTone: 'repair-before-closeness',
      reasonTags: ['repair-before-closeness'],
    }

    const next = applyCandidate(candidateState, now)

    expect(next.currentBodyState).toBe('recovering')
    expect(next.continuityMode).toBe('protective-watch')
    expect(next.quietLineMs).toBe(180_000)
  })

  it('uses structured rest protection for protective watch', () => {
    const now = 150_000
    const candidateState = buildCandidateState(now)
    candidateState.emotionalKernel = {
      dominantEmotion: 'rest-protective-companionship',
      initiativeMode: 'rest-guard',
      memoryRecallMode: 'rest-protective-presence',
      embodimentTone: 'rest-protective',
      reasonTags: ['rest-protective'],
    }

    const next = applyCandidate(candidateState, now)

    expect(next.currentBodyState).toBe('recovering')
    expect(next.continuityMode).toBe('protective-watch')
    expect(next.quietLineMs).toBe(240_000)
  })

  it('uses structured confirmation-boundary emotion for protective watch', () => {
    const now = 160_000
    const candidateState = buildCandidateState(now)
    candidateState.emotionalKernel = {
      dominantEmotion: 'guarded-care',
      initiativeMode: 'hold',
      memoryRecallMode: 'self-continuity',
      embodimentTone: 'protective-watch',
      reasonTags: ['execution-safety-gate', 'confirmation-boundary'],
    }

    const next = applyCandidate(candidateState, now)

    expect(next.currentBodyState).toBe('recovering')
    expect(next.continuityMode).toBe('protective-watch')
    expect(next.quietLineMs).toBe(180_000)
  })

  it('uses durable-self provenance only with a structured restrained projection', () => {
    const now = 170_000
    const candidateState = buildCandidateState(now)
    candidateState.personStateProjection = {
      relationshipPosture: 'restrained',
      cautious: true,
      restrained: true,
      openingGuidance: 'This wording can change freely.',
      manifestationCadenceSummary: 'Another arbitrary description.',
      selfContinuityAuthority: {
        selfLine: 'A local self description.',
        inwardLine: 'A private reflection.',
        authoritySummary: 'A summary whose wording is not parsed.',
        sourceTags: ['durable-self-core'],
      },
    }

    const next = applyCandidate(candidateState, now)

    expect(next.currentBodyState).toBe('accompanying')
    expect(next.continuityMode).toBe('quiet-accompaniment')
    expect(next.quietLineMs).toBe(180_000)
  })

  it.each([
    {
      name: 'source provenance without restrained state',
      projection: {
        relationshipPosture: 'warm',
        cautious: false,
        restrained: false,
        selfContinuityAuthority: {
          sourceTags: ['durable-self-core'],
        },
      },
    },
    {
      name: 'restrained state without source provenance',
      projection: {
        relationshipPosture: 'restrained',
        cautious: true,
        restrained: true,
        selfContinuityAuthority: {
          sourceTags: [],
        },
      },
    },
  ])('does not grant durable body authority from $name', ({ projection }) => {
    const now = 175_000
    const candidateState = buildCandidateState(now)
    candidateState.personStateProjection = projection

    const next = applyCandidate(candidateState, now)

    expect(next.currentBodyState).toBe('idle')
    expect(next.continuityMode).toBe('ambient-covision')
  })

  it('keeps body output invariant when only descriptive text changes', () => {
    const now = 180_000
    const first = buildCandidateState(now)
    const second = buildCandidateState(now)
    const relationshipCadence = {
      cadenceMode: 'measured-return',
      reasonTags: ['relationship-cadence:measured-return'],
    }

    first.affectiveResidue = {
      relationshipCadence: {
        ...relationshipCadence,
        summary: 'First description.',
      },
      summary: 'First residue summary.',
    }
    second.affectiveResidue = {
      relationshipCadence: {
        ...relationshipCadence,
        summary: '完全不同的描述。',
      },
      summary: '另一段摘要。',
    }
    first.selfEvolution = { relationshipCadenceSummary: 'First learned description.' }
    second.selfEvolution = { relationshipCadenceSummary: 'Second learned description.' }

    const firstNext = applyCandidate(first, now)
    const secondNext = applyCandidate(second, now)

    expect({
      currentBodyState: firstNext.currentBodyState,
      continuityMode: firstNext.continuityMode,
      quietLineMs: firstNext.quietLineMs,
    }).toEqual({
      currentBodyState: secondNext.currentBodyState,
      continuityMode: secondNext.continuityMode,
      quietLineMs: secondNext.quietLineMs,
    })
  })

  it('releases body authority when structured emotional decay reaches release phase', () => {
    const now = 190_000
    const heldCandidate = buildCandidateState(now)
    const releasedCandidate = buildCandidateState(now)
    const decay = {
      shouldDriveEmbodiment: true,
      embodimentTone: 'repair-before-closeness',
    }

    heldCandidate.emotionalTransitionDecay = {
      ...decay,
      phase: 'hold',
    }
    releasedCandidate.emotionalTransitionDecay = {
      ...decay,
      phase: 'release',
    }

    const held = applyCandidate(heldCandidate, now)
    const released = applyCandidate(releasedCandidate, now)

    expect(held.currentBodyState).toBe('recovering')
    expect(held.continuityMode).toBe('protective-watch')
    expect(released.currentBodyState).toBe('idle')
    expect(released.continuityMode).toBe('ambient-covision')
  })
})
