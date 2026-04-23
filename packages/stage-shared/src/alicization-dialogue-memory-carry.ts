import type { AlicizationDigitalLifeSpineDigest } from './alicization-transport-contracts'

export type AlicizationDialogueMemoryCarryMode = 'quiet' | 'carry-thread' | 'reflective-repair'

export interface AlicizationDialogueMemoryCarryPolicy {
  allowMirrorCarry: boolean
  mode: AlicizationDialogueMemoryCarryMode
  reasonTags: string[]
  recallSeed: string
  reflectionPressure: number | null
  summary: string
}

export interface DeriveAlicizationDialogueMemoryCarryPolicyFromDigestInput {
  now?: number
  mirror?: {
    memorySummary?: string | null
    updatedAt?: number | null
  } | null
  mirrorStaleAfterMs?: number
  digest?: AlicizationDigitalLifeSpineDigest | null
}

const defaultMirrorStaleAfterMs = 10 * 60 * 1000

function sanitizeText(raw: unknown, maxChars = 180) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function normalize01(raw: unknown) {
  const value = Number(raw)
  if (!Number.isFinite(value))
    return null
  return Math.max(0, Math.min(1, value))
}

function isThreadLikeRecallMode(mode: string) {
  return mode === 'thread'
    || mode === 'task-thread'
    || mode === 'project'
    || mode === 'continuity-thread'
}

function compactUnique(values: unknown[], maxItems = 6, maxChars = 140) {
  const normalized: string[] = []
  const seen = new Set<string>()
  for (const value of values) {
    const text = sanitizeText(value, maxChars)
    if (!text || seen.has(text))
      continue
    seen.add(text)
    normalized.push(text)
    if (normalized.length >= maxItems)
      break
  }
  return normalized
}

function buildRecallSeed(parts: {
  memorySummary: string
  leadingGoal: string
  reflectionSummary: string
  recallMode: string
  recollectionSummary: string
  mirrorMemorySummary: string
  reflectionPressure: number | null
}) {
  const entries = compactUnique([
    parts.memorySummary ? `memory_summary:${parts.memorySummary}` : '',
    parts.leadingGoal ? `memory_goal:${parts.leadingGoal}` : '',
    parts.reflectionSummary ? `memory_reflection:${parts.reflectionSummary}` : '',
    parts.recallMode ? `memory_recall_mode:${parts.recallMode}` : '',
    parts.recollectionSummary ? `memory_recollection:${parts.recollectionSummary}` : '',
    parts.mirrorMemorySummary ? `mirror_memory:${parts.mirrorMemorySummary}` : '',
    parts.reflectionPressure != null
      ? `memory_reflection_pressure:${parts.reflectionPressure.toFixed(2)}`
      : '',
  ], 6, 220)

  return entries.join(' ')
}

export function deriveAlicizationDialogueMemoryCarryPolicyFromDigest(
  input: DeriveAlicizationDialogueMemoryCarryPolicyFromDigestInput,
): AlicizationDialogueMemoryCarryPolicy {
  const memory = input.digest?.memory ?? null
  const recallMode = sanitizeText(memory?.recallMode, 48).toLowerCase()
  const memorySummary = sanitizeText(memory?.summary ?? memory?.recentEpisodeSummary ?? '', 180)
  const leadingGoal = sanitizeText(memory?.leadingGoalSummary, 120)
  const reflectionSummary = sanitizeText(memory?.reflectionSummary, 140)
  const reflectionPressure = normalize01(memory?.reflectionPressure)
  const recollectionSummary = sanitizeText(memory?.recollectionSummary, 180)
  const mirrorMemorySummary = sanitizeText(input.mirror?.memorySummary, 180)
  const now = Number.isFinite(input.now) ? Number(input.now) : Date.now()
  const mirrorUpdatedAt = Number(input.mirror?.updatedAt)
  const mirrorAgeMs = Number.isFinite(mirrorUpdatedAt) ? Math.max(0, now - mirrorUpdatedAt) : null
  const mirrorStaleAfterMs = Math.max(
    1,
    Math.floor(input.mirrorStaleAfterMs ?? defaultMirrorStaleAfterMs),
  )
  const mirrorFresh = mirrorAgeMs != null && mirrorAgeMs <= mirrorStaleAfterMs

  const hasReflectiveCue = reflectionPressure != null
    ? reflectionPressure >= 0.55 || Boolean(reflectionSummary)
    : Boolean(reflectionSummary)
  const hasThreadCue = isThreadLikeRecallMode(recallMode)
    || Boolean(leadingGoal)
    || (memory?.recentEpisodeCount ?? 0) > 0

  const mode: AlicizationDialogueMemoryCarryMode = hasReflectiveCue
    ? 'reflective-repair'
    : hasThreadCue
      ? 'carry-thread'
      : 'quiet'
  const allowMirrorCarry = mode !== 'quiet' && mirrorFresh && Boolean(mirrorMemorySummary)

  const recallSeed = mode === 'quiet'
    ? ''
    : buildRecallSeed({
        memorySummary,
        leadingGoal,
        reflectionSummary,
        recallMode,
        recollectionSummary,
        mirrorMemorySummary: allowMirrorCarry ? mirrorMemorySummary : '',
        reflectionPressure,
      })

  const reasonTags = compactUnique([
    mode !== 'quiet' ? `mode:${mode}` : '',
    recallMode ? `recall:${recallMode}` : '',
    recollectionSummary ? `recollection:foreground` : '',
    reflectionPressure != null ? `reflection:${reflectionPressure.toFixed(2)}` : '',
    allowMirrorCarry ? 'mirror:fresh' : mirrorMemorySummary ? 'mirror:stale-or-quiet' : '',
    leadingGoal ? `goal:${leadingGoal}` : '',
  ], 6, 120)

  const summary = mode === 'quiet'
    ? 'mode=quiet'
    : compactUnique([
        `mode=${mode}`,
        recallMode ? `recall=${recallMode}` : '',
        recollectionSummary ? `recollection=${recollectionSummary}` : '',
        reflectionPressure != null ? `reflection_pressure=${reflectionPressure.toFixed(2)}` : '',
        allowMirrorCarry ? 'mirror=carry' : '',
        leadingGoal ? `goal=${leadingGoal}` : '',
      ], 6, 180).join(' | ')

  return {
    allowMirrorCarry,
    mode,
    reasonTags,
    recallSeed,
    reflectionPressure,
    summary,
  }
}

export function buildAlicizationDialogueMemoryCarrySystemBlock(
  policy: AlicizationDialogueMemoryCarryPolicy,
) {
  if (policy.mode === 'quiet')
    return ''

  return [
    '[ALICIZATION_DIALOGUE_MEMORY_CARRY]',
    `mode=${policy.mode}`,
    `summary=${policy.summary}`,
    `reasons=${policy.reasonTags.join(',') || 'none'}`,
    policy.recallSeed ? `seed=${policy.recallSeed}` : '',
    `carry_mirror_memory=${policy.allowMirrorCarry ? 'true' : 'false'}`,
    'Treat this as carry-over memory continuity, not a fresh perception sample.',
    'When memory and current observations conflict, current grounded evidence wins.',
  ].filter(Boolean).join('\n')
}
