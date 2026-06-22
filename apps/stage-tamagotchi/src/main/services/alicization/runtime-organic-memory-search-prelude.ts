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

export function isPresentFacingSelfCritiqueRecallSeed(recallSeed: string) {
  const normalized = sanitizePromptText(recallSeed, 420).toLowerCase()
  if (!normalized)
    return false

  const selfOwned = /subject=alicization-self|current_turn_subject=alicization-self|dialogue-first|answer-self|self-owned/u.test(normalized)
  const styleComplaint = /表现得.*开心|开心一点|说人话|别这么(?:客气|冷淡|温柔|直接)|为什么这样回我|别这样回我|太公式化|像个人一点|sound more human|be happier|too polite|too cold|why are you talking like this/u.test(normalized)
  return selfOwned && styleComplaint
}

function parseRuntimeContinuityCarry(recallSeed: string) {
  const line = recallSeed
    .split('\n')
    .map(item => item.trim())
    .find(item => item.startsWith('mirror_runtime_continuity:'))
  if (!line)
    return null

  const payload = line.slice('mirror_runtime_continuity:'.length).trim()
  if (!payload)
    return null

  const fields = new Map<string, string>()
  for (const segment of payload.split('|')) {
    const normalized = segment.trim()
    if (!normalized)
      continue
    const separatorIndex = normalized.indexOf('=')
    if (separatorIndex <= 0)
      continue
    const key = normalized.slice(0, separatorIndex).trim().toLowerCase()
    const value = sanitizePromptText(normalized.slice(separatorIndex + 1).trim(), 160)
    if (!key || !value)
      continue
    fields.set(key, value)
  }

  const dominant = fields.get('dominant') ?? ''
  const phase = fields.get('phase') ?? ''
  const handoff = fields.get('handoff') ?? ''
  const from = fields.get('from') ?? ''
  const to = fields.get('to') ?? ''
  const scenario = fields.get('scenario') ?? ''
  const reason = fields.get('reason') ?? ''
  if (!dominant && !phase && !handoff && !from && !to && !scenario && !reason)
    return null

  return {
    dominant,
    phase,
    handoff,
    from,
    to,
    scenario,
    reason,
  }
}

function deriveRuntimeContinuityTriggeredIntent(input: {
  recallSeed: string
}): OrganicMemoryPromptContext['recollectionIntent'] | null {
  const continuity = parseRuntimeContinuityCarry(input.recallSeed)
  if (!continuity)
    return null

  const runtimeText = [
    continuity.dominant,
    continuity.phase,
    continuity.handoff,
    continuity.from,
    continuity.to,
    continuity.scenario,
    continuity.reason,
  ].filter(Boolean).join(' ').toLowerCase()
  const procedureTriggered = /runtime|repair|seam|task|workflow|execution|dialogue|handoff|grounded|coding|执行|修复|链路|任务|流程/u.test(runtimeText)
  if (!procedureTriggered)
    return null

  const scenario = continuity.scenario || continuity.to || continuity.phase || continuity.dominant
  const reason = continuity.reason || continuity.handoff || continuity.phase || continuity.dominant
  const queryHints = uniqueList([
    reason,
    scenario,
    continuity.handoff,
    continuity.to,
    continuity.from,
  ], 6)
  const candidateProcedureLines = uniqueList([
    reason,
    continuity.handoff,
    scenario,
    continuity.dominant,
  ], 4)

  return {
    mode: 'execution-procedure',
    temporalFocus: 'experience-matched',
    searchEpisodes: true,
    searchConversations: false,
    searchProceduralExperience: true,
    queryHints,
    rationale: sanitizePromptText(
      'Runtime continuity carry suggests that the next recollection should reopen the remembered way this active seam was handled, not drift into generic history.',
      220,
    ),
    confidence: clamp01(0.74 + (continuity.reason ? 0.08 : 0) + (continuity.scenario ? 0.04 : 0)),
    recollectionAgenda: {
      whyRecallNow: 'The current turn is carrying an unfinished runtime seam, so remembered procedure continuity should reopen before older conversation history.',
      goalSimilarity: clamp01(0.82 + (continuity.reason ? 0.08 : 0)),
      relationshipNeed: clamp01(0.14 + (continuity.dominant === 'dialogue' ? 0.06 : 0)),
      affectivePull: clamp01(0.16 + (continuity.reason ? 0.04 : 0)),
      sceneFamiliarity: clamp01(0.62 + (continuity.scenario ? 0.08 : 0)),
      candidateTimeScopes: [
        {
          scope: 'experience-matched',
          weight: 0.94,
          rationale: 'A matching runtime seam matters more than an exact date window.',
        },
        {
          scope: 'recent-or-mid',
          weight: 0.42,
          rationale: 'Recent carry remains a secondary anchor if the seam needs a narrower period.',
        },
      ],
      candidateEraFacets: [
        {
          facet: 'task-era',
          weight: 0.95,
          rationale: 'The continuity carry points to an unfinished task period rather than a relationship phase.',
        },
        {
          facet: 'window',
          weight: 0.36,
          rationale: 'A bounded window can still stabilize the recollection if needed.',
        },
      ],
      candidateProcedureLines,
      uncertaintyTolerance: 'medium',
    },
  }
}

export function deriveSceneTriggeredRecollectionIntent(input: {
  recallSeed: string
  recalledEpisodes: AlicizationEpisodicEventRecord[]
}): OrganicMemoryPromptContext['recollectionIntent'] | null {
  if (isPresentFacingSelfCritiqueRecallSeed(input.recallSeed))
    return null

  const runtimeContinuityIntent = deriveRuntimeContinuityTriggeredIntent({
    recallSeed: input.recallSeed,
  })
  if (runtimeContinuityIntent)
    return runtimeContinuityIntent

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
