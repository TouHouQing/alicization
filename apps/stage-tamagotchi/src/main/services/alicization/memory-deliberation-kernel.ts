import type {
  AlicizationMemoryDeliberationLatentControls,
} from './memory-deliberation-latent-controls'
import type { AlicizationMemoryRestraintJudge } from './memory-restraint-judge'
import type { AlicizationMemoryTuningAdvice } from './memory-tuning-advice'
import type { OrganicMemoryPromptContext } from './runtime-soul'

import {
  buildMemoryLatentBoundaryTag,
  deriveMemoryDeliberationLatentControls,
  summarizeMemoryDeliberationLatentControls,
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

function isSelfModelRevisionContext(input: {
  deliberation: OrganicMemoryPromptContext['memoryDeliberation'] | null | undefined
  recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null | undefined
}) {
  const deliberation = input.deliberation ?? null
  if (!deliberation)
    return false
  if (input.recollectionIntent?.mode === 'autobiographical-history')
    return true
  if (deliberation.selectedEras.some(item => item.facet === 'self-era'))
    return true

  const selfCueText = [
    deliberation.whyNow,
    ...(deliberation.stableCore ?? []),
    ...(deliberation.unsafeDetails ?? []),
    ...deliberation.selectedBundles.map(item => item.summary),
    ...deliberation.selectedChains.map(item => item.summary),
    ...deliberation.selectedRelationshipLines,
  ].filter(Boolean).join(' ')

  return /self-story|self line|identity|autobiographical|self model|my pattern|my habit|who i am|older self|newer self|自我|身份|习惯|性格|叙事|我会|我总是/u.test(selfCueText)
}

function deriveResolvedSurfacePolicy(input: {
  deliberation: OrganicMemoryPromptContext['memoryDeliberation'] | null
  speech: OrganicMemoryPromptContext['recollectionSpeechPlan'] | null
  recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
}) {
  const deliberation = input.deliberation
  const speech = input.speech
  const baseSurfacePolicy = deliberation?.surfacePolicy ?? speech?.surfaceMode ?? 'internal-only'
  if (baseSurfacePolicy !== 'answer-anchoring')
    return baseSurfacePolicy

  const intentMode = input.recollectionIntent?.mode ?? 'none'
  const selectedChainsForPolicy = (deliberation?.selectedChains ?? []) as Array<{ kind?: unknown }>
  const procedureLike = speech?.surfaceMode === 'procedural-carry'
    || intentMode === 'execution-procedure'
    || intentMode === 'experience-pattern'
    || (deliberation?.selectedProcedures.length ?? 0) > 0
    || selectedChainsForPolicy.some(item => item.kind === 'task-procedure')
  const threadedContinuityPresent = (deliberation?.selectedBundles.length ?? 0) > 0
    || (deliberation?.selectedChains.length ?? 0) > 0
  const continuityProcedureHints = input.recollectionIntent?.recollectionAgenda?.candidateProcedureLines ?? []
  const seamContinuityText = [
    deliberation?.whyNow,
    ...(deliberation?.stableCore ?? []),
    ...(deliberation?.selectedBundles ?? []).map(item => item.summary),
    ...(deliberation?.selectedChains ?? []).flatMap(item => [item.summary, item.currentStance, item.answerPosture]),
    ...(deliberation?.selectedProcedures ?? []).flatMap(item => [item.label, item.approach]),
    ...continuityProcedureHints,
  ].filter(Boolean).join(' ')
  const seamContinuityExplicit = /active dialogue|runtime seam|continuity seam|repair lane|handoff|stay on the same thread|别换线|沿着这条|继续这条|同一条线程/u.test(seamContinuityText)
  const relationshipLike = speech?.surfaceMode === 'relationship-continuity'
    || intentMode === 'relationship-history'
    || (deliberation?.selectedRelationshipLines.length ?? 0) > 0
    || selectedChainsForPolicy.some(item => item.kind === 'relationship-line')

  if (procedureLike && threadedContinuityPresent && seamContinuityExplicit && !relationshipLike)
    return 'procedural-carry' as const
  if (relationshipLike && !procedureLike)
    return 'relationship-continuity' as const
  return baseSurfacePolicy
}

export function buildAlicizationMemoryDeliberationKernel(input: {
  deliberation: OrganicMemoryPromptContext['memoryDeliberation'] | null | undefined
  speech: OrganicMemoryPromptContext['recollectionSpeechPlan'] | null | undefined
  recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null | undefined
  knowledgeEvidence?: OrganicMemoryPromptContext['knowledgeEvidence']
  hostPersonModel?: OrganicMemoryPromptContext['hostPersonModel']
  tuningAdvice?: AlicizationMemoryTuningAdvice | null
}) {
  const deliberation = input.deliberation ?? null
  const speech = input.speech ?? null
  if (!deliberation && !speech)
    return null

  const shouldRecall = deliberation?.shouldRecall ?? Boolean(speech)
  const surfacePolicy = deriveResolvedSurfacePolicy({
    deliberation,
    speech,
    recollectionIntent: input.recollectionIntent ?? null,
  })
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
  const tuningAdvice = input.tuningAdvice ?? null
  const selfModelRevisionContext = isSelfModelRevisionContext({
    deliberation,
    recollectionIntent: input.recollectionIntent ?? null,
  })
  const tuningForRelationalRevision = Boolean(
    tuningAdvice
    && tuningAdvice.focusDimensions.includes('learningRevisionDiscipline')
    && memoryControl?.relationshipVector === 'relational'
    && (memoryControl?.certaintyFloor === 'approximate' || memoryControl?.certaintyFloor === 'fragmentary' || memoryControl?.conflictBurden === 'medium' || memoryControl?.conflictBurden === 'high'),
  )
  const tuningForSelfModelRevision = Boolean(
    tuningAdvice
    && tuningAdvice.focusDimensions.includes('learningRevisionDiscipline')
    && selfModelRevisionContext
    && (memoryControl?.certaintyFloor === 'approximate' || memoryControl?.certaintyFloor === 'fragmentary' || memoryControl?.conflictBurden === 'medium' || memoryControl?.conflictBurden === 'high'),
  )
  const tuningForRevision = tuningForRelationalRevision || tuningForSelfModelRevision
  const tuningForWorldValidation = Boolean(
    tuningAdvice
    && tuningAdvice.focusDimensions.includes('worldModelValidationDiscipline')
    && (memoryControl?.provenancePosture === 'inferred-pattern' || memoryControl?.provenancePosture === 'reconstructed-memory' || memoryControl?.provenancePosture === 'mixed-memory'),
  )
  const tuningForRelationshipEraConfusion = Boolean(
    tuningAdvice
    && (tuningAdvice.relationshipEraConfusionRate ?? 0) >= 0.2
    && input.recollectionIntent?.mode === 'relationship-history'
    && (
      memoryControl?.relationshipVector === 'relational'
      || (deliberation?.conflictVariants ?? []).some(item => String(item.id ?? '').includes('relationship-era-confusion'))
    ),
  )
  const tuningForElevatedSelfModelVeto = Boolean(
    tuningAdvice
    && (tuningAdvice.staleSelfModelVetoRate ?? 0) >= 0.2
    && selfModelRevisionContext,
  )

  const inwardCarryRule = memoryControl
    ? `memory_latent_controls=${memoryControlSummary}`
    : speechLatentSummary
      ? `recollection_latent_controls=${speechLatentSummary}`
      : (shouldStayInward
          ? 'Honor active recollection as inward-only latent control.'
          : 'Honor active recollection as latent control while keeping the live payoff primary.')

  const restraint = buildAlicizationMemoryRestraintJudge({
    shouldRecall,
    shouldStayInward: shouldStayInward || tuningForRevision || tuningForRelationshipEraConfusion || tuningForElevatedSelfModelVeto,
    memoryControl,
    knowledgeEvidence: input.knowledgeEvidence ?? null,
    followUpAffordance: deliberation?.followUpAffordance ?? null,
  })
  const tunedWhyWithheld = tuningForRelationalRevision
    ? 'Learning revision discipline is still active, so relationship continuity should stay inward until the host has more room.'
    : tuningForSelfModelRevision
      ? 'Learning revision discipline is still active, so the older self-story should stay inward until the newer self line stabilizes.'
      : tuningForRelationshipEraConfusion
        ? 'Relationship-era confusion is still elevated, so competing repair phases should stay inward until the present bond line is clearer.'
        : tuningForElevatedSelfModelVeto
          ? 'Self-model veto pressure is still elevated, so older self-story continuity should stay inward until the newer line is more stable.'
          : tuningForWorldValidation && !restraint.whyWithheld
            ? 'World-model validation discipline is still active, so reconstructed or inferred knowledge should stay tightly labeled and compressed.'
            : restraint.whyWithheld
  const tunedFollowUpAffordance = deliberation?.followUpAffordance
    ? {
        ...deliberation.followUpAffordance,
        intrusionRisk: tuningForRevision
          ? 'high' as const
          : tuningForRelationshipEraConfusion
            ? 'high' as const
            : tuningForElevatedSelfModelVeto
              ? 'high' as const
              : tuningForWorldValidation && deliberation.followUpAffordance.intrusionRisk === 'low'
                ? 'medium' as const
                : deliberation.followUpAffordance.intrusionRisk,
        preferredTiming: tuningForRevision
          ? (
              (memoryControl?.certaintyFloor === 'fragmentary' || memoryControl?.conflictBurden === 'high')
                ? 'internal-only' as const
                : 'next-open-window' as const
            )
          : tuningForRelationshipEraConfusion
            ? 'next-open-window' as const
            : tuningForElevatedSelfModelVeto
              ? 'next-open-window' as const
              : tuningForWorldValidation
                && deliberation.followUpAffordance.preferredTiming === 'same-turn-if-invited'
                ? 'after-payoff' as const
                : deliberation.followUpAffordance.preferredTiming,
      }
    : null
  const tunedRestraint = {
    ...restraint,
    shouldStayInward: restraint.shouldStayInward || tuningForRevision || tuningForRelationshipEraConfusion || tuningForElevatedSelfModelVeto,
    whyWithheld: tunedWhyWithheld,
    mustDo: [
      ...restraint.mustDo,
      ...(tuningForRelationalRevision
        ? ['If the relationship line is still being revised, keep it inward until the host has more room for it.']
        : []),
      ...(tuningForSelfModelRevision
        ? ['If the older self-story is still being revised, keep it inward until the newer self line stabilizes.']
        : []),
      ...(tuningForRelationshipEraConfusion
        ? ['If competing relationship eras are still easy to confuse, keep the recalled bond line inward until the present repair context is clearer.']
        : []),
      ...(tuningForElevatedSelfModelVeto
        ? ['If older self-story veto pressure stays elevated, keep autobiographical continuity inward until the newer self line is more stable.']
        : []),
      ...(tuningForWorldValidation
        ? ['If world knowledge becomes visible, keep provenance and uncertainty explicit before specificity, and avoid same-turn overreach.']
        : []),
    ],
    mustNotDo: [
      ...restraint.mustNotDo,
      ...(tuningForRelationalRevision
        ? ['Do not let revision-prone relationship continuity surface as if it were already settled.']
        : []),
      ...(tuningForSelfModelRevision
        ? ['Do not let a revision-prone self-story surface as if Alicization had already fully stabilized it.']
        : []),
      ...(tuningForRelationshipEraConfusion
        ? ['Do not let competing relationship phases surface as if they belonged to the same bond line.']
        : []),
      ...(tuningForElevatedSelfModelVeto
        ? ['Do not let elevated stale-self continuity pressure leak older autobiographical identity into the current answer as if it were settled.']
        : []),
      ...(tuningForWorldValidation
        ? ['Do not let reconstructed or inferred world knowledge surface with unsupported specificity.']
        : []),
    ],
  }

  return {
    shouldRecall,
    surfacePolicy,
    shouldStayInward: shouldStayInward || tuningForRevision || tuningForRelationshipEraConfusion || tuningForElevatedSelfModelVeto,
    rationale: sanitizeText(
      deliberation?.whyNow
      || speech?.rationale
      || '',
      220,
    ) || null,
    whyWithheld: tunedWhyWithheld,
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
    followUpAffordance: tunedFollowUpAffordance,
    restraint: tunedRestraint,
    stableCore: memoryControl?.stableCore ?? deliberation?.stableCore ?? [],
    unsafeDetails: memoryControl?.unsafeDetails ?? deliberation?.unsafeDetails ?? [],
  } satisfies AlicizationMemoryDeliberationKernel
}
