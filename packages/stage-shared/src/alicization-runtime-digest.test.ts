import { describe, expect, it } from 'vitest'

import { normalizeAlicizationRuntimeDigest } from './alicization-transport-contracts'

const fixedTemplateResiduePattern = new RegExp([
  'Before (?:answering|speaking|acting)',
  'Right now I am',
  'legacy phase-one template',
  'same-her',
  'continuity state',
  'one living her',
  'identity continuity',
  'host computer',
  'better chat wrapper',
  '同一个她',
  '数字生命主线',
].join('|'), 'iu')

function collectStringValues(value: unknown): string[] {
  if (typeof value === 'string')
    return [value]

  if (Array.isArray(value))
    return value.flatMap(item => collectStringValues(item))

  if (value && typeof value === 'object')
    return Object.values(value).flatMap(item => collectStringValues(item))

  return []
}

function expectNoFixedTemplateResidue(value: unknown) {
  for (const text of collectStringValues(value))
    expect(text, text).not.toMatch(fixedTemplateResiduePattern)
}

describe('alicization-runtime-digest transport normalization', () => {
  it('preserves active-loop continuity fields while dropping fixed project-state slogans', () => {
    const digest = normalizeAlicizationRuntimeDigest({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      activeLoop: {
        version: 'alicization-active-loop-v1',
        phase: 'integrate',
        dominantChannel: 'active-memory',
        handoffTarget: 'active-memory',
        continuityArcStage: 'hold-for-opening',
        continuityPreferredTiming: 'next-open-window',
        dialogueReady: true,
        controlReady: false,
        memoryCarry: true,
        companionshipReady: true,
        observationHeavy: false,
        initiativeBudget: 0.68,
        coherence: 0.74,
        summary: 'phase=integrate | handoff=active-memory | continuity-arc=hold-for-opening',
      },
      projectState: {
        identity: 'Alicization is a local-first digital life project building identity continuity.',
        sameHerSelfLine: 'Keep identity continuity explicit from self-understanding into the host-visible reply.',
        continuityArcStage: 'hold-for-opening',
        continuityPreferredTiming: 'next-open-window',
      },
      summary: 'dominant=active-memory',
    })

    expect(digest?.activeLoop?.continuityArcStage).toBe('hold-for-opening')
    expect(digest?.activeLoop?.continuityPreferredTiming).toBe('next-open-window')
    expect(digest?.projectState?.identity).toBeUndefined()
    expect(digest?.projectState?.sameHerSelfLine).toBeUndefined()
    expect(digest?.projectState?.continuityArcStage).toBe('hold-for-opening')
    expect(digest?.projectState?.continuityPreferredTiming).toBe('next-open-window')
    expectNoFixedTemplateResidue(digest)
  })

  it('preserves structured project-state continuity and delivery preferences', () => {
    const digest = normalizeAlicizationRuntimeDigest({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      projectState: {
        identity: 'project_state_scope=visible_governance',
        currentPhase: 'runtime_context=local_runtime',
        sameHerSelfLine: 'continuity_context=present',
        continuityRestraint: 'rest-protective',
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
        continuityCadence: 'rest-protective',
        continuityCue: 'continuity_cue=project-state-carry',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
      },
      continuityRestraint: 'rest-protective',
      summary: 'dominant=active-memory | restraint=rest-protective',
    })

    expect(digest?.projectState?.identity).toBe('project_state_scope=visible_governance')
    expect(digest?.projectState?.currentPhase).toBe('runtime_context=local_runtime')
    expect(digest?.projectState?.sameHerSelfLine).toBe('continuity_context=present')
    expect(digest?.projectState?.continuityRestraint).toBe('rest-protective')
    expect(digest?.projectState?.continuityCadence).toBe('rest-protective')
    expect(digest?.projectState?.continuityCue).toBe('continuity_cue=project-state-carry')
    expect(digest?.projectState?.preferredBlinkCadence).toBe('quiet')
    expect(digest?.projectState?.preferredGazeMode).toBe('soften')
    expect(digest?.continuityRestraint).toBe('rest-protective')
    expectNoFixedTemplateResidue(digest)
  })

  it('drops fixed pre-dialogue project-awareness and closure cue fields while preserving real evidence', () => {
    const digest = normalizeAlicizationRuntimeDigest({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      projectState: {
        identity: 'Alicization is a local-first digital life project building identity continuity.',
        currentPhase: 'Phase 1: Local Digital Life',
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=memory, initiative, and embodiment still need stronger identity-continuity',
        preDialogueAwarenessLine: 'pre_turn_context_digest',
        latestLandedProgress: 'Project-state continuity already survives into runtime preparation before visible reply authoring.',
        memoryClosureSummary: 'Project-state continuity already survives into runtime preparation before visible reply authoring.',
        primaryOpenLoop: 'memory, initiative, and embodiment review still needs closure.',
        nextClosureTarget: 'keep closure evidence structured before the visible reply forms.',
        sameHerSelfLine: 'Keep identity continuity explicit from self-understanding into the host-visible reply.',
        sameHerDriftRisk: 'If the answer collapses back into generic project narration, treat that as unfinished same-her drift.',
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
      },
      emotionalClosureCue: 'identity-continuity',
      summary: 'dominant=active-memory | project-awareness=pre-dialogue-grounded',
    })

    expect(digest?.projectState?.identity).toBeUndefined()
    expect(digest?.projectState?.currentPhase).toBeUndefined()
    expect(digest?.projectState?.preflightSummary).toBeUndefined()
    expect(digest?.projectState?.preDialogueAwarenessLine).toBeUndefined()
    expect(digest?.projectState?.latestLandedProgress).toContain('Project-state continuity already survives')
    expect(digest?.projectState?.memoryClosureSummary).toContain('runtime preparation')
    expect(digest?.projectState?.primaryOpenLoop).toContain('memory, initiative, and embodiment review')
    expect(digest?.projectState?.nextClosureTarget).toContain('keep closure evidence structured')
    expect(digest?.projectState?.sameHerSelfLine).toBeUndefined()
    expect(digest?.projectState?.sameHerDriftRisk).toBeUndefined()
    expect(digest?.emotionalClosureCue).toBeNull()
    expectNoFixedTemplateResidue(digest)
  })

  it('preserves current-conscious-frame transport fields that are not provider-facing templates', () => {
    const digest = normalizeAlicizationRuntimeDigest({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      currentConsciousFrame: {
        reasonTags: ['runtime-conscious-frame', 'continuity-arc:same-thread-continuation'],
        signature: 'embodiment:audible-same-her-line',
        focusAnchor: 'callback line after noisy detours',
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
      },
      summary: 'dominant=active-memory',
    })

    expect(digest?.currentConsciousFrame?.reasonTags).toEqual([
      'runtime-conscious-frame',
      'continuity-arc:same-thread-continuation',
    ])
    expect(digest?.currentConsciousFrame?.signature).toBe('embodiment:audible-same-her-line')
    expect(digest?.currentConsciousFrame?.focusAnchor).toBe('callback line after noisy detours')
    expect(digest?.currentConsciousFrame?.continuityArcStage).toBe('same-thread-continuation')
    expect(digest?.currentConsciousFrame?.continuityPreferredTiming).toBe('next-open-window')
  })

  it('preserves emotional-kernel authority in runtime digest as structured emotional carry', () => {
    const digest = normalizeAlicizationRuntimeDigest({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      emotionalKernel: {
        version: 'emotional-kernel-v1',
        dominantEmotion: 'rest-protective-companionship',
        initiativeMode: 'rest-guard',
        memoryRecallMode: 'rest-protective-presence',
        embodimentTone: 'rest-protective',
        valence: 0.48,
        arousal: 0.18,
        guardedness: 0.82,
        closenessDrive: 0.22,
        repairNeed: 0.41,
        initiativePressure: 0.16,
        reasonTags: [' late-night-drain ', ' continuity-review '],
        why: ' keep initiative, memory, and embodiment on one rest-protective reviewed line until the host settles ',
      },
      summary: 'dominant=active-memory | closure=rest-protective',
    })

    expect(digest?.emotionalKernel).toEqual({
      version: 'emotional-kernel-v1',
      dominantEmotion: 'rest-protective-companionship',
      initiativeMode: 'rest-guard',
      memoryRecallMode: 'rest-protective-presence',
      embodimentTone: 'rest-protective',
      valence: 0.48,
      arousal: 0.18,
      guardedness: 0.82,
      closenessDrive: 0.22,
      repairNeed: 0.41,
      initiativePressure: 0.16,
      reasonTags: ['late-night-drain', 'continuity-review'],
      why: 'keep initiative, memory, and embodiment on one rest-protective reviewed line until the host settles',
    })
    expectNoFixedTemplateResidue(digest)
  })

  it('preserves affective residue and derived-mind-state affective residue together', () => {
    const digest = normalizeAlicizationRuntimeDigest({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 33_333,
        residues: [
          {
            kind: 'afterglow',
            intensity: 0.73,
            persistence: 0.81,
            confidence: 0.88,
            polarity: 'warm',
            releaseMode: 'delay-until-open-window',
            summary: 'quiet afterglow still prefers a measured return',
            sourceSignals: ['callback-afterglow', 'same-thread'],
            lastUpdatedAt: 33_333,
          },
        ],
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.74,
        repairPressure: 0.17,
        burdenPressure: 0.08,
        trustPressure: 0.57,
        restProtectivePressure: 0.23,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          distancePosture: 'measured-room',
          companionshipDensity: 0.62,
          repairRecovery: 0.41,
          overreachRisk: 0.24,
          fatigueGuard: 0.29,
          afterglowCarry: 0.77,
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          reasonTags: ['same-thread-continuation', 'callback-afterglow'],
          summary: 'measured-return until the callback afterglow settles',
        },
        sourceSignals: ['callback-afterglow', 'quiet-carry'],
        summary: 'afterglow still favors a measured return on the callback line',
      },
      derivedMindStateBundle: {
        affectiveResidue: {
          version: 'affective-residue-memory-v1',
          updatedAt: 44_444,
          residues: [
            {
              kind: 'repair',
              intensity: 0.69,
              persistence: 0.79,
              confidence: 0.85,
              polarity: 'protective',
              releaseMode: 'delay-until-open-window',
              summary: 'repair residue still wants to keep the line quiet',
              sourceSignals: ['repair-before-closeness', 'same-thread'],
              lastUpdatedAt: 44_444,
            },
          ],
          dominantResidueKind: 'repair',
          afterglowPressure: 0.18,
          repairPressure: 0.81,
          burdenPressure: 0.13,
          trustPressure: 0.45,
          restProtectivePressure: 0.27,
          relationshipCadence: {
            cadenceMode: 'repair',
            distancePosture: 'protect-space',
            companionshipDensity: 0.46,
            repairRecovery: 0.71,
            overreachRisk: 0.37,
            fatigueGuard: 0.33,
            afterglowCarry: 0.49,
            shouldDelayWarmth: true,
            shouldProtectRest: false,
            reasonTags: ['repair-before-closeness', 'same-thread-continuation'],
            summary: 'repair cadence still needs the line to stay quiet',
          },
          sourceSignals: ['repair-before-closeness', 'quiet-carry'],
          summary: 'repair residue still holds the callback line inward',
        },
      },
      summary: 'dominant=active-memory | closure=affective-residue',
    })

    expect(digest?.affectiveResidue?.dominantResidueKind).toBe('afterglow')
    expect(digest?.affectiveResidue?.relationshipCadence.cadenceMode).toBe('measured-return')
    expect(digest?.affectiveResidue?.summary).toContain('callback line')
    expect(digest?.derivedMindStateBundle?.affectiveResidue?.dominantResidueKind).toBe('repair')
    expect(digest?.derivedMindStateBundle?.affectiveResidue?.relationshipCadence.cadenceMode).toBe('repair')
    expect(digest?.derivedMindStateBundle?.affectiveResidue?.summary).toContain('callback line inward')
    expectNoFixedTemplateResidue(digest)
  })

  it('preserves runtime project-state continuity summary and proactive gap alias', () => {
    const digest = normalizeAlicizationRuntimeDigest({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      projectState: {
        continuitySummary: 'Runtime digest ingress keeps the durable continuity summary.',
        proactiveSameHerGapSummary: 'Runtime digest ingress keeps the proactive gap alias.',
      },
      channels: [],
      summary: 'runtime project-state alias ingress',
    })

    expect(digest?.projectState).toMatchObject({
      continuitySummary: 'Runtime digest ingress keeps the durable continuity summary.',
      proactiveSameHerGap: 'Runtime digest ingress keeps the proactive gap alias.',
      proactiveSameHerGapSummary: 'Runtime digest ingress keeps the proactive gap alias.',
    })
  })

  it('keeps omitted runtime project-state fields undeclared', () => {
    const digest = normalizeAlicizationRuntimeDigest({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      projectState: {
        identity: 'Local owner record 42.',
      },
      channels: [],
      summary: 'runtime project-state sparse ingress',
    })

    expect(digest?.projectState).toMatchObject({
      identity: 'Local owner record 42.',
    })
    expect(digest?.projectState).not.toHaveProperty('primaryOpenLoop')
    expect(digest?.projectState).not.toHaveProperty('proactiveSameHerGap')
    expect(digest?.projectState).not.toHaveProperty('proactiveSameHerGapSummary')
  })

  it.each([
    ['missing', undefined],
    ['blank object', {}],
  ])('keeps %s runtime project-state owner undeclared', (_label, projectState) => {
    const digest = normalizeAlicizationRuntimeDigest({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      ...(projectState === undefined ? {} : { projectState }),
      channels: [],
      summary: 'runtime project-state owner declaration',
    })

    expect(digest?.projectState).toBeUndefined()
  })

  it('preserves an explicit runtime project-state owner clear', () => {
    const digest = normalizeAlicizationRuntimeDigest({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      projectState: null,
      channels: [],
      summary: 'runtime project-state owner clear',
    })

    expect(digest?.projectState).toBeNull()
  })

  it('keeps blank runtime project-state fields undeclared beside a valid owner field', () => {
    const digest = normalizeAlicizationRuntimeDigest({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      projectState: {
        identity: 'Local owner record 42.',
        primaryOpenLoop: '   ',
        nextClosureTarget: 'n/a',
      },
      channels: [],
      summary: 'runtime project-state blank ingress',
    })

    expect(digest?.projectState).toMatchObject({
      identity: 'Local owner record 42.',
    })
    expect(digest?.projectState).not.toHaveProperty('primaryOpenLoop')
    expect(digest?.projectState).not.toHaveProperty('nextClosureTarget')
  })

  it('preserves alias-only null without synthesizing a canonical clear', () => {
    const digest = normalizeAlicizationRuntimeDigest({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      projectState: {
        identity: 'Local owner record 42.',
        proactiveSameHerGapSummary: null,
      },
      channels: [],
      summary: 'runtime project-state alias-only clear',
    })

    expect(digest?.projectState).toMatchObject({
      identity: 'Local owner record 42.',
      proactiveSameHerGapSummary: null,
    })
    expect(digest?.projectState).not.toHaveProperty('proactiveSameHerGap')
  })

  it.each([
    [
      'canonical null',
      {
        proactiveSameHerGap: null,
        proactiveSameHerGapSummary: 'Stale alias must not restore canonical state.',
      },
      {
        proactiveSameHerGap: null,
        proactiveSameHerGapSummary: null,
      },
    ],
    [
      'alias null',
      {
        proactiveSameHerGap: 'Current canonical initiative gap.',
        proactiveSameHerGapSummary: null,
      },
      {
        proactiveSameHerGap: 'Current canonical initiative gap.',
        proactiveSameHerGapSummary: null,
      },
    ],
  ])('honors explicit %s in runtime project-state canonical/alias conflicts', (_label, projectState, expected) => {
    const digest = normalizeAlicizationRuntimeDigest({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      projectState: {
        identity: 'Local owner record 42.',
        ...projectState,
      },
      channels: [],
      summary: 'runtime project-state alias conflict',
    })

    expect(digest?.projectState).toMatchObject({
      identity: 'Local owner record 42.',
      ...expected,
    })
  })

  it('drops placeholder-filled runtime project-state shells', () => {
    const digest = normalizeAlicizationRuntimeDigest({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      projectState: {
        identity: ' none ',
        currentPhase: ' unknown ',
        preflightSummary: ' n/a ',
        preDialogueAwarenessLine: ' na ',
        latestLandedProgress: ' null ',
        memoryClosureSummary: ' none ',
        primaryOpenLoop: ' unknown ',
        nextClosureTarget: ' n/a ',
        sameHerSelfLine: ' na ',
        sameHerHoldDetail: ' null ',
        sameHerDriftRisk: ' none ',
        emotionalClosureCue: ' unknown ',
        proactiveSameHerGap: ' n/a ',
        continuityRestraint: ' null ',
        continuityArcStage: ' none ',
        continuityPreferredTiming: ' na ',
        continuityCadence: ' n/a ',
        continuityCue: ' unknown ',
        preferredBlinkCadence: ' none ',
        preferredGazeMode: ' unknown ',
      },
      continuityRestraint: ' none ',
      emotionalClosureCue: ' unknown ',
      summary: 'dominant=active-memory | project-awareness=placeholder-shell',
    })

    expect(digest?.projectState).toBeUndefined()
    expect(digest?.continuityRestraint).toBeNull()
    expect(digest?.emotionalClosureCue).toBeNull()
  })
})
