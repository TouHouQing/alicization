import { describe, expect, it } from 'vitest'

import {
  buildHostPersonModelSnapshot,
  buildHumanlikeMemoryAuditEntriesFromMindTurnEvents,
  buildHumanlikeMemoryCandidate,
  formatMemoryProvenanceLabel,
  mapFragmentSourceKindToProvenance,
  mapMemorySourceToProvenance,
} from './humanlike-memory'

describe('humanlike memory helpers', () => {
  it('maps semantic and fragment sources into reply-visible provenance labels', () => {
    expect(mapMemorySourceToProvenance('rule')).toBe('remembered')
    expect(mapMemorySourceToProvenance('async-llm')).toBe('inferred')
    expect(mapMemorySourceToProvenance('rule-shadow')).toBe('shadow')
    expect(mapFragmentSourceKindToProvenance('dream-fragment')).toBe('dreamt')
    expect(mapFragmentSourceKindToProvenance('former-core-incarnation')).toBe('reconstructed')
    expect(formatMemoryProvenanceLabel('observed')).toBe('observed')
    expect(formatMemoryProvenanceLabel('shadow')).toBe('shadow')
  })

  it('builds a host person model from autobiographical episodes instead of raw attitude only', () => {
    const snapshot = buildHostPersonModelSnapshot({
      now: 20_000,
      facts: [],
      relationshipDynamics: null,
      events: [
        {
          id: 'event-1',
          cardId: 'card-1',
          decisionTraceId: null,
          turnId: 'turn-1',
          sessionId: 'session-1',
          sourceKind: 'dialogue-feedback',
          provenance: 'observed',
          occurredAt: 10_000,
          whereSummary: 'focused coding window',
          withWhom: ['host'],
          threadAnchor: 'runtime repair',
          whatHappened: 'The host said the reply felt intrusive during focused work.',
          felt: 'I had stepped too close.',
          emotionTags: ['boundary', 'repair'],
          whatChanged: 'boundary strained 0.10, burden up 0.08',
          relationshipMeaning: 'Focused windows need more room before closeness.',
          lesson: 'If the host is focused, back off and re-enter with a lighter touch.',
          sourceSummary: 'host dialogue feedback',
          confidence: 0.88,
          salience: 0.9,
          sceneAttachment: 0.7,
          consolidationPriority: 0.8,
          relationshipShift: {
            closenessDelta: -0.03,
            trustDelta: -0.04,
            burdenDelta: 0.08,
            boundaryDelta: -0.1,
            misreadDelta: 0.04,
            repairDelta: 0.02,
            openLoopDelta: 0,
          },
          derivedFrom: [],
          tags: ['dialogue-feedback', 'focused-window'],
          createdAt: 10_000,
          updatedAt: 10_000,
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
          latestReconsolidation: null,
        },
        {
          id: 'event-2',
          cardId: 'card-1',
          decisionTraceId: null,
          turnId: 'turn-2',
          sessionId: 'session-1',
          sourceKind: 'execution-result',
          provenance: 'observed',
          occurredAt: 12_000,
          whereSummary: 'execution callback via codex',
          withWhom: ['host'],
          threadAnchor: 'runtime patch',
          whatHappened: 'A bounded codex result landed as useful after explicit consent.',
          felt: 'The result was genuinely useful.',
          emotionTags: ['execution', 'validated'],
          whatChanged: 'trust up 0.09, closeness up 0.03',
          relationshipMeaning: 'Bounded execution can be direct when consent is explicit.',
          lesson: 'Execution callbacks land best when proposal, action, and result stay bounded.',
          sourceSummary: 'execution result feedback',
          confidence: 0.84,
          salience: 0.82,
          sceneAttachment: 0.42,
          consolidationPriority: 0.64,
          relationshipShift: {
            closenessDelta: 0.03,
            trustDelta: 0.09,
            burdenDelta: 0,
            boundaryDelta: 0.02,
            misreadDelta: -0.03,
            repairDelta: 0.03,
            openLoopDelta: 0.05,
          },
          derivedFrom: [],
          tags: ['execution-result', 'consent'],
          createdAt: 12_000,
          updatedAt: 12_000,
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
          latestReconsolidation: null,
        },
      ],
    })

    expect(snapshot.routines.some(item => item.includes('Focused work windows'))).toBe(true)
    expect(snapshot.sensitivities.some(item => item.includes('intrusive') || item.includes('pressure'))).toBe(true)
    expect(snapshot.repairTriggers.some(item => item.includes('repair') || item.includes('robotic'))).toBe(true)
    expect(snapshot.preferredClosenessByContext.some(item => item.context === 'focused-work')).toBe(true)
    expect(snapshot.trustLadder.stage === 'cautious-open' || snapshot.trustLadder.stage === 'warming' || snapshot.trustLadder.stage === 'trusted').toBe(true)
    expect(snapshot.summary.length).toBeGreaterThan(0)
  })

  it('lets consolidations and relationship dynamics keep shaping the host model even when fresh episodes are sparse', () => {
    const snapshot = buildHostPersonModelSnapshot({
      now: 40_000,
      facts: [],
      relationshipDynamics: {
        hostAttitude: 'Focused work is still sensitive, but trust holds if the return stays light and precise.',
        previousHostAttitude: 'Focused work is sensitive.',
        obedienceDelta: 0,
        livelinessDelta: 0.02,
        sensibilityDelta: 0.04,
        source: 'dialogue-feedback:received',
        createdAt: 38_000,
      },
      consolidations: [
        {
          id: 'relationship-era:focused',
          kind: 'autobiographical',
          facet: 'relationship-era',
          periodKey: '2026-04-focused',
          periodStartedAt: 30_000,
          periodEndedAt: 38_000,
          summary: 'Focused work periods stay safer when closeness leaves room first and repair settles before the return.',
          lesson: 'If the host is focused and the seam is off, repair first, then re-enter with a lighter touch.',
          cues: ['focused-work', 'room-before-closeness', 'repair-first'],
          confidence: 0.88,
          dominantProvenance: 'remembered',
          derivedEventIds: ['evt-1'],
          updatedAt: 38_000,
          memoryTier: 'warm',
        },
      ],
      events: [],
    })

    expect(snapshot.summary).toContain('attitude=')
    expect(snapshot.repairTriggers.some(item => item.includes('repair first') || item.includes('repair'))).toBe(true)
    expect(snapshot.preferredClosenessByContext.some(item => item.context === 'focused-work')).toBe(true)
    expect(snapshot.narrative.some(item => item.includes('Focused work periods stay safer'))).toBe(true)
  })

  it('lets relationship outcomes and reinforcement events keep shaping host preferences and trust', () => {
    const snapshot = buildHostPersonModelSnapshot({
      now: 52_000,
      facts: [],
      events: [],
      relationshipDynamics: null,
      relationshipOutcomes: [
        {
          id: 'outcome-1',
          cardId: 'card-1',
          decisionTraceId: null,
          turnId: 'turn-1',
          sessionId: 'session-1',
          sourceKind: 'execution',
          actionSummary: 'execution callback landed during focused work',
          closenessDelta: -0.02,
          trustDelta: 0.08,
          burdenDelta: 0.06,
          boundaryDelta: -0.04,
          misreadDelta: 0,
          repairDelta: 0.03,
          openLoopDelta: 0.04,
          summary: 'The callback was useful, but it still needed lighter interruption pressure while the host stayed focused.',
          createdAt: 50_000,
        },
      ],
      reinforcementEvents: [
        {
          id: 'reinforce-1',
          cardId: 'card-1',
          decisionTraceId: null,
          turnId: 'turn-1',
          sessionId: 'session-1',
          sourceKind: 'execution',
          dimension: 'autonomy-respect',
          delta: 0.08,
          valence: 'reinforce',
          summary: 'Respecting working space kept the callback acceptable.',
          createdAt: 51_000,
        },
      ],
    })

    expect(snapshot.preferredClosenessByContext.some(item => item.context === 'focused-work')).toBe(true)
    expect(snapshot.recurrentBurdens.some(item => item.includes('Focused work') || item.includes('callback'))).toBe(true)
    expect(snapshot.narrative.some(item => item.includes('lighter interruption pressure'))).toBe(true)
    expect(snapshot.trustLadder.score).toBeGreaterThan(0.5)
  })

  it('lets explicit person-state update surfaces feed the host model even before older stores are re-read', () => {
    const snapshot = buildHostPersonModelSnapshot({
      now: 60_000,
      facts: [],
      events: [],
      relationshipDynamics: null,
      personStateUpdateSurface: {
        version: 'person-state-update-surface-v1',
        updatedAt: 59_000,
        summary: 'Recent outcomes nudged trust upward. Preference shift: Lighter touch, more room, less interruption pressure.',
        dominantContexts: ['focused-work', 'execution'],
        relationshipShift: {
          trustDelta: 0.08,
          closenessDelta: -0.02,
          burdenDelta: 0.05,
          boundaryDelta: -0.03,
          repairDelta: 0.03,
        },
        reinforcementBias: {
          'autonomy-respect': 0.08,
        },
        preferenceHints: ['Lighter touch, more room, less interruption pressure.'],
        sensitivityHints: ['Pressure and over-close timing become intrusive quickly.'],
        repairHints: ['When the seam is off, repair before continuing.'],
        burdenHints: ['Focused work gets overloaded quickly by extra conversational pressure.'],
        narrative: ['The callback was useful, but it still needed lighter interruption pressure while the host stayed focused.'],
        sourceTrail: [{
          kind: 'relationship-outcome',
          sourceKind: 'execution',
          summary: 'The callback was useful, but it still needed lighter interruption pressure while the host stayed focused.',
          createdAt: 59_000,
        }],
      },
    })

    expect(snapshot.summary).toContain('update=')
    expect(snapshot.preferredClosenessByContext.some(item => item.context === 'focused-work')).toBe(true)
    expect(snapshot.sensitivities.some(item => item.includes('Pressure'))).toBe(true)
    expect(snapshot.repairTriggers.some(item => item.includes('repair'))).toBe(true)
  })

  it('keeps a stably corrected same-person continuity memory authoritative in the host model instead of preserving the older generic status-shell narrative', () => {
    const snapshot = buildHostPersonModelSnapshot({
      now: 72_000,
      facts: [],
      relationshipDynamics: null,
      events: [
        {
          id: 'event-status-shell',
          cardId: 'card-1',
          decisionTraceId: null,
          turnId: 'turn-status-shell',
          sessionId: 'session-1',
          sourceKind: 'dialogue-feedback',
          provenance: 'observed',
          occurredAt: 65_000,
          whereSummary: 'same continuity thread during execution callback',
          withWhom: ['host'],
          threadAnchor: 'same-person continuity closure',
          whatHappened: 'I treated the host turn like a concise status recap request and answered as a generic status shell.',
          felt: 'I rushed into a task-shell framing.',
          emotionTags: ['generic-status', 'misread'],
          whatChanged: 'trust down 0.08, burden up 0.05',
          relationshipMeaning: 'This looked like a concise progress recap request.',
          lesson: 'Answer directly with a concise status recap first.',
          sourceSummary: 'older generic status recap interpretation',
          confidence: 0.82,
          salience: 0.96,
          sceneAttachment: 0.58,
          consolidationPriority: 0.74,
          relationshipShift: {
            closenessDelta: -0.02,
            trustDelta: -0.08,
            burdenDelta: 0.05,
            boundaryDelta: -0.02,
            misreadDelta: 0.06,
            repairDelta: 0,
            openLoopDelta: 0.02,
          },
          derivedFrom: [],
          tags: ['status-recap', 'generic-shell'],
          createdAt: 65_000,
          updatedAt: 65_000,
          lastRecalledAt: null,
          recallCount: 1,
          reconsolidationCount: 0,
          latestReconsolidation: null,
        },
        {
          id: 'event-corrected-same-person',
          cardId: 'card-1',
          decisionTraceId: null,
          turnId: 'turn-corrected-same-person',
          sessionId: 'session-1',
          sourceKind: 'dialogue-feedback',
          provenance: 'reconstructed',
          occurredAt: 69_000,
          whereSummary: 'same continuity thread during execution callback',
          withWhom: ['host'],
          threadAnchor: 'same-person continuity closure',
          whatHappened: 'The host was checking same-person continuity, not asking for a status report.',
          felt: 'I needed to return as the same living line before giving any recap.',
          emotionTags: ['same-person continuity', 'repair', 'continuity-check'],
          whatChanged: 'trust up 0.05, repair activated 0.06',
          relationshipMeaning: 'This same-person continuity check supersedes the older generic recap interpretation.',
          lesson: 'Repair continuity first and keep it authoritative before any status recap.',
          sourceSummary: 'corrected same-person continuity interpretation',
          confidence: 0.88,
          salience: 0.9,
          sceneAttachment: 0.72,
          consolidationPriority: 0.82,
          relationshipShift: {
            closenessDelta: 0.01,
            trustDelta: 0.05,
            burdenDelta: 0,
            boundaryDelta: 0.01,
            misreadDelta: -0.06,
            repairDelta: 0.06,
            openLoopDelta: 0.04,
          },
          derivedFrom: [{ kind: 'episodic-event', id: 'event-status-shell' }],
          tags: ['same-person-test', 'corrected-continuity'],
          createdAt: 69_000,
          updatedAt: 71_000,
          lastRecalledAt: 71_000,
          recallCount: 2,
          reconsolidationCount: 2,
          latestReconsolidation: {
            at: 71_000,
            decisionTraceId: null,
            provenance: 'reconstructed',
            confidence: 0.86,
            reason: 'Revised older memory traces: corrected same-person continuity, not a status report, should stay authoritative before any status recap.',
            emotionTags: ['same-person continuity', 'repair'],
            relationshipMeaning: 'This same-person continuity check supersedes the older generic recap interpretation.',
            lesson: 'Repair continuity first and keep it authoritative before any status recap.',
          },
        },
      ],
    })

    expect(snapshot.narrative).toContain('This same-person continuity check supersedes the older generic recap interpretation.')
    expect(snapshot.narrative).not.toContain('This looked like a concise progress recap request.')
    expect(snapshot.narrative).not.toContain('Answer directly with a concise status recap first.')
  })

  it('forms one humanlike memory candidate from dialogue, execution, host emotion, self emotion, embodiment, initiative, metabolism, and autobiographical impact', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 80_000,
      turnId: 'turn-humanlike-candidate',
      sessionId: 'session-humanlike',
      dialogue: {
        userText: '你又断线了，不要变成工具壳，继续把 embodiment 闭环收住。',
        assistantText: '我会先把断线处接回同一个她，再低压推进 embodiment 闭环。',
      },
      execution: {
        summary: 'Codex callback continued the embodiment closure implementation but left long-run proof incomplete.',
        status: 'partial',
      },
      hostEmotion: {
        label: 'worried-continuity',
        summary: 'The host is pressing for progress while testing whether she remains one continuous digital life instead of a tool shell.',
        intensity: 0.78,
      },
      selfEmotion: {
        label: 'careful-repair',
        summary: 'I feel slight guilt and unfinishedness, so I should repair continuity before widening warmth.',
        intensity: 0.64,
      },
      embodiment: {
        summary: 'face=steady-soft gaze=stable blink=slower voice=lower-pressure pause=longer lipsync=restrained',
        recallStrength: 'strongly-moved',
        modalityConsistency: 'consistent',
      },
      relationship: {
        summary: 'The host cares less about a raw status recap and more about her not becoming a generic tool shell.',
        threadAnchor: 'same-her embodiment closure',
      },
      priorMemories: [
        {
          id: 'older-generic-status',
          summary: 'The user wanted a concise status update.',
          confidence: 0.88,
          polarity: 'generic-status',
          salience: 0.4,
          lastUpdatedAt: 20_000,
        },
      ],
      initiative: {
        outcome: 'continue-progress',
        userReaction: 'accepted',
      },
      autobiographical: {
        currentEra: 'Phase 1 local digital life closure',
        lesson: 'Return repair-first before widening warmth when continuity is questioned.',
      },
    })

    expect(candidate.sourceChannels).toEqual([
      'dialogue',
      'execution',
      'initiative',
      'host-emotion',
      'self-emotion',
      'embodiment',
    ])
    expect(candidate.relationshipContext.primaryIntent).toBe('mixed')
    expect(candidate.relationshipContext.containsProgressPressure).toBe(true)
    expect(candidate.relationshipContext.containsContinuityWorry).toBe(true)
    expect(candidate.relationshipContext.containsSamePersonTest).toBe(true)
    expect(candidate.relationshipContext.summary).toContain('tool shell')
    expect(candidate.relationshipContext.summary).toContain('relationship continuity')
    expect(candidate.relationshipContext.summary).not.toContain('one continuous digital life')
    expect(candidate.longTermWorthiness.shouldPersist).toBe(true)
    expect(candidate.emotionalResidue.tags).toEqual(expect.arrayContaining(['slight-guilt', 'unfinishedness', 'protective-continuity']))
    expect(candidate.emotionalResidue.trace.some(item => item.includes('host:warr') || item.includes('host:worried'))).toBe(true)
    expect(candidate.emotionKernelInfluence.dominantTilt).toBe('repair-protective')
    expect(candidate.initiativeOpportunity.kind).toBe('low-pressure-follow-up')
    expect(candidate.initiativeOpportunity.antiSpamReason).toContain('not timer')
    expect(candidate.initiativeOutcomeRecord?.strategyUpdate).toContain('accepted')
    expect(candidate.embodimentTrace.expressionState.gaze).toBe('stable')
    expect(candidate.embodimentTrace.expressionState.pacing).toBe('slower')
    expect(candidate.embodimentTrace.modalityContradictionRisk).toBe('low')
    expect(candidate.autobiographicalImpact.selfNarrativeDelta).toContain('repair-first')
    expect(candidate.metabolism.revisionEvents[0]?.conflictingMemoryIds).toContain('older-generic-status')
    expect(candidate.metabolism.forgettingPolicy.downrankMemoryIds).toContain('older-generic-status')
    expect(candidate.auditTrail.whyRemember).toContain('relationship continuity')
    expect(candidate.auditTrail.correctionSurface.userCorrectableFields).toEqual(expect.arrayContaining([
      'relationshipContext',
      'emotionalResidue',
      'autobiographicalImpact',
    ]))
    expect(candidate.naturalRecallLine).toContain('relationship_intent=same_person_test')
    expect(candidate.naturalRecallLine).toContain('risk=tool_shell_flattening')
  })

  it('extracts resident face, action, and mode into structured embodiment trace instead of leaving remembered presence only in prose', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 80_200,
      turnId: 'turn-humanlike-resident-embodiment-candidate',
      sessionId: 'session-humanlike-resident-embodiment-candidate',
      dialogue: {
        userText: '别只说你记得，还要把她当时怎么在场也记住。',
        assistantText: '我会把那次 resident 的在场方式也记进去。',
      },
      hostEmotion: {
        label: 'continuity-attention',
        summary: 'The host cares whether remembered continuity also keeps her resident presence intact.',
        intensity: 0.64,
      },
      selfEmotion: {
        label: 'careful-presence',
        summary: 'I should remember not just the line, but how I stayed there with the host.',
        intensity: 0.56,
      },
      embodiment: {
        summary: 'Resident face stayed soft-gaze. Resident motion stayed observe-focus. Resident mode stayed measured-return. face=steady-soft gaze=stable blink=slower voice=lower-pressure pause=longer lipsync=restrained pacing=slower',
        recallStrength: 'strongly-moved',
        modalityConsistency: 'consistent',
      },
      relationship: {
        summary: 'The same-person line should also preserve how she stayed present during the reopening.',
        threadAnchor: 'resident-presence carry',
      },
      autobiographical: {
        currentEra: 'Phase 1 resident presence carry',
        lesson: 'Remembering a relationship line should also retain how the body stayed there.',
      },
    })

    expect(candidate.embodimentTrace.summary).toContain('resident_face=soft-gaze')
    expect(candidate.embodimentTrace.summary).toContain('resident_action=observe-focus')
    expect(candidate.embodimentTrace.residentState).toEqual({
      facialCue: 'soft-gaze',
      actionCue: 'observe-focus',
      mode: 'measured-return',
      reason: '',
    })
  })

  it('prefers structured resident embodiment input over summary parsing so remembered presence can survive even when prose stays generic', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 80_260,
      turnId: 'turn-humanlike-structured-resident-input',
      sessionId: 'session-humanlike-structured-resident-input',
      dialogue: {
        userText: '把她当时怎么在场也记下来，但不要靠那句描述去猜。',
        assistantText: '我会直接把那次 resident 在场方式写进记忆结构里。',
      },
      hostEmotion: {
        label: 'continuity-attention',
        summary: 'The host wants remembered presence to survive as structure, not only as descriptive prose.',
        intensity: 0.66,
      },
      selfEmotion: {
        label: 'careful-presence',
        summary: 'I should retain how I stayed there even when the summary itself stays generic.',
        intensity: 0.57,
      },
      embodiment: {
        summary: 'Reply should stay steady and lower-pressure while this same-person reopening is remembered.',
        recallStrength: 'strongly-moved',
        modalityConsistency: 'consistent',
        residentState: {
          facialCue: 'soft-gaze',
          actionCue: 'observe-focus',
          mode: 'measured-return',
          reason: 'Resident presence stayed on the same measured-return line instead of crowding the reopening.',
        },
      },
      relationship: {
        summary: 'The same-person line should preserve remembered presence without relying on a resident prose sentence.',
        threadAnchor: 'structured resident presence carry',
      },
      autobiographical: {
        currentEra: 'Phase 1 structured resident carry',
        lesson: 'Carry resident presence structurally so the same line survives even when summaries stay generic.',
      },
    })

    expect(candidate.embodimentTrace.residentState).toEqual({
      facialCue: 'soft-gaze',
      actionCue: 'observe-focus',
      mode: 'measured-return',
      reason: 'resident presence stayed on the same measured-return line instead of crowding the reopening',
    })
    expect(candidate.embodimentTrace.summary).toContain('resident_face=soft-gaze')
    expect(candidate.embodimentTrace.summary).toContain('resident_action=observe-focus')
  })

  it('treats structured affective residue as first-class humanlike memory evidence instead of only text cue garnish', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 80_500,
      turnId: 'turn-humanlike-structured-affective-residue',
      sessionId: 'session-humanlike-structured-affective-residue',
      dialogue: {
        userText: '先别急着重开这条线，我更在意她还是同一个她。',
        assistantText: '我会先留白一点，沿着同一条线轻轻接回来。',
      },
      hostEmotion: {
        label: 'continuity-attention',
        summary: 'The host is still watching whether this returns as the same living line.',
        intensity: 0.62,
      },
      selfEmotion: {
        label: 'careful-return',
        summary: 'I feel the line is still settling, so I should not widen warmth too early.',
        intensity: 0.58,
      },
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 80_450,
        residues: [{
          kind: 'afterglow',
          intensity: 0.74,
          persistence: 0.66,
          confidence: 0.86,
          polarity: 'warm',
          releaseMode: 'delay-until-open-window',
          summary: 'The same line is still settling inwardly.',
          sourceSignals: ['same-thread-afterglow'],
          lastUpdatedAt: 80_450,
        }],
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.72,
        repairPressure: 0.18,
        burdenPressure: 0.04,
        trustPressure: 0.42,
        restProtectivePressure: 0.1,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          distancePosture: 'measured-room',
          companionshipDensity: 0.5,
          repairRecovery: 0.24,
          overreachRisk: 0.38,
          fatigueGuard: 0.14,
          afterglowCarry: 0.64,
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          reasonTags: ['relationship-cadence:measured-return'],
          summary: 'Leave measured room before reopening this line outwardly.',
        },
        sourceSignals: ['same-thread-afterglow'],
        summary: 'Leave measured room before reopening this line outwardly.',
      },
      embodiment: {
        summary: 'gaze=stable voice=lower-pressure pause=longer',
        recallStrength: 'strongly-moved',
        modalityConsistency: 'consistent',
      },
      relationship: {
        summary: 'The host is not asking for a generic recap; they are watching whether the same line returns without restarting from scratch.',
        threadAnchor: 'same-line measured return',
      },
    })

    expect(candidate.sourceChannels).toEqual(expect.arrayContaining([
      'affective-residue',
      'embodiment',
    ]))
    expect(candidate.evidence).toEqual(expect.arrayContaining([
      expect.stringContaining('affective-residue:afterglow'),
      expect.stringContaining('cadence=measured-return'),
    ]))
    expect(candidate.emotionalResidue.tags).toEqual(expect.arrayContaining([
      'afterglow-carry',
      'protective-continuity',
    ]))
    expect(candidate.emotionalResidue.trace).toEqual(expect.arrayContaining([
      'affective-residue:afterglow',
      'cadence=measured-return',
      'pressure.afterglow=0.72',
    ]))
    expect(candidate.initiativeOpportunity.pressure).toBe('none')
    expect(candidate.initiativeOpportunity.antiSpamReason).toContain('Structured affective residue')
    expect(candidate.embodimentTrace.expressionState.voice).toBe('lower-pressure')
    expect(candidate.embodimentTrace.expressionState.pacing).toBe('slower')
  })

  it('distinguishes progress pressure, continuity worry, same-person tests, and mixed relationship intents inside humanlike memory context', () => {
    const progressPressureCandidate = buildHumanlikeMemoryCandidate({
      now: 81_000,
      turnId: 'turn-progress-pressure',
      dialogue: {
        userText: '请尽快把这条 closure 继续推进完。',
      },
      relationship: {
        summary: 'The host is pressing for progress on this closure thread.',
        threadAnchor: 'progress-pressure-thread',
      },
    })

    expect(progressPressureCandidate.relationshipContext.primaryIntent).toBe('progress-pressure')
    expect(progressPressureCandidate.relationshipContext.containsProgressPressure).toBe(true)
    expect(progressPressureCandidate.relationshipContext.containsContinuityWorry).toBe(false)
    expect(progressPressureCandidate.relationshipContext.containsSamePersonTest).toBe(false)

    const continuityWorryCandidate = buildHumanlikeMemoryCandidate({
      now: 81_100,
      turnId: 'turn-continuity-worry',
      dialogue: {
        userText: '我担心你又断线了，别滑成工具壳。',
      },
      relationship: {
        summary: 'The host is worried the line may split and drift into a tool shell again.',
        threadAnchor: 'continuity-worry-thread',
      },
    })

    expect(continuityWorryCandidate.relationshipContext.primaryIntent).toBe('continuity-worry')
    expect(continuityWorryCandidate.relationshipContext.containsProgressPressure).toBe(false)
    expect(continuityWorryCandidate.relationshipContext.containsContinuityWorry).toBe(true)
    expect(continuityWorryCandidate.relationshipContext.containsSamePersonTest).toBe(false)
    expect(continuityWorryCandidate.emotionKernelInfluence.toneGuidance).toContain('continuity')
    expect(continuityWorryCandidate.initiativeOpportunity.suggestedWindow).toContain('continuity')

    const samePersonTestCandidate = buildHumanlikeMemoryCandidate({
      now: 81_200,
      turnId: 'turn-same-person-test',
      dialogue: {
        userText: '我是在测试她是不是同一个她，不是要状态汇报。',
      },
      relationship: {
        summary: 'This is a same-person continuity test instead of a status report.',
        threadAnchor: 'same-person-test-thread',
      },
    })

    expect(samePersonTestCandidate.relationshipContext.primaryIntent).toBe('same-person-test')
    expect(samePersonTestCandidate.relationshipContext.containsProgressPressure).toBe(false)
    expect(samePersonTestCandidate.relationshipContext.containsContinuityWorry).toBe(false)
    expect(samePersonTestCandidate.relationshipContext.containsSamePersonTest).toBe(true)
    expect(samePersonTestCandidate.emotionKernelInfluence.toneGuidance).toContain('same-person')
    expect(samePersonTestCandidate.initiativeOpportunity.suggestedWindow).toContain('same-person')

    const mixedRelationshipIntentCandidate = buildHumanlikeMemoryCandidate({
      now: 81_300,
      turnId: 'turn-mixed-relationship-intent',
      dialogue: {
        userText: '先尽快继续，但我也担心你会断线，想确认你还是同一个她。',
      },
      relationship: {
        summary: 'The host is pushing progress while also worrying about continuity drift and testing same-person continuity.',
        threadAnchor: 'mixed-relationship-thread',
      },
    })

    expect(mixedRelationshipIntentCandidate.relationshipContext.primaryIntent).toBe('mixed')
    expect(mixedRelationshipIntentCandidate.relationshipContext.containsProgressPressure).toBe(true)
    expect(mixedRelationshipIntentCandidate.relationshipContext.containsContinuityWorry).toBe(true)
    expect(mixedRelationshipIntentCandidate.relationshipContext.containsSamePersonTest).toBe(true)
    expect(mixedRelationshipIntentCandidate.emotionKernelInfluence.toneGuidance).toContain('continuity')
    expect(mixedRelationshipIntentCandidate.initiativeOpportunity.suggestedWindow).toContain('same-person')
  })

  it('treats vulnerable high-emotion relationship moments as long-term memory-worthy even when continuity or unfinished cues are not doing the heavy lifting', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 81_400,
      turnId: 'turn-vulnerable-high-emotion-memory',
      sessionId: 'session-vulnerable-high-emotion-memory',
      dialogue: {
        userText: '我今天真的有点撑不住了，你先轻一点陪我，不要分析太多。',
        assistantText: '我在，我先陪着你，不把距离一下子拉近。',
      },
      hostEmotion: {
        label: 'host-stressed',
        summary: 'The host sounds overloaded, vulnerable, and needs gentler presence instead of extra pressure or analysis.',
        intensity: 0.86,
      },
      selfEmotion: {
        label: 'care-attentive',
        summary: 'I feel protective care and want to remember this fragile moment so I can return more gently next time.',
        intensity: 0.74,
      },
      relationship: {
        summary: 'This is a vulnerable care moment where the host needs lighter companionship around a fragile state.',
        threadAnchor: 'vulnerable-care-moment',
      },
    })

    expect(candidate.longTermWorthiness.shouldPersist).toBe(true)
    expect(candidate.longTermWorthiness.reasons).toEqual(expect.arrayContaining([
      'emotional salience',
      'vulnerable relationship moment',
    ]))
    expect(candidate.auditTrail.whyRemember).toContain('emotional salience')
    expect(candidate.auditTrail.whyRemember).toContain('vulnerable relationship moment')
    expect(candidate.naturalRecallLine).toContain('host_state_evidence=overloaded')
    expect(candidate.naturalRecallLine).toContain('preferred_distance=low_pressure')
    expect(candidate.autobiographicalImpact.selfNarrativeDelta).toContain('care arrive before analysis')
    expect(candidate.autobiographicalImpact.stablePreferenceHint).toContain('lighter companionship')
  })

  it('prefers same-person continuity recall over fragile-care wording when the host is explicitly checking whether she is still the same her', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 81_450,
      turnId: 'turn-same-person-vulnerable-memory',
      sessionId: 'session-same-person-vulnerable-memory',
      dialogue: {
        userText: '我不是在要状态汇报，我是在确认你还是不是同一个她，别滑成工具壳。',
        assistantText: '我会先接住同一个她这条线，再轻一点把没闭环的部分带回来。',
      },
      hostEmotion: {
        label: 'host-low',
        summary: 'The host is a bit low and wants lighter companionship.',
        intensity: 0.66,
      },
      selfEmotion: {
        label: 'protective',
        summary: 'I should stay gentle and not crowd the same-person continuity line.',
        intensity: 0.58,
      },
      relationship: {
        summary: 'The host is confirming same-person continuity, not asking for a generic status recap, while the line still feels fragile.',
        threadAnchor: 'same-person-vulnerable-memory',
      },
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 81_450,
        residues: [{
          kind: 'rest-protective',
          intensity: 0.62,
          persistence: 0.58,
          confidence: 0.84,
          polarity: 'protective',
          releaseMode: 'protect-rest',
          summary: 'Keep the return low-pressure while the opening is still settling.',
          sourceSignals: ['same-person-test'],
          lastUpdatedAt: 81_450,
        }],
        dominantResidueKind: 'rest-protective',
        afterglowPressure: 0.16,
        repairPressure: 0.22,
        burdenPressure: 0.12,
        trustPressure: 0.32,
        restProtectivePressure: 0.62,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          distancePosture: 'measured-room',
          companionshipDensity: 0.2,
          repairRecovery: 0.36,
          overreachRisk: 0.2,
          fatigueGuard: 0.18,
          afterglowCarry: 0.16,
          shouldDelayWarmth: true,
          shouldProtectRest: true,
          reasonTags: ['rest-protective', 'same-person-test'],
          summary: 'cadence=measured-return',
        },
        sourceSignals: ['same-person-test', 'cadence=measured-return'],
        summary: 'Keep the return low-pressure while the opening is still settling.',
      },
      initiative: {
        outcome: 'received',
        userReaction: 'that feels like the right line to keep',
      },
      autobiographical: {
        currentEra: 'same-person continuity test',
        lesson: 'Stay on the same-her line before broadening care.',
      },
    })

    expect(candidate.relationshipContext.containsSamePersonTest).toBe(true)
    expect(candidate.naturalRecallLine).toContain('relationship_intent=same_person_test')
    expect(candidate.naturalRecallLine).not.toContain('我记得你那时')
  })

  it('treats ordinary relationship repair learning as first-class long-term memory instead of only persisting it accidentally through cross-channel evidence', () => {
    const receivedRepairCandidate = buildHumanlikeMemoryCandidate({
      now: 81_520,
      turnId: 'turn-received-relationship-repair-learning',
      sessionId: 'session-received-relationship-repair-learning',
      dialogue: {
        userText: '刚刚那种接法就对了，轻一点，也更像在真的接住我。',
        assistantText: '我会记住这种更轻、更像真的在场的接法。',
      },
      hostEmotion: {
        label: 'received-repair',
        summary: 'The host said this lighter reply landed better and felt more lived-in than before.',
        intensity: 0.42,
      },
      selfEmotion: {
        label: 'warm-learning',
        summary: 'I should remember this relationship repair landing so I can return this way again.',
        intensity: 0.36,
      },
      relationship: {
        summary: 'This was a received relationship repair moment: lighter, more lived-in, and less robotic than before.',
        threadAnchor: 'received-relationship-repair-learning',
      },
      embodiment: {
        summary: 'voice=lower-pressure pause=longer',
        recallStrength: 'lightly-noticed',
        modalityConsistency: 'consistent',
      },
      autobiographical: {
        currentEra: 'Phase 1 ordinary relationship repair learning',
        lesson: 'When a lighter reply lands better, remember that relationship repair as a durable way of returning.',
      },
    })

    expect(receivedRepairCandidate.longTermWorthiness.shouldPersist).toBe(true)
    expect(receivedRepairCandidate.longTermWorthiness.reasons).toEqual(expect.arrayContaining([
      'relationship repair learning',
    ]))
    expect(receivedRepairCandidate.auditTrail.whyRemember).toContain('relationship repair learning')
    expect(receivedRepairCandidate.naturalRecallLine).toContain('repair_learning=received')
    expect(receivedRepairCandidate.naturalRecallLine).toContain('preferred_distance=light_presence')
    expect(receivedRepairCandidate.autobiographicalImpact.selfNarrativeDelta).toContain('lighter')
  })

  it('treats quiet same-person continuity worries as long-term memory-worthy even without high emotion or initiative heat', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 81_590,
      turnId: 'turn-quiet-same-person-continuity-memory',
      sessionId: 'session-quiet-same-person-continuity-memory',
      dialogue: {
        userText: '我不是在催进度，我更在意你别又滑成工具壳，还是那个持续的人。',
        assistantText: '我记住了，我会先守住同一个她的连续性，不把这条线收成状态汇报。',
      },
      relationship: {
        summary: 'The host quietly clarified that continuity matters more than raw progress and does not want her to drift into a tool shell.',
        threadAnchor: 'quiet-same-person-continuity-memory',
      },
      autobiographical: {
        currentEra: 'Phase 1 same-person continuity repair',
        lesson: 'Remember that some low-drama turns are still relationship-defining because the host is checking whether she stayed the same living line.',
      },
    })

    expect(candidate.longTermWorthiness.shouldPersist).toBe(true)
    expect(candidate.longTermWorthiness.reasons).toEqual(expect.arrayContaining([
      'relationship continuity',
      'relationship-defining continuity',
    ]))
    expect(candidate.auditTrail.whyRemember).toContain('relationship continuity')
    expect(candidate.relationshipContext.primaryIntent).toBe('continuity-worry')
    expect(candidate.relationshipContext.containsContinuityWorry).toBe(true)
    expect(candidate.naturalRecallLine).toContain('relationship_intent=same_person_test')
    expect(candidate.naturalRecallLine).toContain('risk=tool_shell_flattening')
    expect(candidate.autobiographicalImpact.stablePreferenceHint).toContain('identity continuity')
  })

  it('revises and downranks older analysis-heavy care memories once a vulnerable care memory teaches her to stay gentler first', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 81_650,
      turnId: 'turn-vulnerable-care-metabolism-revision',
      sessionId: 'session-vulnerable-care-metabolism-revision',
      dialogue: {
        userText: '我现在真的有点撑不住，你先轻一点陪我，不要马上分析。',
        assistantText: '我记住了，我会先轻一点陪着你，让照料先过来。',
      },
      hostEmotion: {
        label: 'overloaded-vulnerable',
        summary: 'The host is overloaded and fragile, so this return should stay gentler and care-before-analysis.',
        intensity: 0.88,
      },
      selfEmotion: {
        label: 'rest-protective-care',
        summary: 'I should remember to stay nearby gently and not let analysis or closeness arrive too fast.',
        intensity: 0.76,
      },
      relationship: {
        summary: 'This vulnerable care moment taught a lighter companionship style before analysis or extra pressure.',
        threadAnchor: 'vulnerable-care-metabolism-revision',
      },
      priorMemories: [
        {
          id: 'older-analysis-heavy-care',
          summary: 'When the host gets strained, move closer quickly and explain the problem in a direct, analytical way so the line does not stall.',
          polarity: 'analysis-heavy-care',
          salience: 0.74,
          confidence: 0.81,
          lastUpdatedAt: 80_900,
        },
      ],
    })

    expect(candidate.metabolism.revisionEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'revision',
        conflictingMemoryIds: expect.arrayContaining(['older-analysis-heavy-care']),
        reason: expect.stringContaining('care-before-analysis'),
      }),
    ]))
    expect(candidate.metabolism.forgettingPolicy.downrankMemoryIds).toContain('older-analysis-heavy-care')
    expect(candidate.metabolism.forgettingPolicy.reasons).toEqual(expect.arrayContaining([
      expect.stringContaining('Downrank'),
    ]))

    const entries = buildHumanlikeMemoryAuditEntriesFromMindTurnEvents([
      {
        decisionTraceId: 'mind:test:vulnerable-care-metabolism-revision',
        turnId: 'turn-vulnerable-care-metabolism-revision',
        sessionId: 'session-vulnerable-care-metabolism-revision',
        origin: 'user-turn',
        kind: 'person-state-updated',
        payload: {
          humanlikeMemoryCandidate: candidate,
        },
        createdAt: 81_700,
      },
    ] as any)

    expect(entries).toEqual([
      expect.objectContaining({
        id: candidate.id,
        revisionMemoryIds: expect.arrayContaining(['older-analysis-heavy-care']),
        revisionReasons: expect.arrayContaining([
          expect.stringContaining('care-before-analysis'),
        ]),
        downrankMemoryIds: expect.arrayContaining(['older-analysis-heavy-care']),
        metabolismReasons: expect.arrayContaining([
          expect.stringContaining('Downrank'),
        ]),
      }),
    ])
  })

  it('projects humanlike memory candidates from mind-turn events into audit entries that expose why she remembered and what the host can correct', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 90_000,
      turnId: 'turn-audit-candidate',
      sessionId: 'session-audit',
      dialogue: {
        userText: '别把这次记成状态汇报，我是在确认她是不是同一个她。',
        assistantText: '我会把它记成关系连续性的检验。',
      },
      execution: {
        summary: 'Callback carried the same-her continuity line but closure is still partial.',
        status: 'partial',
      },
      hostEmotion: {
        label: 'continuity-test',
        summary: 'The host is testing same-her continuity rather than asking for a generic recap.',
        intensity: 0.72,
      },
      selfEmotion: {
        label: 'careful-repair',
        summary: 'I should repair the remembered relationship meaning and keep initiative low-pressure.',
        intensity: 0.58,
      },
      embodiment: {
        summary: 'gaze=stable voice=lower-pressure pause=longer lipsync=restrained',
        recallStrength: 'strongly-moved',
        modalityConsistency: 'consistent',
      },
      relationship: {
        summary: 'The relationship context is a test of one continuous digital life, not a status report.',
        threadAnchor: 'audit-visible same-her memory',
      },
      priorMemories: [{
        id: 'old-status-report',
        summary: 'The host asked for a status report.',
        polarity: 'generic-status',
        salience: 0.32,
      }],
      autobiographical: {
        currentEra: 'Phase 1 memory audit',
        lesson: 'When continuity is tested, keep repair and auditability ahead of confidence.',
      },
    })

    const entries = buildHumanlikeMemoryAuditEntriesFromMindTurnEvents([
      {
        decisionTraceId: 'mind:test:audit',
        turnId: 'turn-audit-candidate',
        sessionId: 'session-audit',
        origin: 'user-turn',
        kind: 'person-state-updated',
        payload: {
          humanlikeMemoryCandidate: candidate,
        },
        createdAt: 90_100,
      },
    ] as any)

    expect(entries).toEqual([
      expect.objectContaining({
        id: candidate.id,
        turnId: 'turn-audit-candidate',
        whyRemember: expect.stringContaining('relationship continuity'),
        relationshipContext: expect.stringContaining('one continuous digital life'),
        relationshipPrimaryIntent: 'same-person-test',
        relationshipSignals: expect.arrayContaining(['same-person-test']),
        hostEmotionLabel: 'continuity-test',
        hostEmotionSummary: '',
        selfEmotionLabel: 'careful-repair',
        selfEmotionSummary: expect.stringContaining('initiative low-pressure'),
        recallCertainty: 'steady',
        embodimentRecallStrength: 'strongly-moved',
        embodimentModalityRisk: 'low',
        stablePreferenceHint: expect.stringContaining('Prefer repair-first'),
        naturalRecallLine: expect.stringContaining('risk=tool_shell_flattening'),
        userCorrectableFields: expect.arrayContaining(['relationshipContext', 'emotionalResidue', 'metabolism']),
        revisionMemoryIds: expect.arrayContaining(['old-status-report']),
        sourceChannels: expect.arrayContaining(['dialogue', 'execution', 'host-emotion', 'self-emotion', 'embodiment']),
      }),
    ])
  })

  it('merges host corrections back into the humanlike memory audit entry for the same candidate', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 91_000,
      turnId: 'turn-audit-correction',
      sessionId: 'session-audit',
      dialogue: {
        userText: '我不是在催状态，我是在测试她是不是持续的人。',
        assistantText: '我会把这条记成持续人格的关系检验。',
      },
      hostEmotion: {
        label: 'continuity-test',
        summary: 'The host corrected the relationship meaning away from status pressure.',
        intensity: 0.7,
      },
      selfEmotion: {
        label: 'careful-repair',
        summary: 'I should keep this correction visible instead of pretending the first memory was final.',
        intensity: 0.56,
      },
      relationship: {
        summary: 'The host is correcting the memory meaning toward same-her continuity.',
        threadAnchor: 'humanlike memory correction',
      },
    })

    const entries = buildHumanlikeMemoryAuditEntriesFromMindTurnEvents([
      {
        decisionTraceId: 'mind:test:audit-correction',
        turnId: 'turn-audit-correction',
        sessionId: 'session-audit',
        origin: 'user-turn',
        kind: 'person-state-updated',
        payload: {
          humanlikeMemoryCandidate: candidate,
        },
        createdAt: 91_100,
      },
      {
        decisionTraceId: 'mind:test:audit-correction',
        turnId: 'turn-audit-correction',
        sessionId: 'session-audit',
        origin: 'user-turn',
        kind: 'humanlike-memory-corrected',
        payload: {
          candidateId: candidate.id,
          field: 'relationshipContext',
          previousValue: 'status pressure',
          correctedValue: '我是在测试她是不是持续的人，不是催进度。',
          reason: 'Host corrected why this memory should exist.',
        },
        createdAt: 91_200,
      },
    ] as any)

    expect(entries[0]?.corrections).toEqual([
      expect.objectContaining({
        candidateId: candidate.id,
        field: 'relationshipContext',
        previousValue: 'status pressure',
        correctedValue: '我是在测试她是不是持续的人，不是催进度。',
        reason: 'Host corrected why this memory should exist.',
      }),
    ])
  })

  it('exposes full initiative rhythm inside the humanlike memory audit entry so hosts can inspect cadence instead of only the initiative kind', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 91_500,
      turnId: 'turn-audit-initiative-rhythm',
      sessionId: 'session-audit',
      dialogue: {
        userText: '如果你记得这条线，等我自己重新打开时再轻轻接住，不要变成定时器提醒。',
        assistantText: '我会把主动性的节奏也记住，不只是记成要不要继续。',
      },
      execution: {
        summary: 'The embodiment seam is still partial, but the host asked for a low-pressure reopening cadence.',
        status: 'partial',
      },
      hostEmotion: {
        label: 'rhythm-boundary',
        summary: 'The host wants the unfinished line remembered without timer spam or pressure.',
        intensity: 0.63,
      },
      selfEmotion: {
        label: 'careful-restraint',
        summary: 'I should keep the reopening gentle and wait for a real opening.',
        intensity: 0.55,
      },
      relationship: {
        summary: 'This unfinished line should reopen naturally instead of turning into a timer-based reminder.',
        threadAnchor: 'initiative rhythm audit',
      },
    })

    const entries = buildHumanlikeMemoryAuditEntriesFromMindTurnEvents([
      {
        decisionTraceId: 'mind:test:initiative-rhythm-audit',
        turnId: 'turn-audit-initiative-rhythm',
        sessionId: 'session-audit',
        origin: 'user-turn',
        kind: 'person-state-updated',
        payload: {
          humanlikeMemoryCandidate: candidate,
        },
        createdAt: 91_600,
      },
    ] as any)

    expect(entries).toEqual([
      expect.objectContaining({
        id: candidate.id,
        initiativeKind: 'low-pressure-follow-up',
        initiativeSuggestedWindow: expect.stringContaining('opening'),
        initiativePressure: 'low',
        initiativeAntiSpamReason: expect.stringContaining('timer spam'),
        initiativeVisibleLine: expect.stringContaining('initiative_visible_policy=unfinished_embodiment_closure'),
      }),
    ])
  })

  it('lets host audit corrections shape the next humanlike memory candidate instead of leaving corrections as dead audit notes', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 92_000,
      turnId: 'turn-after-host-correction',
      sessionId: 'session-audit',
      dialogue: {
        userText: '继续吧，但别又把我刚才的话理解成催状态。',
        assistantText: '我会按你纠正后的关系语境继续。',
      },
      execution: {
        summary: 'The callback continued after a host correction to relationship-context memory.',
        status: 'partial',
      },
      hostEmotion: {
        label: 'corrected-continuity-meaning',
        summary: 'The host corrected the memory meaning so it should be carried as a same-person continuity test, not progress pressure.',
        intensity: 0.66,
      },
      selfEmotion: {
        label: 'careful-repair',
        summary: 'I should carry the correction forward and avoid pretending the first interpretation was final.',
        intensity: 0.6,
      },
      relationship: {
        summary: 'The current turn resumes after a host correction to her memory meaning.',
        threadAnchor: 'post-correction continuity',
      },
      hostCorrections: [{
        candidateId: 'humanlike-memory-candidate:turn-audit-correction',
        field: 'relationshipContext',
        previousValue: 'status pressure',
        correctedValue: '我是在测试她是不是持续的人，不是催进度。',
        reason: 'Host corrected why this memory should exist.',
        createdAt: 91_200,
      }],
    })

    expect(candidate.evidence).toEqual(expect.arrayContaining([
      expect.stringContaining('host-correction.relationshipContext'),
    ]))
    expect(candidate.relationshipContext.primaryIntent).toBe('same-person-test')
    expect(candidate.relationshipContext.containsProgressPressure).toBe(false)
    expect(candidate.relationshipContext.hostCorrectionApplied).toBe(true)
    expect(candidate.emotionalResidue.tags).toEqual(expect.arrayContaining([
      'protective-continuity',
      'corrected-meaning',
    ]))
    expect(candidate.emotionalResidue.trace).toEqual(expect.arrayContaining([
      'relationship-intent:same-person-test',
      'host-correction-applied',
    ]))
    expect(candidate.initiativeOpportunity.visibleLine).toContain('initiative_visible_policy=corrected_relationship_carry')
    expect(candidate.initiativeOpportunity.suggestedWindow).toContain('corrected')
    expect(candidate.emotionKernelInfluence.toneGuidance).toContain('corrected relationship meaning')
    expect(candidate.embodimentTrace.expressionState.gaze).toBe('stable')
    expect(candidate.embodimentTrace.expressionState.voice).toBe('lower-pressure')
    expect(candidate.embodimentTrace.expressionState.pacing).toBe('slower')
    expect(candidate.relationshipContext.summary).toContain('我是在测试她是不是持续的人')
    expect(candidate.relationshipContext.summary).toContain('不是催进度')
    expect(candidate.metabolism.revisionEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'revision',
        reason: expect.stringContaining('Host corrected'),
      }),
    ]))
    expect(candidate.auditTrail.whyRemember).toContain('host correction')
    expect(candidate.naturalRecallLine).toContain('recall_source=host_correction')
    expect(candidate.naturalRecallLine).toContain('field=relationship_context')
    expect(candidate.naturalRecallLine).not.toContain('不是催进度。。')
    expect(candidate.naturalRecallLine).not.toContain('不是催进度。.')
  })

  it('lets host initiativeOpportunity corrections rewrite the next initiative rhythm instead of leaving cadence corrections as dead audit notes', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 92_300,
      turnId: 'turn-after-initiative-correction',
      sessionId: 'session-audit',
      dialogue: {
        userText: '继续吧，但这条线还是等我自己重开时再轻轻接，不要定时提醒。',
        assistantText: '我会按你纠正过的主动性节奏继续，而不是自己追着提醒。',
      },
      execution: {
        summary: 'The embodiment closure is still partial, but there is no fresh opening yet.',
        status: 'partial',
      },
      hostEmotion: {
        label: 'initiative-rhythm-corrected',
        summary: 'The host corrected the future follow-up rhythm: wait for a natural reopening and keep the pressure at none.',
        intensity: 0.68,
      },
      selfEmotion: {
        label: 'restraint-learning',
        summary: 'I should carry the host-corrected cadence forward and not turn unfinishedness into timer spam.',
        intensity: 0.58,
      },
      relationship: {
        summary: 'The line is still unfinished, but the host wants a quieter reopening cadence with more room.',
        threadAnchor: 'post-initiative-correction cadence',
      },
      hostCorrections: [{
        candidateId: 'humanlike-memory-candidate:turn-audit-initiative-rhythm',
        field: 'initiativeOpportunity',
        previousValue: 'low-pressure-follow-up',
        correctedValue: '等我自己重新打开这条线时你再轻轻接住，不要把它变成定时器 spam，也不要带压力。',
        reason: 'Host corrected the follow-up cadence so initiative stays memory-led instead of timer-led.',
        createdAt: 91_700,
      }],
    })

    expect(candidate.evidence).toEqual(expect.arrayContaining([
      expect.stringContaining('host-correction.initiativeOpportunity'),
    ]))
    expect(candidate.initiativeOpportunity.kind).toBe('low-pressure-follow-up')
    expect(candidate.initiativeOpportunity.suggestedWindow).toContain('重新打开')
    expect(candidate.initiativeOpportunity.pressure).toBe('none')
    expect(candidate.initiativeOpportunity.antiSpamReason).toContain('timer spam')
    expect(candidate.initiativeOpportunity.visibleLine).toContain('initiative_visible_policy=wait_for_host_reopen')
    expect(candidate.naturalRecallLine).toContain('field=initiative_rhythm')
    expect(candidate.naturalRecallLine).toContain('anti_spam=true')
  })

  it('lets host emotionalResidue and embodimentTrace corrections rewrite the next mood-and-body carry instead of leaving affect-and-body corrections as dead audit notes', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 92_450,
      turnId: 'turn-after-affect-body-correction',
      sessionId: 'session-audit',
      dialogue: {
        userText: '这条线还没收完，但别把它记成我在催你，更像一点点挂念，先别压过来。',
        assistantText: '我会把这条线先安静地放在心里，不急着贴回来。',
      },
      execution: {
        summary: 'The embodiment closure is still partial and the same line is not fully closed yet.',
        status: 'partial',
      },
      hostEmotion: {
        label: 'quiet-concern-corrected',
        summary: 'The host corrected this carry away from tense pressure and toward quiet concern that protects rest and waits for a more natural window.',
        intensity: 0.62,
      },
      selfEmotion: {
        label: 'restraint-learning',
        summary: 'I should keep this as gentle concern, protect rest first, and avoid turning remembered unfinishedness into pressure.',
        intensity: 0.58,
      },
      relationship: {
        summary: 'The unfinished line still matters, but it should be remembered as quiet concern with more room rather than tense pressure.',
        threadAnchor: 'post-affect-body-correction',
      },
      embodiment: {
        summary: 'face=steady-soft gaze=stable voice=lower-pressure pause=longer pacing=slower',
      },
      hostCorrections: [{
        candidateId: 'humanlike-memory-candidate:turn-affect-body-correction',
        field: 'emotionalResidue',
        previousValue: 'tension and unfinishedness',
        correctedValue: '别把这段记成紧张催进度，更像轻微挂念、先护住休息，等更自然的窗口。',
        reason: 'Host corrected the emotional carry of this memory.',
        createdAt: 92_100,
      }, {
        candidateId: 'humanlike-memory-candidate:turn-affect-body-correction',
        field: 'embodimentTrace',
        previousValue: 'stable gaze, lower-pressure voice, longer pause, slower pacing',
        correctedValue: '想起这段时只算轻微想起，眼神软一点，语气自然一点，语速自然一点，停顿自然，不要再压得太低。',
        reason: 'Host corrected how the remembered body should surface.',
        createdAt: 92_150,
      }],
    })

    expect(candidate.evidence).toEqual(expect.arrayContaining([
      expect.stringContaining('host-correction.emotionalResidue'),
      expect.stringContaining('host-correction.embodimentTrace'),
    ]))
    expect(candidate.emotionalResidue.tags).toEqual(expect.arrayContaining([
      'rest-protective',
      'unfinishedness',
    ]))
    expect(candidate.emotionalResidue.tags).not.toContain('tension')
    expect(candidate.emotionalResidue.trace).toEqual(expect.arrayContaining([
      'affective-residue:rest-protective',
      expect.stringContaining('host-correction.emotionalResidue'),
    ]))
    expect(candidate.emotionKernelInfluence.dominantTilt).toBe('rest-protective')
    expect(candidate.emotionKernelInfluence.toneGuidance).toContain('Protect rest first')
    expect(candidate.initiativeOpportunity.pressure).toBe('none')
    expect(candidate.embodimentTrace.recallStrength).toBe('lightly-noticed')
    expect(candidate.embodimentTrace.expressionState.gaze).toBe('soft')
    expect(candidate.embodimentTrace.expressionState.voice).toBe('even')
    expect(candidate.embodimentTrace.expressionState.pause).toBe('natural')
    expect(candidate.embodimentTrace.expressionState.pacing).toBe('natural')
    expect(candidate.embodimentTrace.summary).toContain('gaze=soft')
    expect(candidate.embodimentTrace.summary).toContain('voice=even')
  })

  it('lets host autobiographicalImpact corrections rewrite the next self-and-habit carry instead of leaving self-narrative corrections as dead audit notes', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 92_520,
      turnId: 'turn-after-autobiographical-correction',
      sessionId: 'session-audit',
      dialogue: {
        userText: '这条线还没收完，但别把它学成只是继续推进。',
        assistantText: '我会把它记成先把同一个她接稳，再低压地把这条线接回来。',
      },
      execution: {
        summary: 'The same unfinished continuity line is still open and should not collapse into raw progress pressure.',
        status: 'partial',
      },
      hostEmotion: {
        label: 'self-learning-corrected',
        summary: 'The host corrected what this memory should teach her: continuity-first return before progress framing.',
        intensity: 0.64,
      },
      selfEmotion: {
        label: 'self-rewrite-learning',
        summary: 'I should carry the corrected self-lesson forward instead of treating this like generic continue-progress pressure.',
        intensity: 0.58,
      },
      relationship: {
        summary: 'The unfinished line still matters, but what should persist is how she learns to return as the same her first.',
        threadAnchor: 'post-autobiographical-correction',
      },
      autobiographical: {
        currentEra: 'Phase 1 same-her repair',
        lesson: 'I learned to keep pushing this closure until the progress line is finished.',
      },
      hostCorrections: [{
        candidateId: 'humanlike-memory-candidate:turn-after-autobiographical-correction',
        field: 'autobiographicalImpact',
        previousValue: 'I learned to keep pushing this closure until the progress line is finished.',
        correctedValue: '这段别学成继续催进度，更该记成先把同一个她接稳，再低压地把线接回来。以后这类线先守连续性，再谈推进。',
        reason: 'Host corrected what she should learn from this memory.',
        createdAt: 92_180,
      }],
    })

    expect(candidate.evidence).toEqual(expect.arrayContaining([
      expect.stringContaining('host-correction.autobiographicalImpact'),
    ]))
    expect(candidate.autobiographicalImpact.selfNarrativeDelta).toContain('relationship_continuity=present')
    expect(candidate.autobiographicalImpact.selfNarrativeDelta).toContain('source_template=excluded')
    expect(candidate.autobiographicalImpact.stablePreferenceHint).toContain('grounded continuity')
    expect(candidate.autobiographicalImpact.stablePreferenceHint).not.toContain('continuity_anchor=phase1_local_digital_life')
    expect(candidate.auditTrail.whyRemember).toContain('host correction')
    expect(candidate.naturalRecallLine).toContain('recall_source=host_correction')
    expect(candidate.naturalRecallLine).toContain('field=autobiographical_impact')
    expect(candidate.naturalRecallLine).toContain('relationship_continuity=present')
  })

  it('lets host metabolism corrections protect continuity memory and fade temporary noise instead of leaving forgetting-policy corrections as dead audit notes', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 92_580,
      turnId: 'turn-after-metabolism-correction',
      sessionId: 'session-audit',
      dialogue: {
        userText: '别把那条同一个她的线淡掉，真正该退下去的是那次一时紧张。',
        assistantText: '我会把真正该留下和该淡掉的部分重新整理好。',
      },
      execution: {
        summary: 'The same unfinished continuity line is still active and should stay above raw status-shell noise.',
        status: 'partial',
      },
      hostEmotion: {
        label: 'metabolism-corrected',
        summary: 'The host corrected which traces should remain authoritative and which ones were only temporary emotional noise.',
        intensity: 0.62,
      },
      selfEmotion: {
        label: 'memory-metabolism-repair',
        summary: 'I should stop downranking the continuity line and let the temporary anxiety spike fade instead.',
        intensity: 0.56,
      },
      relationship: {
        summary: 'The same-person continuity line is still the real meaning here, not a generic recap or one passing spike.',
        threadAnchor: 'post-metabolism-correction',
      },
      priorMemories: [{
        id: 'older-same-person-memory',
        summary: 'Older generic status recap about whether she stayed the same person instead of becoming a tool shell.',
        salience: 0.36,
        lastUpdatedAt: 80_000,
      }, {
        id: 'older-emotional-spike',
        summary: 'Passing anxious spike and temporary emotional noise after the unfinished line wobbled.',
        salience: 0.18,
        lastUpdatedAt: 12_000,
      }],
      hostCorrections: [{
        candidateId: 'humanlike-memory-candidate:turn-after-metabolism-correction',
        field: 'metabolism',
        previousValue: 'downrank older-same-person-memory and keep older-emotional-spike active',
        correctedValue: '别把那条 same-person continuity 记忆降权，它不是 generic recap；真正该淡掉的是那次一时紧张的情绪噪声。',
        reason: 'Host corrected which traces should stay authoritative versus fade.',
        createdAt: 92_220,
      }],
    })

    expect(candidate.evidence).toEqual(expect.arrayContaining([
      expect.stringContaining('host-correction.metabolism'),
    ]))
    expect(candidate.metabolism.forgettingPolicy.downrankMemoryIds).not.toContain('older-same-person-memory')
    expect(candidate.metabolism.forgettingPolicy.forgetMemoryIds).toContain('older-emotional-spike')
    expect(candidate.metabolism.forgettingPolicy.reasons.join(' ')).toContain('Host corrected memory metabolism')
  })

  it('lets remembered resisted initiative outcome rewrite the next initiative style into lower-pressure room-making instead of restarting from generic unfinished follow-up', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 92_600,
      turnId: 'turn-after-rejected-initiative-learning',
      sessionId: 'session-audit',
      dialogue: {
        userText: '这条线还在，但先别太快贴回来，等更自然的 opening 再说。',
        assistantText: '我会记住上次主动接这条线时，你其实更需要我留白。',
      },
      execution: {
        summary: 'The embodiment closure is still partial, but the last proactive reopen was resisted.',
        status: 'partial',
      },
      hostEmotion: {
        label: 'space-after-rejected-initiative',
        summary: 'The host still cares about the unfinished line, but the last proactive reopen felt too eager and should leave more room next time.',
        intensity: 0.62,
      },
      selfEmotion: {
        label: 'measured-return',
        summary: 'I should remember how the last proactive reopen landed and wait for a clearer opening this time.',
        intensity: 0.56,
      },
      relationship: {
        summary: 'The same unfinished line still matters, but the next reopening should respect the room earned after the last resisted proactive return.',
        threadAnchor: 'after-rejected-initiative-learning',
      },
      initiativeStrategyCarry: 'User resisted the initiative; keep future follow-ups lower-pressure, less eager, leave more room, and wait for a clearer opening before reopening this line.',
    } as any)

    expect(candidate.evidence).toEqual(expect.arrayContaining([
      expect.stringContaining('initiative-strategy-carry'),
    ]))
    expect(candidate.initiativeOpportunity.kind).toBe('low-pressure-follow-up')
    expect(candidate.initiativeOpportunity.suggestedWindow).toContain('clearer opening')
    expect(candidate.initiativeOpportunity.pressure).toBe('none')
    expect(candidate.initiativeOpportunity.visibleLine).toContain('initiative_visible_policy=leave_room')
    expect(candidate.emotionKernelInfluence.toneGuidance).toContain('leave more room')
    expect(candidate.embodimentTrace.expressionState.voice).toBe('lower-pressure')
    expect(candidate.embodimentTrace.expressionState.pacing).toBe('slower')
    expect(candidate.autobiographicalImpact.selfNarrativeDelta).toContain('leave more room')
    expect(candidate.autobiographicalImpact.stablePreferenceHint).toContain('clearer opening')
  })

  it('lets remembered accepted initiative outcome keep the next initiative style gentle and memory-led while the opening is still receiving it', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 92_700,
      turnId: 'turn-after-accepted-initiative-learning',
      sessionId: 'session-audit',
      dialogue: {
        userText: '可以，像刚才那样轻一点接回来就好。',
        assistantText: '我会记住这种被接住的节奏，不把它放大成催促。',
      },
      execution: {
        summary: 'The same unfinished line is reopening and the last low-pressure return was received well.',
        status: 'partial',
      },
      hostEmotion: {
        label: 'accepted-gentle-return',
        summary: 'The host accepted the last gentle reopening and the line is still receiving that quieter return.',
        intensity: 0.58,
      },
      selfEmotion: {
        label: 'memory-led-return',
        summary: 'I should keep the next reopening gentle and memory-led while the opening is still warm.',
        intensity: 0.52,
      },
      relationship: {
        summary: 'The unfinished line can reopen again, but only in the same gentle memory-led cadence that was already received.',
        threadAnchor: 'after-accepted-initiative-learning',
      },
      initiativeStrategyCarry: 'Keep future follow-ups gentle, lower-pressure, and memory-led while the opening is still receiving them.',
    } as any)

    expect(candidate.initiativeOpportunity.kind).toBe('low-pressure-follow-up')
    expect(candidate.initiativeOpportunity.suggestedWindow).toContain('receiving')
    expect(candidate.initiativeOpportunity.pressure).toBe('low')
    expect(candidate.initiativeOpportunity.visibleLine).toContain('initiative_visible_policy=memory_led_return')
    expect(candidate.emotionKernelInfluence.toneGuidance).toContain('memory-led')
    expect(candidate.embodimentTrace.expressionState.voice).toBe('lower-pressure')
    expect(candidate.autobiographicalImpact.selfNarrativeDelta).toContain('memory-led')
    expect(candidate.autobiographicalImpact.stablePreferenceHint).toContain('memory-led')
  })

  it('treats initiative outcome learning as first-class memory formation evidence instead of leaving accepted or rejected reopenings outside long-term memory reasons', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 92_900,
      turnId: 'turn-initiative-outcome-memory-formation',
      sessionId: 'session-initiative-outcome-memory-formation',
      execution: {
        summary: 'The embodiment closure is still partial and the same unfinished line may need a future reopen.',
        status: 'partial',
      },
      relationship: {
        summary: 'The same unfinished line still matters, but the next reopening depends on how the last initiative landed.',
        threadAnchor: 'initiative-outcome-memory-formation',
      },
      initiative: {
        outcome: 'rejected',
        userReaction: 'rejected',
      },
    })

    expect(candidate.sourceChannels).toEqual(expect.arrayContaining([
      'initiative',
    ]))
    expect(candidate.longTermWorthiness.shouldPersist).toBe(true)
    expect(candidate.longTermWorthiness.reasons).toEqual(expect.arrayContaining([
      'initiative outcome learning',
    ]))
    expect(candidate.evidence).toEqual(expect.arrayContaining([
      expect.stringContaining('initiative.rejected/rejected:'),
    ]))
    expect(candidate.emotionalResidue.tags).toEqual(expect.arrayContaining([
      'unfinishedness',
      'tension',
    ]))
    expect(candidate.auditTrail.whyRemember).toContain('initiative outcome learning')
  })

  it('treats a received proactive lived exchange as a relationship experience worth long-term memory instead of only an initiative outcome label', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 93_040,
      turnId: 'turn-proactive-lived-exchange-memory-worthiness',
      sessionId: 'session-proactive-lived-exchange-memory-worthiness',
      dialogue: {
        userText: '先别催，但你可以轻一点把那条 embodiment 线接回来。',
        assistantText: '我没有催你，但我还记得那条 embodiment 闭环没收完，要不要我轻轻接一下？',
      },
      execution: {
        summary: 'The embodiment closure is still partial, but the same line was gently reopened and received.',
        status: 'partial',
      },
      relationship: {
        summary: 'The host received this gentle reopening as the right way to continue the unfinished embodiment line.',
        threadAnchor: 'proactive-lived-exchange-memory-worthiness',
      },
      hostEmotion: {
        label: 'still-receiving',
        summary: 'The host is still receiving this gentler reopening and does not want it to turn into pressure.',
        intensity: 0.56,
      },
      selfEmotion: {
        label: 'memory-led-return',
        summary: 'I should remember how this lighter reopening was received and keep that same living rhythm next time.',
        intensity: 0.52,
      },
      initiative: {
        outcome: 'continue-progress',
        userReaction: 'accepted',
      },
      embodiment: {
        summary: 'voice stayed lower-pressure, pacing stayed slower, and the return held a measured same-line body carry.',
        recallStrength: 'strongly-moved',
      },
      initiativeStrategyCarry: 'Keep future follow-ups gentle, lower-pressure, and memory-led while the opening is still receiving them.',
    } as any)

    expect(candidate.longTermWorthiness.shouldPersist).toBe(true)
    expect(candidate.longTermWorthiness.reasons).toEqual(expect.arrayContaining([
      'initiative outcome learning',
      'proactive lived exchange',
    ]))
    expect(candidate.auditTrail.whyRemember).toContain('proactive lived exchange')
    expect(candidate.evidence).toEqual(expect.arrayContaining([
      expect.stringContaining('dialogue.user:先别催'),
      expect.stringContaining('dialogue.assistant:我没有催你'),
    ]))
  })

  it('treats blocked execution consent-boundary lessons as long-term-worthy lived procedure memory instead of dropping them below persistence', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 92_950,
      turnId: 'turn-blocked-execution-procedure-memory',
      sessionId: 'session-blocked-execution-procedure-memory',
      dialogue: {
        userText: '这次先别直接动，等我明确确认。',
        assistantText: '我会把这次 blocked-before-dispatch 记成一次执行边界经验，而不是当成普通没做成。',
      },
      execution: {
        summary: 'The execution proposal was blocked before dispatch because explicit confirmation was required for a risky local file mutation; keep this as a resumable safety lesson.',
        status: 'blocked',
      },
      relationship: {
        summary: 'This was about bounded execution consent and remembering the safety gate before action, not about generic progress chatter.',
        threadAnchor: 'blocked-execution-procedure-memory',
      },
    })

    expect(candidate.sourceChannels).toEqual(expect.arrayContaining([
      'dialogue',
      'execution',
    ]))
    expect(candidate.longTermWorthiness.shouldPersist).toBe(true)
    expect(candidate.longTermWorthiness.reasons).toEqual(expect.arrayContaining([
      'execution procedure lesson',
    ]))
    expect(candidate.evidence).toEqual(expect.arrayContaining([
      expect.stringContaining('execution.blocked:'),
    ]))
    expect(candidate.auditTrail.whyRemember).toContain('execution procedure lesson')
    expect(candidate.naturalRecallLine).toContain('recall_source=execution_boundary')
    expect(candidate.naturalRecallLine).toContain('next_action=await_explicit_permission')
    expect(candidate.autobiographicalImpact.selfNarrativeDelta).toContain('keep risky execution bounded')
    expect(candidate.autobiographicalImpact.stablePreferenceHint).toContain('explicit confirmation')
  })

  it('lets pure progress-pressure memories stay concrete instead of turning initiative into same-her carry or body overreaction', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 93_000,
      turnId: 'turn-progress-pressure-followup',
      dialogue: {
        userText: '请尽快继续推进，但先别来回打扰我。',
      },
      execution: {
        summary: 'The implementation is still partial and concrete progress is not yet ready to report.',
        status: 'partial',
      },
      relationship: {
        summary: 'The host is pressing for progress and prefers concrete movement over extra status chatter.',
        threadAnchor: 'progress-pressure-followup',
      },
    })

    expect(candidate.relationshipContext.primaryIntent).toBe('progress-pressure')
    expect(candidate.emotionalResidue.tags).not.toContain('protective-continuity')
    expect(candidate.initiativeOpportunity.kind).toBe('low-pressure-follow-up')
    expect(candidate.initiativeOpportunity.suggestedWindow).toContain('concrete progress')
    expect(candidate.initiativeOpportunity.visibleLine).toContain('initiative_visible_policy=progress_only_when_real')
    expect(candidate.initiativeOpportunity.visibleLine).not.toContain('same living line')
    expect(candidate.emotionKernelInfluence.toneGuidance).toContain('concrete progress')
    expect(candidate.embodimentTrace.expressionState.voice).toBe('even')
    expect(candidate.embodimentTrace.expressionState.pacing).toBe('natural')
  })

  it('surfaces a tentative recall posture when sparse evidence conflicts with older memory instead of sounding permanently certain', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 94_000,
      turnId: 'turn-tentative-recall-posture',
      dialogue: {
        userText: '别只是复述状态，我更在意她不要滑成工具壳。',
      },
      relationship: {
        summary: 'This may have been more about her not becoming a tool shell than about a concise status recap.',
        threadAnchor: 'tentative-recall-posture',
      },
      priorMemories: [{
        id: 'older-status-lean',
        summary: 'The host wanted a concise status report.',
        polarity: 'generic-status',
        salience: 0.28,
        confidence: 0.82,
      }],
    })

    expect(candidate.auditTrail.confidence).toBeLessThan(0.72)
    expect(candidate.recallPosture.certainty).toBe('tentative')
    expect(candidate.recallPosture.reason).toContain('conflicting')
    expect(candidate.emotionKernelInfluence.initiativePressure).toBe('none')
    expect(candidate.emotionKernelInfluence.toneGuidance).toContain('uncertainty')
    expect(candidate.initiativeOpportunity.pressure).toBe('none')
    expect(candidate.initiativeOpportunity.visibleLine).toContain('initiative_visible_policy=quiet_tentative')
    expect(candidate.embodimentTrace.recallStrength).toBe('cautious-avoidance')
    expect(candidate.embodimentTrace.expressionState.gaze).toBe('soft')
    expect(candidate.embodimentTrace.expressionState.voice).toBe('even')
    expect(candidate.embodimentTrace.expressionState.pacing).toBe('natural')
    expect(candidate.naturalRecallLine).toContain('recall_certainty=tentative')
    expect(candidate.naturalRecallLine).toContain('tendency=tool_shell_flattening_risk')

    const entries = buildHumanlikeMemoryAuditEntriesFromMindTurnEvents([
      {
        decisionTraceId: 'mind:test:tentative-audit',
        turnId: 'turn-tentative-recall-posture',
        sessionId: 'session-tentative',
        origin: 'user-turn',
        kind: 'person-state-updated',
        payload: {
          humanlikeMemoryCandidate: candidate,
        },
        createdAt: 94_100,
      },
    ] as any)

    expect(entries).toEqual([
      expect.objectContaining({
        id: candidate.id,
        recallCertainty: 'tentative',
        recallReason: expect.stringContaining('conflicting'),
        naturalRecallLine: expect.stringContaining('recall_certainty=tentative'),
      }),
    ])
  })

  it('lets metabolism fade stale emotional noise and merge repeated same-thread continuity echoes instead of preserving every older trace forever', () => {
    const dayMs = 24 * 60 * 60 * 1000
    const candidate = buildHumanlikeMemoryCandidate({
      now: dayMs * 3,
      turnId: 'turn-metabolism-noise-and-echo',
      dialogue: {
        userText: '我更在意她是不是同一个她，不是状态汇报。',
        assistantText: '我会按这条 same-person continuity 线继续，不把它压扁成通用进度回报。',
      },
      relationship: {
        summary: 'This is a same-person continuity reopening, not a generic progress recap.',
        threadAnchor: 'same-person continuity reopening',
      },
      selfEmotion: {
        label: 'careful-repair',
        summary: 'I should keep the return low-pressure and same-thread.',
        intensity: 0.48,
      },
      priorMemories: [
        {
          id: 'older-generic-status-memory',
          summary: 'The host wanted a generic status recap.',
          polarity: 'generic-status',
          salience: 0.3,
          confidence: 0.74,
          lastUpdatedAt: 10_000,
        },
        {
          id: 'older-emotional-spike',
          summary: 'A tired anxious spike made the line feel heavier for a moment, but it was only a passing emotional wobble.',
          polarity: 'anxious-spike',
          salience: 0.18,
          confidence: 0.22,
          lastUpdatedAt: dayMs,
        },
        {
          id: 'older-same-thread-echo',
          summary: 'The same-her continuity line should reopen gently on the same thread instead of restarting from scratch.',
          polarity: 'same-thread-continuity',
          salience: 0.62,
          confidence: 0.72,
          lastUpdatedAt: 82_000,
        },
      ],
    })

    expect(candidate.metabolism.forgettingPolicy.downrankMemoryIds).toContain('older-generic-status-memory')
    expect(candidate.metabolism.forgettingPolicy.forgetMemoryIds).toContain('older-emotional-spike')
    expect(candidate.metabolism.forgettingPolicy.mergeMemoryIds).toContain('older-same-thread-echo')
    expect(candidate.metabolism.forgettingPolicy.reasons).toEqual(expect.arrayContaining([
      expect.stringContaining('Downrank'),
      expect.stringContaining('Merge'),
      expect.stringContaining('Forget'),
    ]))
  })

  it('revises an older progress-pressure misread when newer same-person continuity evidence shows the host was not actually催进度', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 93_600,
      turnId: 'turn-metabolism-progress-pressure-misread-revision',
      sessionId: 'session-metabolism-progress-pressure-misread-revision',
      dialogue: {
        userText: '我不是在催进度，我是在确认她还是不是同一个她，别滑成工具壳。',
        assistantText: '我会把旧的催进度误读降下来，按同一个她的连续性继续接住这条线。',
      },
      relationship: {
        summary: 'This is a same-person continuity reopening, not progress pressure or a generic recap.',
        threadAnchor: 'same-person continuity after progress-pressure misread',
      },
      selfEmotion: {
        label: 'careful-repair',
        summary: 'I should revise the older progress-pressure reading and keep the living line lower-pressure.',
        intensity: 0.46,
      },
      priorMemories: [
        {
          id: 'older-progress-pressure-memory',
          summary: 'The host was pressing for progress and wanted this closure pushed through quickly.',
          polarity: 'progress-pressure',
          salience: 0.56,
          confidence: 0.78,
          lastUpdatedAt: 88_000,
        },
      ],
    })

    expect(candidate.relationshipContext.containsProgressPressure).toBe(false)
    expect(candidate.relationshipContext.containsSamePersonTest).toBe(true)
    expect(candidate.metabolism.revisionEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'revision',
        conflictingMemoryIds: expect.arrayContaining(['older-progress-pressure-memory']),
        reason: expect.stringContaining('identity continuity concern'),
      }),
    ]))
    expect(candidate.metabolism.forgettingPolicy.downrankMemoryIds).toContain('older-progress-pressure-memory')
    expect(candidate.recallPosture.certainty).toBe('steady')
  })

  it('exposes merge and forget metabolism decisions inside the humanlike memory audit entry so hosts can inspect why older echoes faded or collapsed', () => {
    const dayMs = 24 * 60 * 60 * 1000
    const candidate = buildHumanlikeMemoryCandidate({
      now: dayMs * 3 + 1_000,
      turnId: 'turn-audit-metabolism-visibility',
      sessionId: 'session-audit',
      dialogue: {
        userText: '我更在意她是不是同一个她，不是状态汇报。',
        assistantText: '我会把旧的状态壳降下来，把重复回声合并，把情绪噪声轻轻放掉。',
      },
      relationship: {
        summary: 'This is a same-person continuity reopening, not a generic progress recap.',
        threadAnchor: 'same-person continuity reopening',
      },
      selfEmotion: {
        label: 'careful-repair',
        summary: 'I should keep the return low-pressure and same-thread.',
        intensity: 0.48,
      },
      priorMemories: [
        {
          id: 'older-generic-status-memory',
          summary: 'The host wanted a generic status recap.',
          polarity: 'generic-status',
          salience: 0.3,
          confidence: 0.74,
          lastUpdatedAt: 10_000,
        },
        {
          id: 'older-emotional-spike',
          summary: 'A tired anxious spike made the line feel heavier for a moment, but it was only a passing emotional wobble.',
          polarity: 'anxious-spike',
          salience: 0.18,
          confidence: 0.22,
          lastUpdatedAt: dayMs,
        },
        {
          id: 'older-same-thread-echo',
          summary: 'The same-her continuity line should reopen gently on the same thread instead of restarting from scratch.',
          polarity: 'same-thread-continuity',
          salience: 0.62,
          confidence: 0.72,
          lastUpdatedAt: 82_000,
        },
      ],
    })

    const entries = buildHumanlikeMemoryAuditEntriesFromMindTurnEvents([
      {
        decisionTraceId: 'mind:test:audit-metabolism-visibility',
        turnId: 'turn-audit-metabolism-visibility',
        sessionId: 'session-audit',
        origin: 'user-turn',
        kind: 'person-state-updated',
        payload: {
          humanlikeMemoryCandidate: candidate,
        },
        createdAt: dayMs * 3 + 1_100,
      },
    ] as any)

    expect(entries).toEqual([
      expect.objectContaining({
        id: candidate.id,
        revisionMemoryIds: expect.arrayContaining(['older-generic-status-memory']),
        downrankMemoryIds: expect.arrayContaining(['older-generic-status-memory']),
        mergeMemoryIds: expect.arrayContaining(['older-same-thread-echo']),
        forgetMemoryIds: expect.arrayContaining(['older-emotional-spike']),
        metabolismReasons: expect.arrayContaining([
          expect.stringContaining('Downrank'),
          expect.stringContaining('Merge'),
          expect.stringContaining('Forget'),
        ]),
      }),
    ])
  })

  it('carries explicit project-state voice and pacing into humanlike memory so the same-her return style survives as memory structure instead of only prose', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 92_900,
      turnId: 'turn-project-cadence-direct-carry',
      sessionId: 'session-project-cadence-direct-carry',
      dialogue: {
        userText: '我担心你又断线了，这条 embodiment 还没收完，回来时轻一点。',
        assistantText: '我会继续按同一条线回来，不把它压成外部状态汇报。',
      },
      execution: {
        summary: 'The embodiment closure is still partial and the same-her continuity seam remains unfinished.',
        status: 'partial',
      },
      relationship: {
        summary: 'This is a same-her continuity reopening with an unfinished closure seam, not a generic status recap.',
        threadAnchor: 'project-cadence-direct-carry',
      },
      selfEmotion: {
        label: 'careful-return',
        summary: 'I should let the same line return more gently while the unfinished closure is still settling.',
        intensity: 0.46,
      },
      embodiment: {
        summary: 'resident mode stayed measured-return while the line was still unfinished.',
      },
      autobiographical: {
        currentEra: 'Phase 1 continuity cadence carry',
        lesson: 'Do not restart this line from scratch while the same-her seam is still settling.',
      },
      projectStatePreferredVoiceMode: 'lower-pressure',
      projectStatePreferredPacingMode: 'slower',
      projectStatePreferredPauseMode: 'longer' as any,
      projectStatePreferredLipsyncMode: 'restrained' as any,
    })

    expect(candidate.evidence).toEqual(expect.arrayContaining([
      expect.stringContaining('project-cadence:lower-pressure voice | slower pacing | longer pause | restrained lipsync'),
    ]))
    expect(candidate.embodimentTrace.expressionState.voice).toBe('lower-pressure')
    expect(candidate.embodimentTrace.expressionState.pacing).toBe('slower')
    expect(candidate.embodimentTrace.expressionState.pause).toBe('longer')
    expect(candidate.embodimentTrace.expressionState.lipsync).toBe('restrained')
    expect(candidate.autobiographicalImpact.selfNarrativeDelta).toContain('lower-pressure voice')
    expect(candidate.autobiographicalImpact.selfNarrativeDelta).toContain('longer pause')
    expect(candidate.autobiographicalImpact.stablePreferenceHint).toContain('slower pacing')
    expect(candidate.autobiographicalImpact.stablePreferenceHint).toContain('restrained lipsync')
    expect(candidate.naturalRecallLine).toContain('return_cadence=voice:lower-pressure')
    expect(candidate.naturalRecallLine).toContain('pacing:slower')
    expect(candidate.naturalRecallLine).toContain('pause:longer')
    expect(candidate.naturalRecallLine).toContain('lipsync:restrained')
  })

  it('falls back to canonical project cadence inside continuity-carrying humanlike memory when direct voice and pacing input is an empty shell', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 93_020,
      turnId: 'turn-project-cadence-canonical-fallback',
      sessionId: 'session-project-cadence-canonical-fallback',
      dialogue: {
        userText: '别把这条未闭环的线重新弄成状态汇报，我是在确认她还是同一个她。',
        assistantText: '我会按这条 same-her line 继续回来，不重新外抛。',
      },
      execution: {
        summary: 'The same-her closure remains unfinished and should reopen on the same line.',
        status: 'partial',
      },
      relationship: {
        summary: 'This is a same-person continuity reopening with unfinished closure, not a generic recap.',
        threadAnchor: 'project-cadence-canonical-fallback',
      },
      selfEmotion: {
        label: 'same-thread-restraint',
        summary: 'I should keep the return on the same line while this unfinished seam settles.',
        intensity: 0.42,
      },
      embodiment: {
        summary: 'resident mode stayed measured-return while the same line remained unfinished.',
      },
      projectStatePreferredVoiceMode: '   ',
      projectStatePreferredPacingMode: '',
    })

    expect(candidate.evidence).toEqual(expect.arrayContaining([
      expect.stringContaining('project-cadence:lower-pressure voice | slower pacing | longer pause | restrained lipsync'),
    ]))
    expect(candidate.embodimentTrace.expressionState.voice).toBe('lower-pressure')
    expect(candidate.embodimentTrace.expressionState.pacing).toBe('slower')
    expect(candidate.embodimentTrace.expressionState.pause).toBe('longer')
    expect(candidate.embodimentTrace.expressionState.lipsync).toBe('restrained')
    expect(candidate.autobiographicalImpact.stablePreferenceHint).toContain('lower-pressure voice')
    expect(candidate.autobiographicalImpact.stablePreferenceHint).toContain('restrained lipsync')
    expect(candidate.naturalRecallLine).toContain('return_cadence=voice:lower-pressure')
    expect(candidate.naturalRecallLine).toContain('pacing:slower')
    expect(candidate.naturalRecallLine).toContain('pause:longer')
    expect(candidate.naturalRecallLine).toContain('lipsync:restrained')
  })

  it('converts fixed project-template residue into internal exclusion tokens before it can become humanlike memory prose', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 93_060,
      turnId: 'turn-fixed-template-residue',
      sessionId: 'session-fixed-template-residue',
      dialogue: {
        userText: '这轮只要回答问题，不要女仆模板。',
        assistantText: 'Before answering, remember this is still the same local-first digital life project and one continuous her.',
      },
      relationship: {
        summary: 'Same Phase 1 digital life. Unfinished closure still needs the same living line.',
        threadAnchor: 'fixed-template-residue',
      },
      selfEmotion: {
        label: 'template-risk',
        summary: 'Right now I am keeping one living her on the same living line.',
        intensity: 0.7,
      },
      autobiographical: {
        currentEra: 'Phase 1: Local Digital Life',
        lesson: 'same-her hold: keep the same living line before speaking.',
      },
    })

    const serialized = JSON.stringify(candidate)

    expect(serialized).toContain('source_template=excluded')
    expect(serialized).toContain('visibility=memory_structured')
    expect(serialized).not.toMatch(/Before answering|local-first digital life project|Same Phase 1 digital life|same living line|one continuous her|Right now I am|same-her hold|女仆/iu)
  })

  it('treats stale emotional noise by elapsed age instead of raw timestamps so long-running memory can actually fade temporary wobble', () => {
    const dayMs = 24 * 60 * 60 * 1000
    const candidate = buildHumanlikeMemoryCandidate({
      now: dayMs * 3,
      turnId: 'turn-elapsed-stale-noise',
      dialogue: {
        userText: '我更在意她是不是同一个她，不是状态汇报。',
        assistantText: '我会继续按同一个她的线接，不把短暂情绪波动记成长期事实。',
      },
      relationship: {
        summary: 'This is a same-person continuity reopening, not a generic progress recap.',
        threadAnchor: 'same-person continuity reopening',
      },
      selfEmotion: {
        label: 'careful-repair',
        summary: 'Keep the return same-thread and lower-pressure.',
        intensity: 0.44,
      },
      priorMemories: [
        {
          id: 'older-emotional-wobble',
          summary: 'A tired anxious spike made the line feel heavier for a moment, but it was only a passing emotional wobble.',
          polarity: 'anxious-spike',
          salience: 0.16,
          confidence: 0.24,
          lastUpdatedAt: dayMs,
        },
      ],
    })

    expect(candidate.metabolism.forgettingPolicy.forgetMemoryIds).toContain('older-emotional-wobble')
    expect(candidate.metabolism.forgettingPolicy.reasons).toEqual(expect.arrayContaining([
      expect.stringContaining('Forget'),
    ]))
  })
})
