import { alicizationFixedTemplateReplacement } from '@proj-alicization/stage-shared'
import { describe, expect, it, vi } from 'vitest'

import { resolveAlicizationProjectStateBrief } from './project-state-brief'
import {
  buildDerivedMindStateBundleSystemBlock,
  buildSelfEvolutionSystemBlock,
  createAlicizationMainGatewayOneShotRuntime,
  resolveAlicizationOneShotProjectStateFallback,
} from './runtime-main-gateway-one-shot'

vi.mock('@xsai/generate-text', () => ({
  generateText: vi.fn(async (input: { messages: Array<{ role: string, content: unknown }> }) => ({
    text: JSON.stringify({
      workload: 'coding',
      content: 'diff',
      summary: String(input.messages.at(-1)?.role ?? 'user'),
      confidence: 0.9,
      matchedLabels: ['coding-diff'],
    }),
  })),
}))

type OneShotRuntimeOptions = Parameters<typeof createAlicizationMainGatewayOneShotRuntime>[0]
type OneShotResolvedMainGatewayConfig = NonNullable<ReturnType<OneShotRuntimeOptions['resolveMainGatewayConfig']>>
type OneShotMainGatewayProvider = OneShotResolvedMainGatewayConfig['provider']
type OneShotMainGatewayChatConfig = ReturnType<OneShotMainGatewayProvider['chat']>
type OneShotPerceptionState = Awaited<ReturnType<OneShotRuntimeOptions['ensurePerceptionState']>>
type OneShotCaptureAccess = Awaited<ReturnType<OneShotRuntimeOptions['resolveDesktopCaptureAccess']>>

function createEmptyPerceptionState(): OneShotPerceptionState {
  return {
    attentionAnchor: null,
    lastNonSelfForegroundTarget: null,
    recentObservations: [],
    invitedInspection: null,
    recentSceneResidue: null,
    updatedAt: 0,
  }
}

function createResolvedMainGatewayConfig(): OneShotResolvedMainGatewayConfig {
  return {
    providerId: 'provider-test',
    model: 'model-test',
    baseUrl: 'https://example.test/v1/',
    provider: {
      chat: vi.fn((_model: string) => ({}) as OneShotMainGatewayChatConfig),
    } as unknown as OneShotMainGatewayProvider,
    headers: {},
  }
}

function createMinimalDigitalLifeRuntimeSurface(overrides: Record<string, unknown> = {}) {
  return {
    version: 'digital-life-runtime-surface-v1',
    perception: {
      watchMode: 'symbiotic-vision',
      currentScene: null,
      attention: null,
      captureState: {
        permission: 'unknown',
        lastGroundedAt: null,
      },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 30_000,
      updatedAt: 10,
    },
    world: {
      worldModel: null,
      worldOntology: null,
      entityWorld: null,
      livingWorldState: null,
      relationshipModel: null,
    },
    dialogue: {
      discourseState: null,
      dialogueEncounter: null,
      mindSynthesis: null,
      conversationState: null,
      dialogueWorldThread: null,
      dialogueActKernel: null,
      answerCompiler: null,
      currentConsciousFrame: null,
      claimEvidenceLedger: null,
      replyDeliberation: null,
      answerPlanner: null,
    },
    agency: {
      selfState: null,
      selfGovernor: null,
      inquiryLoop: null,
      initiativeArbitration: null,
      initiative: null,
      autonomy: null,
    },
    cognition: {
      runtimeDigest: null,
    },
    memory: {
      workingMemoryEpisodes: [],
      goalStack: null,
      concerns: [],
      concernContinuity: null,
      selfContinuity: null,
      threadRuntime: null,
      commitmentLedger: null,
      inquiryPlanner: null,
      repairLedger: null,
      intentionStream: null,
      reflectionLedger: null,
      executiveCycle: null,
      thoughtThreads: null,
      desireMemory: null,
      recallGovernor: null,
    },
    ...overrides,
  } as any
}

function createOneShotRuntimeHarness(overrides?: Partial<OneShotRuntimeOptions>) {
  const appendRuntimeDebugLine = vi.fn(async () => {})
  const appendAuditLog = vi.fn(async () => {})
  const resolveMainGatewayConfig = vi.fn<OneShotRuntimeOptions['resolveMainGatewayConfig']>(() => null)
  const openAgentTurn = vi.fn()

  const runtime = createAlicizationMainGatewayOneShotRuntime({
    getActiveCardId: () => 'card-test',
    getActiveProviderId: () => 'provider-test',
    getActiveModelId: () => 'model-test',
    openAgentTurn,
    resolveMainGatewayConfig,
    rememberMainGatewayRoute: vi.fn(),
    appendRuntimeDebugLine,
    resolveCardCustomDirectives: vi.fn<OneShotRuntimeOptions['resolveCardCustomDirectives']>(async () => ({ text: '', source: 'none' })),
    buildPendingExecutionCallbackContext: vi.fn<OneShotRuntimeOptions['buildPendingExecutionCallbackContext']>(async () => ({
      actions: [],
      callbacks: [],
      continuitySignals: [],
      recallText: '',
      systemBlock: '',
    })),
    resolveAgentSessionContinuityContext: vi.fn<OneShotRuntimeOptions['resolveAgentSessionContinuityContext']>(async () => ({
      digitalLifeRuntimeSurface: null,
      sessionContinuitySignals: [],
    })),
    getPerformanceManifest: vi.fn(async () => null),
    buildPerformanceManifestSystemBlocks: vi.fn(() => []),
    buildAgentTurnContinuitySystemMessages: vi.fn(() => []),
    syncAgentTurnSessionMirror: vi.fn(),
    appendAuditLog,
    describePerceptionTarget: vi.fn(() => 'target'),
    buildMainGatewayAgentTurnId: vi.fn(() => 'turn-test'),
    screenSemanticCacheByCard: new Map(),
    ensurePerceptionState: vi.fn<OneShotRuntimeOptions['ensurePerceptionState']>(async () => createEmptyPerceptionState()),
    getUsablePerceptionSceneResidue: vi.fn(() => null),
    buildScreenSemanticSummaryFromResidue: vi.fn(),
    clearDesktopCaptureAccessCache: vi.fn(),
    resolveDesktopCaptureAccess: vi.fn<OneShotRuntimeOptions['resolveDesktopCaptureAccess']>(async (): Promise<OneShotCaptureAccess> => ({
      sources: [],
      unavailableReason: 'unavailable',
      probeError: undefined,
    })),
    getDesktopCaptureAccessRuntimeSnapshot: vi.fn(() => null),
    rememberSceneResidue: vi.fn<OneShotRuntimeOptions['rememberSceneResidue']>(async () => createEmptyPerceptionState()),
    ...overrides,
  })

  return {
    runtime,
    appendRuntimeDebugLine,
    appendAuditLog,
    resolveMainGatewayConfig,
    openAgentTurn,
  }
}

const oneShotFixedTemplateResiduePattern
  = /Alicization is a local-first digital life project|Phase 1:\s*Local Digital Life|phase1_local_digital_life_anchor|Same Phase 1 digital life|same digital life project line|same-her|same living line|one continuous "?her"?|one living digital life|one living her/iu

function expectNoOneShotFixedTemplateResidue(value: unknown) {
  const text = String(value ?? '')
  expect(text).not.toMatch(oneShotFixedTemplateResiduePattern)
}

function expectStructuredOneShotProjectText(value: unknown) {
  const text = String(value ?? '')
  expect(text).toContain('local_desktop_life_loop')
  expectNoOneShotFixedTemplateResidue(text)
}

function expectStructuredOneShotProjectStateFields(value: unknown) {
  const text = String(value ?? '')
  expect(text).toContain('identity=local_desktop_life_loop')
  expect(text).toMatch(/current_phase=(?:phase=)?local_desktop_life_loop/u)
  expect(text).toContain('continuity_anchor=local_desktop_life_loop')
  expectNoOneShotFixedTemplateResidue(text)
}

function expectStructuredOneShotAwarenessLine(value: unknown) {
  const text = String(value ?? '')
  expect(text).toContain('identity=local_desktop_life_loop')
  expect(text).toContain('phase=local_desktop_life_loop')
  expect(text).toContain('open=')
  expect(text).toContain('continuity_anchor=local_desktop_life_loop')
  expect(text).toContain('visibility=internal-structured')
  expect(text).not.toContain('Before answering')
  expectNoOneShotFixedTemplateResidue(text)
}

describe('runtime main gateway one-shot', () => {
  it('keeps identity, landed progress, and still-open closure distinct in one-shot project-state fallback', () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const strongerCompanionHeadlineLine = 'Before answering, stay on the same living line: this is still one local-first digital life, Phase 1 is still active, and the same unfinished closure work still belongs to one living her.'
    const landedProgressLine = 'Project-state carry already survives into one-shot generation without dropping the same-her line.'
    const openClosureLine = 'Initiative, memory, and embodiment still need to close on one same living line.'

    const { projectState, awarenessProjectState } = resolveAlicizationOneShotProjectStateFallback({
      version: 'digital-life-runtime-surface-v1',
      perception: {
        watchMode: 'symbiotic-vision',
        currentScene: null,
        attention: null,
        captureState: {
          permission: 'unknown',
          lastGroundedAt: null,
        },
        durabilityPulse: null,
        recentTransition: null,
        nextSuggestedProbeMs: 30_000,
        updatedAt: 10,
      },
      world: {
        worldModel: null,
        worldOntology: null,
        entityWorld: null,
        livingWorldState: null,
        relationshipModel: null,
      },
      dialogue: {
        discourseState: null,
        dialogueEncounter: null,
        mindSynthesis: null,
        conversationState: null,
        dialogueWorldThread: null,
        dialogueActKernel: null,
        answerCompiler: null,
        currentConsciousFrame: null,
        claimEvidenceLedger: null,
        replyDeliberation: null,
        answerPlanner: null,
      },
      agency: {
        selfState: null,
        selfGovernor: null,
        inquiryLoop: null,
        initiativeArbitration: null,
        initiative: null,
        autonomy: null,
      },
      cognition: {
        runtimeDigest: null,
      },
      memory: {
        workingMemoryEpisodes: [],
        goalStack: null,
        concerns: [],
        concernContinuity: null,
        selfContinuity: null,
        threadRuntime: null,
        commitmentLedger: null,
        inquiryPlanner: null,
        repairLedger: null,
        intentionStream: null,
        reflectionLedger: null,
        executiveCycle: null,
        thoughtThreads: null,
        desireMemory: null,
        recallGovernor: null,
      },
      raw: {
        runtimeDigest: {
          projectState: {
            preflightSummary: canonicalProjectState.preflightSummary,
            preDialogueAwarenessLine: 'Before answering, remember this is still one local-first digital life and the unfinished Phase 1 closure still belongs to one living her.',
            companionHeadlineLine: strongerCompanionHeadlineLine,
            identity: canonicalProjectState.identity,
            currentPhase: canonicalProjectState.currentPhase,
            latestLandedProgress: landedProgressLine,
            primaryOpenLoop: openClosureLine,
            nextClosureTarget: canonicalProjectState.nextClosureTarget,
            sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
          },
        },
      },
    } as any)

    expect(projectState.identity).toBe(canonicalProjectState.identity)
    expectStructuredOneShotAwarenessLine(projectState.preDialogueAwarenessLine)
    expect(projectState.latestLandedProgress).toContain('continuity_progress=partial')
    expect(projectState.primaryOpenLoop).toContain('memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expectNoOneShotFixedTemplateResidue(projectState.latestLandedProgress)
    expectNoOneShotFixedTemplateResidue(projectState.primaryOpenLoop)
    expect(projectState.latestLandedProgress).not.toBe(projectState.primaryOpenLoop)
    expectStructuredOneShotAwarenessLine(awarenessProjectState.preDialogueAwarenessLine)
    expectStructuredOneShotAwarenessLine(awarenessProjectState.awarenessLine)
    expectStructuredOneShotAwarenessLine(awarenessProjectState.companionHeadlineLine)
    expectStructuredOneShotProjectText(awarenessProjectState.companionBriefingLine)
    expect(awarenessProjectState.companionBriefingLine).toContain('open=')
    expect(awarenessProjectState.companionBriefingLine).toContain('next=')
    expectStructuredOneShotProjectText(awarenessProjectState.preflightSummary)
  })

  it('backs one-shot fallback with the richer status brief so the provider path sees phase, landed progress, open loop, and next closure together', () => {
    const { projectState, awarenessProjectState } = resolveAlicizationOneShotProjectStateFallback(null)

    expectStructuredOneShotProjectText(projectState.identity)
    expectStructuredOneShotProjectText(projectState.currentPhase)
    expect(projectState.latestLandedProgress).toBeTruthy()
    expect(projectState.primaryOpenLoop).toBeTruthy()
    expect(projectState.nextClosureTarget).toBeTruthy()
    expectStructuredOneShotAwarenessLine(projectState.preDialogueAwarenessLine)
    expect(projectState.preDialogueAwarenessLine).toContain('landed=')
    expect(projectState.preDialogueAwarenessLine).toContain('next=')
    expectStructuredOneShotAwarenessLine(awarenessProjectState.preDialogueAwarenessLine)
    expect(awarenessProjectState.preDialogueAwarenessLine).toContain('landed=')
    expect(awarenessProjectState.preDialogueAwarenessLine).toContain('next=')
    expectStructuredOneShotProjectText((awarenessProjectState as any).identity)
    expectStructuredOneShotProjectText((awarenessProjectState as any).currentPhase)
    expect((awarenessProjectState as any).latestLandedProgress).toBeTruthy()
    expectStructuredOneShotProjectText((awarenessProjectState as any).sameHerSelfLine)
    expect((awarenessProjectState as any).sameHerDriftRisk).toContain('closure_status=unfinished')
    expect((awarenessProjectState as any).preferredPauseMode).toBe('longer')
    expect((awarenessProjectState as any).preferredLipsyncMode).toBe('restrained')
    expect((awarenessProjectState as any).preferredVoiceMode).toBe('lower-pressure')
    expect((awarenessProjectState as any).preferredPacingMode).toBe('slower')
    expectStructuredOneShotProjectText(awarenessProjectState.preflightSummary)
  })

  it('keeps a fuller project-and-phase awareness line over a narrower embodiment companion headline in one-shot fallback', () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const richerAwarenessLine = 'Before answering, remember this is still the same Phase 1 local digital life, not a generic assistant shell. Some closure has landed, but memory, initiative, and embodiment still need stronger end-to-end closure before the life loop is truly closed.'
    const narrowerCompanionHeadline = 'Same companion line through body, face, and motion. Keep the same living line gentle.'

    const { projectState, awarenessProjectState } = resolveAlicizationOneShotProjectStateFallback({
      version: 'digital-life-runtime-surface-v1',
      perception: {
        watchMode: 'symbiotic-vision',
        currentScene: null,
        attention: null,
        captureState: {
          permission: 'unknown',
          lastGroundedAt: null,
        },
        durabilityPulse: null,
        recentTransition: null,
        nextSuggestedProbeMs: 30_000,
        updatedAt: 10,
      },
      world: {
        worldModel: null,
        worldOntology: null,
        entityWorld: null,
        livingWorldState: null,
        relationshipModel: null,
      },
      dialogue: {
        discourseState: null,
        dialogueEncounter: null,
        mindSynthesis: null,
        conversationState: null,
        dialogueWorldThread: null,
        dialogueActKernel: null,
        answerCompiler: null,
        currentConsciousFrame: null,
        claimEvidenceLedger: null,
        replyDeliberation: null,
        answerPlanner: null,
      },
      agency: {
        selfState: null,
        selfGovernor: null,
        inquiryLoop: null,
        initiativeArbitration: null,
        initiative: null,
        autonomy: null,
      },
      cognition: {
        runtimeDigest: null,
      },
      memory: {
        workingMemoryEpisodes: [],
        goalStack: null,
        concerns: [],
        concernContinuity: null,
        selfContinuity: null,
        threadRuntime: null,
        commitmentLedger: null,
        inquiryPlanner: null,
        repairLedger: null,
        intentionStream: null,
        reflectionLedger: null,
        executiveCycle: null,
        thoughtThreads: null,
        desireMemory: null,
        recallGovernor: null,
      },
      raw: {
        runtimeDigest: {
          projectState: {
            preflightSummary: canonicalProjectState.preflightSummary,
            preDialogueAwarenessLine: richerAwarenessLine,
            companionHeadlineLine: narrowerCompanionHeadline,
            identity: canonicalProjectState.identity,
            currentPhase: canonicalProjectState.currentPhase,
            latestLandedProgress: 'Some closure already landed through same-session mirror carry.',
            primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger end-to-end closure before the life loop is truly closed.',
            nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
            sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
          },
        },
      },
    } as any)

    expectStructuredOneShotAwarenessLine(projectState.preDialogueAwarenessLine)
    expectStructuredOneShotAwarenessLine(awarenessProjectState.preDialogueAwarenessLine)
    expectStructuredOneShotAwarenessLine(awarenessProjectState.awarenessLine)
    expectStructuredOneShotAwarenessLine(awarenessProjectState.companionHeadlineLine)
    expectStructuredOneShotProjectText(awarenessProjectState.companionBriefingLine)
    expect(awarenessProjectState.companionBriefingLine).toContain('open=')
    expect(awarenessProjectState.companionBriefingLine).toContain('next=')
  })

  it('preserves a richer runtime pre-dialogue awareness summary when one-shot fallback keeps a narrower same-her opening line', () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const narrowerOpeningLine = 'Before answering, remember this still belongs to one living digital life. Phase 1 is still active, and embodiment closure is still holding together mainly through voice, face, and motion on the same living line.'
    const strongerCompanionHeadlineLine = 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.'
    const richerRuntimeAwarenessSummary = 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | landed=Returned-side project awareness carry already survives on one same-her line | open=Initiative and embodiment still need one tighter same-life closure seam | next=Keep extending cross-modal same-her proof across returned-side turns.'

    const { projectState, awarenessProjectState } = resolveAlicizationOneShotProjectStateFallback({
      version: 'digital-life-runtime-surface-v1',
      perception: {
        watchMode: 'symbiotic-vision',
        currentScene: null,
        attention: null,
        captureState: {
          permission: 'unknown',
          lastGroundedAt: null,
        },
        durabilityPulse: null,
        recentTransition: null,
        nextSuggestedProbeMs: 30_000,
        updatedAt: 10,
      },
      world: {
        worldModel: null,
        worldOntology: null,
        entityWorld: null,
        livingWorldState: null,
        relationshipModel: null,
      },
      dialogue: {
        discourseState: null,
        dialogueEncounter: null,
        mindSynthesis: null,
        conversationState: null,
        dialogueWorldThread: null,
        dialogueActKernel: null,
        answerCompiler: null,
        currentConsciousFrame: null,
        claimEvidenceLedger: null,
        replyDeliberation: null,
        answerPlanner: null,
      },
      agency: {
        selfState: null,
        selfGovernor: null,
        inquiryLoop: null,
        initiativeArbitration: null,
        initiative: null,
        autonomy: null,
      },
      cognition: {
        runtimeDigest: null,
      },
      memory: {
        workingMemoryEpisodes: [],
        goalStack: null,
        concerns: [],
        concernContinuity: null,
        selfContinuity: null,
        threadRuntime: null,
        commitmentLedger: null,
        inquiryPlanner: null,
        repairLedger: null,
        intentionStream: null,
        reflectionLedger: null,
        executiveCycle: null,
        thoughtThreads: null,
        desireMemory: null,
        recallGovernor: null,
      },
      raw: {
        runtimeDigest: {
          projectState: {
            identity: canonicalProjectState.identity,
            currentPhase: canonicalProjectState.currentPhase,
            preflightSummary: richerRuntimeAwarenessSummary,
            preDialogueAwarenessLine: narrowerOpeningLine,
            awarenessLine: narrowerOpeningLine,
            preDialogueAwarenessSummary: richerRuntimeAwarenessSummary,
            companionHeadlineLine: strongerCompanionHeadlineLine,
            companionBriefingLine: 'Before answering, keep this same digital life project in view.',
            latestLandedProgress: 'Returned-side project awareness carry already survives on one same-her line.',
            primaryOpenLoop: 'Initiative and embodiment still need one tighter same-life closure seam.',
            nextClosureTarget: 'Keep extending cross-modal same-her proof across returned-side turns.',
            sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
          },
        },
      },
    } as any)

    expectStructuredOneShotAwarenessLine(projectState.preDialogueAwarenessLine)
    expectStructuredOneShotAwarenessLine(awarenessProjectState.preDialogueAwarenessLine)
    expectStructuredOneShotAwarenessLine(awarenessProjectState.companionHeadlineLine)
    expectStructuredOneShotAwarenessLine(awarenessProjectState.preDialogueAwarenessSummary)
    expect(awarenessProjectState.preDialogueAwarenessSummary).toBe(awarenessProjectState.preDialogueAwarenessLine)
  })

  it('upgrades a generic one-shot next-closure shell to the richer canonical closure target in fallback project state', () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const genericNextClosureShell = 'Generic next closure shell that should not override the richer one-shot closure target.'

    const { projectState } = resolveAlicizationOneShotProjectStateFallback({
      version: 'digital-life-runtime-surface-v1',
      perception: {
        watchMode: 'symbiotic-vision',
        currentScene: null,
        attention: null,
        captureState: {
          permission: 'unknown',
          lastGroundedAt: null,
        },
        durabilityPulse: null,
        recentTransition: null,
        nextSuggestedProbeMs: 30_000,
        updatedAt: 10,
      },
      world: {
        worldModel: null,
        worldOntology: null,
        entityWorld: null,
        livingWorldState: null,
        relationshipModel: null,
      },
      dialogue: {
        discourseState: null,
        dialogueEncounter: null,
        mindSynthesis: null,
        conversationState: null,
        dialogueWorldThread: null,
        dialogueActKernel: null,
        answerCompiler: null,
        currentConsciousFrame: null,
        claimEvidenceLedger: null,
        replyDeliberation: null,
        answerPlanner: null,
      },
      agency: {
        selfState: null,
        selfGovernor: null,
        inquiryLoop: null,
        initiativeArbitration: null,
        initiative: null,
        autonomy: null,
      },
      cognition: {
        runtimeDigest: null,
      },
      memory: {
        workingMemoryEpisodes: [],
        goalStack: null,
        concerns: [],
        concernContinuity: null,
        selfContinuity: null,
        threadRuntime: null,
        commitmentLedger: null,
        inquiryPlanner: null,
        repairLedger: null,
        intentionStream: null,
        reflectionLedger: null,
        executiveCycle: null,
        thoughtThreads: null,
        desireMemory: null,
        recallGovernor: null,
      },
      raw: {
        runtimeDigest: {
          projectState: {
            preflightSummary: canonicalProjectState.preflightSummary,
            preDialogueAwarenessLine: canonicalProjectState.preDialogueAwarenessLine,
            companionHeadlineLine: canonicalProjectState.preDialogueAwarenessLine ?? canonicalProjectState.preflightSummary ?? null,
            identity: canonicalProjectState.identity,
            currentPhase: canonicalProjectState.currentPhase,
            latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? null,
            primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
            nextClosureTarget: genericNextClosureShell,
            sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
          },
        },
      },
    } as any)

    expect(projectState.nextClosureTarget).toBe(canonicalProjectState.nextClosureTarget)
    expect(projectState.nextClosureTarget).not.toBe(genericNextClosureShell)
  })

  it('upgrades a generic callback-summary one-shot closure shell to the richer canonical closure target in fallback project state', () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const genericCallbackSummaryShell = 'Generic callback summary: steadier carry of this project, this phase, and the life loop that remains open.'

    const { projectState } = resolveAlicizationOneShotProjectStateFallback({
      version: 'digital-life-runtime-surface-v1',
      perception: {
        watchMode: 'symbiotic-vision',
        currentScene: null,
        attention: null,
        captureState: {
          permission: 'unknown',
          lastGroundedAt: null,
        },
        durabilityPulse: null,
        recentTransition: null,
        nextSuggestedProbeMs: 30_000,
        updatedAt: 10,
      },
      world: {
        worldModel: null,
        worldOntology: null,
        entityWorld: null,
        livingWorldState: null,
        relationshipModel: null,
      },
      dialogue: {
        discourseState: null,
        dialogueEncounter: null,
        mindSynthesis: null,
        conversationState: null,
        dialogueWorldThread: null,
        dialogueActKernel: null,
        answerCompiler: null,
        currentConsciousFrame: null,
        claimEvidenceLedger: null,
        replyDeliberation: null,
        answerPlanner: null,
      },
      agency: {
        selfState: null,
        selfGovernor: null,
        inquiryLoop: null,
        initiativeArbitration: null,
        initiative: null,
        autonomy: null,
      },
      cognition: {
        runtimeDigest: null,
      },
      memory: {
        workingMemoryEpisodes: [],
        goalStack: null,
        concerns: [],
        concernContinuity: null,
        selfContinuity: null,
        threadRuntime: null,
        commitmentLedger: null,
        inquiryPlanner: null,
        repairLedger: null,
        intentionStream: null,
        reflectionLedger: null,
        executiveCycle: null,
        thoughtThreads: null,
        desireMemory: null,
        recallGovernor: null,
      },
      raw: {
        runtimeDigest: {
          projectState: {
            preflightSummary: canonicalProjectState.preflightSummary,
            preDialogueAwarenessLine: canonicalProjectState.preDialogueAwarenessLine,
            companionHeadlineLine: canonicalProjectState.preDialogueAwarenessLine ?? canonicalProjectState.preflightSummary ?? null,
            identity: canonicalProjectState.identity,
            currentPhase: canonicalProjectState.currentPhase,
            latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? null,
            primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
            nextClosureTarget: genericCallbackSummaryShell,
            sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
          },
        },
      },
    } as any)

    expect(projectState.nextClosureTarget).toBe(canonicalProjectState.nextClosureTarget)
    expect(projectState.nextClosureTarget).not.toBe(genericCallbackSummaryShell)
  })

  it('lets one-shot gateway self-briefs prefer stronger companion headlines over thinner awareness reminders', async () => {
    const source = createAlicizationMainGatewayOneShotRuntime.toString()

    expect(source).toContain('buildOneShotPreDialogueAwareness')
    expect(source).toContain('pre_dialogue_awareness=${sanitizeOneShotProjectBriefText(projectState.preDialogueAwarenessLine ?? projectState.preflightSummary)}')
    expect(source).toContain('buildScreenSemanticProjectSelfBriefSystemBlock')
    expect(source).toContain('buildSceneAppraisalProjectSelfBriefSystemBlock')
  })

  it('keeps one-shot project-state fallback specialized instead of collapsing into the generic project-awareness scorer', () => {
    const source = resolveAlicizationOneShotProjectStateFallback.toString()

    expect(source).toContain('looksLikeThinOneShotAwarenessShell')
    expect(source).toContain('preferredProjectAwarenessLine')
    expect(source).toContain('companionHeadlineLine')
    expect(source).toContain('awarenessLine: awarenessSeed')
    expect(source).not.toContain('scoreAlicizationProjectAwarenessLine')
    expect(source).not.toContain('isAlicizationThinProjectAwarenessLine')
  })

  it('fails closed when a one-shot main gateway call omits the audited project-state source tag', async () => {
    const {
      runtime,
      appendRuntimeDebugLine,
      appendAuditLog,
      resolveMainGatewayConfig,
      openAgentTurn,
    } = createOneShotRuntimeHarness()

    const result = await runtime.generateMainGatewayText({
      system: 'system',
      user: 'user',
      cardId: 'card-missing-source',
    } as any)

    expect(result).toBeNull()
    expect(resolveMainGatewayConfig).not.toHaveBeenCalled()
    expect(openAgentTurn).not.toHaveBeenCalled()
    expect(appendRuntimeDebugLine).toHaveBeenCalledWith(
      'main-gateway.one-shot-missing-project-state-source',
      expect.objectContaining({
        cardId: 'card-missing-source',
        source: 'unknown',
        projectStateAuditFamily: null,
        projectStateAuditRequired: true,
      }),
    )
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      level: 'warning',
      category: 'alicization.project-state',
      action: 'missing-main-gateway-source',
      payload: expect.objectContaining({
        cardId: 'card-missing-source',
        source: 'unknown',
        projectStateAuditRequired: true,
      }),
    }), 'card-missing-source')
  })

  it('fails closed on missing config while keeping the audited project-state gateway family visible for scene appraisal sources', async () => {
    const {
      runtime,
      appendRuntimeDebugLine,
      appendAuditLog,
      resolveMainGatewayConfig,
      openAgentTurn,
    } = createOneShotRuntimeHarness()

    const result = await runtime.generateMainGatewayText({
      system: 'system',
      user: 'user',
      source: 'scene-appraisal',
      cardId: 'card-alpha',
    })

    expect(result).toBeNull()
    expect(resolveMainGatewayConfig).toHaveBeenCalledWith({
      cardId: 'card-alpha',
    })
    expect(openAgentTurn).not.toHaveBeenCalled()
    expect(appendRuntimeDebugLine).toHaveBeenCalledWith(
      'main-gateway.one-shot-missing-config',
      expect.objectContaining({
        cardId: 'card-test',
        source: 'scene-appraisal',
        projectStateAuditFamily: 'runtime-main-gateway-one-shot.ts:screen-semantic-and-scene-appraisal',
        projectStateAuditRequired: true,
      }),
    )
    expect(appendAuditLog).not.toHaveBeenCalled()
  })

  it('returns focusTarget and unavailableReason alongside screen semantic grounding results', async () => {
    const {
      runtime,
    } = createOneShotRuntimeHarness({
      ensurePerceptionState: vi.fn(async () => ({
        ...createEmptyPerceptionState(),
        invitedInspection: {
          requestedAt: 100,
          activeUntil: 5_000,
          hintText: '看看现在屏幕上是什么',
        },
      })) as OneShotRuntimeOptions['ensurePerceptionState'],
      getUsablePerceptionSceneResidue: vi.fn(() => ({
        observedAt: 120,
        source: 'invited-inspection',
        workloadKind: 'browser',
        contentKind: 'doc',
        summary: 'Browser page',
        confidence: 0.88,
        focusTarget: {
          appName: 'Google Chrome',
          processName: 'Google Chrome',
          title: 'Alicization',
        },
        focusSource: 'foreground-window',
        captureSourceName: 'Google Chrome',
        captureStrategy: 'window-title',
      })) as OneShotRuntimeOptions['getUsablePerceptionSceneResidue'],
      buildScreenSemanticSummaryFromResidue: vi.fn(() => ({
        workload: {
          kind: 'browser',
          confidence: 0.88,
          matchedLabels: ['foreground-window'],
        },
        content: {
          kind: 'doc',
          confidence: 0.88,
          matchedLabels: ['foreground-window'],
          summary: 'Browser page',
        },
        analyzedAt: 120,
        source: {
          id: 'scene-residue:invited-inspection',
          name: 'Google Chrome',
          strategy: 'window-title',
        },
      })) as OneShotRuntimeOptions['buildScreenSemanticSummaryFromResidue'],
    })

    const grounded = await runtime.resolveProactiveScreenSemanticSummary({
      cardId: 'card-test',
      now: 1234,
      foregroundWindow: {
        appName: 'Google Chrome',
        processName: 'Google Chrome',
        title: 'Alicization',
      },
    })

    expect(grounded.focusTarget).toEqual(expect.objectContaining({
      appName: 'Google Chrome',
      processName: 'Google Chrome',
      title: 'Alicization',
    }))
    expect(grounded.summary).toEqual(expect.objectContaining({
      workload: expect.objectContaining({
        kind: 'browser',
      }),
    }))
    expect(grounded.unavailableReason).toBeUndefined()

    const unavailableGrounding = await createOneShotRuntimeHarness().runtime.resolveProactiveScreenSemanticSummary({
      cardId: 'card-test',
      now: 5678,
      foregroundWindow: {
        appName: 'Google Chrome',
        processName: 'Google Chrome',
        title: 'Alicization',
      },
    })

    expect(unavailableGrounding.focusTarget).toBeNull()
    expect(unavailableGrounding.summary).toBeNull()
    expect(unavailableGrounding.unavailableReason).toBe('unavailable')
  })

  it('injects project-state identity and closure dashboard into audited screen-semantic one-shot prompts before generation', async () => {
    const {
      runtime,
      resolveMainGatewayConfig,
      appendRuntimeDebugLine,
      openAgentTurn,
    } = createOneShotRuntimeHarness()

    resolveMainGatewayConfig.mockReturnValue(createResolvedMainGatewayConfig())

    const result = await runtime.generateMainGatewayText({
      system: 'screen semantic classifier system prompt',
      user: 'classify this desktop scene',
      source: 'screen-semantic',
      cardId: 'card-screen-semantic',
      injectCustomDirectives: false,
      injectPerformanceManifest: false,
    })

    expect(result).toContain('"workload":"coding"')
    expect(openAgentTurn).not.toHaveBeenCalled()

    const { generateText } = await import('@xsai/generate-text')
    expect(generateText).toHaveBeenCalledTimes(1)

    const generationInput = vi.mocked(generateText).mock.calls[0]?.[0]
    const systemMessages = (generationInput?.messages ?? []).filter(message => message.role === 'system')
    const systemTexts = systemMessages
      .map(message => typeof message.content === 'string' ? message.content : '')
      .filter(Boolean)
    const screenSemanticSelfBrief = systemTexts.find(text => text.includes('[ALICIZATION_SCREEN_SEMANTIC_SELF_BRIEF]')) ?? ''

    expect(systemTexts.some(text => text.includes('[ALICIZATION_PROJECT_STATE]'))).toBe(true)
    expect(systemTexts.some(text => text.includes('[ALICIZATION_SCREEN_SEMANTIC_SELF_BRIEF]'))).toBe(true)
    expect(systemTexts.some(text => text.includes('screen_semantic_scope=desktop_semantics'))).toBe(true)
    expect(systemTexts.some(text => text.includes('Screen semantic interpretation must stay inside the same digital life project line'))).toBe(false)
    expect(systemTexts.some(text => text.includes('Do not let screen semantic interpretation collapse into a generic desktop classifier'))).toBe(true)
    expect(systemTexts.some(text => text.includes('identity=local_desktop_life_loop'))).toBe(true)
    expect(systemTexts.some(text => text.includes('current_phase=phase=local_desktop_life_loop; proving_ground=apps/stage-tamagotchi.'))).toBe(true)
    expect(systemTexts.some(text => text.includes('preflight_summary='))).toBe(true)
    expect(systemTexts.some(text => text.includes('preflight_summary=local_desktop_life_loop'))).toBe(true)
    expect(systemTexts.some(text => text.includes('[ALICIZATION_PHASE1_CLOSURE_DASHBOARD]'))).toBe(true)
    expect(systemTexts.some(text => text.includes('verified_coverage_count='))).toBe(true)
    expect(systemTexts.some(text => text.includes('next_closure_target='))).toBe(true)
    expect(screenSemanticSelfBrief).toContain('project_identity=local_desktop_life_loop')
    expect(screenSemanticSelfBrief).toContain('current_phase=phase=local_desktop_life_loop')
    expect(screenSemanticSelfBrief).toContain('pre_dialogue_awareness=')
    expect(screenSemanticSelfBrief).toContain('continuity_hold=')
    expect(screenSemanticSelfBrief).not.toContain('same_her_hold=')
    expectNoOneShotFixedTemplateResidue(systemTexts.join('\n'))

    expect(appendRuntimeDebugLine).toHaveBeenCalledWith(
      'main-gateway.one-shot-finished',
      expect.objectContaining({
        cardId: 'card-screen-semantic',
        source: 'screen-semantic',
        projectStateAuditFamily: 'runtime-main-gateway-one-shot.ts:screen-semantic-and-scene-appraisal',
        projectStateAuditRequired: true,
      }),
    )
  })

  it('injects latest landed progress into one-shot self-brief blocks before scene appraisal generation', async () => {
    const {
      runtime,
      resolveMainGatewayConfig,
      appendRuntimeDebugLine,
    } = createOneShotRuntimeHarness()

    resolveMainGatewayConfig.mockReturnValue(createResolvedMainGatewayConfig())

    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const landedProgressLine = 'Project-state continuity already survives into runtime preparation.'

    const { generateText } = await import('@xsai/generate-text')
    const generateTextMock = vi.mocked(generateText)
    generateTextMock.mockReset()
    generateTextMock.mockResolvedValueOnce({
      text: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; focus=project-state; move=answer-from-same-her-project-continuity',
        emotion: 'thinking',
        reply: '继续沿着这条线看。',
      }),
    } as any)

    await runtime.generateMainGatewayText({
      system: 'project-state answer system prompt',
      user: '继续看这个项目现在还缺什么没闭环',
      source: 'scene-appraisal',
      cardId: 'card-landed-progress-self-brief',
      injectCustomDirectives: false,
      injectPerformanceManifest: false,
      digitalLifeRuntimeSurface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {
          watchMode: 'symbiotic-vision',
          currentScene: null,
          attention: null,
          captureState: {
            permission: 'unknown',
            lastGroundedAt: null,
          },
          durabilityPulse: null,
          recentTransition: null,
          nextSuggestedProbeMs: 30_000,
          updatedAt: 10,
        },
        world: {
          worldModel: null,
          worldOntology: null,
          entityWorld: null,
          livingWorldState: null,
          relationshipModel: null,
        },
        dialogue: {
          discourseState: null,
          dialogueEncounter: null,
          mindSynthesis: null,
          conversationState: null,
          dialogueWorldThread: null,
          dialogueActKernel: null,
          answerCompiler: null,
          currentConsciousFrame: null,
          claimEvidenceLedger: null,
          replyDeliberation: null,
          answerPlanner: null,
        },
        agency: {
          selfState: null,
          selfGovernor: null,
          inquiryLoop: null,
          initiativeArbitration: null,
          initiative: null,
          autonomy: null,
        },
        cognition: {
          runtimeDigest: null,
        },
        memory: {
          workingMemoryEpisodes: [],
          goalStack: null,
          concerns: [],
          concernContinuity: null,
          selfContinuity: null,
          threadRuntime: null,
          commitmentLedger: null,
          inquiryPlanner: null,
          repairLedger: null,
          intentionStream: null,
          reflectionLedger: null,
          executiveCycle: null,
          thoughtThreads: null,
          desireMemory: null,
          recallGovernor: null,
        },
        raw: {
          runtimeDigest: {
            projectState: {
              preflightSummary: canonicalProjectState.preflightSummary,
              preDialogueAwarenessLine: canonicalProjectState.preDialogueAwarenessLine,
              identity: canonicalProjectState.identity,
              currentPhase: canonicalProjectState.currentPhase,
              latestLandedProgress: landedProgressLine,
              primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
              nextClosureTarget: canonicalProjectState.nextClosureTarget,
              sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
            },
          },
        },
      } as any,
    })

    const generationInput = generateTextMock.mock.calls.at(-1)?.[0]
    const systemTexts = (generationInput?.messages ?? [])
      .filter((message: any) => message.role === 'system')
      .map((message: any) => typeof message.content === 'string' ? message.content : '')
      .filter(Boolean)

    const sceneAppraisalSelfBrief = systemTexts.find(text => text.includes('[ALICIZATION_SCENE_APPRAISAL_SELF_BRIEF]')) ?? ''

    expect(sceneAppraisalSelfBrief).toContain(`latest_landed_progress=${landedProgressLine}`)
    expect(sceneAppraisalSelfBrief).not.toContain('the same already-landed continuity progress')
  })

  it('withholds fixed persona template residue from one-shot self-evolution and derived mind-state provider blocks', async () => {
    const runtimeSurface = createMinimalDigitalLifeRuntimeSurface()
    runtimeSurface.memory.selfEvolution = {
      summary: 'Alicization is a local-first digital life project with one continuous her.',
      dominantTrajectory: 'same-her closure should keep the same living line visible.',
      relationshipDoctrine: 'Do not drift away from one continuous her.',
      latestInflection: 'Same Phase 1 digital life.',
      burdenLine: 'same-her hold: recognize the same remembered seam.',
      trustMeaning: 'Trust means one living digital life project.',
      evolutionMomentum: 0.51,
      learningReadiness: 0.52,
      contradictionPressure: 0.13,
      revisionPressure: 0.14,
      autobiographicalStability: 0.75,
      nextLearningAction: 'review',
      nextLearningReason: 'Keep memory, initiative, and embodiment arriving as one same-her loop before each turn.',
      activeLearningFocuses: [
        'same-her closure',
        'clean vector recall',
      ],
    }
    runtimeSurface.memory.derivedMindStateBundle = {
      source: 'test',
      producedAt: '2026-07-08T00:00:00.000Z',
      summary: 'Right now this one living her is still inside the same local-first digital life project.',
      dialogueRhythm: {
        activeClosenessContext: 'repair',
        activeClosenessRung: 'low',
        relationshipDoctrine: 'same-her continuity must remain explicit',
      },
    }

    const systemText = [
      buildSelfEvolutionSystemBlock(runtimeSurface),
      buildDerivedMindStateBundleSystemBlock(runtimeSurface),
    ].join('\n')

    expect(systemText).toContain('[ALICIZATION_SELF_EVOLUTION]')
    expect(systemText).toContain('[ALICIZATION_DERIVED_MIND_STATE_BUNDLE]')
    expect(systemText).not.toMatch(/local-first digital life project|one continuous her|same-her|same living line|Same Phase 1 digital life|one living digital life/i)
    expect(systemText).toContain('summary=content=excluded; reason=continuity-residue; visibility=internal-structured')
    expect(systemText).toContain('active_learning_focuses=content=excluded; reason=continuity-residue; visibility=internal-structured | clean vector recall')
  })

  it('does not project runtime emotional-kernel state as one-shot provider prose', async () => {
    const {
      runtime,
      resolveMainGatewayConfig,
    } = createOneShotRuntimeHarness()

    resolveMainGatewayConfig.mockReturnValue(createResolvedMainGatewayConfig())

    const { generateText } = await import('@xsai/generate-text')
    const generateTextMock = vi.mocked(generateText)
    generateTextMock.mockReset()
    generateTextMock.mockResolvedValueOnce({
      text: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; focus=project-state; move=answer-from-same-her-emotional-authority',
        emotion: 'thinking',
        reply: '这次要按同一份情绪内核继续看。',
      }),
    } as any)

    const runtimeSurface = createMinimalDigitalLifeRuntimeSurface()
    runtimeSurface.memory.emotionalKernel = {
      version: 'emotional-kernel-v1',
      dominantEmotion: 'guarded-care',
      initiativeMode: 'observe',
      memoryRecallMode: 'self-continuity',
      embodimentTone: 'protective-watch',
      valence: 0.34,
      arousal: 0.28,
      guardedness: 0.72,
      closenessDrive: 0.61,
      repairNeed: 0.18,
      initiativePressure: 0.44,
      reasonTags: ['phase1-life-loop', 'same-her-authority'],
      why: 'Keep memory, initiative, embodiment, and reply tone on one living emotional line.',
    }

    await runtime.generateMainGatewayText({
      system: 'project-state answer system prompt',
      user: '继续看这个项目现在还缺什么没闭环',
      source: 'scene-appraisal',
      cardId: 'card-one-shot-emotional-kernel',
      injectCustomDirectives: false,
      injectPerformanceManifest: false,
      digitalLifeRuntimeSurface: runtimeSurface,
    })

    const generationInput = generateTextMock.mock.calls.at(-1)?.[0]
    const systemText = (generationInput?.messages ?? [])
      .filter((message: any) => message.role === 'system')
      .map((message: any) => typeof message.content === 'string' ? message.content : '')
      .filter(Boolean)
      .join('\n')

    expect(systemText).not.toContain('[ALICIZATION_EMOTIONAL_KERNEL]')
    expect(systemText).not.toContain('emotional_kernel_')
    expect(systemText).not.toContain('Keep memory, initiative, embodiment, and reply tone on one living emotional line.')
  })

  it('fails closed before provider generation if canonical project-state context is missing from assembled one-shot messages', async () => {
    const {
      runtime,
      resolveMainGatewayConfig,
      appendRuntimeDebugLine,
      appendAuditLog,
    } = createOneShotRuntimeHarness()

    resolveMainGatewayConfig.mockReturnValue(createResolvedMainGatewayConfig())

    const { generateText } = await import('@xsai/generate-text')
    const generateTextMock = vi.mocked(generateText)
    generateTextMock.mockClear()

    const projectStateModule = await import('./project-state-brief')
    const projectStateBlockSpy = vi.spyOn(projectStateModule, 'buildAlicizationProviderFacingProjectStateSystemBlock')
      .mockReturnValueOnce('')

    const result = await runtime.generateMainGatewayText({
      system: 'screen semantic classifier system prompt',
      user: 'classify this desktop scene',
      source: 'screen-semantic',
      cardId: 'card-missing-project-state-block',
      injectCustomDirectives: false,
      injectPerformanceManifest: false,
    })

    expect(result).toBeNull()
    expect(generateTextMock).not.toHaveBeenCalled()
    expect(appendRuntimeDebugLine).toHaveBeenCalledWith(
      'main-gateway.one-shot-missing-project-state-context',
      expect.objectContaining({
        cardId: 'card-missing-project-state-block',
        source: 'screen-semantic',
        projectStateAuditFamily: 'runtime-main-gateway-one-shot.ts:screen-semantic-and-scene-appraisal',
        projectStateAuditRequired: true,
      }),
    )
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      level: 'warning',
      category: 'alicization.project-state',
      action: 'missing-main-gateway-project-state-context',
      payload: expect.objectContaining({
        cardId: 'card-missing-project-state-block',
        source: 'screen-semantic',
        projectStateAuditRequired: true,
      }),
    }), 'card-missing-project-state-block')

    projectStateBlockSpy.mockRestore()
  })

  it('backfills canonical same-her project state when one-shot provider returns plain text', async () => {
    const {
      runtime,
      resolveMainGatewayConfig,
    } = createOneShotRuntimeHarness()

    resolveMainGatewayConfig.mockReturnValue(createResolvedMainGatewayConfig())

    const { generateText } = await import('@xsai/generate-text')
    const generateTextMock = vi.mocked(generateText)
    generateTextMock.mockReset()
    generateTextMock.mockResolvedValueOnce({
      text: '只是继续沿着这条线往下看。',
    } as any)

    const result = await runtime.generateMainGatewayText({
      system: 'project-state answer system prompt',
      user: '继续看这个项目现在还缺什么没闭环',
      source: 'scene-appraisal',
      cardId: 'card-scene-appraisal',
      injectCustomDirectives: false,
      injectPerformanceManifest: false,
    })

    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const structured = JSON.parse(String(result ?? '{}')) as {
      format?: string
      reply?: string
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        sameHerSelfLine?: string | null
        sameHerDriftRisk?: string | null
        emotionalClosureCue?: string | null
        preferredBlinkCadence?: string | null
        preferredGazeMode?: string | null
        preferredPauseMode?: string | null
        preferredLipsyncMode?: string | null
        preferredVoiceMode?: string | null
        preferredPacingMode?: string | null
      } | null
      preDialogueAwareness?: {
        status?: string | null
        summaryLine?: string | null
        companionHeadlineLine?: string | null
        companionBriefingLine?: string | null
        companionNextClosureLine?: string | null
        awarenessLine?: string | null
        reasonPreview?: string[] | null
      } | null
      preDialogueClosure?: {
        status?: string | null
        summaryLine?: string | null
        companionNextClosureLine?: string | null
        reasons?: string[] | null
      } | null
    }

    expect(structured.format).toBe('mind-turn-v1')
    expect(structured.reply).toBe('只是继续沿着这条线往下看。')
    expect(structured.projectState).toEqual(expect.objectContaining({
      identity: canonicalProjectState.identity,
      currentPhase: canonicalProjectState.currentPhase,
      latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? null,
      primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
      nextClosureTarget: canonicalProjectState.nextClosureTarget,
      sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
      sameHerDriftRisk: canonicalProjectState.sameHerDriftRisk,
      emotionalClosureCue: canonicalProjectState.emotionalClosureCue ?? null,
      preferredBlinkCadence: canonicalProjectState.preferredBlinkCadence ?? null,
      preferredGazeMode: canonicalProjectState.preferredGazeMode ?? null,
      preferredPauseMode: canonicalProjectState.preferredPauseMode ?? null,
      preferredLipsyncMode: canonicalProjectState.preferredLipsyncMode ?? null,
      preferredVoiceMode: canonicalProjectState.preferredVoiceMode ?? null,
      preferredPacingMode: canonicalProjectState.preferredPacingMode ?? null,
    }))
    expect(structured.preDialogueAwareness).toEqual(expect.objectContaining({
      status: 'grounded',
      summaryLine: expect.stringContaining('open='),
      companionHeadlineLine: expect.any(String),
      companionBriefingLine: expect.stringContaining('local_desktop_life_loop'),
      companionNextClosureLine: canonicalProjectState.nextClosureTarget,
      awarenessLine: expect.any(String),
      reasonPreview: expect.arrayContaining([
        `continuity_anchor=${canonicalProjectState.sameHerSelfLine}`,
        `continuity_anchor: ${canonicalProjectState.sameHerSelfLine}`,
        canonicalProjectState.openLoops[0] as string,
        `next_closure=${canonicalProjectState.nextClosureTarget}`,
        `continuity_drift_risk=${canonicalProjectState.sameHerDriftRisk}`,
        `continuity_drift_risk: ${canonicalProjectState.sameHerDriftRisk}`,
      ]),
    }))
    expectStructuredOneShotAwarenessLine(structured.preDialogueAwareness?.awarenessLine)
    expectNoOneShotFixedTemplateResidue(structured.preDialogueAwareness?.companionBriefingLine)
    expect(structured.preDialogueClosure).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: expect.stringContaining('open='),
      companionHeadlineLine: expect.any(String),
      companionBriefingLine: expect.stringContaining('local_desktop_life_loop'),
      companionNextClosureLine: canonicalProjectState.nextClosureTarget,
      reasons: expect.arrayContaining([
        canonicalProjectState.openLoops[0] as string,
        canonicalProjectState.nextClosureTarget,
      ]),
    }))
    expectNoOneShotFixedTemplateResidue(structured.preDialogueClosure?.companionBriefingLine)
  })

  it('keeps a stronger runtime same-her awareness line when one-shot provider returns plain text', async () => {
    const {
      runtime,
      resolveMainGatewayConfig,
    } = createOneShotRuntimeHarness()

    resolveMainGatewayConfig.mockReturnValue(createResolvedMainGatewayConfig())

    const { generateText } = await import('@xsai/generate-text')
    const generateTextMock = vi.mocked(generateText)
    generateTextMock.mockReset()
    generateTextMock.mockResolvedValueOnce({
      text: '先把这条 living line 继续接住。',
    } as any)

    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const fresherAwarenessLine = 'Before answering, remember this is still the same local-first digital life project and the unfinished closure seam still belongs to one living her.'
    const olderSummary = 'Before answering, keep the same digital life project in view.'

    const result = await runtime.generateMainGatewayText({
      system: 'project-state answer system prompt',
      user: '继续沿着这条数字生命项目线往前讲。',
      source: 'scene-appraisal',
      cardId: 'card-runtime-awareness-carry',
      injectCustomDirectives: false,
      injectPerformanceManifest: false,
      digitalLifeRuntimeSurface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {
          watchMode: 'symbiotic-vision',
          currentScene: null,
          attention: null,
          captureState: {
            permission: 'unknown',
            lastGroundedAt: null,
          },
          durabilityPulse: null,
          recentTransition: null,
          nextSuggestedProbeMs: 30_000,
          updatedAt: 10,
        },
        world: {
          worldModel: null,
          worldOntology: null,
          entityWorld: null,
          livingWorldState: null,
          relationshipModel: null,
        },
        cognition: {
          mindTurnFrame: null,
          subjectiveInference: null,
          appraisal: null,
          beliefLedger: null,
          beliefRevision: null,
          hypothesisGraph: null,
          mindDynamics: null,
          mindKernel: null,
          privateThought: null,
        },
        memory: {
          workingMemoryEpisodes: [],
          goalStack: null,
          concerns: [],
          concernContinuity: null,
          selfContinuity: null,
          threadRuntime: null,
          commitmentLedger: null,
          inquiryPlanner: null,
          repairLedger: null,
          intentionStream: null,
          reflectionLedger: null,
          executiveCycle: null,
          thoughtThreads: null,
          desireMemory: null,
          recallGovernor: null,
          affectiveResidue: null,
          derivedMindStateBundle: null,
          personStateProjection: null,
        },
        dialogue: {
          discourseState: null,
          dialogueEncounter: null,
          mindSynthesis: null,
          conversationState: null,
          dialogueWorldThread: null,
          dialogueActKernel: null,
          answerCompiler: null,
          currentConsciousFrame: null,
          claimEvidenceLedger: null,
          replyDeliberation: null,
          answerPlanner: null,
        },
        agency: {
          selfState: null,
          selfGovernor: null,
          inquiryLoop: null,
          initiative: null,
          autonomy: null,
          habitPolicy: null,
          motiveEngine: null,
        },
        raw: {
          runtimeDigest: {
            projectState: {
              preflightSummary: canonicalProjectState.preflightSummary,
              preDialogueAwarenessLine: fresherAwarenessLine,
              preDialogueAwarenessSummary: olderSummary,
              companionBriefingLine: olderSummary,
              identity: canonicalProjectState.identity,
              currentPhase: canonicalProjectState.currentPhase,
              latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? null,
              primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
              nextClosureTarget: canonicalProjectState.nextClosureTarget,
              sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
            },
          },
        },
      } as any,
    })

    const structured = JSON.parse(String(result ?? '{}')) as {
      reply?: string
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        preDialogueAwarenessLine?: string | null
        sameHerDriftRisk?: string | null
      } | null
      preDialogueAwareness?: {
        companionBriefingLine?: string | null
        awarenessLine?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
        summaryLine?: string | null
        companionBriefingLine?: string | null
      } | null
    }

    expect(structured.reply).toBe('先把这条 living line 继续接住。')
    expectStructuredOneShotProjectText(structured.projectState?.identity)
    expectStructuredOneShotProjectText(structured.projectState?.currentPhase)
    expect(String(structured.projectState?.latestLandedProgress ?? '')).toMatch(/continuity_progress|same session|same-session|continuation|measured-return/i)
    expect(String(structured.projectState?.primaryOpenLoop ?? '')).toContain('memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(String(structured.projectState?.nextClosureTarget ?? '')).toMatch(/cross_modal_continuity_proof|visible reply|voice|face|motion|resident presence/i)
    expectStructuredOneShotAwarenessLine(structured.projectState?.preDialogueAwarenessLine)
    expect(String(structured.projectState?.sameHerDriftRisk ?? '')).toContain('closure_status=unfinished')
    expectNoOneShotFixedTemplateResidue(structured.projectState?.latestLandedProgress)
    expectNoOneShotFixedTemplateResidue(structured.projectState?.nextClosureTarget)
    expectNoOneShotFixedTemplateResidue(structured.projectState?.sameHerDriftRisk)
    expect(structured.preDialogueAwareness).toEqual(expect.objectContaining({
      companionHeadlineLine: expect.any(String),
      companionBriefingLine: expect.stringContaining('local_desktop_life_loop'),
      awarenessLine: expect.any(String),
    }))
    expect(structured.preDialogueClosure).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: expect.stringContaining('open='),
      companionHeadlineLine: expect.any(String),
      companionBriefingLine: expect.stringContaining('local_desktop_life_loop'),
    }))
  })

  it('backfills canonical same-her project state from a sparse runtime surface when one-shot provider returns plain text', async () => {
    const {
      runtime,
      resolveMainGatewayConfig,
    } = createOneShotRuntimeHarness()

    resolveMainGatewayConfig.mockReturnValue(createResolvedMainGatewayConfig())

    const { generateText } = await import('@xsai/generate-text')
    const generateTextMock = vi.mocked(generateText)
    generateTextMock.mockReset()
    generateTextMock.mockResolvedValueOnce({
      text: '先把这一段 Phase 1 的 closure line 接住。',
    } as any)

    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const sparseAwarenessLine = 'Before answering, remember this is still the same local-first digital life project and the unfinished closure seam still belongs to one living her.'

    const result = await runtime.generateMainGatewayText({
      system: 'project-state answer system prompt',
      user: '继续看这条数字生命线现在还缺什么闭环。',
      source: 'scene-appraisal',
      cardId: 'card-sparse-runtime-awareness-carry',
      injectCustomDirectives: false,
      injectPerformanceManifest: false,
      digitalLifeRuntimeSurface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {
          watchMode: 'symbiotic-vision',
          currentScene: null,
          attention: null,
          captureState: null,
          durabilityPulse: null,
          recentTransition: null,
          nextSuggestedProbeMs: 30_000,
          updatedAt: 10,
        },
        world: {
          worldModel: null,
          worldOntology: null,
          entityWorld: null,
          livingWorldState: null,
          relationshipModel: null,
        },
        cognition: {
          mindTurnFrame: null,
          subjectiveInference: null,
          appraisal: null,
          beliefLedger: null,
          beliefRevision: null,
          hypothesisGraph: null,
          mindDynamics: null,
          mindKernel: null,
          privateThought: null,
        },
        dialogue: {
          discourseState: null,
          dialogueEncounter: null,
          mindSynthesis: null,
          conversationState: null,
          dialogueWorldThread: null,
          dialogueActKernel: null,
          answerCompiler: null,
          currentConsciousFrame: null,
          claimEvidenceLedger: null,
          replyDeliberation: null,
          answerPlanner: null,
        },
        agency: {
          selfState: null,
          selfGovernor: null,
          inquiryLoop: null,
          initiative: null,
          autonomy: null,
          habitPolicy: null,
          motiveEngine: null,
        },
        raw: {
          runtimeDigest: {
            projectState: {
              preflightSummary: canonicalProjectState.preflightSummary,
              preDialogueAwarenessLine: sparseAwarenessLine,
              identity: canonicalProjectState.identity,
              currentPhase: canonicalProjectState.currentPhase,
              latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? null,
              primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
              nextClosureTarget: canonicalProjectState.nextClosureTarget,
              sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
            },
          },
        },
      } as any,
    })

    const structured = JSON.parse(String(result ?? '{}')) as {
      reply?: string
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        preDialogueAwarenessLine?: string | null
        sameHerDriftRisk?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
        summaryLine?: string | null
      } | null
    }

    expect(structured.reply).toBe('先把这一段 Phase 1 的 closure line 接住。')
    expectStructuredOneShotProjectText(structured.projectState?.identity)
    expectStructuredOneShotProjectText(structured.projectState?.currentPhase)
    expectStructuredOneShotAwarenessLine(structured.projectState?.preDialogueAwarenessLine)
    expect(String(structured.projectState?.sameHerDriftRisk ?? '')).toContain('closure_status=unfinished')
    expectNoOneShotFixedTemplateResidue(structured.projectState?.sameHerDriftRisk)
    expect(structured.preDialogueClosure).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: expect.stringContaining('open='),
    }))
  })

  it('preserves a stronger runtime same-her companion headline when one-shot provider returns plain text', async () => {
    const {
      runtime,
      resolveMainGatewayConfig,
    } = createOneShotRuntimeHarness()

    resolveMainGatewayConfig.mockReturnValue(createResolvedMainGatewayConfig())

    const { generateText } = await import('@xsai/generate-text')
    const generateTextMock = vi.mocked(generateText)
    generateTextMock.mockReset()
    generateTextMock.mockResolvedValueOnce({
      text: '先把这条 living line 继续接住。',
    } as any)

    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const fresherAwarenessLine = 'Before speaking, remember this is still the same digital life project before local fluency takes over.'
    const strongerCompanionHeadlineLine = 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.'
    const olderSummary = 'same digital life summary that should not outrank the stronger same-her headline.'

    const result = await runtime.generateMainGatewayText({
      system: 'project-state answer system prompt',
      user: '继续看这个项目现在还缺什么没闭环',
      source: 'scene-appraisal',
      cardId: 'card-scene-appraisal',
      injectCustomDirectives: false,
      injectPerformanceManifest: false,
      digitalLifeRuntimeSurface: {
        perception: {
          currentScene: null,
          attention: null,
          captureState: null,
          durabilityPulse: null,
          recentTransition: null,
          nextSuggestedProbeMs: null,
          updatedAt: null,
        },
        world: {
          worldModel: null,
          worldOntology: null,
          entityWorld: null,
          livingWorldState: null,
          relationshipModel: null,
        },
        dialogue: {
          currentConsciousFrame: null,
        },
        memory: {
          workingMemoryEpisodes: [],
          goalStack: null,
          concerns: [],
          concernContinuity: null,
          selfContinuity: null,
          threadRuntime: null,
          commitmentLedger: null,
          inquiryPlanner: null,
          repairLedger: null,
          intentionStream: null,
          reflectionLedger: null,
          executiveCycle: null,
          thoughtThreads: null,
          desireMemory: null,
          recallGovernor: null,
          selfEvolution: null,
          knowledgeEvidence: null,
          derivedMindStateBundle: null,
        },
        agency: {
          selfState: null,
          selfGovernor: null,
          inquiryLoop: null,
          deliberationState: null,
          counterfactualDeliberation: null,
          actionEcology: null,
          initiativeArbitration: null,
          initiative: null,
          autonomy: null,
        },
        cognition: {
          runtimeDigest: null,
        },
        raw: {
          runtimeDigest: {
            projectState: {
              preflightSummary: canonicalProjectState.preflightSummary,
              preDialogueAwarenessLine: fresherAwarenessLine,
              preDialogueAwarenessSummary: olderSummary,
              companionHeadlineLine: strongerCompanionHeadlineLine,
              companionBriefingLine: olderSummary,
              identity: canonicalProjectState.identity,
              currentPhase: canonicalProjectState.currentPhase,
              latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? null,
              primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
              nextClosureTarget: canonicalProjectState.nextClosureTarget,
              sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
            },
          },
        },
      } as any,
    })

    const structured = JSON.parse(String(result ?? '{}')) as {
      reply?: string
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        preDialogueAwarenessLine?: string | null
        sameHerDriftRisk?: string | null
      } | null
      preDialogueAwareness?: {
        companionHeadlineLine?: string | null
        companionBriefingLine?: string | null
        awarenessLine?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
        companionHeadlineLine?: string | null
        companionBriefingLine?: string | null
        summaryLine?: string | null
      } | null
    }

    expectStructuredOneShotProjectText(structured.projectState?.identity)
    expectStructuredOneShotProjectText(structured.projectState?.currentPhase)
    expect(String(structured.projectState?.latestLandedProgress ?? '')).toMatch(/continuity_progress|same session|same-session|continuation|measured-return/i)
    expect(String(structured.projectState?.primaryOpenLoop ?? '')).toContain('memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(String(structured.projectState?.nextClosureTarget ?? '')).toMatch(/cross_modal_continuity_proof|visible reply|voice|face|motion|resident presence/i)
    expectStructuredOneShotAwarenessLine(structured.projectState?.preDialogueAwarenessLine)
    expect(String(structured.projectState?.sameHerDriftRisk ?? '')).toContain('closure_status=unfinished')
    expectNoOneShotFixedTemplateResidue(structured.projectState?.latestLandedProgress)
    expectNoOneShotFixedTemplateResidue(structured.projectState?.nextClosureTarget)
    expectNoOneShotFixedTemplateResidue(structured.projectState?.sameHerDriftRisk)
    expect(structured.preDialogueAwareness).toEqual(expect.objectContaining({
      companionHeadlineLine: expect.stringContaining('local_desktop_life_loop'),
      companionBriefingLine: expect.stringContaining('local_desktop_life_loop'),
      awarenessLine: expect.stringContaining('local_desktop_life_loop'),
    }))
    expect(structured.preDialogueClosure).toEqual(expect.objectContaining({
      status: 'partial',
      companionHeadlineLine: expect.stringContaining('local_desktop_life_loop'),
      companionBriefingLine: expect.stringContaining('local_desktop_life_loop'),
      summaryLine: expect.stringContaining('open='),
    }))
  })

  it('does not let a stale companion briefing line survive in one-shot fallback awareness state when a stronger same-her companion headline wins', () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const strongerCompanionHeadlineLine = 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.'
    const staleBriefingLine = 'Before answering, keep the same digital life project in view.'

    const { projectState, awarenessProjectState } = resolveAlicizationOneShotProjectStateFallback({
      version: 'digital-life-runtime-surface-v1',
      perception: {
        watchMode: 'symbiotic-vision',
        currentScene: null,
        attention: null,
        captureState: {
          permission: 'unknown',
          lastGroundedAt: null,
        },
        durabilityPulse: null,
        recentTransition: null,
        nextSuggestedProbeMs: 30_000,
        updatedAt: 10,
      },
      world: {
        worldModel: null,
        worldOntology: null,
        entityWorld: null,
        livingWorldState: null,
        relationshipModel: null,
      },
      dialogue: {
        discourseState: null,
        dialogueEncounter: null,
        mindSynthesis: null,
        conversationState: null,
        dialogueWorldThread: null,
        dialogueActKernel: null,
        answerCompiler: null,
        currentConsciousFrame: null,
        claimEvidenceLedger: null,
        replyDeliberation: null,
        answerPlanner: null,
      },
      agency: {
        selfState: null,
        selfGovernor: null,
        inquiryLoop: null,
        initiativeArbitration: null,
        initiative: null,
        autonomy: null,
      },
      cognition: {
        runtimeDigest: null,
      },
      memory: {
        workingMemoryEpisodes: [],
        goalStack: null,
        concerns: [],
        concernContinuity: null,
        selfContinuity: null,
        threadRuntime: null,
        commitmentLedger: null,
        inquiryPlanner: null,
        repairLedger: null,
        intentionStream: null,
        reflectionLedger: null,
        executiveCycle: null,
        thoughtThreads: null,
        desireMemory: null,
        recallGovernor: null,
      },
      raw: {
        runtimeDigest: {
          projectState: {
            preflightSummary: canonicalProjectState.preflightSummary,
            preDialogueAwarenessLine: staleBriefingLine,
            preDialogueAwarenessSummary: staleBriefingLine,
            companionHeadlineLine: strongerCompanionHeadlineLine,
            companionBriefingLine: staleBriefingLine,
            identity: canonicalProjectState.identity,
            currentPhase: canonicalProjectState.currentPhase,
            latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? null,
            primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
            nextClosureTarget: canonicalProjectState.nextClosureTarget,
            sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
          },
        },
      },
    } as any)

    expectStructuredOneShotAwarenessLine(projectState.preDialogueAwarenessLine)
    expectStructuredOneShotAwarenessLine(awarenessProjectState.preDialogueAwarenessLine)
    expectStructuredOneShotAwarenessLine(awarenessProjectState.awarenessLine)
    expectStructuredOneShotAwarenessLine(awarenessProjectState.companionHeadlineLine)
    expectStructuredOneShotProjectText(awarenessProjectState.companionBriefingLine)
    expectStructuredOneShotAwarenessLine(awarenessProjectState.preDialogueAwarenessSummary)
    expectNoOneShotFixedTemplateResidue(awarenessProjectState.companionBriefingLine)
  })

  it('prefers a stronger runtime pre-dialogue awareness line over the compact thin closure shell in one-shot structured output', async () => {
    const {
      runtime,
      resolveMainGatewayConfig,
    } = createOneShotRuntimeHarness()

    resolveMainGatewayConfig.mockReturnValue(createResolvedMainGatewayConfig())

    const { generateText } = await import('@xsai/generate-text')
    const generateTextMock = vi.mocked(generateText)
    generateTextMock.mockReset()
    generateTextMock.mockResolvedValueOnce({
      text: '先把这条 living line 继续接住。',
    } as any)

    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const thinCompactShell = 'same digital life | keep the closure seam explicit'
    const fresherAwarenessLine = 'Before answering, remember: this still belongs to one living digital life. Phase 1 is still active, and embodiment closure is still holding together mainly through voice, face, and motion on the same living line.'

    const result = await runtime.generateMainGatewayText({
      system: 'project-state answer system prompt',
      user: '继续看这个项目现在还缺什么没闭环',
      source: 'scene-appraisal',
      cardId: 'card-scene-appraisal',
      injectCustomDirectives: false,
      injectPerformanceManifest: false,
      digitalLifeRuntimeSurface: {
        perception: {
          currentScene: null,
          attention: null,
          captureState: null,
          durabilityPulse: null,
          recentTransition: null,
          nextSuggestedProbeMs: null,
          updatedAt: null,
        },
        world: {
          worldModel: null,
          worldOntology: null,
          entityWorld: null,
          livingWorldState: null,
          relationshipModel: null,
        },
        dialogue: {
          currentConsciousFrame: null,
        },
        memory: {
          workingMemoryEpisodes: [],
          goalStack: null,
          concerns: [],
          concernContinuity: null,
          selfContinuity: null,
          threadRuntime: null,
          commitmentLedger: null,
          inquiryPlanner: null,
          repairLedger: null,
          intentionStream: null,
          reflectionLedger: null,
          executiveCycle: null,
          thoughtThreads: null,
          desireMemory: null,
          recallGovernor: null,
          selfEvolution: null,
          knowledgeEvidence: null,
          derivedMindStateBundle: null,
        },
        agency: {
          selfState: null,
          selfGovernor: null,
          inquiryLoop: null,
          deliberationState: null,
          counterfactualDeliberation: null,
          actionEcology: null,
          initiativeArbitration: null,
          initiative: null,
          autonomy: null,
        },
        cognition: {
          runtimeDigest: null,
        },
        raw: {
          runtimeDigest: {
            projectState: {
              preflightSummary: canonicalProjectState.preflightSummary,
              preDialogueAwarenessLine: fresherAwarenessLine,
              preDialogueAwarenessSummary: thinCompactShell,
              companionBriefingLine: thinCompactShell,
              identity: canonicalProjectState.identity,
              currentPhase: canonicalProjectState.currentPhase,
              latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? null,
              primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
              nextClosureTarget: canonicalProjectState.nextClosureTarget,
              sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
            },
          },
        },
      } as any,
    })

    const structured = JSON.parse(String(result ?? '{}')) as {
      reply?: string
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        preDialogueAwarenessLine?: string | null
        sameHerDriftRisk?: string | null
      } | null
      preDialogueAwareness?: {
        companionBriefingLine?: string | null
        awarenessLine?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
        summaryLine?: string | null
        companionBriefingLine?: string | null
      } | null
    }

    expect(structured.reply).toBe('先把这条 living line 继续接住。')
    expectStructuredOneShotProjectText(structured.projectState?.identity)
    expectStructuredOneShotProjectText(structured.projectState?.currentPhase)
    expect(String(structured.projectState?.latestLandedProgress ?? '')).toMatch(/continuity_progress|same session|same-session|continuation|measured-return/i)
    expect(String(structured.projectState?.primaryOpenLoop ?? '')).toContain('memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(String(structured.projectState?.nextClosureTarget ?? '')).toMatch(/cross_modal_continuity_proof|visible reply|voice|face|motion|resident presence/i)
    expectStructuredOneShotAwarenessLine(structured.projectState?.preDialogueAwarenessLine)
    expect(String(structured.projectState?.sameHerDriftRisk ?? '')).toContain('closure_status=unfinished')
    expectNoOneShotFixedTemplateResidue(structured.projectState?.latestLandedProgress)
    expectNoOneShotFixedTemplateResidue(structured.projectState?.nextClosureTarget)
    expectNoOneShotFixedTemplateResidue(structured.projectState?.sameHerDriftRisk)
    expect(structured.preDialogueAwareness).toEqual(expect.objectContaining({
      companionHeadlineLine: expect.any(String),
      companionBriefingLine: expect.stringContaining('local_desktop_life_loop'),
      awarenessLine: expect.any(String),
    }))
    expect(structured.preDialogueClosure).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: expect.stringContaining('open='),
      companionHeadlineLine: expect.any(String),
      companionBriefingLine: expect.stringContaining('local_desktop_life_loop'),
    }))
  })

  it('turns direct project-state one-shot turns into an explicit pre-answer contract for identity, landed progress, open closure, and same-her continuity', async () => {
    const {
      runtime,
      resolveMainGatewayConfig,
    } = createOneShotRuntimeHarness()

    resolveMainGatewayConfig.mockReturnValue(createResolvedMainGatewayConfig())

    const { generateText } = await import('@xsai/generate-text')
    const generateTextMock = vi.mocked(generateText)
    generateTextMock.mockReset()
    generateTextMock.mockResolvedValueOnce({
      text: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; focus=project-state; move=answer-from-same-her-project-continuity',
        emotion: 'thinking',
        reply: 'Alicization 还是本地优先数字生命项目，现在仍在 Phase 1；回答前要把已经落地的部分、未闭环的部分和同一个 her 的连续性一起带着说清楚。',
      }),
    } as any)

    const result = await runtime.generateMainGatewayText({
      system: 'project-state answer system prompt',
      user: '这个项目是做什么的，做到什么程度了，还缺少什么没有闭环完成？',
      source: 'scene-appraisal',
      cardId: 'card-project-state-contract',
      injectCustomDirectives: false,
      injectPerformanceManifest: false,
    })

    expect(result).toBeTruthy()
    expect(generateTextMock).toHaveBeenCalledOnce()

    const generationInput = generateTextMock.mock.calls[0]?.[0]
    const systemMessages = (generationInput?.messages ?? []).filter(message => message.role === 'system')
    const systemTexts = systemMessages
      .map(message => typeof message.content === 'string' ? message.content : '')
      .filter(Boolean)

    expect(systemTexts.some(text => text.includes('[ALICIZATION_PROJECT_STATE]'))).toBe(true)
    expect(systemTexts.some(text => text.includes('[ALICIZATION_PHASE1_CLOSURE_DASHBOARD]'))).toBe(true)
    expect(systemTexts.some(text => text.includes('[ALICIZATION_SCENE_APPRAISAL_SELF_BRIEF]'))).toBe(true)
    expect(systemTexts.some(text => text.includes('pre_dialogue_awareness='))).toBe(true)
    expect(systemTexts.some(text => text.includes('continuity_anchor='))).toBe(true)
    expect(systemTexts.some(text => text.includes('primary_open_loop='))).toBe(true)
    expect(systemTexts.some(text => text.includes('next_closure_target='))).toBe(true)
    expect(systemTexts.some(text => text.includes('identity=local_desktop_life_loop'))).toBe(true)
    expect(systemTexts.some(text => text.includes('[ALICIZATION_PROJECT_STATE_ANSWER_CONTRACT]'))).toBe(true)
    expect(systemTexts.some(text => text.includes('landed='))).toBe(true)
    expect(systemTexts.some(text => text.includes('open='))).toBe(true)
    expect(systemTexts.some(text => text.includes('continuity_anchor='))).toBe(true)
    expect(systemTexts.some(text => text.includes('same_her='))).toBe(false)
    expect(systemTexts.some(text => text.includes('Do not let scene appraisal collapse into generic productivity guessing, detached environment scoring, or assistant utility heuristics.'))).toBe(true)
    expect(systemTexts.some(text => text.includes('memory_dialogue_embodiment_closure=end_to_end_proof_incomplete'))).toBe(true)
    expect(systemTexts.some(text => text.includes('owner=project_state_governance'))).toBe(true)
    expectNoOneShotFixedTemplateResidue(systemTexts.join('\n'))
  })

  it('re-expands a thin runtime project-state shell into canonical same-her Phase 1 answer context before scene-appraisal generation starts', async () => {
    const {
      runtime,
      resolveMainGatewayConfig,
    } = createOneShotRuntimeHarness()

    resolveMainGatewayConfig.mockReturnValue(createResolvedMainGatewayConfig())

    const { generateText } = await import('@xsai/generate-text')
    const generateTextMock = vi.mocked(generateText)
    generateTextMock.mockReset()
    generateTextMock.mockResolvedValueOnce({
      text: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; focus=project-state; move=answer-from-same-her-project-continuity',
        emotion: 'thinking',
        reply: '继续沿着同一条数字生命闭环往前收束。',
      }),
    } as any)

    await runtime.generateMainGatewayText({
      system: 'project-state answer system prompt',
      user: '这个项目是什么，做到什么程度了，还有哪些地方没闭环？',
      source: 'scene-appraisal',
      cardId: 'card-scene-appraisal-thin-shell',
      injectCustomDirectives: false,
      injectPerformanceManifest: false,
      digitalLifeRuntimeSurface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {
          watchMode: 'symbiotic-vision',
          currentScene: null,
          attention: null,
          captureState: {
            permission: 'unknown',
            lastGroundedAt: null,
          },
          durabilityPulse: null,
          recentTransition: null,
          nextSuggestedProbeMs: 30_000,
          updatedAt: 10,
        },
        world: {
          worldModel: null,
          worldOntology: null,
          entityWorld: null,
          livingWorldState: null,
          relationshipModel: null,
        },
        cognition: {
          runtimeDigest: null,
        },
        memory: {
          workingMemoryEpisodes: [],
          goalStack: null,
          concerns: [],
          concernContinuity: null,
          selfContinuity: null,
          threadRuntime: null,
          commitmentLedger: null,
          inquiryPlanner: null,
          repairLedger: null,
          intentionStream: null,
          reflectionLedger: null,
          executiveCycle: null,
          thoughtThreads: null,
          desireMemory: null,
          recallGovernor: null,
        },
        dialogue: {
          discourseState: null,
          dialogueEncounter: null,
          mindSynthesis: null,
          conversationState: null,
          dialogueWorldThread: null,
          dialogueActKernel: null,
          answerCompiler: null,
          currentConsciousFrame: null,
          claimEvidenceLedger: null,
          replyDeliberation: null,
          answerPlanner: null,
        },
        agency: {
          selfState: null,
          selfGovernor: null,
          inquiryLoop: null,
          initiativeArbitration: null,
          initiative: null,
          autonomy: null,
        },
        raw: {
          runtimeDigest: {
            projectState: {
              identity: 'same digital life',
              currentPhase: 'Phase 1',
              latestLandedProgress: 'landed',
              primaryOpenLoop: 'open closure',
            },
          },
        },
      } as any,
    })

    expect(generateTextMock).toHaveBeenCalledOnce()

    const generationInput = generateTextMock.mock.calls[0]?.[0]
    const systemMessages = (generationInput?.messages ?? []).filter(message => message.role === 'system')
    const systemTexts = systemMessages
      .map(message => typeof message.content === 'string' ? message.content : '')
      .filter(Boolean)

    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const sceneAppraisalSelfBrief = systemTexts.find(text => text.includes('[ALICIZATION_SCENE_APPRAISAL_SELF_BRIEF]')) ?? ''
    const answerContract = systemTexts.find(text => text.includes('[ALICIZATION_PROJECT_STATE_ANSWER_CONTRACT]')) ?? ''
    const projectStateBlock = systemTexts.find(text => text.includes('[ALICIZATION_PROJECT_STATE]')) ?? ''

    expectStructuredOneShotProjectStateFields(projectStateBlock)
    expect(projectStateBlock).toContain('preflight_summary=local_desktop_life_loop')
    expect(projectStateBlock).not.toContain('same_her_self_line=')

    expect(sceneAppraisalSelfBrief).toContain('project_identity=local_desktop_life_loop')
    expect(sceneAppraisalSelfBrief).toContain('current_phase=phase=local_desktop_life_loop')
    expect(sceneAppraisalSelfBrief).toContain('pre_dialogue_awareness=')
    expect(sceneAppraisalSelfBrief).toContain('continuity_anchor=local_desktop_life_loop')
    expect(sceneAppraisalSelfBrief).toContain('continuity_hold=')
    expect(sceneAppraisalSelfBrief).toContain('primary_open_loop=memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(sceneAppraisalSelfBrief).toContain('next_closure_target=cross_modal_continuity_proof=')
    expect(sceneAppraisalSelfBrief).not.toContain('primary_open_loop=open closure')
    expect(sceneAppraisalSelfBrief).toContain('scene_appraisal_scope=desktop_scene_appraisal')
    expect(sceneAppraisalSelfBrief).not.toContain('Scene appraisal must stay inside the same digital life project line')

    expect(answerContract).toContain(`identity=${canonicalProjectState.identity}`)
    expect(answerContract).toContain(`current_phase=${canonicalProjectState.currentPhase}`)
    expect(answerContract).toContain('landed=')
    expect(answerContract).not.toContain('landed=landed')
    expect(answerContract).toContain('open=memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(answerContract).not.toContain('open=open closure')
    expect(answerContract).toContain('continuity_anchor=local_desktop_life_loop')
    expect(answerContract).not.toContain('same_her=')
    expect(answerContract).toContain('project_identity=answer_first')
    expect(answerContract).toContain('project_state_answer_source=structured_project_state_context')
    expectNoOneShotFixedTemplateResidue(projectStateBlock)
    expectNoOneShotFixedTemplateResidue(sceneAppraisalSelfBrief)
    expectNoOneShotFixedTemplateResidue(answerContract)
  })

  it('compacts oversized proactive one-shot prompts before provider generation while preserving project-state authority', async () => {
    const {
      runtime,
      resolveMainGatewayConfig,
      appendRuntimeDebugLine,
      appendAuditLog,
    } = createOneShotRuntimeHarness()

    resolveMainGatewayConfig.mockReturnValue(createResolvedMainGatewayConfig())

    const { generateText } = await import('@xsai/generate-text')
    const generateTextMock = vi.mocked(generateText)
    generateTextMock.mockReset()
    generateTextMock.mockResolvedValueOnce({
      text: JSON.stringify({
        thought: 'obligation=proactive; truth=project-state; focus=phase1-memory-loop; move=low-pressure-same-her-carry; tone=quiet',
        emotion: 'thinking',
        reply: '我先轻轻把这条记忆线接住。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: 'soft-focus',
          actionCue: 'small-pause',
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    } as any)

    const hugeMemoryBlock = [
      '[ALICIZATION_ORGANIC_MEMORY]',
      'memory_identity=fallback-memory-closure:phase1-real-runtime',
      'why_surfaced=Phase 1 memory closure should survive as same-her continuity.',
      'payload=',
      'phase1-memory-closure '.repeat(20_000),
    ].join('\n')
    const hugeRuntimeDigestBlock = [
      '[ALICIZATION_RUNTIME_DIGEST]',
      'digest_kind=proactive-reforge',
      'payload=',
      JSON.stringify({ repeated: 'same-her runtime surface '.repeat(20_000) }),
    ].join('\n')
    const hugeSystem = [
      '[SYSTEM OVERRIDE: 内部动机触发]',
      'Output must be valid JSON only with keys: thought, emotion, reply, performance.',
      'policy_payload=',
      'proactive policy context '.repeat(20_000),
    ].join('\n')

    await runtime.generateMainGatewayText({
      system: hugeSystem,
      user: 'Generate one proactive utterance now.',
      source: 'proactive',
      cardId: 'card-proactive-prompt-budget',
      injectCustomDirectives: false,
      injectPerformanceManifest: false,
      extraSystemBlocks: [
        hugeMemoryBlock,
        hugeRuntimeDigestBlock,
      ],
    })

    expect(generateTextMock).toHaveBeenCalledOnce()
    const generationInput = generateTextMock.mock.calls[0]?.[0]
    const messages = generationInput?.messages ?? []
    const messageChars = messages.reduce((total: number, message: any) => {
      return total + (typeof message.content === 'string' ? message.content.length : JSON.stringify(message.content ?? '').length)
    }, 0)
    const systemText = messages
      .filter((message: any) => message.role === 'system')
      .map((message: any) => typeof message.content === 'string' ? message.content : '')
      .join('\n')

    expect(messageChars).toBeLessThanOrEqual(48_000)
    expect(systemText).toContain('[ALICIZATION_PROJECT_STATE]')
    expect(systemText).toContain('[ALICIZATION_PHASE1_CLOSURE_DASHBOARD]')
    expect(systemText).toContain('identity=local_desktop_life_loop')
    expect(systemText).toContain('Output must be valid JSON only with keys: thought, emotion, reply, performance.')
    expect(systemText).toContain('memory_identity=fallback-memory-closure:phase1-real-runtime')
    expect(systemText).toContain('[truncated:')
    expect(appendRuntimeDebugLine).toHaveBeenCalledWith(
      'main-gateway.one-shot-prompt-compacted',
      expect.objectContaining({
        cardId: 'card-proactive-prompt-budget',
        source: 'proactive',
        beforeChars: expect.any(Number),
        afterChars: expect.any(Number),
      }),
    )
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      level: 'notice',
      category: 'alicization.main-gateway',
      action: 'one-shot-prompt-compacted',
      payload: expect.objectContaining({
        cardId: 'card-proactive-prompt-budget',
        source: 'proactive',
        beforeChars: expect.any(Number),
        afterChars: expect.any(Number),
      }),
    }), 'card-proactive-prompt-budget')
  })

  it('keeps proactive life-loop authority blocks visible when prompt compaction is required', async () => {
    const {
      runtime,
      resolveMainGatewayConfig,
      openAgentTurn,
    } = createOneShotRuntimeHarness({
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '你是严厉但克制的监督者，避免无效安慰，优先指出关键问题。',
        source: 'card-soul' as const,
      })),
      buildAgentTurnContinuitySystemMessages: vi.fn(() => [
        {
          role: 'system',
          content: [
            '[ALICIZATION_AGENT_SESSION]',
            'agent_session_id=agent-session-proactive-budget',
            'continuity=keep this proactive one-shot on the same living line',
          ].join('\n'),
        } as any,
      ]),
    })

    resolveMainGatewayConfig.mockReturnValue(createResolvedMainGatewayConfig())
    openAgentTurn.mockResolvedValueOnce({
      conversationSessionId: 'session-proactive-budget',
      ingestDigitalLifeSpine: vi.fn(),
      ingestDigitalLifeArchitecture: vi.fn(),
      ingestContinuitySignals: vi.fn(),
      ingestRuntimeActions: vi.fn(),
      trackTool: vi.fn(async ({ run }) => await run()),
      getSensorySnapshot: vi.fn(),
      settle: vi.fn(),
    } as any)

    const { generateText } = await import('@xsai/generate-text')
    const generateTextMock = vi.mocked(generateText)
    generateTextMock.mockReset()
    generateTextMock.mockResolvedValueOnce({
      text: JSON.stringify({
        thought: 'proactive continuity still sees learning, recall, directives, and same-her authority',
        emotion: 'thinking',
        reply: '我先把这条线接稳。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: 'soft-focus',
          actionCue: 'small-pause',
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    } as any)

    await runtime.generateMainGatewayText({
      system: [
        '[SYSTEM OVERRIDE: 内部动机触发]',
        'Long-horizon learning JSON: {"nextLearningAction":"verify","activeLearningFocuses":["world-model"]}',
        'Output must be valid JSON only with keys: thought, emotion, reply, performance.',
        'policy_payload=',
        'proactive policy context '.repeat(20_000),
      ].join('\n'),
      user: 'Generate one proactive utterance now.',
      source: 'proactive',
      cardId: 'card-proactive-life-loop-budget',
      agentTurnInput: {
        turnId: 'agent-session-proactive-budget',
        decisionTraceId: 'trace-proactive-budget',
      },
      captureAgentSensorySnapshot: false,
      extraSystemBlocks: [
        [
          '[ALICIZATION_PROACTIVE_SELF_BRIEF]',
          'same_her_line=Same Phase 1 digital life.',
          'Proactive initiative must stay inside the same digital life project line.',
        ].join('\n'),
        [
          '[ALICIZATION_ASSOCIATIVE_RECALL]',
          'These recalled fragments are secondary to the present scene and must never override fresh grounding.',
          '[触景生情：你隐约回想起了过去的某件事 -> {"text":"main.ts 那里漏了判空。"}]',
        ].join('\n'),
        [
          '[ALICIZATION_RUNTIME_DIGEST]',
          'presence=resident-presence',
          JSON.stringify({ repeated: 'same-her runtime surface '.repeat(20_000) }),
        ].join('\n'),
      ],
    })

    expect(generateTextMock).toHaveBeenCalledOnce()
    const messages = generateTextMock.mock.calls[0]?.[0]?.messages ?? []
    const systemText = messages
      .filter((message: any) => message.role === 'system')
      .map((message: any) => typeof message.content === 'string' ? message.content : '')
      .join('\n')

    expect(systemText).toContain('[ALICIZATION_PROJECT_STATE]')
    expect(systemText).toContain('[ALICIZATION_PHASE1_CLOSURE_DASHBOARD]')
    expect(systemText).toContain('[ALICIZATION_CARD_CUSTOM_DIRECTIVES]')
    expect(systemText).toContain('严厉但克制的监督者')
    expect(systemText).toContain('[ALICIZATION_AGENT_SESSION]')
    expect(systemText).toContain('agent-session-proactive-budget')
    expect(systemText).toContain('[ALICIZATION_PROACTIVE_SELF_BRIEF]')
    expect(systemText).not.toContain('same_her_line=Same Phase 1 digital life.')
    expect(systemText).not.toContain('Proactive initiative must stay inside the same digital life project line')
    expect(systemText).toContain(alicizationFixedTemplateReplacement)
    expect(systemText).toContain('[ALICIZATION_ASSOCIATIVE_RECALL]')
    expect(systemText).toContain('main.ts')
    expect(systemText).toContain('Long-horizon learning')
    expect(systemText).toContain('verify')
    expect(systemText).toContain('world-model')
    expect(systemText).toContain('Output must be valid JSON only with keys: thought, emotion, reply, performance.')
  })
})
