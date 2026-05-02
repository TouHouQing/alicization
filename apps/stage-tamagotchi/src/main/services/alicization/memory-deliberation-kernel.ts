import type { OrganicMemoryPromptContext } from './runtime-soul'

import type {
  AlicizationMemoryDeliberationLatentControls,
} from './memory-deliberation-latent-controls'

import {
  buildMemoryLatentBoundaryTag,
  deriveMemoryDeliberationLatentControls,
  summarizeMemoryDeliberationLatentControls,
} from './memory-deliberation-latent-controls'
import { buildAlicizationMemoryRestraintJudge, type AlicizationMemoryRestraintJudge } from './memory-restraint-judge'
import { deriveRecollectionSurfaceControls } from './recollection-surface-controls'

type MemoryDeliberationSnapshot = NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>
type RecollectionSpeechPlanSnapshot = NonNullable<OrganicMemoryPromptContext['recollectionSpeechPlan']>

export interface AlicizationMemoryDeliberationKernel {
  shouldRecall: boolean
  surfacePolicy: MemoryDeliberationSnapshot['surfacePolicy'] | RecollectionSpeechPlanSnapshot['surfaceMode'] | 'internal-only'
  shouldStayInward: boolean
  rationale: string | null
  whyWithheld: string | null
  selectedChainSummary: string | null
  selectedChainStance: string | null
  selectedChainPosture: string | null
  selectedBundleSummary: string | null
  selectedPeriodSummary: string | null
  selectedEraSummary: string | null
  selectedProcedureSummary: string | null
  selectedRelationshipSummary: string | null
  speechControls: ReturnType<typeof deriveRecollectionSurfaceControls> | null
  speechLatentSummary: string | null
  memoryControl: AlicizationMemoryDeliberationLatentControls | null
  memoryControlSummary: string | null
  inwardCarryRule: string
  inwardCarryBoundary: string | null
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
  const speechLatentSummary = speechControls
    ? [
        `surface_permission=${speechControls.visibility === 'internal-only' ? 'inward-only' : speechControls.visibility === 'embedded-payoff' ? 'soft-surface' : 'explicit-surface'}`,
        `visibility=${speechControls.visibility}`,
        `continuity_role=${speechControls.continuityRole}`,
        `certainty=${speechControls.certainty}`,
        `template_boundary=${speechControls.templateBoundary}`,
      ].join(' | ')
    : null

  const memoryControl = deliberation
    ? deriveMemoryDeliberationLatentControls({
        deliberation,
        speech,
        recollectionIntent: input.recollectionIntent ?? null,
        shouldStayInward,
      })
    : null
  const memoryControlSummary = memoryControl
    ? summarizeMemoryDeliberationLatentControls(memoryControl)
    : null

  const inwardCarryRule = memoryControl
    ? `memory_latent_controls=${memoryControlSummary}`
    : speechLatentSummary
      ? `recollection_latent_controls=${speechLatentSummary}`
      : (shouldStayInward
          ? 'Honor active recollection as inward-only latent control.'
          : 'Honor active recollection as latent control while keeping the live payoff primary.')

  const restraint = buildAlicizationMemoryRestraintJudge({
    shouldRecall,
    shouldStayInward,
    memoryControl,
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
    whyWithheld: restraint.whyWithheld,
    selectedChainSummary: joinSummaries((deliberation?.selectedChains ?? []).map(item => item.summary)),
    selectedChainStance: joinSummaries((deliberation?.selectedChains ?? []).map(item => item.currentStance)),
    selectedChainPosture: joinSummaries((deliberation?.selectedChains ?? []).map(item => item.answerPosture)),
    selectedBundleSummary: joinSummaries((deliberation?.selectedBundles ?? []).map(item => item.summary)),
    selectedPeriodSummary: joinSummaries((deliberation?.selectedPeriods ?? []).map(item => item.summary)),
    selectedEraSummary: joinSummaries((deliberation?.selectedEras ?? []).map(item => item.summary)),
    selectedProcedureSummary: joinSummaries((deliberation?.selectedProcedures ?? []).map(item => item.label)),
    selectedRelationshipSummary: joinSummaries(deliberation?.selectedRelationshipLines ?? []),
    speechControls,
    speechLatentSummary,
    memoryControl,
    memoryControlSummary,
    inwardCarryRule,
    inwardCarryBoundary: memoryControl ? buildMemoryLatentBoundaryTag(memoryControl) : null,
    followUpAffordance: deliberation?.followUpAffordance ?? null,
    restraint,
    stableCore: memoryControl?.stableCore ?? deliberation?.stableCore ?? [],
    unsafeDetails: memoryControl?.unsafeDetails ?? deliberation?.unsafeDetails ?? [],
  } satisfies AlicizationMemoryDeliberationKernel
}
