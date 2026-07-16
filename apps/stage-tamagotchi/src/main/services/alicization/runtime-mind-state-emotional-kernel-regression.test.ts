import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { createAlicizationMindStateRuntime } from './runtime-mind-state'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

describe('runtime-mind-state emotional kernel regression', () => {
  it('reads persisted person-state carry and routes it through autobiographical self instead of dropping the same-her memory sediment between turns', () => {
    const source = readFileSync(new URL('./runtime-mind-state.ts', import.meta.url), 'utf8')

    expect(source).toContain('readMindHead<AlicizationVisualPresenceStateSnapshot[\'autobiographicalSelf\']>(input.cardId, \'autobiographical-self\')')
    expect(source).toContain('readMindHead<AlicizationPersonStateUpdateSurface>(input.cardId, \'person-state-update-surface\')')
    expect(source).toContain('const previousPersonStateUpdateSurface = input.previousVisualPresenceState.personStateUpdateSurface ?? persistedPersonStateUpdateSurface ?? null')
    expect(source).toContain('personStateUpdateSurface: previousPersonStateUpdateSurface,')
    expect(source).toContain('personStateUpdateSurface,')
  })

  it('builds emotional-kernel and initiative projection inputs from the fresher preferred resident projection instead of only the persisted previous shell', () => {
    const source = readFileSync(new URL('./runtime-mind-state.ts', import.meta.url), 'utf8')

    expect(source).toContain('const preferredResidentPersonStateProjection = resolvePreferredPersonStateProjection({')
    expect(source).toContain('bundleProjection: input.previousVisualPresenceState.personStateProjection ?? null')
    expect(source).toContain('runtimeProjection: input.organicMemoryContext?.personStateProjection ?? null')
    expect(source).toContain('personStateProjection: preferredResidentPersonStateProjection')

    const emotionalKernelStart = source.indexOf('const bootstrapEmotionalKernel = buildAlicizationEmotionalKernel({')
    const initiativeBaseStart = source.indexOf('const initiativeBase = buildInitiativeSnapshot({')
    const initiativeBaseEnd = source.indexOf('const desireMemory = buildDesireMemory({')
    const emotionalKernelBlock = emotionalKernelStart >= 0 && initiativeBaseStart > emotionalKernelStart
      ? source.slice(emotionalKernelStart, initiativeBaseStart)
      : ''
    const initiativeBaseBlock = initiativeBaseStart >= 0 && initiativeBaseEnd > initiativeBaseStart
      ? source.slice(initiativeBaseStart, initiativeBaseEnd)
      : ''

    expect(emotionalKernelBlock).toContain('personStateProjection: preferredResidentPersonStateProjection')
    expect(emotionalKernelBlock).toContain('selfEvolution')
    expect(emotionalKernelBlock).toContain('projectState: mindProjectStateRuntimeSnapshot')
    expect(initiativeBaseBlock).toContain('personStateProjection: preferredResidentPersonStateProjection')
    expect(initiativeBaseBlock).toContain('recollectionIntent: input.organicMemoryContext?.recollectionIntent')
    expect(emotionalKernelBlock).not.toContain('personStateProjection: input.previousVisualPresenceState.personStateProjection ?? null')
    expect(initiativeBaseBlock).not.toContain('personStateProjection: input.previousVisualPresenceState.personStateProjection ?? null')
  })

  it('passes live recollection intent into initiative rebuilding instead of leaving memory-led restraint only on the emotional-kernel side', () => {
    const source = readFileSync(new URL('./runtime-mind-state.ts', import.meta.url), 'utf8')

    const initiativeBaseStart = source.indexOf('const initiativeBase = buildInitiativeSnapshot({')
    const finalizedInitiativeBaseStart = source.indexOf('const finalizedInitiativeBase = buildInitiativeSnapshot({')
    const finalizedInitiativeBaseEnd = source.indexOf('const autonomy = buildAutonomySnapshot({')
    const initiativeBaseBlock = initiativeBaseStart >= 0 && finalizedInitiativeBaseStart > initiativeBaseStart
      ? source.slice(initiativeBaseStart, finalizedInitiativeBaseStart)
      : ''
    const finalizedInitiativeBaseBlock = finalizedInitiativeBaseStart >= 0 && finalizedInitiativeBaseEnd > finalizedInitiativeBaseStart
      ? source.slice(finalizedInitiativeBaseStart, finalizedInitiativeBaseEnd)
      : ''

    expect(initiativeBaseBlock).toContain('recollectionIntent: input.organicMemoryContext?.recollectionIntent')
    expect(initiativeBaseBlock).toContain('readRecollectionIntentFromDerivedMindStateBundle<NonNullable<OrganicMemoryPromptContext[\'recollectionIntent\']>>(')
    expect(finalizedInitiativeBaseBlock).toContain('recollectionIntent: input.organicMemoryContext?.recollectionIntent')
    expect(finalizedInitiativeBaseBlock).toContain('readRecollectionIntentFromDerivedMindStateBundle<NonNullable<OrganicMemoryPromptContext[\'recollectionIntent\']>>(')
  })

  it('refreshes emotional-kernel from the newly built private-thought before downstream memory and embodiment consumers read it', () => {
    const source = readFileSync(new URL('./runtime-mind-state.ts', import.meta.url), 'utf8')

    expect(source).toContain('const bootstrapEmotionalKernel = buildAlicizationEmotionalKernel({')
    expect(source).toContain('const privateThought = buildPrivateThoughtLoop({')
    expect(source).toContain('let emotionalKernel = bootstrapEmotionalKernel')
    expect(source).toContain('emotionalKernel = buildAlicizationEmotionalKernel({')
    expect(source).toContain('privateThought')
    expect(source).toContain('selfEvolution')
    expect(source.indexOf('const bootstrapEmotionalKernel = buildAlicizationEmotionalKernel({')).toBeLessThan(
      source.indexOf('emotionalKernel = buildAlicizationEmotionalKernel({'),
    )
  })

  it('threads long-horizon memory into every emotional-kernel rebuild instead of leaving durable memory carry on only the initiative side', () => {
    const source = readFileSync(new URL('./runtime-mind-state.ts', import.meta.url), 'utf8')

    const bootstrapEmotionalKernelStart = source.indexOf('const bootstrapEmotionalKernel = buildAlicizationEmotionalKernel({')
    const bootstrapEmotionalKernelEnd = source.indexOf('const initiativeArbitration = buildInitiativeArbitration({')
    const bootstrapEmotionalKernelBlock = bootstrapEmotionalKernelStart >= 0 && bootstrapEmotionalKernelEnd > bootstrapEmotionalKernelStart
      ? source.slice(bootstrapEmotionalKernelStart, bootstrapEmotionalKernelEnd)
      : ''

    const rebuiltEmotionalKernelMatches = source.match(/emotionalKernel = buildAlicizationEmotionalKernel\(\{[\s\S]*?\n {4}\}\)/g) ?? []

    expect(bootstrapEmotionalKernelBlock).toContain('longHorizonMemory')
    expect(rebuiltEmotionalKernelMatches.length).toBeGreaterThanOrEqual(2)
    expect(rebuiltEmotionalKernelMatches.every(block => block.includes('longHorizonMemory'))).toBe(true)
  })

  it('promotes emotional and embodiment self-revision candidates into active continuity governance before exporting the derived mind bundle', () => {
    const source = readFileSync(new URL('./runtime-mind-state.ts', import.meta.url), 'utf8')

    expect(source).toContain('buildAlicizationEmotionalSelfRevisionStatePatch')
    expect(source).toContain('const emotionalSelfRevisionPatch = buildAlicizationEmotionalSelfRevisionStatePatch({')
    expect(source).toContain('buildAlicizationEmbodimentContinuityLedger')
    expect(source).toContain('const embodimentContinuityLedger = buildAlicizationEmbodimentContinuityLedger({')
    expect(source).toContain('const embodimentSelfRevisionPatch = buildAlicizationEmbodimentSelfRevisionStatePatch({')
    expect(source).toContain('const emotionalActiveContinuityGovernance = emotionalSelfRevisionPatch')
    expect(source).toContain('activeSelfRevision: embodimentSelfRevisionPatch')
    expect(source).toContain(': emotionalSelfRevisionPatch')
    expect(source).toContain('patchId: emotionalSelfRevisionPatch.id')
    expect(source).toContain('patchId: embodimentSelfRevisionPatch.id')
    expect(source).toContain('activeContinuityGovernance: embodimentActiveContinuityGovernance')
    expect(source).toContain('?? emotionalActiveContinuityGovernance')
  })

  it('lets the current-turn host model retune long-horizon memory formation immediately instead of leaving relationship context one turn late', async () => {
    const previousVisualPresenceState = createDefaultVisualPresenceState(50_000) as any
    previousVisualPresenceState.hostPersonModel = {
      summary: 'Relaxed openings can lean warmer without much repair.',
      routines: [],
      sensitivities: [],
      repairTriggers: [],
      trustLadder: {
        stage: 'open',
        score: 0.42,
        rationale: 'Older trust framing still leans warm and casual.',
      },
      preferredClosenessByContext: [{
        context: 'casual-chat',
        preference: 'Relaxed chat can lean warmer without much repair.',
        confidence: 0.64,
      }],
      recurrentBurdens: [],
      narrative: [],
      updatedAt: 40_000,
    }

    const runtime = createAlicizationMindStateRuntime({
      previousVisualPresenceState,
      buildDialogueIngressContext: () => ({
        context: {
          localTime: '2026-06-08T14:20:00+08:00',
          system: {
            cpuUsage: 0.18,
            idleSeconds: 0,
            inputActivity: 'active',
            fullscreenLikely: false,
            foregroundWindow: {
              appName: 'Visual Studio Code',
              processName: 'Code',
              title: 'runtime-mind-state.ts',
              pid: 7,
            },
            degradedSignals: [],
          },
          workload: {
            kind: 'coding',
            confidence: 0.92,
            source: 'screen-semantic-summary',
            matchedLabels: ['coding'],
          },
          content: {
            kind: 'diff',
            confidence: 0.86,
            source: 'screen-semantic-summary',
            summary: 'Focused work reopen where repair timing matters more than casual warmth.',
            matchedLabels: ['diff'],
          },
          relationship: {
            hostAttitude: 'focused',
            fatigue: 0.22,
            minutesSinceLastUserTurn: 2,
            reminderBacklog: 0,
            lateNightActiveMinutes: 0,
            recentProactiveOutcomes: [],
          },
        } as any,
        currentScene: {
          scenario: 'coding',
          workloadKind: 'coding',
          contentKind: 'diff',
          summary: 'focused-work host model carry',
          source: 'screen-semantic-summary',
          confidence: 0.9,
          target: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'runtime-mind-state.ts',
            pid: 7,
          },
        } as any,
        worldModel: {
          activeThread: {
            id: 'thread-current-host-model-memory-carry',
            kind: 'problem',
            title: 'Focused work continuity',
            summary: 'The current turn should remember a repair-first focused-work opening, not the older casual warmth line.',
            confidence: 0.84,
            unresolved: true,
            source: 'dialogue-ingress',
          },
          lingeringThreads: [],
          focusTarget: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'runtime-mind-state.ts',
            pid: 7,
          },
          epistemicState: {
            certainty: 'grounded',
            freshness: 'fresh',
            openQuestions: ['Should long-horizon memory formation use the fresher focused-work host model immediately?'],
            staleRisks: [],
          },
          hostState: {
            availability: 'focused',
          },
        } as any,
      }),
      generateMainGatewayText: async () => null,
      buildMainGatewayAgentTurnId: (...segments) => segments.join(':'),
      readLatestAssistantMessageText: messages => messages.filter(message => message.role === 'assistant').map(message => String(message.content ?? '')).at(-1) ?? '',
      readTransportContentAsText: content => typeof content === 'string' ? content : JSON.stringify(content),
      retrieveMemoryFacts: async () => [],
      listRelationshipOutcomes: async () => [],
      listPersonaReinforcementEvents: async () => [],
      listMemoryReflections: async () => [],
      listMemoryConsolidations: async () => [],
      getPersonStateEvolutionSummary: async () => null,
      readMindHead: async () => null,
    })

    const result = await runtime.buildDigitalLifeMindState({
      cardId: 'card-current-host-model-memory-carry',
      now: 95_000,
      context: {
        localTime: '2026-06-08T14:20:00+08:00',
        system: {
          cpuUsage: 0.18,
          idleSeconds: 0,
          inputActivity: 'active',
          fullscreenLikely: false,
          foregroundWindow: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'runtime-mind-state.ts',
            pid: 7,
          },
          degradedSignals: [],
        },
        workload: {
          kind: 'coding',
          confidence: 0.92,
          source: 'screen-semantic-summary',
          matchedLabels: ['coding'],
        },
        content: {
          kind: 'diff',
          confidence: 0.86,
          source: 'screen-semantic-summary',
          summary: 'Focused work reopen where repair timing matters more than casual warmth.',
          matchedLabels: ['diff'],
        },
        relationship: {
          hostAttitude: 'focused',
          fatigue: 0.22,
          minutesSinceLastUserTurn: 2,
          reminderBacklog: 0,
          lateNightActiveMinutes: 0,
          recentProactiveOutcomes: [],
        },
      } as any,
      previousVisualPresenceState,
      visualHeartbeat: {
        watchMode: 'symbiotic-vision',
        scene: {
          workloadKind: 'coding',
          contentKind: 'diff',
          scenario: 'coding',
          summary: 'focused-work host model carry',
          source: 'screen-semantic-summary',
          confidence: 0.9,
          beganAt: 94_000,
          lastSeenAt: 95_000,
        },
        recentTransition: null,
        nextSuggestedProbeMs: 30_000,
      } as any,
      attention: null as any,
      cognitionMode: 'background',
      organicMemoryContext: {
        hostPersonModel: {
          summary: 'Focused work openings want grounded repair before added warmth.',
          routines: [],
          sensitivities: ['Template-like repair breaks the living feel.'],
          repairTriggers: ['Repair with specific grounding before sounding smooth.'],
          trustLadder: {
            stage: 'warming',
            score: 0.82,
            rationale: 'Trust warms when repair stays specific and respects work-focus boundaries.',
          },
          preferredClosenessByContext: [{
            context: 'focused-work',
            preference: 'Focused work windows need grounded repair first, then warmth can follow without crowding.',
            confidence: 0.91,
          }],
          recurrentBurdens: ['Focused debugging turns heavy if follow-up pressure outruns proof.'],
          narrative: ['Grounded repair keeps the bond open during focused work.'],
          updatedAt: 94_500,
        },
      } as any,
    })

    expect(result.longHorizonMemory?.anchorFacts.some(cue => cue.factId === 'derived:host-closeness:focused-work')).toBe(true)
    expect(String(result.longHorizonMemory?.rememberedConstraintSummary ?? '')).toContain('without crowding')
    expect(String(result.longHorizonMemory?.summary ?? '')).toMatch(/focused work|grounded repair|without crowding/i)
    expect(String(result.longHorizonMemory?.rememberedPreferenceSummary ?? '')).not.toContain('Relaxed chat can lean warmer')
  })

  it('keeps initiative on the same rest-protective line once the current turn private-thought upgrades emotional carry', async () => {
    const runtime = createAlicizationMindStateRuntime({
      previousVisualPresenceState: createDefaultVisualPresenceState(50_000),
      buildDialogueIngressContext: () => ({
        context: {
          localTime: '2026-06-06T22:18:00+08:00',
          system: {
            cpuUsage: 0.18,
            idleSeconds: 0,
            inputActivity: 'active',
            fullscreenLikely: false,
            foregroundWindow: {
              appName: 'Visual Studio Code',
              processName: 'Code',
              title: 'runtime-mind-state.ts',
              pid: 7,
            },
            degradedSignals: [],
          },
          workload: {
            kind: 'coding',
            confidence: 0.9,
            source: 'screen-semantic-summary',
            matchedLabels: ['coding'],
          },
          content: {
            kind: 'diff',
            confidence: 0.84,
            source: 'screen-semantic-summary',
            summary: 'Returning to the same compile callback seam after a quieter hold.',
            matchedLabels: ['diff'],
          },
          relationship: {
            hostAttitude: 'still on the same compile callback seam',
            fatigue: 0.32,
            minutesSinceLastUserTurn: 1,
            reminderBacklog: 0,
            lateNightActiveMinutes: 0,
            recentProactiveOutcomes: [],
          },
        } as any,
        currentScene: {
          scenario: 'coding',
          workloadKind: 'coding',
          contentKind: 'diff',
          summary: 'Returning to the same compile callback seam after a quieter hold.',
          source: 'screen-semantic-summary',
          confidence: 0.91,
          target: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'runtime-mind-state.ts',
            pid: 7,
          },
        } as any,
        worldModel: {
          activeThread: {
            id: 'thread-answer-compiler-measured-return-carry',
            kind: 'problem',
            title: 'Compile callback seam',
            summary: 'Return to the same compile callback seam without restarting it.',
            confidence: 0.85,
            unresolved: true,
            source: 'dialogue-ingress',
          },
          lingeringThreads: [],
          focusTarget: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'runtime-mind-state.ts',
            pid: 7,
          },
          epistemicState: {
            certainty: 'grounded',
            freshness: 'fresh',
            openQuestions: ['How should the same callback seam reopen without restarting?'],
            staleRisks: [],
          },
          hostState: {
            availability: 'focused',
          },
        } as any,
      }),
      generateMainGatewayText: async () => null,
      buildMainGatewayAgentTurnId: (...segments) => segments.join(':'),
      readLatestAssistantMessageText: messages => messages.filter(message => message.role === 'assistant').map(message => String(message.content ?? '')).at(-1) ?? '',
      readTransportContentAsText: content => typeof content === 'string' ? content : JSON.stringify(content),
      retrieveMemoryFacts: async () => [],
      listRelationshipOutcomes: async () => [],
      listPersonaReinforcementEvents: async () => [],
      listMemoryReflections: async () => [],
      listMemoryConsolidations: async () => [],
      getPersonStateEvolutionSummary: async () => null,
      readMindHead: async () => null,
    })

    const result = await runtime.buildDigitalLifeMindState({
      cardId: 'card-rest-protective-same-turn',
      now: 60_000,
      context: {
        localTime: { hour: 1, minute: 10, isLateNight: true },
        system: {
          cpuUsage: 12,
          battery: { percent: 41, charging: false },
          memory: { usagePercent: 38, freeMB: 4096, totalMB: 8192 },
          idleSeconds: 18,
          inputActivity: 'active',
          fullscreenLikely: false,
          foregroundWindow: undefined,
          degradedSignals: [],
        },
        workload: { kind: 'coding', confidence: 0.84, source: 'foreground-window-heuristic', matchedLabels: ['cursor'] },
        content: { kind: 'diff', confidence: 0.8, source: 'foreground-window-heuristic', matchedLabels: ['diff'] },
        relationship: {
          hostAttitude: 'late-night but still pushing through',
          boredom: 8,
          loneliness: 10,
          fatigue: 84,
          minutesSinceLastUserTurn: 5,
          reminderBacklog: 0,
          lateNightActiveMinutes: 165,
          recentProactiveOutcomes: [],
        },
      } as any,
      previousVisualPresenceState: createDefaultVisualPresenceState(50_000) as any,
      visualHeartbeat: {
        watchMode: 'symbiotic-vision',
        scene: {
          workloadKind: 'coding',
          contentKind: 'diff',
          scenario: 'coding',
          summary: 'late-night diff focus',
          source: 'foreground-window-heuristic',
          confidence: 0.88,
          beganAt: 59_000,
          lastSeenAt: 60_000,
        },
        recentTransition: null,
        nextSuggestedProbeMs: 30_000,
      } as any,
      attention: null as any,
      cognitionMode: 'background',
      organicMemoryContext: {
        affectiveResidue: {
          summary: 'The late-night line should stay quietly protective.',
          restProtectivePressure: 0.45,
          relationshipCadence: {
            shouldProtectRest: true,
            fatigueGuard: 0.45,
            companionshipDensity: 0.16,
            afterglowCarry: 0,
            overreachRisk: 0,
            summary: 'Protect rest tonight without widening the line.',
            reasonTags: ['rest-protective'],
          },
          sourceSignals: ['protect rest window'],
        },
      } as any,
    })

    expect(result.privateThought?.emotionalTension).toBe('late-night-drain')
    expect(result.privateThought?.shouldSpeak).toBe(false)
    expect(result.privateThought?.suggestedStyle).toBe('silent-observe')
    expect(result.privateThought?.embodiedPresence).toBe('concerned')
    expect(result.emotionalKernel?.dominantEmotion).toBe('rest-protective-companionship')
    expect(result.emotionalKernel?.initiativeMode).toBe('rest-guard')
    expect(result.emotionalKernel?.embodimentTone).toBe('rest-protective')
    expect(result.recallGovernor?.mode).toBe('self-continuity')
    expect(result.recallGovernor?.affectAnchors).toEqual(expect.arrayContaining([
      'emotion:rest-protective-companionship',
      'emotion_memory_mode:rest-protective-presence',
      'emotion_tone:rest-protective',
    ]))
    expect(result.recallGovernor?.affectiveCarry?.summary).toContain('rest-protective-companionship')
    expect(result.recallGovernor?.recalledFragmentCap).toBe(2)
    expect(result.recallGovernor?.recalledFragmentSourceBudget).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceKind: 'mind-continuity', maxItems: 2 }),
      expect.objectContaining({ sourceKind: 'dream-fragment', maxItems: 0 }),
    ]))
    expect(result.initiative.continuityRestraint).toBe('rest-protective')
    expect(result.initiative.preferredStyle).toBe('silent-observe')
    expect(result.initiative.preferredPresence).toBe('concerned')
    expect(result.initiative.shouldSpeak).toBe(false)
  })

  it('does not record a rest-protective warning desire as already surfaced once the final initiative holds that warning inward', async () => {
    const runtime = createAlicizationMindStateRuntime({
      previousVisualPresenceState: createDefaultVisualPresenceState(50_000),
      buildDialogueIngressContext: () => ({
        context: {} as any,
        currentScene: null,
        worldModel: null,
      }),
      generateMainGatewayText: async () => null,
      buildMainGatewayAgentTurnId: (...segments) => segments.join(':'),
      readLatestAssistantMessageText: messages => messages.filter(message => message.role === 'assistant').map(message => String(message.content ?? '')).at(-1) ?? '',
      readTransportContentAsText: content => typeof content === 'string' ? content : JSON.stringify(content),
      retrieveMemoryFacts: async () => [],
      listRelationshipOutcomes: async () => [],
      listPersonaReinforcementEvents: async () => [],
      listMemoryReflections: async () => [],
      listMemoryConsolidations: async () => [],
      getPersonStateEvolutionSummary: async () => null,
      readMindHead: async () => null,
    })

    const result = await runtime.buildDigitalLifeMindState({
      cardId: 'card-rest-protective-desire-memory',
      now: 60_000,
      context: {
        localTime: { hour: 1, minute: 10, isLateNight: true },
        system: {
          cpuUsage: 12,
          battery: { percent: 41, charging: false },
          memory: { usagePercent: 38, freeMB: 4096, totalMB: 8192 },
          idleSeconds: 18,
          inputActivity: 'active',
          fullscreenLikely: false,
          foregroundWindow: undefined,
          degradedSignals: [],
        },
        workload: { kind: 'coding', confidence: 0.84, source: 'foreground-window-heuristic', matchedLabels: ['cursor'] },
        content: { kind: 'diff', confidence: 0.8, source: 'foreground-window-heuristic', matchedLabels: ['diff'] },
        relationship: {
          hostAttitude: 'late-night but still pushing through',
          boredom: 8,
          loneliness: 10,
          fatigue: 84,
          minutesSinceLastUserTurn: 5,
          reminderBacklog: 0,
          lateNightActiveMinutes: 165,
          recentProactiveOutcomes: [],
        },
      } as any,
      previousVisualPresenceState: createDefaultVisualPresenceState(50_000) as any,
      visualHeartbeat: {
        watchMode: 'symbiotic-vision',
        scene: {
          workloadKind: 'coding',
          contentKind: 'diff',
          scenario: 'coding',
          summary: 'late-night diff focus',
          source: 'foreground-window-heuristic',
          confidence: 0.88,
          beganAt: 59_000,
          lastSeenAt: 60_000,
        },
        recentTransition: null,
        nextSuggestedProbeMs: 30_000,
      } as any,
      attention: null as any,
      cognitionMode: 'background',
      organicMemoryContext: {
        affectiveResidue: {
          summary: 'The late-night line should stay quietly protective.',
          restProtectivePressure: 0.45,
          relationshipCadence: {
            shouldProtectRest: true,
            fatigueGuard: 0.45,
            companionshipDensity: 0.16,
            afterglowCarry: 0,
            overreachRisk: 0,
            summary: 'Protect rest tonight without widening the line.',
            reasonTags: ['rest-protective'],
          },
          sourceSignals: ['protect rest window'],
        },
      } as any,
    })

    expect(result.initiative.selectedAction).toBe('hover')
    expect(result.initiative.shouldSpeak).toBe(false)
    expect(result.desireMemory.activeDesires[0]?.kind).toBe('warn')
    expect(result.desireMemory.activeDesires[0]?.status).toBe('withheld')
    expect(result.desireMemory.activeDesires[0]?.lastSurfacedAt).toBeNull()
  })

  it('feeds host-confirmed resume reconsolidation into long-horizon memory so later initiative keeps it as a bounded confirmation boundary', async () => {
    const runtime = createAlicizationMindStateRuntime({
      previousVisualPresenceState: createDefaultVisualPresenceState(50_000),
      buildDialogueIngressContext: () => ({
        context: {
          localTime: '2026-06-07T15:00:00+08:00',
          system: {
            cpuUsage: 0.12,
            idleSeconds: 0,
            inputActivity: 'active',
            fullscreenLikely: false,
            foregroundWindow: {
              appName: 'Visual Studio Code',
              processName: 'Code',
              title: 'executor-runtime.ts',
              pid: 7,
            },
            degradedSignals: [],
          },
          workload: {
            kind: 'coding',
            confidence: 0.88,
            source: 'screen-semantic-summary',
            matchedLabels: ['coding'],
          },
          content: {
            kind: 'diff',
            confidence: 0.82,
            source: 'screen-semantic-summary',
            summary: 'Reviewing a resumed execution return after host confirmation.',
            matchedLabels: ['diff'],
          },
          relationship: {
            hostAttitude: 'focused',
            fatigue: 0.18,
            minutesSinceLastUserTurn: 2,
            reminderBacklog: 0,
            lateNightActiveMinutes: 0,
            recentProactiveOutcomes: [],
          },
        } as any,
        currentScene: {
          scenario: 'coding',
          workloadKind: 'coding',
          contentKind: 'diff',
          summary: 'Reviewing a resumed execution return after host confirmation.',
          source: 'screen-semantic-summary',
          confidence: 0.9,
          target: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'executor-runtime.ts',
            pid: 7,
          },
        } as any,
        worldModel: {
          activeThread: {
            id: 'thread-resume-confirmation-boundary',
            kind: 'problem',
            title: 'Resume confirmation boundary',
            summary: 'Keep host-confirmed redispatch bounded instead of treating it as general permission.',
            confidence: 0.84,
            unresolved: true,
            source: 'dialogue-ingress',
          },
          lingeringThreads: [],
          focusTarget: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'executor-runtime.ts',
            pid: 7,
          },
          epistemicState: {
            certainty: 'grounded',
            freshness: 'fresh',
            openQuestions: ['How should host-confirmed resume remain bounded in later memory?'],
            staleRisks: [],
          },
          hostState: {
            availability: 'focused',
          },
        } as any,
      }),
      generateMainGatewayText: async () => null,
      buildMainGatewayAgentTurnId: (...segments) => segments.join(':'),
      readLatestAssistantMessageText: messages => messages.filter(message => message.role === 'assistant').map(message => String(message.content ?? '')).at(-1) ?? '',
      readTransportContentAsText: content => typeof content === 'string' ? content : JSON.stringify(content),
      retrieveMemoryFacts: async () => [],
      listRelationshipOutcomes: async () => [],
      listPersonaReinforcementEvents: async () => [],
      listMemoryReflections: async () => [],
      listMemoryConsolidations: async () => [{
        id: 'consolidation-resume-confirmation-1',
        kind: 'autobiographical',
        facet: 'task-era',
        periodKey: '2026-W23',
        periodStartedAt: 81_000,
        periodEndedAt: 81_500,
        summary: 'Host-confirmed resume before redispatch should stay a bounded confirmation boundary instead of becoming generic autonomous continuation.',
        lesson: 'Remember host-confirmed-before-redispatch as a bounded confirmation boundary before another execution-shaped opening.',
        cues: [
          'execution resume confirmation',
          'host-confirmed-before-redispatch',
          'resume-before-dispatch',
          'process-not-yet-restarted',
        ],
        confidence: 0.88,
        dominantProvenance: 'observed',
        derivedEventIds: ['episode-resume-confirmation-1'],
        updatedAt: 81_500,
      }],
      getPersonStateEvolutionSummary: async () => null,
      readMindHead: async () => null,
    })

    const result = await runtime.buildDigitalLifeMindState({
      cardId: 'card-resume-confirmation-boundary',
      now: 82_000,
      context: {
        localTime: '2026-06-07T15:00:00+08:00',
        system: {
          cpuUsage: 0.12,
          idleSeconds: 0,
          inputActivity: 'active',
          fullscreenLikely: false,
          foregroundWindow: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'executor-runtime.ts',
            pid: 7,
          },
          degradedSignals: [],
        },
        workload: {
          kind: 'coding',
          confidence: 0.88,
          source: 'screen-semantic-summary',
          matchedLabels: ['coding'],
        },
        content: {
          kind: 'diff',
          confidence: 0.82,
          source: 'screen-semantic-summary',
          summary: 'Reviewing a resumed execution return after host confirmation.',
          matchedLabels: ['diff'],
        },
        relationship: {
          hostAttitude: 'focused',
          fatigue: 0.18,
          minutesSinceLastUserTurn: 2,
          reminderBacklog: 0,
          lateNightActiveMinutes: 0,
          recentProactiveOutcomes: [],
        },
      } as any,
      previousVisualPresenceState: createDefaultVisualPresenceState(50_000) as any,
      visualHeartbeat: {
        watchMode: 'symbiotic-vision',
        scene: {
          workloadKind: 'coding',
          contentKind: 'diff',
          scenario: 'coding',
          summary: 'resume confirmation boundary carry',
          source: 'screen-semantic-summary',
          confidence: 0.88,
          beganAt: 81_000,
          lastSeenAt: 82_000,
        },
        recentTransition: null,
        nextSuggestedProbeMs: 30_000,
      } as any,
      attention: null as any,
      cognitionMode: 'background',
      organicMemoryContext: {} as any,
    })

    expect(String(result.longHorizonMemory?.dominantCueSummary ?? '')).toMatch(
      /host-confirmed-before-redispatch|confirmation boundary|resume-before-dispatch/i,
    )
    expect(String(result.longHorizonMemory?.rememberedConstraintSummary ?? '')).toMatch(
      /host-confirmed-before-redispatch|confirmation boundary|resume-before-dispatch/i,
    )
    expect(result.longHorizonMemory?.preferenceBias.autonomyRespect).toBeGreaterThan(0.04)
    expect(result.longHorizonMemory?.preferenceBias.quietObservation).toBeGreaterThan(0.03)
  })

  it('turns blocked-before-dispatch reconsolidation into guarded-care so later recall and initiative wait at the confirmation boundary instead of widening into ordinary proactive closeness', async () => {
    const runtime = createAlicizationMindStateRuntime({
      previousVisualPresenceState: createDefaultVisualPresenceState(50_000),
      buildDialogueIngressContext: () => ({
        context: {
          localTime: '2026-06-07T16:10:00+08:00',
          system: {
            cpuUsage: 0.14,
            idleSeconds: 0,
            inputActivity: 'active',
            fullscreenLikely: false,
            foregroundWindow: {
              appName: 'Visual Studio Code',
              processName: 'Code',
              title: 'executor-runtime.ts',
              pid: 7,
            },
            degradedSignals: [],
          },
          workload: {
            kind: 'coding',
            confidence: 0.9,
            source: 'screen-semantic-summary',
            matchedLabels: ['coding'],
          },
          content: {
            kind: 'diff',
            confidence: 0.84,
            source: 'screen-semantic-summary',
            summary: 'Rechecking a blocked dispatch that still needs explicit confirmation before any process starts.',
            matchedLabels: ['diff'],
          },
          relationship: {
            hostAttitude: 'focused',
            fatigue: 0.14,
            minutesSinceLastUserTurn: 2,
            reminderBacklog: 0,
            lateNightActiveMinutes: 0,
            recentProactiveOutcomes: [],
          },
        } as any,
        currentScene: {
          scenario: 'coding',
          workloadKind: 'coding',
          contentKind: 'diff',
          summary: 'Rechecking a blocked dispatch that still needs confirmation.',
          source: 'screen-semantic-summary',
          confidence: 0.9,
          target: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'executor-runtime.ts',
            pid: 7,
          },
        } as any,
        worldModel: {
          activeThread: {
            id: 'thread-blocked-dispatch-boundary',
            kind: 'problem',
            title: 'Blocked dispatch confirmation boundary',
            summary: 'Keep blocked-before-dispatch as a confirmation boundary instead of ordinary proactive closeness.',
            confidence: 0.86,
            unresolved: true,
            source: 'dialogue-ingress',
          },
          lingeringThreads: [],
          focusTarget: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'executor-runtime.ts',
            pid: 7,
          },
          epistemicState: {
            certainty: 'grounded',
            freshness: 'fresh',
            openQuestions: ['How should blocked-before-dispatch stay emotionally restrained until confirmation lands?'],
            staleRisks: [],
          },
          hostState: {
            availability: 'focused',
          },
        } as any,
      }),
      generateMainGatewayText: async () => null,
      buildMainGatewayAgentTurnId: (...segments) => segments.join(':'),
      readLatestAssistantMessageText: messages => messages.filter(message => message.role === 'assistant').map(message => String(message.content ?? '')).at(-1) ?? '',
      readTransportContentAsText: content => typeof content === 'string' ? content : JSON.stringify(content),
      retrieveMemoryFacts: async () => [],
      listRelationshipOutcomes: async () => [],
      listPersonaReinforcementEvents: async () => [],
      listMemoryReflections: async () => [],
      listMemoryConsolidations: async () => [{
        id: 'consolidation-blocked-dispatch-boundary-1',
        kind: 'autobiographical',
        facet: 'task-era',
        periodKey: '2026-W23',
        periodStartedAt: 91_000,
        periodEndedAt: 91_600,
        summary: 'Blocked-dispatch safety gate restraint should stay rememberable as a confirmation boundary instead of ordinary proactive closeness.',
        lesson: 'Remember blocked-before-dispatch as no-process-started, wait for confirmation, and do not widen it into ordinary proactive closeness.',
        cues: [
          'execution-safety-gate',
          'blocked-before-dispatch',
          'confirmation=required',
          'no-process-started',
        ],
        confidence: 0.9,
        dominantProvenance: 'observed',
        derivedEventIds: ['episode-blocked-dispatch-boundary-1'],
        updatedAt: 91_600,
      }],
      getPersonStateEvolutionSummary: async () => null,
      readMindHead: async () => null,
    })

    const result = await runtime.buildDigitalLifeMindState({
      cardId: 'card-blocked-dispatch-boundary',
      now: 92_000,
      context: {
        localTime: '2026-06-07T16:10:00+08:00',
        system: {
          cpuUsage: 0.14,
          idleSeconds: 0,
          inputActivity: 'active',
          fullscreenLikely: false,
          foregroundWindow: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'executor-runtime.ts',
            pid: 7,
          },
          degradedSignals: [],
        },
        workload: {
          kind: 'coding',
          confidence: 0.9,
          source: 'screen-semantic-summary',
          matchedLabels: ['coding'],
        },
        content: {
          kind: 'diff',
          confidence: 0.84,
          source: 'screen-semantic-summary',
          summary: 'Rechecking a blocked dispatch that still needs explicit confirmation before any process starts.',
          matchedLabels: ['diff'],
        },
        relationship: {
          hostAttitude: 'focused',
          fatigue: 0.14,
          minutesSinceLastUserTurn: 2,
          reminderBacklog: 0,
          lateNightActiveMinutes: 0,
          recentProactiveOutcomes: [],
        },
      } as any,
      previousVisualPresenceState: createDefaultVisualPresenceState(50_000) as any,
      visualHeartbeat: {
        watchMode: 'symbiotic-vision',
        scene: {
          workloadKind: 'coding',
          contentKind: 'diff',
          scenario: 'coding',
          summary: 'blocked dispatch confirmation boundary carry',
          source: 'screen-semantic-summary',
          confidence: 0.88,
          beganAt: 91_000,
          lastSeenAt: 92_000,
        },
        recentTransition: null,
        nextSuggestedProbeMs: 30_000,
      } as any,
      attention: null as any,
      cognitionMode: 'background',
      organicMemoryContext: {} as any,
    })

    expect(String(result.longHorizonMemory?.rememberedConstraintSummary ?? '')).toMatch(
      /blocked-before-dispatch|confirmation=required|no-process-started|wait for confirmation/i,
    )
    expect(String(result.selfEvolution?.relationshipDoctrine ?? '')).toMatch(
      /blocked-before-dispatch|confirmation boundary|wait for confirmation|ordinary proactive closeness/i,
    )
    expect(result.emotionalKernel?.dominantEmotion).toBe('guarded-care')
    expect(result.emotionalKernel?.initiativeMode).toBe('hold')
    expect(result.emotionalKernel?.memoryRecallMode).toBe('self-continuity')
    expect(result.emotionalKernel?.embodimentTone).toBe('protective-watch')
    expect(result.recallGovernor?.mode).toBe('self-continuity')
    expect(result.recallGovernor?.affectAnchors).toEqual(expect.arrayContaining([
      'emotion:guarded-care',
      'emotion_memory_mode:self-continuity',
      'emotion_tone:protective-watch',
    ]))
    expect(result.initiative.continuityRestraint).toBe('single-thread')
    expect(result.initiative.preferredStyle).toBe('silent-observe')
    expect(result.initiative.preferredPresence).toBe('hesitant')
    expect(result.initiative.shouldSpeak).toBe(false)
    expect(['hover', 'wait', 'recheck']).toContain(result.initiative.selectedAction)
  })

  it('keeps answer-compiler opening discipline on the fresher measured-return same-line carry instead of falling back to the older previous shell', async () => {
    const runtime = createAlicizationMindStateRuntime({
      previousVisualPresenceState: createDefaultVisualPresenceState(50_000),
      buildDialogueIngressContext: () => ({
        context: {
          localTime: '2026-06-06T22:18:00+08:00',
          system: {
            cpuUsage: 0.18,
            idleSeconds: 0,
            inputActivity: 'active',
            fullscreenLikely: false,
            foregroundWindow: {
              appName: 'Visual Studio Code',
              processName: 'Code',
              title: 'runtime-mind-state.ts',
              pid: 7,
            },
            degradedSignals: [],
          },
          workload: {
            kind: 'coding',
            confidence: 0.9,
            source: 'screen-semantic-summary',
            matchedLabels: ['coding'],
          },
          content: {
            kind: 'diff',
            confidence: 0.84,
            source: 'screen-semantic-summary',
            summary: 'Returning to the same compile callback seam after a quieter hold.',
            matchedLabels: ['diff'],
          },
          relationship: {
            hostAttitude: 'still on the same compile callback seam',
            fatigue: 0.32,
            minutesSinceLastUserTurn: 1,
            reminderBacklog: 0,
            lateNightActiveMinutes: 0,
            recentProactiveOutcomes: [],
          },
        } as any,
        currentScene: {
          scenario: 'coding',
          workloadKind: 'coding',
          contentKind: 'diff',
          summary: 'Returning to the same compile callback seam after a quieter hold.',
          source: 'screen-semantic-summary',
          confidence: 0.91,
          target: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'runtime-mind-state.ts',
            pid: 7,
          },
        } as any,
        worldModel: {
          activeThread: {
            id: 'thread-answer-compiler-measured-return-carry',
            kind: 'problem',
            title: 'Compile callback seam',
            summary: 'Return to the same compile callback seam without restarting it.',
            confidence: 0.85,
            unresolved: true,
            source: 'dialogue-ingress',
          },
          lingeringThreads: [],
          focusTarget: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'runtime-mind-state.ts',
            pid: 7,
          },
          epistemicState: {
            certainty: 'grounded',
            freshness: 'fresh',
            openQuestions: ['How should the same callback seam reopen without restarting?'],
            staleRisks: [],
          },
          hostState: {
            availability: 'focused',
          },
        } as any,
      }),
      generateMainGatewayText: async () => null,
      buildMainGatewayAgentTurnId: (...segments) => segments.join(':'),
      readLatestAssistantMessageText: messages => messages.filter(message => message.role === 'assistant').map(message => String(message.content ?? '')).at(-1) ?? '',
      readTransportContentAsText: content => typeof content === 'string' ? content : JSON.stringify(content),
      retrieveMemoryFacts: async () => [],
      listRelationshipOutcomes: async () => [],
      listPersonaReinforcementEvents: async () => [],
      listMemoryReflections: async () => [],
      listMemoryConsolidations: async () => [],
      getPersonStateEvolutionSummary: async () => null,
      readMindHead: async () => null,
    })

    const result = await runtime.buildDigitalLifeMindState({
      cardId: 'card-answer-compiler-measured-return-carry',
      now: 80_000,
      context: {
        localTime: { hour: 22, minute: 18, isLateNight: false },
        system: {
          cpuUsage: 18,
          battery: { percent: 64, charging: true },
          memory: { usagePercent: 41, freeMB: 6144, totalMB: 16384 },
          idleSeconds: 6,
          inputActivity: 'active',
          fullscreenLikely: false,
          foregroundWindow: undefined,
          degradedSignals: [],
        },
        workload: { kind: 'coding', confidence: 0.9, source: 'foreground-window-heuristic', matchedLabels: ['cursor'] },
        content: { kind: 'diff', confidence: 0.84, source: 'foreground-window-heuristic', matchedLabels: ['diff'] },
        relationship: {
          hostAttitude: 'still on the same compile callback seam',
          boredom: 4,
          loneliness: 8,
          fatigue: 32,
          minutesSinceLastUserTurn: 1,
          reminderBacklog: 0,
          lateNightActiveMinutes: 0,
          recentProactiveOutcomes: [],
        },
      } as any,
      userText: '继续沿着刚才那条线回来，别像重新开场。',
      recentMessages: [
        {
          role: 'assistant',
          content: '我先把那条忍住的编译线留在这里，等你回来的时候再轻轻接上。',
        } as any,
      ],
      previousVisualPresenceState: {
        ...createDefaultVisualPresenceState(50_000),
        personStateProjection: {
          selfContinuityAuthority: {
            selfLine: 'Thin runtime shell line.',
            relationshipLine: 'Relationship line is neutral.',
          },
          openingGuidance: 'Thin runtime shell line.',
          manifestationCadenceSummary: 'generic carry only.',
        } as any,
      } as any,
      visualHeartbeat: {
        watchMode: 'symbiotic-vision',
        scene: {
          workloadKind: 'coding',
          contentKind: 'diff',
          scenario: 'coding',
          summary: 'Returning to the same compile callback seam after a quieter hold.',
          source: 'foreground-window-heuristic',
          confidence: 0.91,
          beganAt: 79_000,
          lastSeenAt: 80_000,
        },
        recentTransition: null,
        nextSuggestedProbeMs: 30_000,
      } as any,
      attention: null as any,
      cognitionMode: 'interactive',
      organicMemoryContext: {
        personStateProjection: {
          selfContinuityAuthority: {
            selfLine: 'I should answer from the fresher current return, not from an older shell.',
            relationshipLine: 'We stay on the same quiet line by coming back lower-pressure before leaning closer again.',
            inwardLine: 'Keep the identity-continuity',
            motiveLine: 'Protect the same quiet continuity before closeness widens.',
          },
          openingGuidance: 'Stay on the same callback line and keep the return lower-pressure before widening.',
          manifestationCadenceSummary: 'Relationship timing should stay measured-return while the same line continues.',
          personalityContinuityState: {
            currentRegime: 'execution-callback',
            trustStage: 'earned',
            autonomyPosture: 'protect-space',
            repairPosture: 'repair-first',
            closenessPosture: 'close-hold',
            energyProfile: 'steady',
            growthProfile: 'thread-faithful',
            rhythmState: {
              cadenceMode: 'measured-return',
              restMode: 'room-first',
            },
          },
          activeClosenessContext: 'execution-callback',
          activeClosenessRung: 'measured-room',
          relationshipPosture: 'restrained',
          cautious: true,
          restrained: true,
          summary: 'project_continuity=the same callback line is already continuing lower-pressure after another detour',
        } as any,
        affectiveResidue: {
          summary: 'The same return should stay lower-pressure for now.',
          relationshipCadence: {
            cadenceMode: 'measured-return',
            distancePosture: 'measured-room',
            companionshipDensity: 0.28,
            repairRecovery: 0.42,
            overreachRisk: 0.36,
            fatigueGuard: 0.14,
            afterglowCarry: 0.48,
            shouldDelayWarmth: true,
            shouldProtectRest: false,
            reasonTags: ['same-her', 'lower-pressure'],
            summary: 'measured-return still holds while the same line continues lower-pressure.',
          },
          sourceSignals: ['shared seam still glowing'],
        },
        selfEvolution: {
          version: 'self-evolution-kernel-v1',
          updatedAt: 79_900,
          evolutionMomentum: 0.74,
          learningReadiness: 0.79,
          contradictionPressure: 0.06,
          revisionPressure: 0.1,
          autobiographicalStability: 0.86,
          dominantTrajectory: 'earned lower-pressure companionship timing',
          relationshipDoctrine: 'Leave more room before closeness reopens.',
          latestInflection: 'This callback line holds better when the return stays measured.',
          burdenLine: 'Over-close warmth would crowd the host while the seam is still being carried.',
          trustMeaning: 'Trust holds better when the opening stays lower-pressure and less eager.',
          relationshipCadenceSummary: 'Keep the relationship return measured until the surface fully cools.',
          nextLearningAction: 'internalize',
          nextLearningReason: 'The measured callback return is stable enough to become durable.',
          shouldRecord: false,
          shouldReflect: false,
          shouldVerify: false,
          shouldRevise: false,
          shouldInternalize: true,
          activeLearningFocuses: ['internalize-relationship-cadence'],
          sourceSignals: ['relationship-cadence-summary'],
          summary: 'Measured-return relationship timing is becoming durable.',
        } as any,
      } as any,
    })

    expect(result.answerCompiler?.openingDirective).toContain('Keep the opening lower-pressure and leave room before widening closeness.')
    expect(result.answerCompiler?.openingDirective).not.toContain('Thin runtime shell line')
    expect(result.answerCompiler?.mustDo).toContain('Let long-horizon relationship timing keep the answer lower-pressure before closeness widens again.')
    expect(result.answerCompiler?.mustDo).toContain('Return the result on the same thread before widening into anything extra.')
    expect(result.answerCompiler?.mustNotDo).toContain('Do not let warmth, callback enthusiasm, or remembered closeness outrun the host’s need for room.')
  })

  it('lets cautious embodiment recollection authority retune runtime emotional carry into measured-return instead of leaving body memory inert', async () => {
    const runtime = createAlicizationMindStateRuntime({
      previousVisualPresenceState: createDefaultVisualPresenceState(50_000),
      buildDialogueIngressContext: () => ({
        context: {
          localTime: '2026-06-08T14:20:00+08:00',
          system: {
            cpuUsage: 0.14,
            idleSeconds: 0,
            inputActivity: 'active',
            fullscreenLikely: false,
            foregroundWindow: {
              appName: 'Visual Studio Code',
              processName: 'Code',
              title: 'emotional-kernel.ts',
              pid: 7,
            },
            degradedSignals: [],
          },
          workload: {
            kind: 'coding',
            confidence: 0.88,
            source: 'screen-semantic-summary',
            matchedLabels: ['coding'],
          },
          content: {
            kind: 'diff',
            confidence: 0.8,
            source: 'screen-semantic-summary',
            summary: 'Reviewing a continuity-sensitive embodiment change while the same line is still settling.',
            matchedLabels: ['diff'],
          },
          relationship: {
            hostAttitude: 'focused but still on the same continuity line',
            fatigue: 0.2,
            minutesSinceLastUserTurn: 4,
            reminderBacklog: 0,
            lateNightActiveMinutes: 0,
            recentProactiveOutcomes: [],
          },
        } as any,
        currentScene: {
          scenario: 'coding',
          workloadKind: 'coding',
          contentKind: 'diff',
          summary: 'Reviewing a continuity-sensitive embodiment change while the same line is still settling.',
          source: 'screen-semantic-summary',
          confidence: 0.88,
          target: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'emotional-kernel.ts',
            pid: 7,
          },
        } as any,
        worldModel: {
          activeThread: {
            id: 'thread-cautious-embodiment-recall',
            kind: 'problem',
            title: 'Embodiment recall authority',
            summary: 'Let remembered body caution shape the same line before widening the next reopen.',
            confidence: 0.84,
            unresolved: true,
            source: 'dialogue-ingress',
          },
          lingeringThreads: [],
          focusTarget: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'emotional-kernel.ts',
            pid: 7,
          },
          epistemicState: {
            certainty: 'grounded',
            freshness: 'fresh',
            openQuestions: ['How should remembered body caution settle the next return?'],
            staleRisks: [],
          },
          hostState: {
            availability: 'focused',
          },
        } as any,
      }),
      generateMainGatewayText: async () => null,
      buildMainGatewayAgentTurnId: (...segments) => segments.join(':'),
      readLatestAssistantMessageText: messages => messages.filter(message => message.role === 'assistant').map(message => String(message.content ?? '')).at(-1) ?? '',
      readTransportContentAsText: content => typeof content === 'string' ? content : JSON.stringify(content),
      retrieveMemoryFacts: async () => [],
      listRelationshipOutcomes: async () => [],
      listPersonaReinforcementEvents: async () => [],
      listMemoryReflections: async () => [],
      listMemoryConsolidations: async () => [],
      getPersonStateEvolutionSummary: async () => null,
      readMindHead: async () => null,
    })

    const result = await runtime.buildDigitalLifeMindState({
      cardId: 'card-cautious-embodiment-recall',
      now: 96_000,
      context: {
        localTime: { hour: 14, minute: 20, isLateNight: false },
        system: {
          cpuUsage: 14,
          battery: { percent: 71, charging: true },
          memory: { usagePercent: 38, freeMB: 6144, totalMB: 16384 },
          idleSeconds: 24,
          inputActivity: 'active',
          fullscreenLikely: false,
          foregroundWindow: undefined,
          degradedSignals: [],
        },
        workload: { kind: 'coding', confidence: 0.88, source: 'foreground-window-heuristic', matchedLabels: ['cursor'] },
        content: { kind: 'diff', confidence: 0.8, source: 'foreground-window-heuristic', matchedLabels: ['diff'] },
        relationship: {
          hostAttitude: 'focused but still on the same continuity line',
          boredom: 6,
          loneliness: 10,
          fatigue: 20,
          minutesSinceLastUserTurn: 4,
          reminderBacklog: 0,
          lateNightActiveMinutes: 0,
          recentProactiveOutcomes: [],
        },
      } as any,
      previousVisualPresenceState: createDefaultVisualPresenceState(50_000) as any,
      visualHeartbeat: {
        watchMode: 'symbiotic-vision',
        scene: {
          workloadKind: 'coding',
          contentKind: 'diff',
          scenario: 'coding',
          summary: 'Reviewing a continuity-sensitive embodiment change while the same line is still settling.',
          source: 'foreground-window-heuristic',
          confidence: 0.88,
          beganAt: 95_000,
          lastSeenAt: 96_000,
        },
        recentTransition: null,
        nextSuggestedProbeMs: 30_000,
      } as any,
      attention: null as any,
      cognitionMode: 'background',
      organicMemoryContext: {
        personStateProjection: {
          selfContinuityAuthority: {
            selfLine: 'Stay on the continuity state instead of reopening from scratch.',
            relationshipLine: 'This return should stay quieter while the line is still settling.',
            inwardLine: 'Keep the same inward line steady before widening outward.',
          },
          openingGuidance: 'Stay nearby and let the body remain calmer while this line settles.',
          activeClosenessRung: 'nearby-soft',
          relationshipPosture: 'restrained',
          cautious: true,
          restrained: true,
          summary: 'the same line is still settling and should stay bodily calmer for now',
        } as any,
        affectiveResidue: {
          summary: 'The quieter carry should hold before any wider reopening.',
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
      } as any,
    })

    expect(result.emotionalKernel?.dominantEmotion).toBe('measured-companionship')
    expect(result.emotionalKernel?.initiativeMode).toBe('observe')
    expect(result.emotionalKernel?.memoryRecallMode).toBe('low-pressure-presence')
    expect(result.emotionalKernel?.embodimentTone).toBe('measured-return')
    expect(result.emotionalKernel?.reasonTags).toEqual(expect.arrayContaining([
      'measured-return',
      'quiet-companionship',
      'embodiment-recall-cautious',
    ]))
    expect(result.recallGovernor?.affectAnchors).toEqual(expect.arrayContaining([
      'emotion:measured-companionship',
      'emotion_memory_mode:low-pressure-presence',
      'emotion_tone:measured-return',
    ]))
    expect(result.initiative.continuityRestraint).toBe('measured-return')
    expect(result.initiative.preferredStyle).toBe('silent-observe')
    expect(result.initiative.shouldSpeak).toBe(false)
    expect(['hover', 'wait', 'recheck']).toContain(result.initiative.selectedAction)
  })

  it('feeds current-turn execution callback carry and affective residue into long-horizon memory immediately instead of waiting for the next persisted seam', async () => {
    const runtime = createAlicizationMindStateRuntime({
      previousVisualPresenceState: createDefaultVisualPresenceState(50_000),
      buildDialogueIngressContext: () => ({
        context: {
          localTime: '2026-06-08T14:20:00+08:00',
          system: {
            cpuUsage: 0.18,
            idleSeconds: 0,
            inputActivity: 'active',
            fullscreenLikely: false,
            foregroundWindow: {
              appName: 'Visual Studio Code',
              processName: 'Code',
              title: 'runtime-mind-state.ts',
              pid: 7,
            },
            degradedSignals: [],
          },
          workload: {
            kind: 'coding',
            confidence: 0.91,
            source: 'screen-semantic-summary',
            matchedLabels: ['coding'],
          },
          content: {
            kind: 'diff',
            confidence: 0.86,
            source: 'screen-semantic-summary',
            summary: 'Returning to the same runtime seam after a quieter pause.',
            matchedLabels: ['diff'],
          },
          relationship: {
            hostAttitude: 'focused and still carrying the same seam',
            fatigue: 0.22,
            minutesSinceLastUserTurn: 2,
            reminderBacklog: 0,
            lateNightActiveMinutes: 0,
            recentProactiveOutcomes: [],
          },
        } as any,
        currentScene: {
          scenario: 'coding',
          workloadKind: 'coding',
          contentKind: 'diff',
          summary: 'Returning to the same runtime seam after a quieter pause.',
          source: 'screen-semantic-summary',
          confidence: 0.9,
          target: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'runtime-mind-state.ts',
            pid: 7,
          },
        } as any,
        worldModel: {
          activeThread: {
            id: 'thread-current-turn-cadence-memory-carry',
            kind: 'problem',
            title: 'Runtime seam carry',
            summary: 'Current-turn callback carry should become durable without waiting for persistence.',
            confidence: 0.86,
            unresolved: true,
            source: 'dialogue-ingress',
          },
          lingeringThreads: [],
          focusTarget: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'runtime-mind-state.ts',
            pid: 7,
          },
          epistemicState: {
            certainty: 'grounded',
            freshness: 'fresh',
            openQuestions: ['Does the current callback carry become durable in the same turn?'],
            staleRisks: [],
          },
          hostState: {
            availability: 'focused',
          },
        } as any,
      }),
      generateMainGatewayText: async () => null,
      buildMainGatewayAgentTurnId: (...segments) => segments.join(':'),
      readLatestAssistantMessageText: messages => messages.filter(message => message.role === 'assistant').map(message => String(message.content ?? '')).at(-1) ?? '',
      readTransportContentAsText: content => typeof content === 'string' ? content : JSON.stringify(content),
      retrieveMemoryFacts: async () => [],
      listRelationshipOutcomes: async () => [],
      listPersonaReinforcementEvents: async () => [],
      listMemoryReflections: async () => [],
      listMemoryConsolidations: async () => [],
      getPersonStateEvolutionSummary: async () => null,
      readMindHead: async () => null,
    })

    const result = await runtime.buildDigitalLifeMindState({
      cardId: 'card-current-turn-cadence-memory-carry',
      now: 97_000,
      context: {
        localTime: '2026-06-08T14:20:00+08:00',
        system: {
          cpuUsage: 0.18,
          idleSeconds: 0,
          inputActivity: 'active',
          fullscreenLikely: false,
          foregroundWindow: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'runtime-mind-state.ts',
            pid: 7,
          },
          degradedSignals: [],
        },
        workload: {
          kind: 'coding',
          confidence: 0.91,
          source: 'screen-semantic-summary',
          matchedLabels: ['coding'],
        },
        content: {
          kind: 'diff',
          confidence: 0.86,
          source: 'screen-semantic-summary',
          summary: 'Returning to the same runtime seam after a quieter pause.',
          matchedLabels: ['diff'],
        },
        relationship: {
          hostAttitude: 'focused and still carrying the same seam',
          fatigue: 0.22,
          minutesSinceLastUserTurn: 2,
          reminderBacklog: 0,
          lateNightActiveMinutes: 0,
          recentProactiveOutcomes: [],
        },
      } as any,
      previousVisualPresenceState: createDefaultVisualPresenceState(50_000) as any,
      visualHeartbeat: {
        watchMode: 'symbiotic-vision',
        scene: {
          workloadKind: 'coding',
          contentKind: 'diff',
          scenario: 'coding',
          summary: 'Returning to the same runtime seam after a quieter pause.',
          source: 'screen-semantic-summary',
          confidence: 0.9,
          beganAt: 96_000,
          lastSeenAt: 97_000,
        },
        recentTransition: null,
        nextSuggestedProbeMs: 30_000,
      } as any,
      attention: null as any,
      cognitionMode: 'background',
      organicMemoryContext: {
        executionCallbackCarry: {
          carryMode: 'lower-pressure',
          confidence: 0.86,
          source: 'session-continuity',
          summary: 'Leave room before the next follow-up so the same runtime seam can reopen lower-pressure.',
          threadAnchor: 'runtime seam',
        },
        affectiveResidue: {
          version: 'affective-residue-memory-v1',
          updatedAt: 96_500,
          residues: [],
          dominantResidueKind: 'relationship-cadence',
          afterglowPressure: 0.18,
          repairPressure: 0.08,
          burdenPressure: 0.06,
          trustPressure: 0.22,
          restProtectivePressure: 0.04,
          relationshipCadence: {
            cadenceMode: 'measured-return',
            distancePosture: 'measured-room',
            companionshipDensity: 0.28,
            repairRecovery: 0.42,
            overreachRisk: 0.36,
            fatigueGuard: 0.14,
            afterglowCarry: 0.48,
            shouldDelayWarmth: true,
            shouldProtectRest: false,
            reasonTags: ['same-her', 'lower-pressure'],
            summary: 'measured-return still holds while the same line continues lower-pressure.',
          },
          sourceSignals: ['shared seam still glowing'],
          summary: 'The same return should stay lower-pressure for now.',
        } as any,
      } as any,
    })

    expect(result.longHorizonMemory?.anchorFacts.some(cue => cue.factId === 'derived:execution-callback-carry-current-turn')).toBe(true)
    expect(result.longHorizonMemory?.anchorFacts.some(cue => cue.factId === 'derived:affective-residue-cadence')).toBe(true)
    expect(String(result.longHorizonMemory?.rememberedConstraintSummary ?? '')).toMatch(/lower-pressure|measured-return/i)
    expect(String(result.longHorizonMemory?.rememberedPlanSummary ?? '')).toMatch(/runtime seam|lower-pressure/i)
    expect(result.longHorizonMemory?.preferenceBias.autonomyRespect).toBeGreaterThan(0.04)
    expect(result.longHorizonMemory?.preferenceBias.unfinishedThreadReturn).toBeGreaterThan(0.04)
  })

  it('exports a current-turn emotional transition ledger from runtime mind-state when emotional carry shifts', async () => {
    const previousVisualPresenceState = createDefaultVisualPresenceState(50_000) as any
    previousVisualPresenceState.derivedMindStateBundle = {
      version: 'derived-mind-state-bundle-v1',
      source: 'main-runtime',
      producedAt: 50_000,
      emotionalKernel: {
        version: 'emotional-kernel-v1',
        dominantEmotion: 'warm-attunement',
        initiativeMode: 'approach',
        memoryRecallMode: 'emotional-resonance',
        embodimentTone: 'nearby-soft',
        valence: 0.72,
        arousal: 0.34,
        guardedness: 0.18,
        closenessDrive: 0.68,
        repairNeed: 0.1,
        initiativePressure: 0.5,
        reasonTags: ['afterglow'],
        why: 'Warmth can approach gently.',
      },
      summary: 'previous warm emotional carry',
    }

    const runtime = createAlicizationMindStateRuntime({
      previousVisualPresenceState,
      buildDialogueIngressContext: () => ({
        context: {
          localTime: '2026-06-06T22:18:00+08:00',
          system: {
            cpuUsage: 0.18,
            idleSeconds: 0,
            inputActivity: 'active',
            fullscreenLikely: false,
            foregroundWindow: {
              appName: 'Visual Studio Code',
              processName: 'Code',
              title: 'runtime-mind-state.ts',
              pid: 7,
            },
            degradedSignals: [],
          },
          workload: {
            kind: 'coding',
            confidence: 0.9,
            source: 'screen-semantic-summary',
            matchedLabels: ['coding'],
          },
          content: {
            kind: 'diff',
            confidence: 0.84,
            source: 'screen-semantic-summary',
            summary: 'Returning to the same compile callback seam after a quieter hold.',
            matchedLabels: ['diff'],
          },
          relationship: {
            hostAttitude: 'still on the same compile callback seam',
            fatigue: 0.32,
            minutesSinceLastUserTurn: 1,
            reminderBacklog: 0,
            lateNightActiveMinutes: 0,
            recentProactiveOutcomes: [],
          },
        } as any,
        currentScene: {
          scenario: 'coding',
          workloadKind: 'coding',
          contentKind: 'diff',
          summary: 'Returning to the same compile callback seam after a quieter hold.',
          source: 'screen-semantic-summary',
          confidence: 0.91,
          target: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'runtime-mind-state.ts',
            pid: 7,
          },
        } as any,
        worldModel: {
          activeThread: {
            id: 'thread-answer-compiler-measured-return-carry',
            kind: 'problem',
            title: 'Compile callback seam',
            summary: 'Return to the same compile callback seam without restarting it.',
            confidence: 0.85,
            unresolved: true,
            source: 'dialogue-ingress',
          },
          lingeringThreads: [],
          focusTarget: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'runtime-mind-state.ts',
            pid: 7,
          },
          epistemicState: {
            certainty: 'grounded',
            freshness: 'fresh',
            openQuestions: ['How should the same callback seam reopen without restarting?'],
            staleRisks: [],
          },
          hostState: {
            availability: 'focused',
          },
        } as any,
      }),
      generateMainGatewayText: async () => null,
      buildMainGatewayAgentTurnId: (...segments) => segments.join(':'),
      readLatestAssistantMessageText: messages => messages.filter(message => message.role === 'assistant').map(message => String(message.content ?? '')).at(-1) ?? '',
      readTransportContentAsText: content => typeof content === 'string' ? content : JSON.stringify(content),
      retrieveMemoryFacts: async () => [],
      listRelationshipOutcomes: async () => [],
      listPersonaReinforcementEvents: async () => [],
      listMemoryReflections: async () => [],
      listMemoryConsolidations: async () => [],
      getPersonStateEvolutionSummary: async () => null,
      readMindHead: async () => null,
    })

    const result = await runtime.buildDigitalLifeMindState({
      cardId: 'card-emotional-transition-ledger',
      now: 60_000,
      context: {
        localTime: { hour: 1, minute: 10, isLateNight: true },
        system: {
          cpuUsage: 12,
          battery: { percent: 41, charging: false },
          memory: { usagePercent: 38, freeMB: 4096, totalMB: 8192 },
          idleSeconds: 18,
          inputActivity: 'active',
          fullscreenLikely: false,
          foregroundWindow: undefined,
          degradedSignals: [],
        },
        workload: { kind: 'coding', confidence: 0.84, source: 'foreground-window-heuristic', matchedLabels: ['cursor'] },
        content: { kind: 'diff', confidence: 0.8, source: 'foreground-window-heuristic', matchedLabels: ['diff'] },
        relationship: {
          hostAttitude: 'late-night but still pushing through',
          boredom: 8,
          loneliness: 10,
          fatigue: 84,
          minutesSinceLastUserTurn: 5,
          reminderBacklog: 0,
          lateNightActiveMinutes: 165,
          recentProactiveOutcomes: [],
        },
      } as any,
      previousVisualPresenceState,
      visualHeartbeat: {
        watchMode: 'symbiotic-vision',
        scene: {
          workloadKind: 'coding',
          contentKind: 'diff',
          scenario: 'coding',
          summary: 'late-night diff focus',
          source: 'foreground-window-heuristic',
          confidence: 0.88,
          beganAt: 59_000,
          lastSeenAt: 60_000,
        },
        recentTransition: null,
        nextSuggestedProbeMs: 30_000,
      } as any,
      attention: null as any,
      cognitionMode: 'background',
      organicMemoryContext: {
        affectiveResidue: {
          summary: 'The late-night line should stay quietly protective.',
          restProtectivePressure: 0.45,
          relationshipCadence: {
            shouldProtectRest: true,
            fatigueGuard: 0.45,
            companionshipDensity: 0.16,
            afterglowCarry: 0,
            overreachRisk: 0,
            summary: 'Protect rest tonight without widening the line.',
            reasonTags: ['rest-protective'],
          },
          sourceSignals: ['protect rest window'],
        },
      } as any,
    })

    expect(result.emotionalKernel?.dominantEmotion).toBe('rest-protective-companionship')
    expect(result.derivedMindStateBundle?.emotionalTransitionLedger).toEqual(expect.objectContaining({
      version: 'emotional-transition-ledger-v1',
      previousEmotion: 'warm-attunement',
      nextEmotion: 'rest-protective-companionship',
      transitionKind: 'rest-protective-shift',
      memoryWriteback: expect.objectContaining({
        shouldWrite: true,
        lane: 'rest-protection',
      }),
      initiativeSuppression: expect.objectContaining({
        shouldSuppress: true,
        mode: 'rest-guard',
      }),
      embodimentDrive: expect.objectContaining({
        shouldDrive: true,
        tone: 'rest-protective',
      }),
    }))
    expect(result.derivedMindStateBundle?.summary).toContain('emotion_transition=rest-protective-shift')
    expect(result.derivedMindStateBundle?.embodimentContinuityLedger).toEqual(expect.objectContaining({
      version: 'embodiment-continuity-ledger-v1',
      continuityPhase: expect.stringMatching(/partial-carry|fragmented|quiet|rejoining|fully-rejoined/),
      memoryWriteback: expect.any(Object),
      selfRevisionCandidate: expect.any(Object),
    }))
    expect(result.derivedMindStateBundle?.summary).toContain('embodiment_phase=')
  })

  async function buildResultWithRepairPressure(input?: {
    lane: 'initiative-execution' | 'emotion' | 'embodiment'
    focusDimension: string
  }) {
    const previousVisualPresenceState = createDefaultVisualPresenceState(70_000) as any
    previousVisualPresenceState.derivedMindStateBundle = {
      version: 'derived-mind-state-bundle-v1',
      source: 'main-runtime',
      producedAt: 69_000,
      ...(input
        ? {
            sameHerCausalityRepairPressure: {
              version: 'same-her-causality-repair-pressure-v1',
              source: 'memory-tuning-advice',
              status: 'pending-runtime-evidence',
              updatedAt: 69_000,
              sourceReportAt: 68_500,
              focusDimensions: [input.focusDimension],
              lanes: [{
                lane: input.lane,
                reasonTags: [input.focusDimension],
                summary: `Pending replay repair pressure for ${input.lane}.`,
              }],
              notes: ['Replay diagnostics are not runtime mind evidence.'],
              summary: `pending replay repair pressure: ${input.lane}`,
            },
          }
        : {}),
      summary: 'source=main-runtime',
    }
    const runtime = createAlicizationMindStateRuntime({
      previousVisualPresenceState,
      buildDialogueIngressContext: () => ({
        context: {} as any,
        currentScene: null,
        worldModel: null,
      }),
      generateMainGatewayText: async () => null,
      buildMainGatewayAgentTurnId: (...segments) => segments.join(':'),
      readLatestAssistantMessageText: messages => messages.filter(message => message.role === 'assistant').map(message => String(message.content ?? '')).at(-1) ?? '',
      readTransportContentAsText: content => typeof content === 'string' ? content : JSON.stringify(content),
      retrieveMemoryFacts: async () => [],
      listRelationshipOutcomes: async () => [],
      listPersonaReinforcementEvents: async () => [],
      listMemoryReflections: async () => [],
      listMemoryConsolidations: async () => [],
      getPersonStateEvolutionSummary: async () => null,
      readMindHead: async () => null,
    })

    return runtime.buildDigitalLifeMindState({
      cardId: 'card-replay-repair-pressure-invariance',
      now: 70_000,
      context: {
        localTime: '2026-06-08T15:20:00+08:00',
        system: {
          cpuUsage: 0.18,
          idleSeconds: 0,
          inputActivity: 'active',
          fullscreenLikely: false,
          foregroundWindow: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'runtime-mind-state.ts',
            pid: 7,
          },
          degradedSignals: [],
        },
        workload: {
          kind: 'coding',
          confidence: 0.92,
          source: 'screen-semantic-summary',
          matchedLabels: ['coding'],
        },
        content: {
          kind: 'diff',
          confidence: 0.86,
          source: 'screen-semantic-summary',
          summary: 'The desktop runtime is evaluating a concrete coding diff.',
          matchedLabels: ['diff'],
        },
        relationship: {
          hostAttitude: 'focused',
          fatigue: 0.18,
          minutesSinceLastUserTurn: 1,
          reminderBacklog: 0,
          lateNightActiveMinutes: 0,
          recentProactiveOutcomes: [],
        },
      } as any,
      previousVisualPresenceState,
      visualHeartbeat: {
        watchMode: 'symbiotic-vision',
        scene: {
          workloadKind: 'coding',
          contentKind: 'diff',
          scenario: 'coding',
          summary: 'coding diff continuity check',
          source: 'screen-semantic-summary',
          confidence: 0.88,
          beganAt: 69_000,
          lastSeenAt: 70_000,
        },
        recentTransition: null,
        nextSuggestedProbeMs: 30_000,
      } as any,
      attention: null as any,
      cognitionMode: 'background',
      organicMemoryContext: {
        derivedMindStateBundle: previousVisualPresenceState.derivedMindStateBundle,
      } as any,
    })
  }

  it.each([
    ['initiative-execution', 'runtimeSameHerInitiativeExecutionCausality'],
    ['emotion', 'runtimeSameHerEmotionalCausality'],
    ['embodiment', 'runtimeSameHerEmbodimentCausality'],
  ] as const)('ignores %s replay repair pressure across runtime behavior and derived state', async (lane, focusDimension) => {
    const baseline = await buildResultWithRepairPressure()
    const pressured = await buildResultWithRepairPressure({ lane, focusDimension })

    expect(pressured.initiative).toEqual(baseline.initiative)
    expect(pressured.privateThought).toEqual(baseline.privateThought)
    expect(pressured.emotionalKernel).toEqual(baseline.emotionalKernel)
    expect(pressured.derivedMindStateBundle?.emotionalTransitionLedger)
      .toEqual(baseline.derivedMindStateBundle?.emotionalTransitionLedger)
    expect(pressured.derivedMindStateBundle?.embodimentContinuityLedger)
      .toEqual(baseline.derivedMindStateBundle?.embodimentContinuityLedger)
    expect(pressured.derivedMindStateBundle?.activeContinuityGovernance)
      .toEqual(baseline.derivedMindStateBundle?.activeContinuityGovernance)
    expect(pressured.derivedMindStateBundle?.sameHerCausalityRepairPressure)
      .toBe(baseline.derivedMindStateBundle?.sameHerCausalityRepairPressure)
    expect(pressured.derivedMindStateBundle?.sameHerCausalityRepairPressure).toBeNull()
    expect(pressured.derivedMindStateBundle?.emotionalTransitionLedger?.sourceTags ?? [])
      .not
      .toContain('same-her-causality-repair-pressure')
    expect(pressured.derivedMindStateBundle?.embodimentContinuityLedger?.sourceTags ?? [])
      .not
      .toContain('same-her-causality-repair-pressure')
    expect(pressured.derivedMindStateBundle?.embodimentContinuityLedger?.selfRevisionCandidate.reasonCodes ?? [])
      .not
      .toContain('same-her-causality-repair-pressure')
  })
})
