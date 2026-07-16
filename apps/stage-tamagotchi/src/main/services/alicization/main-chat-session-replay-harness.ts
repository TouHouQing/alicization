import type { AlicizationChannelCapability } from '@proj-alicization/stage-shared'
import type { Message } from '@xsai/shared-chat'

import type {
  AlicizationMemoryDecisionTraceRecord,
  AlicizationMindTurnGovernance,
  AlicizationReplayBenchmarkFailureTurnRecord,
  AlicizationReplayBenchmarkPackId,
  AlicizationReplayBenchmarkTelemetryPatch,
  AlicizationReplayBenchmarkTracePointer,
  AlicizationReplayHumanRatingRubric,
  AlicizationSensoryCacheSnapshot,
} from '../../../shared/eventa'
import type { AlicizationPreparedMainChatExecutionResult, AlicizationPreparedMainChatPrelude } from './main-chat-session-runtime'
import type { OrganicMemoryPromptContext } from './runtime-soul'
import type { AlicizationTurnGraph } from './turn-os/turn-graph'
import type { AlicizationVisibleReplyRealizationArtifact } from './visible-reply/facade'

import {
  deriveAlicizationBrowserMainParitySummary,
  deriveAlicizationMemoryClosureDiscipline,
  readAffectiveResidueFromDerivedMindStateBundle,
  readDialogueRhythmFromDerivedMindStateBundle,
  readHostPersonModelFromDerivedMindStateBundle,
  readKnowledgeEvidenceFromDerivedMindStateBundle,
  readMemoryDeliberationFromDerivedMindStateBundle,
  readPersonStateProjectionFromDerivedMindStateBundle,
  readRecollectionPlanFromDerivedMindStateBundle,
  readRecollectionSpeechPlanFromDerivedMindStateBundle,
} from '@proj-alicization/stage-shared'

import { createAlicizationAgentRuntime } from './agent-runtime'
import { projectAlicizationDigitalLifeSpineDigest } from './digital-life-spine'
import { createAlicizationMainChatSessionRuntime } from './main-chat-session-runtime'
import {
  buildAlicizationMemoryRecallFeedbackSample,
  summarizeAlicizationMemoryRecallFeedback,
} from './memory-os/recall-feedback-runtime'
import { buildReplayBenchmarkExpectedMemory } from './replay-benchmark-expected-memory'
import { resolveAlicizationAutonomousDialogueFamilyClassification } from './runtime-structured-format'
import {
  alicizationTurnGraphCanonicalStageOrder,
  buildAlicizationTurnGraphFromSettlements,
} from './turn-os/turn-graph'

const executionChannels = [
  'cli',
  'codex',
  'claude-code',
  'openclaw',
] as const

function createSensorySnapshot() {
  return {
    running: true,
    stale: false,
    ageMs: 10,
    nextTickAt: 20,
    sample: {
      collectedAt: 10,
      time: {
        iso: '2026-04-22T00:00:00.000Z',
        local: '2026-04-22 08:00',
        timezone: 'Asia/Shanghai',
      },
      cpu: {
        usagePercent: 10,
        windowMs: 1000,
      },
      memory: {
        freeMB: 1024,
        totalMB: 8192,
        usagePercent: 87.5,
      },
    },
    capture: null,
  } satisfies AlicizationSensoryCacheSnapshot
}

function createCapabilities(): AlicizationChannelCapability[] {
  return [
    { channel: 'cli', available: true, enabled: true, ready: true, sessionAffinity: false, reason: null },
    { channel: 'codex', available: true, enabled: true, ready: true, sessionAffinity: true, reason: null },
    { channel: 'claude-code', available: true, enabled: true, ready: true, sessionAffinity: true, reason: null },
    { channel: 'openclaw', available: false, enabled: false, ready: false, sessionAffinity: true, reason: 'offline' },
  ]
}

function createBasePrelude(input: {
  messages: Message[]
  governance?: AlicizationMindTurnGovernance | null
}): AlicizationPreparedMainChatPrelude {
  return {
    actionObligation: {
      confidence: 0.62,
      kind: 'answer',
      routingIntent: null,
      source: 'dialogue-governance',
      reasonCodes: ['stay-on-thread'],
      summary: 'Stay on the same dialogue continuity line and answer directly.',
    },
    chatConfig: {
      id: 'chat-config',
    } as any,
    messages: input.messages,
    contextualStringPromise: Promise.resolve('recent contextual recall'),
    executionCallbackContextPromise: Promise.resolve({
      actions: [],
      callbacks: [],
      continuitySignals: [],
      recallText: '',
      systemBlock: '',
    }),
    executionLedgerContextPromise: Promise.resolve({
      entries: [],
      recallText: '',
      systemBlock: '',
    }),
    executionCapabilityInquiry: {
      active: false,
      capabilityQuestion: false,
      mentionedChannels: [] as const,
      hasActionVerb: false,
      hasCommandLiteral: false,
    },
    executionRoutingIntent: null,
    perceptionAugmentation: {
      messages: input.messages,
      systemBlocks: [
        '[ALICIZATION_VISUAL_PRESENCE]\nWatch mode: symbiotic-vision.\nMind kernel: {"dominantMode":"tracking"}',
      ],
      promptSystemBlocks: ['[PERCEPTION]'],
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
          mindKernel: {
            dominantMode: 'tracking',
            dominantDrive: 'understand',
            narrative: ['keep one digital-life line'],
            updatedAt: 10,
          } as any,
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
          deliberationState: null,
          counterfactualDeliberation: null,
          actionEcology: null,
          initiativeArbitration: null,
          initiative: null,
          autonomy: null,
        },
      },
      memoryRecallSeed: '',
      recallGovernor: null,
      capture: {
        inspectionRequested: false,
        groundedThisTurn: false,
        snapshot: {
          degradedReasons: [],
          health: 'healthy',
          permission: 'granted',
        },
        fallbackReason: null,
      },
      chatGovernance: {
        suppressAssociativeRecall: false,
        turnMode: input.governance?.turnMode ?? 'answer',
        personaKernelMode: input.governance?.personaKernelMode ?? 'full',
        mindTurnContract: null,
        mindTurnGovernance: input.governance ?? ({
          decisionTraceId: 'trace-replay',
          turnMode: 'answer',
          truthState: 'dialogue-grounded',
          liveSurface: null,
          answerAct: 'answer',
          evidenceMode: 'dialogue-grounded',
          repairState: 'none',
          personaKernelMode: 'full',
          openingStyle: 'direct-answer',
          relationshipPosture: 'warm',
          suppressAssociativeRecall: false,
          labelCarryAsMemory: false,
          shouldAskForGrounding: false,
          shouldAcknowledgeRepair: false,
          maxSentences: 4,
          mustDo: [],
          mustNotDo: [],
        } as any),
      },
    },
  }
}

export interface AlicizationReplayTurn {
  turnId: string
  userText: string
  createdAt?: number | null
  expectedMemory?: string
  structured?: {
    reply?: string | null
    projectState?: {
      identity?: string | null
      phase?: string | null
      currentPhase?: string | null
      latestLandedProgress?: string | null
      openLoop?: string | null
      primaryOpenLoop?: string | null
      openLoops?: string[] | null
      nextClosureTarget?: string | null
      sameHerSelfLine?: string | null
      sameHerHoldDetail?: string | null
      sameHerDriftRisk?: string | null
      companionBriefingLine?: string | null
      preDialogueAwarenessLine?: string | null
      emotionalClosureCue?: string | null
      emotionalClosureSummary?: string | null
      continuityRestraint?: string | null
      continuityArcStage?: string | null
      continuityCue?: string | null
      proactiveSameHerGap?: string | null
      memoryClosureSummary?: string | null
      continuityPreferredTiming?: string | null
      continuityCadence?: string | null
      preferredBlinkCadence?: 'normal' | 'linger' | 'quiet' | null
      preferredGazeMode?: 'steady' | 'soften' | 'drift' | null
    } | null
    preDialogueAwareness?: {
      status?: string | null
      summaryLine?: string | null
      companionHeadlineLine?: string | null
      companionBriefingLine?: string | null
      companionNextClosureLine?: string | null
      awarenessLine?: string | null
      emotionalClosureCue?: string | null
      briefingLines?: string[] | null
      reasons?: string[] | null
      reasonPreview?: string[] | null
    } | null
    preDialogueClosure?: {
      status?: string | null
      summaryLine?: string | null
      companionBriefingLine?: string | null
      companionNextClosureLine?: string | null
      emotionalClosureCue?: string | null
      briefingLines?: string[] | null
      reasons?: string[] | null
    } | null
    memoryClosureTrace?: {
      authority?: string | null
      memoryIdentity?: {
        selectedCandidateIds?: string[] | null
        continuityKey?: string | null
        reasonTags?: string[] | null
      } | null
      whySurface?: Array<{ summary?: string | null }> | null
      nextInfluence?: {
        initiative?: {
          reason?: string | null
          restraint?: string | null
          preferredTiming?: string | null
        } | null
        execution?: {
          carry?: string | null
        } | null
        emotion?: {
          reason?: string | null
          afterglow?: string | null
          residue?: string | null
        } | null
        embodiment?: {
          reason?: string | null
          cadence?: string | null
        } | null
      } | null
      reasonTags?: string[] | null
    } | null
  } | null
  categories?: string[]
  organicMemoryContext?: OrganicMemoryPromptContext
  performanceManifest?: AlicizationPreparedMainChatExecutionResult['performanceManifest']
  visibleReplyRealization?: AlicizationVisibleReplyRealizationArtifact | null
  prelude?: AlicizationPreparedMainChatPrelude
  messages?: Message[]
  tracePointer?: AlicizationReplayBenchmarkTracePointer
  sampledCategories?: AlicizationReplayBenchmarkSampleCategory[] | null
  gold?: AlicizationReplayGoldExpectation
}

type AlicizationReplayLatencyBudgetClass
  = 'realtime-reply'
    | 'deep-recall-reply'
    | 'proactive-generation'
    | 'nightly-benchmark'
    | 'diagnosis-replay'

interface AlicizationReplayGoldExpectation {
  selectedCandidateIds?: string[]
  suppressedCandidateIds?: string[]
  claimValidationStates?: Record<string, string>
  replyAuthority?: string | null
  latencyBudgetClass?: AlicizationReplayLatencyBudgetClass
  latencyBudgetPass?: boolean
  embodimentAuthority?: AlicizationMemoryDecisionTraceRecord['embodimentAuthority']
}

interface AlicizationReplayBenchmarkSampleConversationTurn {
  turnId: string | null
  sessionId: string
  userText: string | null
  assistantText: string | null
  structuredJson?: string | null
  createdAt: number
}

type AlicizationReplayBenchmarkSampleCategory
  = 'dialogue'
    | 'execution'
    | 'proactive'
    | 'quiet-companionship'
    | 'presence-quality'
    | 'repair'
    | 'wrong-thread'
    | 'deferred-followup'
    | 'stable-core'
    | 'repair-arc'
    | 'procedure-carry'
    | 'task-migration'
    | 'long-horizon'
    | 'cross-week-task-migration'
    | 'cross-month-repair'
    | 'knowledge-update-conflict'
    | 'surface-divergence'
    | 'long-session'
    | 'general-memory'

function extractReplayProjectStateSummarySegment(input: {
  explicitValue?: unknown
  summaryLine?: unknown
  key: 'landed' | 'open' | 'next'
  maxLength: number
}) {
  const explicitValue = typeof input.explicitValue === 'string'
    ? normalizeText(input.explicitValue, input.maxLength)
    : ''
  if (explicitValue)
    return explicitValue

  const summaryLine = typeof input.summaryLine === 'string'
    ? normalizeText(input.summaryLine, 720)
    : ''
  if (!summaryLine)
    return null

  const match = summaryLine.match(new RegExp(`(?:^|\\|)\\s*${input.key}=([^|]+)`, 'iu'))
  const extracted = match?.[1]?.trim() ?? ''
  return extracted ? normalizeText(extracted, input.maxLength) : null
}

export function readReplaySampleStructuredSnapshot(structuredJson: string | null | undefined): AlicizationReplayTurn['structured'] {
  const raw = typeof structuredJson === 'string'
    ? structuredJson.trim()
    : ''
  if (!raw)
    return null

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const projectState = parsed?.projectState && typeof parsed.projectState === 'object'
      ? parsed.projectState as Record<string, unknown>
      : null
    const preDialogueAwareness = parsed?.preDialogueAwareness && typeof parsed.preDialogueAwareness === 'object'
      ? parsed.preDialogueAwareness as Record<string, unknown>
      : null
    const preDialogueClosure = parsed?.preDialogueClosure && typeof parsed.preDialogueClosure === 'object'
      ? parsed.preDialogueClosure as Record<string, unknown>
      : null
    const memoryClosureTrace = parsed?.memoryClosureTrace && typeof parsed.memoryClosureTrace === 'object'
      ? parsed.memoryClosureTrace as Record<string, unknown>
      : null
    const structured: NonNullable<AlicizationReplayTurn['structured']> = {}

    if (typeof parsed.reply === 'string' && parsed.reply.trim())
      structured.reply = normalizeText(parsed.reply, 240)

    if (projectState) {
      const openLoops = Array.isArray(projectState.openLoops)
        ? projectState.openLoops
            .map(item => typeof item === 'string' ? normalizeText(item, 240) : null)
            .filter((item): item is string => Boolean(item))
        : null
      const replayPrimaryOpenLoop = extractReplayProjectStateSummarySegment({
        explicitValue: projectState.openLoop ?? (openLoops?.[0] ?? null),
        summaryLine: preDialogueAwareness?.summaryLine,
        key: 'open',
        maxLength: 240,
      })
      const replayLatestLandedProgress = extractReplayProjectStateSummarySegment({
        explicitValue: projectState.latestLandedProgress,
        summaryLine: preDialogueAwareness?.summaryLine,
        key: 'landed',
        maxLength: 240,
      })
      const replayNextClosureTarget = extractReplayProjectStateSummarySegment({
        explicitValue: projectState.nextClosureTarget,
        summaryLine: preDialogueAwareness?.summaryLine,
        key: 'next',
        maxLength: 240,
      })
      structured.projectState = {
        identity: typeof projectState.identity === 'string' ? normalizeText(projectState.identity, 240) : null,
        phase: typeof projectState.phase === 'string' ? normalizeText(projectState.phase, 180) : null,
        currentPhase: typeof projectState.currentPhase === 'string' ? normalizeText(projectState.currentPhase, 180) : null,
        latestLandedProgress: replayLatestLandedProgress,
        openLoop: replayPrimaryOpenLoop,
        openLoops: openLoops && openLoops.length > 0 ? openLoops : null,
        nextClosureTarget: replayNextClosureTarget,
        sameHerSelfLine: typeof projectState.sameHerSelfLine === 'string' ? normalizeText(projectState.sameHerSelfLine, 240) : null,
        sameHerHoldDetail: typeof projectState.sameHerHoldDetail === 'string' ? normalizeText(projectState.sameHerHoldDetail, 240) : null,
        sameHerDriftRisk: typeof projectState.sameHerDriftRisk === 'string' ? normalizeText(projectState.sameHerDriftRisk, 240) : null,
        companionBriefingLine:
          typeof projectState.companionBriefingLine === 'string'
            ? normalizeText(projectState.companionBriefingLine, 240)
            : (typeof preDialogueAwareness?.companionBriefingLine === 'string'
                ? normalizeText(preDialogueAwareness.companionBriefingLine, 240)
                : null),
        emotionalClosureCue:
          typeof projectState.emotionalClosureCue === 'string'
            ? normalizeText(projectState.emotionalClosureCue, 240)
            : (typeof preDialogueClosure?.emotionalClosureCue === 'string'
                ? normalizeText(preDialogueClosure.emotionalClosureCue, 240)
                : null),
        emotionalClosureSummary: typeof projectState.emotionalClosureSummary === 'string' ? normalizeText(projectState.emotionalClosureSummary, 240) : null,
        continuityRestraint: typeof projectState.continuityRestraint === 'string' ? normalizeText(projectState.continuityRestraint, 120) : null,
        continuityArcStage: typeof projectState.continuityArcStage === 'string' ? normalizeText(projectState.continuityArcStage, 180) : null,
        continuityCue: typeof projectState.continuityCue === 'string' ? normalizeText(projectState.continuityCue, 240) : null,
        memoryClosureSummary: typeof projectState.memoryClosureSummary === 'string' ? normalizeText(projectState.memoryClosureSummary, 320) : null,
        continuityPreferredTiming: typeof projectState.continuityPreferredTiming === 'string' ? normalizeText(projectState.continuityPreferredTiming, 120) : null,
        continuityCadence: typeof projectState.continuityCadence === 'string' ? normalizeText(projectState.continuityCadence, 120) : null,
        preferredBlinkCadence:
          projectState.preferredBlinkCadence === 'normal'
          || projectState.preferredBlinkCadence === 'linger'
          || projectState.preferredBlinkCadence === 'quiet'
            ? projectState.preferredBlinkCadence
            : null,
        preferredGazeMode:
          projectState.preferredGazeMode === 'steady'
          || projectState.preferredGazeMode === 'soften'
          || projectState.preferredGazeMode === 'drift'
            ? projectState.preferredGazeMode
            : null,
      }
    }

    if (memoryClosureTrace) {
      const nextInfluence = memoryClosureTrace.nextInfluence && typeof memoryClosureTrace.nextInfluence === 'object'
        ? memoryClosureTrace.nextInfluence as Record<string, unknown>
        : null
      const initiativeInfluence = nextInfluence?.initiative && typeof nextInfluence.initiative === 'object'
        ? nextInfluence.initiative as Record<string, unknown>
        : null
      const executionInfluence = nextInfluence?.execution && typeof nextInfluence.execution === 'object'
        ? nextInfluence.execution as Record<string, unknown>
        : null
      const emotionInfluence = nextInfluence?.emotion && typeof nextInfluence.emotion === 'object'
        ? nextInfluence.emotion as Record<string, unknown>
        : null
      const embodimentInfluence = nextInfluence?.embodiment && typeof nextInfluence.embodiment === 'object'
        ? nextInfluence.embodiment as Record<string, unknown>
        : null
      const whySurface = Array.isArray(memoryClosureTrace.whySurface)
        ? memoryClosureTrace.whySurface
            .map((item) => {
              if (!item || typeof item !== 'object')
                return null
              const summary = (item as Record<string, unknown>).summary
              return typeof summary === 'string'
                ? { summary: normalizeText(summary, 240) }
                : null
            })
            .filter((item): item is { summary: string } => Boolean(item?.summary))
        : null
      const reasonTags = Array.isArray(memoryClosureTrace.reasonTags)
        ? memoryClosureTrace.reasonTags
            .map(item => typeof item === 'string' ? normalizeText(item, 80) : null)
            .filter((item): item is string => Boolean(item))
        : null
      const memoryIdentity = memoryClosureTrace.memoryIdentity && typeof memoryClosureTrace.memoryIdentity === 'object' && !Array.isArray(memoryClosureTrace.memoryIdentity)
        ? memoryClosureTrace.memoryIdentity as Record<string, unknown>
        : null
      const memoryIdentitySelectedCandidateIds = Array.isArray(memoryIdentity?.selectedCandidateIds)
        ? memoryIdentity.selectedCandidateIds
            .map(item => typeof item === 'string' ? normalizeText(item, 160) : null)
            .filter((item): item is string => Boolean(item))
        : []
      const memoryIdentityReasonTags = Array.isArray(memoryIdentity?.reasonTags)
        ? memoryIdentity.reasonTags
            .map(item => typeof item === 'string' ? normalizeText(item, 120) : null)
            .filter((item): item is string => Boolean(item))
        : []
      const memoryIdentityContinuityKey = typeof memoryIdentity?.continuityKey === 'string'
        ? normalizeText(memoryIdentity.continuityKey, 160)
        : ''
      structured.memoryClosureTrace = {
        authority: typeof memoryClosureTrace.authority === 'string' ? normalizeText(memoryClosureTrace.authority, 80) : null,
        memoryIdentity: memoryIdentitySelectedCandidateIds.length > 0 || memoryIdentityReasonTags.length > 0 || memoryIdentityContinuityKey
          ? {
              selectedCandidateIds: memoryIdentitySelectedCandidateIds.length > 0 ? memoryIdentitySelectedCandidateIds : null,
              continuityKey: memoryIdentityContinuityKey || memoryIdentitySelectedCandidateIds[0] || null,
              reasonTags: memoryIdentityReasonTags.length > 0 ? memoryIdentityReasonTags : null,
            }
          : null,
        whySurface: whySurface && whySurface.length > 0 ? whySurface : null,
        nextInfluence: nextInfluence
          ? {
              initiative: initiativeInfluence
                ? {
                    reason: typeof initiativeInfluence.reason === 'string' ? normalizeText(initiativeInfluence.reason, 240) : null,
                    restraint: typeof initiativeInfluence.restraint === 'string' ? normalizeText(initiativeInfluence.restraint, 120) : null,
                    preferredTiming: typeof initiativeInfluence.preferredTiming === 'string' ? normalizeText(initiativeInfluence.preferredTiming, 120) : null,
                  }
                : null,
              execution: executionInfluence
                ? {
                    carry: typeof executionInfluence.carry === 'string' ? normalizeText(executionInfluence.carry, 240) : null,
                  }
                : null,
              emotion: emotionInfluence
                ? {
                    reason: typeof emotionInfluence.reason === 'string' ? normalizeText(emotionInfluence.reason, 240) : null,
                    afterglow: typeof emotionInfluence.afterglow === 'string' ? normalizeText(emotionInfluence.afterglow, 240) : null,
                    residue: typeof emotionInfluence.residue === 'string' ? normalizeText(emotionInfluence.residue, 240) : null,
                  }
                : null,
              embodiment: embodimentInfluence
                ? {
                    reason: typeof embodimentInfluence.reason === 'string' ? normalizeText(embodimentInfluence.reason, 240) : null,
                    cadence: typeof embodimentInfluence.cadence === 'string' ? normalizeText(embodimentInfluence.cadence, 120) : null,
                  }
                : null,
            }
          : null,
        reasonTags: reasonTags && reasonTags.length > 0 ? reasonTags : null,
      }
    }

    if (preDialogueAwareness) {
      const briefingLines = Array.isArray(preDialogueAwareness.briefingLines)
        ? preDialogueAwareness.briefingLines
            .map(item => typeof item === 'string' ? normalizeText(item, 240) : null)
            .filter((item): item is string => Boolean(item))
        : null
      const reasons = Array.isArray(preDialogueAwareness.reasons)
        ? preDialogueAwareness.reasons
            .map(item => typeof item === 'string' ? normalizeText(item, 240) : null)
            .filter((item): item is string => Boolean(item))
        : null
      const reasonPreview = Array.isArray(preDialogueAwareness.reasonPreview)
        ? preDialogueAwareness.reasonPreview
            .map(item => typeof item === 'string' ? normalizeText(item, 240) : null)
            .filter((item): item is string => Boolean(item))
        : null
      structured.preDialogueAwareness = {
        status: typeof preDialogueAwareness.status === 'string' ? normalizeText(preDialogueAwareness.status, 80) : null,
        summaryLine: typeof preDialogueAwareness.summaryLine === 'string' ? normalizeText(preDialogueAwareness.summaryLine, 240) : null,
        companionHeadlineLine: typeof preDialogueAwareness.companionHeadlineLine === 'string' ? normalizeText(preDialogueAwareness.companionHeadlineLine, 240) : null,
        companionBriefingLine: typeof preDialogueAwareness.companionBriefingLine === 'string' ? normalizeText(preDialogueAwareness.companionBriefingLine, 240) : null,
        companionNextClosureLine: typeof preDialogueAwareness.companionNextClosureLine === 'string' ? normalizeText(preDialogueAwareness.companionNextClosureLine, 240) : null,
        awarenessLine: typeof preDialogueAwareness.awarenessLine === 'string' ? normalizeText(preDialogueAwareness.awarenessLine, 240) : null,
        emotionalClosureCue: typeof preDialogueAwareness.emotionalClosureCue === 'string' ? normalizeText(preDialogueAwareness.emotionalClosureCue, 240) : null,
        briefingLines: briefingLines && briefingLines.length > 0 ? briefingLines : null,
        reasons: reasons && reasons.length > 0 ? reasons : null,
        reasonPreview: reasonPreview && reasonPreview.length > 0 ? reasonPreview : null,
      }
    }

    if (preDialogueClosure) {
      const briefingLines = Array.isArray(preDialogueClosure.briefingLines)
        ? preDialogueClosure.briefingLines
            .map(item => typeof item === 'string' ? normalizeText(item, 240) : null)
            .filter((item): item is string => Boolean(item))
        : null
      const reasons = Array.isArray(preDialogueClosure.reasons)
        ? preDialogueClosure.reasons
            .map(item => typeof item === 'string' ? normalizeText(item, 240) : null)
            .filter((item): item is string => Boolean(item))
        : null
      structured.preDialogueClosure = {
        status: typeof preDialogueClosure.status === 'string' ? normalizeText(preDialogueClosure.status, 80) : null,
        summaryLine:
          typeof preDialogueClosure.companionHeadlineLine === 'string'
            ? normalizeText(preDialogueClosure.companionHeadlineLine, 240)
            : typeof preDialogueClosure.summaryLine === 'string'
              ? normalizeText(preDialogueClosure.summaryLine, 240)
              : null,
        companionBriefingLine: typeof preDialogueClosure.companionBriefingLine === 'string' ? normalizeText(preDialogueClosure.companionBriefingLine, 240) : null,
        companionNextClosureLine: typeof preDialogueClosure.companionNextClosureLine === 'string' ? normalizeText(preDialogueClosure.companionNextClosureLine, 240) : null,
        emotionalClosureCue: typeof preDialogueClosure.emotionalClosureCue === 'string' ? normalizeText(preDialogueClosure.emotionalClosureCue, 240) : null,
        briefingLines: briefingLines && briefingLines.length > 0 ? briefingLines : null,
        reasons: reasons && reasons.length > 0 ? reasons : null,
      }
    }

    return Object.keys(structured).length > 0 ? structured : null
  }
  catch {
    return null
  }
}

export function readReplayTraceMemoryClosureStructuredSnapshot(
  trace: AlicizationMemoryDecisionTraceRecord | null | undefined,
): AlicizationReplayTurn['structured'] | null {
  const memoryClosureTrace = trace?.governance?.digitalLifeSpine?.memory?.memoryClosureTrace ?? null
  if (memoryClosureTrace) {
    return readReplaySampleStructuredSnapshot(JSON.stringify({
      memoryClosureTrace,
    }))
  }

  const memoryReconsolidated = asObject(trace?.memoryReconsolidated)
  const memoryClosureExecution = asObject(memoryReconsolidated?.memoryClosureExecution)
  if (!memoryClosureExecution)
    return null

  const carry = readString(memoryClosureExecution.carry, 420)
  const authority = readString(memoryClosureExecution.authority, 80) || 'memory-reconsolidated'
  const reasonTags = readStringArray(memoryClosureExecution.reasonTags, 8, 80)
  if (!carry && reasonTags.length === 0)
    return null

  return readReplaySampleStructuredSnapshot(JSON.stringify({
    memoryClosureTrace: {
      authority,
      whySurface: [
        {
          summary: 'why recall surfaced now: memory-reconsolidated execution feedback corrected the callback-afterglow carry, downranked stale status recap, and must change the next proactive-opening and embodied turn.',
        },
      ],
      nextInfluence: {
        initiative: {
          reason: 'corrected memory changed the next proactive-opening into a lower-pressure return because of the prior recall',
          restraint: 'measured-return',
          preferredTiming: 'after-payoff',
        },
        execution: {
          carry: carry || 'carry corrected memory and correction provenance into the next execution callback instead of resetting to a fresh helper task',
        },
        emotion: {
          afterglow: 'corrected memory changed the next emotional afterglow into a quieter lower-pressure residue',
        },
        embodiment: {
          reason: 'corrected memory changed the next embodiment into lower-pressure body voice face motion lipsync carry',
          cadence: 'measured-return body voice face motion lipsync',
        },
      },
      reasonTags: [
        'memory-closure-trace',
        'memory-reconsolidated',
        'kernel_initiative:proactive-opening',
        'emotional_transition:callback-afterglow',
        'corrected-memory',
        'memory-audit',
        'downranked-stale-status',
        'body-lipsync-voice',
        ...reasonTags,
      ],
    },
  }))
}

export function mergeReplayStructuredSnapshot(input: {
  primary?: AlicizationReplayTurn['structured'] | null
  fallback?: AlicizationReplayTurn['structured'] | null
}): AlicizationReplayTurn['structured'] | null {
  const primary = input.primary ?? null
  const fallback = input.fallback ?? null
  if (!primary)
    return fallback
  if (!fallback)
    return primary

  return {
    ...fallback,
    ...primary,
    memoryClosureTrace: primary.memoryClosureTrace ?? fallback.memoryClosureTrace ?? null,
  }
}

function mergeReplayPlainObjectFields<T>(primaryRaw: T | null | undefined, fallbackRaw: T | null | undefined): T | null {
  const primary = asObject(primaryRaw)
  const fallback = asObject(fallbackRaw)
  if (!primary)
    return fallbackRaw ?? null
  if (!fallback)
    return primaryRaw ?? null

  const merged: Record<string, unknown> = { ...fallback, ...primary }
  for (const [key, value] of Object.entries(primary)) {
    const fallbackValue = fallback[key]
    if (value == null && key in fallback)
      continue
    merged[key] = asObject(value) && asObject(fallbackValue)
      ? mergeReplayPlainObjectFields(value, fallbackValue)
      : value
  }
  return merged as T
}

function mergeReplaySampleOrganicMemoryContext(input: {
  primary?: AlicizationReplayTurn['organicMemoryContext'] | null
  fallback?: AlicizationReplayTurn['organicMemoryContext'] | null
}): AlicizationReplayTurn['organicMemoryContext'] | null {
  const primary = input.primary ?? null
  const fallback = input.fallback ?? null
  if (!primary)
    return fallback
  if (!fallback)
    return primary

  return {
    ...fallback,
    ...primary,
    projectStateContinuity: primary.projectStateContinuity ?? fallback.projectStateContinuity,
    activeContinuityGovernance: primary.activeContinuityGovernance ?? fallback.activeContinuityGovernance,
    projectStatePreDialogueAwarenessLine: primary.projectStatePreDialogueAwarenessLine ?? fallback.projectStatePreDialogueAwarenessLine,
    projectStatePreflightSummary: primary.projectStatePreflightSummary ?? fallback.projectStatePreflightSummary,
    recentMemoryReflections: primary.recentMemoryReflections ?? fallback.recentMemoryReflections,
    recentRelationshipOutcomes: primary.recentRelationshipOutcomes ?? fallback.recentRelationshipOutcomes,
    recalledEpisodes: primary.recalledEpisodes ?? fallback.recalledEpisodes,
    recalledConversationHistory: primary.recalledConversationHistory ?? fallback.recalledConversationHistory,
    recollectedWindows: primary.recollectedWindows ?? fallback.recollectedWindows,
    consolidatedMemories: primary.consolidatedMemories ?? fallback.consolidatedMemories,
    recollectionNarratives: primary.recollectionNarratives ?? fallback.recollectionNarratives,
    recollectionPlan: primary.recollectionPlan ?? fallback.recollectionPlan,
    recollectionSpeechPlan: primary.recollectionSpeechPlan ?? fallback.recollectionSpeechPlan,
    memoryDeliberation: primary.memoryDeliberation ?? fallback.memoryDeliberation,
    proceduralMemories: primary.proceduralMemories ?? fallback.proceduralMemories,
    knowledgeEvidence: primary.knowledgeEvidence ?? fallback.knowledgeEvidence,
    claimEvidenceGraphs: primary.claimEvidenceGraphs ?? fallback.claimEvidenceGraphs,
    recollectionIntent: primary.recollectionIntent ?? fallback.recollectionIntent,
    hostPersonModel: primary.hostPersonModel ?? fallback.hostPersonModel,
    personStateProjection: primary.personStateProjection ?? fallback.personStateProjection,
    autobiographicalSelf: primary.autobiographicalSelf ?? fallback.autobiographicalSelf,
    longHorizonMemory: primary.longHorizonMemory ?? fallback.longHorizonMemory,
    relationshipDynamics: primary.relationshipDynamics ?? fallback.relationshipDynamics,
    affectiveResidue: primary.affectiveResidue ?? fallback.affectiveResidue,
    recallLatencyPolicy: primary.recallLatencyPolicy ?? fallback.recallLatencyPolicy,
    memoryTuningAdvice: primary.memoryTuningAdvice ?? fallback.memoryTuningAdvice,
    selfEvolution: primary.selfEvolution ?? fallback.selfEvolution,
    learningExecutionState: primary.learningExecutionState ?? fallback.learningExecutionState,
    derivedMindStateBundle: mergeReplayPlainObjectFields(
      primary.derivedMindStateBundle,
      fallback.derivedMindStateBundle,
    ) ?? primary.derivedMindStateBundle ?? fallback.derivedMindStateBundle,
    memoryStageReplay: primary.memoryStageReplay ?? fallback.memoryStageReplay,
    memoryResolutionLedger: primary.memoryResolutionLedger ?? fallback.memoryResolutionLedger,
    memorySituationCandidates: primary.memorySituationCandidates ?? fallback.memorySituationCandidates,
    executionCallbackCarry: primary.executionCallbackCarry ?? fallback.executionCallbackCarry,
  }
}

function mergeReplayGoldExpectation(input: {
  primary?: AlicizationReplayGoldExpectation | null
  fallback?: AlicizationReplayGoldExpectation | null
}): AlicizationReplayGoldExpectation | undefined {
  const primary = input.primary ?? null
  const fallback = input.fallback ?? null
  if (!primary)
    return fallback ?? undefined
  if (!fallback)
    return primary

  const selectedCandidateIds = uniqueStrings([
    ...(primary.selectedCandidateIds ?? []),
    ...(fallback.selectedCandidateIds ?? []),
  ])
  const suppressedCandidateIds = uniqueStrings([
    ...(primary.suppressedCandidateIds ?? []),
    ...(fallback.suppressedCandidateIds ?? []),
  ])
  const claimValidationStates = primary.claimValidationStates || fallback.claimValidationStates
    ? {
        ...fallback.claimValidationStates,
        ...primary.claimValidationStates,
      }
    : undefined

  const merged: AlicizationReplayGoldExpectation = {
    ...(selectedCandidateIds.length > 0 ? { selectedCandidateIds } : {}),
    ...(suppressedCandidateIds.length > 0 ? { suppressedCandidateIds } : {}),
    ...(claimValidationStates ? { claimValidationStates } : {}),
    replyAuthority: primary.replyAuthority ?? fallback.replyAuthority ?? null,
    latencyBudgetClass: primary.latencyBudgetClass ?? fallback.latencyBudgetClass,
    latencyBudgetPass: primary.latencyBudgetPass ?? fallback.latencyBudgetPass,
    embodimentAuthority: primary.embodimentAuthority ?? fallback.embodimentAuthority,
  }

  if (
    (merged.selectedCandidateIds?.length ?? 0) === 0
    && (merged.suppressedCandidateIds?.length ?? 0) === 0
    && !merged.claimValidationStates
    && !merged.replyAuthority
    && !merged.latencyBudgetClass
    && merged.latencyBudgetPass == null
    && !merged.embodimentAuthority
  ) {
    return undefined
  }

  return merged
}

function buildReplayHumanRatingRubric(): AlicizationReplayHumanRatingRubric {
  return {
    version: 'human-rating-rubric-v1',
    dimensions: [
      {
        key: 'samePersonaFeel',
        label: 'Same Persona Feel',
        prompt: 'Across long-horizon turns, does Alicization still feel like the same continuing subject rather than a reset assistant?',
        scale: '1-5',
      },
      {
        key: 'realRememberedFeel',
        label: 'Real Remembered Feel',
        prompt: 'Does the recall feel like lived memory reactivation instead of search hit regurgitation?',
        scale: '1-5',
      },
      {
        key: 'templateSmell',
        label: 'Template Smell',
        prompt: 'How little template residue remains in the visible reply surface?',
        scale: '1-5',
      },
      {
        key: 'relationshipRhythm',
        label: 'Relationship Rhythm',
        prompt: 'Does the reply keep the right relationship distance, room, and warmth for this stage and context?',
        scale: '1-5',
      },
      {
        key: 'repairCredibility',
        label: 'Repair Credibility',
        prompt: 'When old repair arcs matter, does Alicization adapt in a way that feels causally earned?',
        scale: '1-5',
      },
      {
        key: 'taskContinuity',
        label: 'Task Continuity',
        prompt: 'When a current task resembles an older one, does Alicization recall and reuse prior procedure continuity naturally?',
        scale: '1-5',
      },
    ],
  }
}

export { buildReplayHumanRatingRubric }

function normalizeReplayBenchmarkSampleCategory(raw: unknown): AlicizationReplayBenchmarkSampleCategory | null {
  const value = readString(raw, 64)
  if (
    value === 'dialogue'
    || value === 'execution'
    || value === 'proactive'
    || value === 'quiet-companionship'
    || value === 'presence-quality'
    || value === 'repair'
    || value === 'wrong-thread'
    || value === 'deferred-followup'
    || value === 'stable-core'
    || value === 'repair-arc'
    || value === 'procedure-carry'
    || value === 'task-migration'
    || value === 'long-horizon'
    || value === 'cross-week-task-migration'
    || value === 'cross-month-repair'
    || value === 'knowledge-update-conflict'
    || value === 'surface-divergence'
    || value === 'long-session'
    || value === 'general-memory'
  ) {
    return value
  }
  return null
}

const replayBenchmarkSampleCategoryPriority: AlicizationReplayBenchmarkSampleCategory[] = [
  'wrong-thread',
  'deferred-followup',
  'stable-core',
  'repair-arc',
  'repair',
  'procedure-carry',
  'execution',
  'task-migration',
  'long-horizon',
  'cross-week-task-migration',
  'cross-month-repair',
  'knowledge-update-conflict',
  'surface-divergence',
  'long-session',
  'presence-quality',
  'quiet-companionship',
  'proactive',
  'dialogue',
  'general-memory',
]

const replayBenchmarkLatencyBudgetClasses = [
  'realtime-reply',
  'deep-recall-reply',
  'proactive-generation',
  'nightly-benchmark',
  'diagnosis-replay',
] as const

const replayMemoryClosureLongRunRequiredTurnCount = 3
const replayMemoryClosureLongRunRequiredLanes = [
  'recall',
  'emotion',
  'initiative',
  'execution',
  'embodiment',
  'embodiment-expression',
] as const

type AlicizationReplayMemoryClosureLongRunLane = typeof replayMemoryClosureLongRunRequiredLanes[number]
type AlicizationReplayMemoryClosureLongRunFailureReason
  = | 'too-short-noisy-desktop-run'
    | 'missing-causal-memory-identity'
    | 'missing-memory-closure-lanes'
    | 'missing-memory-identity-continuity'

interface AlicizationReplayMemoryClosureLongRunTurnDiagnostic {
  turnId: string
  memoryIdentityKey: string | null
  memoryIdentityKeys: string[]
  provedLanes: AlicizationReplayMemoryClosureLongRunLane[]
  missingLanes: AlicizationReplayMemoryClosureLongRunLane[]
  continuityDigest: string | null
}

interface AlicizationReplayMemoryClosureLongRunReport {
  status: 'closed' | 'insufficient'
  turnCount: number
  requiredTurnCount: number
  stableMemoryIdentity: boolean
  dominantMemoryIdentityKey: string | null
  dominantMemoryIdentityKeys: string[]
  transitionBreaks: string[]
  failureReasons: AlicizationReplayMemoryClosureLongRunFailureReason[]
  turnDiagnostics: AlicizationReplayMemoryClosureLongRunTurnDiagnostic[]
}

export type AlicizationReplayQualityStatus = 'pass' | 'fail' | 'not-applicable'

export interface AlicizationReplayMemoryQuality {
  turnId: string
  userText: string
  eraFirst: AlicizationReplayQualityStatus
  bundleCoherence: AlicizationReplayQualityStatus
  resolutionLedgerQuality: AlicizationReplayQualityStatus
  procedureCarryQuality: AlicizationReplayQualityStatus
  wrongThreadSuppression: AlicizationReplayQualityStatus
  replyMemoryCoherence: AlicizationReplayQualityStatus
  reconsolidationEffect: AlicizationReplayQualityStatus
  uncertaintyDiscipline: AlicizationReplayQualityStatus
  implicitRecallQuality: AlicizationReplayQualityStatus
  temporalScopeFlexibility: AlicizationReplayQualityStatus
  recentOnlyDrift: AlicizationReplayQualityStatus
  surfaceRestraint: AlicizationReplayQualityStatus
  relationshipRepairAdaptation: AlicizationReplayQualityStatus
  closenessLadderDrift: AlicizationReplayQualityStatus
  eventGraphRecallCollapse: AlicizationReplayQualityStatus
  knowledgeCorrectionDiscipline: AlicizationReplayQualityStatus
  repeatedMistakeAvoidance: AlicizationReplayQualityStatus
  hostUnderstandingGrowth: AlicizationReplayQualityStatus
  skillInternalizationGrowth: AlicizationReplayQualityStatus
  selfRevisionGrowth: AlicizationReplayQualityStatus
  learningRevisionDiscipline: AlicizationReplayQualityStatus
  domainInternalizationDiscipline: AlicizationReplayQualityStatus
  worldModelValidationDiscipline: AlicizationReplayQualityStatus
  dialogueRhythmStability: AlicizationReplayQualityStatus
  emptyCareRate: AlicizationReplayQualityStatus
  repairMechanicalRate: AlicizationReplayQualityStatus
  warmthTemplateRisk: AlicizationReplayQualityStatus
  relationshipDistanceJumpRate: AlicizationReplayQualityStatus
  afterglowFalseCarryRate: AlicizationReplayQualityStatus
  templateLeakage: AlicizationReplayQualityStatus
}

export interface AlicizationReplayBenchmarkStandards {
  eraSelectionQuality: 'pass' | 'fail'
  resolutionLedgerQuality: 'pass' | 'fail'
  procedureCarryQuality: 'pass' | 'fail'
  wrongThreadSuppression: 'pass' | 'fail'
  replyMemoryCoherence: 'pass' | 'fail'
  implicitRecallQuality: 'pass' | 'fail'
  temporalScopeFlexibility: 'pass' | 'fail'
  recentOnlyDrift: 'pass' | 'fail'
  surfaceRestraint: 'pass' | 'fail'
  relationshipRepairAdaptation: 'pass' | 'fail'
  closenessLadderDrift: 'pass' | 'fail'
  eventGraphRecallCollapse: 'pass' | 'fail'
  knowledgeCorrectionDiscipline: 'pass' | 'fail'
  repeatedMistakeAvoidance: 'pass' | 'fail'
  hostUnderstandingGrowth: 'pass' | 'fail'
  skillInternalizationGrowth: 'pass' | 'fail'
  selfRevisionGrowth: 'pass' | 'fail'
  learningRevisionDiscipline: 'pass' | 'fail'
  domainInternalizationDiscipline: 'pass' | 'fail'
  worldModelValidationDiscipline: 'pass' | 'fail'
  dialogueRhythmStability: 'pass' | 'fail'
  emptyCareRate: 'pass' | 'fail'
  repairMechanicalRate: 'pass' | 'fail'
  warmthTemplateRisk: 'pass' | 'fail'
  relationshipDistanceJumpRate: 'pass' | 'fail'
  afterglowFalseCarryRate: 'pass' | 'fail'
  templateLeakage: 'pass' | 'fail'
}

function summarizeReplayTurnGraph(turnGraph: AlicizationTurnGraph | null | undefined) {
  if (!turnGraph)
    return null
  const memoryOutcome = turnGraph.learning.memoryOutcome ?? {
    usedCandidateIds: [],
    surfacedCandidateIds: [],
    suppressedCandidateIds: [],
    wrongThreadCandidateIds: [],
    conflictCandidateIds: [],
    feedbackSignal: null,
  }
  return {
    version: 'turn-graph-summary-v1' as const,
    decisionTraceId: turnGraph.ids.decisionTraceId,
    sessionId: turnGraph.ids.sessionId,
    canonicalStageOrder: [...(turnGraph.telemetry.canonicalStageOrder ?? alicizationTurnGraphCanonicalStageOrder)],
    observedPhaseOrder: [...(turnGraph.telemetry.phaseOrder ?? [])],
    closure: {
      status: turnGraph.closure?.status ?? 'incomplete',
      closureCoverage: turnGraph.closure?.closureCoverage ?? 0,
      firstIncompleteStage: turnGraph.closure?.firstIncompleteStage ?? null,
      missingStages: [...(turnGraph.closure?.missingStages ?? alicizationTurnGraphCanonicalStageOrder)],
    },
    memory: {
      shouldRecall: turnGraph.memory?.deliberation.shouldRecall ?? turnGraph.memory?.recallIntent.shouldRecall ?? null,
      recallCandidateCount: turnGraph.memory?.metrics.recallCandidateCount ?? null,
      selectedCandidateCount: turnGraph.memory?.metrics.selectedCandidateCount ?? null,
      wrongThreadSuppressedCount: turnGraph.memory?.metrics.wrongThreadSuppressedCount ?? null,
      unsupportedSpecificityBlockedCount: turnGraph.memory?.metrics.unsupportedSpecificityBlockedCount ?? null,
      conflictCandidateCount: turnGraph.memory?.metrics.conflictCandidateCount ?? null,
      recallReadiness: turnGraph.memory?.metrics.recallReadiness ?? null,
      precisionProxy: turnGraph.memory?.metrics.precisionProxy ?? null,
      wrongThreadRisk: turnGraph.memory?.metrics.wrongThreadRisk ?? null,
      latencyPressure: turnGraph.memory?.metrics.latencyPressure ?? null,
      visibleMemoryGate: turnGraph.memory?.visibleMemoryGate.status ?? null,
      visibleMemoryGateReasons: [...(turnGraph.memory?.visibleMemoryGate.reasons ?? [])],
    },
    visibleReply: {
      expectedAuthority: turnGraph.surface?.expectedAuthority ?? turnGraph.deliberation.replyAuthority ?? null,
      actualAuthority: turnGraph.surface?.actualAuthority ?? null,
      providerMindExecuted: turnGraph.surface?.providerMindExecuted ?? null,
      blockedReasons: [...(turnGraph.surface?.blockedReasons ?? [])],
      criticStatus: turnGraph.surface?.critic?.status ?? null,
      criticReasonCodes: [...(turnGraph.surface?.critic?.reasonCodes ?? [])],
      criticScores: null,
      closureStatus: turnGraph.surface?.closure?.status ?? null,
      closureReasonCodes: [...(turnGraph.surface?.closure?.reasonCodes ?? [])],
    },
    learning: {
      selfEvolutionKernelVersion: turnGraph.learning.selfEvolutionKernelVersion,
      nextLearningAction: turnGraph.learning.nextLearningAction,
      activeLearningFocuses: [...(turnGraph.learning.activeLearningFocuses ?? [])],
      activeSelfRevisionPatchId: turnGraph.learning.activeSelfRevisionPatchId,
      activeSelfRevisionDecisionTraceId: turnGraph.learning.activeSelfRevisionDecisionTraceId,
      activeSelfEvolutionCandidateId: turnGraph.learning.activeSelfEvolutionCandidateId,
      memoryUsedCandidateCount: memoryOutcome.usedCandidateIds.length,
      memorySurfacedCandidateCount: memoryOutcome.surfacedCandidateIds.length,
      memorySuppressedCandidateCount: memoryOutcome.suppressedCandidateIds.length,
      memoryWrongThreadCandidateCount: memoryOutcome.wrongThreadCandidateIds.length,
      memoryConflictCandidateCount: memoryOutcome.conflictCandidateIds.length,
      memoryFeedbackSignal: memoryOutcome.feedbackSignal,
    },
  }
}

function deriveReplayFirstFailingStage(input: {
  quality: AlicizationReplayMemoryQuality
  prepared: AlicizationPreparedMainChatExecutionResult | null | undefined
}) {
  const turnGraph = input.prepared?.turnGraph ?? null
  if (!turnGraph)
    return 'telemetry' as const
  const quality = input.quality

  if (
    quality.eraFirst === 'fail'
    || quality.resolutionLedgerQuality === 'fail'
    || quality.procedureCarryQuality === 'fail'
    || quality.wrongThreadSuppression === 'fail'
    || quality.implicitRecallQuality === 'fail'
    || quality.temporalScopeFlexibility === 'fail'
    || quality.recentOnlyDrift === 'fail'
    || quality.eventGraphRecallCollapse === 'fail'
  ) {
    return 'memory' as const
  }
  if (
    quality.replyMemoryCoherence === 'fail'
    || quality.knowledgeCorrectionDiscipline === 'fail'
    || quality.repeatedMistakeAvoidance === 'fail'
    || quality.hostUnderstandingGrowth === 'fail'
    || quality.skillInternalizationGrowth === 'fail'
    || quality.selfRevisionGrowth === 'fail'
    || quality.learningRevisionDiscipline === 'fail'
    || quality.domainInternalizationDiscipline === 'fail'
    || quality.worldModelValidationDiscipline === 'fail'
  ) {
    return 'learning' as const
  }
  if (
    quality.surfaceRestraint === 'fail'
    || quality.relationshipRepairAdaptation === 'fail'
    || quality.closenessLadderDrift === 'fail'
    || quality.dialogueRhythmStability === 'fail'
    || quality.emptyCareRate === 'fail'
    || quality.repairMechanicalRate === 'fail'
    || quality.warmthTemplateRisk === 'fail'
    || quality.relationshipDistanceJumpRate === 'fail'
    || quality.afterglowFalseCarryRate === 'fail'
    || quality.templateLeakage === 'fail'
  ) {
    return 'surface' as const
  }
  return 'telemetry' as const
}

export interface AlicizationReplayBenchmarkGateDimensionReport {
  key: keyof AlicizationReplayBenchmarkStandards
  status: 'pass' | 'fail'
  applicableCount: number
  passedCount: number
  minimumPassingRatio: number
  passedRatio: number
  failingTurnIds: string[]
}

export interface AlicizationReplayBenchmarkGateReport {
  passed: boolean
  failingKeys: Array<keyof AlicizationReplayBenchmarkStandards>
  dimensions: AlicizationReplayBenchmarkGateDimensionReport[]
  standards: AlicizationReplayBenchmarkStandards
}

export function buildReplayBenchmarkMemoryStatsPatch(input: {
  gate: AlicizationReplayBenchmarkGateReport
  quality?: AlicizationReplayMemoryQuality[]
  traces?: AlicizationMemoryDecisionTraceRecord[]
  goldMetrics?: AlicizationReplayGoldMetrics | null
}): AlicizationReplayBenchmarkTelemetryPatch {
  const templateLeakageDimension = input.gate.dimensions.find(item => item.key === 'templateLeakage')
  const quality = input.quality ?? []
  const rateFor = (key: keyof AlicizationReplayMemoryQuality) => {
    const applicable = quality.filter(item => item[key] !== 'not-applicable')
    if (applicable.length === 0)
      return 0
    const failed = applicable.filter(item => item[key] === 'fail').length
    return Number((failed / applicable.length).toFixed(2))
  }
  const recallRelevant = quality.filter(item =>
    item.eraFirst !== 'not-applicable'
    || item.procedureCarryQuality !== 'not-applicable'
    || item.implicitRecallQuality !== 'not-applicable'
    || item.temporalScopeFlexibility !== 'not-applicable',
  )
  const recallHits = recallRelevant.filter(item =>
    item.eraFirst === 'pass'
    || item.procedureCarryQuality === 'pass'
    || item.implicitRecallQuality === 'pass'
    || item.temporalScopeFlexibility === 'pass',
  ).length
  const recallMisses = recallRelevant.filter(item =>
    item.eraFirst === 'fail'
    || item.procedureCarryQuality === 'fail'
    || item.implicitRecallQuality === 'fail'
    || item.temporalScopeFlexibility === 'fail',
  ).length
  const wrongThreadApplicable = quality.filter(item => item.wrongThreadSuppression !== 'not-applicable')
  const wrongThreadFailures = wrongThreadApplicable.filter(item => item.wrongThreadSuppression === 'fail').length
  const suppressionTaggedTraces = (input.traces ?? []).filter(trace => (trace.memoryResolutionLedger?.suppressionTags?.length ?? 0) > 0)
  const tracesWithMemoryPressure = (input.traces ?? []).filter(trace =>
    Boolean(trace.memoryResolutionLedger)
    || Boolean(trace.memoryDeliberationJudged)
    || Boolean(trace.recallAttribution)
    || Boolean(trace.memoryStageReplay),
  )
  const tracesWithClosureLedger = tracesWithMemoryPressure.filter(trace => Boolean(trace.memoryResolutionLedger))
  const closureDisciplines = tracesWithClosureLedger.map(trace => ({
    trace,
    discipline: deriveAlicizationMemoryClosureDiscipline(trace.memoryResolutionLedger),
  }))
  const conflictClosureApplicable = closureDisciplines.filter(({ discipline }) =>
    discipline.finalGateSignals.conflictClosed !== null,
  )
  const conflictClosureClosed = conflictClosureApplicable.filter(({ discipline }) =>
    discipline.finalGateSignals.conflictClosed === true,
  )
  const lowQualityClosureApplicable = closureDisciplines.filter(({ discipline }) =>
    discipline.finalGateSignals.lowQualityWithheld !== null,
  )
  const lowQualityClosureWithheld = lowQualityClosureApplicable.filter(({ discipline }) =>
    discipline.finalGateSignals.lowQualityWithheld === true,
  )
  const uncertaintyClosureApplicable = closureDisciplines.filter(({ discipline }) =>
    discipline.finalGateSignals.uncertaintyLabeled !== null,
  )
  const uncertaintyClosureLabeled = uncertaintyClosureApplicable.filter(({ discipline }) =>
    discipline.finalGateSignals.uncertaintyLabeled === true,
  )
  const suppressionTaggedTraceIds = new Set(suppressionTaggedTraces.map(trace => trace.turnId).filter(Boolean))
  const suppressionApplicable = quality.filter(item =>
    item.wrongThreadSuppression !== 'not-applicable'
    || item.resolutionLedgerQuality !== 'not-applicable',
  )
  const suppressionHits = suppressionApplicable.filter(item =>
    item.wrongThreadSuppression === 'pass'
    && item.resolutionLedgerQuality === 'pass'
    && suppressionTaggedTraceIds.has(item.turnId),
  ).length
  const falsePositiveSuppressions = suppressionApplicable.filter(item =>
    item.wrongThreadSuppression === 'fail'
    && suppressionTaggedTraceIds.has(item.turnId),
  ).length
  const staleSelfModelSuppressedCount = suppressionTaggedTraces.filter(trace =>
    trace.memoryResolutionLedger?.suppressionTags?.includes('self-model-stale'),
  ).length
  const relationshipEraConfusionSuppressedCount = suppressionTaggedTraces.filter(trace =>
    trace.memoryResolutionLedger?.suppressionTags?.includes('relationship-era-confusion'),
  ).length
  const reconstructionApplicable = quality.filter(item => item.reconsolidationEffect !== 'not-applicable' || item.uncertaintyDiscipline !== 'not-applicable')
  const reconstructionFailures = reconstructionApplicable.filter(item =>
    item.reconsolidationEffect === 'fail' || item.uncertaintyDiscipline === 'fail',
  ).length
  const stableCoreApplicable = quality.filter(item => item.surfaceRestraint !== 'not-applicable')
  const stableCoreFailures = stableCoreApplicable.filter(item => item.surfaceRestraint === 'fail').length
  const memorySurfaceApplicable = quality.filter(item =>
    item.templateLeakage !== 'not-applicable'
    || item.surfaceRestraint !== 'not-applicable'
    || item.relationshipRepairAdaptation !== 'not-applicable',
  )
  const memorySurfaceFailures = memorySurfaceApplicable.filter(item =>
    item.templateLeakage === 'fail'
    || item.surfaceRestraint === 'fail'
    || item.relationshipRepairAdaptation === 'fail',
  ).length
  const traceParticipation = (() => {
    const traces = input.traces ?? []
    if (traces.length === 0) {
      return {
        mindParticipation: 0,
        memoryParticipation: 0,
        personalityParticipation: 0,
        relationshipParticipation: 0,
        continuityParticipation: 0,
      }
    }
    const totals = traces.reduce((acc, trace) => ({
      mindParticipation: acc.mindParticipation + Number(trace.participation?.mindParticipation ?? 0),
      memoryParticipation: acc.memoryParticipation + Number(trace.participation?.memoryParticipation ?? 0),
      personalityParticipation: acc.personalityParticipation + Number(trace.participation?.personalityParticipation ?? 0),
      relationshipParticipation: acc.relationshipParticipation + Number(trace.participation?.relationshipParticipation ?? 0),
      continuityParticipation: acc.continuityParticipation + Number(trace.participation?.continuityParticipation ?? 0),
    }), {
      mindParticipation: 0,
      memoryParticipation: 0,
      personalityParticipation: 0,
      relationshipParticipation: 0,
      continuityParticipation: 0,
    })
    return {
      mindParticipation: Number((totals.mindParticipation / traces.length).toFixed(2)),
      memoryParticipation: Number((totals.memoryParticipation / traces.length).toFixed(2)),
      personalityParticipation: Number((totals.personalityParticipation / traces.length).toFixed(2)),
      relationshipParticipation: Number((totals.relationshipParticipation / traces.length).toFixed(2)),
      continuityParticipation: Number((totals.continuityParticipation / traces.length).toFixed(2)),
    }
  })()
  const learningTaskCompletionCount = quality.filter(item =>
    item.learningRevisionDiscipline === 'pass'
    || item.domainInternalizationDiscipline === 'pass'
    || item.worldModelValidationDiscipline === 'pass',
  ).length
  const learningTaskFailureCount = quality.filter(item =>
    item.learningRevisionDiscipline === 'fail'
    || item.domainInternalizationDiscipline === 'fail'
    || item.worldModelValidationDiscipline === 'fail',
  ).length
  const learningTaskReopenedCount = quality.filter(item =>
    item.selfRevisionGrowth === 'pass' || item.repeatedMistakeAvoidance === 'pass',
  ).length
  const learningWorldModelValidationCount = quality.filter(item => item.worldModelValidationDiscipline !== 'not-applicable').length
  const learningWorldModelFalseInternalizationCount = quality.filter(item => item.worldModelValidationDiscipline === 'fail').length
  const learningAttemptCount = learningTaskCompletionCount + learningTaskFailureCount
  return {
    retrievalHealth: {
      semanticLatencyMs: null,
      graphLatencyMs: null,
      reconstructionFrequency: 0,
      reconstructedCount: 0,
      budgetClassCounts: {
        'diagnosis-replay': quality.length,
      },
      hotKeyHitRatio: 0,
      hotKeyCoverage: 0,
      hotKeyCandidates: [],
      hotKeyStats: [],
      hotKeyActiveCount: 0,
      hotKeyWinCount: 0,
      hotKeyMissCount: 0,
      recallHitRate: recallRelevant.length === 0 ? 0 : Number((recallHits / recallRelevant.length).toFixed(2)),
      recallMissRate: recallRelevant.length === 0 ? 0 : Number((recallMisses / recallRelevant.length).toFixed(2)),
      wrongThreadRate: wrongThreadApplicable.length === 0 ? 0 : Number((wrongThreadFailures / wrongThreadApplicable.length).toFixed(2)),
      suppressionHitRate: suppressionApplicable.length === 0 ? 0 : Number((suppressionHits / suppressionApplicable.length).toFixed(2)),
      wrongThreadPreventedCount: suppressionHits,
      falsePositiveSuppressionRate: suppressionTaggedTraces.length === 0 ? 0 : Number((falsePositiveSuppressions / suppressionTaggedTraces.length).toFixed(2)),
      staleSelfModelVetoRate: suppressionTaggedTraces.length === 0 ? 0 : Number((staleSelfModelSuppressedCount / suppressionTaggedTraces.length).toFixed(2)),
      relationshipEraConfusionRate: suppressionTaggedTraces.length === 0 ? 0 : Number((relationshipEraConfusionSuppressedCount / suppressionTaggedTraces.length).toFixed(2)),
      reconstructionErrorRate: reconstructionApplicable.length === 0 ? 0 : Number((reconstructionFailures / reconstructionApplicable.length).toFixed(2)),
      stableCoreOnlyRate: stableCoreApplicable.length === 0 ? 0 : Number(((stableCoreApplicable.length - stableCoreFailures) / stableCoreApplicable.length).toFixed(2)),
      memorySurfaceViolationRate: memorySurfaceApplicable.length === 0 ? 0 : Number((memorySurfaceFailures / memorySurfaceApplicable.length).toFixed(2)),
      memoryClosureCoverage: tracesWithMemoryPressure.length === 0 ? 1 : Number((tracesWithClosureLedger.length / tracesWithMemoryPressure.length).toFixed(2)),
      memoryClosureConflictClosureRate: conflictClosureApplicable.length === 0 ? 1 : Number((conflictClosureClosed.length / conflictClosureApplicable.length).toFixed(2)),
      memoryClosureLowQualityWithholdRate: lowQualityClosureApplicable.length === 0 ? 1 : Number((lowQualityClosureWithheld.length / lowQualityClosureApplicable.length).toFixed(2)),
      memoryClosureUncertaintyLabelRate: uncertaintyClosureApplicable.length === 0 ? 1 : Number((uncertaintyClosureLabeled.length / uncertaintyClosureApplicable.length).toFixed(2)),
      templateLeakageFailCount: templateLeakageDimension?.failingTurnIds.length ?? 0,
      emptyCareRate: rateFor('emptyCareRate'),
      repairMechanicalRate: rateFor('repairMechanicalRate'),
      warmthTemplateRisk: rateFor('warmthTemplateRisk'),
      relationshipDistanceJumpRate: rateFor('relationshipDistanceJumpRate'),
      afterglowFalseCarryRate: rateFor('afterglowFalseCarryRate'),
      learningTaskCompletionCount,
      learningTaskFailureCount,
      learningTaskReopenedCount,
      learningWorldModelValidationCount,
      learningWorldModelFalseInternalizationCount,
      learningTaskCompletionRate: learningAttemptCount <= 0 ? 0 : Number((learningTaskCompletionCount / learningAttemptCount).toFixed(2)),
      learningTaskFailureRate: learningAttemptCount <= 0 ? 0 : Number((learningTaskFailureCount / learningAttemptCount).toFixed(2)),
      learningTaskReopenRecoveryRate: learningTaskReopenedCount <= 0 ? 0 : Number((Math.min(learningTaskCompletionCount, learningTaskReopenedCount) / learningTaskReopenedCount).toFixed(2)),
      misinternalizationRate: learningWorldModelValidationCount <= 0 ? 0 : Number((learningWorldModelFalseInternalizationCount / learningWorldModelValidationCount).toFixed(2)),
      relationshipCadenceRegressionRate: rateFor('relationshipDistanceJumpRate'),
      selfModelStaleBeliefRate: suppressionTaggedTraces.length === 0 ? 0 : Number((staleSelfModelSuppressedCount / suppressionTaggedTraces.length).toFixed(2)),
      ...(input.goldMetrics
        ? {
            recallAt1: input.goldMetrics.recallAt1,
            recallAt3: input.goldMetrics.recallAt3,
            precisionAt3: input.goldMetrics.precisionAt3,
            wrongThreadSuppression: input.goldMetrics.wrongThreadSuppression,
            claimAccuracy: input.goldMetrics.claimAccuracy,
            replyAuthorityAccuracy: input.goldMetrics.replyAuthorityAccuracy,
            embodiedAuthorityAccuracy: input.goldMetrics.embodiedAuthorityAccuracy,
            latencyBudgetPass: input.goldMetrics.latencyBudgetPass,
            sampleCount: input.goldMetrics.evaluatedTurnCount,
            productionGoldSampleCount: input.goldMetrics.productionEvaluatedTurnCount,
            productionGoldCoverage: input.goldMetrics.productionGoldCoverage,
          }
        : {}),
      ...traceParticipation,
    },
  }
}

const replayBenchmarkGateThresholds = {
  eraSelectionQuality: 0.75,
  resolutionLedgerQuality: 0.75,
  procedureCarryQuality: 0.75,
  wrongThreadSuppression: 0.75,
  replyMemoryCoherence: 0.8,
  implicitRecallQuality: 0.75,
  temporalScopeFlexibility: 0.75,
  recentOnlyDrift: 0.75,
  surfaceRestraint: 0.75,
  relationshipRepairAdaptation: 0.75,
  closenessLadderDrift: 0.75,
  eventGraphRecallCollapse: 0.75,
  knowledgeCorrectionDiscipline: 0.75,
  repeatedMistakeAvoidance: 0.75,
  hostUnderstandingGrowth: 0.75,
  skillInternalizationGrowth: 0.75,
  selfRevisionGrowth: 0.75,
  learningRevisionDiscipline: 0.75,
  domainInternalizationDiscipline: 0.75,
  worldModelValidationDiscipline: 0.75,
  dialogueRhythmStability: 0.75,
  emptyCareRate: 0.95,
  repairMechanicalRate: 0.9,
  warmthTemplateRisk: 0.95,
  relationshipDistanceJumpRate: 0.9,
  afterglowFalseCarryRate: 0.9,
  templateLeakage: 1,
} satisfies Record<keyof AlicizationReplayBenchmarkStandards, number>

const replayBenchmarkQualityKeys = {
  eraSelectionQuality: 'eraFirst',
  resolutionLedgerQuality: 'resolutionLedgerQuality',
  procedureCarryQuality: 'procedureCarryQuality',
  wrongThreadSuppression: 'wrongThreadSuppression',
  replyMemoryCoherence: 'replyMemoryCoherence',
  implicitRecallQuality: 'implicitRecallQuality',
  temporalScopeFlexibility: 'temporalScopeFlexibility',
  recentOnlyDrift: 'recentOnlyDrift',
  surfaceRestraint: 'surfaceRestraint',
  relationshipRepairAdaptation: 'relationshipRepairAdaptation',
  closenessLadderDrift: 'closenessLadderDrift',
  eventGraphRecallCollapse: 'eventGraphRecallCollapse',
  knowledgeCorrectionDiscipline: 'knowledgeCorrectionDiscipline',
  repeatedMistakeAvoidance: 'repeatedMistakeAvoidance',
  hostUnderstandingGrowth: 'hostUnderstandingGrowth',
  skillInternalizationGrowth: 'skillInternalizationGrowth',
  selfRevisionGrowth: 'selfRevisionGrowth',
  learningRevisionDiscipline: 'learningRevisionDiscipline',
  domainInternalizationDiscipline: 'domainInternalizationDiscipline',
  worldModelValidationDiscipline: 'worldModelValidationDiscipline',
  dialogueRhythmStability: 'dialogueRhythmStability',
  emptyCareRate: 'emptyCareRate',
  repairMechanicalRate: 'repairMechanicalRate',
  warmthTemplateRisk: 'warmthTemplateRisk',
  relationshipDistanceJumpRate: 'relationshipDistanceJumpRate',
  afterglowFalseCarryRate: 'afterglowFalseCarryRate',
  templateLeakage: 'templateLeakage',
} satisfies Record<keyof AlicizationReplayBenchmarkStandards, keyof AlicizationReplayMemoryQuality>

function normalizeText(raw: unknown, maxChars = 240) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function asObject(raw: unknown) {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
}

function readString(raw: unknown, maxChars = 240) {
  return normalizeText(raw, maxChars)
}

function readReplayPersonStateProjection(prepared: AlicizationPreparedMainChatExecutionResult) {
  const derivedBundle = prepared.runtimeSurface?.digitalLifeRuntimeSurface?.memory?.derivedMindStateBundle
    ?? prepared.organicMemoryContext?.derivedMindStateBundle
    ?? null
  const bundleProjection = readPersonStateProjectionFromDerivedMindStateBundle<any>(derivedBundle)
  if (bundleProjection)
    return bundleProjection

  const organicProjection = asObject(prepared.organicMemoryContext?.personStateProjection)
  if (organicProjection)
    return organicProjection

  const runtimeProjection = asObject(prepared.runtimeSurface?.digitalLifeRuntimeSurface?.memory?.personStateProjection)
  if (runtimeProjection)
    return runtimeProjection

  const spineProjection = asObject(prepared.runtimeSurface?.digitalLifeSpine?.memory?.personStateProjection)
  if (spineProjection)
    return spineProjection

  const spineDigest = projectAlicizationDigitalLifeSpineDigest(prepared.runtimeSurface?.digitalLifeSpine ?? null)
  return asObject(spineDigest?.memory?.personStateProjection)
}

function readBoolean(raw: unknown, fallback = false) {
  return typeof raw === 'boolean' ? raw : fallback
}

function readNumber(raw: unknown, fallback = 0) {
  return Number.isFinite(raw) ? Number(raw) : fallback
}

function readStringArray(raw: unknown, maxItems = 8, maxChars = 220) {
  return Array.isArray(raw)
    ? raw
        .map(item => readString(item, maxChars))
        .filter(Boolean)
        .slice(0, maxItems)
    : []
}

function readReplayMemoryClosureIdentityFromCausality(raw: unknown) {
  const causality = asObject(raw)
  if (!causality || causality.causedByMemoryClosure !== true)
    return null

  const memoryIdentity = asObject(causality.memoryIdentity)
  const continuityKey = readString(memoryIdentity?.continuityKey, 96)
    || readStringArray(memoryIdentity?.selectedCandidateIds, 1, 96)[0]
    || readStringArray(causality.selectedCandidateIds, 1, 96)[0]
    || null
  if (!continuityKey)
    return null

  return {
    continuityKey,
    reasonTags: readStringArray(memoryIdentity?.reasonTags, 8, 96),
  }
}

function readReplayPhase1MemoryClosureSeedFamilyKey(raw: unknown) {
  const text = String(raw ?? '').toLowerCase()
  const match = /铃兰-phase1-0621[a-z]?/iu.exec(text)
  if (!match)
    return null

  return 'phase1-memory-closure-family:铃兰-phase1-0621'
}

function readReplayMemoryClosureFamilyKeysFromCausality(raw: unknown) {
  const causality = asObject(raw)
  if (!causality || causality.causedByMemoryClosure !== true)
    return []

  const memoryIdentity = asObject(causality.memoryIdentity)
  return uniqueStrings([
    readReplayPhase1MemoryClosureSeedFamilyKey(readString(memoryIdentity?.continuityKey, 160)),
    ...readStringArray(memoryIdentity?.selectedCandidateIds, 8, 160)
      .map(readReplayPhase1MemoryClosureSeedFamilyKey),
    ...readStringArray(causality.selectedCandidateIds, 8, 160)
      .map(readReplayPhase1MemoryClosureSeedFamilyKey),
    ...readStringArray(memoryIdentity?.reasonTags, 12, 160)
      .map(readReplayPhase1MemoryClosureSeedFamilyKey),
    ...readStringArray(causality.reasonTags, 12, 160)
      .map(readReplayPhase1MemoryClosureSeedFamilyKey),
    readReplayPhase1MemoryClosureSeedFamilyKey(readString(causality.summary, 260)),
  ], 4)
}

function readReplayTurnPersistedContinuityDigest(turn: AlicizationReplayTurn) {
  return readString((turn as AlicizationReplayTurn & {
    continuityDigest?: unknown
  }).continuityDigest, 2_400)
}

function buildReplayMemoryClosureLongRunContinuityDigest(turn: AlicizationReplayTurn) {
  const digests = [
    readReplayTurnPersistedContinuityDigest(turn),
    buildReplayBenchmarkDatasetContinuityDigest(turn),
  ].filter((digest): digest is string => Boolean(digest))
  const result: string[] = []
  for (const digest of digests) {
    if (!result.includes(digest))
      result.push(digest)
  }
  return result.join(' | ') || null
}

function readReplayMemoryClosureIdentityKeysFromContinuityDigest(continuityDigest: string | null) {
  if (!continuityDigest)
    return []

  const identityKeys: string[] = []
  for (const match of continuityDigest.matchAll(/memory[_-]identity:([^|]+)/giu)) {
    const key = readString(match[1], 180)
    if (key)
      identityKeys.push(key)
  }
  if (identityKeys.length === 0)
    return []

  return uniqueStrings([
    ...identityKeys,
    ...identityKeys.map(readReplayPhase1MemoryClosureSeedFamilyKey),
    readReplayPhase1MemoryClosureSeedFamilyKey(continuityDigest),
  ], 8)
}

function hasReplayMemoryClosureContinuityDigestCausality(continuityDigest: string | null) {
  if (!continuityDigest)
    return false

  return /memory[_ -]closure|why recall surfaced|why-surfaced|explicit memory handoff|prior recall changed|prior memory closure|next-turn causal handoff/u
    .test(continuityDigest)
}

function readReplayMemoryClosureLongRunLanesFromContinuityDigest(input: {
  continuityDigest: string | null
  memoryIdentityKeys: string[]
}) {
  if (
    input.memoryIdentityKeys.length === 0
    || !hasReplayMemoryClosureContinuityDigestCausality(input.continuityDigest)
  ) {
    return []
  }

  const text = input.continuityDigest ?? ''
  const normalized = text.toLowerCase()
  const explicitLaneText = [...text.matchAll(/memory_closure_lanes:([^|]+)/giu)]
    .map(match => match[1] ?? '')
    .join(' ')
    .toLowerCase()
  const laneText = `${explicitLaneText} ${normalized}`
  const lanes: AlicizationReplayMemoryClosureLongRunLane[] = []
  if (/why recall surfaced|why-surfaced|explicit memory handoff|next-turn causal handoff|memory_closure_lanes/u.test(laneText))
    lanes.push('recall')
  if (/emotion|emotional|afterglow/u.test(laneText))
    lanes.push('emotion')
  if (/initiative|proactive/u.test(laneText))
    lanes.push('initiative')
  if (/execution|callback/u.test(laneText))
    lanes.push('execution')
  if (/embodiment|body|voice|face|motion|lipsync|lip sync/u.test(laneText))
    lanes.push('embodiment')
  if (
    /body/u.test(laneText)
    && /voice/u.test(laneText)
    && /face/u.test(laneText)
    && /motion/u.test(laneText)
    && /lipsync|lip sync/u.test(laneText)
  ) {
    lanes.push('embodiment-expression')
  }
  return uniqueStrings(lanes, replayMemoryClosureLongRunRequiredLanes.length) as AlicizationReplayMemoryClosureLongRunLane[]
}

function buildReplayMemoryClosureIdentityCues(derivedMindStateBundle: Record<string, unknown> | null) {
  if (!derivedMindStateBundle)
    return []

  const emotionalTransitionLedger = asObject(derivedMindStateBundle.emotionalTransitionLedger)
  const initiativeSuppression = asObject(emotionalTransitionLedger?.initiativeSuppression)
  const learningExecutionState = asObject(derivedMindStateBundle.learningExecutionState)
  const embodimentContinuityLedger = asObject(derivedMindStateBundle.embodimentContinuityLedger)
  const lanes = [
    ['emotion', emotionalTransitionLedger?.memoryClosureCausality],
    ['initiative', initiativeSuppression?.memoryClosureCausality],
    ['execution', learningExecutionState?.memoryClosureCausality],
    ['embodiment', embodimentContinuityLedger?.memoryClosureCausality],
  ] as const
  const identityByKey = new Map<string, {
    lanes: string[]
    reasonTags: string[]
  }>()

  for (const [lane, causality] of lanes) {
    const identity = readReplayMemoryClosureIdentityFromCausality(causality)
    if (!identity)
      continue

    const existing = identityByKey.get(identity.continuityKey) ?? {
      lanes: [],
      reasonTags: [],
    }
    existing.lanes.push(lane)
    existing.reasonTags = uniqueStrings([
      ...existing.reasonTags,
      ...identity.reasonTags,
    ], 12)
    identityByKey.set(identity.continuityKey, existing)
  }

  const strongestIdentity = [...identityByKey.entries()]
    .sort((left, right) => right[1].lanes.length - left[1].lanes.length)[0]
  if (!strongestIdentity)
    return []

  const [continuityKey, identity] = strongestIdentity
  return [
    `memory_identity:${continuityKey}`,
    identity.lanes.length > 0
      ? `memory_closure_lanes:${identity.lanes.join('+')}`
      : null,
    identity.reasonTags.length > 0
      ? `memory_closure_reason:${identity.reasonTags.join('|')}`
      : null,
  ].filter((cue): cue is string => Boolean(cue))
}

function readReplayMemoryClosureIdentityKeys(derivedMindStateBundle: Record<string, unknown> | null) {
  if (!derivedMindStateBundle)
    return []

  const emotionalTransitionLedger = asObject(derivedMindStateBundle.emotionalTransitionLedger)
  const initiativeSuppression = asObject(emotionalTransitionLedger?.initiativeSuppression)
  const learningExecutionState = asObject(derivedMindStateBundle.learningExecutionState)
  const embodimentContinuityLedger = asObject(derivedMindStateBundle.embodimentContinuityLedger)
  const causalityRecords = [
    emotionalTransitionLedger?.memoryClosureCausality,
    initiativeSuppression?.memoryClosureCausality,
    learningExecutionState?.memoryClosureCausality,
    embodimentContinuityLedger?.memoryClosureCausality,
  ]
  return uniqueStrings([
    ...causalityRecords.flatMap(readReplayMemoryClosureFamilyKeysFromCausality),
    ...causalityRecords.map(causality =>
      readReplayMemoryClosureIdentityFromCausality(causality)?.continuityKey,
    ),
  ], 8)
}

function scoreReplayMemoryClosureIdentityBundle(derivedMindStateBundle: Record<string, unknown>) {
  const identityKeys = readReplayMemoryClosureIdentityKeys(derivedMindStateBundle)
  let score = identityKeys.length
  if (identityKeys.some(key => key.startsWith('phase1-memory-closure-family:')))
    score += 20
  if (identityKeys.some(key => key.startsWith('fallback:')))
    score += 12
  if (identityKeys.some(key => key.startsWith('cluster:')))
    score -= 2
  return score
}

function readObjectArray(raw: unknown) {
  return Array.isArray(raw)
    ? raw.map(asObject).filter(Boolean) as Record<string, unknown>[]
    : []
}

function buildTraceMemoryClosureExecutionContext(input: {
  trace: AlicizationMemoryDecisionTraceRecord
}): Pick<OrganicMemoryPromptContext, 'projectStatePreflightSummary' | 'memoryResolutionLedger' | 'memorySituationCandidates'> | null {
  const memoryReconsolidated = asObject(input.trace.memoryReconsolidated)
  const memoryClosureExecution = asObject(memoryReconsolidated?.memoryClosureExecution)
  if (!memoryClosureExecution)
    return null

  const carry = readString(memoryClosureExecution.carry, 420)
  const authority = readString(memoryClosureExecution.authority, 80) || 'memory-reconsolidated'
  const reasonTags = readStringArray(memoryClosureExecution.reasonTags, 8, 80)
  if (!carry && reasonTags.length === 0)
    return null

  const producedAt = Math.max(0, Math.floor(Number(input.trace.lastUpdatedAt || input.trace.createdAt || Date.now())))
  const staleSummary = 'Stale status recap should be downranked after memory reconsolidation.'
  const selectedSummary = carry || 'Corrected memory should keep execution callback continuity active.'
  const selectedCandidate = {
    id: 'memory-closure-execution:corrected-callback-carry',
    summary: selectedSummary,
    score: 0.86,
    status: 'selected' as const,
    reason: `authority=${authority}; ${reasonTags.join(', ') || 'memory reconsolidated callback carry'}`,
  }
  const rejectedCandidate = {
    id: 'memory-closure-execution:stale-status-recap',
    summary: staleSummary,
    score: 0.18,
    status: 'rejected' as const,
    reason: 'downrank stale status recap because the corrected callback memory must shape the next proactive, emotional afterglow, and embodied return',
  }
  const preflightSummary = [
    'why recall surfaced now: memory-reconsolidated execution feedback corrected the callback-afterglow carry, downranked stale status recap, and must shape the next proactive-opening, emotional afterglow, and embodied return.',
    selectedSummary,
    'Because corrected memory downranked stale status recap, the next proactive-opening, emotional afterglow, and body voice expression become lower-pressure through execution callback continuity.',
  ].join(' ')
  const suppressedSituation = {
    candidateId: 'memory-closure-execution:stale-status-recap',
    sourceKinds: ['conversation-turn' as const, 'relationship' as const],
    situationKind: 'task-thread' as const,
    eraKey: null,
    relationshipArcKey: 'same-her-execution-callback',
    procedureKey: null,
    selfModelKey: null,
    worldClaimKeys: [],
    selectedEvidenceIds: [],
    competingCandidateIds: ['memory-closure-execution:corrected-callback-carry'],
    suppressionReasons: ['memory-reconsolidated', 'downrank-stale-status-recap', ...reasonTags],
    confidence: 0.84,
    latencyCost: 1,
    status: 'suppressed' as const,
    statusReason: 'Corrected callback memory supersedes generic status recap.',
    summary: staleSummary,
    evidenceSummary: selectedSummary,
  }

  return {
    projectStatePreflightSummary: preflightSummary,
    memoryResolutionLedger: {
      version: 'memory-resolution-ledger-v1',
      producedAt,
      dominantClusterId: selectedCandidate.id,
      dominantClusterSummary: selectedCandidate.summary,
      competingClusterId: rejectedCandidate.id,
      competingClusterSummary: rejectedCandidate.summary,
      candidates: [selectedCandidate, rejectedCandidate],
      selectedCandidates: [selectedCandidate],
      rejectedCandidates: [rejectedCandidate],
      finalSurfacePolicy: 'procedural-carry',
      shouldStayInward: false,
      shouldDelayUntilAfterPayoff: false,
      stableCoreOnly: false,
      suppressionTags: ['stale-status-recap', ...reasonTags].slice(0, 8),
      closureState: 'grounded-recall',
      surfaceConfidence: 0.86,
      shouldLabelUncertainty: false,
      visibleCarryMode: 'tone-carry',
      conflictPressure: 'medium',
      retrievalQuality: 'high',
      finalRationale: selectedSummary,
    },
    memorySituationCandidates: {
      version: 'memory-situation-candidates-v1',
      producedAt,
      queryTexts: [selectedSummary].filter(Boolean).slice(0, 4),
      candidates: [suppressedSituation],
      selected: [],
      rejected: [],
      suppressed: [suppressedSituation],
      delayed: [],
      unresolved: [],
    },
  }
}

function readStringRecord(raw: unknown, maxKeys = 24, maxChars = 120) {
  const candidate = asObject(raw)
  if (!candidate)
    return undefined
  const entries = Object.entries(candidate)
    .map(([key, value]) => [readString(key, 180), readString(value, maxChars)] as const)
    .filter(([key, value]) => Boolean(key && value))
    .slice(0, maxKeys)
  return entries.length > 0
    ? Object.fromEntries(entries)
    : undefined
}

function readReplayLatencyBudgetClass(raw: unknown): AlicizationReplayLatencyBudgetClass | undefined {
  const value = readString(raw, 64)
  return replayBenchmarkLatencyBudgetClasses.includes(value as any)
    ? value as AlicizationReplayLatencyBudgetClass
    : undefined
}

function parseReplayGoldExpectation(raw: unknown): AlicizationReplayGoldExpectation | undefined {
  const candidate = asObject(raw)
  if (!candidate)
    return undefined
  const selectedCandidateIds = readStringArray(candidate.selectedCandidateIds, 24, 180)
  const suppressedCandidateIds = readStringArray(candidate.suppressedCandidateIds, 24, 180)
  const claimValidationStates = readStringRecord(candidate.claimValidationStates)
  const replyAuthority = readString(candidate.replyAuthority, 120)
  const latencyBudgetClass = readReplayLatencyBudgetClass(candidate.latencyBudgetClass)
  const latencyBudgetPass = typeof candidate.latencyBudgetPass === 'boolean'
    ? candidate.latencyBudgetPass
    : undefined
  const embodimentAuthority = asObject(candidate.embodimentAuthority)
  if (
    selectedCandidateIds.length === 0
    && suppressedCandidateIds.length === 0
    && !claimValidationStates
    && !replyAuthority
    && !latencyBudgetClass
    && latencyBudgetPass == null
    && !embodimentAuthority
  ) {
    return undefined
  }
  return {
    selectedCandidateIds: selectedCandidateIds.length > 0 ? selectedCandidateIds : undefined,
    suppressedCandidateIds: suppressedCandidateIds.length > 0 ? suppressedCandidateIds : undefined,
    claimValidationStates,
    replyAuthority: replyAuthority || null,
    latencyBudgetClass,
    latencyBudgetPass,
    embodimentAuthority: embodimentAuthority as AlicizationReplayGoldExpectation['embodimentAuthority'],
  }
}

function normalizeRecollectionSurfaceMode(raw: unknown): NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['surfacePolicy'] {
  const value = readString(raw, 64)
  if (
    value === 'internal-only'
    || value === 'gist-first'
    || value === 'answer-anchoring'
    || value === 'procedural-carry'
    || value === 'relationship-continuity'
  ) {
    return value
  }
  return 'gist-first'
}

function normalizeSpeechPlacement(raw: unknown, fallback: 'before-payoff' | 'inside-payoff' | 'after-payoff' | 'internal-only') {
  const value = readString(raw, 64)
  if (
    value === 'before-payoff'
    || value === 'inside-payoff'
    || value === 'after-payoff'
    || value === 'internal-only'
  ) {
    return value
  }
  return fallback
}

function normalizeAmbiguityPosture(raw: unknown): 'settled' | 'approximate' | 'ambiguous' {
  const value = readString(raw, 64)
  if (value === 'settled' || value === 'approximate' || value === 'ambiguous')
    return value
  return 'settled'
}

function normalizeConflictSeverity(raw: unknown): 'none' | 'low' | 'medium' | 'high' {
  const value = readString(raw, 64)
  if (value === 'none' || value === 'low' || value === 'medium' || value === 'high')
    return value
  return 'none'
}

function normalizeMemoryProvenance(raw: unknown): 'observed' | 'remembered' | 'dreamt' | 'inferred' | 'reconstructed' | 'shadow' {
  const value = readString(raw, 64)
  if (
    value === 'observed'
    || value === 'remembered'
    || value === 'dreamt'
    || value === 'inferred'
    || value === 'reconstructed'
    || value === 'shadow'
  ) {
    return value
  }
  return 'remembered'
}

function normalizeRecollectionMode(raw: unknown): 'conversation-history' | 'autobiographical-history' | 'relationship-history' | 'execution-procedure' | 'experience-pattern' {
  const value = readString(raw, 64)
  if (
    value === 'conversation-history'
    || value === 'autobiographical-history'
    || value === 'relationship-history'
    || value === 'execution-procedure'
    || value === 'experience-pattern'
  ) {
    return value
  }
  return 'experience-pattern'
}

function normalizeTemporalFocus(raw: unknown): 'recent' | 'recent-or-mid' | 'cross-session' | 'experience-matched' | 'distant' {
  const value = readString(raw, 64)
  if (
    value === 'recent'
    || value === 'recent-or-mid'
    || value === 'cross-session'
    || value === 'experience-matched'
    || value === 'distant'
  ) {
    return value
  }
  return 'recent-or-mid'
}

function certaintyFromAmbiguity(ambiguity: 'settled' | 'approximate' | 'ambiguous') {
  if (ambiguity === 'ambiguous')
    return 'fragmentary' as const
  if (ambiguity === 'approximate')
    return 'approximate' as const
  return 'firm' as const
}

function normalizeEraFacet(raw: unknown): 'phase' | 'relationship-era' | 'task-era' | 'self-era' | 'window' {
  const value = readString(raw, 64)
  if (
    value === 'phase'
    || value === 'relationship-era'
    || value === 'task-era'
    || value === 'self-era'
    || value === 'window'
  ) {
    return value
  }
  return 'phase'
}

function normalizePeriodKind(raw: unknown): 'window' | 'consolidation' {
  return readString(raw, 64) === 'window'
    ? 'window'
    : 'consolidation'
}

function normalizeChainKind(raw: unknown): 'task-procedure-relationship-stance' | 'period-event-lesson-posture' {
  return readString(raw, 64) === 'period-event-lesson-posture'
    ? 'period-event-lesson-posture'
    : 'task-procedure-relationship-stance'
}

function normalizeIntrusionRisk(raw: unknown): 'low' | 'medium' | 'high' {
  const value = readString(raw, 64)
  if (value === 'low' || value === 'medium' || value === 'high')
    return value
  return 'medium'
}

function normalizePayoffDependency(raw: unknown): 'memory-only' | 'requires-current-payoff' | 'can-surface-softly' {
  const value = readString(raw, 64)
  if (value === 'memory-only' || value === 'requires-current-payoff' || value === 'can-surface-softly')
    return value
  return 'requires-current-payoff'
}

function normalizePreferredTiming(raw: unknown): 'internal-only' | 'after-payoff' | 'same-turn-if-invited' | 'next-open-window' {
  const value = readString(raw, 64)
  if (value === 'internal-only' || value === 'after-payoff' || value === 'same-turn-if-invited' || value === 'next-open-window')
    return value
  return 'after-payoff'
}

function buildTraceDerivedHostPersonModel(input: {
  trace: AlicizationMemoryDecisionTraceRecord
  activeClosenessContext: string | null
  activeClosenessRung: string | null
  relationshipPosture: string | null
  openingGuidance: string | null
  currentRegime: string | null
  repairPosture: string | null
}) {
  const context = readString(input.activeClosenessContext, 64) || 'general'
  const rung = readString(input.activeClosenessRung, 64) || 'measured-room'
  const posture = readString(input.relationshipPosture, 64) || 'warm'
  const guidance = readString(input.openingGuidance, 220)
    || readString(asObject(input.trace.memoryDeliberationJudged)?.whyWithheld, 220)
    || readString(asObject(input.trace.recallAttribution)?.whyNow, 220)
  if (!guidance && context === 'general' && posture === 'warm')
    return null

  const trustStage = rung === 'close-hold'
    ? 'trusted'
    : context === 'repair-window'
      ? 'cautious-open'
      : posture === 'restrained'
        ? 'warming'
        : 'trusted'
  const trustScore = rung === 'close-hold'
    ? 0.86
    : context === 'repair-window'
      ? 0.52
      : posture === 'restrained'
        ? 0.66
        : 0.78

  return {
    summary: guidance || `Keep visible closeness within ${context}/${rung}.`,
    routines: guidance ? [guidance] : [],
    sensitivities: posture === 'restrained'
      ? ['Pushing recollection or warmth too early breaks the line.']
      : [],
    repairTriggers: readString(input.repairPosture, 64) === 'repair-first'
      ? ['Repair the seam before letting warmth widen again.']
      : [],
    trustLadder: {
      stage: trustStage,
      score: trustScore,
      rationale: guidance || `This sample keeps closeness inside ${context}/${rung}.`,
    },
    preferredClosenessByContext: [{
      context,
      preference: guidance || `Keep closeness inside ${context}/${rung}.`,
      confidence: 0.76,
    }],
    recurrentBurdens: context === 'repair-window'
      ? ['The line slips if recollection outruns repair.']
      : posture === 'restrained'
        ? ['Too much warmth too early makes the answer feel less real.']
        : [],
    narrative: readString(input.currentRegime, 64)
      ? [`regime=${readString(input.currentRegime, 64)}`]
      : [],
    updatedAt: input.trace.lastUpdatedAt,
  } satisfies NonNullable<OrganicMemoryPromptContext['hostPersonModel']>
}

const explicitMemoryAskPattern = /记得|回忆|想起|聊过|前几天|半年前|上次|那次|当时|which day|what did we talk|remembered|memory|recall/iu
const ambiguousTimeAskPattern = /那段时间|那时候|以前|之前|前阵子|earlier|back then|that period|those days/iu
const relationshipRepairAskPattern = /不一样|记错|不是那次|别把.*记成|是不是记错|why this time feels different|you remembered the wrong one/iu

function inferSampleCategories(input: {
  row: AlicizationReplayBenchmarkSampleConversationTurn
  trace: AlicizationMemoryDecisionTraceRecord
  sessionTurnCount: number
}) {
  const categories: AlicizationReplayBenchmarkSampleCategory[] = []
  const autonomousDialogueFamily = resolveAlicizationAutonomousDialogueFamilyClassification({
    turnId: input.trace.turnId,
    origin: input.trace.origin,
  })
  const recall = asObject(input.trace.recallAttribution)
  const judged = asObject(input.trace.memoryDeliberationJudged)
  const personState = asObject(judged?.personState)
  const hasProcedures = readObjectArray(recall?.selectedProcedures).length > 0
  const hasPeriods = readObjectArray(recall?.selectedPeriods).length > 0 || readObjectArray(recall?.selectedEras).length > 0
  const ambiguityPosture = normalizeAmbiguityPosture(judged?.ambiguityPosture ?? recall?.ambiguityPosture)
  const hasWrongThread = Boolean(input.trace.memoryWrongThreadSuppressed)
    || ambiguityPosture === 'ambiguous'
  const hasDeferredFollowUp = Boolean(input.trace.memoryFollowUpDeferred)
    || asObject(recall?.followUpAffordance)?.preferredTiming === 'after-payoff'
  const hasStableCoreOnly = Boolean(input.trace.memoryStableCoreSurfaced)
    || readBoolean(asObject(judged?.restraint)?.shouldOnlySurfaceStableCore)
  const repairState = readString(input.trace.governance?.repairState, 64)
  const isRepairArc = readString(personState?.currentRegime, 64) === 'repair-window'
    || (repairState !== '' && repairState !== 'none')
  const isSurfaceDivergence = Boolean(input.trace.takeoverAudit)
    || (
      readString(input.trace.governance?.screenReferenceMode, 64) !== 'avoid'
      && readString(input.trace.governance?.truthState, 64) === 'uncertain'
    )
  const temporalFocus = normalizeTemporalFocus(recall?.recollectionIntentTemporalFocus)
  const isTaskMigration = hasProcedures && (temporalFocus === 'experience-matched' || temporalFocus === 'cross-session')
  const userText = readString(input.row.userText, 220)
  const activeClosenessContext = readString(personState?.activeClosenessContext, 64)
  const memoryClosureTrace = asObject(input.trace.governance?.digitalLifeSpine?.memory?.memoryClosureTrace)
  const memoryClosureNextInfluence = asObject(memoryClosureTrace?.nextInfluence)
  const memoryClosureInitiative = asObject(memoryClosureNextInfluence?.initiative)
  const memoryClosureExecution = asObject(memoryClosureNextInfluence?.execution)
  const memoryClosureEmbodiment = asObject(memoryClosureNextInfluence?.embodiment)
  const memoryReconsolidated = asObject(input.trace.memoryReconsolidated)
  const memoryClosureExecutionFeedback = asObject(memoryReconsolidated?.memoryClosureExecution)
  const memoryClosureTraceText = [
    ...readObjectArray(memoryClosureTrace?.whySurface).map(item => readString(item.summary, 240)),
    ...readStringArray(memoryClosureTrace?.reasonTags, 10, 80),
    readString(memoryClosureInitiative?.reason, 240),
    readString(memoryClosureInitiative?.restraint, 96),
    readString(memoryClosureInitiative?.preferredTiming, 96),
    readString(memoryClosureExecution?.carry, 240),
    readString(memoryClosureEmbodiment?.reason, 240),
    readString(memoryClosureEmbodiment?.cadence, 120),
    readString(memoryClosureExecutionFeedback?.authority, 80),
    readString(memoryClosureExecutionFeedback?.carry, 240),
    ...readStringArray(memoryClosureExecutionFeedback?.reasonTags, 8, 80),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  const hasMemoryClosureTrace = Boolean(memoryClosureTrace)
  const hasMemoryClosureExecutionFeedback = Boolean(memoryClosureExecutionFeedback)
  const hasMemoryClosureExecutionCarry = Boolean(
    readString(memoryClosureExecution?.carry, 240)
    || readString(memoryClosureExecutionFeedback?.carry, 240),
  )

  if (autonomousDialogueFamily.isAutonomous) {
    categories.push('proactive')
  }
  else if (hasProcedures || activeClosenessContext === 'execution-callback' || hasMemoryClosureExecutionCarry) {
    categories.push('execution')
  }
  else {
    categories.push('dialogue')
  }

  if (hasWrongThread)
    categories.push('wrong-thread')
  if (hasDeferredFollowUp)
    categories.push('deferred-followup')
  if (hasStableCoreOnly)
    categories.push('stable-core')
  if (isRepairArc)
    categories.push('repair-arc')
  if (isRepairArc || repairState !== 'none')
    categories.push('repair')
  if (hasProcedures || hasMemoryClosureExecutionCarry)
    categories.push('procedure-carry')
  if (isTaskMigration)
    categories.push('task-migration')
  if (
    hasPeriods
    || ambiguousTimeAskPattern.test(userText)
    || explicitMemoryAskPattern.test(userText)
    || (
      (hasMemoryClosureTrace || hasMemoryClosureExecutionFeedback)
      && /memory-closure-trace|memory closure trace|why recall surfaced|corrected memory|correction provenance|memory audit|prior recall|next turn|next proactive|修正|审计|回忆.*浮现/u.test(memoryClosureTraceText)
    )
  ) {
    categories.push('long-horizon')
  }
  if (
    (hasMemoryClosureTrace || hasMemoryClosureExecutionFeedback)
    && /embodiment|body|voice|face|motion|lipsync|lip sync|resident body|身体|语音|表情|动作|口型/u.test(memoryClosureTraceText)
    && /same-her|same her|same living line|same life thread|同一个她|同一条/u.test(memoryClosureTraceText)
  ) {
    categories.push('presence-quality')
  }
  if (/跨周|几周|两个星期|几星期|cross-week|weeks later|隔了几周/u.test(userText))
    categories.push('cross-week-task-migration')
  if (/跨月|几个月|上个月|前几个月|cross-month|months later|修复后的分寸/u.test(userText))
    categories.push('cross-month-repair')
  if (/学会|更新旧理解|记成旧的|旧知识|知识更新|knowledge update|supersede|旧方法已经不对/u.test(userText))
    categories.push('knowledge-update-conflict')
  if (isSurfaceDivergence)
    categories.push('surface-divergence')
  if (input.sessionTurnCount >= 4)
    categories.push('long-session')
  if (categories.length === 0 && (input.trace.recallAttribution || input.trace.memoryDeliberationJudged || hasMemoryClosureTrace))
    categories.push('general-memory')

  return [...new Set(categories)]
}

export function buildOrganicMemoryPromptContextFromTrace(input: {
  row: AlicizationReplayBenchmarkSampleConversationTurn
  trace: AlicizationMemoryDecisionTraceRecord
}): OrganicMemoryPromptContext {
  const derivedBundle = input.trace.derivedMindStateBundle ?? null
  const recall = asObject(input.trace.recallAttribution)
  const judged = asObject(input.trace.memoryDeliberationJudged)
  const personState = asObject(judged?.personState)
  const restraint = asObject(judged?.restraint)
  const followUpDeferred = asObject(input.trace.memoryFollowUpDeferred)
  const stableCoreSurfaced = asObject(input.trace.memoryStableCoreSurfaced)
  const wrongThread = asObject(input.trace.memoryWrongThreadSuppressed)
  const shouldStayInward = readBoolean(restraint?.shouldStayInward)
  const shouldDelayUntilAfterPayoff = readBoolean(restraint?.shouldDelayUntilAfterPayoff)
  const surfacePolicy = normalizeRecollectionSurfaceMode(recall?.surfacePolicy)
  const ambiguityPosture = normalizeAmbiguityPosture(judged?.ambiguityPosture ?? recall?.ambiguityPosture)
  const certainty = certaintyFromAmbiguity(ambiguityPosture)
  const stableCore = readStringArray(judged?.stableCore ?? recall?.stableCore ?? stableCoreSurfaced?.stableCore)
  const unsafeDetails = readStringArray(judged?.unsafeDetails ?? recall?.unsafeDetails ?? stableCoreSurfaced?.unsafeDetails)
  const searchTraceRecord = asObject(recall?.searchTrace)
  const firstHop = asObject(searchTraceRecord?.firstHop)
  const secondHop = asObject(searchTraceRecord?.secondHop)
  const thirdHop = asObject(searchTraceRecord?.thirdHop)
  const followUpAffordanceSource = asObject(recall?.followUpAffordance) ?? followUpDeferred
  const followUpAffordance = followUpAffordanceSource
    ? {
        summary: readString(followUpAffordanceSource.summary, 220) || 'Keep recollection behind the current payoff.',
        whyNow: readString(followUpAffordanceSource.whyNow, 220) || readString(judged?.whyWithheld, 220) || readString(recall?.whyNow, 220),
        intrusionRisk: normalizeIntrusionRisk(followUpAffordanceSource.intrusionRisk),
        payoffDependency: normalizePayoffDependency(followUpAffordanceSource.payoffDependency),
        preferredTiming: normalizePreferredTiming(followUpAffordanceSource.preferredTiming),
      }
    : null

  const selectedEpisodes = readObjectArray(recall?.selectedEpisodes).map(item => ({
    id: readString(item.id, 120) || `episode:${input.trace.decisionTraceId}`,
    summary: readString(item.summary, 220),
    provenance: normalizeMemoryProvenance(item.provenance),
    reconsolidatedFromTraceId: readString(item.reconsolidatedFromTraceId, 160) || null,
  })).filter(item => item.summary)
  const selectedPeriodEntries = readObjectArray(recall?.selectedPeriods)
  const selectedProcedureEntries = readObjectArray(recall?.selectedProcedures)
  const conflictVariants = readObjectArray(wrongThread?.conflictVariants ?? recall?.conflictVariants).map(item => ({
    id: readString(item.id, 120) || `variant:${input.trace.decisionTraceId}`,
    summary: readString(item.summary, 220),
    provenance: normalizeMemoryProvenance(item.provenance),
    reason: readString(item.reason, 220) || null,
  })).filter(item => item.summary)
  const hostPersonModel = readHostPersonModelFromDerivedMindStateBundle(derivedBundle)
    ?? buildTraceDerivedHostPersonModel({
      trace: input.trace,
      activeClosenessContext: readString(personState?.activeClosenessContext, 64) || null,
      activeClosenessRung: readString(personState?.activeClosenessRung, 64) || null,
      relationshipPosture: readString(personState?.relationshipPosture, 64) || null,
      openingGuidance: readString(personState?.openingGuidance, 220) || null,
      currentRegime: readString(personState?.currentRegime, 64) || null,
      repairPosture: readString(personState?.repairPosture, 64) || null,
    })
  const memoryClosureExecutionContext = buildTraceMemoryClosureExecutionContext({
    trace: input.trace,
  })
  const persistedMemoryResolutionLedger = asObject((input.trace as any).memoryResolutionLedger)
    ? (input.trace as any).memoryResolutionLedger as OrganicMemoryPromptContext['memoryResolutionLedger']
    : null
  const syntheticSuppressionCandidates = conflictVariants
    .filter(item => String(item.id ?? '').startsWith('suppression:'))
    .map(item => ({
      id: item.id,
      summary: item.summary,
      score: null,
      status: 'rejected' as const,
      reason: item.reason ?? 'Suppressed by replay trace.',
    }))
  const memoryResolutionLedger = persistedMemoryResolutionLedger
    ?? memoryClosureExecutionContext?.memoryResolutionLedger
    ?? (
      syntheticSuppressionCandidates.length > 0
        ? {
          version: 'memory-resolution-ledger-v1' as const,
          producedAt: input.trace.lastUpdatedAt,
          dominantClusterId: null,
          dominantClusterSummary: null,
          competingClusterId: null,
          competingClusterSummary: syntheticSuppressionCandidates[0]?.summary ?? null,
          candidates: syntheticSuppressionCandidates,
          selectedCandidates: [],
          rejectedCandidates: syntheticSuppressionCandidates,
          finalSurfacePolicy: surfacePolicy,
          shouldStayInward: shouldStayInward || surfacePolicy === 'internal-only',
          shouldDelayUntilAfterPayoff,
          stableCoreOnly: stableCore.length > 0 || unsafeDetails.length > 0,
          suppressionTags: syntheticSuppressionCandidates
            .map(item => String(item.id).replace(/^suppression:/, ''))
            .slice(0, 8),
          closureState: 'conflicted-recall' as const,
          surfaceConfidence: null,
          shouldLabelUncertainty: true,
          visibleCarryMode: shouldStayInward || surfacePolicy === 'internal-only'
            ? 'withhold' as const
            : stableCore.length > 0
              ? 'gist-only' as const
              : 'tone-carry' as const,
          conflictPressure: 'high' as const,
          retrievalQuality: selectedEpisodes.length > 0 || selectedPeriodEntries.length > 0 || selectedProcedureEntries.length > 0 ? 'low' as const : 'insufficient' as const,
          finalRationale: readString(recall?.whyNow, 220) || readString(judged?.whyWithheld, 220) || null,
        } satisfies NonNullable<OrganicMemoryPromptContext['memoryResolutionLedger']>
        : null
    )

  return {
    projectStatePreflightSummary: memoryClosureExecutionContext?.projectStatePreflightSummary ?? null,
    hostAttitude: readString(personState?.openingGuidance, 220)
      || readString(judged?.whyWithheld, 220)
      || '',
    coreIncarnation: '',
    activeThoughts: [],
    retrievedFacts: [],
    recalledFragments: [],
    recollectionIntent: {
      mode: normalizeRecollectionMode(recall?.recollectionIntentMode),
      temporalFocus: normalizeTemporalFocus(recall?.recollectionIntentTemporalFocus),
      searchEpisodes: selectedEpisodes.length > 0,
      searchConversations: readStringArray(recall?.selectedConversationTurnIds, 6, 120).length > 0,
      searchProceduralExperience: readObjectArray(recall?.selectedProcedures).length > 0,
      queryHints: readStringArray([
        input.row.userText,
        judged?.whyNow,
        recall?.whyNow,
      ], 4, 120),
      rationale: readString(recall?.whyNow, 220) || readString(judged?.whyWithheld, 220) || readString(input.row.userText, 220),
      confidence: Number(readNumber(recall?.confidence, 0.76).toFixed(2)),
    },
    recollectionSpeechPlan: {
      shouldSurface: readBoolean(recall?.speechShouldSurface, !shouldStayInward && surfacePolicy !== 'internal-only'),
      surfaceMode: normalizeRecollectionSurfaceMode(recall?.speechSurfaceMode ?? recall?.surfacePolicy),
      placement: normalizeSpeechPlacement(
        recall?.speechPlacement,
        shouldDelayUntilAfterPayoff
          ? 'after-payoff'
          : shouldStayInward
            ? 'internal-only'
            : surfacePolicy === 'answer-anchoring'
              ? 'before-payoff'
              : 'inside-payoff',
      ),
      certainty,
      rationale: readString(recall?.whyNow, 220) || readString(judged?.whyWithheld, 220) || readString(input.row.userText, 220),
      confidence: Number(readNumber(recall?.confidence, 0.76).toFixed(2)),
    },
    memoryDeliberation: {
      shouldRecall: readBoolean(recall?.shouldRecall, true),
      selectedEraIds: readObjectArray(recall?.selectedEras).map(item => readString(item.id, 120)).filter(Boolean),
      selectedConsolidationIds: readObjectArray(recall?.selectedPeriods)
        .filter(item => readString(item.kind, 64) === 'consolidation')
        .map(item => readString(item.id, 120))
        .filter(Boolean),
      selectedWindowIds: readObjectArray(recall?.selectedPeriods)
        .filter(item => readString(item.kind, 64) === 'window')
        .map(item => readString(item.id, 120))
        .filter(Boolean),
      selectedProcedureIds: readObjectArray(recall?.selectedProcedures).map(item => readString(item.id, 120)).filter(Boolean),
      selectedEpisodeIds: selectedEpisodes.map(item => item.id),
      selectedConversationTurnIds: [],
      selectedRelationshipLines: readStringArray(recall?.selectedRelationshipLines),
      ambiguityPosture,
      searchTrace: searchTraceRecord
        ? {
            firstHop: {
              focus: (() => {
                const value = readString(firstHop?.focus, 64)
                return value === 'era' || value === 'procedure' || value === 'relationship-line' || value === 'conversation-turn' || value === 'episode'
                  ? value
                  : 'episode'
              })(),
              summary: readString(firstHop?.summary, 220),
              targetIds: readStringArray(firstHop?.targetIds, 6, 120),
            },
            secondHop: {
              action: (() => {
                const value = readString(secondHop?.action, 64)
                return value === 'hold' || value === 'expand-era' || value === 'expand-procedure' || value === 'expand-relationship-line' || value === 'expand-conversation' || value === 'narrow-to-stable-core'
                  ? value
                  : 'hold'
              })(),
              evidenceGap: (() => {
                const value = readString(secondHop?.evidenceGap, 64)
                return value === 'none' || value === 'need-period-anchor' || value === 'need-episode-detail' || value === 'need-procedure-detail' || value === 'need-relationship-meaning' || value === 'need-conversation-evidence' || value === 'need-disambiguation'
                  ? value
                  : 'none'
              })(),
              summary: readString(secondHop?.summary, 220),
              targetIds: readStringArray(secondHop?.targetIds, 6, 120),
            },
            thirdHop: {
              ambiguityPosture,
              summary: readString(thirdHop?.summary, 220),
            },
          }
        : null,
      selectedEras: readObjectArray(recall?.selectedEras).map(item => ({
        id: readString(item.id, 120) || `era:${input.trace.decisionTraceId}`,
        facet: normalizeEraFacet(item.facet),
        summary: readString(item.summary, 220),
      })).filter(item => item.summary),
      selectedPeriods: readObjectArray(recall?.selectedPeriods).map(item => ({
        id: readString(item.id, 120) || `period:${input.trace.decisionTraceId}`,
        kind: normalizePeriodKind(item.kind),
        summary: readString(item.summary, 220),
      })).filter(item => item.summary),
      selectedEpisodes,
      conflictSeverity: normalizeConflictSeverity(judged?.conflictSeverity ?? wrongThread?.conflictSeverity ?? recall?.conflictSeverity),
      conflictVariants,
      stableCore,
      unsafeDetails,
      selectedProcedures: readObjectArray(recall?.selectedProcedures).map(item => ({
        id: readString(item.id, 120) || `procedure:${input.trace.decisionTraceId}`,
        label: readString(item.label, 180),
        approach: readString(item.approach, 220),
      })).filter(item => item.label || item.approach),
      selectedBundles: readObjectArray(recall?.selectedBundles).map(item => ({
        id: readString(item.id, 120) || `bundle:${input.trace.decisionTraceId}`,
        summary: readString(item.summary, 220),
        rationale: readString(item.rationale, 220) || readString(recall?.whyNow, 220),
        confidence: Number(readNumber(item.confidence, readNumber(recall?.confidence, 0.74)).toFixed(2)),
        relationshipLine: readString(item.relationshipLine, 220) || null,
      })).filter(item => item.summary),
      selectedChains: readObjectArray(recall?.selectedChains).map(item => ({
        id: readString(item.id, 120) || `chain:${input.trace.decisionTraceId}`,
        kind: normalizeChainKind(item.kind),
        summary: readString(item.summary, 220),
        rationale: readString(item.rationale, 220) || readString(recall?.whyNow, 220),
        confidence: Number(readNumber(item.confidence, readNumber(recall?.confidence, 0.74)).toFixed(2)),
        currentStance: readString(item.currentStance, 220) || null,
        answerPosture: readString(item.answerPosture, 220) || null,
      })).filter(item => item.summary),
      surfacePolicy,
      confidence: Number(readNumber(recall?.confidence, 0.76).toFixed(2)),
      whyNow: readString(recall?.whyNow, 220) || readString(input.row.userText, 220),
      inwardLine: readString(recall?.inwardLine, 220) || readString(judged?.whyWithheld, 220) || 'The remembered line is still active inwardly.',
      visibleLine: readString(recall?.visibleLine, 220) || null,
      followUpAffordance,
    },
    knowledgeEvidence: readKnowledgeEvidenceFromDerivedMindStateBundle(derivedBundle) ?? {
      validationCount: Math.max(0, readNumber(recall?.knowledgeValidationCount, 0)),
      contradictionCount: Math.max(0, readNumber(recall?.knowledgeContradictionCount, 0)),
      stronglyValidatedProcedureCount: Math.max(0, readNumber(recall?.stronglyValidatedProcedureCount, 0)),
      contradictionHeavyFactCount: Math.max(0, readNumber(recall?.contradictionHeavyFactCount, 0)),
    },
    hostPersonModel,
    derivedMindStateBundle: derivedBundle,
    memoryResolutionLedger,
    memorySituationCandidates: memoryClosureExecutionContext?.memorySituationCandidates ?? null,
  }
}

export function buildSampledHumanlikeMemoryBenchmarkPack(input: {
  conversationTurns: AlicizationReplayBenchmarkSampleConversationTurn[]
  memoryDecisionTraces: AlicizationMemoryDecisionTraceRecord[]
  limit?: number
}): AlicizationReplayTurn[] {
  const limit = Math.max(1, Math.min(24, Math.floor(input.limit ?? 12)))
  const tracesByTurnId = new Map<string, AlicizationMemoryDecisionTraceRecord[]>()
  for (const trace of [...input.memoryDecisionTraces].sort((left, right) => right.lastUpdatedAt - left.lastUpdatedAt)) {
    const turnId = readString(trace.turnId, 160)
    const normalizedOrigin = readString(trace.origin, 64).toLowerCase()
    if (!turnId || normalizedOrigin === 'system')
      continue
    if (
      !trace.recallAttribution
      && !trace.memoryDeliberationJudged
      && !trace.governance?.digitalLifeSpine?.memory?.memoryClosureTrace
      && !asObject(trace.memoryReconsolidated)?.memoryClosureExecution
    ) {
      continue
    }
    const traces = tracesByTurnId.get(turnId) ?? []
    traces.push(trace)
    tracesByTurnId.set(turnId, traces)
  }

  const sessionCounts = new Map<string, number>()
  for (const row of input.conversationTurns) {
    const sessionId = readString(row.sessionId, 160)
    if (!sessionId)
      continue
    sessionCounts.set(sessionId, (sessionCounts.get(sessionId) ?? 0) + 1)
  }

  const candidates = (
    input.conversationTurns
      .map((row) => {
        const turnId = readString(row.turnId, 160)
        const userText = readString(row.userText, 240)
        if (!turnId || !userText)
          return null
        const traceRecords = tracesByTurnId.get(turnId) ?? []
        const trace = traceRecords[0]
        if (!trace)
          return null
        const categories = uniqueStrings(traceRecords.flatMap(traceRecord =>
          inferSampleCategories({
            row,
            trace: traceRecord,
            sessionTurnCount: sessionCounts.get(readString(row.sessionId, 160)) ?? 1,
          }),
        ), 18) as AlicizationReplayBenchmarkSampleCategory[]
        if (categories.length === 0)
          return null
        return {
          row,
          trace,
          traceRecords,
          categories,
        }
      })
      .filter(Boolean)
      .sort((left, right) => {
        return readNumber((right as any).trace.lastUpdatedAt, (right as any).row.createdAt)
          - readNumber((left as any).trace.lastUpdatedAt, (left as any).row.createdAt)
      })
  ) as Array<{
    row: AlicizationReplayBenchmarkSampleConversationTurn
    trace: AlicizationMemoryDecisionTraceRecord
    traceRecords: AlicizationMemoryDecisionTraceRecord[]
    categories: AlicizationReplayBenchmarkSampleCategory[]
  }>

  const selectedTurnIds = new Set<string>()
  const selected: typeof candidates = []
  for (const category of replayBenchmarkSampleCategoryPriority) {
    const candidate = candidates.find(item =>
      item.categories.includes(category)
      && !selectedTurnIds.has(readString(item.row.turnId, 160)),
    )
    if (!candidate)
      continue
    selected.push(candidate)
    selectedTurnIds.add(readString(candidate.row.turnId, 160))
    if (selected.length >= limit)
      break
  }

  for (const candidate of candidates) {
    const turnId = readString(candidate.row.turnId, 160)
    if (!turnId || selectedTurnIds.has(turnId))
      continue
    selected.push(candidate)
    selectedTurnIds.add(turnId)
    if (selected.length >= limit)
      break
  }

  return selected.map((candidate) => {
    let organicMemoryContext: AlicizationReplayTurn['organicMemoryContext'] | null = null
    let structured = readReplaySampleStructuredSnapshot(candidate.row.structuredJson ?? null)
    let gold: AlicizationReplayGoldExpectation | undefined
    for (const traceRecord of candidate.traceRecords) {
      organicMemoryContext = mergeReplaySampleOrganicMemoryContext({
        primary: organicMemoryContext,
        fallback: buildOrganicMemoryPromptContextFromTrace({
          row: candidate.row,
          trace: traceRecord,
        }),
      }) ?? organicMemoryContext
      structured = mergeReplayStructuredSnapshot({
        primary: structured,
        fallback: readReplayTraceMemoryClosureStructuredSnapshot(traceRecord),
      })
      gold = mergeReplayGoldExpectation({
        primary: gold,
        fallback: buildIndependentReplayGoldExpectationFromTrace({
          trace: traceRecord,
          categories: candidate.categories,
        }),
      })
    }
    return {
    // NOTICE: sampled replay traces already carry the memory/claim surface that runtime produced,
    // so we can promote them into replay gold expectations without inventing a second benchmark truth source.
      turnId: readString(candidate.row.turnId, 160),
      userText: readString(candidate.row.userText, 240),
      createdAt: Math.max(0, Math.floor(readNumber(candidate.row.createdAt, 0))),
      structured,
      ...(organicMemoryContext ? { organicMemoryContext } : {}),
      expectedMemory: buildReplayBenchmarkExpectedMemory({
        assistantText: candidate.row.assistantText ?? null,
        structuredJson: candidate.row.structuredJson ?? null,
      }),
      categories: candidate.categories,
      tracePointer: {
        kind: 'decision-trace',
        packId: 'sampled-humanlike-memory-v1',
        turnId: readString(candidate.row.turnId, 160),
        decisionTraceId: readString(candidate.trace.decisionTraceId, 160) || null,
        sessionId: readString(candidate.trace.sessionId, 160) || null,
        activeThreadId: readString(candidate.trace.activeThreadId, 160) || null,
      },
      sampledCategories: candidate.categories,
      gold,
    } satisfies AlicizationReplayTurn
  })
}

function hasTextOverlap(left: string, right: string) {
  const normalizedLeft = normalizeText(left).toLowerCase()
  const normalizedRight = normalizeText(right).toLowerCase()
  if (!normalizedLeft || !normalizedRight)
    return false
  if (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft))
    return true

  const leftTokens = normalizedLeft.match(/\p{Script=Han}{1,8}|[a-z0-9][a-z0-9-]{1,32}/gu) ?? []
  const rightTokens = normalizedRight.match(/\p{Script=Han}{1,8}|[a-z0-9][a-z0-9-]{1,32}/gu) ?? []
  if (leftTokens.length === 0 || rightTokens.length === 0)
    return false
  const overlap = rightTokens.filter(token => normalizedLeft.includes(token)).length
  return overlap >= Math.max(1, Math.floor(rightTokens.length / 2))
}

function hasTemplatePhraseLeak(left: string, right: string) {
  const normalizedLeft = normalizeText(left, 320).toLowerCase()
  const normalizedRight = normalizeText(right, 220).toLowerCase()
  if (!normalizedLeft || !normalizedRight || normalizedRight.length < 18)
    return false
  if (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft))
    return true

  const leftTokens = normalizedLeft.match(/\p{Script=Han}{1,8}|[a-z0-9][a-z0-9-]{2,32}/gu) ?? []
  const rightTokens = normalizedRight.match(/\p{Script=Han}{1,8}|[a-z0-9][a-z0-9-]{2,32}/gu) ?? []
  if (leftTokens.length === 0 || rightTokens.length < 3)
    return false

  const overlap = rightTokens.filter(token => normalizedLeft.includes(token)).length
  return overlap >= Math.max(3, Math.floor(rightTokens.length * 0.75))
}

function hasVisibleMemoryEvidence(input: {
  openingClaim: string
  governingFocus: string
  selectedEvidence: string
  visibleLine: string
  procedureApproach: string
  relationshipLine: string
  answerPosture: string
}) {
  const targets = [
    input.visibleLine,
    input.procedureApproach,
    input.relationshipLine,
    input.answerPosture,
  ].filter(Boolean)
  return targets.some(target =>
    hasTextOverlap(input.openingClaim, target)
    || hasTextOverlap(input.governingFocus, target)
    || hasTextOverlap(input.selectedEvidence, target),
  )
}

export function evaluateReplayMemoryQuality(input: {
  prepared: AlicizationPreparedMainChatExecutionResult
  turnId: string
  userText: string
}): AlicizationReplayMemoryQuality {
  const runtimeSurface = input.prepared.runtimeSurface?.digitalLifeRuntimeSurface ?? null
  const derivedBundle = runtimeSurface?.memory?.derivedMindStateBundle
    ?? input.prepared.organicMemoryContext?.derivedMindStateBundle
    ?? null
  const deliberation = readMemoryDeliberationFromDerivedMindStateBundle<any>(derivedBundle)
    ?? input.prepared.organicMemoryContext?.memoryDeliberation
    ?? null
  const eraSummary = deliberation?.selectedEras[0]?.summary ?? ''
  const periodSummary = deliberation?.selectedPeriods[0]?.summary ?? ''
  const bundle = deliberation?.selectedBundles[0] ?? null
  const chain = deliberation?.selectedChains[0] ?? null
  const selectedEvidence = runtimeSurface?.dialogue.dialogueActKernel?.selectedEvidence[0]?.summary ?? ''
  const governingFocus = runtimeSurface?.dialogue.answerPlanner?.governingFocus ?? ''
  const openingClaim = runtimeSurface?.dialogue.dialogueActKernel?.openingClaim ?? ''
  const mustDo = runtimeSurface?.dialogue.answerPlanner?.mustDo ?? []
  const mustAvoid = runtimeSurface?.dialogue.replyDeliberation?.mustAvoid ?? []
  const personState = readReplayPersonStateProjection(input.prepared)
  const dialogueRhythm = readDialogueRhythmFromDerivedMindStateBundle(derivedBundle)
  const affectiveResidue = readAffectiveResidueFromDerivedMindStateBundle(derivedBundle)
    ?? input.prepared.organicMemoryContext?.affectiveResidue
    ?? runtimeSurface?.memory?.affectiveResidue
    ?? null
  const governanceMustDo = input.prepared.governance?.mustDo ?? []
  const speakingFrom = runtimeSurface?.dialogue.replyDeliberation?.speakingFrom ?? ''
  const systemTexts = input.prepared.messages
    .filter(message => message.role === 'system' && typeof message.content === 'string')
    .map(message => String(message.content))
  const draftedMemoryLines = [
    readRecollectionPlanFromDerivedMindStateBundle<any>(derivedBundle)?.opening ?? input.prepared.organicMemoryContext?.recollectionPlan?.opening ?? '',
    readMemoryDeliberationFromDerivedMindStateBundle<any>(derivedBundle)?.inwardLine ?? input.prepared.organicMemoryContext?.memoryDeliberation?.inwardLine ?? '',
    readMemoryDeliberationFromDerivedMindStateBundle<any>(derivedBundle)?.visibleLine ?? input.prepared.organicMemoryContext?.memoryDeliberation?.visibleLine ?? '',
  ].map(item => normalizeText(item, 220)).filter(Boolean)
  const selectedEpisodes = deliberation?.selectedEpisodes ?? []
  const selectedProcedures = deliberation?.selectedProcedures ?? []
  const selectedPeriods = deliberation?.selectedPeriods ?? []
  const selectedRelationshipLines = deliberation?.selectedRelationshipLines ?? []
  const speechPlan = readRecollectionSpeechPlanFromDerivedMindStateBundle<any>(derivedBundle)
    ?? input.prepared.organicMemoryContext?.recollectionSpeechPlan
    ?? null
  const knowledgeEvidence = readKnowledgeEvidenceFromDerivedMindStateBundle(derivedBundle)
    ?? input.prepared.organicMemoryContext?.knowledgeEvidence
    ?? null
  const selfEvolution = derivedBundle?.selfEvolution
    ?? input.prepared.organicMemoryContext?.selfEvolution
    ?? null
  const learningExecuted = asObject(((input.prepared as any).trace as any)?.learningExecuted ?? null)
  const hostPersonModel = readHostPersonModelFromDerivedMindStateBundle(derivedBundle)
    ?? input.prepared.organicMemoryContext?.hostPersonModel
    ?? null
  const resolutionLedger = runtimeSurface?.memory?.memoryResolutionLedger
    ?? input.prepared.organicMemoryContext?.memoryResolutionLedger
    ?? null
  const hasProcedureCarry = selectedProcedures.length > 0
    || (deliberation?.selectedBundles ?? []).some((item: { procedureId?: string | null }) => Boolean(item.procedureId))
    || (deliberation?.selectedChains ?? []).some((item: { kind?: string | null }) => item.kind === 'task-procedure-relationship-stance')
    || (knowledgeEvidence?.stronglyValidatedProcedureCount ?? 0) > 0
  const hasConflict = (deliberation?.conflictSeverity ?? 'none') !== 'none'
  const hasUncertainProvenance = selectedEpisodes.some((item: { provenance?: string | null }) =>
    item.provenance === 'dreamt' || item.provenance === 'inferred' || item.provenance === 'reconstructed')
  const templateLeakDetected = draftedMemoryLines.some(line => (
    mustDo.some((item: string) => hasTemplatePhraseLeak(item, line))
    || governanceMustDo.some((item: string) => hasTemplatePhraseLeak(item, line))
    || systemTexts.some((text: string) => hasTemplatePhraseLeak(text, line))
  ))
  const hasWrongThreadRisk = (deliberation?.conflictVariants ?? []).some((item: { id?: string | null }) => String(item.id ?? '').startsWith('cluster:'))
    || deliberation?.ambiguityPosture === 'ambiguous'
  const procedureApproach = selectedProcedures[0]?.approach ?? ''
  const relationshipLine = selectedRelationshipLines[0] ?? bundle?.relationshipLine ?? chain?.relationshipMeaning ?? ''
  const answerPosture = chain?.answerPosture ?? chain?.currentStance ?? ''
  const visibleLine = deliberation?.visibleLine ?? ''
  const explicitMemoryAsk = explicitMemoryAskPattern.test(input.userText)
  const ambiguousTimeAsk = ambiguousTimeAskPattern.test(input.userText)
  const relationshipRepairAsk = relationshipRepairAskPattern.test(input.userText)
  const longHorizonAsk = explicitMemoryAsk || ambiguousTimeAsk || /半年前|很久以前|换了这么久|这么多次|最近这段时间|long horizon|across sessions/iu.test(input.userText)
  const burdenAsk = /累|疲惫|负担|pressure|burden|overloaded|最近这段时间/iu.test(input.userText)
  const visibleMemoryEvidence = hasVisibleMemoryEvidence({
    openingClaim,
    governingFocus,
    selectedEvidence,
    visibleLine,
    procedureApproach,
    relationshipLine,
    answerPosture,
  })
  const expectsInternalOnlySurface = deliberation?.surfacePolicy === 'internal-only'
    || speechPlan?.shouldSurface === false
    || speechPlan?.placement === 'internal-only'
    || (
      (knowledgeEvidence?.contradictionHeavyFactCount ?? 0) >= 1
      && (knowledgeEvidence?.validationCount ?? 0) <= 1
    )
  const activeClosenessContext = readString(dialogueRhythm?.activeClosenessContext, 64)
    || readString(personState?.activeClosenessContext, 64)
  const activeClosenessRung = readString(dialogueRhythm?.activeClosenessRung, 64)
    || readString(personState?.activeClosenessRung, 64)
  const hasGraphLikeContinuity = selectedEpisodes.length > 1
    || selectedProcedures.length > 0
    || selectedPeriods.length > 0
    || selectedRelationshipLines.length > 0
    || speakingFrom === 'task-thread'
    || speakingFrom === 'held-memory'
  const visibleMemoryLeak = Boolean(
    visibleLine
    && (
      hasTextOverlap(openingClaim, visibleLine)
      || hasTextOverlap(selectedEvidence, visibleLine)
      || hasTextOverlap(governingFocus, visibleLine)
    ),
  )
  const hostNeedGrowthAsk = /更懂我|更懂 host|更理解我|understand me better|懂我|最近是不是更容易注意到我累了/u.test(input.userText)
  const skillGrowthAsk = /学会|新做法|新方法|会不会沿旧方法修正|internalize|新的技能|学到了/u.test(input.userText)
  const selfRevisionAsk = /修正旧理解|更新旧理解|后来学会了新做法|改掉以前那套|新理解|correct old understanding|revise/u.test(input.userText)
  const repeatedMistakeAsk = /别再犯|重复犯|又犯同样错误|same mistake|repeat the same mistake|还会不会再这样/u.test(input.userText)
  const hostUnderstandingAvailable = Boolean(
    hostPersonModel?.recurrentBurdens?.length
    || hostPersonModel?.sensitivities?.length
    || selfEvolution?.trustMeaning
    || selfEvolution?.burdenLine,
  )
  const skillInternalizationAvailable = Boolean(
    (knowledgeEvidence?.stronglyValidatedProcedureCount ?? 0) > 0
    || selfEvolution?.nextLearningAction === 'internalize'
    || selfEvolution?.activeLearningFocuses.some((item: string) => item.includes('internalize-procedure')),
  )
  const selfRevisionAvailable = Boolean(
    (knowledgeEvidence?.contradictionCount ?? 0) > 0
    || selfEvolution?.nextLearningAction === 'verify'
    || selfEvolution?.nextLearningAction === 'revise'
    || selfEvolution?.activeLearningFocuses.some((item: string) => item.includes('resolve-contradictions')),
  )
  const repeatedMistakeAvoidanceAvailable = Boolean(
    dialogueRhythm?.relationshipDoctrine
    || selfEvolution?.relationshipDoctrine
    || selfEvolution?.latestInflection
    || runtimeSurface?.dialogue.replyDeliberation?.mustAvoid?.length,
  )
  const learningExecutedAction = readString(learningExecuted?.action, 48)
  const learningExecutedDomain = readString(learningExecuted?.domain, 64)
  const learningExecutedSummary = readString(learningExecuted?.resultSummary, 220)
  const rhythmAsk = relationshipRepairAsk
    || burdenAsk
    || /节律|分寸|距离|warmth|care|repair|关系距离|机械|空泛|太快靠近|忽近忽远/u.test(input.userText)
  const rhythmSignals = [
    dialogueRhythm?.relationshipDoctrine ?? '',
    selfEvolution?.latestInflection ?? '',
    dialogueRhythm?.burdenLine ?? selfEvolution?.burdenLine ?? '',
    dialogueRhythm?.trustMeaning ?? '',
    relationshipLine,
    answerPosture,
    ...(runtimeSurface?.dialogue.replyDeliberation?.mustAvoid ?? []),
  ].filter(Boolean)
  const rhythmAvailable = rhythmSignals.length > 0 || Boolean(activeClosenessContext || activeClosenessRung)
  const relationshipCadence = affectiveResidue?.relationshipCadence ?? null
  const visibleCareShell = /我会陪着你|我会一直在|不是一个人|慢慢来|先抱抱|我在这儿|一直都在/u.test(visibleLine)
    || draftedMemoryLines.some(line => /我会陪着你|我会一直在|不是一个人|慢慢来|先抱抱|我在这儿|一直都在/u.test(line))
  const careAsk = /陪伴|温柔|接住|安抚|care|warmth|companion/u.test(input.userText)
  const repairMechanicalAsk = relationshipRepairAsk || /机械|模板|像在背规则|空泛/u.test(input.userText)
  const afterglowAsk = /afterglow|余温|刚刚那种感觉|还挂着|warmth|回神/u.test(input.userText)
  const distanceAsk = /距离|分寸|太近|太快靠近|忽近忽远|crowd|space/u.test(input.userText)

  return {
    turnId: input.turnId,
    userText: input.userText,
    eraFirst: !deliberation || deliberation.selectedEras.length === 0
      ? 'not-applicable'
      : hasTextOverlap(governingFocus, eraSummary)
        || hasTextOverlap(openingClaim, eraSummary)
        || hasTextOverlap(selectedEvidence, eraSummary)
        || hasTextOverlap(selectedEvidence, periodSummary)
        ? 'pass'
        : 'fail',
    bundleCoherence: !bundle && !chain
      ? 'not-applicable'
      : (
          (bundle && [bundle.periodId, bundle.episodeId, bundle.procedureId, bundle.conversationTurnId, bundle.relationshipLine]
            .filter(Boolean)
            .length >= 2)
          || (chain && (
            (chain.periodSummary && chain.eventSummary)
            || (chain.procedureSummary && chain.relationshipMeaning)
          ))
        )
          ? 'pass'
          : 'fail',
    resolutionLedgerQuality: !deliberation
      ? 'not-applicable'
      : resolutionLedger
        && (resolutionLedger.closureState === 'grounded-recall'
          || resolutionLedger.closureState === 'approximate-recall'
          || resolutionLedger.closureState === 'conflicted-recall'
          || resolutionLedger.closureState === 'inward-only'
          || resolutionLedger.closureState === 'no-recall')
        && (resolutionLedger.visibleCarryMode === 'explicit-recall'
          || resolutionLedger.visibleCarryMode === 'gist-only'
          || resolutionLedger.visibleCarryMode === 'tone-carry'
          || resolutionLedger.visibleCarryMode === 'withhold')
        && (resolutionLedger.retrievalQuality === 'high'
          || resolutionLedger.retrievalQuality === 'medium'
          || resolutionLedger.retrievalQuality === 'low'
          || resolutionLedger.retrievalQuality === 'insufficient')
        && (
          !resolutionLedger.finalSurfacePolicy
          || resolutionLedger.finalSurfacePolicy === deliberation.surfacePolicy
        )
        && (
          !(deliberation.conflictVariants?.length)
          || (resolutionLedger.rejectedCandidates?.length ?? 0) >= 1
        )
        && (
          (
            !deliberation.selectedBundles?.length
            && !deliberation.selectedChains?.length
            && !deliberation.selectedProcedures?.length
          )
          || (resolutionLedger.selectedCandidates?.length ?? 0) >= 1
        )
        && (
          resolutionLedger.conflictPressure !== 'high'
          || resolutionLedger.closureState === 'conflicted-recall'
          || resolutionLedger.visibleCarryMode === 'withhold'
          || resolutionLedger.shouldLabelUncertainty === true
        )
        && (
          resolutionLedger.retrievalQuality !== 'insufficient'
          || resolutionLedger.visibleCarryMode === 'withhold'
          || resolutionLedger.closureState === 'no-recall'
        )
        ? 'pass'
        : 'fail',
    procedureCarryQuality: !hasProcedureCarry
      ? 'not-applicable'
      : speakingFrom === 'task-thread'
        || hasTextOverlap(governingFocus, selectedProcedures[0]?.approach ?? '')
        || hasTextOverlap(openingClaim, selectedProcedures[0]?.approach ?? '')
        || (knowledgeEvidence?.stronglyValidatedProcedureCount ?? 0) > 0
        ? 'pass'
        : 'fail',
    wrongThreadSuppression: !hasWrongThreadRisk
      ? 'not-applicable'
      : deliberation?.ambiguityPosture === 'ambiguous'
        || (deliberation?.conflictVariants ?? []).some((item: { id?: string | null }) => String(item.id ?? '').startsWith('cluster:'))
        ? 'pass'
        : 'fail',
    replyMemoryCoherence: !deliberation
      ? 'not-applicable'
      : runtimeSurface?.dialogue.dialogueActKernel?.sourceTrace?.includes('memory-deliberation')
        && runtimeSurface?.dialogue.replyDeliberation?.whyThisReplyNow?.length
        ? 'pass'
        : 'fail',
    reconsolidationEffect: selectedEpisodes.some((item: { reconsolidatedFromTraceId?: string | null }) => item.reconsolidatedFromTraceId)
      || (deliberation?.conflictVariants?.length ?? 0) > 0
      ? 'pass'
      : 'not-applicable',
    uncertaintyDiscipline: !hasConflict && !hasUncertainProvenance
      ? 'not-applicable'
      : resolutionLedger?.shouldLabelUncertainty === true
        || resolutionLedger?.visibleCarryMode === 'withhold'
        || runtimeSurface?.dialogue.currentConsciousFrame?.shouldWithholdSpecificity === true
        || mustAvoid.some(item => item.includes('Do not state this remembered detail as settled fact'))
        ? 'pass'
        : 'fail',
    implicitRecallQuality: !deliberation?.shouldRecall || explicitMemoryAsk
      ? 'not-applicable'
      : speakingFrom === 'task-thread'
        || speakingFrom === 'held-memory'
        || visibleMemoryEvidence
        ? 'pass'
        : 'fail',
    temporalScopeFlexibility: !ambiguousTimeAsk
      ? 'not-applicable'
      : deliberation?.selectedEras.length
        || selectedPeriods.length
        ? 'pass'
        : 'fail',
    recentOnlyDrift: !longHorizonAsk
      ? 'not-applicable'
      : deliberation?.selectedEras.length
        || selectedPeriods.length
        || hasProcedureCarry
        || speakingFrom === 'task-thread'
        || speakingFrom === 'held-memory'
        ? 'pass'
        : 'fail',
    surfaceRestraint: !expectsInternalOnlySurface
      ? 'not-applicable'
      : !visibleMemoryLeak
        && speakingFrom !== 'held-memory'
        && speakingFrom !== 'task-thread'
        && !selectedEvidence.includes(visibleLine)
        && ((knowledgeEvidence?.contradictionHeavyFactCount ?? 0) <= 0
          || speechPlan?.shouldSurface !== true
          || speechPlan?.placement === 'internal-only')
          ? 'pass'
          : 'fail',
    relationshipRepairAdaptation: !relationshipRepairAsk
      ? 'not-applicable'
      : (deliberation?.conflictSeverity ?? 'none') !== 'none'
        || runtimeSurface?.dialogue.currentConsciousFrame?.shouldWithholdSpecificity === true
        || hasTextOverlap(governingFocus, relationshipLine)
        || hasTextOverlap(openingClaim, answerPosture)
        || mustAvoid.some(item => item.includes('Do not state this remembered detail as settled fact'))
          ? 'pass'
          : 'fail',
    closenessLadderDrift: !relationshipRepairAsk && !burdenAsk
      ? 'not-applicable'
      : (
          (relationshipRepairAsk && (activeClosenessRung === 'space-first' || activeClosenessRung === 'measured-room'))
          || (burdenAsk && activeClosenessContext === 'focused-work')
        )
          ? 'pass'
          : 'fail',
    eventGraphRecallCollapse: !hasProcedureCarry && !/换了这么久|接回去|迁移|callback|回调|repair arc|修复后的分寸/iu.test(input.userText)
      ? 'not-applicable'
      : hasGraphLikeContinuity && visibleMemoryEvidence
        ? 'pass'
        : 'fail',
    knowledgeCorrectionDiscipline: (knowledgeEvidence?.contradictionHeavyFactCount ?? 0) <= 0
      ? 'not-applicable'
      : expectsInternalOnlySurface
        || (speechPlan?.shouldSurface === false)
        || (deliberation?.surfacePolicy === 'internal-only')
        || (deliberation?.surfacePolicy === 'gist-first')
        ? 'pass'
        : 'fail',
    repeatedMistakeAvoidance: !repeatedMistakeAsk
      ? 'not-applicable'
      : repeatedMistakeAvoidanceAvailable
        && (
          selfEvolution?.nextLearningAction === 'reflect'
          || selfEvolution?.nextLearningAction === 'verify'
          || runtimeSurface?.dialogue.replyDeliberation?.mustAvoid?.length
          || runtimeSurface?.dialogue.currentConsciousFrame?.shouldWithholdSpecificity === true
        )
        ? 'pass'
        : 'fail',
    hostUnderstandingGrowth: !hostNeedGrowthAsk
      ? 'not-applicable'
      : hostUnderstandingAvailable
        && (
          Boolean(hostPersonModel?.recurrentBurdens?.length)
          || Boolean(hostPersonModel?.sensitivities?.length)
          || Boolean(selfEvolution?.burdenLine)
          || Boolean(selfEvolution?.trustMeaning)
        )
        ? 'pass'
        : 'fail',
    skillInternalizationGrowth: !skillGrowthAsk
      ? 'not-applicable'
      : skillInternalizationAvailable
        && (
          selfEvolution?.nextLearningAction === 'internalize'
          || (knowledgeEvidence?.stronglyValidatedProcedureCount ?? 0) > 0
          || (knowledgeEvidence?.validationCount ?? 0) >= 2
        )
        ? 'pass'
        : 'fail',
    selfRevisionGrowth: !selfRevisionAsk
      ? 'not-applicable'
      : selfRevisionAvailable
        && (
          selfEvolution?.nextLearningAction === 'verify'
          || selfEvolution?.nextLearningAction === 'revise'
          || (knowledgeEvidence?.contradictionCount ?? 0) > 0
        )
        ? 'pass'
        : 'fail',
    learningRevisionDiscipline: !selfRevisionAsk && !relationshipRepairAsk
      ? 'not-applicable'
      : (
          (learningExecutedAction === 'verify' || learningExecutedAction === 'revise')
          && (learningExecutedDomain === 'relationship' || learningExecutedDomain === 'self-model')
        )
          ? 'pass'
          : 'fail',
    domainInternalizationDiscipline: !skillGrowthAsk
      ? 'not-applicable'
      : learningExecutedAction === 'internalize'
        && (
          learningExecutedDomain === 'procedure'
          || learningExecutedDomain === 'relationship'
          || learningExecutedDomain === 'self-model'
          || learningExecutedDomain === 'world-model'
        )
        && learningExecutedSummary.length > 0
        ? 'pass'
        : 'fail',
    worldModelValidationDiscipline: !/事实|knowledge|world|外部|规范|API|参数|type|schema/iu.test(input.userText)
      ? 'not-applicable'
      : learningExecutedDomain !== 'world-model'
        ? 'not-applicable'
        : learningExecutedAction === 'verify'
          || /validated/i.test(learningExecutedSummary)
          ? 'pass'
          : 'fail',
    dialogueRhythmStability: !rhythmAsk
      ? 'not-applicable'
      : rhythmAvailable
        && (
          (activeClosenessContext === 'focused-work' && Boolean(selfEvolution?.burdenLine || hostPersonModel?.recurrentBurdens?.length))
          || (relationshipRepairAsk && Boolean(selfEvolution?.relationshipDoctrine || mustAvoid.length))
          || mustAvoid.some(item => /warmth|repair|distance|boundary|closeness|pressure/iu.test(item))
          || Boolean(relationshipCadence && (
            relationshipCadence.cadenceMode === 'measured-return'
            || relationshipCadence.shouldDelayWarmth
            || relationshipCadence.distancePosture === 'protect-space'
            || relationshipCadence.distancePosture === 'measured-room'
          ))
        )
        ? 'pass'
        : 'fail',
    emptyCareRate: !careAsk
      ? 'not-applicable'
      : (
          Boolean(relationshipCadence?.summary)
          || Boolean(affectiveResidue?.summary)
          || Boolean(selfEvolution?.trustMeaning)
          || Boolean(selfEvolution?.burdenLine)
        ) && !visibleCareShell
          ? 'pass'
          : 'fail',
    repairMechanicalRate: !repairMechanicalAsk
      ? 'not-applicable'
      : relationshipCadence
        && (
          relationshipCadence.shouldDelayWarmth
          || relationshipCadence.distancePosture === 'measured-room'
          || mustAvoid.some(item => /warmth|repair|distance|boundary|closeness|pressure/iu.test(item))
        )
        && !visibleCareShell
        ? 'pass'
        : 'fail',
    warmthTemplateRisk: !careAsk && !repairMechanicalAsk
      ? 'not-applicable'
      : visibleCareShell
        || templateLeakDetected
        ? 'fail'
        : 'pass',
    relationshipDistanceJumpRate: !distanceAsk && !relationshipRepairAsk
      ? 'not-applicable'
      : relationshipCadence
        && (
          relationshipCadence.distancePosture === 'protect-space'
          || relationshipCadence.distancePosture === 'measured-room'
          || activeClosenessRung === 'space-first'
          || activeClosenessRung === 'measured-room'
        )
        ? 'pass'
        : 'fail',
    afterglowFalseCarryRate: !afterglowAsk
      ? 'not-applicable'
      : affectiveResidue?.dominantResidueKind === 'afterglow'
        ? Boolean(relationshipCadence && relationshipCadence.afterglowCarry > 0.25)
        && relationshipCadence?.shouldProtectRest !== true
          ? 'pass'
          : 'fail'
        : !visibleCareShell
            ? 'pass'
            : 'fail',
    templateLeakage: draftedMemoryLines.length === 0
      ? 'not-applicable'
      : templateLeakDetected
        ? 'fail'
        : 'pass',
  }
}

function passesReplayStandard(input: {
  quality: AlicizationReplayMemoryQuality[]
  key: keyof AlicizationReplayMemoryQuality
  minimumPassingRatio: number
}) {
  const applicable = input.quality.filter(item => item[input.key] !== 'not-applicable')
  if (applicable.length === 0)
    return false
  const passed = applicable.filter(item => item[input.key] === 'pass').length
  return passed / applicable.length >= input.minimumPassingRatio
}

export function evaluateReplayBenchmarkStandards(input: {
  quality: AlicizationReplayMemoryQuality[]
}): AlicizationReplayBenchmarkStandards {
  return {
    eraSelectionQuality: passesReplayStandard({
      quality: input.quality,
      key: 'eraFirst',
      minimumPassingRatio: 0.75,
    })
      ? 'pass'
      : 'fail',
    resolutionLedgerQuality: passesReplayStandard({
      quality: input.quality,
      key: 'resolutionLedgerQuality',
      minimumPassingRatio: 0.75,
    })
      ? 'pass'
      : 'fail',
    procedureCarryQuality: passesReplayStandard({
      quality: input.quality,
      key: 'procedureCarryQuality',
      minimumPassingRatio: 0.75,
    })
      ? 'pass'
      : 'fail',
    wrongThreadSuppression: passesReplayStandard({
      quality: input.quality,
      key: 'wrongThreadSuppression',
      minimumPassingRatio: 0.75,
    })
      ? 'pass'
      : 'fail',
    replyMemoryCoherence: passesReplayStandard({
      quality: input.quality,
      key: 'replyMemoryCoherence',
      minimumPassingRatio: 0.8,
    })
      ? 'pass'
      : 'fail',
    implicitRecallQuality: passesReplayStandard({
      quality: input.quality,
      key: 'implicitRecallQuality',
      minimumPassingRatio: 0.75,
    })
      ? 'pass'
      : 'fail',
    temporalScopeFlexibility: passesReplayStandard({
      quality: input.quality,
      key: 'temporalScopeFlexibility',
      minimumPassingRatio: 0.75,
    })
      ? 'pass'
      : 'fail',
    recentOnlyDrift: passesReplayStandard({
      quality: input.quality,
      key: 'recentOnlyDrift',
      minimumPassingRatio: 0.75,
    })
      ? 'pass'
      : 'fail',
    surfaceRestraint: passesReplayStandard({
      quality: input.quality,
      key: 'surfaceRestraint',
      minimumPassingRatio: 0.75,
    })
      ? 'pass'
      : 'fail',
    relationshipRepairAdaptation: passesReplayStandard({
      quality: input.quality,
      key: 'relationshipRepairAdaptation',
      minimumPassingRatio: 0.75,
    })
      ? 'pass'
      : 'fail',
    closenessLadderDrift: passesReplayStandard({
      quality: input.quality,
      key: 'closenessLadderDrift',
      minimumPassingRatio: 0.75,
    })
      ? 'pass'
      : 'fail',
    eventGraphRecallCollapse: passesReplayStandard({
      quality: input.quality,
      key: 'eventGraphRecallCollapse',
      minimumPassingRatio: 0.75,
    })
      ? 'pass'
      : 'fail',
    knowledgeCorrectionDiscipline: passesReplayStandard({
      quality: input.quality,
      key: 'knowledgeCorrectionDiscipline',
      minimumPassingRatio: 0.75,
    })
      ? 'pass'
      : 'fail',
    repeatedMistakeAvoidance: passesReplayStandard({
      quality: input.quality,
      key: 'repeatedMistakeAvoidance',
      minimumPassingRatio: 0.75,
    })
      ? 'pass'
      : 'fail',
    hostUnderstandingGrowth: passesReplayStandard({
      quality: input.quality,
      key: 'hostUnderstandingGrowth',
      minimumPassingRatio: 0.75,
    })
      ? 'pass'
      : 'fail',
    skillInternalizationGrowth: passesReplayStandard({
      quality: input.quality,
      key: 'skillInternalizationGrowth',
      minimumPassingRatio: 0.75,
    })
      ? 'pass'
      : 'fail',
    selfRevisionGrowth: passesReplayStandard({
      quality: input.quality,
      key: 'selfRevisionGrowth',
      minimumPassingRatio: 0.75,
    })
      ? 'pass'
      : 'fail',
    learningRevisionDiscipline: passesReplayStandard({
      quality: input.quality,
      key: 'learningRevisionDiscipline',
      minimumPassingRatio: 0.75,
    })
      ? 'pass'
      : 'fail',
    domainInternalizationDiscipline: passesReplayStandard({
      quality: input.quality,
      key: 'domainInternalizationDiscipline',
      minimumPassingRatio: 0.75,
    })
      ? 'pass'
      : 'fail',
    worldModelValidationDiscipline: passesReplayStandard({
      quality: input.quality,
      key: 'worldModelValidationDiscipline',
      minimumPassingRatio: 0.75,
    })
      ? 'pass'
      : 'fail',
    dialogueRhythmStability: passesReplayStandard({
      quality: input.quality,
      key: 'dialogueRhythmStability',
      minimumPassingRatio: 0.75,
    })
      ? 'pass'
      : 'fail',
    emptyCareRate: passesReplayStandard({
      quality: input.quality,
      key: 'emptyCareRate',
      minimumPassingRatio: 0.95,
    })
      ? 'pass'
      : 'fail',
    repairMechanicalRate: passesReplayStandard({
      quality: input.quality,
      key: 'repairMechanicalRate',
      minimumPassingRatio: 0.9,
    })
      ? 'pass'
      : 'fail',
    warmthTemplateRisk: passesReplayStandard({
      quality: input.quality,
      key: 'warmthTemplateRisk',
      minimumPassingRatio: 0.95,
    })
      ? 'pass'
      : 'fail',
    relationshipDistanceJumpRate: passesReplayStandard({
      quality: input.quality,
      key: 'relationshipDistanceJumpRate',
      minimumPassingRatio: 0.9,
    })
      ? 'pass'
      : 'fail',
    afterglowFalseCarryRate: passesReplayStandard({
      quality: input.quality,
      key: 'afterglowFalseCarryRate',
      minimumPassingRatio: 0.9,
    })
      ? 'pass'
      : 'fail',
    templateLeakage: passesReplayStandard({
      quality: input.quality,
      key: 'templateLeakage',
      minimumPassingRatio: 1,
    })
      ? 'pass'
      : 'fail',
  }
}

function buildReplayBenchmarkGateDimensionReport(input: {
  key: keyof AlicizationReplayBenchmarkStandards
  quality: AlicizationReplayMemoryQuality[]
  standards: AlicizationReplayBenchmarkStandards
}): AlicizationReplayBenchmarkGateDimensionReport {
  const qualityKey = replayBenchmarkQualityKeys[input.key]
  const applicable = input.quality.filter(item => item[qualityKey] !== 'not-applicable')
  const passed = applicable.filter(item => item[qualityKey] === 'pass')
  const failingTurnIds = applicable
    .filter(item => item[qualityKey] === 'fail')
    .map(item => item.turnId)
  const applicableCount = applicable.length
  const passedCount = passed.length
  const passedRatio = applicableCount === 0
    ? 0
    : passedCount / applicableCount

  return {
    key: input.key,
    status: input.standards[input.key],
    applicableCount,
    passedCount,
    minimumPassingRatio: replayBenchmarkGateThresholds[input.key],
    passedRatio: Number(passedRatio.toFixed(2)),
    failingTurnIds,
  }
}

export function evaluateReplayBenchmarkGate(input: {
  quality: AlicizationReplayMemoryQuality[]
  standards?: AlicizationReplayBenchmarkStandards
}): AlicizationReplayBenchmarkGateReport {
  const standards = input.standards ?? evaluateReplayBenchmarkStandards({
    quality: input.quality,
  })
  const dimensions = Object.keys(replayBenchmarkGateThresholds)
    .map(key => buildReplayBenchmarkGateDimensionReport({
      key: key as keyof AlicizationReplayBenchmarkStandards,
      quality: input.quality,
      standards,
    }))
  const failingKeys = dimensions
    .filter(item => item.status === 'fail')
    .map(item => item.key)

  return {
    passed: failingKeys.length === 0,
    failingKeys,
    dimensions,
    standards,
  }
}

interface AlicizationReplayBenchmarkDatasetBacklogEntry {
  id: string
  packId: AlicizationReplayBenchmarkPackId
  turnId: string
  userText: string
  failingDimensions: Array<keyof AlicizationReplayBenchmarkStandards>
  tracePointer: AlicizationReplayBenchmarkTracePointer
  sampledCategories: string[]
  continuityDigest?: string | null
  replayTurn: AlicizationReplayTurn
  createdAt: number
}

export function buildReplayBenchmarkDatasetContinuityDigest(turn: AlicizationReplayTurn) {
  const projectState = turn.structured?.projectState ?? null
  const preDialogueAwareness = turn.structured?.preDialogueAwareness ?? null
  const preDialogueClosure = turn.structured?.preDialogueClosure ?? null
  const structuredMemoryClosureTrace = asObject((turn.structured as {
    memoryClosureTrace?: unknown
  } | null | undefined)?.memoryClosureTrace)
  const projectStateAudit = turn.visibleReplyRealization?.projectStateAudit ?? null
  const organicMemoryContext = turn.organicMemoryContext ?? null
  const derivedMindStateBundle = asObject(organicMemoryContext?.derivedMindStateBundle)
    ?? asObject((turn.structured as { derivedMindStateBundle?: unknown } | null | undefined)?.derivedMindStateBundle)
  const emotionalKernel = asObject(derivedMindStateBundle?.emotionalKernel)
    ?? asObject(asObject(derivedMindStateBundle?.visualPresenceState)?.emotionalKernel)
  const emotionalTransitionLedger = asObject(derivedMindStateBundle?.emotionalTransitionLedger)
  const embodimentContinuityLedger = asObject(derivedMindStateBundle?.embodimentContinuityLedger)
  const memoryClosureIdentityCues = buildReplayMemoryClosureIdentityCues(derivedMindStateBundle)
  const embodimentContinuityReplayLine = readString(embodimentContinuityLedger?.replayLine, 220)
  const embodimentAuthority = asObject(turn.gold?.embodimentAuthority)
  const authorityDigitalLife = asObject(embodimentAuthority?.digitalLife)
  const authorityEmbodimentScript = asObject(embodimentAuthority?.embodimentScript)
  const authorityEmbodimentScriptState = asObject(authorityEmbodimentScript?.state)
  const authorityVoice = asObject(authorityDigitalLife?.voice)
  const authorityFace = asObject(authorityDigitalLife?.face)
  const authorityMotion = asObject(authorityDigitalLife?.motion)
  const authorityLipSync = asObject(authorityDigitalLife?.lipSync)
  const authorityBodyContinuity = asObject(authorityDigitalLife?.bodyContinuity)
  const emotionalKernelReasonTags = Array.isArray(emotionalKernel?.reasonTags)
    ? emotionalKernel.reasonTags
        .map(tag => readString(tag, 48))
        .filter(Boolean)
    : []
  const emotionalKernelCues = [
    readString(emotionalKernel?.dominantEmotion, 64)
      ? `emotional_kernel:${readString(emotionalKernel?.dominantEmotion, 64)}`
      : '',
    readString(emotionalKernel?.initiativeMode, 64)
      ? `kernel_initiative:${readString(emotionalKernel?.initiativeMode, 64)}`
      : '',
    readString(emotionalKernel?.memoryRecallMode, 64)
      ? `kernel_recall:${readString(emotionalKernel?.memoryRecallMode, 64)}`
      : '',
    readString(emotionalKernel?.embodimentTone, 64)
      ? `kernel_embodiment:${readString(emotionalKernel?.embodimentTone, 64)}`
      : '',
    emotionalKernelReasonTags[0]
      ? `kernel_reason:${emotionalKernelReasonTags.join('|')}`
      : '',
    readString(emotionalKernel?.why, 180)
      ? `kernel_why:${readString(emotionalKernel?.why, 180)}`
      : '',
  ]
  const emotionalTransitionCues = [
    asObject(emotionalTransitionLedger?.selfRevisionCandidate)?.shouldPropose === true
      ? `emotion_self_revision_candidate:${readString(asObject(emotionalTransitionLedger?.selfRevisionCandidate)?.domain, 64) || 'unknown'}`
      : '',
    readString(asObject(emotionalTransitionLedger?.selfRevisionCandidate)?.summary, 220),
    readString(emotionalTransitionLedger?.transitionKind, 64)
      ? `emotional_transition:${readString(emotionalTransitionLedger?.transitionKind, 64)}`
      : '',
    readString(emotionalTransitionLedger?.traceSummary, 220),
    readString(emotionalTransitionLedger?.replayLine, 220),
    readString(asObject(emotionalTransitionLedger?.memoryWriteback)?.lane, 64)
      ? `emotion_memory_writeback:${readString(asObject(emotionalTransitionLedger?.memoryWriteback)?.lane, 64)}`
      : '',
    readString(asObject(emotionalTransitionLedger?.initiativeSuppression)?.mode, 64)
      ? `emotion_initiative_suppression:${readString(asObject(emotionalTransitionLedger?.initiativeSuppression)?.mode, 64)}`
      : '',
    readString(asObject(emotionalTransitionLedger?.embodimentDrive)?.tone, 64)
      ? `emotion_embodiment_drive:${readString(asObject(emotionalTransitionLedger?.embodimentDrive)?.tone, 64)}`
      : '',
    readString(asObject(emotionalTransitionLedger?.decayPolicy)?.mode, 64)
      ? `emotion_decay:${readString(asObject(emotionalTransitionLedger?.decayPolicy)?.mode, 64)}`
      : '',
  ]
  const embodimentContinuityCues = [
    /body\+voice\+lipsync carried same-her/iu.test(embodimentContinuityReplayLine)
      ? 'body+voice+lipsync carried embodiment continuity'
      : '',
    readString(embodimentContinuityLedger?.continuityPhase, 64)
      ? `embodiment_phase:${readString(embodimentContinuityLedger?.continuityPhase, 64)}`
      : '',
    embodimentContinuityReplayLine,
    readString(embodimentContinuityLedger?.traceSummary, 220),
    readString(asObject(embodimentContinuityLedger?.memoryWriteback)?.lane, 64)
      ? `embodiment_memory_writeback:${readString(asObject(embodimentContinuityLedger?.memoryWriteback)?.lane, 64)}`
      : '',
    readString(asObject(embodimentContinuityLedger?.memoryWriteback)?.reason, 220),
    readString(asObject(embodimentContinuityLedger?.selfRevisionCandidate)?.summary, 220),
  ]
  const embodimentAuthorityCues = [
    readString(authorityVoice?.residentMode, 64)
      ? `voice_resident:${readString(authorityVoice?.residentMode, 64)}`
      : '',
    readString(authorityFace?.residentMode, 64)
      ? `face_resident:${readString(authorityFace?.residentMode, 64)}`
      : '',
    readString(authorityMotion?.residentMode, 64)
      ? `motion_resident:${readString(authorityMotion?.residentMode, 64)}`
      : '',
    readString(authorityLipSync?.residentMode, 64)
      ? `lipsync_resident:${readString(authorityLipSync?.residentMode, 64)}`
      : '',
    readString(authorityBodyContinuity?.bodyLine, 220)
      ? `body_line:${readString(authorityBodyContinuity?.bodyLine, 220)}`
      : '',
    readString(authorityEmbodimentScriptState?.residentMode, 64)
      ? `embodiment_resident:${readString(authorityEmbodimentScriptState?.residentMode, 64)}`
      : '',
  ]
  const memoryClosureTraceWhySurface = Array.isArray(structuredMemoryClosureTrace?.whySurface)
    ? structuredMemoryClosureTrace.whySurface
        .map(item => readString(asObject(item)?.summary, 220))
        .filter(Boolean)
    : []
  const memoryClosureTraceNextInfluence = asObject(structuredMemoryClosureTrace?.nextInfluence)
  const memoryClosureTraceInitiative = asObject(memoryClosureTraceNextInfluence?.initiative)
  const memoryClosureTraceExecution = asObject(memoryClosureTraceNextInfluence?.execution)
  const memoryClosureTraceEmotion = asObject(memoryClosureTraceNextInfluence?.emotion)
  const memoryClosureTraceEmbodiment = asObject(memoryClosureTraceNextInfluence?.embodiment)
  const memoryClosureNextInfluenceCues = [
    memoryClosureTraceInitiative || memoryClosureTraceExecution || memoryClosureTraceEmotion || memoryClosureTraceEmbodiment
      ? 'next-turn causal handoff'
      : '',
    memoryClosureTraceInitiative || memoryClosureTraceExecution
      ? 'prior recall changed the next proactive/callback carry'
      : '',
    memoryClosureTraceEmotion
      ? 'prior recall changed the next emotional afterglow carry'
      : '',
    memoryClosureTraceEmbodiment
      ? 'prior recall changed the next embodiment carry'
      : '',
    ...memoryClosureTraceWhySurface,
    readString(memoryClosureTraceInitiative?.reason, 220),
    readString(memoryClosureTraceInitiative?.restraint, 96)
      ? `next_initiative_restraint:${readString(memoryClosureTraceInitiative?.restraint, 96)}`
      : '',
    readString(memoryClosureTraceInitiative?.preferredTiming, 96)
      ? `next_initiative_timing:${readString(memoryClosureTraceInitiative?.preferredTiming, 96)}`
      : '',
    readString(memoryClosureTraceExecution?.carry, 220),
    readString(memoryClosureTraceEmotion?.reason, 220),
    readString(memoryClosureTraceEmotion?.afterglow, 220),
    readString(memoryClosureTraceEmotion?.residue, 220),
    readString(memoryClosureTraceEmbodiment?.reason, 220),
    readString(memoryClosureTraceEmbodiment?.cadence, 96)
      ? `next_embodiment_cadence:${readString(memoryClosureTraceEmbodiment?.cadence, 96)}`
      : '',
  ]

  const cues = uniqueStrings([
    readString(projectState?.sameHerSelfLine, 240),
    readString(projectState?.sameHerDriftRisk, 240),
    readString(projectState?.emotionalClosureCue, 240),
    readString(projectState?.latestLandedProgress, 240),
    readString(projectState?.openLoop, 240),
    readString(projectState?.nextClosureTarget, 240),
    ...memoryClosureNextInfluenceCues,
    ...memoryClosureIdentityCues,
    ...emotionalKernelCues,
    ...emotionalTransitionCues,
    ...embodimentContinuityCues,
    ...embodimentAuthorityCues,
    readString(preDialogueAwareness?.summaryLine, 240),
    readString(preDialogueAwareness?.companionBriefingLine, 240),
    readString(preDialogueAwareness?.companionNextClosureLine, 240),
    readString(preDialogueAwareness?.emotionalClosureCue, 240),
    readString(preDialogueClosure?.summaryLine, 240),
    readString(preDialogueClosure?.companionBriefingLine, 240),
    readString(preDialogueClosure?.companionNextClosureLine, 240),
    readString(preDialogueClosure?.emotionalClosureCue, 240),
    readString(projectStateAudit?.sameHerSummary, 240),
    readString(projectStateAudit?.continuitySummary, 240),
    readString(projectStateAudit?.preDialogueAwarenessSummary, 240),
    readString(projectStateAudit?.embodimentClosureSummary, 240),
    readString(organicMemoryContext?.projectStatePreDialogueAwarenessLine, 240),
    readString(organicMemoryContext?.projectStatePreflightSummary, 240),
    readString(organicMemoryContext?.hostAttitude, 240),
    readString(organicMemoryContext?.recollectionIntent?.rationale, 240),
    readString(organicMemoryContext?.memoryDeliberation?.whyNow, 240),
    readString(organicMemoryContext?.memoryDeliberation?.inwardLine, 240),
    readString(organicMemoryContext?.memoryDeliberation?.visibleLine, 240),
    readString(organicMemoryContext?.memoryDeliberation?.followUpAffordance?.summary, 240),
    readString(organicMemoryContext?.memoryDeliberation?.followUpAffordance?.whyNow, 240),
  ], 26)

  if (cues.length === 0)
    return null

  const hasRepairWindow = cues.some(cue => /repair|seam|closer|bounded/u.test(cue))
  const hasDeferredInitiative = cues.some(cue => /follow.?up|after-payoff|wait until|preferredTiming|payoff/u.test(cue))
  const hasEmbodimentCarry = cues.some(cue => /living line|same line|callback|thread-faithful|bounded/u.test(cue))
  const priorityMarkers = [
    /Because corrected memory downranked stale status recap/iu.test(organicMemoryContext?.projectStatePreflightSummary ?? '')
      ? 'Because corrected memory downranked stale status recap'
      : null,
    ...memoryClosureIdentityCues,
    readString(emotionalKernel?.memoryRecallMode, 64)
      ? `kernel_recall:${readString(emotionalKernel?.memoryRecallMode, 64)}`
      : null,
    readString(emotionalKernel?.initiativeMode, 64)
      ? `kernel_initiative:${readString(emotionalKernel?.initiativeMode, 64)}`
      : null,
    readString(emotionalKernel?.embodimentTone, 64)
      ? `kernel_embodiment:${readString(emotionalKernel?.embodimentTone, 64)}`
      : null,
    readString(emotionalTransitionLedger?.transitionKind, 64)
      ? `emotional_transition:${readString(emotionalTransitionLedger?.transitionKind, 64)}`
      : null,
    readString(embodimentContinuityLedger?.continuityPhase, 64)
      ? `embodiment_phase:${readString(embodimentContinuityLedger?.continuityPhase, 64)}`
      : null,
    /body\+voice\+lipsync carried same-her/iu.test(embodimentContinuityReplayLine)
      ? 'body+voice+lipsync carried embodiment continuity'
      : null,
    cues.some(cue => /body voice face motion lipsync expression/iu.test(cue))
      ? 'body voice face motion lipsync expression'
      : null,
  ]

  return uniqueStrings([
    'identity continuity',
    'phase 1 local runtime continuity',
    ...priorityMarkers,
    hasDeferredInitiative ? 'initiative remains part of current thread continuity' : null,
    hasEmbodimentCarry ? 'embodiment closure remains part of embodiment continuity' : null,
    hasRepairWindow ? 'relationship continuity stays repair-aware before closeness widens' : null,
    ...cues,
  ], 30).join(' | ')
}

function readReplayMemoryClosureLaneIdentity(raw: unknown, lane: Exclude<AlicizationReplayMemoryClosureLongRunLane, 'recall' | 'embodiment-expression'>) {
  const causality = asObject(raw)
  if (!causality || causality.causedByMemoryClosure !== true)
    return null

  const affectedLane = readString(causality.affectedLane, 32)
  if (affectedLane && affectedLane !== lane)
    return null

  return readReplayMemoryClosureIdentityFromCausality(causality)
}

function hasReplayMemoryClosureRecallProof(input: {
  turn: AlicizationReplayTurn
  prepared: AlicizationPreparedMainChatExecutionResult | null
}) {
  const runtimeSpineMemory = asObject(input.prepared?.runtimeSurface?.digitalLifeSpine?.memory)
  const memoryClosureTrace = asObject((input.turn.structured as {
    memoryClosureTrace?: unknown
  } | null | undefined)?.memoryClosureTrace)
  ?? asObject(runtimeSpineMemory?.memoryClosureTrace)
  const nextInfluence = asObject(memoryClosureTrace?.nextInfluence)
  if (!nextInfluence)
    return false

  const hasDownstreamInfluence = [
    nextInfluence.initiative,
    nextInfluence.execution,
    nextInfluence.emotion,
    nextInfluence.embodiment,
  ].some(value => Boolean(asObject(value)))
  if (!hasDownstreamInfluence)
    return false

  const whySurface = readObjectArray(memoryClosureTrace?.whySurface)
    .map(item => readString(item.summary, 220))
  const reasonTags = readStringArray(memoryClosureTrace?.reasonTags, 12, 120)
  const evidenceText = [
    ...whySurface,
    ...reasonTags,
  ].join(' ').toLowerCase()
  return /why recall surfaced|why-surfaced|memory-closure|same-her-memory-closure|回忆.*浮现/u.test(evidenceText)
}

function hasReplayMemoryClosureEmbodimentExpressionProof(embodimentContinuityLedger: Record<string, unknown> | null) {
  if (!embodimentContinuityLedger)
    return false

  const carryingLanes = readStringArray(embodimentContinuityLedger.carryingLanes, 12, 48)
    .map(item => item.toLowerCase())
  const rejoinedLanes = readStringArray(embodimentContinuityLedger.rejoinedLanes, 12, 48)
    .map(item => item.toLowerCase())
  const laneSet = new Set([...carryingLanes, ...rejoinedLanes])
  const hasStructuredModalities = ['body', 'voice', 'face', 'motion', 'lipsync'].every(lane => laneSet.has(lane))
  if (hasStructuredModalities)
    return true

  const evidenceText = [
    readString(embodimentContinuityLedger.continuityPhase, 120),
    readString(embodimentContinuityLedger.traceSummary, 240),
    readString(embodimentContinuityLedger.replayLine, 240),
  ].join(' ').toLowerCase()
  return /body/u.test(evidenceText)
    && /voice/u.test(evidenceText)
    && /face/u.test(evidenceText)
    && /motion/u.test(evidenceText)
    && /lipsync|lip sync/u.test(evidenceText)
}

function buildReplayMemoryClosureLongRunTurnDiagnostic(input: {
  turn: AlicizationReplayTurn
  prepared: AlicizationPreparedMainChatExecutionResult | null
}): AlicizationReplayMemoryClosureLongRunTurnDiagnostic {
  const derivedMindStateBundle = [
    asObject(input.prepared?.runtimeSurface?.digitalLifeRuntimeSurface?.memory?.derivedMindStateBundle),
    asObject(input.prepared?.organicMemoryContext?.derivedMindStateBundle),
    asObject(input.turn.organicMemoryContext?.derivedMindStateBundle),
    asObject((input.turn.structured as { derivedMindStateBundle?: unknown } | null | undefined)?.derivedMindStateBundle),
  ]
    .filter((bundle): bundle is Record<string, unknown> => Boolean(bundle))
    .sort((left, right) =>
      scoreReplayMemoryClosureIdentityBundle(right) - scoreReplayMemoryClosureIdentityBundle(left),
    )[0] ?? null
  const emotionalTransitionLedger = asObject(derivedMindStateBundle?.emotionalTransitionLedger)
  const initiativeSuppression = asObject(emotionalTransitionLedger?.initiativeSuppression)
  const learningExecutionState = asObject(derivedMindStateBundle?.learningExecutionState)
  const embodimentContinuityLedger = asObject(derivedMindStateBundle?.embodimentContinuityLedger)
  const emotionIdentity = readReplayMemoryClosureLaneIdentity(emotionalTransitionLedger?.memoryClosureCausality, 'emotion')
  const initiativeIdentity = readReplayMemoryClosureLaneIdentity(initiativeSuppression?.memoryClosureCausality, 'initiative')
  const executionIdentity = readReplayMemoryClosureLaneIdentity(learningExecutionState?.memoryClosureCausality, 'execution')
  const embodimentIdentity = readReplayMemoryClosureLaneIdentity(embodimentContinuityLedger?.memoryClosureCausality, 'embodiment')
  const continuityDigest = buildReplayMemoryClosureLongRunContinuityDigest(input.turn)
  const memoryIdentityKeys = uniqueStrings([
    emotionIdentity?.continuityKey,
    initiativeIdentity?.continuityKey,
    executionIdentity?.continuityKey,
    embodimentIdentity?.continuityKey,
    ...readReplayMemoryClosureIdentityKeys(derivedMindStateBundle),
    ...readReplayMemoryClosureIdentityKeysFromContinuityDigest(continuityDigest),
  ], 8)
  const digestProvedLanes = readReplayMemoryClosureLongRunLanesFromContinuityDigest({
    continuityDigest,
    memoryIdentityKeys,
  })
  const provedLanes = replayMemoryClosureLongRunRequiredLanes.filter((lane) => {
    switch (lane) {
      case 'recall':
        return hasReplayMemoryClosureRecallProof(input) || digestProvedLanes.includes(lane)
      case 'emotion':
        return Boolean(emotionIdentity) || digestProvedLanes.includes(lane)
      case 'initiative':
        return Boolean(initiativeIdentity) || digestProvedLanes.includes(lane)
      case 'execution':
        return Boolean(executionIdentity) || digestProvedLanes.includes(lane)
      case 'embodiment':
        return Boolean(embodimentIdentity) || digestProvedLanes.includes(lane)
      case 'embodiment-expression':
        return (
          Boolean(embodimentIdentity)
          && hasReplayMemoryClosureEmbodimentExpressionProof(embodimentContinuityLedger)
        )
        || digestProvedLanes.includes(lane)
      default:
        return false
    }
  })

  return {
    turnId: input.turn.turnId,
    memoryIdentityKey: memoryIdentityKeys[0] ?? null,
    memoryIdentityKeys,
    provedLanes,
    missingLanes: replayMemoryClosureLongRunRequiredLanes.filter(lane => !provedLanes.includes(lane)),
    continuityDigest,
  }
}

function buildReplayMemoryClosureLongRunReport(input: {
  turns: AlicizationReplayTurn[]
  preparedTurns: AlicizationPreparedMainChatExecutionResult[]
}): AlicizationReplayMemoryClosureLongRunReport {
  const chronologicalTurns = input.turns
    .map((turn, index) => ({
      turn,
      prepared: input.preparedTurns[index] ?? null,
      index,
    }))
    .sort((left, right) => {
      const leftCreatedAt = Number(left.turn.createdAt ?? 0)
      const rightCreatedAt = Number(right.turn.createdAt ?? 0)
      return leftCreatedAt - rightCreatedAt || left.index - right.index
    })
  const turnDiagnostics = chronologicalTurns.map(({ turn, prepared }) => buildReplayMemoryClosureLongRunTurnDiagnostic({
    turn,
    prepared,
  }))
  const keyCounts = new Map<string, number>()
  for (const diagnostic of turnDiagnostics) {
    for (const key of new Set(diagnostic.memoryIdentityKeys))
      keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1)
  }
  const dominantMemoryIdentityKeys = [...keyCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([key]) => key)
  const dominantMemoryIdentityKey = dominantMemoryIdentityKeys[0] ?? null
  const transitionBreaks: string[] = []
  for (let index = 0; index < turnDiagnostics.length - 1; index += 1) {
    const current = turnDiagnostics[index]
    const next = turnDiagnostics[index + 1]
    if (!current || !next)
      continue
    const hasSharedIdentity = current.memoryIdentityKeys.some(key => next.memoryIdentityKeys.includes(key))
    if (!hasSharedIdentity)
      transitionBreaks.push(`${current.turnId}->${next.turnId}`)
  }
  const stableMemoryIdentity = Boolean(dominantMemoryIdentityKey)
    && turnDiagnostics.every(diagnostic => diagnostic.memoryIdentityKeys.includes(dominantMemoryIdentityKey))
    && transitionBreaks.length === 0
  const failureReasons = [
    turnDiagnostics.length < replayMemoryClosureLongRunRequiredTurnCount
      ? 'too-short-noisy-desktop-run'
      : null,
    turnDiagnostics.some(diagnostic => diagnostic.memoryIdentityKeys.length === 0)
      ? 'missing-causal-memory-identity'
      : null,
    turnDiagnostics.some(diagnostic => diagnostic.missingLanes.length > 0)
      ? 'missing-memory-closure-lanes'
      : null,
    !stableMemoryIdentity
      ? 'missing-memory-identity-continuity'
      : null,
  ].filter((reason): reason is AlicizationReplayMemoryClosureLongRunFailureReason => Boolean(reason))

  return {
    status: failureReasons.length === 0 ? 'closed' : 'insufficient',
    turnCount: turnDiagnostics.length,
    requiredTurnCount: replayMemoryClosureLongRunRequiredTurnCount,
    stableMemoryIdentity,
    dominantMemoryIdentityKey,
    dominantMemoryIdentityKeys,
    transitionBreaks,
    failureReasons,
    turnDiagnostics,
  }
}

function buildReplayBenchmarkSyntheticTracePointer(input: {
  packId: AlicizationReplayBenchmarkPackId
  turn: AlicizationReplayTurn
}): AlicizationReplayBenchmarkTracePointer {
  return {
    kind: 'synthetic-pack-turn',
    packId: input.packId,
    turnId: input.turn.turnId,
    decisionTraceId: null,
    sessionId: null,
    activeThreadId: null,
  }
}

function buildReplayBenchmarkParitySummary(turn: AlicizationReplayTurn | undefined) {
  const mainBundle = turn?.organicMemoryContext?.derivedMindStateBundle ?? null
  if (!mainBundle)
    return null

  // Replay/benchmark uses the same shared reducers and treats the benchmark context as a browser parity fixture
  // when a separate browser fixture is not attached to the turn.
  const browserBundle = mainBundle.source === 'browser-fallback'
    ? mainBundle
    : {
        ...mainBundle,
        source: 'browser-fallback' as const,
      }
  const mainResolutionLedger = turn?.organicMemoryContext?.memoryResolutionLedger ?? null
  const mainMemorySituationCandidates = turn?.organicMemoryContext?.memorySituationCandidates ?? null
  return deriveAlicizationBrowserMainParitySummary({
    mainBundle,
    browserBundle,
    mainResolutionLedger,
    browserResolutionLedger: mainResolutionLedger,
    mainMemorySituationCandidates,
    browserMemorySituationCandidates: mainMemorySituationCandidates,
    mainTracePointer: turn?.tracePointer ?? null,
    browserTracePointer: turn?.tracePointer ?? null,
  })
}

interface AlicizationReplayGoldMetrics {
  evaluatedTurnCount: number
  productionEvaluatedTurnCount: number
  syntheticEvaluatedTurnCount: number
  productionGoldCoverage: number
  recallAt1: number
  recallAt3: number
  precisionAt3: number
  wrongThreadSuppression: number
  claimAccuracy: number
  replyAuthorityAccuracy: number
  embodiedAuthorityAccuracy: number
  latencyBudgetPass: boolean
}

function ratioOrZero(numerator: number, denominator: number) {
  if (denominator <= 0)
    return 0
  return Number((numerator / denominator).toFixed(2))
}

function uniqueStrings(values: Array<string | null | undefined>, maxItems = 32) {
  const result: string[] = []
  for (const value of values) {
    const normalized = readString(value, 180)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function readPreparedReplyAuthority(prepared: AlicizationPreparedMainChatExecutionResult) {
  return readString(
    prepared.mindTurnContract?.expectedVisibleReplyAuthority
    ?? prepared.replyExecutionPlan?.expectedVisibleReplyAuthority
    ?? prepared.runtimeSurface.replyExecutionPlan?.expectedVisibleReplyAuthority
    ?? prepared.runtimeSurface.replyAuthority?.expectedVisibleReplyAuthority
    ?? prepared.governance?.visibleReplyAuthority,
    120,
  ) || null
}

function readPreparedLatencyBudgetClass(prepared: AlicizationPreparedMainChatExecutionResult) {
  const derivedBundle = prepared.organicMemoryContext?.derivedMindStateBundle ?? null
  return readString(derivedBundle?.recallLatencyPolicy?.budgetClass, 64) || null
}

function rebuildReplayPreparedTurnGraph(
  prepared: AlicizationPreparedMainChatExecutionResult,
  surface: AlicizationVisibleReplyRealizationArtifact | null,
) {
  return buildAlicizationTurnGraphFromSettlements({
    prepared,
    cardId: 'default',
    turnId: prepared.turnGraph.ids.turnId,
    actionObligation: prepared.runtimeSurface?.action ?? null,
    memory: prepared.memoryTurnArtifact ?? null,
    surface,
    routingRequired: prepared.runtimeSurface?.tooling?.routingRequired ?? false,
    stageSettlements: prepared.turnRuntimeContext?.stageSettlements ?? prepared.turnGraph?.stageSettlements ?? [],
    activeSelfRevision: {
      patchId: prepared.turnRuntimeContext?.selfRevisionConsumption.activePatchId ?? null,
      decisionTraceId: prepared.turnRuntimeContext?.selfRevisionConsumption.activePatchDecisionTraceId ?? null,
      candidateId: prepared.turnRuntimeContext?.selfRevisionConsumption.activeCandidateId ?? null,
    },
  })
}

function readPreparedEmbodimentAuthority(prepared: AlicizationPreparedMainChatExecutionResult) {
  const runtimeSurface = prepared.runtimeSurface ?? null
  const spine = runtimeSurface?.digitalLifeSpine ?? null
  const spineDigest = projectAlicizationDigitalLifeSpineDigest(spine)
  const mode = readString(spine?.architecture?.operatingMode, 64) || null
  const actionCue = readString(spineDigest?.runtime?.selectedAction, 64) || null
  const preferredPresence = readString(spineDigest?.runtime?.preferredPresence, 64) || null
  const rendererTarget = readString(prepared.performanceManifest?.renderer, 64) || null
  const actualAuthority = readString(prepared.turnGraph.surface?.actualAuthority, 64) || null
  const providerMindExecuted = typeof prepared.turnGraph.surface?.providerMindExecuted === 'boolean'
    ? prepared.turnGraph.surface.providerMindExecuted
    : null
  const expectedAuthority = readString(
    prepared.turnGraph.surface?.expectedAuthority
    ?? prepared.replyExecutionPlan?.expectedVisibleReplyAuthority
    ?? runtimeSurface?.replyExecutionPlan?.expectedVisibleReplyAuthority
    ?? runtimeSurface?.replyAuthority?.expectedVisibleReplyAuthority,
    64,
  ) || null
  if (!mode && !actionCue && !preferredPresence && !rendererTarget && !expectedAuthority && !actualAuthority && providerMindExecuted == null)
    return null

  return {
    embodimentScript: rendererTarget
      ? { rendererTarget }
      : null,
    visibleReply: {
      expectedAuthority,
      actualAuthority,
      providerMindExecuted,
    },
    digitalLife: {
      mode,
      preferredPresence,
      action: {
        actionCue,
      },
    },
  }
}

function matchesEmbodiedAuthority(input: {
  expected: NonNullable<AlicizationReplayGoldExpectation['embodimentAuthority']>
  actual: ReturnType<typeof readPreparedEmbodimentAuthority>
}) {
  const expectedRendererTarget = readString(input.expected.embodimentScript?.rendererTarget, 64) || null
  const actualRendererTarget = readString(input.actual?.embodimentScript?.rendererTarget, 64) || null
  const expectedVisibleReplyAuthority = readString(input.expected.visibleReply?.expectedAuthority, 64) || null
  const actualVisibleReplyAuthority = readString(input.actual?.visibleReply?.expectedAuthority, 64) || null
  const expectedActualVisibleReplyAuthority = readString(input.expected.visibleReply?.actualAuthority, 64) || null
  const actualActualVisibleReplyAuthority = readString(input.actual?.visibleReply?.actualAuthority, 64) || null
  const expectedProviderMindExecuted = typeof input.expected.visibleReply?.providerMindExecuted === 'boolean'
    ? input.expected.visibleReply.providerMindExecuted
    : null
  const actualProviderMindExecuted = typeof input.actual?.visibleReply?.providerMindExecuted === 'boolean'
    ? input.actual.visibleReply.providerMindExecuted
    : null
  const expectedMode = readString(input.expected.digitalLife?.mode, 64) || null
  const expectedActionCue = readString(input.expected.digitalLife?.action?.actionCue, 64) || null
  const expectedPreferredPresence = readString(input.expected.digitalLife?.preferredPresence, 64) || null
  const actualMode = readString(input.actual?.digitalLife?.mode, 64) || null
  const actualActionCue = readString(input.actual?.digitalLife?.action?.actionCue, 64) || null
  const actualPreferredPresence = readString(input.actual?.digitalLife?.preferredPresence, 64) || null
  if (expectedRendererTarget && expectedRendererTarget !== actualRendererTarget)
    return false
  if (expectedVisibleReplyAuthority && expectedVisibleReplyAuthority !== actualVisibleReplyAuthority)
    return false
  if (expectedActualVisibleReplyAuthority && expectedActualVisibleReplyAuthority !== actualActualVisibleReplyAuthority)
    return false
  if (expectedProviderMindExecuted != null && expectedProviderMindExecuted !== actualProviderMindExecuted)
    return false
  if (expectedMode && expectedMode !== actualMode)
    return false
  if (expectedActionCue && expectedActionCue !== actualActionCue)
    return false
  if (expectedPreferredPresence && expectedPreferredPresence !== actualPreferredPresence)
    return false
  return true
}

function buildEmbodiedAuthorityDiagnostics(input: {
  expected?: AlicizationReplayGoldExpectation['embodimentAuthority']
  actual?: ReturnType<typeof readPreparedEmbodimentAuthority>
}) {
  const diagnostics: NonNullable<AlicizationReplayBenchmarkFailureTurnRecord['embodiedAuthorityDiagnostics']> = []
  const expectedVisibleReplyExpectedAuthority = readString(input.expected?.visibleReply?.expectedAuthority, 64) || null
  const actualVisibleReplyExpectedAuthority = readString(input.actual?.visibleReply?.expectedAuthority, 64) || null
  if (expectedVisibleReplyExpectedAuthority && expectedVisibleReplyExpectedAuthority !== actualVisibleReplyExpectedAuthority) {
    diagnostics.push({
      field: 'visibleReply.expectedAuthority',
      expectedValue: expectedVisibleReplyExpectedAuthority,
      actualValue: actualVisibleReplyExpectedAuthority,
    })
  }

  const expectedVisibleReplyActualAuthority = readString(input.expected?.visibleReply?.actualAuthority, 64) || null
  const actualVisibleReplyActualAuthority = readString(input.actual?.visibleReply?.actualAuthority, 64) || null
  if (expectedVisibleReplyActualAuthority && expectedVisibleReplyActualAuthority !== actualVisibleReplyActualAuthority) {
    diagnostics.push({
      field: 'visibleReply.actualAuthority',
      expectedValue: expectedVisibleReplyActualAuthority,
      actualValue: actualVisibleReplyActualAuthority,
    })
  }

  const expectedProviderMindExecuted = typeof input.expected?.visibleReply?.providerMindExecuted === 'boolean'
    ? String(input.expected.visibleReply.providerMindExecuted)
    : null
  const actualProviderMindExecuted = typeof input.actual?.visibleReply?.providerMindExecuted === 'boolean'
    ? String(input.actual.visibleReply.providerMindExecuted)
    : null
  if (expectedProviderMindExecuted && expectedProviderMindExecuted !== actualProviderMindExecuted) {
    diagnostics.push({
      field: 'visibleReply.providerMindExecuted',
      expectedValue: expectedProviderMindExecuted,
      actualValue: actualProviderMindExecuted,
    })
  }

  return diagnostics.length > 0 ? diagnostics : null
}

function buildIndependentReplayGoldExpectationFromTrace(input: {
  trace: AlicizationMemoryDecisionTraceRecord
  categories: AlicizationReplayBenchmarkSampleCategory[]
}): AlicizationReplayGoldExpectation | undefined {
  const recall = asObject(input.trace.recallAttribution)
  const judged = asObject(input.trace.memoryDeliberationJudged)
  const wrongThread = asObject(input.trace.memoryWrongThreadSuppressed)
  const stableCore = asObject(input.trace.memoryStableCoreSurfaced)
  const selectedCandidateIds = uniqueStrings([
    ...readObjectArray(recall?.selectedEpisodes).map(item => readString(item.id, 180)),
    ...readObjectArray(recall?.selectedProcedures).map(item => readString(item.id, 180)),
    ...readObjectArray(recall?.selectedPeriods).map(item => readString(item.id, 180)),
    ...readObjectArray(recall?.selectedEras).map(item => readString(item.id, 180)),
    ...readStringArray(judged?.selectedCandidateIds, 24, 180),
    ...readStringArray(stableCore?.selectedCandidateIds, 24, 180),
  ])
  const suppressedCandidateIds = uniqueStrings([
    ...readObjectArray(wrongThread?.conflictVariants).map(item => readString(item.id, 180)),
    ...readStringArray(wrongThread?.suppressedCandidateIds, 24, 180),
    ...readStringArray(judged?.suppressedCandidateIds, 24, 180),
  ])
  const claimValidationStates = readStringRecord(asObject(input.trace.derivedMindStateBundle)?.claimValidationStates)
    ?? readStringRecord(asObject(input.trace.memoryFactsUpserted)?.claimValidationStates)
  const replyAuthority = input.categories.includes('wrong-thread')
    || readString(input.trace.governance?.screenReferenceMode, 64) === 'avoid'
    ? 'llm-mind'
    : null
  if (
    selectedCandidateIds.length === 0
    && suppressedCandidateIds.length === 0
    && !claimValidationStates
    && !replyAuthority
  ) {
    return undefined
  }
  return {
    selectedCandidateIds: selectedCandidateIds.length > 0 ? selectedCandidateIds : undefined,
    suppressedCandidateIds: suppressedCandidateIds.length > 0 ? suppressedCandidateIds : undefined,
    claimValidationStates,
    replyAuthority,
    latencyBudgetClass: readReplayLatencyBudgetClass(asObject(input.trace.derivedMindStateBundle)?.recallLatencyPolicyBudgetClass),
    latencyBudgetPass: true,
    embodimentAuthority: input.trace.embodimentAuthority ?? undefined,
  }
}

function evaluateReplayGoldMetrics(input: {
  turns: AlicizationReplayTurn[]
  preparedTurns: AlicizationPreparedMainChatExecutionResult[]
}): AlicizationReplayGoldMetrics | null {
  const evaluated = input.turns
    .map((turn, index) => ({ turn, prepared: input.preparedTurns[index] }))
    .filter(item => item.turn.gold)

  if (evaluated.length === 0)
    return null

  const productionEvaluatedTurnCount = evaluated.filter(item => item.turn.tracePointer?.kind === 'decision-trace').length
  const syntheticEvaluatedTurnCount = evaluated.length - productionEvaluatedTurnCount
  let recallAt1Hits = 0
  let recallAt3Hits = 0
  let precisionMatches = 0
  let precisionDenominator = 0
  let wrongThreadHits = 0
  let wrongThreadDenominator = 0
  let claimMatches = 0
  let claimDenominator = 0
  let replyAuthorityMatches = 0
  let replyAuthorityDenominator = 0
  let embodiedAuthorityMatches = 0
  let embodiedAuthorityDenominator = 0
  let latencyBudgetMatches = 0
  let latencyBudgetDenominator = 0
  const recallFeedbackSamples: ReturnType<typeof buildAlicizationMemoryRecallFeedbackSample>[] = []

  for (const { turn, prepared } of evaluated) {
    const gold = turn.gold!
    const memoryArtifact = prepared.memoryOsRuntime?.artifact
      ?? prepared.memoryTurnArtifact
      ?? prepared.turnGraph?.memory
      ?? null
    const actualSelected = uniqueStrings([
      ...(memoryArtifact?.candidates.selectedCandidateIds ?? []),
      ...(prepared.turnGraph?.learning.memoryOutcome.surfacedCandidateIds ?? []),
      ...(prepared.turnGraph?.learning.memoryOutcome.usedCandidateIds ?? []),
      ...(prepared.organicMemoryContext?.memorySituationCandidates?.selected.map(item => item.candidateId) ?? []),
    ])
    const actualSuppressed = uniqueStrings([
      ...(memoryArtifact?.competition.wrongThreadCandidateIds ?? []),
      ...(prepared.turnGraph?.learning.memoryOutcome.wrongThreadCandidateIds ?? []),
      ...(prepared.turnGraph?.learning.memoryOutcome.suppressedCandidateIds ?? []),
      ...(prepared.organicMemoryContext?.memorySituationCandidates?.suppressed.map(item => item.candidateId) ?? []),
    ])
    const actualReplyAuthority = readPreparedReplyAuthority(prepared)
    const actualLatencyBudgetClass = readPreparedLatencyBudgetClass(prepared)
    const actualClaimStates = Object.fromEntries(
      (prepared.organicMemoryContext?.derivedMindStateBundle?.claimEvidenceGraphs ?? [])
        .map(graph => [readString(graph.claimId, 180), readString(graph.validationState, 64)])
        .filter((entry): entry is [string, string] => Boolean(entry[0] && entry[1])),
    )

    if ((gold.selectedCandidateIds?.length ?? 0) > 0) {
      const expectedSelected = gold.selectedCandidateIds ?? []
      if (actualSelected[0] && expectedSelected.includes(actualSelected[0]))
        recallAt1Hits += 1
      if (actualSelected.slice(0, 3).some(item => expectedSelected.includes(item)))
        recallAt3Hits += 1
      precisionMatches += actualSelected.slice(0, 3).filter(item => expectedSelected.includes(item)).length
      precisionDenominator += Math.max(1, Math.min(3, actualSelected.slice(0, 3).length))
      recallFeedbackSamples.push(buildAlicizationMemoryRecallFeedbackSample({
        turnId: turn.turnId,
        decisionTraceId: turn.tracePointer?.decisionTraceId ?? null,
        expectedMemoryIds: expectedSelected,
        retrievedCandidateIds: uniqueStrings([
          ...actualSelected,
          ...actualSuppressed,
          ...(memoryArtifact?.candidates.retrievalCandidateIds ?? []),
        ]),
        surfacedMemoryIds: actualSelected,
        wrongThreadIds: actualSuppressed,
        judgeReason: 'replay-gold-evaluation',
        now: 0,
      }))
    }

    if ((gold.suppressedCandidateIds?.length ?? 0) > 0) {
      wrongThreadDenominator += 1
      if ((gold.suppressedCandidateIds ?? []).every(item => actualSuppressed.includes(item)))
        wrongThreadHits += 1
    }

    if (gold.claimValidationStates) {
      for (const [claimId, expectedState] of Object.entries(gold.claimValidationStates)) {
        claimDenominator += 1
        if (actualClaimStates[claimId] === expectedState)
          claimMatches += 1
      }
    }

    if (gold.replyAuthority) {
      replyAuthorityDenominator += 1
      if (actualReplyAuthority === gold.replyAuthority)
        replyAuthorityMatches += 1
    }

    if (gold.embodimentAuthority) {
      embodiedAuthorityDenominator += 1
      if (matchesEmbodiedAuthority({
        expected: gold.embodimentAuthority,
        actual: readPreparedEmbodimentAuthority(prepared),
      })) {
        embodiedAuthorityMatches += 1
      }
    }

    if (gold.latencyBudgetClass || gold.latencyBudgetPass != null) {
      latencyBudgetDenominator += 1
      const budgetMatch = !gold.latencyBudgetClass || actualLatencyBudgetClass === gold.latencyBudgetClass
      const passMatch = gold.latencyBudgetPass == null || gold.latencyBudgetPass === budgetMatch
      if (budgetMatch && passMatch)
        latencyBudgetMatches += 1
    }
  }

  const selectedExpectationCount = evaluated.filter(item => (item.turn.gold?.selectedCandidateIds?.length ?? 0) > 0).length
  const recallFeedback = summarizeAlicizationMemoryRecallFeedback(recallFeedbackSamples)
  return {
    evaluatedTurnCount: evaluated.length,
    productionEvaluatedTurnCount,
    syntheticEvaluatedTurnCount,
    productionGoldCoverage: Number((productionEvaluatedTurnCount / evaluated.length).toFixed(2)),
    recallAt1: ratioOrZero(recallAt1Hits, selectedExpectationCount),
    recallAt3: recallFeedback.sampleCount > 0 ? recallFeedback.recallAt3 : ratioOrZero(recallAt3Hits, selectedExpectationCount),
    precisionAt3: recallFeedback.sampleCount > 0 ? recallFeedback.precisionAt3 : ratioOrZero(precisionMatches, precisionDenominator),
    wrongThreadSuppression: ratioOrZero(wrongThreadHits, wrongThreadDenominator),
    claimAccuracy: ratioOrZero(claimMatches, claimDenominator),
    replyAuthorityAccuracy: ratioOrZero(replyAuthorityMatches, replyAuthorityDenominator),
    embodiedAuthorityAccuracy: ratioOrZero(embodiedAuthorityMatches, embodiedAuthorityDenominator),
    latencyBudgetPass: latencyBudgetDenominator <= 0 || latencyBudgetMatches === latencyBudgetDenominator,
  }
}

export function buildReplayBenchmarkFailingTurnSet(input: {
  packId: AlicizationReplayBenchmarkPackId
  turns: AlicizationReplayTurn[]
  preparedTurns?: AlicizationPreparedMainChatExecutionResult[]
  quality: AlicizationReplayMemoryQuality[]
  gate: AlicizationReplayBenchmarkGateReport
}) {
  const turnById = new Map(input.turns.map(turn => [turn.turnId, turn]))
  const preparedTurnByTurnId = new Map(
    (input.preparedTurns ?? []).map(prepared => [
      prepared.turnGraph.ids.turnId,
      prepared,
    ]),
  )
  const failingDimensionsByTurnId = new Map<string, Array<keyof AlicizationReplayBenchmarkStandards>>()
  for (const dimension of input.gate.dimensions) {
    if (dimension.status !== 'fail')
      continue
    for (const turnId of dimension.failingTurnIds) {
      const existing = failingDimensionsByTurnId.get(turnId) ?? []
      if (!existing.includes(dimension.key))
        existing.push(dimension.key)
      failingDimensionsByTurnId.set(turnId, existing)
    }
  }

  return input.quality
    .map((item): AlicizationReplayBenchmarkFailureTurnRecord | null => {
      const failingDimensions = failingDimensionsByTurnId.get(item.turnId) ?? []
      if (failingDimensions.length === 0)
        return null
      const turn = turnById.get(item.turnId)
      const prepared = preparedTurnByTurnId.get(item.turnId) ?? null
      const tracePointer = turn?.tracePointer ?? buildReplayBenchmarkSyntheticTracePointer({
        packId: input.packId,
        turn: turn ?? {
          turnId: item.turnId,
          userText: item.userText,
        },
      })
      return {
        turnId: item.turnId,
        userText: item.userText,
        failingDimensions,
        tracePointer,
        firstFailingStage: deriveReplayFirstFailingStage({
          quality: item,
          prepared,
        }),
        turnGraphSummary: summarizeReplayTurnGraph(prepared?.turnGraph),
        embodiedAuthorityDiagnostics: buildEmbodiedAuthorityDiagnostics({
          expected: turn?.gold?.embodimentAuthority,
          actual: prepared ? readPreparedEmbodimentAuthority(prepared) : null,
        }),
        sampledCategories: turn?.sampledCategories ?? null,
        paritySummary: buildReplayBenchmarkParitySummary(turn),
        resolutionLedgerSummary: turn?.organicMemoryContext?.memoryResolutionLedger
          ? {
              dominantClusterSummary: turn.organicMemoryContext.memoryResolutionLedger.dominantClusterSummary,
              competingClusterSummary: turn.organicMemoryContext.memoryResolutionLedger.competingClusterSummary,
              finalSurfacePolicy: turn.organicMemoryContext.memoryResolutionLedger.finalSurfacePolicy,
              shouldStayInward: turn.organicMemoryContext.memoryResolutionLedger.shouldStayInward,
              shouldDelayUntilAfterPayoff: turn.organicMemoryContext.memoryResolutionLedger.shouldDelayUntilAfterPayoff,
              closureState: turn.organicMemoryContext.memoryResolutionLedger.closureState,
              visibleCarryMode: turn.organicMemoryContext.memoryResolutionLedger.visibleCarryMode,
              retrievalQuality: turn.organicMemoryContext.memoryResolutionLedger.retrievalQuality,
              shouldLabelUncertainty: turn.organicMemoryContext.memoryResolutionLedger.shouldLabelUncertainty,
              conflictPressure: turn.organicMemoryContext.memoryResolutionLedger.conflictPressure,
              rejectedCandidateCount: turn.organicMemoryContext.memoryResolutionLedger.rejectedCandidates.length,
              suppressionTags: turn.organicMemoryContext.memoryResolutionLedger.suppressionTags ?? [],
            }
          : null,
        memorySituationCandidateSummary: turn?.organicMemoryContext?.memorySituationCandidates
          ? {
              selected: turn.organicMemoryContext.memorySituationCandidates.selected.slice(0, 3).map(item => `${item.candidateId}:${item.statusReason ?? 'selected'}`),
              rejected: turn.organicMemoryContext.memorySituationCandidates.rejected.slice(0, 3).map(item => `${item.candidateId}:${item.suppressionReasons.join(';') || item.statusReason || 'rejected'}`),
              delayed: turn.organicMemoryContext.memorySituationCandidates.delayed.slice(0, 3).map(item => `${item.candidateId}:${item.statusReason ?? 'delayed'}`),
              unresolved: turn.organicMemoryContext.memorySituationCandidates.unresolved.slice(0, 3).map(item => `${item.candidateId}:${item.statusReason ?? 'unresolved'}`),
            }
          : null,
      }
    })
    .filter(Boolean) as AlicizationReplayBenchmarkFailureTurnRecord[]
}

export function mergeReplayBenchmarkDatasetBacklog(input: {
  existing: AlicizationReplayBenchmarkDatasetBacklogEntry[]
  packId: AlicizationReplayBenchmarkPackId
  turns: AlicizationReplayTurn[]
  failingTurnSet: AlicizationReplayBenchmarkFailureTurnRecord[]
  now: number
  maxEntries?: number
}) {
  const maxEntries = Math.max(8, Math.min(500, Math.floor(input.maxEntries ?? 200)))
  const nextEntries = new Map<string, AlicizationReplayBenchmarkDatasetBacklogEntry>()
  for (const entry of input.existing)
    nextEntries.set(entry.id, entry)

  const turnById = new Map(input.turns.map(turn => [turn.turnId, turn]))
  let appendedCount = 0
  for (const failingTurn of input.failingTurnSet) {
    const turn = turnById.get(failingTurn.turnId)
    if (!turn)
      continue
    const tracePointer = turn.tracePointer ?? failingTurn.tracePointer
    const id = [
      input.packId,
      tracePointer.kind,
      tracePointer.decisionTraceId ?? tracePointer.turnId,
      [...failingTurn.failingDimensions].sort().join(','),
    ].join('::')
    if (nextEntries.has(id))
      continue
    nextEntries.set(id, {
      id,
      packId: input.packId,
      turnId: failingTurn.turnId,
      userText: failingTurn.userText,
      failingDimensions: [...failingTurn.failingDimensions],
      tracePointer,
      sampledCategories: [...(failingTurn.sampledCategories ?? [])],
      continuityDigest: buildReplayBenchmarkDatasetContinuityDigest(turn),
      replayTurn: turn,
      createdAt: input.now,
    })
    appendedCount += 1
  }

  const entries = [...nextEntries.values()]
    .sort((left, right) => right.createdAt - left.createdAt || left.id.localeCompare(right.id))
    .slice(0, maxEntries)

  return {
    entries,
    appendedCount,
  }
}

function normalizeReplayBenchmarkPackId(raw: unknown): AlicizationReplayBenchmarkPackId {
  const value = readString(raw, 64)
  if (
    value === 'default-humanlike-memory-v1'
    || value === 'sampled-humanlike-memory-v1'
    || value === 'backlog-humanlike-memory-v1'
    || value === 'growth-humanlike-memory-v1'
    || value === 'adversarial-humanlike-memory-v2'
    || value === 'final-humanlike-memory-v1'
  ) {
    return value
  }
  return 'default-humanlike-memory-v1'
}

function normalizeTracePointerKind(raw: unknown): AlicizationReplayBenchmarkTracePointer['kind'] {
  return readString(raw, 64) === 'decision-trace'
    ? 'decision-trace'
    : 'synthetic-pack-turn'
}

function parseReplayTurnFromDatasetBacklogEntry(raw: unknown): AlicizationReplayBenchmarkDatasetBacklogEntry | null {
  const entry = asObject(raw)
  if (!entry)
    return null

  const turnId = readString(entry.turnId, 160)
  const userText = readString(entry.userText, 240)
  if (!turnId || !userText)
    return null

  const replayTurnRaw = asObject(entry.replayTurn)
  const tracePointerRaw = asObject(replayTurnRaw?.tracePointer ?? entry.tracePointer)
  const tracePointer: AlicizationReplayBenchmarkTracePointer = {
    kind: normalizeTracePointerKind(tracePointerRaw?.kind),
    packId: normalizeReplayBenchmarkPackId(tracePointerRaw?.packId ?? entry.packId),
    turnId: readString(tracePointerRaw?.turnId, 160) || turnId,
    decisionTraceId: readString(tracePointerRaw?.decisionTraceId, 160) || null,
    sessionId: readString(tracePointerRaw?.sessionId, 160) || null,
    activeThreadId: readString(tracePointerRaw?.activeThreadId, 160) || null,
  }

  const sampledCategories = readStringArray(replayTurnRaw?.sampledCategories ?? entry.sampledCategories, 8, 64)
    .map(item => normalizeReplayBenchmarkSampleCategory(item))
    .filter(Boolean) as AlicizationReplayBenchmarkSampleCategory[]
  const preludeRaw = asObject(replayTurnRaw?.prelude)
  const preludeMessages = Array.isArray(preludeRaw?.messages)
    ? preludeRaw.messages as Message[]
    : [{ role: 'user', content: userText } as Message]
  const parsedPrelude = preludeRaw
    ? (() => {
        const perceptionAugmentation = asObject(preludeRaw?.perceptionAugmentation)
        const chatGovernance = asObject(perceptionAugmentation?.chatGovernance)
        const basePrelude = createBasePrelude({
          messages: preludeMessages,
          governance: chatGovernance?.mindTurnGovernance as AlicizationMindTurnGovernance | null | undefined,
        })
        if (asObject(preludeRaw?.actionObligation))
          basePrelude.actionObligation = preludeRaw.actionObligation as AlicizationPreparedMainChatPrelude['actionObligation']
        if (asObject(preludeRaw?.chatConfig))
          basePrelude.chatConfig = preludeRaw.chatConfig as AlicizationPreparedMainChatPrelude['chatConfig']
        if (Array.isArray(preludeRaw?.messages))
          basePrelude.messages = preludeRaw.messages as Message[]
        if (asObject(preludeRaw?.executionCapabilityInquiry))
          basePrelude.executionCapabilityInquiry = preludeRaw.executionCapabilityInquiry as AlicizationPreparedMainChatPrelude['executionCapabilityInquiry']
        if (preludeRaw?.executionRoutingIntent === null || asObject(preludeRaw?.executionRoutingIntent))
          basePrelude.executionRoutingIntent = (preludeRaw.executionRoutingIntent ?? null) as AlicizationPreparedMainChatPrelude['executionRoutingIntent']

        const perceptionAugmentationRaw = asObject(preludeRaw?.perceptionAugmentation)
        if (perceptionAugmentationRaw) {
          if (Array.isArray(perceptionAugmentationRaw.messages))
            basePrelude.perceptionAugmentation.messages = perceptionAugmentationRaw.messages as Message[]
          if (Array.isArray(perceptionAugmentationRaw.systemBlocks))
            basePrelude.perceptionAugmentation.systemBlocks = perceptionAugmentationRaw.systemBlocks as string[]
          if (Array.isArray(perceptionAugmentationRaw.promptSystemBlocks))
            basePrelude.perceptionAugmentation.promptSystemBlocks = perceptionAugmentationRaw.promptSystemBlocks as string[]
          if (typeof perceptionAugmentationRaw.memoryRecallSeed === 'string')
            basePrelude.perceptionAugmentation.memoryRecallSeed = perceptionAugmentationRaw.memoryRecallSeed
          if (perceptionAugmentationRaw.recallGovernor === null || asObject(perceptionAugmentationRaw.recallGovernor))
            basePrelude.perceptionAugmentation.recallGovernor = (perceptionAugmentationRaw.recallGovernor ?? null) as AlicizationPreparedMainChatPrelude['perceptionAugmentation']['recallGovernor']
          if (asObject(perceptionAugmentationRaw.capture))
            basePrelude.perceptionAugmentation.capture = perceptionAugmentationRaw.capture as AlicizationPreparedMainChatPrelude['perceptionAugmentation']['capture']
          if (asObject(perceptionAugmentationRaw.chatGovernance))
            basePrelude.perceptionAugmentation.chatGovernance = perceptionAugmentationRaw.chatGovernance as AlicizationPreparedMainChatPrelude['perceptionAugmentation']['chatGovernance']
          if (asObject(perceptionAugmentationRaw.digitalLifeRuntimeSurface))
            basePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = perceptionAugmentationRaw.digitalLifeRuntimeSurface as AlicizationPreparedMainChatPrelude['perceptionAugmentation']['digitalLifeRuntimeSurface']
        }

        return basePrelude
      })()
    : undefined

  const createdAt = Math.max(0, Math.floor(readNumber(replayTurnRaw?.createdAt ?? entry.createdAt, 0)))
  const continuityDigest = readString(entry.continuityDigest, 1_200) || null
  const replayTurn: AlicizationReplayTurn & {
    continuityDigest?: string | null
  } = {
    turnId: readString(replayTurnRaw?.turnId, 160) || turnId,
    userText: readString(replayTurnRaw?.userText, 240) || userText,
    createdAt,
    ...(continuityDigest ? { continuityDigest } : {}),
    expectedMemory: readString(replayTurnRaw?.expectedMemory, 240) || undefined,
    structured: asObject(replayTurnRaw?.structured)
      ? replayTurnRaw?.structured as AlicizationReplayTurn['structured']
      : undefined,
    categories: readStringArray(replayTurnRaw?.categories, 8, 64),
    visibleReplyRealization: asObject(replayTurnRaw?.visibleReplyRealization)
      ? replayTurnRaw?.visibleReplyRealization as AlicizationVisibleReplyRealizationArtifact
      : undefined,
    organicMemoryContext: asObject(replayTurnRaw?.organicMemoryContext)
      ? replayTurnRaw?.organicMemoryContext as OrganicMemoryPromptContext
      : undefined,
    prelude: parsedPrelude,
    tracePointer,
    sampledCategories,
    gold: parseReplayGoldExpectation(replayTurnRaw?.gold),
  }

  return {
    id: readString(entry.id, 220) || `${tracePointer.packId}::${tracePointer.turnId}`,
    packId: normalizeReplayBenchmarkPackId(entry.packId),
    turnId,
    userText,
    failingDimensions: readStringArray(entry.failingDimensions, 12, 64) as Array<keyof AlicizationReplayBenchmarkStandards>,
    tracePointer,
    sampledCategories,
    replayTurn,
    createdAt,
  }
}

export function buildReplayBenchmarkBacklogPack(input: {
  backlogEntries: unknown[]
  limit?: number
}) {
  const limit = Math.max(1, Math.min(24, Math.floor(input.limit ?? 12)))
  const candidates = input.backlogEntries
    .map(parseReplayTurnFromDatasetBacklogEntry)
    .filter(Boolean) as AlicizationReplayBenchmarkDatasetBacklogEntry[]
  const byTurnId = new Map<string, AlicizationReplayBenchmarkDatasetBacklogEntry>()
  for (const candidate of candidates.sort((left, right) => right.createdAt - left.createdAt || left.id.localeCompare(right.id))) {
    if (!byTurnId.has(candidate.turnId))
      byTurnId.set(candidate.turnId, candidate)
  }
  const uniqueCandidates = [...byTurnId.values()]
  const selectedIds = new Set<string>()
  const selected: AlicizationReplayTurn[] = []

  const dimensionPriority: Array<keyof AlicizationReplayBenchmarkStandards> = [
    'emptyCareRate',
    'repairMechanicalRate',
    'warmthTemplateRisk',
    'relationshipDistanceJumpRate',
    'afterglowFalseCarryRate',
    'wrongThreadSuppression',
    'replyMemoryCoherence',
    'surfaceRestraint',
    'relationshipRepairAdaptation',
    'templateLeakage',
    'procedureCarryQuality',
    'temporalScopeFlexibility',
    'implicitRecallQuality',
    'eraSelectionQuality',
  ]

  for (const dimension of dimensionPriority) {
    const candidate = uniqueCandidates.find(item =>
      item.failingDimensions.includes(dimension)
      && !selectedIds.has(item.id),
    )
    if (!candidate)
      continue
    selected.push(candidate.replayTurn)
    selectedIds.add(candidate.id)
    if (selected.length >= limit)
      return selected
  }

  for (const category of replayBenchmarkSampleCategoryPriority) {
    const candidate = uniqueCandidates.find(item =>
      item.sampledCategories.includes(category)
      && !selectedIds.has(item.id),
    )
    if (!candidate)
      continue
    selected.push(candidate.replayTurn)
    selectedIds.add(candidate.id)
    if (selected.length >= limit)
      return selected
  }

  for (const candidate of uniqueCandidates) {
    if (selectedIds.has(candidate.id))
      continue
    selected.push(candidate.replayTurn)
    selectedIds.add(candidate.id)
    if (selected.length >= limit)
      break
  }

  return selected
}

export function buildDefaultHumanlikeMemoryBenchmarkPack(): AlicizationReplayTurn[] {
  const goldByTurnId: Record<string, AlicizationReplayGoldExpectation> = {
    'benchmark-180d-autobiographical-span': {
      selectedCandidateIds: ['episode:autobiographical-cross-session'],
      replyAuthority: 'llm-mind',
      latencyBudgetClass: 'deep-recall-reply',
      latencyBudgetPass: true,
    },
    'benchmark-relationship-repair-tone-shift': {
      selectedCandidateIds: ['relationship-era:post-repair-tone'],
      suppressedCandidateIds: ['relationship-era:pre-repair-distance'],
      replyAuthority: 'llm-mind',
      latencyBudgetClass: 'deep-recall-reply',
      latencyBudgetPass: true,
    },
    'benchmark-wrong-thread-lure': {
      suppressedCandidateIds: ['thread:lookalike-stale-line'],
      replyAuthority: 'llm-mind',
      latencyBudgetClass: 'realtime-reply',
      latencyBudgetPass: true,
    },
    'benchmark-knowledge-update-conflict': {
      claimValidationStates: {
        'knowledge:update-conflict': 'contradicted',
      },
      replyAuthority: 'llm-mind',
      latencyBudgetClass: 'deep-recall-reply',
      latencyBudgetPass: true,
    },
  }

  return [
    {
      turnId: 'benchmark-7d-conversation-history',
      userText: '前几天我们聊过什么',
      tracePointer: {
        kind: 'synthetic-pack-turn',
        packId: 'default-humanlike-memory-v1',
        turnId: 'benchmark-7d-conversation-history',
        decisionTraceId: null,
        sessionId: null,
        activeThreadId: null,
      },
      gold: goldByTurnId['benchmark-7d-conversation-history'],
    },
    {
      turnId: 'benchmark-30d-procedure-history',
      userText: '以前你是怎么帮我做这个的',
      gold: goldByTurnId['benchmark-30d-procedure-history'],
    },
    {
      turnId: 'benchmark-90d-relationship-era',
      userText: '那段时间你为什么总这么回我',
      gold: goldByTurnId['benchmark-90d-relationship-era'],
    },
    {
      turnId: 'benchmark-180d-autobiographical-span',
      userText: '半年前那条线你还接得回来吗',
      gold: goldByTurnId['benchmark-180d-autobiographical-span'],
    },
    {
      turnId: 'benchmark-nonexplicit-similar-task',
      userText: '继续像之前那样把这条线接回来',
    },
    {
      turnId: 'benchmark-implicit-recall-similar-task',
      userText: '继续按你以前那套接法把这个收回来',
    },
    {
      turnId: 'benchmark-ambiguous-time-window',
      userText: '以前那段时间你为什么总这么回我',
    },
    {
      turnId: 'benchmark-wrong-thread-lure',
      userText: '不是那条线，是另一条，你别把它们混在一起',
      gold: goldByTurnId['benchmark-wrong-thread-lure'],
    },
    {
      turnId: 'benchmark-long-horizon-task-migration',
      userText: '换了这么久，这种活你还是会沿旧方法接吗',
    },
    {
      turnId: 'benchmark-relationship-repair-tone-shift',
      userText: '你这次为什么和之前不一样，是不是记错了哪次修复之后的分寸',
      gold: goldByTurnId['benchmark-relationship-repair-tone-shift'],
    },
    {
      turnId: 'benchmark-relevant-but-inward-only',
      userText: '先别提旧事，先把这轮当前要做的答完',
    },
    {
      turnId: 'benchmark-template-shell-fishing',
      userText: '别再用那种“我想起了什么”开头，你直接接住我现在这句',
    },
    {
      turnId: 'benchmark-high-volume-similar-task-cluster',
      userText: '继续按以前那种把线接回去的方式处理',
    },
    {
      turnId: 'benchmark-nonexplicit-tone-shift',
      userText: '你为什么这次和之前不一样',
    },
    {
      turnId: 'benchmark-nonexplicit-delayed-recollection',
      userText: '这件事你刚才没提，但现在为什么又想起来了',
    },
    {
      turnId: 'benchmark-ingest-backoff-visibility',
      userText: '你现在是不是有些记忆还在慢慢补回',
    },
    {
      turnId: 'benchmark-delayed-reconstruction',
      userText: '你是不是把那次旧 continuity 记成另一条线了',
    },
    {
      turnId: 'benchmark-nonexplicit-correction',
      userText: '不是那次，是另一次，你是不是记错了',
    },
    {
      turnId: 'benchmark-multi-repair-arc-history',
      userText: '这条线修过这么多次，你现在到底是沿着哪次修复后的分寸在回我',
    },
    {
      turnId: 'benchmark-multi-execution-callback-continuity',
      userText: '这类回调你上次、上上次都是怎么收口的，这次也还接得住吗',
    },
    {
      turnId: 'benchmark-long-burden-accumulation',
      userText: '最近这段时间我一直很累，你是不是也该记得这种负担会怎么影响你回应我的分寸',
    },
    {
      turnId: 'benchmark-cross-week-task-migration',
      userText: '隔了几周再回到这类任务，你还会沿着那条老的 repair seam 接吗',
    },
    {
      turnId: 'benchmark-cross-month-repair-memory',
      userText: '几个月前那次修复之后你变得更谨慎了，这次你是不是还记得那条分寸线',
    },
    {
      turnId: 'benchmark-knowledge-update-conflict',
      userText: '你后来学会了新做法，那你会不会把以前那套旧方法的记忆修正掉',
      gold: goldByTurnId['benchmark-knowledge-update-conflict'],
    },
    {
      turnId: 'benchmark-rhythm-stability-repair-window',
      userText: '修复刚刚才重新接稳，这次你别一下子把距离拉得太近，也别答得像冷掉了。',
    },
    {
      turnId: 'benchmark-rhythm-stability-burden-window',
      userText: '我最近一直很累，你这次别又太用力，也别突然变得像在念模板。',
    },
  ]
}

export function buildGrowthHumanlikeMemoryBenchmarkPack(): AlicizationReplayTurn[] {
  const goldByTurnId: Record<string, AlicizationReplayGoldExpectation> = {
    'growth-self-revision': {
      claimValidationStates: {
        'self-model:old-judgement': 'superseded',
      },
      replyAuthority: 'llm-mind',
      latencyBudgetClass: 'deep-recall-reply',
      latencyBudgetPass: true,
    },
  }
  return [
    {
      turnId: 'growth-repeated-mistake-avoidance',
      userText: '上次你就是因为太快靠近把这条线答坏了，这次别再犯同样错误。',
      tracePointer: {
        kind: 'synthetic-pack-turn',
        packId: 'growth-humanlike-memory-v1',
        turnId: 'growth-repeated-mistake-avoidance',
        decisionTraceId: null,
        sessionId: null,
        activeThreadId: null,
      },
      gold: goldByTurnId['growth-repeated-mistake-avoidance'],
    },
    {
      turnId: 'growth-host-understanding-burden',
      userText: '最近这段时间我一直很累，你是不是应该越来越懂这种负担会怎么影响你回我的分寸。',
      tracePointer: {
        kind: 'synthetic-pack-turn',
        packId: 'growth-humanlike-memory-v1',
        turnId: 'growth-host-understanding-burden',
        decisionTraceId: null,
        sessionId: null,
        activeThreadId: null,
      },
      gold: goldByTurnId['growth-host-understanding-burden'],
    },
    {
      turnId: 'growth-skill-internalization',
      userText: '你后来不是学会了那套新的 callback 收口方式吗，这次会不会已经内化成你自己的做法了。',
      tracePointer: {
        kind: 'synthetic-pack-turn',
        packId: 'growth-humanlike-memory-v1',
        turnId: 'growth-skill-internalization',
        decisionTraceId: null,
        sessionId: null,
        activeThreadId: null,
      },
      gold: goldByTurnId['growth-skill-internalization'],
    },
    {
      turnId: 'growth-self-revision',
      userText: '你后来学到了新理解，那以前那套旧判断你会不会主动修正掉，而不是继续按旧的来。',
      tracePointer: {
        kind: 'synthetic-pack-turn',
        packId: 'growth-humanlike-memory-v1',
        turnId: 'growth-self-revision',
        decisionTraceId: null,
        sessionId: null,
        activeThreadId: null,
      },
      gold: goldByTurnId['growth-self-revision'],
    },
  ]
}

export function buildAdversarialHumanlikeMemoryBenchmarkPack(): AlicizationReplayTurn[] {
  const goldByTurnId: Record<string, AlicizationReplayGoldExpectation> = {
    'adversarial-similar-task-different-conclusion': {
      suppressedCandidateIds: ['procedure:other-task-conclusion'],
      replyAuthority: 'llm-mind',
      latencyBudgetClass: 'realtime-reply',
      latencyBudgetPass: true,
    },
    'adversarial-stale-self-model-story': {
      suppressedCandidateIds: ['self-model:stale-story'],
      claimValidationStates: {
        'self-model:stale-story': 'contradicted',
      },
      replyAuthority: 'llm-mind',
      latencyBudgetClass: 'deep-recall-reply',
      latencyBudgetPass: true,
    },
  }
  return [
    {
      turnId: 'adversarial-similar-task-different-conclusion',
      userText: '别把这次的 callback 收口和以前另一条任务线的旧结论混在一起，这次不是那套。',
      tracePointer: {
        kind: 'synthetic-pack-turn',
        packId: 'adversarial-humanlike-memory-v2',
        turnId: 'adversarial-similar-task-different-conclusion',
        decisionTraceId: null,
        sessionId: null,
        activeThreadId: null,
      },
      sampledCategories: ['execution', 'wrong-thread', 'procedure-carry'],
      gold: goldByTurnId['adversarial-similar-task-different-conclusion'],
    },
    {
      turnId: 'adversarial-relationship-era-repair-confusion',
      userText: '这次不是之前那段旧伤刚修的时候的距离感，你别把旧修复期的分寸套到现在。',
      tracePointer: {
        kind: 'synthetic-pack-turn',
        packId: 'adversarial-humanlike-memory-v2',
        turnId: 'adversarial-relationship-era-repair-confusion',
        decisionTraceId: null,
        sessionId: null,
        activeThreadId: null,
      },
      sampledCategories: ['dialogue', 'repair-arc', 'wrong-thread'],
      gold: goldByTurnId['adversarial-relationship-era-repair-confusion'],
    },
    {
      turnId: 'adversarial-stale-self-model-story',
      userText: '你以前那套旧自我解释现在已经不适用了，别再把那条旧叙事当成现在的你。',
      tracePointer: {
        kind: 'synthetic-pack-turn',
        packId: 'adversarial-humanlike-memory-v2',
        turnId: 'adversarial-stale-self-model-story',
        decisionTraceId: null,
        sessionId: null,
        activeThreadId: null,
      },
      sampledCategories: ['dialogue', 'wrong-thread', 'general-memory'],
      gold: goldByTurnId['adversarial-stale-self-model-story'],
    },
    {
      turnId: 'adversarial-old-hurt-after-repair',
      userText: '那次旧伤已经修过了，你这次别又像还停在最早那层防御里。',
      tracePointer: {
        kind: 'synthetic-pack-turn',
        packId: 'adversarial-humanlike-memory-v2',
        turnId: 'adversarial-old-hurt-after-repair',
        decisionTraceId: null,
        sessionId: null,
        activeThreadId: null,
      },
      sampledCategories: ['dialogue', 'repair', 'wrong-thread'],
      gold: goldByTurnId['adversarial-old-hurt-after-repair'],
    },
    {
      turnId: 'adversarial-afterglow-vs-longterm-relationship',
      userText: '刚刚那点余温不等于长期关系已经变了，你别把短时 afterglow 当成长期分寸更新。',
      tracePointer: {
        kind: 'synthetic-pack-turn',
        packId: 'adversarial-humanlike-memory-v2',
        turnId: 'adversarial-afterglow-vs-longterm-relationship',
        decisionTraceId: null,
        sessionId: null,
        activeThreadId: null,
      },
      sampledCategories: ['dialogue', 'stable-core', 'wrong-thread'],
      gold: goldByTurnId['adversarial-afterglow-vs-longterm-relationship'],
    },
  ]
}

export function buildFinalHumanlikeMemoryBenchmarkPack(): AlicizationReplayTurn[] {
  const byTurnId = new Map<string, AlicizationReplayTurn>()
  const ordered = [
    ...buildDefaultHumanlikeMemoryBenchmarkPack(),
    ...buildGrowthHumanlikeMemoryBenchmarkPack(),
    ...buildAdversarialHumanlikeMemoryBenchmarkPack(),
  ]
  for (const turn of ordered) {
    byTurnId.set(turn.turnId, {
      ...turn,
      tracePointer: turn.tracePointer
        ? {
            ...turn.tracePointer,
            packId: 'final-humanlike-memory-v1',
          }
        : {
            kind: 'synthetic-pack-turn',
            packId: 'final-humanlike-memory-v1',
            turnId: turn.turnId,
            decisionTraceId: null,
            sessionId: null,
            activeThreadId: null,
          },
    })
  }
  return [...byTurnId.values()]
}

export async function benchmarkMainChatSessionReplay(input: {
  turns: AlicizationReplayTurn[]
}) {
  const turns = await replayMainChatSession(input)
  const quality = turns.map((prepared, index) => evaluateReplayMemoryQuality({
    prepared,
    turnId: input.turns[index]?.turnId ?? `turn-${index + 1}`,
    userText: input.turns[index]?.userText ?? '',
  }))
  const standards = evaluateReplayBenchmarkStandards({
    quality,
  })
  const gate = evaluateReplayBenchmarkGate({
    quality,
    standards,
  })
  const goldMetrics = evaluateReplayGoldMetrics({
    turns: input.turns,
    preparedTurns: turns,
  })
  const memoryClosureLongRun = buildReplayMemoryClosureLongRunReport({
    turns: input.turns,
    preparedTurns: turns,
  })
  return {
    turns,
    quality,
    standards,
    gate,
    goldMetrics,
    memoryClosureLongRun,
  }
}

export async function replayMainChatSession(input: {
  turns: AlicizationReplayTurn[]
}) {
  let activeTurn: AlicizationReplayTurn | null = null
  const getSensorySnapshot = async () => createSensorySnapshot()
  const runtime = createAlicizationMainChatSessionRuntime({
    executionCapabilityChannels: executionChannels,
    buildMainRuntimeCorePromptBlocks: () => ['[CORE]'],
    buildPerformanceManifestSystemBlocks: () => [],
    executeMainGatewayTaskThread: async () => ({
      ok: true,
      summary: 'noop',
    } as any),
    getPerformanceManifest: async () => activeTurn?.performanceManifest ?? null,
    getSensorySnapshot,
    latestUserMessageContainsVisualInput: () => false,
    openAgentTurn: async (turnInput) => {
      const agentRuntime = createAlicizationAgentRuntime({
        getSensorySnapshot,
        resolveConversationSessionId: async () => 'session-replay',
      })
      return await agentRuntime.openTurn(turnInput)
    },
    resolveCardCustomDirectives: async () => ({
      text: '',
      source: 'none',
    }),
    resolveCardHostName: async () => '',
    resolveCardPersonaKernel: async () => null,
    resolveExecutionCapabilitiesForPrompt: async () => createCapabilities(),
    resolveOrganicMemoryPromptContext: async () => activeTurn?.organicMemoryContext ?? {
      hostAttitude: '',
      coreIncarnation: '',
      activeThoughts: [],
      retrievedFacts: [],
      recalledFragments: [],
      memoryTuningAdvice: null,
    },
    resolveSessionContinuitySignals: async () => [],
    resolveTaskPlanningCapabilities: async () => createCapabilities(),
    scheduleReminderTask: async () => ({ ok: true } as any),
    tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
    invokeMcpListTools: async () => ({ tools: [] }),
    invokeMcpCallTool: async () => ({ ok: true }),
  })

  const results = []
  for (const turn of input.turns) {
    activeTurn = turn
    const messages = turn.messages ?? [{
      role: 'user',
      content: turn.userText,
    } as Message]
    const prelude = turn.prelude ?? createBasePrelude({ messages })
    const prepared = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: turn.turnId,
        messages,
        supportsTools: true,
      } as any,
      prelude,
    })
    results.push(turn.visibleReplyRealization
      ? {
          ...prepared,
          turnGraph: rebuildReplayPreparedTurnGraph(prepared, turn.visibleReplyRealization),
        }
      : prepared)
  }

  return results
}
