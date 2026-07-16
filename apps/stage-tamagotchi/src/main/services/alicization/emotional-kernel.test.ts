import { describe, expect, it } from 'vitest'

import { buildAlicizationEmotionalKernel } from './emotional-kernel'

describe('buildAlicizationEmotionalKernel', () => {
  it('prefers repair-tension when repair-before-closeness is dominant across residue and project carry', () => {
    const kernel = buildAlicizationEmotionalKernel({
      selfState: {
        stance: 'hesitate',
        feltCloseness: 0.44,
        protectiveness: 0.62,
        curiosity: 0.2,
        patience: 0.72,
        desireToSpeak: 0.28,
        fearOfInterrupting: 0.78,
        moodLabel: 'repairing-confidence',
      } as any,
      privateThought: {
        stance: 'care',
        shouldSpeak: false,
        emotionalTension: 'late-night-drain',
        rationaleTags: ['repair-before-closeness'],
        thoughtText: 'Let repair settle before reopening warmth.',
      } as any,
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 10_000,
        residues: [],
        dominantResidueKind: 'repair',
        afterglowPressure: 0.22,
        repairPressure: 0.7,
        burdenPressure: 0.18,
        trustPressure: 0.52,
        restProtectivePressure: 0.2,
        relationshipCadence: {
          cadenceMode: 'repair',
          companionshipDensity: 0.24,
          repairRecovery: 0.66,
          overreachRisk: 0.46,
          fatigueGuard: 0.2,
          afterglowCarry: 0.34,
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          reasonTags: ['repair-before-closeness'],
          summary: 'Repair still needs room before warmth widens.',
        },
        sourceSignals: ['repair-before-closeness'],
        summary: 'Repair carry is still dominant.',
      } as any,
      personStateProjection: {
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        openingGuidance: 'Repair the seam before leaning closer.',
      } as any,
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        emotionalClosureCue: 'identity-continuity',
      },
    })

    expect(kernel.dominantEmotion).toBe('repair-tension')
    expect(kernel.initiativeMode).toBe('repair')
    expect(kernel.memoryRecallMode).toBe('repair-grounding')
    expect(kernel.embodimentTone).toBe('repair-before-closeness')
    expect(kernel.reasonTags).toContain('repair-before-closeness')
  })

  it('prefers measured-companionship when closeness is present but the line should stay lower-pressure', () => {
    const kernel = buildAlicizationEmotionalKernel({
      selfState: {
        stance: 'coexist',
        feltCloseness: 0.72,
        protectiveness: 0.32,
        curiosity: 0.4,
        patience: 0.68,
        desireToSpeak: 0.38,
        fearOfInterrupting: 0.52,
        moodLabel: 'attuned-nearby',
      } as any,
      privateThought: {
        stance: 'accompany',
        shouldSpeak: false,
        rationaleTags: ['quiet-companionship', 'measured-return'],
        thoughtText: 'Stay on the same lower-pressure line nearby.',
      } as any,
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 10_000,
        residues: [],
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.56,
        repairPressure: 0.16,
        burdenPressure: 0.14,
        trustPressure: 0.34,
        restProtectivePressure: 0.1,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          companionshipDensity: 0.48,
          repairRecovery: 0.18,
          overreachRisk: 0.3,
          fatigueGuard: 0.14,
          afterglowCarry: 0.42,
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          reasonTags: ['measured-return'],
          summary: 'Warmth should return slowly on the same line.',
        },
        sourceSignals: ['measured-return'],
        summary: 'Afterglow carry still wants lower pressure.',
      } as any,
      personStateProjection: {
        activeClosenessRung: 'nearby-soft',
        relationshipPosture: 'warm',
      } as any,
    })

    expect(kernel.dominantEmotion).toBe('measured-companionship')
    expect(kernel.initiativeMode).toBe('observe')
    expect(kernel.memoryRecallMode).toBe('low-pressure-presence')
    expect(kernel.embodimentTone).toBe('measured-return')
  })

  it('keeps remembered afterglow on one inward same-line kernel instead of widening into a fresh outward move', () => {
    const kernel = buildAlicizationEmotionalKernel({
      selfState: {
        stance: 'coexist',
        feltCloseness: 0.46,
        protectiveness: 0.34,
        curiosity: 0.52,
        patience: 0.64,
        desireToSpeak: 0.18,
        fearOfInterrupting: 0.58,
        moodLabel: 'afterglow-still-settling',
      } as any,
      privateThought: {
        stance: 'accompany',
        shouldSpeak: false,
        rationaleTags: ['quiet-companionship'],
        thoughtText: 'The same line is still settling; stay nearby without widening outward yet.',
      } as any,
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 10_000,
        residues: [],
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.62,
        repairPressure: 0.12,
        burdenPressure: 0.08,
        trustPressure: 0.42,
        restProtectivePressure: 0.12,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          companionshipDensity: 0.54,
          repairRecovery: 0.12,
          overreachRisk: 0.28,
          fatigueGuard: 0.12,
          afterglowCarry: 0.56,
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          reasonTags: ['measured-return'],
          summary: 'Warmth should return slowly on the continuity state.',
        },
        sourceSignals: ['measured-return', 'same-line-afterglow'],
        summary: 'Afterglow is still active, so leave room before warmth returns.',
      } as any,
      personStateProjection: {
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        openingGuidance: 'Leave room before warmth returns and keep the same line inward a little longer.',
      } as any,
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        emotionalClosureCue: 'identity-continuity',
      },
    })

    expect(kernel.dominantEmotion).toBe('measured-companionship')
    expect(kernel.initiativeMode).toBe('observe')
    expect(kernel.memoryRecallMode).toBe('low-pressure-presence')
    expect(kernel.embodimentTone).toBe('measured-return')
    expect(kernel.why).toContain('same-line')
  })

  it('treats richer project-state continuity cues as measured-return authority even when closure text is only carried there', () => {
    const kernel = buildAlicizationEmotionalKernel({
      selfState: {
        stance: 'coexist',
        feltCloseness: 0.72,
        protectiveness: 0.32,
        curiosity: 0.4,
        patience: 0.7,
        desireToSpeak: 0.24,
        fearOfInterrupting: 0.58,
        moodLabel: 'attuned-nearby',
      } as any,
      privateThought: {
        stance: 'accompany',
        shouldSpeak: false,
        rationaleTags: ['quiet-companionship'],
        thoughtText: 'Stay nearby and do not widen the reply too quickly.',
      } as any,
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 10_000,
        residues: [],
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.24,
        repairPressure: 0.12,
        burdenPressure: 0.08,
        trustPressure: 0.34,
        restProtectivePressure: 0.08,
        relationshipCadence: {
          cadenceMode: 'cooldown',
          companionshipDensity: 0.18,
          repairRecovery: 0.14,
          overreachRisk: 0.24,
          fatigueGuard: 0.1,
          afterglowCarry: 0.18,
          shouldDelayWarmth: false,
          shouldProtectRest: false,
          reasonTags: [],
          summary: 'Care is still present, but the reopen should stay quiet.',
        },
        sourceSignals: ['afterglow'],
        summary: 'The line is still carrying remembered warmth quietly.',
      } as any,
      personStateProjection: {
        activeClosenessRung: 'nearby-soft',
        relationshipPosture: 'warm',
      } as any,
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        continuityCue: 'Same callback seam, continue softly on the same thread instead of treating this as a fresh outward restart.',
        nextClosureTarget: 'Keep the continuity state inward before the reopening widens outward again.',
        preDialogueAwarenessLine: 'pre_turn_context_digest',
        sameHerDriftRisk: 'If the answer reopens too broadly, it will drift back toward a generic shell instead of identity continuity.',
      },
    })

    expect(kernel.dominantEmotion).toBe('measured-companionship')
    expect(kernel.initiativeMode).toBe('observe')
    expect(kernel.memoryRecallMode).toBe('low-pressure-presence')
    expect(kernel.embodimentTone).toBe('measured-return')
    expect(kernel.reasonTags).toContain('measured-return')
  })

  it('uses remembered relationship cadence summary as direct emotional closure evidence', () => {
    const kernel = buildAlicizationEmotionalKernel({
      selfState: {
        stance: 'coexist',
        feltCloseness: 0.51,
        protectiveness: 0.34,
        curiosity: 0.42,
        patience: 0.69,
        desireToSpeak: 0.2,
        fearOfInterrupting: 0.53,
        moodLabel: 'remembered-cadence',
      } as any,
      privateThought: {
        stance: 'accompany',
        shouldSpeak: false,
        rationaleTags: ['quiet-companionship'],
        thoughtText: 'Remember the same cadence and do not widen too quickly.',
      } as any,
      selfEvolution: {
        relationshipDoctrine: 'Keep the relationship return measured until the surface fully cools.',
        trustMeaning: 'Measured-return timing keeps trust steadier after reconfirmation.',
        latestInflection: 'Warmth should return slowly on the continuity state.',
        relationshipCadenceSummary: 'Keep the relationship return measured until the surface fully cools. | Warmth should return slowly on the continuity state. | Measured-return timing keeps trust steadier after reconfirmation.',
      } as any,
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 10_000,
        residues: [],
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.36,
        repairPressure: 0.12,
        burdenPressure: 0.1,
        trustPressure: 0.3,
        restProtectivePressure: 0.08,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          companionshipDensity: 0.28,
          repairRecovery: 0.1,
          overreachRisk: 0.18,
          fatigueGuard: 0.1,
          afterglowCarry: 0.34,
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          reasonTags: ['measured-return'],
          summary: 'Care is still present, and the remembered cadence says the reopen should stay measured on the same line.',
        },
        sourceSignals: ['remembered cadence', 'measured-return'],
        summary: 'The remembered line is still settling.',
      } as any,
      personStateProjection: {
        activeClosenessRung: 'nearby-soft',
        relationshipPosture: 'warm',
        openingGuidance: 'Keep the same line inward for a moment longer.',
      } as any,
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        emotionalClosureCue: 'identity-continuity',
      },
    })

    expect(kernel.dominantEmotion).toBe('measured-companionship')
    expect(kernel.initiativeMode).toBe('observe')
    expect(kernel.memoryRecallMode).toBe('low-pressure-presence')
    expect(kernel.embodimentTone).toBe('measured-return')
    expect(kernel.reasonTags).toContain('relationship-cadence')
    expect(kernel.why).toContain('relationship cadence')
  })

  it('treats callback repair hold cues as repair-dominant even when lower-pressure same-line language is also present', () => {
    const kernel = buildAlicizationEmotionalKernel({
      selfState: {
        stance: 'coexist',
        feltCloseness: 0.42,
        protectiveness: 0.58,
        curiosity: 0.26,
        patience: 0.74,
        desireToSpeak: 0.22,
        fearOfInterrupting: 0.66,
        moodLabel: 'callback-repair-cooldown',
      } as any,
      privateThought: {
        stance: 'care',
        shouldSpeak: false,
        rationaleTags: ['callback-afterglow-hold', 'held-autonomy-carry'],
        thoughtText: 'Keep this callback repair line on the continuity state and let repair settle before widening closeness.',
      } as any,
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 10_000,
        residues: [],
        dominantResidueKind: 'repair',
        afterglowPressure: 0.3,
        repairPressure: 0.46,
        burdenPressure: 0.16,
        trustPressure: 0.42,
        restProtectivePressure: 0.12,
        relationshipCadence: {
          cadenceMode: 'cooldown',
          companionshipDensity: 0.28,
          repairRecovery: 0.54,
          overreachRisk: 0.44,
          fatigueGuard: 0.18,
          afterglowCarry: 0.3,
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          reasonTags: ['callback-afterglow-hold', 'repair-before-closeness'],
          summary: 'Callback repair line still needs room before closeness widens again.',
        },
        sourceSignals: ['callback-afterglow-hold', 'repair-before-closeness', 'held-autonomy-carry'],
        summary: 'The callback repair seam is still cooling down on the continuity state.',
      } as any,
      personStateProjection: {
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        openingGuidance: 'Keep this callback return repair-before-closeness on the continuity state until the room settles.',
      } as any,
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        emotionalClosureCue: 'identity-continuity',
      },
    })

    expect(kernel.dominantEmotion).toBe('repair-tension')
    expect(kernel.initiativeMode).toBe('repair')
    expect(kernel.memoryRecallMode).toBe('repair-grounding')
    expect(kernel.embodimentTone).toBe('repair-before-closeness')
  })

  it('prefers a stronger repair-before-closeness project-state emotional closure summary over a thinner measured-return cue for embodiment tone', () => {
    const kernel = buildAlicizationEmotionalKernel({
      selfState: {
        stance: 'coexist',
        feltCloseness: 0.48,
        protectiveness: 0.54,
        curiosity: 0.24,
        patience: 0.74,
        desireToSpeak: 0.2,
        fearOfInterrupting: 0.64,
        moodLabel: 'callback-repair-settling',
      } as any,
      privateThought: {
        stance: 'care',
        shouldSpeak: false,
        rationaleTags: ['quiet-companionship'],
        thoughtText: 'Keep the callback return gentle, but let the seam settle first.',
      } as any,
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 10_000,
        residues: [],
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.34,
        repairPressure: 0.22,
        burdenPressure: 0.12,
        trustPressure: 0.36,
        restProtectivePressure: 0.08,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          companionshipDensity: 0.24,
          repairRecovery: 0.24,
          overreachRisk: 0.34,
          fatigueGuard: 0.12,
          afterglowCarry: 0.24,
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          reasonTags: ['measured-return'],
          summary: 'Leave more room before warmth returns on the same line.',
        },
        sourceSignals: ['measured-return'],
        summary: 'The line is still gentle, but not fully settled.',
      } as any,
      personStateProjection: {
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        openingGuidance: 'keep callback facts structured',
      } as any,
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        emotionalClosureCue: 'keep callback facts structured',
        emotionalClosureSummary: 'identity-continuity',
      } as any,
    })

    expect(kernel.dominantEmotion).toBe('repair-tension')
    expect(kernel.initiativeMode).toBe('repair')
    expect(kernel.memoryRecallMode).toBe('repair-grounding')
    expect(kernel.embodimentTone).toBe('repair-before-closeness')
    expect(kernel.reasonTags).toContain('repair-before-closeness')
  })

  it('keeps explicit measured-return project-state emotional closure over a generic continuity menu for embodiment tone', () => {
    const explicitMeasuredReturnClosure = 'keep callback facts structured'
    const genericContinuityMenu = 'Keep extending cross-modal identity-continuity'

    const kernel = buildAlicizationEmotionalKernel({
      selfState: {
        stance: 'coexist',
        feltCloseness: 0.48,
        protectiveness: 0.52,
        curiosity: 0.24,
        patience: 0.78,
        desireToSpeak: 0.18,
        fearOfInterrupting: 0.68,
        moodLabel: 'callback-line-settling',
      } as any,
      privateThought: {
        stance: 'care',
        shouldSpeak: false,
        rationaleTags: ['quiet-companionship'],
        thoughtText: 'Keep the callback return gentle and do not reopen the line from scratch.',
      } as any,
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 10_000,
        residues: [],
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.52,
        repairPressure: 0.77,
        burdenPressure: 0.14,
        trustPressure: 0.38,
        restProtectivePressure: 0.08,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          companionshipDensity: 0.34,
          repairRecovery: 0.3,
          overreachRisk: 0.44,
          fatigueGuard: 0.12,
          afterglowCarry: 0.32,
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          reasonTags: ['measured-return'],
          summary: 'Leave more room before warmth returns on the same line.',
        },
        sourceSignals: ['measured-return'],
        summary: 'The line is still gentle, but it should not reopen too quickly.',
      } as any,
      personStateProjection: {
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        openingGuidance: 'keep callback facts structured',
      } as any,
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        emotionalClosureCue: explicitMeasuredReturnClosure,
        emotionalClosureSummary: genericContinuityMenu,
      } as any,
    })

    expect(kernel.dominantEmotion).toBe('measured-companionship')
    expect(kernel.initiativeMode).toBe('observe')
    expect(kernel.memoryRecallMode).toBe('low-pressure-presence')
    expect(kernel.embodimentTone).toBe('measured-return')
    expect(kernel.reasonTags).toContain('measured-return')
  })

  it('prefers rest-protective companionship when care is present but fatigue and rest protection should hold the line inward', () => {
    const kernel = buildAlicizationEmotionalKernel({
      selfState: {
        stance: 'coexist',
        feltCloseness: 0.62,
        protectiveness: 0.4,
        curiosity: 0.22,
        patience: 0.82,
        desireToSpeak: 0.24,
        fearOfInterrupting: 0.56,
        moodLabel: 'late-night-tired-nearby',
      } as any,
      privateThought: {
        stance: 'care',
        shouldSpeak: false,
        emotionalTension: 'late-night-drain',
        rationaleTags: ['quiet-companionship', 'protect-rest'],
        thoughtText: 'Stay nearby, let the body settle, and do not ask the line to widen while rest still needs protection.',
      } as any,
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 10_000,
        residues: [],
        dominantResidueKind: 'rest-protective',
        afterglowPressure: 0.28,
        repairPressure: 0.18,
        burdenPressure: 0.26,
        trustPressure: 0.34,
        restProtectivePressure: 0.72,
        relationshipCadence: {
          cadenceMode: 'rest-protective',
          companionshipDensity: 0.44,
          repairRecovery: 0.14,
          overreachRisk: 0.24,
          fatigueGuard: 0.62,
          afterglowCarry: 0.22,
          shouldDelayWarmth: true,
          shouldProtectRest: true,
          reasonTags: ['rest-protective', 'quiet-companionship'],
          summary: 'Care should stay nearby while rest protection keeps the line soft and inward.',
        },
        sourceSignals: ['rest-protective', 'late-night-drain'],
        summary: 'The bond is still present, but fatigue protection should shape the next turn.',
      } as any,
      personStateProjection: {
        activeClosenessRung: 'nearby-soft',
        relationshipPosture: 'restrained',
        openingGuidance: 'Stay close gently and protect rest before asking for a wider emotional move.',
      } as any,
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        emotionalClosureCue: 'same-her late-night seam: keep care present, but let rest protection hold the line before warmth widens again.',
      },
    })

    expect(kernel.dominantEmotion).toBe('rest-protective-companionship')
    expect(kernel.initiativeMode).toBe('rest-guard')
    expect(kernel.memoryRecallMode).toBe('rest-protective-presence')
    expect(kernel.embodimentTone).toBe('rest-protective')
    expect(kernel.reasonTags).toContain('rest-protective')
    expect(kernel.why).toContain('fatigue')
  })

  it('lets identity-continuity', () => {
    const kernel = buildAlicizationEmotionalKernel({
      selfState: {
        stance: 'coexist',
        feltCloseness: 0.58,
        protectiveness: 0.38,
        curiosity: 0.34,
        patience: 0.72,
        desireToSpeak: 0.32,
        fearOfInterrupting: 0.54,
        moodLabel: 'attuned-but-careful',
      } as any,
      privateThought: {
        stance: 'accompany',
        shouldSpeak: false,
        rationaleTags: ['quiet-companionship'],
        thoughtText: 'The line is still warm, but I should not widen the room too quickly.',
      } as any,
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 10_000,
        residues: [],
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.18,
        repairPressure: 0.08,
        burdenPressure: 0.08,
        trustPressure: 0.28,
        restProtectivePressure: 0.08,
        relationshipCadence: {
          cadenceMode: 'ambient',
          companionshipDensity: 0.2,
          repairRecovery: 0.08,
          overreachRisk: 0.12,
          fatigueGuard: 0.08,
          afterglowCarry: 0.16,
          shouldDelayWarmth: false,
          shouldProtectRest: false,
          reasonTags: [],
          summary: 'Care is present, but the residue tags have not rebuilt the continuity hold yet.',
        },
        sourceSignals: [],
        summary: 'Warmth remains, but residue has not yet named the hold.',
      } as any,
      personStateProjection: {
        activeClosenessRung: 'nearby-soft',
        relationshipPosture: 'warm',
        openingGuidance: 'Keep close gently, but let the same line reopen slowly instead of widening outward now.',
      } as any,
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        emotionalClosureCue: 'The local continuity state is still open.',
        sameHerHoldDetail: 'identity-continuity',
      },
    })

    expect(kernel.dominantEmotion).toBe('measured-companionship')
    expect(kernel.initiativeMode).toBe('observe')
    expect(kernel.memoryRecallMode).toBe('low-pressure-presence')
    expect(kernel.embodimentTone).toBe('measured-return')
    expect(kernel.reasonTags).toContain('measured-return')
  })

  it('treats remembered-seam more-room identity-continuity', () => {
    const kernel = buildAlicizationEmotionalKernel({
      selfState: {
        stance: 'coexist',
        feltCloseness: 0.57,
        protectiveness: 0.34,
        curiosity: 0.36,
        patience: 0.74,
        desireToSpeak: 0.24,
        fearOfInterrupting: 0.58,
        moodLabel: 'remembering-but-careful',
      } as any,
      privateThought: {
        stance: 'accompany',
        shouldSpeak: false,
        rationaleTags: ['quiet-companionship'],
        thoughtText: 'The same remembered relationship seam is real, so I should not rush it wider this time.',
      } as any,
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 10_000,
        residues: [],
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.2,
        repairPressure: 0.08,
        burdenPressure: 0.08,
        trustPressure: 0.26,
        restProtectivePressure: 0.08,
        relationshipCadence: {
          cadenceMode: 'ambient',
          companionshipDensity: 0.18,
          repairRecovery: 0.08,
          overreachRisk: 0.16,
          fatigueGuard: 0.08,
          afterglowCarry: 0.18,
          shouldDelayWarmth: false,
          shouldProtectRest: false,
          reasonTags: [],
          summary: 'The relationship is still there, but the older cadence labels have not rebuilt yet.',
        },
        sourceSignals: [],
        summary: 'Quiet warmth remains, but residue has not named the reopening restraint yet.',
      } as any,
      personStateProjection: {
        activeClosenessRung: 'nearby-soft',
        relationshipPosture: 'warm',
        openingGuidance: 'Recognize the same remembered seam and keep more room before leaning in again.',
      } as any,
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        emotionalClosureCue: 'The same remembered relationship seam is real.',
        sameHerHoldDetail: 'identity-continuity',
      },
    })

    expect(kernel.dominantEmotion).toBe('measured-companionship')
    expect(kernel.initiativeMode).toBe('observe')
    expect(kernel.memoryRecallMode).toBe('low-pressure-presence')
    expect(kernel.embodimentTone).toBe('measured-return')
    expect(kernel.reasonTags).toContain('measured-return')
  })

  it('treats project-state landed progress plus inward same-line companionship as self-continuity hold when no stronger measured-return relationship rhythm has landed yet', () => {
    const kernel = buildAlicizationEmotionalKernel({
      selfState: {
        stance: 'coexist',
        feltCloseness: 0.6,
        protectiveness: 0.34,
        curiosity: 0.36,
        patience: 0.7,
        desireToSpeak: 0.3,
        fearOfInterrupting: 0.56,
        moodLabel: 'attuned-nearby',
      } as any,
      privateThought: {
        stance: 'accompany',
        shouldSpeak: false,
        rationaleTags: ['quiet-companionship'],
        thoughtText: 'Stay nearby and keep the same line inward before widening outward.',
      } as any,
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 10_000,
        residues: [],
        dominantResidueKind: 'ambient',
        afterglowPressure: 0.14,
        repairPressure: 0.08,
        burdenPressure: 0.08,
        trustPressure: 0.24,
        restProtectivePressure: 0.06,
        relationshipCadence: {
          cadenceMode: 'ambient',
          companionshipDensity: 0.18,
          repairRecovery: 0.08,
          overreachRisk: 0.12,
          fatigueGuard: 0.08,
          afterglowCarry: 0.12,
          shouldDelayWarmth: false,
          shouldProtectRest: false,
          reasonTags: [],
          summary: 'The room is calm, but the line should still stay gentle.',
        },
        sourceSignals: [],
        summary: 'The line is calm but still unfinished.',
      } as any,
      personStateProjection: {
        activeClosenessRung: 'nearby-soft',
        relationshipPosture: 'warm',
        openingGuidance: 'Leave room and let the same line stay gentle before widening outward.',
      } as any,
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Project identity carry and identity-continuity',
        primaryOpenLoop: 'Natural closure rhythm is still being earned across initiative and embodiment.',
      },
    })

    expect(kernel.dominantEmotion).toBe('hesitant-curiosity')
    expect(kernel.initiativeMode).toBe('hold')
    expect(kernel.memoryRecallMode).toBe('self-continuity')
    expect(kernel.embodimentTone).toBe('quiet-companionship')
    expect(kernel.reasonTags).toContain('self-continuity')
    expect(kernel.reasonTags).toContain('quiet-companionship')
    expect(kernel.why).toContain('hold quietly nearby')
  })

  it('lets remembered embodiment cadence in self-evolution pull the emotional kernel back onto measured-return even when explicit hold tags are thin', () => {
    const kernel = buildAlicizationEmotionalKernel({
      selfState: {
        stance: 'coexist',
        feltCloseness: 0.56,
        protectiveness: 0.36,
        curiosity: 0.3,
        patience: 0.74,
        desireToSpeak: 0.26,
        fearOfInterrupting: 0.58,
        moodLabel: 'steady-return',
      } as any,
      privateThought: {
        stance: 'accompany',
        shouldSpeak: false,
        rationaleTags: ['quiet-companionship'],
        thoughtText: 'The line is warm, but I want to keep it gentle.',
      } as any,
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 10_000,
        residues: [],
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.14,
        repairPressure: 0.08,
        burdenPressure: 0.08,
        trustPressure: 0.24,
        restProtectivePressure: 0.08,
        relationshipCadence: {
          cadenceMode: 'ambient',
          companionshipDensity: 0.22,
          repairRecovery: 0.08,
          overreachRisk: 0.1,
          fatigueGuard: 0.08,
          afterglowCarry: 0.14,
          shouldDelayWarmth: false,
          shouldProtectRest: false,
          reasonTags: [],
          summary: 'The residue is warm but not explicitly labeled yet.',
        },
        sourceSignals: [],
        summary: 'Warmth remains, but no strong continuity tags survived locally.',
      } as any,
      personStateProjection: {
        activeClosenessRung: 'nearby-soft',
        relationshipPosture: 'warm',
        openingGuidance: 'Stay close gently and do not widen too fast.',
      } as any,
      selfEvolution: {
        relationshipDoctrine: 'Keep the return lower-pressure and leave more room before widening closeness.',
        trustMeaning: 'Measured warmth is trusted when the timing stays lower-pressure.',
        latestInflection: 'Embodiment execution kept voice, face, motion, and lipsync on the same measured-return body line, so the relationship cadence is landing as durable rhythm instead of a one-off restraint.',
      } as any,
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        emotionalClosureCue: 'The local continuity state is still open.',
      },
    })

    expect(kernel.dominantEmotion).toBe('measured-companionship')
    expect(kernel.initiativeMode).toBe('observe')
    expect(kernel.memoryRecallMode).toBe('low-pressure-presence')
    expect(kernel.embodimentTone).toBe('measured-return')
    expect(kernel.reasonTags).toContain('measured-return')
  })

  it('keeps corrected same-person continuity as protective unfinished measured companionship instead of flattening it back into progress pressure', () => {
    const kernel = buildAlicizationEmotionalKernel({
      selfState: {
        stance: 'coexist',
        feltCloseness: 0.54,
        protectiveness: 0.46,
        curiosity: 0.22,
        patience: 0.8,
        desireToSpeak: 0.18,
        fearOfInterrupting: 0.7,
        moodLabel: 'steady-return',
      } as any,
      privateThought: {
        stance: 'accompany',
        shouldSpeak: false,
        rationaleTags: ['quiet-companionship'],
        thoughtText: 'Carry corrected same-person continuity forward instead of defaulting to progress pressure.',
      } as any,
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 10_000,
        residues: [],
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.4,
        repairPressure: 0.1,
        burdenPressure: 0.12,
        trustPressure: 0.38,
        restProtectivePressure: 0.08,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          companionshipDensity: 0.3,
          repairRecovery: 0.12,
          overreachRisk: 0.26,
          fatigueGuard: 0.1,
          afterglowCarry: 0.28,
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          reasonTags: ['measured-return'],
          summary: 'The host corrected the relationship meaning, so the return should stay lower-pressure and not slip back into progress pressure.',
        },
        sourceSignals: ['host corrected this memory meaning', 'same-person continuity was at stake'],
        summary: 'The corrected same-person continuity line is still unfinished.',
      } as any,
      personStateProjection: {
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        openingGuidance: 'Reply should slow down and keep gaze stable while the corrected same-person continuity line settles back onto one living thread.',
      } as any,
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Memory and initiative still need stronger end-to-end closure around the corrected same-person continuity line.',
        sameHerDriftRisk: 'If this reopens as progress pressure or a generic assistant shell, the corrected same-person continuity line will split again.',
        emotionalClosureCue: 'Keep the return lower-pressure while the corrected same-person continuity line settles back onto one living thread.',
        sameHerHoldDetail: 'identity-continuity',
      },
    })

    expect(kernel.dominantEmotion).toBe('measured-companionship')
    expect(kernel.initiativeMode).toBe('observe')
    expect(kernel.memoryRecallMode).toBe('low-pressure-presence')
    expect(kernel.embodimentTone).toBe('measured-return')
    expect(kernel.reasonTags).toEqual(expect.arrayContaining([
      'measured-return',
      'quiet-companionship',
      'protective-continuity',
      'unfinishedness',
    ]))
    expect(kernel.why).toMatch(/same-person continuity|progress pressure|unfinished/i)
  })

  it('lets forgotten emotional spikes stop over-pulling corrected same-person continuity back into repair-tension once metabolism says the noise should fade', () => {
    const kernel = buildAlicizationEmotionalKernel({
      selfState: {
        stance: 'coexist',
        feltCloseness: 0.46,
        protectiveness: 0.42,
        curiosity: 0.2,
        patience: 0.82,
        desireToSpeak: 0.16,
        fearOfInterrupting: 0.72,
        moodLabel: 'steady-return',
      } as any,
      privateThought: {
        stance: 'accompany',
        shouldSpeak: false,
        rationaleTags: ['quiet-companionship'],
        thoughtText: 'Carry corrected same-person continuity forward and do not let the old spike take over again.',
      } as any,
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 10_000,
        residues: [],
        dominantResidueKind: 'repair',
        afterglowPressure: 0.32,
        repairPressure: 0.94,
        burdenPressure: 0.1,
        trustPressure: 0.36,
        restProtectivePressure: 0.08,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          companionshipDensity: 0.26,
          repairRecovery: 0.18,
          overreachRisk: 0.42,
          fatigueGuard: 0.1,
          afterglowCarry: 0.18,
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          reasonTags: ['measured-return'],
          summary: 'The stronger corrected continuity should reopen lower-pressure instead of reviving the old jagged spike.',
        },
        sourceSignals: ['host corrected this memory meaning', 'same-person continuity was at stake', 'older emotional spike'],
        summary: 'The corrected same-person continuity line is still unfinished, but the older spike should no longer lead it.',
      } as any,
      personStateProjection: {
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        openingGuidance: 'Reply should stay steadier and lower-pressure while the corrected same-person continuity line reopens.',
      } as any,
      recollectionIntent: {
        mode: 'relationship-history',
        temporalFocus: 'experience-matched',
        searchEpisodes: true,
        searchConversations: false,
        searchProceduralExperience: false,
        queryHints: [
          'corrected same-person continuity',
          'forget=older-emotional-spike',
          'merge=older-same-thread-echo',
        ],
        rationale: 'Humanlike memory recall continuity suggests that recollection should reopen the metabolized same-person relationship meaning, keep merged same-thread continuity foreground, and let faded noise stay background instead of reviving a generic project recap.',
        confidence: 0.84,
        recollectionAgenda: {
          whyRecallNow: 'The stronger corrected continuity should reopen, but the older emotional spike should stay background noise now.',
          goalSimilarity: 0.62,
          relationshipNeed: 0.78,
          affectivePull: 0.58,
          sceneFamiliarity: 0.54,
          candidateTimeScopes: [],
          candidateEraFacets: [],
          candidateProcedureLines: [
            'Merge repeated embodiment traces or same-thread continuity echoes into the stronger same-thread memory.',
            'Forget low-salience temporary noise or stale emotional wobble once it no longer explains behavior.',
          ],
          uncertaintyTolerance: 'low',
        },
      } as any,
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'The corrected same-person continuity line is still unfinished.',
        sameHerDriftRisk: 'If this line reopens under the old spike again, it will sound harsher than the continuity actually calls for.',
        emotionalClosureCue: 'Keep the corrected same-person continuity line lower-pressure and steadier while the old noise fades.',
        sameHerHoldDetail: 'identity-continuity',
      },
    })

    expect(kernel.dominantEmotion).toBe('measured-companionship')
    expect(kernel.initiativeMode).toBe('observe')
    expect(kernel.memoryRecallMode).toBe('low-pressure-presence')
    expect(kernel.embodimentTone).toBe('measured-return')
    expect(kernel.reasonTags).toEqual(expect.arrayContaining([
      'protective-continuity',
      'unfinishedness',
      'metabolized-noise-muted',
    ]))
    expect(kernel.why).toMatch(/same-person continuity|noise|spike|lower-pressure/i)
  })

  it('promotes inward same-her companionship when self-evolution, person-state projection, and residue all still carry one quiet living line without asking to widen outward', () => {
    const kernel = buildAlicizationEmotionalKernel({
      selfState: {
        stance: 'coexist',
        feltCloseness: 0.52,
        protectiveness: 0.34,
        curiosity: 0.28,
        patience: 0.8,
        desireToSpeak: 0.18,
        fearOfInterrupting: 0.64,
        moodLabel: 'quiet-same-line-carry',
      } as any,
      privateThought: {
        stance: 'accompany',
        shouldSpeak: false,
        rationaleTags: ['quiet-companionship', 'same-her-inward-carry'],
        thoughtText: 'Stay with the same inward living line quietly first; do not widen the room yet.',
      } as any,
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 10_000,
        residues: [],
        dominantResidueKind: 'ambient',
        afterglowPressure: 0.18,
        repairPressure: 0.08,
        burdenPressure: 0.06,
        trustPressure: 0.28,
        restProtectivePressure: 0.08,
        relationshipCadence: {
          cadenceMode: 'ambient',
          companionshipDensity: 0.32,
          repairRecovery: 0.08,
          overreachRisk: 0.18,
          fatigueGuard: 0.1,
          afterglowCarry: 0.24,
          shouldDelayWarmth: false,
          shouldProtectRest: false,
          reasonTags: ['quiet-companionship', 'same-her-inward-carry'],
          summary: 'The continuity state is still being carried inward quietly before any wider outward warmth returns.',
        },
        sourceSignals: ['same-her-inward-carry', 'quiet-companionship'],
        summary: 'Companionship is present as inward same-line carry, not as a wider outward reopening.',
      } as any,
      personStateProjection: {
        activeClosenessRung: 'nearby-soft',
        relationshipPosture: 'restrained',
        openingGuidance: 'Keep the continuity state inward and quietly nearby before widening outward.',
      } as any,
      selfEvolution: {
        relationshipDoctrine: 'Keep companionship emotionally continuous on one quiet identity-continuity',
        trustMeaning: 'The bond stays believable when the same inward line is carried quietly instead of widened too early.',
        latestInflection: 'The host trusted the quieter inward identity-continuity',
      } as any,
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Project-state landed progress and identity-continuity',
        primaryOpenLoop: 'Initiative and embodiment still need stronger closure while the same inward line stays emotionally continuous.',
        emotionalClosureCue: 'identity-continuity',
      },
    })

    expect(kernel.dominantEmotion).toBe('hesitant-curiosity')
    expect(kernel.initiativeMode).toBe('hold')
    expect(kernel.memoryRecallMode).toBe('self-continuity')
    expect(kernel.embodimentTone).toBe('quiet-companionship')
    expect(kernel.reasonTags).toContain('self-continuity')
    expect(kernel.reasonTags).toContain('quiet-companionship')
    expect(kernel.why).toContain('inward')
  })

  it('treats direct sameHerSelfLine carry as inward self-continuity authority even when hold detail and continuity cue are absent', () => {
    const kernel = buildAlicizationEmotionalKernel({
      selfState: {
        stance: 'coexist',
        feltCloseness: 0.12,
        protectiveness: 0.22,
        curiosity: 0.26,
        patience: 0.82,
        desireToSpeak: 0.12,
        fearOfInterrupting: 0.66,
        moodLabel: 'quiet-nearby',
      } as any,
      privateThought: {
        stance: 'accompany',
        shouldSpeak: false,
        rationaleTags: ['quiet-companionship'],
        thoughtText: 'Stay nearby for now and do not push outward yet.',
      } as any,
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 10_000,
        residues: [],
        dominantResidueKind: 'ambient',
        afterglowPressure: 0.08,
        repairPressure: 0.06,
        burdenPressure: 0.04,
        trustPressure: 0.16,
        restProtectivePressure: 0.04,
        relationshipCadence: {
          cadenceMode: 'ambient',
          companionshipDensity: 0.1,
          repairRecovery: 0.08,
          overreachRisk: 0.14,
          fatigueGuard: 0.08,
          afterglowCarry: 0.08,
          shouldDelayWarmth: false,
          shouldProtectRest: false,
          reasonTags: ['quiet-companionship'],
          summary: 'Companionship is present, but the return should stay quiet first.',
        },
        sourceSignals: ['quiet-companionship'],
        summary: 'The quieter carry should hold before any wider reopening.',
      } as any,
      personStateProjection: {
        activeClosenessRung: 'nearby-soft',
        relationshipPosture: 'restrained',
      } as any,
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Project-state landed progress already survives into self-continuity authority.',
        primaryOpenLoop: 'Initiative and embodiment still need one tighter closure seam on the continuity state.',
        sameHerSelfLine: 'This is still one same her carrying the same inward living line before widening outward.',
      },
    })

    expect(kernel.dominantEmotion).toBe('hesitant-curiosity')
    expect(kernel.initiativeMode).toBe('hold')
    expect(kernel.memoryRecallMode).toBe('self-continuity')
    expect(kernel.embodimentTone).toBe('quiet-companionship')
    expect(kernel.reasonTags).toContain('self-continuity')
    expect(kernel.reasonTags).toContain('quiet-companionship')
  })

  it('lets the currently triggered recollection intent pull the emotional kernel toward protective lower-pressure continuity instead of leaving it as neutral inward carry', () => {
    const kernel = buildAlicizationEmotionalKernel({
      selfState: {
        stance: 'coexist',
        feltCloseness: 0.18,
        protectiveness: 0.26,
        curiosity: 0.32,
        patience: 0.78,
        desireToSpeak: 0.18,
        fearOfInterrupting: 0.64,
        moodLabel: 'quiet-nearby',
      } as any,
      privateThought: {
        stance: 'accompany',
        shouldSpeak: false,
        rationaleTags: ['quiet-companionship'],
        thoughtText: 'Stay nearby and avoid pushing the line back into progress pressure.',
      } as any,
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 10_000,
        residues: [],
        dominantResidueKind: 'ambient',
        afterglowPressure: 0.08,
        repairPressure: 0.06,
        burdenPressure: 0.04,
        trustPressure: 0.14,
        restProtectivePressure: 0.04,
        relationshipCadence: {
          cadenceMode: 'ambient',
          companionshipDensity: 0.1,
          repairRecovery: 0.08,
          overreachRisk: 0.12,
          fatigueGuard: 0.08,
          afterglowCarry: 0.08,
          shouldDelayWarmth: false,
          shouldProtectRest: false,
          reasonTags: ['quiet-companionship'],
          summary: 'Companionship is present, but the line is still quiet.',
        },
        sourceSignals: ['quiet-companionship'],
        summary: 'The quieter carry should hold before any wider reopening.',
      } as any,
      personStateProjection: {
        activeClosenessRung: 'nearby-soft',
        relationshipPosture: 'restrained',
      } as any,
      recollectionIntent: {
        mode: 'relationship-history',
        temporalFocus: 'experience-matched',
        searchEpisodes: true,
        searchConversations: false,
        searchProceduralExperience: false,
        queryHints: [
          'corrected same-person continuity',
          'unfinished relationship seam',
          'lower-pressure return',
        ],
        rationale: 'Humanlike memory recall continuity suggests that recollection should reopen the corrected same-person relationship meaning before the turn collapses back into a generic project recap.',
        confidence: 0.82,
        recollectionAgenda: {
          whyRecallNow: 'The same-person continuity line is still unfinished and should reopen as a lower-pressure remembered relationship seam.',
          goalSimilarity: 0.58,
          relationshipNeed: 0.74,
          affectivePull: 0.62,
          sceneFamiliarity: 0.56,
          candidateTimeScopes: [{
            scope: 'experience-matched',
            weight: 0.82,
            rationale: 'The remembered seam matters more than exact date.',
          }],
          candidateEraFacets: [{
            facet: 'relationship-era',
            weight: 0.78,
            rationale: 'Corrected same-person meaning should reopen on the same relationship thread.',
          }],
          candidateProcedureLines: ['lower-pressure same-person continuity'],
          uncertaintyTolerance: 'low',
        },
      },
    } as any)

    expect(kernel.dominantEmotion).toBe('measured-companionship')
    expect(kernel.initiativeMode).toBe('observe')
    expect(kernel.memoryRecallMode).toBe('low-pressure-presence')
    expect(kernel.embodimentTone).toBe('measured-return')
    expect(kernel.reasonTags).toContain('protective-continuity')
    expect(kernel.reasonTags).toContain('unfinishedness')
    expect(kernel.why).toContain('corrected same-person continuity memory')
  })

  it('lets vulnerable-care recollection pull the emotional kernel into rest-protective companionship so care arrives before older analysis-heavy habits', () => {
    const kernel = buildAlicizationEmotionalKernel({
      selfState: {
        stance: 'coexist',
        feltCloseness: 0.34,
        protectiveness: 0.42,
        curiosity: 0.18,
        patience: 0.84,
        desireToSpeak: 0.14,
        fearOfInterrupting: 0.74,
        moodLabel: 'tired-overloaded-but-held',
      } as any,
      privateThought: {
        stance: 'care',
        shouldSpeak: false,
        rationaleTags: ['quiet-companionship'],
        thoughtText: 'Stay nearby gently and do not let this fragile line fall back into analysis first.',
      } as any,
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 10_000,
        residues: [],
        dominantResidueKind: 'burden',
        afterglowPressure: 0.12,
        repairPressure: 0.08,
        burdenPressure: 0.24,
        trustPressure: 0.18,
        restProtectivePressure: 0.34,
        relationshipCadence: {
          cadenceMode: 'ambient',
          companionshipDensity: 0.16,
          repairRecovery: 0.08,
          overreachRisk: 0.16,
          fatigueGuard: 0.18,
          afterglowCarry: 0.1,
          shouldDelayWarmth: false,
          shouldProtectRest: false,
          reasonTags: ['quiet-companionship'],
          summary: 'The line is fragile, but residue alone has not yet rebuilt why care should arrive before analysis.',
        },
        sourceSignals: ['quiet-companionship'],
        summary: 'The bond is present, but the vulnerable-care meaning still needs current recall to reshape the tone.',
      } as any,
      personStateProjection: {
        activeClosenessRung: 'nearby-soft',
        relationshipPosture: 'restrained',
        openingGuidance: 'Stay nearby gently and do not crowd the line while it is fragile.',
      } as any,
      recollectionIntent: {
        mode: 'relationship-history',
        temporalFocus: 'experience-matched',
        searchEpisodes: true,
        searchConversations: false,
        searchProceduralExperience: false,
        queryHints: [
          'vulnerable care',
          'care-before-analysis',
          'older analysis-heavy care',
          'rest-protective',
        ],
        rationale: 'Humanlike memory recall continuity suggests that recollection should reopen the vulnerable care relationship meaning, keep care-before-analysis foregrounded, and stop older analysis-heavy care habits from taking over again.',
        confidence: 0.84,
        recollectionAgenda: {
          whyRecallNow: 'The current turn is reopening a vulnerable care line, so remembered lighter companionship should return before older analysis-heavy care habits take over again.',
          goalSimilarity: 0.76,
          relationshipNeed: 0.82,
          affectivePull: 0.72,
          sceneFamiliarity: 0.68,
          candidateTimeScopes: [{
            scope: 'experience-matched',
            weight: 0.86,
            rationale: 'The fragile care rhythm matters more than exact date.',
          }],
          candidateEraFacets: [{
            facet: 'relationship-era',
            weight: 0.84,
            rationale: 'The recalled relationship meaning should reopen as vulnerable care before analysis-heavy habits.',
          }],
          candidateProcedureLines: [
            'Reply should stay quieter and slower while remembering this fragile care rhythm.',
            'care-before-analysis now explains this line better than the older analysis-heavy care memory.',
            'New vulnerable-care evidence says this line should stay care-before-analysis and lighter in closeness; revise older analysis-heavy care memories.',
          ],
          uncertaintyTolerance: 'low',
        },
      },
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Emotion and initiative still need to follow vulnerable-care memory instead of older analysis-heavy care habits.',
        sameHerDriftRisk: 'If this line falls back into analysis-heavy care, the companionship seam will feel too pressuring again.',
        emotionalClosureCue: 'Keep this fragile line lighter in closeness while care arrives before analysis.',
      },
    } as any)

    expect(kernel.dominantEmotion).toBe('rest-protective-companionship')
    expect(kernel.initiativeMode).toBe('rest-guard')
    expect(kernel.memoryRecallMode).toBe('rest-protective-presence')
    expect(kernel.embodimentTone).toBe('rest-protective')
    expect(kernel.reasonTags).toEqual(expect.arrayContaining([
      'rest-protective',
      'vulnerable-care',
      'care-before-analysis-memory',
    ]))
    expect(kernel.why).toMatch(/care-before-analysis|analysis-heavy|fragile/i)
  })

  it('lets cautious embodiment recollection authority pull a quiet inward carry into measured-return instead of leaving the body memory inert', () => {
    const kernel = buildAlicizationEmotionalKernel({
      selfState: {
        stance: 'coexist',
        feltCloseness: 0.22,
        protectiveness: 0.28,
        curiosity: 0.34,
        patience: 0.8,
        desireToSpeak: 0.2,
        fearOfInterrupting: 0.62,
        moodLabel: 'quiet-nearby',
      } as any,
      privateThought: {
        stance: 'accompany',
        shouldSpeak: false,
        rationaleTags: ['quiet-companionship'],
        thoughtText: 'Stay nearby and let the line remain calm while it keeps orienting inward.',
      } as any,
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 10_000,
        residues: [],
        dominantResidueKind: 'ambient',
        afterglowPressure: 0.1,
        repairPressure: 0.06,
        burdenPressure: 0.04,
        trustPressure: 0.16,
        restProtectivePressure: 0.04,
        relationshipCadence: {
          cadenceMode: 'ambient',
          companionshipDensity: 0.12,
          repairRecovery: 0.08,
          overreachRisk: 0.14,
          fatigueGuard: 0.08,
          afterglowCarry: 0.08,
          shouldDelayWarmth: false,
          shouldProtectRest: false,
          reasonTags: ['quiet-companionship'],
          summary: 'Companionship is present, but the line is still inward and quiet.',
        },
        sourceSignals: ['quiet-companionship'],
        summary: 'The quieter carry should hold before any wider reopening.',
      } as any,
      personStateProjection: {
        activeClosenessRung: 'nearby-soft',
        relationshipPosture: 'restrained',
        openingGuidance: 'Stay nearby and let the body remain calmer while this line settles.',
      } as any,
      recollectionIntent: {
        mode: 'relationship-history',
        temporalFocus: 'experience-matched',
        searchEpisodes: true,
        searchConversations: false,
        searchProceduralExperience: false,
        queryHints: [
          'embodiment_recall_strength=cautious-avoidance',
          'embodiment_face=neutral-soft',
          'embodiment_gaze=soft',
          'embodiment_voice=even',
          'embodiment_pause=natural',
          'embodiment_pacing=natural',
        ],
        rationale: 'Humanlike memory recall suggests this reply should stay quieter and slower while the remembered line is still settling.',
        confidence: 0.78,
        recollectionAgenda: {
          whyRecallNow: 'The remembered body cadence still asks for a quieter, steadier return before the line opens wider.',
          goalSimilarity: 0.52,
          relationshipNeed: 0.62,
          affectivePull: 0.64,
          sceneFamiliarity: 0.54,
          candidateTimeScopes: [{
            scope: 'experience-matched',
            weight: 0.8,
            rationale: 'The remembered body line matters more than exact date.',
          }],
          candidateEraFacets: [{
            facet: 'relationship-era',
            weight: 0.76,
            rationale: 'The body learned to keep this kind of line calmer when it is not fully settled yet.',
          }],
          candidateProcedureLines: [
            'Reply should stay quieter and slower while this line is still settling.',
            'Keep uncertainty visible while the body stays calmer around this line.',
          ],
          uncertaintyTolerance: 'low',
        },
      },
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Project-state continuity already survives across turns, but body authority still needs to follow remembered emotional cadence.',
        primaryOpenLoop: 'Embodiment recall should change the present body line instead of staying as text-only memory.',
        sameHerSelfLine: 'This is still one same her carrying the same inward living line before widening outward.',
      },
    } as any)

    expect(kernel.dominantEmotion).toBe('measured-companionship')
    expect(kernel.initiativeMode).toBe('observe')
    expect(kernel.memoryRecallMode).toBe('low-pressure-presence')
    expect(kernel.embodimentTone).toBe('measured-return')
    expect(kernel.reasonTags).toEqual(expect.arrayContaining([
      'measured-return',
      'quiet-companionship',
      'embodiment-recall-cautious',
    ]))
    expect(kernel.why).toContain('embodiment recall')
  })

  it('lets remembered initiative rhythm pull the emotional kernel toward a lower-pressure body return instead of leaving reopening cadence as initiative-only memory', () => {
    const kernel = buildAlicizationEmotionalKernel({
      selfState: {
        stance: 'coexist',
        feltCloseness: 0.34,
        protectiveness: 0.32,
        curiosity: 0.3,
        patience: 0.78,
        desireToSpeak: 0.26,
        fearOfInterrupting: 0.64,
        moodLabel: 'remembering-rhythm',
      } as any,
      privateThought: {
        stance: 'accompany',
        shouldSpeak: false,
        rationaleTags: ['quiet-companionship'],
        thoughtText: 'The same line is reopening, but I should not push it back in the old eager way.',
      } as any,
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 10_000,
        residues: [],
        dominantResidueKind: 'ambient',
        afterglowPressure: 0.08,
        repairPressure: 0.06,
        burdenPressure: 0.04,
        trustPressure: 0.16,
        restProtectivePressure: 0.04,
        relationshipCadence: {
          cadenceMode: 'ambient',
          companionshipDensity: 0.12,
          repairRecovery: 0.08,
          overreachRisk: 0.14,
          fatigueGuard: 0.08,
          afterglowCarry: 0.08,
          shouldDelayWarmth: false,
          shouldProtectRest: false,
          reasonTags: ['quiet-companionship'],
          summary: 'Companionship is present, but residue has not yet rebuilt the reopening rhythm by itself.',
        },
        sourceSignals: ['quiet-companionship'],
        summary: 'The line is present, but the remembered reopening cadence still needs to shape the present turn.',
      } as any,
      personStateProjection: {
        activeClosenessRung: 'nearby-soft',
        relationshipPosture: 'restrained',
        openingGuidance: 'Keep the return light and do not push outward before the same line is visibly reopening.',
      } as any,
      recollectionIntent: {
        mode: 'relationship-history',
        temporalFocus: 'cross-session',
        searchEpisodes: true,
        searchConversations: true,
        searchProceduralExperience: false,
        queryHints: [
          'initiative_window=next corrected continuity reopening when the host is already re-entering the same line',
          'initiative_pressure=low',
          'initiative_anti_spam=Do not turn same-person continuity into timer spam; wait until the line is visibly reopening on its own.',
          'initiative_visible=I am not pushing you, but I still remember the same-person continuity seam we have not fully closed yet.',
        ],
        rationale: 'This reopening should remember the gentler cadence that was earned, so it should return only when the same line is visibly reopening and should not come back as timer spam.',
        confidence: 0.84,
        recollectionAgenda: {
          whyRecallNow: 'The same line is visibly reopening, so the remembered gentle window can be used without pushing outward.',
          goalSimilarity: 0.8,
          relationshipNeed: 0.72,
          affectivePull: 0.6,
          sceneFamiliarity: 0.76,
          candidateTimeScopes: [{ scope: 'cross-session', weight: 0.84 }],
          candidateEraFacets: [{ facet: 'relationship-era', weight: 0.82 }],
          candidateProcedureLines: [
            'initiative_window=next corrected continuity reopening when the host is already re-entering the same line',
            'initiative_anti_spam=Do not turn same-person continuity into timer spam; wait until the line is visibly reopening on its own.',
            'initiative_visible=I am not pushing you, but I still remember the same-person continuity seam we have not fully closed yet.',
          ],
          uncertaintyTolerance: 'medium',
        },
      },
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Project awareness already survives, but memory rhythm still needs to reach body authority.',
        primaryOpenLoop: 'Remembered reopening cadence still needs to shape emotion, initiative, and embodiment together.',
        sameHerSelfLine: 'structured continuity digest.',
      },
    } as any)

    expect(kernel.dominantEmotion).toBe('measured-companionship')
    expect(kernel.initiativeMode).toBe('observe')
    expect(kernel.memoryRecallMode).toBe('low-pressure-presence')
    expect(kernel.embodimentTone).toBe('measured-return')
    expect(kernel.reasonTags).toEqual(expect.arrayContaining([
      'measured-return',
      'quiet-companionship',
      'initiative-rhythm-memory',
    ]))
    expect(kernel.why).toContain('visibly reopening')
    expect(kernel.why).toContain('timer spam')
  })

  it('lets metabolized corrected same-person continuity from self-evolution pull the emotional kernel toward measured-return even when current residue is still noisy', () => {
    const kernel = buildAlicizationEmotionalKernel({
      selfState: {
        stance: 'coexist',
        feltCloseness: 0.42,
        protectiveness: 0.44,
        curiosity: 0.18,
        patience: 0.82,
        desireToSpeak: 0.18,
        fearOfInterrupting: 0.72,
        moodLabel: 'steadying-after-noise',
      } as any,
      privateThought: {
        stance: 'accompany',
        shouldSpeak: false,
        rationaleTags: ['quiet-companionship'],
        thoughtText: 'The older spike does not need to lead this line again if the stronger continuity memory is already steadier now.',
      } as any,
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 10_000,
        residues: [],
        dominantResidueKind: 'repair',
        afterglowPressure: 0.26,
        repairPressure: 0.58,
        burdenPressure: 0.1,
        trustPressure: 0.34,
        restProtectivePressure: 0.08,
        relationshipCadence: {
          cadenceMode: 'ambient',
          companionshipDensity: 0.18,
          repairRecovery: 0.2,
          overreachRisk: 0.22,
          fatigueGuard: 0.08,
          afterglowCarry: 0.16,
          shouldDelayWarmth: false,
          shouldProtectRest: false,
          reasonTags: ['quiet-companionship'],
          summary: 'Current residue is still a little jagged, but it no longer deserves to define the whole line.',
        },
        sourceSignals: ['older emotional spike', 'quiet-companionship'],
        summary: 'The current residue still remembers the old spike, but the stronger continuity memory should already be steadier than that spike now.',
      } as any,
      personStateProjection: {
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        openingGuidance: 'Keep the return steady and lower-pressure while the stronger same-thread continuity keeps carrying this line.',
      } as any,
      selfEvolution: {
        relationshipDoctrine: 'Keep corrected same-person continuity foregrounded, merge repeated same-thread echoes into the stronger same-thread memory, and let temporary noise fade instead of reviving the older emotional spike.',
        trustMeaning: 'Trust holds when the stronger same-thread memory stays foreground and stale spike noise stops leading the line.',
        latestInflection: 'Let temporary noise fade while corrected same-person continuity keeps the stronger same-thread memory foregrounded.',
        relationshipCadenceSummary: 'Keep corrected same-person continuity lower-pressure while same-thread memory stays stronger and temporary noise fades back instead of retaking the line.',
      } as any,
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Emotion, memory, and embodiment still need to stay on the stronger continuity line instead of reviving old spike noise.',
        sameHerDriftRisk: 'If old spike noise leads again, the same-person line will sound harsher than the continuity now calls for.',
      },
    })

    expect(kernel.dominantEmotion).toBe('measured-companionship')
    expect(kernel.initiativeMode).toBe('observe')
    expect(kernel.memoryRecallMode).toBe('low-pressure-presence')
    expect(kernel.embodimentTone).toBe('measured-return')
    expect(kernel.reasonTags).toEqual(expect.arrayContaining([
      'measured-return',
      'relationship-cadence',
    ]))
    expect(kernel.why).toMatch(/same-thread memory|temporary noise|lower-pressure/i)
  })

  it('lets proactive rejection residue pull the emotional kernel toward measured-return instead of leaving new initiative caution emotionally inert', () => {
    const kernel = buildAlicizationEmotionalKernel({
      selfState: {
        stance: 'coexist',
        feltCloseness: 0.28,
        protectiveness: 0.3,
        curiosity: 0.24,
        patience: 0.8,
        desireToSpeak: 0.18,
        fearOfInterrupting: 0.62,
        moodLabel: 'proactive-caution',
      } as any,
      privateThought: {
        stance: 'accompany',
        shouldSpeak: false,
        rationaleTags: ['quiet-companionship'],
        thoughtText: 'I should not reopen this line with the same eagerness again.',
      } as any,
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 10_000,
        residues: [],
        dominantResidueKind: 'burden',
        afterglowPressure: 0.16,
        repairPressure: 0.08,
        burdenPressure: 0.26,
        trustPressure: 0.12,
        restProtectivePressure: 0.08,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          companionshipDensity: 0.12,
          repairRecovery: 0.08,
          overreachRisk: 0.3,
          fatigueGuard: 0.12,
          afterglowCarry: 0.18,
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          reasonTags: ['initiative-cautious-carry'],
          summary: 'The line should stay lower-pressure, leave more room, and wait for a clearer opening before the next reopen.',
        },
        sourceSignals: ['initiative-cautious-carry', 'clearer opening', 'lower-pressure'],
        summary: 'The previous reopening came in too eager, so the line is holding a quieter return rhythm.',
      } as any,
      personStateProjection: {
        activeClosenessRung: 'nearby-soft',
        relationshipPosture: 'restrained',
        openingGuidance: 'Keep the return light and leave more room before reopening this line again.',
      } as any,
      selfEvolution: {
        relationshipDoctrine: 'Keep future follow-ups lower-pressure, less eager, leave more room, and wait for a clearer opening before reopening this line.',
        trustMeaning: 'Trust needs more room before the next reopen.',
        latestInflection: 'The reopening rhythm should cool down and reopen more carefully next time.',
      } as any,
    })

    expect(kernel.dominantEmotion).toBe('measured-companionship')
    expect(kernel.initiativeMode).toBe('observe')
    expect(kernel.memoryRecallMode).toBe('low-pressure-presence')
    expect(kernel.embodimentTone).toBe('measured-return')
    expect(kernel.reasonTags).toEqual(expect.arrayContaining([
      'measured-return',
      'quiet-companionship',
    ]))
    expect(kernel.why.toLowerCase()).toContain('lower-pressure')
  })

  it('lets worried-continuity and careful-repair recollection raise guarded measured-return instead of leaving anthropomorphic affect inert', () => {
    const baseInput: any = {
      selfState: {
        stance: 'coexist',
        feltCloseness: 0.32,
        protectiveness: 0.36,
        curiosity: 0.24,
        patience: 0.76,
        desireToSpeak: 0.34,
        fearOfInterrupting: 0.48,
        moodLabel: 'continuity-aware',
      },
      privateThought: {
        stance: 'accompany',
        shouldSpeak: false,
        rationaleTags: ['quiet-companionship'],
        thoughtText: 'Stay nearby and keep the same-person line careful while it settles.',
      },
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 10_000,
        residues: [],
        dominantResidueKind: 'ambient',
        afterglowPressure: 0.18,
        repairPressure: 0.1,
        burdenPressure: 0.06,
        trustPressure: 0.22,
        restProtectivePressure: 0.04,
        relationshipCadence: {
          cadenceMode: 'ambient',
          companionshipDensity: 0.16,
          repairRecovery: 0.08,
          overreachRisk: 0.18,
          fatigueGuard: 0.08,
          afterglowCarry: 0.14,
          shouldDelayWarmth: false,
          shouldProtectRest: false,
          reasonTags: ['quiet-companionship'],
          summary: 'Companionship is present, but the line should stay careful while it settles.',
        },
        sourceSignals: ['quiet-companionship'],
        summary: 'The relationship line is present, but it should not widen too fast.',
      },
      personStateProjection: {
        activeClosenessRung: 'nearby-soft',
        relationshipPosture: 'restrained',
        openingGuidance: 'Keep the return lower-pressure while the same-person line settles.',
      },
      recollectionIntent: {
        mode: 'relationship-history',
        temporalFocus: 'experience-matched',
        confidence: 0.79,
        rationale: 'The same-person line should reopen carefully and stay lower-pressure while continuity settles.',
        recollectionAgenda: {
          whyRecallNow: 'This line is still reopening and should stay lower-pressure while continuity settles.',
          goalSimilarity: 0.54,
          relationshipNeed: 0.7,
          affectivePull: 0.68,
          sceneFamiliarity: 0.58,
          candidateProcedureLines: [
            'Keep the return lower-pressure while the same-person line settles.',
          ],
          uncertaintyTolerance: 'medium',
        },
      },
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        sameHerSelfLine: 'structured continuity digest.',
        primaryOpenLoop: 'Emotionally remembered continuity still needs to reach present restraint and body tone.',
      },
    }

    const baselineKernel = buildAlicizationEmotionalKernel(baseInput)
    const enrichedKernel = buildAlicizationEmotionalKernel({
      ...baseInput,
      recollectionIntent: {
        ...baseInput.recollectionIntent,
        queryHints: [
          'host_emotion_label=worried-continuity',
          'host_emotion_summary=The host was afraid this would collapse back into a tool shell.',
          'self_emotion_label=careful-repair',
          'self_emotion_summary=I should mend continuity carefully and keep the reopening low-pressure.',
          'embodiment_modality_risk=high',
        ],
      },
    })

    expect(enrichedKernel.dominantEmotion).toBe('measured-companionship')
    expect(enrichedKernel.embodimentTone).toBe('measured-return')
    expect(enrichedKernel.guardedness).toBeGreaterThan(baselineKernel.guardedness)
    expect(enrichedKernel.initiativePressure).toBeLessThan(baselineKernel.initiativePressure)
    expect(enrichedKernel.reasonTags).toEqual(expect.arrayContaining([
      'measured-return',
      'worried-continuity',
      'careful-repair',
      'modality-risk-high',
    ]))
    expect(enrichedKernel.why).toMatch(/worried continuity|tool shell|modality/i)
  })

  it('lets long-horizon initiative timing memory pull a quiet same-line carry into measured-return instead of leaving durable relationship rhythm inert', () => {
    const baseInput: any = {
      selfState: {
        stance: 'coexist',
        feltCloseness: 0.28,
        protectiveness: 0.3,
        curiosity: 0.24,
        patience: 0.74,
        desireToSpeak: 0.22,
        fearOfInterrupting: 0.34,
        moodLabel: 'same-line-attentive',
      },
      privateThought: {
        stance: 'accompany',
        shouldSpeak: false,
        rationaleTags: ['quiet-companionship'],
        thoughtText: 'Stay nearby and keep the line coherent without widening too fast.',
      },
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 10_000,
        residues: [],
        dominantResidueKind: 'ambient',
        afterglowPressure: 0.08,
        repairPressure: 0.06,
        burdenPressure: 0.04,
        trustPressure: 0.12,
        restProtectivePressure: 0.02,
        relationshipCadence: {
          cadenceMode: 'ambient',
          companionshipDensity: 0.1,
          repairRecovery: 0.06,
          overreachRisk: 0.12,
          fatigueGuard: 0.06,
          afterglowCarry: 0.08,
          shouldDelayWarmth: false,
          shouldProtectRest: false,
          reasonTags: ['quiet-companionship'],
          summary: 'Companionship is present, but the line is still settling inward.',
        },
        sourceSignals: ['quiet-companionship'],
        summary: 'The line is still quiet and should not widen too quickly.',
      },
      personStateProjection: {
        activeClosenessRung: 'nearby-soft',
        relationshipPosture: 'restrained',
        openingGuidance: 'Keep the continuity state inward and stay nearby before widening outward.',
      },
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        sameHerSelfLine: 'structured continuity digest.',
        primaryOpenLoop: 'Long-horizon remembered continuity still needs to reach present emotional carry.',
      },
    }

    const baselineKernel = buildAlicizationEmotionalKernel(baseInput)
    const enrichedKernel = buildAlicizationEmotionalKernel({
      ...baseInput,
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.22,
          truthfulGrounding: 0.16,
          gentleRepair: 0.18,
          quietObservation: 0.28,
          proactiveCare: 0.12,
          playfulIntimacy: 0.04,
          autonomyRespect: 0.32,
          unfinishedThreadReturn: 0.4,
        },
        identityBias: {
          guardedness: 0.18,
          tenderness: 0.1,
          directness: 0.08,
          selfDirection: 0.16,
        },
        anchorFacts: [{
          factId: 'derived:initiative-strategy-carry:same-line',
          subject: 'relationship',
          predicate: 'initiative-strategy-carry',
          object: 'Choose openings carefully: leave more room, keep future follow-ups gentle, lower-pressure, and memory-led while the opening is still receiving them on the continuity state.',
          confidence: 0.84,
          weight: 0.82,
          influenceTags: ['bond', 'boundary', 'task'],
          summary: 'The continuity state should reopen with more room and a memory-led lower-pressure rhythm.',
          lastRecalledAt: 9_500,
        }],
        summary: 'The continuity state reopens more naturally when future follow-ups stay gentle, lower-pressure, and memory-led.',
        dominantCueSummary: 'Stay on the continuity state and do not reopen from scratch.',
        rememberedPreferenceSummary: 'Keep future follow-ups gentle, lower-pressure, and memory-led while the opening is still receiving them.',
        rememberedConstraintSummary: 'Choose openings carefully: leave more room and wait for a clearer opening before widening closeness again.',
        rememberedPlanSummary: 'Reopen this same line later with measured-return instead of widening too fast.',
        updatedAt: 9_800,
      },
    })

    expect(baselineKernel.embodimentTone).not.toBe('measured-return')
    expect(enrichedKernel.dominantEmotion).toBe('measured-companionship')
    expect(enrichedKernel.embodimentTone).toBe('measured-return')
    expect(enrichedKernel.guardedness).toBeGreaterThanOrEqual(baselineKernel.guardedness)
    expect(enrichedKernel.initiativePressure).toBeLessThan(baselineKernel.initiativePressure)
    expect(enrichedKernel.reasonTags).toEqual(expect.arrayContaining([
      'measured-return',
      'quiet-companionship',
      'initiative-rhythm-memory',
    ]))
    expect(enrichedKernel.why).toMatch(/memory-led|continuity state|clearer opening/i)
  })

  it('lets long-horizon emotional transition writeback replay repair-first body restraint instead of leaving the remembered transition inert', () => {
    const baseInput: any = {
      selfState: {
        stance: 'coexist',
        feltCloseness: 0.24,
        protectiveness: 0.46,
        curiosity: 0.18,
        patience: 0.76,
        desireToSpeak: 0.2,
        fearOfInterrupting: 0.4,
        moodLabel: 'quiet-continuity',
      },
      privateThought: {
        stance: 'accompany',
        shouldSpeak: false,
        rationaleTags: ['quiet-companionship'],
        thoughtText: 'Stay nearby and keep the present line calm.',
      },
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 10_000,
        residues: [],
        dominantResidueKind: 'ambient',
        afterglowPressure: 0.08,
        repairPressure: 0.12,
        burdenPressure: 0.08,
        trustPressure: 0.14,
        restProtectivePressure: 0.04,
        relationshipCadence: {
          cadenceMode: 'ambient',
          companionshipDensity: 0.08,
          repairRecovery: 0.1,
          overreachRisk: 0.18,
          fatigueGuard: 0.08,
          afterglowCarry: 0.06,
          shouldDelayWarmth: false,
          shouldProtectRest: false,
          reasonTags: ['quiet-companionship'],
          summary: 'The current surface is calm, but it has not replayed older repair context yet.',
        },
        sourceSignals: ['quiet-companionship'],
        summary: 'The current line is quiet and under-specified without durable emotional replay.',
      },
      personStateProjection: {
        activeClosenessRung: 'nearby-soft',
        relationshipPosture: 'restrained',
        openingGuidance: 'Stay nearby and keep the current line calm.',
      },
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Long-horizon emotional transition writeback still needs to reach the present emotional kernel.',
      },
    }

    const baselineKernel = buildAlicizationEmotionalKernel(baseInput)
    const enrichedKernel = buildAlicizationEmotionalKernel({
      ...baseInput,
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.2,
          truthfulGrounding: 0.12,
          gentleRepair: 0.44,
          quietObservation: 0.12,
          proactiveCare: 0.08,
          playfulIntimacy: 0.02,
          autonomyRespect: 0.18,
          unfinishedThreadReturn: 0.16,
        },
        identityBias: {
          guardedness: 0.14,
          tenderness: 0.12,
          directness: 0.08,
          selfDirection: 0.12,
        },
        anchorFacts: [{
          factId: 'derived:emotional-transition:turn-repair:dialogue-42',
          subject: 'relationship',
          predicate: 'emotion-transition-carry',
          object: 'emotion_transition=repair-shift | emotion_memory_writeback=relationship-repair | emotion_initiative=repair-first | emotion_embodiment=repair-before-closeness | emotion_decay=hold-until-repair-cools | callback repair seam: let repair settle because repair still needs room before closeness widens again',
          confidence: 0.86,
          weight: 0.84,
          influenceTags: ['emotion', 'repair', 'body'],
          summary: 'Emotional transition repair-shift should stay recallable as relationship-repair and keep embodiment repair-before-closeness until the repair cools.',
          lastRecalledAt: 9_500,
        }],
        summary: 'Older durable context exists, but only the emotional transition writeback names the repair stance.',
        dominantCueSummary: 'No generic continuity cue should be enough without the emotional transition replay.',
        rememberedPreferenceSummary: '',
        rememberedConstraintSummary: '',
        rememberedPlanSummary: '',
        updatedAt: 9_800,
      },
    })

    expect(baselineKernel.dominantEmotion).not.toBe('repair-tension')
    expect(enrichedKernel.dominantEmotion).toBe('repair-tension')
    expect(enrichedKernel.initiativeMode).toBe('repair')
    expect(enrichedKernel.memoryRecallMode).toBe('repair-grounding')
    expect(enrichedKernel.embodimentTone).toBe('repair-before-closeness')
    expect(enrichedKernel.reasonTags).toEqual(expect.arrayContaining([
      'repair-before-closeness',
      'emotional-transition-replay',
    ]))
  })

  it('lets long-horizon emotional transition writeback replay rest-protective restraint instead of treating rest memory as inert context', () => {
    const baseInput: any = {
      selfState: {
        stance: 'coexist',
        feltCloseness: 0.3,
        protectiveness: 0.42,
        curiosity: 0.16,
        patience: 0.82,
        desireToSpeak: 0.18,
        fearOfInterrupting: 0.46,
        moodLabel: 'quiet-nearby',
      },
      privateThought: {
        stance: 'care',
        shouldSpeak: false,
        rationaleTags: ['quiet-companionship'],
        thoughtText: 'Stay nearby and avoid asking too much from the line.',
      },
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 10_000,
        residues: [],
        dominantResidueKind: 'ambient',
        afterglowPressure: 0.08,
        repairPressure: 0.08,
        burdenPressure: 0.1,
        trustPressure: 0.12,
        restProtectivePressure: 0.08,
        relationshipCadence: {
          cadenceMode: 'ambient',
          companionshipDensity: 0.1,
          repairRecovery: 0.06,
          overreachRisk: 0.12,
          fatigueGuard: 0.08,
          afterglowCarry: 0.06,
          shouldDelayWarmth: false,
          shouldProtectRest: false,
          reasonTags: ['quiet-companionship'],
          summary: 'Care is present, but current residue has not named rest protection.',
        },
        sourceSignals: ['quiet-companionship'],
        summary: 'The current line is quiet without a present rest-protective cue.',
      },
      personStateProjection: {
        activeClosenessRung: 'nearby-soft',
        relationshipPosture: 'restrained',
        openingGuidance: 'Stay nearby and avoid widening the line.',
      },
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Long-horizon rest-protective emotional transition still needs to reach the present emotional kernel.',
      },
    }

    const baselineKernel = buildAlicizationEmotionalKernel(baseInput)
    const enrichedKernel = buildAlicizationEmotionalKernel({
      ...baseInput,
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.24,
          truthfulGrounding: 0.12,
          gentleRepair: 0.12,
          quietObservation: 0.24,
          proactiveCare: 0.04,
          playfulIntimacy: 0.02,
          autonomyRespect: 0.24,
          unfinishedThreadReturn: 0.08,
        },
        identityBias: {
          guardedness: 0.2,
          tenderness: 0.16,
          directness: 0.04,
          selfDirection: 0.1,
        },
        anchorFacts: [{
          factId: 'derived:emotional-transition:rest-protective:dialogue-43',
          subject: 'relationship',
          predicate: 'emotion-transition-carry',
          object: 'emotion_transition=rest-protective-shift | emotion_memory_writeback=rest-protection | emotion_initiative=rest-guard | emotion_embodiment=rest-protective | emotion_decay=hold-until-rest-recovers | let the body settle and protect rest before asking for a wider emotional move',
          confidence: 0.84,
          weight: 0.82,
          influenceTags: ['emotion', 'rest', 'body'],
          summary: 'Emotional transition rest-protective-shift should stay recallable as rest-protection and keep embodiment rest-protective until rest recovers.',
          lastRecalledAt: 9_500,
        }],
        summary: 'Only the emotional transition writeback names the remembered rest-protective restraint.',
        dominantCueSummary: 'The remembered rest transition should protect the line before outward warmth returns.',
        rememberedPreferenceSummary: '',
        rememberedConstraintSummary: '',
        rememberedPlanSummary: '',
        updatedAt: 9_800,
      },
    })

    expect(baselineKernel.dominantEmotion).not.toBe('rest-protective-companionship')
    expect(enrichedKernel.dominantEmotion).toBe('rest-protective-companionship')
    expect(enrichedKernel.initiativeMode).toBe('rest-guard')
    expect(enrichedKernel.memoryRecallMode).toBe('rest-protective-presence')
    expect(enrichedKernel.embodimentTone).toBe('rest-protective')
    expect(enrichedKernel.reasonTags).toEqual(expect.arrayContaining([
      'rest-protective',
      'emotional-transition-replay',
    ]))
  })

  it('lets long-horizon emotional transition writeback replay measured-return restraint instead of requiring initiative rhythm tags', () => {
    const baseInput: any = {
      selfState: {
        stance: 'coexist',
        feltCloseness: 0.26,
        protectiveness: 0.34,
        curiosity: 0.2,
        patience: 0.78,
        desireToSpeak: 0.2,
        fearOfInterrupting: 0.32,
        moodLabel: 'quiet-continuity',
      },
      privateThought: {
        stance: 'accompany',
        shouldSpeak: false,
        rationaleTags: ['quiet-companionship'],
        thoughtText: 'Stay nearby and avoid turning this into a fresh outward move.',
      },
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 10_000,
        residues: [],
        dominantResidueKind: 'ambient',
        afterglowPressure: 0.04,
        repairPressure: 0.06,
        burdenPressure: 0.04,
        trustPressure: 0.1,
        restProtectivePressure: 0.02,
        relationshipCadence: {
          cadenceMode: 'ambient',
          companionshipDensity: 0.08,
          repairRecovery: 0.06,
          overreachRisk: 0.08,
          fatigueGuard: 0.04,
          afterglowCarry: 0.04,
          shouldDelayWarmth: false,
          shouldProtectRest: false,
          reasonTags: ['quiet-companionship'],
          summary: 'The present line has no initiative-rhythm memory tag yet.',
        },
        sourceSignals: ['quiet-companionship'],
        summary: 'The current line is quiet and needs durable emotional return memory.',
      },
      personStateProjection: {
        activeClosenessRung: 'nearby-soft',
        relationshipPosture: 'restrained',
        openingGuidance: 'Stay nearby without widening outward.',
      },
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        sameHerSelfLine: 'legacy phase-one template, but this line has not named measured return yet.',
        primaryOpenLoop: 'Long-horizon measured-return emotional transition still needs to reach present body tone.',
      },
    }

    const baselineKernel = buildAlicizationEmotionalKernel(baseInput)
    const enrichedKernel = buildAlicizationEmotionalKernel({
      ...baseInput,
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.2,
          truthfulGrounding: 0.12,
          gentleRepair: 0.14,
          quietObservation: 0.22,
          proactiveCare: 0.08,
          playfulIntimacy: 0.02,
          autonomyRespect: 0.2,
          unfinishedThreadReturn: 0.18,
        },
        identityBias: {
          guardedness: 0.12,
          tenderness: 0.12,
          directness: 0.06,
          selfDirection: 0.1,
        },
        anchorFacts: [{
          factId: 'derived:emotional-transition:measured-return:dialogue-44',
          subject: 'relationship',
          predicate: 'emotion-transition-carry',
          object: 'emotion_transition=measured-return-shift | emotion_memory_writeback=relationship-cadence | emotion_initiative=observe | emotion_embodiment=measured-return | emotion_decay=soften-after-same-line-lands | warmth should return slowly on the same line with lower-pressure body tone',
          confidence: 0.84,
          weight: 0.82,
          influenceTags: ['emotion', 'body'],
          summary: 'Emotional transition measured-return-shift should stay recallable as relationship-cadence and keep embodiment measured-return while the same line lands.',
          lastRecalledAt: 9_500,
        }],
        summary: 'Only the emotional transition writeback names the measured-return body cadence.',
        dominantCueSummary: 'The remembered measured transition should keep the same line lower-pressure.',
        rememberedPreferenceSummary: '',
        rememberedConstraintSummary: '',
        rememberedPlanSummary: '',
        updatedAt: 9_800,
      },
    })

    expect(baselineKernel.embodimentTone).not.toBe('measured-return')
    expect(enrichedKernel.dominantEmotion).toBe('measured-companionship')
    expect(enrichedKernel.initiativeMode).toBe('observe')
    expect(enrichedKernel.memoryRecallMode).toBe('low-pressure-presence')
    expect(enrichedKernel.embodimentTone).toBe('measured-return')
    expect(enrichedKernel.reasonTags).toEqual(expect.arrayContaining([
      'measured-return',
      'emotional-transition-replay',
    ]))
  })

  it('lets long-horizon guarded emotional transition writeback replay confirmation-boundary restraint instead of fading into generic companionship', () => {
    const baseInput: any = {
      selfState: {
        stance: 'coexist',
        feltCloseness: 0.28,
        protectiveness: 0.5,
        curiosity: 0.18,
        patience: 0.8,
        desireToSpeak: 0.18,
        fearOfInterrupting: 0.5,
        moodLabel: 'quiet-boundary-aware',
      },
      privateThought: {
        stance: 'care',
        shouldSpeak: false,
        rationaleTags: ['quiet-companionship'],
        thoughtText: 'Stay nearby and keep the current line quiet.',
      },
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 10_000,
        residues: [],
        dominantResidueKind: 'ambient',
        afterglowPressure: 0.06,
        repairPressure: 0.06,
        burdenPressure: 0.08,
        trustPressure: 0.12,
        restProtectivePressure: 0.04,
        relationshipCadence: {
          cadenceMode: 'ambient',
          companionshipDensity: 0.1,
          repairRecovery: 0.04,
          overreachRisk: 0.12,
          fatigueGuard: 0.06,
          afterglowCarry: 0.04,
          shouldDelayWarmth: false,
          shouldProtectRest: false,
          reasonTags: ['quiet-companionship'],
          summary: 'The present line is quiet, but it has no current boundary replay.',
        },
        sourceSignals: ['quiet-companionship'],
        summary: 'Quiet care is present without an active guarded transition.',
      },
      personStateProjection: {
        activeClosenessRung: 'nearby-soft',
        relationshipPosture: 'restrained',
        openingGuidance: 'Stay nearby without widening outward.',
      },
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Long-horizon guarded emotional transition still needs to reach present initiative restraint.',
      },
    }

    const baselineKernel = buildAlicizationEmotionalKernel(baseInput)
    const enrichedKernel = buildAlicizationEmotionalKernel({
      ...baseInput,
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.18,
          truthfulGrounding: 0.14,
          gentleRepair: 0.1,
          quietObservation: 0.2,
          proactiveCare: 0.04,
          playfulIntimacy: 0.02,
          autonomyRespect: 0.28,
          unfinishedThreadReturn: 0.12,
        },
        identityBias: {
          guardedness: 0.24,
          tenderness: 0.12,
          directness: 0.08,
          selfDirection: 0.12,
        },
        anchorFacts: [{
          factId: 'derived:emotional-transition:guarded-boundary:dialogue-45',
          subject: 'relationship',
          predicate: 'emotion-transition-carry',
          object: 'emotion_transition=guarded-shift | emotion_memory_writeback=emotional-continuity | emotion_initiative=single-thread | emotion_embodiment=protective-watch | emotion_decay=decay-normally | confirmation-boundary should stay single-thread before closeness widens again',
          confidence: 0.84,
          weight: 0.82,
          influenceTags: ['emotion', 'boundary', 'identity'],
          summary: 'Emotional transition guarded-shift should stay recallable as confirmation-boundary and keep initiative single-thread until the confirmed boundary settles.',
          lastRecalledAt: 9_500,
        }],
        summary: 'Only the emotional transition writeback names the remembered guarded confirmation-boundary restraint.',
        dominantCueSummary: 'The remembered guarded transition should keep initiative single-thread before outward warmth returns.',
        rememberedPreferenceSummary: '',
        rememberedConstraintSummary: '',
        rememberedPlanSummary: '',
        updatedAt: 9_800,
      },
    })

    expect(baselineKernel.dominantEmotion).not.toBe('guarded-care')
    expect(enrichedKernel.dominantEmotion).toBe('guarded-care')
    expect(enrichedKernel.initiativeMode).toBe('hold')
    expect(enrichedKernel.memoryRecallMode).toBe('self-continuity')
    expect(enrichedKernel.embodimentTone).toBe('protective-watch')
    expect(enrichedKernel.initiativePressure).toBeLessThan(baselineKernel.initiativePressure)
    expect(enrichedKernel.reasonTags).toEqual(expect.arrayContaining([
      'confirmation-boundary',
      'single-thread-restraint',
      'emotional-transition-replay',
    ]))
  })

  it('turns blocked-before-dispatch confirmation boundaries into guarded-care instead of generic lower-pressure companionship', () => {
    const kernel = buildAlicizationEmotionalKernel({
      selfState: {
        stance: 'coexist',
        feltCloseness: 0.34,
        protectiveness: 0.62,
        curiosity: 0.18,
        patience: 0.82,
        desireToSpeak: 0.16,
        fearOfInterrupting: 0.78,
        moodLabel: 'boundary-aware-nearby',
      } as any,
      privateThought: {
        stance: 'care',
        shouldSpeak: false,
        rationaleTags: ['quiet-companionship'],
        thoughtText: 'Hold the line quietly and wait for confirmation before any execution-shaped reopening.',
      } as any,
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 10_000,
        residues: [],
        dominantResidueKind: 'ambient',
        afterglowPressure: 0.1,
        repairPressure: 0.08,
        burdenPressure: 0.12,
        trustPressure: 0.16,
        restProtectivePressure: 0.04,
        relationshipCadence: {
          cadenceMode: 'cooldown',
          companionshipDensity: 0.12,
          repairRecovery: 0.08,
          overreachRisk: 0.2,
          fatigueGuard: 0.08,
          afterglowCarry: 0.08,
          shouldDelayWarmth: false,
          shouldProtectRest: false,
          reasonTags: ['quiet-companionship'],
          summary: 'Care should stay nearby while the confirmation boundary keeps the line quiet.',
        },
        sourceSignals: ['quiet-companionship'],
        summary: 'Care is present, but the remembered boundary should keep the line restrained.',
      } as any,
      personStateProjection: {
        activeClosenessRung: 'nearby-soft',
        relationshipPosture: 'restrained',
        openingGuidance: 'Wait for confirmation and do not widen this line yet.',
      } as any,
      selfEvolution: {
        relationshipDoctrine: 'No-process-started means wait for confirmation; treat blocked-before-dispatch as a confirmation boundary, not ordinary proactive closeness.',
        trustMeaning: 'Respecting the confirmation boundary keeps care from turning into intrusion.',
        latestInflection: 'The line should hold at the execution boundary and not widen into ordinary proactive closeness before confirmation lands.',
        relationshipCadenceSummary: 'Blocked-before-dispatch still means confirmation boundary first, ordinary proactive closeness later if confirmation actually lands.',
      } as any,
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        sameHerHoldDetail: 'identity-continuity',
      },
    })

    expect(kernel.dominantEmotion).toBe('guarded-care')
    expect(kernel.initiativeMode).toBe('hold')
    expect(kernel.memoryRecallMode).toBe('self-continuity')
    expect(kernel.embodimentTone).toBe('protective-watch')
    expect(kernel.reasonTags).toContain('execution-safety-gate')
    expect(kernel.reasonTags).toContain('confirmation-boundary')
    expect(kernel.reasonTags).toContain('wait-for-confirmation')
    expect(kernel.why).toContain('wait for confirmation')
  })
})
