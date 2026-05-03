import type { AlicizationEpisodicEventRecord } from '../../../shared/eventa'
import type { OrganicMemoryPromptContext } from './runtime-soul'

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

  const leadText = [
    lead.threadAnchor,
    lead.whereSummary,
    lead.whatHappened,
    lead.relationshipMeaning,
    lead.lesson,
    ...(lead.tags ?? []),
    ...(lead.emotionTags ?? []),
  ].filter(Boolean).join(' ').toLowerCase()
  const relationshipTriggered = /relationship|bond|closeness|space|boundary|repair|tone|回应|关系|靠近|空间|边界|修复/u.test(leadText)
  const procedureTriggered = /runtime|procedure|patch|verify|task|execution|workflow|步骤|执行|修复/u.test(leadText)

  return {
    mode: relationshipTriggered
      ? 'relationship-history'
      : procedureTriggered
        ? 'experience-pattern'
        : 'autobiographical-history',
    temporalFocus: 'experience-matched',
    searchEpisodes: true,
    searchConversations: false,
    searchProceduralExperience: procedureTriggered,
    queryHints: uniqueList([
      lead.threadAnchor,
      lead.relationshipMeaning,
      lead.lesson,
      ...(lead.tags ?? []),
    ], 6),
    rationale: sanitizePromptText(
      relationshipTriggered
        ? 'The current scene naturally tugs on a familiar relationship pattern even without an explicit retrospective question.'
        : procedureTriggered
          ? 'The current scene naturally tugs on a familiar way of handling this same kind of task.'
          : 'The current scene naturally tugs on a familiar remembered pattern.',
      220,
    ),
    confidence: clamp01(0.42 + familiarity * 0.32 + (provenance === 'remembered' || provenance === 'observed' ? 0.12 : 0)),
    recollectionAgenda: {
      whyRecallNow: relationshipTriggered
        ? 'The current scene feels like an earlier relationship phase, so bond continuity is worth recalling.'
        : procedureTriggered
          ? 'The current scene feels like an earlier task pattern, so remembered procedure continuity is worth recalling.'
          : 'The current scene feels familiar enough to open a remembered autobiographical lane.',
      goalSimilarity: clamp01(procedureTriggered ? 0.52 + familiarity * 0.28 : familiarity * 0.3),
      relationshipNeed: clamp01(relationshipTriggered ? 0.48 + familiarity * 0.24 : familiarity * 0.18),
      affectivePull: clamp01(familiarity * 0.34 + ((lead.emotionTags ?? []).length > 0 ? 0.12 : 0)),
      sceneFamiliarity: clamp01(familiarity),
      candidateTimeScopes: [
        {
          scope: 'experience-matched',
          weight: clamp01(0.46 + familiarity * 0.22),
          rationale: 'The scene matches a remembered pattern more than a fixed timestamp.',
        },
        {
          scope: 'recent-or-mid',
          weight: clamp01(0.28 + familiarity * 0.16),
          rationale: 'Start from a plausible remembered period before expanding farther out.',
        },
      ],
      candidateEraFacets: [
        {
          facet: relationshipTriggered ? 'relationship-era' : procedureTriggered ? 'task-era' : 'self-era',
          weight: clamp01(0.54 + familiarity * 0.2),
          rationale: 'The scene is pulling toward this remembered kind of period first.',
        },
        {
          facet: 'window',
          weight: clamp01(0.26 + familiarity * 0.14),
          rationale: 'A period window can safely anchor the recall before exact detail.',
        },
      ],
      candidateProcedureLines: uniqueList([
        lead.threadAnchor,
        lead.lesson,
        lead.relationshipMeaning,
        ...(lead.tags ?? []),
      ], 4),
      uncertaintyTolerance: provenance === 'remembered' || provenance === 'observed' ? 'medium' : 'low',
    },
  }
}
