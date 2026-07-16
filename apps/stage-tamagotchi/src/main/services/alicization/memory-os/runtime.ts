import type { AlicizationDigitalLifeRuntimeSurface } from '../digital-life-kernel'
import type { AlicizationTurnRetrievalPolicySnapshot } from '../memory-accessibility-runtime'
import type { OrganicMemoryPromptContext } from '../runtime-soul'
import type { AlicizationMemoryTurnArtifact } from './memory-turn-artifact'

import { buildAlicizationMemoryTurnArtifact } from './memory-turn-artifact'

export const alicizationMemoryOsCanonicalStageOrder = [
  'recall-intent',
  'candidate-retrieval',
  'candidate-competition',
  'memory-deliberation',
  'speech-posture',
  'memory-settlement',
  'feedback-ledger',
] as const

export type AlicizationMemoryOsStage = typeof alicizationMemoryOsCanonicalStageOrder[number]

export interface AlicizationMemoryOsStageSettlement {
  version: 'memory-os-stage-settlement-v1'
  stage: AlicizationMemoryOsStage
  status: 'completed' | 'skipped' | 'blocked'
  summary: string[]
  reasonCodes: string[]
}

export interface AlicizationMemoryOsTurnRuntimeArtifact {
  version: 'memory-os-turn-runtime-v1'
  authority: 'memory-os'
  adapterSource: 'memory-os-runtime' | 'organic-memory-prompt-context'
  context: OrganicMemoryPromptContext
  artifact: AlicizationMemoryTurnArtifact
  stageSettlements: AlicizationMemoryOsStageSettlement[]
  closure: {
    status: 'complete' | 'incomplete'
    completedStages: AlicizationMemoryOsStage[]
    missingStages: AlicizationMemoryOsStage[]
    closureCoverage: number
  }
}

function compact(values: Array<string | null | undefined>, limit = 6) {
  const result: string[] = []
  for (const value of values) {
    const normalized = typeof value === 'string'
      ? value.trim().replace(/\s+/g, ' ')
      : ''
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized.slice(0, 220))
    if (result.length >= limit)
      break
  }
  return result
}

function stage(input: {
  stage: AlicizationMemoryOsStage
  status?: AlicizationMemoryOsStageSettlement['status']
  summary?: Array<string | null | undefined>
  reasonCodes?: Array<string | null | undefined>
}): AlicizationMemoryOsStageSettlement {
  return {
    version: 'memory-os-stage-settlement-v1',
    stage: input.stage,
    status: input.status ?? 'completed',
    summary: compact(input.summary ?? []),
    reasonCodes: compact(input.reasonCodes ?? [], 10),
  }
}

function buildMemoryOsStageSettlements(artifact: AlicizationMemoryTurnArtifact): AlicizationMemoryOsStageSettlement[] {
  return [
    stage({
      stage: 'recall-intent',
      summary: [
        `shouldRecall=${artifact.recallIntent.shouldRecall ? 'yes' : 'no'}`,
        `source=${artifact.recallIntent.source}`,
        artifact.recallIntent.agenda.join(' | '),
      ],
      reasonCodes: artifact.recallIntent.reasonCodes,
    }),
    stage({
      stage: 'candidate-retrieval',
      summary: [
        `candidateCount=${artifact.metrics.recallCandidateCount}`,
        `facts=${artifact.candidates.retrievedFacts}`,
        `fragments=${artifact.candidates.recalledFragments}`,
        `episodes=${artifact.candidates.recalledEpisodes}`,
        `conversation=${artifact.candidates.recalledConversationHistory}`,
      ],
    }),
    stage({
      stage: 'candidate-competition',
      summary: [
        `selected=${artifact.competition.selectedCandidateCount}`,
        `wrongThread=${artifact.competition.wrongThreadSuppressedCount}`,
        `conflict=${artifact.competition.conflictSeverity}`,
      ],
      reasonCodes: [
        ...artifact.competition.wrongThreadCandidateIds.map(id => `wrong-thread:${id}`),
        ...artifact.competition.conflictCandidateIds.map(id => `conflict:${id}`),
      ],
    }),
    stage({
      stage: 'memory-deliberation',
      status: artifact.deliberation.shouldRecall ? 'completed' : 'skipped',
      summary: [
        `surfacePolicy=${artifact.deliberation.surfacePolicy ?? 'none'}`,
        `confidence=${artifact.deliberation.confidence ?? 'none'}`,
        artifact.deliberation.whyNow,
        artifact.deliberation.inwardLine,
      ],
      reasonCodes: artifact.deliberation.unsafeDetails.map(item => `unsafe:${item}`),
    }),
    stage({
      stage: 'speech-posture',
      status: artifact.speechPosture.shouldSurface ? 'completed' : 'skipped',
      summary: [
        `mode=${artifact.speechPosture.surfaceMode ?? 'none'}`,
        `placement=${artifact.speechPosture.placement ?? 'none'}`,
        `certainty=${artifact.speechPosture.certainty ?? 'none'}`,
      ],
    }),
    stage({
      stage: 'memory-settlement',
      summary: [
        `gate=${artifact.visibleMemoryGate.status}`,
        `closure=${artifact.closure.closureState ?? 'none'}`,
        `quality=${artifact.closure.retrievalQuality ?? 'none'}`,
        `precision=${artifact.metrics.precisionProxy}`,
        `recall=${artifact.metrics.recallReadiness}`,
      ],
      reasonCodes: [
        ...artifact.visibleMemoryGate.reasons,
        ...artifact.withheld,
      ],
    }),
    stage({
      stage: 'feedback-ledger',
      summary: [
        `selected=${artifact.candidates.selectedCandidateIds.length}`,
        `surfaced=${artifact.visibleMemoryGate.status === 'open' || artifact.visibleMemoryGate.status === 'gist-only' ? artifact.candidates.selectedCandidateIds.length : 0}`,
        `wrongThread=${artifact.competition.wrongThreadCandidateIds.length}`,
      ],
      reasonCodes: artifact.metrics.wrongThreadRisk > 0 ? ['memory-feedback:wrong-thread-risk-present'] : [],
    }),
  ]
}

function buildMemoryOsClosure(stageSettlements: AlicizationMemoryOsStageSettlement[]) {
  const completedStages = alicizationMemoryOsCanonicalStageOrder.filter((stageName) => {
    const status = stageSettlements.find(item => item.stage === stageName)?.status
    return status === 'completed' || status === 'skipped'
  })
  const missingStages = alicizationMemoryOsCanonicalStageOrder.filter(stageName => !completedStages.includes(stageName))
  return {
    status: missingStages.length === 0 ? 'complete' as const : 'incomplete' as const,
    completedStages,
    missingStages,
    closureCoverage: Number((completedStages.length / alicizationMemoryOsCanonicalStageOrder.length).toFixed(2)),
  }
}

export function runAlicizationMemoryOsTurn(input: {
  context: OrganicMemoryPromptContext
  retrievalPolicySnapshot?: AlicizationTurnRetrievalPolicySnapshot | null
  latencyMs?: number | null
  nowMs?: number | null
  adapterSource?: AlicizationMemoryOsTurnRuntimeArtifact['adapterSource']
}): AlicizationMemoryOsTurnRuntimeArtifact {
  const artifact = buildAlicizationMemoryTurnArtifact(input)
  const stageSettlements = buildMemoryOsStageSettlements(artifact)
  return {
    version: 'memory-os-turn-runtime-v1',
    authority: 'memory-os',
    adapterSource: input.adapterSource ?? 'organic-memory-prompt-context',
    context: input.context,
    artifact,
    stageSettlements,
    closure: buildMemoryOsClosure(stageSettlements),
  }
}

export async function runAlicizationMemoryOsTurnRuntime(input: {
  recallSeed: string
  recallGovernor?: unknown
  turnId?: string | null
  sessionId?: string | null
  budgetClass?: string | null
  retrievalPolicySnapshot?: AlicizationTurnRetrievalPolicySnapshot | null
  suppressAssociativeRecall?: boolean | null
  personaKernelMode?: string | null
  digitalLifeRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  resolveContext: (input: {
    recallSeed: string
    recallGovernor?: unknown
    turnId?: string | null
    sessionId?: string | null
    budgetClass?: string | null
    retrievalPolicySnapshot?: AlicizationTurnRetrievalPolicySnapshot | null
    digitalLifeRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  }) => Promise<OrganicMemoryPromptContext>
  tuneContext?: (input: {
    context: OrganicMemoryPromptContext
    suppressAssociativeRecall?: boolean | null
    personaKernelMode?: string | null
    recallGovernor?: unknown
  }) => Promise<OrganicMemoryPromptContext> | OrganicMemoryPromptContext
  nowMs?: () => number
}) {
  const now = input.nowMs ?? (() => Date.now())
  const startedAt = now()
  const rawContext = await input.resolveContext({
    recallSeed: input.recallSeed,
    recallGovernor: input.recallGovernor,
    turnId: input.turnId,
    sessionId: input.sessionId,
    budgetClass: input.budgetClass,
    retrievalPolicySnapshot: input.retrievalPolicySnapshot,
    digitalLifeRuntimeSurface: input.digitalLifeRuntimeSurface ?? null,
  })
  const context = input.tuneContext
    ? await input.tuneContext({
        context: rawContext,
        suppressAssociativeRecall: input.suppressAssociativeRecall,
        personaKernelMode: input.personaKernelMode,
        recallGovernor: input.recallGovernor,
      })
    : rawContext
  return runAlicizationMemoryOsTurn({
    context,
    retrievalPolicySnapshot: input.retrievalPolicySnapshot,
    latencyMs: now() - startedAt,
    nowMs: now(),
    adapterSource: 'memory-os-runtime',
  })
}

export function isAlicizationMemoryOsTurnClosed(input: AlicizationMemoryOsTurnRuntimeArtifact | null | undefined) {
  return input?.version === 'memory-os-turn-runtime-v1'
    && input.authority === 'memory-os'
    && input.closure.status === 'complete'
}
