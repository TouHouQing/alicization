import type {
  AlicizationMemoryDeliberationLatentControls,
} from './memory-deliberation-latent-controls'
import type { AlicizationMemoryRestraintJudge } from './memory-restraint-judge'
import type { OrganicMemoryPromptContext } from './runtime-soul'

import {
  deriveMemoryDeliberationLatentControls,
} from './memory-deliberation-latent-controls'
import { buildAlicizationMemoryRestraintJudge } from './memory-restraint-judge'
import { deriveRecollectionSurfaceControls } from './recollection-surface-controls'

type MemoryDeliberationSnapshot = NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>
type RecollectionSpeechPlanSnapshot = NonNullable<OrganicMemoryPromptContext['recollectionSpeechPlan']>

export interface AlicizationMemoryDeliberationKernel {
  shouldRecall: boolean
  surfacePolicy: MemoryDeliberationSnapshot['surfacePolicy'] | RecollectionSpeechPlanSnapshot['surfaceMode'] | 'internal-only'
  shouldStayInward: boolean
  rationale: string | null
  selectedChainSummary: string | null
  selectedChainStance: string | null
  selectedChainPosture: string | null
  selectedBundleSummary: string | null
  selectedPeriodSummary: string | null
  selectedEraSummary: string | null
  selectedProcedureSummary: string | null
  selectedRelationshipSummary: string | null
  speechControls: ReturnType<typeof deriveRecollectionSurfaceControls> | null
  memoryControl: AlicizationMemoryDeliberationLatentControls | null
  followUpAffordance: MemoryDeliberationSnapshot['followUpAffordance'] | null
  restraint: AlicizationMemoryRestraintJudge
  stableCore: string[]
  unsafeDetails: string[]
}

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function joinSummaries(values: Array<string | null | undefined>, maxItems = 2) {
  const items: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value, 220)
    if (!normalized)
      continue
    if (items.includes(normalized))
      continue
    items.push(normalized)
    if (items.length >= maxItems)
      break
  }
  return items.join(' | ') || null
}

export function buildAlicizationMemoryDeliberationKernel(input: {
  deliberation: OrganicMemoryPromptContext['memoryDeliberation'] | null | undefined
  speech: OrganicMemoryPromptContext['recollectionSpeechPlan'] | null | undefined
  recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null | undefined
  knowledgeEvidence?: OrganicMemoryPromptContext['knowledgeEvidence']
  hostPersonModel?: OrganicMemoryPromptContext['hostPersonModel']
  projectStateContinuity?: OrganicMemoryPromptContext['projectStateContinuity']
}) {
  const deliberation = input.deliberation ?? null
  const speech = input.speech ?? null
  if (!deliberation && !speech)
    return null

  const shouldRecall = deliberation?.shouldRecall ?? Boolean(speech)
  const surfacePolicy = deliberation?.surfacePolicy ?? speech?.surfaceMode ?? 'internal-only'
  const speechRequestsInward = speech
    ? (!speech.shouldSurface || speech.placement === 'internal-only')
    : false
  const shouldStayInward = surfacePolicy === 'internal-only'
    || speechRequestsInward

  const speechControls = deriveRecollectionSurfaceControls(speech)
  const memoryControl = deliberation
    ? deriveMemoryDeliberationLatentControls({
        deliberation,
        speech,
        recollectionIntent: input.recollectionIntent ?? null,
        shouldStayInward,
      })
    : null
  const restraint = buildAlicizationMemoryRestraintJudge({
    shouldRecall,
    shouldStayInward,
    memoryControl,
    knowledgeEvidence: input.knowledgeEvidence ?? null,
    followUpAffordance: deliberation?.followUpAffordance ?? null,
  })

  return {
    shouldRecall,
    surfacePolicy,
    shouldStayInward,
    rationale: sanitizeText(
      deliberation?.whyNow
      || speech?.rationale
      || '',
      220,
    ) || null,
    selectedChainSummary: joinSummaries((deliberation?.selectedChains ?? []).map(item => item.summary)),
    selectedChainStance: joinSummaries((deliberation?.selectedChains ?? []).map(item => item.currentStance)),
    selectedChainPosture: joinSummaries((deliberation?.selectedChains ?? []).map(item => item.answerPosture)),
    selectedBundleSummary: joinSummaries((deliberation?.selectedBundles ?? []).map(item => item.summary)),
    selectedPeriodSummary: joinSummaries((deliberation?.selectedPeriods ?? []).map(item => item.summary)),
    selectedEraSummary: joinSummaries((deliberation?.selectedEras ?? []).map(item => item.summary)),
    selectedProcedureSummary: joinSummaries((deliberation?.selectedProcedures ?? []).map(item => item.label)),
    selectedRelationshipSummary: joinSummaries(deliberation?.selectedRelationshipLines ?? []),
    speechControls,
    memoryControl,
    followUpAffordance: deliberation?.followUpAffordance ?? null,
    restraint,
    stableCore: memoryControl?.stableCore ?? deliberation?.stableCore ?? [],
    unsafeDetails: memoryControl?.unsafeDetails ?? deliberation?.unsafeDetails ?? [],
  } satisfies AlicizationMemoryDeliberationKernel
}
