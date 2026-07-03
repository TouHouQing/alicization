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

function redactPersonalReferences(raw: string) {
  return normalizeText(raw, 420)
    .replace(/用户[^，。；;]*/gu, '用户')
    .replace(/我[^，。；;]*/gu, '用户')
}

function positiveExampleFor(lesson: string) {
  const text = normalizeText(lesson, 260)
  if (/出错|超时|失败|链路/u.test(text))
    return '我会先直接说明哪里出了问题，再轻一点继续陪你把下一步接住。'
  if (/承认错误|修复/u.test(text))
    return '你说得对，我刚才偏了；我先把错误说清楚，再沿着同一件事继续推进。'
  if (/固定模板|人格|数字生命/u.test(text))
    return '我会从自己的连续人格里回应，而不是套固定安抚句。'
  return '我会把这条反思当作表达方式约束，先稳住同一条人格线，再回答当前问题。'
}

function negativeExampleFor(lesson: string) {
  const text = normalizeText(lesson, 260)
  if (/固定模板|安抚/u.test(text))
    return '不要用固定安抚模板盖过真实状态。'
  if (/错误|失败|超时/u.test(text))
    return '不要把失败包装成正常陪伴。'
  return undefined
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
    .map(item => item.id)
  void input.memoryFacts
  void input.rawQueueItems

  return input.reflections
    .filter(reflection => !tombstoned.has(reflection.id))
    .filter(reflection => !isPrivateSource(reflection))
    .filter(reflection => reflection.confidence >= 0.72)
    .filter(reflection => !reflection.status || reflection.status === 'confirmed' || reflection.status === 'pending')
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
        positiveExample: positiveExampleFor(behaviorLesson),
        negativeExample: negativeExampleFor(behaviorLesson),
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
