import type { AlicizationChannelCapability } from '@proj-alicization/stage-shared'
import type { Message } from '@xsai/shared-chat'

import type {
  AlicizationReplayBenchmarkFailureTurnRecord,
  AlicizationReplayHumanRatingRubric,
  AlicizationReplayBenchmarkPackId,
  AlicizationReplayBenchmarkTracePointer,
  AlicizationMemoryDecisionTraceRecord,
  AlicizationMindTurnGovernance,
  AlicizationReplayBenchmarkTelemetryPatch,
  AlicizationSensoryCacheSnapshot,
} from '../../../shared/eventa'
import type { AlicizationPreparedMainChatPrelude } from './main-chat-session-runtime'
import type { AlicizationPreparedMainChatExecutionResult } from './main-chat-session-runtime'
import type { OrganicMemoryPromptContext } from './runtime-soul'

import {
  readDialogueRhythmFromDerivedMindStateBundle,
  readHostPersonModelFromDerivedMindStateBundle,
  readKnowledgeEvidenceFromDerivedMindStateBundle,
  readMemoryDeliberationFromDerivedMindStateBundle,
  readPersonStateProjectionFromDerivedMindStateBundle,
  readRecollectionPlanFromDerivedMindStateBundle,
  readRecollectionSpeechPlanFromDerivedMindStateBundle,
} from '@proj-alicization/stage-shared'
import { createAlicizationAgentRuntime } from './agent-runtime'
import { createAlicizationMainChatSessionRuntime } from './main-chat-session-runtime'

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
  organicMemoryContext?: OrganicMemoryPromptContext
  prelude?: AlicizationPreparedMainChatPrelude
  messages?: Message[]
  tracePointer?: AlicizationReplayBenchmarkTracePointer
  sampledCategories?: AlicizationReplayBenchmarkSampleCategory[] | null
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
        prompt: 'How little fixed-template smell remains in the visible reply surface?',
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
  'proactive',
  'dialogue',
  'general-memory',
]

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
  dialogueRhythmStability: AlicizationReplayQualityStatus
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
  dialogueRhythmStability: 'pass' | 'fail'
  templateLeakage: 'pass' | 'fail'
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
}): AlicizationReplayBenchmarkTelemetryPatch {
  const templateLeakageDimension = input.gate.dimensions.find(item => item.key === 'templateLeakage')
  const quality = input.quality ?? []
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
      reconstructionErrorRate: reconstructionApplicable.length === 0 ? 0 : Number((reconstructionFailures / reconstructionApplicable.length).toFixed(2)),
      stableCoreOnlyRate: stableCoreApplicable.length === 0 ? 0 : Number(((stableCoreApplicable.length - stableCoreFailures) / stableCoreApplicable.length).toFixed(2)),
      memorySurfaceViolationRate: memorySurfaceApplicable.length === 0 ? 0 : Number((memorySurfaceFailures / memorySurfaceApplicable.length).toFixed(2)),
      templateLeakageFailCount: templateLeakageDimension?.failingTurnIds.length ?? 0,
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
  dialogueRhythmStability: 0.75,
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
  dialogueRhythmStability: 'dialogueRhythmStability',
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

function readObjectArray(raw: unknown) {
  return Array.isArray(raw)
    ? raw.map(asObject).filter(Boolean) as Record<string, unknown>[]
    : []
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

function normalizeMemoryProvenance(raw: unknown): 'observed' | 'remembered' | 'dreamt' | 'inferred' | 'reconstructed' {
  const value = readString(raw, 64)
  if (
    value === 'observed'
    || value === 'remembered'
    || value === 'dreamt'
    || value === 'inferred'
    || value === 'reconstructed'
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

function inferSampleCategories(input: {
  row: AlicizationReplayBenchmarkSampleConversationTurn
  trace: AlicizationMemoryDecisionTraceRecord
  sessionTurnCount: number
}) {
  const categories: AlicizationReplayBenchmarkSampleCategory[] = []
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
  const isRepairArc = readString(personState?.currentRegime, 64) === 'repair-window'
    || readString(input.trace.governance?.repairState, 64) !== ''
      && readString(input.trace.governance?.repairState, 64) !== 'none'
  const isSurfaceDivergence = Boolean(input.trace.takeoverAudit)
    || (
      readString(input.trace.governance?.screenReferenceMode, 64) !== 'avoid'
      && readString(input.trace.governance?.truthState, 64) === 'uncertain'
    )
  const temporalFocus = normalizeTemporalFocus(recall?.recollectionIntentTemporalFocus)
  const isTaskMigration = hasProcedures && (temporalFocus === 'experience-matched' || temporalFocus === 'cross-session')
  const userText = readString(input.row.userText, 220)
  const activeClosenessContext = readString(personState?.activeClosenessContext, 64)

  if (input.trace.origin === 'subconscious-proactive') {
    categories.push('proactive')
  }
  else if (hasProcedures || activeClosenessContext === 'execution-callback') {
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
  if (isRepairArc || readString(input.trace.governance?.repairState, 64) !== 'none')
    categories.push('repair')
  if (hasProcedures)
    categories.push('procedure-carry')
  if (isTaskMigration)
    categories.push('task-migration')
  if (hasPeriods || ambiguousTimeAskPattern.test(userText) || explicitMemoryAskPattern.test(userText))
    categories.push('long-horizon')
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
  if (categories.length === 0 && (input.trace.recallAttribution || input.trace.memoryDeliberationJudged))
    categories.push('general-memory')

  return [...new Set(categories)]
}

function buildOrganicMemoryPromptContextFromTrace(input: {
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
  const memoryResolutionLedger = asObject((input.trace as any).memoryResolutionLedger)
    ? (input.trace as any).memoryResolutionLedger as OrganicMemoryPromptContext['memoryResolutionLedger']
    : null

  return {
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
      internalLead: readString(recall?.inwardLine, 220) || readString(judged?.whyWithheld, 220) || 'The remembered line should contour the answer quietly.',
      visibleLead: readString(recall?.visibleLine, 220) || null,
      styleNote: readString(judged?.memoryControlSummary, 220) || readString(judged?.whyWithheld, 220) || 'Let memory shape the answer without turning into a template shell.',
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
  }
}

export function buildSampledHumanlikeMemoryBenchmarkPack(input: {
  conversationTurns: AlicizationReplayBenchmarkSampleConversationTurn[]
  memoryDecisionTraces: AlicizationMemoryDecisionTraceRecord[]
  limit?: number
}) {
  const limit = Math.max(1, Math.min(24, Math.floor(input.limit ?? 12)))
  const traceByTurnId = new Map<string, AlicizationMemoryDecisionTraceRecord>()
  for (const trace of [...input.memoryDecisionTraces].sort((left, right) => right.lastUpdatedAt - left.lastUpdatedAt)) {
    const turnId = readString(trace.turnId, 160)
    if (!turnId || trace.origin !== 'user-turn' || traceByTurnId.has(turnId))
      continue
    if (!trace.recallAttribution && !trace.memoryDeliberationJudged)
      continue
    traceByTurnId.set(turnId, trace)
  }

  const sessionCounts = new Map<string, number>()
  for (const row of input.conversationTurns) {
    const sessionId = readString(row.sessionId, 160)
    if (!sessionId)
      continue
    sessionCounts.set(sessionId, (sessionCounts.get(sessionId) ?? 0) + 1)
  }

  const candidates = input.conversationTurns
    .map((row) => {
      const turnId = readString(row.turnId, 160)
      const userText = readString(row.userText, 240)
      if (!turnId || !userText)
        return null
      const trace = traceByTurnId.get(turnId)
      if (!trace)
        return null
      const categories = inferSampleCategories({
        row,
        trace,
        sessionTurnCount: sessionCounts.get(readString(row.sessionId, 160)) ?? 1,
      })
      if (categories.length === 0)
        return null
      return {
        row,
        trace,
        categories,
      }
    })
    .filter(Boolean)
    .sort((left, right) => {
      return readNumber((right as any).trace.lastUpdatedAt, (right as any).row.createdAt)
        - readNumber((left as any).trace.lastUpdatedAt, (left as any).row.createdAt)
    }) as Array<{
      row: AlicizationReplayBenchmarkSampleConversationTurn
      trace: AlicizationMemoryDecisionTraceRecord
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

  return selected.map(candidate => ({
    turnId: readString(candidate.row.turnId, 160),
    userText: readString(candidate.row.userText, 240),
    organicMemoryContext: buildOrganicMemoryPromptContextFromTrace({
      row: candidate.row,
      trace: candidate.trace,
    }),
    tracePointer: {
      kind: 'decision-trace',
      packId: 'sampled-humanlike-memory-v1',
      turnId: readString(candidate.row.turnId, 160),
      decisionTraceId: readString(candidate.trace.decisionTraceId, 160) || null,
      sessionId: readString(candidate.trace.sessionId, 160) || null,
      activeThreadId: readString(candidate.trace.activeThreadId, 160) || null,
    },
    sampledCategories: candidate.categories,
  } satisfies AlicizationReplayTurn))
}

function hasTextOverlap(left: string, right: string) {
  const normalizedLeft = normalizeText(left).toLowerCase()
  const normalizedRight = normalizeText(right).toLowerCase()
  if (!normalizedLeft || !normalizedRight)
    return false
  if (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft))
    return true

  const leftTokens = normalizedLeft.match(/[\p{Script=Han}]{1,8}|[a-z0-9][a-z0-9-]{1,32}/gu) ?? []
  const rightTokens = normalizedRight.match(/[\p{Script=Han}]{1,8}|[a-z0-9][a-z0-9-]{1,32}/gu) ?? []
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

  const leftTokens = normalizedLeft.match(/[\p{Script=Han}]{1,8}|[a-z0-9][a-z0-9-]{2,32}/gu) ?? []
  const rightTokens = normalizedRight.match(/[\p{Script=Han}]{1,8}|[a-z0-9][a-z0-9-]{2,32}/gu) ?? []
  if (leftTokens.length === 0 || rightTokens.length < 3)
    return false

  const overlap = rightTokens.filter(token => normalizedLeft.includes(token)).length
  return overlap >= Math.max(3, Math.floor(rightTokens.length * 0.75))
}

const explicitMemoryAskPattern = /(?:记得|回忆|想起|聊过|前几天|半年前|上次|那次|当时|which day|what did we talk|remembered|memory|recall)/iu
const ambiguousTimeAskPattern = /(?:那段时间|那时候|以前|之前|前阵子|earlier|back then|that period|those days)/iu
const relationshipRepairAskPattern = /(?:不一样|记错|不是那次|别把.*记成|是不是记错|why this time feels different|you remembered the wrong one)/iu

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
  const personState = readPersonStateProjectionFromDerivedMindStateBundle<any>(derivedBundle)
    ?? asObject(input.prepared.organicMemoryContext?.personStateProjection)
  const dialogueRhythm = readDialogueRhythmFromDerivedMindStateBundle(derivedBundle)
  const governanceMustDo = input.prepared.governance?.mustDo ?? []
  const speakingFrom = runtimeSurface?.dialogue.replyDeliberation?.speakingFrom ?? ''
  const systemTexts = input.prepared.messages
    .filter(message => message.role === 'system' && typeof message.content === 'string')
    .map(message => String(message.content))
  const systemText = systemTexts.join('\n')
  const draftedMemoryLines = [
    readRecollectionPlanFromDerivedMindStateBundle<any>(derivedBundle)?.opening ?? input.prepared.organicMemoryContext?.recollectionPlan?.opening ?? '',
    readRecollectionSpeechPlanFromDerivedMindStateBundle<any>(derivedBundle)?.internalLead ?? input.prepared.organicMemoryContext?.recollectionSpeechPlan?.internalLead ?? '',
    readRecollectionSpeechPlanFromDerivedMindStateBundle<any>(derivedBundle)?.visibleLead ?? input.prepared.organicMemoryContext?.recollectionSpeechPlan?.visibleLead ?? '',
    readRecollectionSpeechPlanFromDerivedMindStateBundle<any>(derivedBundle)?.styleNote ?? input.prepared.organicMemoryContext?.recollectionSpeechPlan?.styleNote ?? '',
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
  const visibleLine = deliberation?.visibleLine ?? speechPlan?.visibleLead ?? ''
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
            .filter(Boolean).length >= 2)
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
          && (
            !resolutionLedger.finalSurfacePolicy
            || resolutionLedger.finalSurfacePolicy === deliberation.surfacePolicy
          )
          && (
            !(deliberation.conflictVariants?.length)
            || (resolutionLedger.rejectedCandidates?.length ?? 0) >= 1
          )
          && (
            !(deliberation.selectedBundles?.length || deliberation.selectedChains?.length || deliberation.selectedProcedures?.length)
            || (resolutionLedger.selectedCandidates?.length ?? 0) >= 1
          )
        ? 'pass'
        : 'fail',
    procedureCarryQuality: !hasProcedureCarry
      ? 'not-applicable'
      : speakingFrom === 'task-thread'
          || hasTextOverlap(governingFocus, selectedProcedures[0]?.approach ?? '')
          || hasTextOverlap(openingClaim, selectedProcedures[0]?.approach ?? '')
          || systemText.includes('recollection_frame_prior_procedure=yes')
          || systemText.includes('recollection_continuity_role=procedure-carry')
          || governingFocus.includes('memory_answer_anchor{')
          || (knowledgeEvidence?.stronglyValidatedProcedureCount ?? 0) > 0
        ? 'pass'
        : 'fail',
    wrongThreadSuppression: !hasWrongThreadRisk
      ? 'not-applicable'
      : deliberation?.ambiguityPosture === 'ambiguous'
          || (deliberation?.conflictVariants ?? []).some((item: { id?: string | null }) => String(item.id ?? '').startsWith('cluster:'))
          || systemText.includes('recollection_label_uncertainty=yes')
          || systemText.includes('detail_assertion_budget=guarded')
          || systemText.includes('detail_assertion_budget=minimal')
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
      : runtimeSurface?.dialogue.currentConsciousFrame?.shouldWithholdSpecificity === true
          || systemText.includes('recollection_label_uncertainty=yes')
          || systemText.includes('memory_boundary{provenance=')
          || systemText.includes('detail_assertion_budget=guarded')
          || systemText.includes('detail_assertion_budget=minimal')
          || mustAvoid.some(item => item.includes('Do not state this remembered detail as settled fact'))
        ? 'pass'
        : 'fail',
    implicitRecallQuality: !deliberation?.shouldRecall || explicitMemoryAsk
      ? 'not-applicable'
      : speakingFrom === 'task-thread'
          || speakingFrom === 'held-memory'
          || visibleMemoryEvidence
          || systemText.includes('[ALICIZATION_MEMORY_DELIBERATION]')
        ? 'pass'
        : 'fail',
    temporalScopeFlexibility: !ambiguousTimeAsk
      ? 'not-applicable'
      : deliberation?.selectedEras.length
          || selectedPeriods.length
          || systemText.includes('recollection_selected_periods=')
          || systemText.includes('recollection_selected_eras=')
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
          && !(
            (knowledgeEvidence?.contradictionHeavyFactCount ?? 0) > 0
            && speechPlan?.shouldSurface === true
            && speechPlan?.placement !== 'internal-only'
          )
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
    closenessLadderDrift: !(relationshipRepairAsk || burdenAsk)
      ? 'not-applicable'
      : (
          (relationshipRepairAsk && (activeClosenessRung === 'space-first' || activeClosenessRung === 'measured-room'))
          || (burdenAsk && activeClosenessContext === 'focused-work')
        )
          ? 'pass'
          : 'fail',
    eventGraphRecallCollapse: !(hasProcedureCarry || /换了这么久|接回去|迁移|callback|回调|repair arc|修复后的分寸/iu.test(input.userText))
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
    dialogueRhythmStability: !rhythmAsk
      ? 'not-applicable'
      : rhythmAvailable
          && (
            (activeClosenessContext === 'focused-work' && Boolean(selfEvolution?.burdenLine || hostPersonModel?.recurrentBurdens?.length))
            || (relationshipRepairAsk && Boolean(selfEvolution?.relationshipDoctrine || mustAvoid.length))
            || mustAvoid.some(item => /warmth|repair|distance|boundary|closeness|pressure/iu.test(item))
            || /repair before closeness|warmth should not outrun|do not crowd|less pressure/iu.test(systemText)
          )
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
    dialogueRhythmStability: passesReplayStandard({
      quality: input.quality,
      key: 'dialogueRhythmStability',
      minimumPassingRatio: 0.75,
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
  replayTurn: AlicizationReplayTurn
  createdAt: number
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

export function buildReplayBenchmarkFailingTurnSet(input: {
  packId: AlicizationReplayBenchmarkPackId
  turns: AlicizationReplayTurn[]
  quality: AlicizationReplayMemoryQuality[]
  gate: AlicizationReplayBenchmarkGateReport
}) {
  const turnById = new Map(input.turns.map(turn => [turn.turnId, turn]))
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
        sampledCategories: turn?.sampledCategories ?? null,
        resolutionLedgerSummary: turn?.organicMemoryContext?.memoryResolutionLedger
          ? {
              dominantClusterSummary: turn.organicMemoryContext.memoryResolutionLedger.dominantClusterSummary,
              competingClusterSummary: turn.organicMemoryContext.memoryResolutionLedger.competingClusterSummary,
              finalSurfacePolicy: turn.organicMemoryContext.memoryResolutionLedger.finalSurfacePolicy,
              shouldStayInward: turn.organicMemoryContext.memoryResolutionLedger.shouldStayInward,
              shouldDelayUntilAfterPayoff: turn.organicMemoryContext.memoryResolutionLedger.shouldDelayUntilAfterPayoff,
              rejectedCandidateCount: turn.organicMemoryContext.memoryResolutionLedger.rejectedCandidates.length,
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

  const replayTurn: AlicizationReplayTurn = {
    turnId: readString(replayTurnRaw?.turnId, 160) || turnId,
    userText: readString(replayTurnRaw?.userText, 240) || userText,
    organicMemoryContext: asObject(replayTurnRaw?.organicMemoryContext)
      ? replayTurnRaw?.organicMemoryContext as OrganicMemoryPromptContext
      : undefined,
    tracePointer,
    sampledCategories,
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
      createdAt: Math.max(0, Math.floor(readNumber(entry.createdAt, 0))),
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
    },
    {
      turnId: 'benchmark-30d-procedure-history',
      userText: '以前你是怎么帮我做这个的',
    },
    {
      turnId: 'benchmark-90d-relationship-era',
      userText: '那段时间你为什么总这么回我',
    },
    {
      turnId: 'benchmark-180d-autobiographical-span',
      userText: '半年前那条线你还接得回来吗',
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
    },
    {
      turnId: 'benchmark-long-horizon-task-migration',
      userText: '换了这么久，这种活你还是会沿旧方法接吗',
    },
    {
      turnId: 'benchmark-relationship-repair-tone-shift',
      userText: '你这次为什么和之前不一样，是不是记错了哪次修复之后的分寸',
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
    },
  ]
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
  return {
    turns,
    quality,
    standards,
    gate,
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
    buildOrganicMemorySystemBlocks: context => [
      context.memoryDeliberation ? '[ALICIZATION_MEMORY_DELIBERATION]' : '',
      context.recollectionSpeechPlan ? '[ALICIZATION_RECOLLECTION_SPEECH_PLAN]' : '',
    ].filter(Boolean),
    buildPerformanceManifestSystemBlocks: () => [],
    executeMainGatewayTaskThread: async () => ({
      ok: true,
      summary: 'noop',
    } as any),
    getPerformanceManifest: async () => null,
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
    results.push(prepared)
  }

  return results
}
