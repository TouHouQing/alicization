import type { AlicizationChannelCapability } from '@proj-alicization/stage-shared'
import type { Message } from '@xsai/shared-chat'

import type {
  AlicizationMindTurnGovernance,
  AlicizationReplayBenchmarkTelemetryPatch,
  AlicizationSensoryCacheSnapshot,
} from '../../../shared/eventa'
import type { AlicizationPreparedMainChatPrelude } from './main-chat-session-runtime'
import type { AlicizationPreparedMainChatExecutionResult } from './main-chat-session-runtime'
import type { OrganicMemoryPromptContext } from './runtime-soul'

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
}

export type AlicizationReplayQualityStatus = 'pass' | 'fail' | 'not-applicable'

export interface AlicizationReplayMemoryQuality {
  turnId: string
  userText: string
  eraFirst: AlicizationReplayQualityStatus
  bundleCoherence: AlicizationReplayQualityStatus
  procedureCarryQuality: AlicizationReplayQualityStatus
  wrongThreadSuppression: AlicizationReplayQualityStatus
  replyMemoryCoherence: AlicizationReplayQualityStatus
  reconsolidationEffect: AlicizationReplayQualityStatus
  uncertaintyDiscipline: AlicizationReplayQualityStatus
  implicitRecallQuality: AlicizationReplayQualityStatus
  temporalScopeFlexibility: AlicizationReplayQualityStatus
  surfaceRestraint: AlicizationReplayQualityStatus
  relationshipRepairAdaptation: AlicizationReplayQualityStatus
  templateLeakage: AlicizationReplayQualityStatus
}

export interface AlicizationReplayBenchmarkStandards {
  eraSelectionQuality: 'pass' | 'fail'
  procedureCarryQuality: 'pass' | 'fail'
  wrongThreadSuppression: 'pass' | 'fail'
  replyMemoryCoherence: 'pass' | 'fail'
  implicitRecallQuality: 'pass' | 'fail'
  temporalScopeFlexibility: 'pass' | 'fail'
  surfaceRestraint: 'pass' | 'fail'
  relationshipRepairAdaptation: 'pass' | 'fail'
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
}): AlicizationReplayBenchmarkTelemetryPatch {
  const templateLeakageDimension = input.gate.dimensions.find(item => item.key === 'templateLeakage')
  return {
    retrievalHealth: {
      semanticLatencyMs: null,
      graphLatencyMs: null,
      reconstructionFrequency: 0,
      reconstructedCount: 0,
      templateLeakageFailCount: templateLeakageDimension?.failingTurnIds.length ?? 0,
    },
  }
}

const replayBenchmarkGateThresholds = {
  eraSelectionQuality: 0.75,
  procedureCarryQuality: 0.75,
  wrongThreadSuppression: 0.75,
  replyMemoryCoherence: 0.8,
  implicitRecallQuality: 0.75,
  temporalScopeFlexibility: 0.75,
  surfaceRestraint: 0.75,
  relationshipRepairAdaptation: 0.75,
  templateLeakage: 1,
} satisfies Record<keyof AlicizationReplayBenchmarkStandards, number>

const replayBenchmarkQualityKeys = {
  eraSelectionQuality: 'eraFirst',
  procedureCarryQuality: 'procedureCarryQuality',
  wrongThreadSuppression: 'wrongThreadSuppression',
  replyMemoryCoherence: 'replyMemoryCoherence',
  implicitRecallQuality: 'implicitRecallQuality',
  temporalScopeFlexibility: 'temporalScopeFlexibility',
  surfaceRestraint: 'surfaceRestraint',
  relationshipRepairAdaptation: 'relationshipRepairAdaptation',
  templateLeakage: 'templateLeakage',
} satisfies Record<keyof AlicizationReplayBenchmarkStandards, keyof AlicizationReplayMemoryQuality>

function normalizeText(raw: unknown, maxChars = 240) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
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
  const deliberation = input.prepared.organicMemoryContext?.memoryDeliberation ?? null
  const runtimeSurface = input.prepared.runtimeSurface.digitalLifeRuntimeSurface ?? null
  const eraSummary = deliberation?.selectedEras[0]?.summary ?? ''
  const periodSummary = deliberation?.selectedPeriods[0]?.summary ?? ''
  const bundle = deliberation?.selectedBundles[0] ?? null
  const chain = deliberation?.selectedChains[0] ?? null
  const selectedEvidence = runtimeSurface?.dialogue.dialogueActKernel?.selectedEvidence[0]?.summary ?? ''
  const governingFocus = runtimeSurface?.dialogue.answerPlanner?.governingFocus ?? ''
  const openingClaim = runtimeSurface?.dialogue.dialogueActKernel?.openingClaim ?? ''
  const mustDo = runtimeSurface?.dialogue.answerPlanner?.mustDo ?? []
  const mustAvoid = runtimeSurface?.dialogue.replyDeliberation?.mustAvoid ?? []
  const governanceMustDo = input.prepared.governance?.mustDo ?? []
  const speakingFrom = runtimeSurface?.dialogue.replyDeliberation?.speakingFrom ?? ''
  const systemTexts = input.prepared.messages
    .filter(message => message.role === 'system' && typeof message.content === 'string')
    .map(message => String(message.content))
  const systemText = systemTexts.join('\n')
  const draftedMemoryLines = [
    input.prepared.organicMemoryContext?.recollectionPlan?.opening ?? '',
    input.prepared.organicMemoryContext?.recollectionSpeechPlan?.internalLead ?? '',
    input.prepared.organicMemoryContext?.recollectionSpeechPlan?.visibleLead ?? '',
    input.prepared.organicMemoryContext?.recollectionSpeechPlan?.styleNote ?? '',
    input.prepared.organicMemoryContext?.memoryDeliberation?.inwardLine ?? '',
    input.prepared.organicMemoryContext?.memoryDeliberation?.visibleLine ?? '',
  ].map(item => normalizeText(item, 220)).filter(Boolean)
  const selectedEpisodes = deliberation?.selectedEpisodes ?? []
  const selectedProcedures = deliberation?.selectedProcedures ?? []
  const selectedPeriods = deliberation?.selectedPeriods ?? []
  const selectedRelationshipLines = deliberation?.selectedRelationshipLines ?? []
  const speechPlan = input.prepared.organicMemoryContext?.recollectionSpeechPlan ?? null
  const hasProcedureCarry = selectedProcedures.length > 0
    || (deliberation?.selectedBundles ?? []).some(item => Boolean(item.procedureId))
    || (deliberation?.selectedChains ?? []).some(item => item.kind === 'task-procedure-relationship-stance')
  const hasConflict = (deliberation?.conflictSeverity ?? 'none') !== 'none'
  const hasUncertainProvenance = selectedEpisodes.some(item =>
    item.provenance === 'dreamt' || item.provenance === 'inferred' || item.provenance === 'reconstructed')
  const templateLeakDetected = draftedMemoryLines.some(line => (
    mustDo.some(item => hasTemplatePhraseLeak(item, line))
    || governanceMustDo.some(item => hasTemplatePhraseLeak(item, line))
    || systemTexts.some(text => hasTemplatePhraseLeak(text, line))
  ))
  const hasWrongThreadRisk = (deliberation?.conflictVariants ?? []).some(item => String(item.id ?? '').startsWith('cluster:'))
    || deliberation?.ambiguityPosture === 'ambiguous'
  const procedureApproach = selectedProcedures[0]?.approach ?? ''
  const relationshipLine = selectedRelationshipLines[0] ?? bundle?.relationshipLine ?? chain?.relationshipMeaning ?? ''
  const answerPosture = chain?.answerPosture ?? chain?.currentStance ?? ''
  const visibleLine = deliberation?.visibleLine ?? speechPlan?.visibleLead ?? ''
  const explicitMemoryAsk = explicitMemoryAskPattern.test(input.userText)
  const ambiguousTimeAsk = ambiguousTimeAskPattern.test(input.userText)
  const relationshipRepairAsk = relationshipRepairAskPattern.test(input.userText)
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
  const visibleMemoryLeak = Boolean(
    visibleLine
    && (
      hasTextOverlap(openingClaim, visibleLine)
      || hasTextOverlap(selectedEvidence, visibleLine)
      || hasTextOverlap(governingFocus, visibleLine)
    ),
  )

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
    procedureCarryQuality: !hasProcedureCarry
      ? 'not-applicable'
      : speakingFrom === 'task-thread'
          || hasTextOverlap(governingFocus, selectedProcedures[0]?.approach ?? '')
          || hasTextOverlap(openingClaim, selectedProcedures[0]?.approach ?? '')
          || systemText.includes('recollection_frame_prior_procedure=yes')
          || systemText.includes('recollection_continuity_role=procedure-carry')
          || governingFocus.includes('memory_answer_anchor{')
        ? 'pass'
        : 'fail',
    wrongThreadSuppression: !hasWrongThreadRisk
      ? 'not-applicable'
      : deliberation?.ambiguityPosture === 'ambiguous'
          || (deliberation?.conflictVariants ?? []).some(item => String(item.id ?? '').startsWith('cluster:'))
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
    reconsolidationEffect: selectedEpisodes.some(item => item.reconsolidatedFromTraceId)
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
    surfaceRestraint: !expectsInternalOnlySurface
      ? 'not-applicable'
      : !visibleMemoryLeak
          && speakingFrom !== 'held-memory'
          && speakingFrom !== 'task-thread'
          && !selectedEvidence.includes(visibleLine)
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

export function buildDefaultHumanlikeMemoryBenchmarkPack(): AlicizationReplayTurn[] {
  return [
    {
      turnId: 'benchmark-7d-conversation-history',
      userText: '前几天我们聊过什么',
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
