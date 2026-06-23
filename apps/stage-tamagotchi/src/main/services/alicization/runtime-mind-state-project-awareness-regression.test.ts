import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { createAlicizationMindStateRuntime } from './runtime-mind-state'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

describe('runtime-mind-state project awareness regression', () => {
  it('routes upstream mind project-state consumers through the shared preferred live project-state snapshot before canonical fallback', () => {
    const source = readFileSync(new URL('./runtime-mind-state.ts', import.meta.url), 'utf8')
    const seedMotiveEngineStart = source.indexOf('const seedMotiveEngine = buildMotiveEngine({')
    const seedHabitPolicyStart = source.indexOf('const seedHabitPolicy = buildHabitPolicy({')
    const seedMotiveEngineBlock = seedMotiveEngineStart >= 0 && seedHabitPolicyStart > seedMotiveEngineStart
      ? source.slice(seedMotiveEngineStart, seedHabitPolicyStart)
      : ''

    expect(source).toContain('function resolvePreferredMindProjectStateSnapshot(input: {')
    expect(source).toContain('const previousProjectState = input.previousVisualPresenceState?.currentConsciousFrame?.projectState')
    expect(source).toContain('const projectStateSnapshot = resolveAlicizationProjectStateSnapshot({')
    expect(source).toContain('runtimeProjectState: previousProjectState')
    expect(source).toContain('resolveAlicizationProjectPreDialogueAwarenessLine({')
    expect(source).toContain('const nextClosureTarget = compactPromptText(')
    expect(source).toContain('looksLikeThinMindProjectStateNextClosureTarget(projectStateSnapshot.nextClosureTarget)')
    expect(source).toContain('const preferredMindProjectState = resolvePreferredMindProjectStateSnapshot({')
    expect(source).toContain('const mindProjectStatePromptSnapshot = buildMindProjectStatePromptSnapshot({')
    expect(source).toContain('const mindProjectStateRuntimeSnapshot = buildMindProjectStateRuntimeSnapshot({')
    expect(seedMotiveEngineBlock).toContain('const seedMotiveEngine = buildMotiveEngine({')
    expect(seedMotiveEngineBlock).toContain('projectState: mindProjectStatePromptSnapshot')
    expect(source).toContain('projectState: mindProjectStatePromptSnapshot')
    expect(source).toContain('projectState: mindProjectStateRuntimeSnapshot')
    expect(source).toContain('projectStatePreDialogueAwarenessLine: preferredMindProjectState.preDialogueAwarenessLine')
    expect(source).toContain('projectStatePreflightSummary: preferredMindProjectState.preflightSummary')
    expect(source).toContain('projectStateEmotionalClosureCue: preferredMindProjectState.emotionalClosureCue')
    expect(source).toContain('function buildMindProjectStatePromptSnapshot(input: {')
    expect(source).toContain('function buildMindProjectStateRuntimeSnapshot(input: {')
    expect(source).toContain('identity: input.preferredMindProjectState.identity || undefined')
    expect(source).toContain('currentPhase: input.preferredMindProjectState.currentPhase || undefined')
    expect(source).toContain('preDialogueAwarenessLine: input.preferredMindProjectState.preDialogueAwarenessLine || undefined')
    expect(source).toContain('companionHeadlineLine: input.preferredMindProjectState.companionHeadlineLine || undefined')
    expect(source).toContain('latestLandedProgress: input.preferredMindProjectState.latestLandedProgress || undefined')
    expect(source).toContain('emotionalClosureCue: input.preferredMindProjectState.emotionalClosureCue || undefined')
    expect(source).toContain('emotionalClosureSummary: input.preferredMindProjectState.emotionalClosureSummary || undefined')
    expect(source).toContain('primaryOpenLoop: input.preferredMindProjectState.primaryOpenLoop || undefined')
    expect(source).toContain('preferredVoiceMode: input.preferredMindProjectState.snapshot.preferredVoiceMode || undefined')
    expect(source).toContain('preferredPacingMode: input.preferredMindProjectState.snapshot.preferredPacingMode || undefined')
    expect(source).toContain('nextClosureTarget: input.preferredMindProjectState.nextClosureTarget || undefined')
    expect(source).toContain('sameHerSelfLine: input.preferredMindProjectState.sameHerSelfLine || undefined')
    expect(source).toContain('sameHerHoldDetail: input.preferredMindProjectState.sameHerHoldDetail || undefined')
    expect(source).toContain('sameHerDriftRisk: input.preferredMindProjectState.sameHerDriftRisk || undefined')
    expect(source).toContain('projectStatePreferredVoiceMode: preferredMindProjectState.snapshot.preferredVoiceMode')
    expect(source).toContain('projectStatePreferredPacingMode: preferredMindProjectState.snapshot.preferredPacingMode')
    expect(source).toContain('const initiativeBase = buildInitiativeSnapshot({')
    expect(source).toContain('const autonomy = buildAutonomySnapshot({')
  })

  it('recomputes preferred mind pre-dialogue awareness through the shared resolver instead of trusting only a raw preDialogueAwarenessLine field', () => {
    const source = readFileSync(new URL('./runtime-mind-state.ts', import.meta.url), 'utf8')

    expect(source).toContain('const projectStateSnapshot = resolveAlicizationProjectStateSnapshot({')
    expect(source).toContain('const preDialogueAwarenessLine = compactPromptText(')
    expect(source).toContain('resolveAlicizationProjectPreDialogueAwarenessLine({')
    expect(source).toContain('runtimeProjectState: projectStateSnapshot')
    expect(source).toContain('fallbackProjectState: projectStateBrief')
  })

  it('keeps compact thin closure shells out of the mind-state pre-dialogue awareness path by routing prompt awareness through the shared resolver output', () => {
    const source = readFileSync(new URL('./runtime-mind-state.ts', import.meta.url), 'utf8')

    expect(source).toContain('const preDialogueAwarenessLine = compactPromptText(')
    expect(source).toContain('resolveAlicizationProjectPreDialogueAwarenessLine({')
    expect(source).toContain('runtimeProjectState: projectStateSnapshot')
    expect(source).toContain('preDialogueAwarenessLine: input.preferredMindProjectState.preDialogueAwarenessLine || undefined')
    expect(source).toContain('const preDialogueAwareness = resolvePreferredMindProjectSelfBriefAwarenessLine(projectState)')
    expect(source).toContain('`project_identity=${projectState.identity ?? \'none\'}`')
    expect(source).toContain('`current_phase=${projectState.currentPhase ?? \'none\'}`')
    expect(source).toContain('`pre_dialogue_awareness=${preDialogueAwareness ?? projectState.preflightSummary ?? \'none\'}`')
  })

  it('lets mind-state self-briefs prefer stronger companion headlines over thinner awareness reminders when formatting pre_dialogue_awareness', () => {
    const source = readFileSync(new URL('./runtime-mind-state.ts', import.meta.url), 'utf8')

    expect(source).toContain('function resolvePreferredMindProjectSelfBriefAwarenessLine(projectState: {')
    expect(source).toContain('companionBriefingLine?: string | null')
    expect(source).toContain('const companionBriefingLine = compactPromptText(projectState.companionBriefingLine, 320) || null')
    expect(source).toContain('resolveAlicizationProjectPreDialogueAwarenessLine({')
    expect(source).toContain('companionBriefingLine,')
    expect(source).toContain('return resolvedSharedAwarenessLine')
  })

  it('does not let a narrower embodiment companion headline outrank a fuller Phase 1 awareness line in mind-state self-brief formatting', () => {
    const source = readFileSync(new URL('./runtime-mind-state.ts', import.meta.url), 'utf8')

    expect(source).toContain('scoreAlicizationProjectAwarenessLine,')
    expect(source).toContain('function resolvePreferredMindProjectSelfBriefAwarenessLine(projectState: {')
    expect(source).toContain('const awarenessScore = scoreAlicizationProjectAwarenessLine(preDialogueAwarenessLine)')
    expect(source).toContain('const companionHeadlineScore = scoreAlicizationProjectAwarenessLine(companionHeadlineLine)')
    expect(source).toContain('const resolvedSharedAwarenessScore = resolvedSharedAwarenessLine')
    expect(source).toContain('lowerAwareness.includes(\'phase 1\')')
    expect(source).toContain('lowerAwareness.includes(\'generic assistant shell\')')
    expect(source).toContain('lowerAwareness.includes(\'memory, initiative, and embodiment\')')
    expect(source).toContain('lowerCompanionHeadline.includes(\'body\')')
    expect(source).toContain('lowerCompanionHeadline.includes(\'face\')')
    expect(source).toContain('lowerCompanionHeadline.includes(\'motion\')')
    expect(source).toContain('resolvedSharedAwarenessLine !== companionHeadlineLine')
    expect(source).toContain('return preDialogueAwarenessLine')
    expect(source).toContain('const preDialogueAwareness = resolvePreferredMindProjectSelfBriefAwarenessLine(projectState)')
    expect(source).toContain('`project_identity=${projectState.identity ?? \'none\'}`')
    expect(source).toContain('`current_phase=${projectState.currentPhase ?? \'none\'}`')
    expect(source).toContain('`pre_dialogue_awareness=${preDialogueAwareness ?? projectState.preflightSummary ?? \'none\'}`')
  })

  it('re-expands thin landed-progress, next-closure, same-her, and drift cues through the canonical project-state brief before mind-state prompts are built', () => {
    const source = readFileSync(new URL('./runtime-mind-state.ts', import.meta.url), 'utf8')

    expect(source).toContain('function looksLikeThinMindProjectStateLatestLandedProgress(value: unknown)')
    expect(source).toContain('function looksLikeThinMindProjectStateNextClosureTarget(value: unknown)')
    expect(source).toContain('function looksLikeThinMindProjectStateSameHerSelfLine(value: unknown)')
    expect(source).toContain('function looksLikeThinMindProjectStateSameHerDriftRisk(value: unknown)')
    expect(source).toContain('looksLikeThinMindProjectStateLatestLandedProgress(projectStateSnapshot.latestLandedProgress)')
    expect(source).toContain('? projectStateBrief.continuityProgressSummary')
    expect(source).toContain('looksLikeThinMindProjectStateNextClosureTarget(projectStateSnapshot.nextClosureTarget)')
    expect(source).toContain('? projectStateBrief.nextClosureTarget')
    expect(source).toContain('looksLikeThinMindProjectStateSameHerSelfLine(projectStateSnapshot.sameHerSelfLine)')
    expect(source).toContain('? projectStateBrief.sameHerSelfLine')
    expect(source).toContain('const emotionalClosureSummary = compactPromptText(projectStateSnapshot.emotionalClosureSummary, 220)')
    expect(source).toContain('const sameHerHoldDetail = compactPromptText(projectStateSnapshot.sameHerHoldDetail, 220) || null')
    expect(source).toContain('looksLikeThinMindProjectStateSameHerDriftRisk(projectStateSnapshot.sameHerDriftRisk)')
    expect(source).toContain('? projectStateBrief.sameHerDriftRisk')
  })

  it('injects scene-specific self-briefs into mind-state provider prompts so turn semantics and subjective inference stay on the same digital-life closure line', () => {
    const source = readFileSync(new URL('./runtime-mind-state.ts', import.meta.url), 'utf8')

    expect(source).toContain('function buildDialogueTurnSemanticsProjectSelfBriefSystemBlock()')
    expect(source).toContain('[ALICIZATION_DIALOGUE_TURN_SEMANTICS_SELF_BRIEF]')
    expect(source).toContain('`project_identity=${projectState.identity ?? \'none\'}`')
    expect(source).toContain('`current_phase=${projectState.currentPhase ?? \'none\'}`')
    expect(source).toContain('Dialogue-turn semantics must stay inside the same digital life project line')
    expect(source).toContain('Do not let turn interpretation collapse into a generic task router')
    expect(source).toContain('`latest_landed_progress=${projectState.latestLandedProgress ?? \'none\'}`')
    expect(source).toContain('`same_her_hold=${projectState.sameHerHoldDetail ?? \'none\'}`')
    expect(source).toContain('`same_her_drift_risk=${projectState.sameHerDriftRisk ?? \'none\'}`')
    expect(source).toContain('buildDialogueTurnSemanticsProjectSelfBriefSystemBlock(),')

    expect(source).toContain('function buildSubjectiveInferenceProjectSelfBriefSystemBlock()')
    expect(source).toContain('[ALICIZATION_SUBJECTIVE_INFERENCE_SELF_BRIEF]')
    expect(source).toContain('`project_identity=${projectState.identity ?? \'none\'}`')
    expect(source).toContain('`current_phase=${projectState.currentPhase ?? \'none\'}`')
    expect(source).toContain('Subjective inference must stay inside the same digital life project line')
    expect(source).toContain('Do not let scene appraisal collapse into generic productivity guessing')
    expect(source).toContain('`latest_landed_progress=${projectState.latestLandedProgress ?? \'none\'}`')
    expect(source).toContain('`same_her_hold=${projectState.sameHerHoldDetail ?? \'none\'}`')
    expect(source).toContain('`same_her_drift_risk=${projectState.sameHerDriftRisk ?? \'none\'}`')
    expect(source).toContain('buildSubjectiveInferenceProjectSelfBriefSystemBlock(),')
  })

  it('re-expands a thin runtime project-state shell into canonical same-her Phase 1 closure cues before mind-state gateway prompts are generated', async () => {
    const gatewayCalls: Array<{
      source: string
      system: string
      user: string
      extraSystemBlocks?: string[]
    }> = []

    const runtime = createAlicizationMindStateRuntime({
      previousVisualPresenceState: {
        ...createDefaultVisualPresenceState(50_000),
        updatedAt: 50_000,
        currentScene: {
          scenario: 'coding',
          workloadKind: 'coding',
          contentKind: 'diff',
          summary: 'Tightening project-awareness continuity through runtime cognition.',
          source: 'screen-semantic-summary',
          confidence: 0.92,
          beganAt: 49_000,
          lastSeenAt: 50_000,
          target: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'runtime-mind-state.ts',
            pid: 7,
          },
        } as any,
        attention: {
          target: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'runtime-mind-state.ts',
            pid: 7,
          },
          source: 'current-grounded-scene',
          confidence: 0.88,
          engagedAt: 49_500,
          lastConfirmedAt: 50_000,
          dwellMs: 500,
        } as any,
        runtimeDigest: {
          projectState: {
            identity: 'same digital life',
            latestLandedProgress: 'landed',
            primaryOpenLoop: 'open closure',
          },
        } as any,
      } as any,
      buildDialogueIngressContext: () => ({
        context: {
          localTime: '2026-06-01T12:00:00+08:00',
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
            confidence: 0.86,
            source: 'screen-semantic-summary',
            summary: 'Reviewing Alicization project-awareness continuity seams.',
            matchedLabels: ['diff'],
          },
          relationship: {
            hostAttitude: 'focused',
            fatigue: 0.2,
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
          summary: 'Reviewing Alicization project-awareness continuity seams.',
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
            id: 'thread-project-awareness',
            kind: 'problem',
            title: 'Project awareness continuity',
            summary: 'Keep every reply path grounded in the same local digital life.',
            confidence: 0.82,
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
            openQuestions: ['Which reply-shaping paths still need canonical fallback proof?'],
            staleRisks: [],
          },
          hostState: {
            availability: 'focused',
          },
        } as any,
      }),
      generateMainGatewayText: async (input) => {
        gatewayCalls.push({
          source: input.source,
          system: input.system,
          user: String(input.user),
          extraSystemBlocks: input.extraSystemBlocks,
        })

        if (input.source === 'dialogue-turn-semantics') {
          return JSON.stringify({
            act: 'ask-help',
            responseNeed: 'answer',
            truthExpectation: 'normal',
            affectiveTone: 'neutral',
            subjectPreference: 'task-knot',
            sharedAttentionDemand: 0.5,
            personaSuppression: 0.1,
            confidence: 0.7,
            summary: 'Keep the reply on the active project-awareness repair seam.',
            reasonTags: ['project-awareness'],
          })
        }

        return JSON.stringify({
          dominantInterpretation: 'The host is tightening project-awareness continuity inside the Phase 1 desktop proving ground.',
          situatedMeaning: 'This scene is about preserving one same-her line before reply shaping widens.',
          selfQuestion: 'Which prompt path still risks thinning the same-her carry?',
          uncertainty: 'Exact uncovered seam is still being verified.',
          hostIntentCandidates: [
            {
              goal: 'resolve-problem',
              confidence: 0.82,
              why: 'The visible editor and current thread both point at runtime continuity work.',
            },
          ],
          relationshipNeedCandidates: [
            {
              need: 'guidance',
              confidence: 0.58,
              why: 'The host is steering the repair line and expects grounded follow-through.',
            },
          ],
          confidence: 0.72,
          notes: ['same-her-project-awareness'],
        })
      },
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

    await runtime.buildDigitalLifeMindState({
      cardId: 'card-project-awareness',
      now: 60_000,
      context: {
        localTime: '2026-06-01T12:00:00+08:00',
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
          confidence: 0.86,
          source: 'screen-semantic-summary',
          summary: 'Reviewing Alicization project-awareness continuity seams.',
          matchedLabels: ['diff'],
        },
        relationship: {
          hostAttitude: 'focused',
          fatigue: 0.2,
          minutesSinceLastUserTurn: 1,
          reminderBacklog: 0,
          lateNightActiveMinutes: 0,
          recentProactiveOutcomes: [],
        },
      } as any,
      userText: 'Before every reply path, make sure Alicization already knows what the project is, what Phase 1 landed, and what is still open.',
      recentMessages: [
        {
          role: 'assistant',
          content: 'I am keeping the same active repair line in view.',
        } as any,
      ],
      previousVisualPresenceState: {
        ...createDefaultVisualPresenceState(50_000),
        updatedAt: 50_000,
        currentScene: {
          scenario: 'coding',
          workloadKind: 'coding',
          contentKind: 'diff',
          summary: 'Tightening project-awareness continuity through runtime cognition.',
          source: 'screen-semantic-summary',
          confidence: 0.92,
          beganAt: 49_000,
          lastSeenAt: 50_000,
          target: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'runtime-mind-state.ts',
            pid: 7,
          },
        } as any,
        attention: {
          target: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'runtime-mind-state.ts',
            pid: 7,
          },
          source: 'current-grounded-scene',
          confidence: 0.88,
          engagedAt: 49_500,
          lastConfirmedAt: 50_000,
          dwellMs: 500,
        } as any,
        runtimeDigest: {
          projectState: {
            identity: 'same digital life',
            latestLandedProgress: 'landed',
            primaryOpenLoop: 'open closure',
          },
        } as any,
      } as any,
      visualHeartbeat: {
        watchMode: 'symbiotic-vision',
        scene: {
          scenario: 'coding',
          workloadKind: 'coding',
          contentKind: 'diff',
          summary: 'Reviewing Alicization project-awareness continuity seams.',
          source: 'screen-semantic-summary',
          confidence: 0.91,
          beganAt: 59_000,
          lastSeenAt: 60_000,
          target: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'runtime-mind-state.ts',
            pid: 7,
          },
        },
        recentTransition: null,
        nextSuggestedProbeMs: 30_000,
      } as any,
      attention: {
        target: {
          appName: 'Visual Studio Code',
          processName: 'Code',
          title: 'runtime-mind-state.ts',
          pid: 7,
        },
        source: 'current-grounded-scene',
        confidence: 0.9,
        engagedAt: 59_500,
        lastConfirmedAt: 60_000,
        dwellMs: 500,
      } as any,
      currentForeground: {
        appName: 'Visual Studio Code',
        processName: 'Code',
        title: 'runtime-mind-state.ts',
        pid: 7,
      } as any,
      cognitionMode: 'interactive',
    })

    const dialogueTurnSemanticsCall = gatewayCalls.find(call => call.source === 'dialogue-turn-semantics')
    const subjectiveInferenceCall = gatewayCalls.find(call => call.source === 'subjective-inference')

    expect(dialogueTurnSemanticsCall).toBeTruthy()
    expect(subjectiveInferenceCall).toBeTruthy()

    for (const call of [dialogueTurnSemanticsCall, subjectiveInferenceCall]) {
      const projectStateJson = String(call?.user).match(/"projectState":(\{.*?\})/s)?.[1]
      expect(projectStateJson).toBeTruthy()

      const projectState = JSON.parse(projectStateJson ?? '{}') as Record<string, string>
      const selfBrief = call?.extraSystemBlocks?.find(block => block.includes('SELF_BRIEF')) ?? ''

      expect(projectState.identity).toContain('digital life project')
      expect(projectState.currentPhase).toContain('Phase 1')
      expect(projectState.preDialogueAwarenessLine).toContain('Same Phase 1 digital life')
      expect(projectState.preDialogueAwarenessLine).toContain('pre-dialogue transport')
      expect(projectState.preDialogueAwarenessLine).toContain('entrypoint governance')
      expect(projectState.preDialogueAwarenessLine).toContain('mirrored into chat-entry governance')
      expect(projectState.latestLandedProgress).toContain('pre-dialogue transport')
      expect(projectState.latestLandedProgress).toContain('entrypoint governance')
      expect(projectState.latestLandedProgress).toContain('mirrored into chat-entry governance')
      expect(projectState.sameHerSelfLine).toContain('Same Phase 1 digital life')
      expect(projectState.primaryOpenLoop).not.toBe('open closure')
      expect(projectState.primaryOpenLoop.toLowerCase()).toContain('same digital life')
      expect(projectState.nextClosureTarget.length).toBeGreaterThan(20)

      expect(selfBrief).toContain('same digital life project line')
      expect(selfBrief).toContain('same Phase 1 proving ground')
      expect(selfBrief).toContain('project_identity=Alicization is a local-first digital life project')
      expect(selfBrief).toContain('current_phase=Phase 1: Local Digital Life')
      expect(selfBrief).toContain('pre_dialogue_awareness=Before answering, remember:')
      expect(selfBrief).toContain('pre-dialogue transport')
      expect(selfBrief).toContain('entrypoint governance')
      expect(selfBrief).toContain('mirrored into chat-entry governance')
      expect(selfBrief).toContain('same_her_line=Same Phase 1 digital life')
      expect(selfBrief.toLowerCase()).toContain('primary_open_loop=')
      expect(selfBrief.toLowerCase()).toContain('memory still needs stronger end-to-end closure')
      expect(selfBrief.toLowerCase()).toContain('same digital life')
      expect(selfBrief).not.toContain('pre_dialogue_awareness=none')
      expect(selfBrief).not.toContain('same_her_line=none')
      expect(selfBrief).not.toContain('primary_open_loop=open closure')
    }
  })

  it('keeps richer project-aware companion briefing alive in mind-state self-briefs when a stronger embodiment headline would otherwise thin the pre-dialogue carry', async () => {
    const gatewayCalls: Array<{
      source: string
      system: string
      user: string
      extraSystemBlocks?: string[]
    }> = []

    const richerProjectBriefing
      = 'Before answering, remember: Alicization is still the same local-first digital life project. She is still inside Phase 1: Local Digital Life. What has already landed is callback continuity now survives across reply shaping. The still-open closure is voice, face, and motion still needing one same-her line before this turn widens outward.'
    const strongerEmbodimentHeadline
      = 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.'
    const previousVisualPresenceState = {
      ...createDefaultVisualPresenceState(70_000),
      updatedAt: 70_000,
      currentScene: {
        scenario: 'coding',
        workloadKind: 'coding',
        contentKind: 'diff',
        summary: 'Verifying that project-aware self-briefing stays richer than embodiment-only carry.',
        source: 'screen-semantic-summary',
        confidence: 0.92,
        beganAt: 69_000,
        lastSeenAt: 70_000,
        target: {
          appName: 'Visual Studio Code',
          processName: 'Code',
          title: 'runtime-mind-state.ts',
          pid: 9,
        },
      } as any,
      attention: {
        target: {
          appName: 'Visual Studio Code',
          processName: 'Code',
          title: 'runtime-mind-state.ts',
          pid: 9,
        },
        source: 'current-grounded-scene',
        confidence: 0.88,
        engagedAt: 69_500,
        lastConfirmedAt: 70_000,
        dwellMs: 500,
      } as any,
      runtimeDigest: {
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          companionHeadlineLine: strongerEmbodimentHeadline,
          companionBriefingLine: richerProjectBriefing,
          preDialogueAwarenessLine: strongerEmbodimentHeadline,
          awarenessLine: strongerEmbodimentHeadline,
          latestLandedProgress: 'Callback continuity now survives across reply shaping.',
          primaryOpenLoop: 'Voice, face, and motion still need one same-her line before this turn widens outward.',
          nextClosureTarget: 'Keep the project-aware carry explicit before the next host-visible answer opens outward.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerDriftRisk: 'If the self-brief falls back to embodiment-only awareness, project identity, landed progress, and the still-open life loop disappear before the turn is interpreted.',
        },
      } as any,
    } as any

    const runtime = createAlicizationMindStateRuntime({
      previousVisualPresenceState,
      buildDialogueIngressContext: () => ({
        context: {
          localTime: '2026-06-07T12:00:00+08:00',
          system: {
            cpuUsage: 0.16,
            idleSeconds: 0,
            inputActivity: 'active',
            fullscreenLikely: false,
            foregroundWindow: {
              appName: 'Visual Studio Code',
              processName: 'Code',
              title: 'runtime-mind-state.ts',
              pid: 9,
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
            confidence: 0.86,
            source: 'screen-semantic-summary',
            summary: 'Verifying that project-aware self-briefing stays richer than embodiment-only carry.',
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
        currentScene: {
          scenario: 'coding',
          workloadKind: 'coding',
          contentKind: 'diff',
          summary: 'Verifying that project-aware self-briefing stays richer than embodiment-only carry.',
          source: 'screen-semantic-summary',
          confidence: 0.9,
          target: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'runtime-mind-state.ts',
            pid: 9,
          },
        } as any,
        worldModel: {
          activeThread: {
            id: 'thread-mind-project-briefing',
            kind: 'problem',
            title: 'Mind self-brief project carry',
            summary: 'Keep project identity, landed progress, and open closure explicit before interpretation.',
            confidence: 0.84,
            unresolved: true,
            source: 'dialogue-ingress',
          },
          lingeringThreads: [],
          focusTarget: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'runtime-mind-state.ts',
            pid: 9,
          },
          epistemicState: {
            certainty: 'grounded',
            freshness: 'fresh',
            openQuestions: ['Does the self-brief still remember project identity and open closure before interpretation?'],
            staleRisks: [],
          },
          hostState: {
            availability: 'focused',
          },
        } as any,
      }),
      generateMainGatewayText: async (input) => {
        gatewayCalls.push({
          source: input.source,
          system: input.system,
          user: String(input.user),
          extraSystemBlocks: input.extraSystemBlocks,
        })

        if (input.source === 'dialogue-turn-semantics') {
          return JSON.stringify({
            act: 'ask-help',
            responseNeed: 'answer',
            truthExpectation: 'normal',
            affectiveTone: 'neutral',
            subjectPreference: 'task-knot',
            sharedAttentionDemand: 0.52,
            personaSuppression: 0.1,
            confidence: 0.74,
            summary: 'Keep the turn on the richer project-aware same-her line.',
            reasonTags: ['project-awareness'],
          })
        }

        return JSON.stringify({
          dominantInterpretation: 'The host is checking whether project-aware same-her carry survives before interpretation.',
          situatedMeaning: 'This scene is about keeping project identity, landed progress, and open closure explicit before reply shaping widens.',
          selfQuestion: 'Did the richer project-aware carry survive into the self-brief?',
          uncertainty: 'Need to verify the self-brief does not thin back to embodiment-only carry.',
          hostIntentCandidates: [
            {
              goal: 'resolve-problem',
              confidence: 0.83,
              why: 'The host is validating prompt-time project awareness continuity.',
            },
          ],
          relationshipNeedCandidates: [
            {
              need: 'guidance',
              confidence: 0.56,
              why: 'The host expects grounded follow-through on the same digital life line.',
            },
          ],
          confidence: 0.73,
          notes: ['richer-project-aware-self-brief'],
        })
      },
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

    await runtime.buildDigitalLifeMindState({
      cardId: 'card-mind-project-briefing',
      now: 80_000,
      context: {
        localTime: '2026-06-07T12:00:00+08:00',
        system: {
          cpuUsage: 0.16,
          idleSeconds: 0,
          inputActivity: 'active',
          fullscreenLikely: false,
          foregroundWindow: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'runtime-mind-state.ts',
            pid: 9,
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
          confidence: 0.86,
          source: 'screen-semantic-summary',
          summary: 'Verifying that project-aware self-briefing stays richer than embodiment-only carry.',
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
      userText: 'Before every reply path, make sure Alicization already knows what the project is, what Phase 1 landed, and what is still open.',
      recentMessages: [
        {
          role: 'assistant',
          content: '我还在守住同一个数字生命主线。',
        } as any,
      ],
      previousVisualPresenceState,
      visualHeartbeat: {
        watchMode: 'symbiotic-vision',
        scene: {
          scenario: 'coding',
          workloadKind: 'coding',
          contentKind: 'diff',
          summary: 'Verifying that project-aware self-briefing stays richer than embodiment-only carry.',
          source: 'screen-semantic-summary',
          confidence: 0.91,
          beganAt: 79_000,
          lastSeenAt: 80_000,
          target: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'runtime-mind-state.ts',
            pid: 9,
          },
        },
        recentTransition: null,
        nextSuggestedProbeMs: 30_000,
      } as any,
      attention: {
        target: {
          appName: 'Visual Studio Code',
          processName: 'Code',
          title: 'runtime-mind-state.ts',
          pid: 9,
        },
        source: 'current-grounded-scene',
        confidence: 0.9,
        engagedAt: 79_500,
        lastConfirmedAt: 80_000,
        dwellMs: 500,
      } as any,
      currentForeground: {
        appName: 'Visual Studio Code',
        processName: 'Code',
        title: 'runtime-mind-state.ts',
        pid: 9,
      } as any,
      cognitionMode: 'interactive',
    })

    const dialogueTurnSemanticsCall = gatewayCalls.find(call => call.source === 'dialogue-turn-semantics')
    const subjectiveInferenceCall = gatewayCalls.find(call => call.source === 'subjective-inference')

    expect(dialogueTurnSemanticsCall).toBeTruthy()
    expect(subjectiveInferenceCall).toBeTruthy()

    for (const call of [dialogueTurnSemanticsCall, subjectiveInferenceCall]) {
      const projectStateJson = String(call?.user).match(/"projectState":(\{.*?\})/s)?.[1]
      expect(projectStateJson).toBeTruthy()

      const projectState = JSON.parse(projectStateJson ?? '{}') as Record<string, string>
      const selfBrief = call?.extraSystemBlocks?.find(block => block.includes('SELF_BRIEF')) ?? ''

      expect(projectState.preDialogueAwarenessLine).toContain('Alicization is a local-first digital life project')
      expect(projectState.preDialogueAwarenessLine).toContain('Phase 1: Local Digital Life')
      expect(projectState.preDialogueAwarenessLine).toContain('Same Phase 1 digital life')
      expect(projectState.preDialogueAwarenessLine).toContain('pre-dialogue transport is explicit entrypoint governance mirrored into chat-entry governance')
      expect(projectState.preDialogueAwarenessLine).not.toBe(strongerEmbodimentHeadline)

      expect(selfBrief).toContain('pre_dialogue_awareness=Before answering, remember: Alicization is a local-first digital life project.')
      expect(selfBrief).toContain('She is still inside Phase 1: Local Digital Life.')
      expect(selfBrief).toContain('Same Phase 1 digital life.')
      expect(selfBrief).toContain('What has already landed is pre-dialogue transport is explicit entrypoint governance mirrored into chat-entry governance.')
      expect(selfBrief).not.toContain(`pre_dialogue_awareness=${strongerEmbodimentHeadline}`)
    }
  })
})
