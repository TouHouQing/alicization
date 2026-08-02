import type { AlicizationEpisodicEventRecord } from '../../../shared/eventa'
import type { OrganicMemoryPromptContext, OrganicMemoryRecollectionCarry } from './runtime-soul'

import {
  alicizationFixedTemplateReplacement,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

export function sanitizeOrganicMemoryText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function sanitizePromptText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function uniqueList(values: Array<string | null | undefined>, maxItems = 6) {
  const result: string[] = []
  for (const value of values) {
    const normalized = String(value ?? '').trim().replace(/\s+/g, ' ')
    if (!normalized)
      continue
    if (result.some(item => item.toLowerCase() === normalized.toLowerCase()))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function hasRelationshipShift(event: AlicizationEpisodicEventRecord) {
  const shift = event.relationshipShift
  if (!shift)
    return false

  return [
    shift.closenessDelta,
    shift.trustDelta,
    shift.burdenDelta,
    shift.boundaryDelta,
    shift.misreadDelta,
    shift.repairDelta,
  ].some(value => Number.isFinite(value) && value !== 0)
}

function isExecutionEpisode(event: AlicizationEpisodicEventRecord) {
  return event.sourceKind === 'execution-proposal'
    || event.sourceKind === 'execution-result'
}

export function deriveSessionMirrorRecollectionIntent(
  recollection: OrganicMemoryRecollectionCarry | null | undefined,
): OrganicMemoryPromptContext['recollectionIntent'] | null {
  const foreground = sanitizeAlicizationProviderFacingText(
    sanitizePromptText(recollection?.foreground, 160),
    160,
    '',
  )
  if (recollection?.afterthoughtState !== 'ripe' || !foreground)
    return null
  if (foreground === alicizationFixedTemplateReplacement)
    return null

  const mode = recollection.mode ?? 'experience-pattern'
  const procedural = mode === 'execution-procedure' || mode === 'experience-pattern'
  const relationship = mode === 'relationship-history'
  const conversational = mode === 'conversation-history'
  const confidence = recollection.confidence ?? 0.8
  const primaryFacet = relationship
    ? 'relationship-era' as const
    : procedural
      ? 'task-era' as const
      : 'self-era' as const

  return {
    mode,
    temporalFocus: 'experience-matched',
    searchEpisodes: true,
    searchConversations: relationship || conversational,
    searchProceduralExperience: procedural,
    queryHints: [foreground],
    rationale: 'session-mirror-afterthought',
    confidence: clamp01(confidence),
    recollectionAgenda: {
      whyRecallNow: 'session-mirror-afterthought',
      goalSimilarity: procedural ? 0.88 : 0.62,
      relationshipNeed: relationship ? 0.82 : 0.18,
      affectivePull: relationship ? 0.68 : 0.2,
      sceneFamiliarity: 0.7,
      candidateTimeScopes: [
        {
          scope: 'experience-matched',
          weight: 0.92,
          rationale: 'session-mirror-foreground-match',
        },
        {
          scope: 'recent-or-mid',
          weight: 0.4,
          rationale: 'session-mirror-recent-carry',
        },
      ],
      candidateEraFacets: [
        {
          facet: primaryFacet,
          weight: 0.84,
          rationale: 'session-mirror-primary-facet',
        },
        {
          facet: 'window',
          weight: 0.4,
          rationale: 'session-mirror-window-anchor',
        },
      ],
      candidateProcedureLines: procedural ? [foreground] : [],
      uncertaintyTolerance: recollection.certainty === 'fragmentary' ? 'low' : 'medium',
    },
  }
}

export function deriveSceneTriggeredRecollectionIntent(input: {
  recallSeed: string
  recalledEpisodes: AlicizationEpisodicEventRecord[]
}): OrganicMemoryPromptContext['recollectionIntent'] | null {
  const lead = input.recalledEpisodes[0] ?? null
  if (!lead)
    return null

  const familiarity = Math.max(lead.sceneAttachment ?? 0, Math.min(1, (lead.recallCount ?? 0) / 4))
  const provenance = lead.latestReconsolidation?.provenance ?? lead.provenance
  if (familiarity < 0.44 && provenance !== 'remembered' && provenance !== 'observed')
    return null

  const relationshipTriggered = hasRelationshipShift(lead)
  const procedureTriggered = isExecutionEpisode(lead)
  const mode = relationshipTriggered
    ? 'relationship-history' as const
    : procedureTriggered
      ? 'experience-pattern' as const
      : 'autobiographical-history' as const
  const evidence = sanitizePromptText(
    lead.relationshipMeaning
    || lead.lesson
    || lead.whatChanged
    || lead.sourceSummary
    || lead.whatHappened,
    220,
  )
  if (!evidence)
    return null

  const evidenceKey = `episode:${lead.id}`
  const queryHints = uniqueList([
    lead.threadAnchor,
    lead.relationshipMeaning,
    lead.lesson,
    lead.whatChanged,
    lead.sourceSummary,
    ...lead.tags,
  ], 6)

  return {
    mode,
    temporalFocus: 'experience-matched',
    searchEpisodes: true,
    searchConversations: false,
    searchProceduralExperience: procedureTriggered,
    queryHints,
    rationale: evidence,
    confidence: clamp01(0.42 + familiarity * 0.32 + (provenance === 'remembered' || provenance === 'observed' ? 0.12 : 0)),
    recollectionAgenda: {
      whyRecallNow: evidence,
      goalSimilarity: clamp01(procedureTriggered ? 0.52 + familiarity * 0.28 : familiarity * 0.3),
      relationshipNeed: clamp01(relationshipTriggered ? 0.48 + familiarity * 0.24 : familiarity * 0.18),
      affectivePull: clamp01(familiarity * 0.34 + (lead.emotionTags.length > 0 ? 0.12 : 0)),
      sceneFamiliarity: clamp01(familiarity),
      candidateTimeScopes: [
        {
          scope: 'experience-matched',
          weight: clamp01(0.46 + familiarity * 0.22),
          rationale: `${evidenceKey}:experience-match`,
        },
        {
          scope: 'recent-or-mid',
          weight: clamp01(0.28 + familiarity * 0.16),
          rationale: `${evidenceKey}:recent-window`,
        },
      ],
      candidateEraFacets: [
        {
          facet: relationshipTriggered ? 'relationship-era' : procedureTriggered ? 'task-era' : 'self-era',
          weight: clamp01(0.54 + familiarity * 0.2),
          rationale: `${evidenceKey}:${mode}`,
        },
        {
          facet: 'window',
          weight: clamp01(0.26 + familiarity * 0.14),
          rationale: `${evidenceKey}:window`,
        },
      ],
      candidateProcedureLines: procedureTriggered
        ? uniqueList([
            lead.threadAnchor,
            lead.lesson,
            lead.whatChanged,
            ...lead.tags,
          ], 4)
        : [],
      uncertaintyTolerance: provenance === 'remembered' || provenance === 'observed' ? 'medium' : 'low',
    },
  }
}
