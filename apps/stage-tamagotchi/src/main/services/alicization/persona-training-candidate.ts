import { containsAlicizationFixedTemplateResidue } from '@proj-alicization/stage-shared'

export interface PersonaTrainingReflectionSource {
  id: string
  summary: string
  lesson: string
  confidence: number
  sensitivity?: 'public' | 'personal' | 'private' | 'secret' | null
  status?: 'pending' | 'confirmed' | 'denied' | string | null
}

export interface PersonaTrainingReinforcementSource {
  id: string
  dimension: string
  summary: string
  valence: 'reinforce' | 'suppress' | string
  delta: number
}

export interface PersonaTrainingExcludedMemoryFact {
  id: string
  summary: string
  sensitivity?: 'public' | 'personal' | 'private' | 'secret' | null
}

export interface PersonaTrainingCandidate {
  id: string
  sourceMemoryIds: string[]
  behaviorLesson: string
  positiveExample: string
  negativeExample?: string
  privacyClass: 'public' | 'personal-redacted'
  status: 'candidate' | 'approved' | 'rejected'
  rejectionReason?: string
}

function normalizeText(raw: unknown, maxChars = 360) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, Math.max(0, maxChars)).trim()
}

function uniqueTexts(values: Array<string | null | undefined>, maxItems = 10, maxChars = 180) {
  const result: string[] = []
  for (const value of values) {
    const normalized = normalizeText(value, maxChars)
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

function isPrivateSource(source: { sensitivity?: string | null }) {
  return source.sensitivity === 'private' || source.sensitivity === 'secret'
}

function hasFixedTemplateResidue(...values: unknown[]) {
  return values.some(value => containsAlicizationFixedTemplateResidue(value, {
    provenance: 'internal-structured-fact',
  }))
}

function redactPersonalReferences(raw: string) {
  return normalizeText(raw, 420)
    .replace(/用户[^，。；;]*/gu, '用户')
    .replace(/我[^，。；;]*/gu, '用户')
}

export function buildPersonaTrainingCandidatesFromLongTermMemory(input: {
  reflections: PersonaTrainingReflectionSource[]
  reinforcements: PersonaTrainingReinforcementSource[]
  memoryFacts?: PersonaTrainingExcludedMemoryFact[]
  rawQueueItems?: Array<{ id: string, summary: string }>
  tombstonedSourceIds?: string[]
}): PersonaTrainingCandidate[] {
  const tombstoned = new Set((input.tombstonedSourceIds ?? []).map(id => normalizeText(id, 240)).filter(Boolean))
  const reinforcementIds = input.reinforcements
    .filter(item => item.valence === 'reinforce')
    .filter(item => !hasFixedTemplateResidue(item.dimension, item.summary))
    .map(item => item.id)
  void input.memoryFacts
  void input.rawQueueItems

  return input.reflections
    .filter(reflection => !tombstoned.has(reflection.id))
    .filter(reflection => !isPrivateSource(reflection))
    .filter(reflection => reflection.confidence >= 0.72)
    .filter(reflection => reflection.status === 'confirmed')
    .filter(reflection => !hasFixedTemplateResidue(reflection.summary, reflection.lesson))
    .map((reflection) => {
      const behaviorLesson = redactPersonalReferences(reflection.lesson || reflection.summary)
      const sourceMemoryIds = uniqueTexts([
        reflection.id,
        ...reinforcementIds,
      ], 8, 180)

      return {
        id: `persona-candidate:${reflection.id}`,
        sourceMemoryIds,
        behaviorLesson,
        positiveExample: behaviorLesson,
        privacyClass: reflection.sensitivity === 'public' ? 'public' : 'personal-redacted',
        status: 'candidate',
      } satisfies PersonaTrainingCandidate
    })
}

export function rejectPersonaTrainingCandidate(
  candidate: PersonaTrainingCandidate,
  rejectionReason: string,
): PersonaTrainingCandidate {
  return {
    ...candidate,
    status: 'rejected',
    rejectionReason: normalizeText(rejectionReason, 180) || 'rejected',
  }
}
