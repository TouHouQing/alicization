import type {
  AlicizationDigitalLifeSpineDigest,
  AlicizationMindParticipationSnapshot,
  AlicizationMemoryDecisionTraceRecord,
} from './alicization-transport-contracts'

function clampUnit(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value)))
}

function round2(value: number) {
  return Number(clampUnit(value).toFixed(2))
}

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function pushSignal(target: string[], signal: string) {
  const normalized = sanitizeText(signal, 96)
  if (!normalized || target.includes(normalized))
    return
  target.push(normalized)
}

export function deriveAlicizationMindParticipationFromSpine(
  spine: AlicizationDigitalLifeSpineDigest | null | undefined,
): AlicizationMindParticipationSnapshot {
  const runtime = spine?.runtime ?? null
  const architecture = spine?.architecture ?? null
  const memory = spine?.memory ?? null
  const embodiment = spine?.embodiment ?? null
  const continuity = spine?.continuitySignal ?? null
  const motive = spine?.motive ?? null
  const habit = spine?.habit ?? null
  const proactive = spine?.proactive ?? null
  const autonomy = spine?.autonomy ?? null
  const outcomeLearning = spine?.outcomeLearning ?? null

  const mindSignals: string[] = []
  const memorySignals: string[] = []
  const personalitySignals: string[] = []
  const relationshipSignals: string[] = []
  const continuitySignals: string[] = []

  const mindParticipation = round2(
    (runtime?.dominantMode ? 0.2 : 0)
    + (runtime?.dominantDrive ? 0.18 : 0)
    + (architecture?.dominantSystem === 'mind' || architecture?.dominantSystem === 'dialogue' ? 0.2 : 0.08)
    + (motive?.rulingDrive ? 0.18 : 0)
    + (embodiment?.mindEcology?.currentPreoccupation ? 0.12 : 0)
    + (autonomy?.whyNow ? 0.12 : 0),
  )
  if (runtime?.dominantMode)
    pushSignal(mindSignals, `mode=${runtime.dominantMode}`)
  if (runtime?.dominantDrive)
    pushSignal(mindSignals, `drive=${runtime.dominantDrive}`)
  if (architecture?.governingFocus)
    pushSignal(mindSignals, `focus=${architecture.governingFocus}`)
  if (motive?.rulingDrive)
    pushSignal(mindSignals, `motive=${motive.rulingDrive}`)
  if (autonomy?.whyNow)
    pushSignal(mindSignals, `why=${autonomy.whyNow}`)

  const memoryParticipation = round2(
    (memory?.summary ? 0.16 : 0)
    + (memory?.recollectionSummary ? 0.22 : 0)
    + (memory?.recollectionSurfaceSummary ? 0.16 : 0)
    + ((memory?.recentEpisodeCount ?? 0) > 0 ? 0.12 : 0)
    + ((memory?.longHorizonCueCount ?? 0) > 0 ? 0.12 : 0)
    + (memory?.rememberedPreferenceSummary ? 0.08 : 0)
    + (memory?.rememberedConstraintSummary ? 0.08 : 0)
    + (memory?.rememberedPlanSummary ? 0.06 : 0),
  )
  if (memory?.recollectionSummary)
    pushSignal(memorySignals, `recollection=${memory.recollectionSummary}`)
  if (memory?.recollectionSurfaceSummary)
    pushSignal(memorySignals, `surface=${memory.recollectionSurfaceSummary}`)
  if (memory?.recentEpisodeSummary)
    pushSignal(memorySignals, `episode=${memory.recentEpisodeSummary}`)
  if (memory?.rememberedPreferenceSummary)
    pushSignal(memorySignals, `preference=${memory.rememberedPreferenceSummary}`)
  if (memory?.rememberedPlanSummary)
    pushSignal(memorySignals, `plan=${memory.rememberedPlanSummary}`)

  const personalityParticipation = round2(
    (embodiment?.autobiographicalSelf?.identityNarrative ? 0.18 : 0)
    + (embodiment?.autobiographicalSelf?.relationshipDoctrine ? 0.14 : 0)
    + (embodiment?.mindEcology?.selfNarrative ? 0.12 : 0)
    + (embodiment?.mindEcology?.replyHabit ? 0.1 : 0)
    + (embodiment?.privateThought?.suggestedStyle ? 0.12 : 0)
    + (habit?.dominantMode ? 0.12 : 0)
    + (habit?.suggestedStyleCap ? 0.1 : 0)
    + (outcomeLearning?.latestInflection ? 0.12 : 0),
  )
  if (embodiment?.autobiographicalSelf?.identityNarrative)
    pushSignal(personalitySignals, `identity=${embodiment.autobiographicalSelf.identityNarrative}`)
  if (embodiment?.mindEcology?.selfNarrative)
    pushSignal(personalitySignals, `self=${embodiment.mindEcology.selfNarrative}`)
  if (embodiment?.privateThought?.suggestedStyle)
    pushSignal(personalitySignals, `style=${embodiment.privateThought.suggestedStyle}`)
  if (habit?.dominantMode)
    pushSignal(personalitySignals, `habit=${habit.dominantMode}`)
  if (outcomeLearning?.latestInflection)
    pushSignal(personalitySignals, `learning=${outcomeLearning.latestInflection}`)

  const relationshipParticipation = round2(
    (embodiment?.relationship?.climate ? 0.16 : 0)
    + (embodiment?.relationship?.approachVector ? 0.14 : 0)
    + (embodiment?.privateThought?.relationshipVector ? 0.12 : 0)
    + (memory?.rememberedPreferenceSummary ? 0.12 : 0)
    + (memory?.rememberedConstraintSummary ? 0.12 : 0)
    + (embodiment?.autobiographicalSelf?.relationshipDoctrine ? 0.12 : 0)
    + (outcomeLearning?.reflectionTargetScope === 'relationship' ? 0.1 : 0)
    + (proactive?.preferredPresence ? 0.08 : 0),
  )
  if (embodiment?.relationship?.climate)
    pushSignal(relationshipSignals, `climate=${embodiment.relationship.climate}`)
  if (embodiment?.relationship?.approachVector)
    pushSignal(relationshipSignals, `approach=${embodiment.relationship.approachVector}`)
  if (embodiment?.privateThought?.relationshipVector)
    pushSignal(relationshipSignals, `vector=${embodiment.privateThought.relationshipVector}`)
  if (memory?.rememberedPreferenceSummary)
    pushSignal(relationshipSignals, `remembered=${memory.rememberedPreferenceSummary}`)
  if (embodiment?.autobiographicalSelf?.relationshipDoctrine)
    pushSignal(relationshipSignals, `doctrine=${embodiment.autobiographicalSelf.relationshipDoctrine}`)

  const continuityParticipation = round2(
    (continuity?.summary ? 0.18 : 0)
    + (runtime?.activeThreadId || runtime?.activeThreadTitle ? 0.16 : 0)
    + (memory?.thoughtThreadSummary ? 0.14 : 0)
    + (memory?.rememberedPlanSummary ? 0.12 : 0)
    + (proactive?.activeThreadTitle ? 0.1 : 0)
    + (autonomy?.sourceThreadSummary ? 0.14 : 0)
    + (motive?.leadingGoalSummary ? 0.08 : 0)
    + (runtime?.answerIntent ? 0.08 : 0),
  )
  if (continuity?.summary)
    pushSignal(continuitySignals, `line=${continuity.summary}`)
  if (runtime?.activeThreadTitle)
    pushSignal(continuitySignals, `thread=${runtime.activeThreadTitle}`)
  if (memory?.thoughtThreadSummary)
    pushSignal(continuitySignals, `memory-thread=${memory.thoughtThreadSummary}`)
  if (autonomy?.sourceThreadSummary)
    pushSignal(continuitySignals, `source-thread=${autonomy.sourceThreadSummary}`)
  if (motive?.leadingGoalSummary)
    pushSignal(continuitySignals, `goal=${motive.leadingGoalSummary}`)

  return {
    mindParticipation,
    memoryParticipation,
    personalityParticipation,
    relationshipParticipation,
    continuityParticipation,
    summary: [
      mindSignals[0] ? `mind:${mindSignals[0]}` : '',
      memorySignals[0] ? `memory:${memorySignals[0]}` : '',
      personalitySignals[0] ? `persona:${personalitySignals[0]}` : '',
      relationshipSignals[0] ? `relationship:${relationshipSignals[0]}` : '',
      continuitySignals[0] ? `continuity:${continuitySignals[0]}` : '',
    ].filter(Boolean).join(' | '),
  }
}

export function deriveAlicizationMindParticipationFromTrace(
  trace: Pick<AlicizationMemoryDecisionTraceRecord, 'governance' | 'dialogueEmitted' | 'persistenceWritten'>,
): AlicizationMindParticipationSnapshot {
  const governanceSpine = trace.governance?.digitalLifeSpine ?? null
  const dialogueSpine = (trace.dialogueEmitted?.digitalLifeSpine ?? null) as AlicizationDigitalLifeSpineDigest | null
  const persistenceSpine = (trace.persistenceWritten?.digitalLifeSpine ?? null) as AlicizationDigitalLifeSpineDigest | null
  return deriveAlicizationMindParticipationFromSpine(
    dialogueSpine ?? persistenceSpine ?? governanceSpine ?? null,
  )
}
