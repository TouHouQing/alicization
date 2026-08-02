import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'

import { buildAutobiographicalContinuityLines, pickDominantAutobiographicalGoal } from './autobiographical-self'
import { buildMindEcology } from './mind-ecology'

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function latestReflectionRevision(surface: AlicizationDigitalLifeRuntimeSurface | null | undefined) {
  const entries = surface?.memory.reflectionLedger?.entries ?? []
  const latestEntryId = surface?.memory.reflectionLedger?.latestEntryId ?? null
  const latest = entries.find(entry => entry.id === latestEntryId)
  if (latest && latest.outcome !== 'released')
    return latest.revision

  return entries.find(entry => entry.outcome !== 'released')?.revision
    ?? entries[0]?.revision
    ?? null
}

function resolveEpisodeEcology(surface: AlicizationDigitalLifeRuntimeSurface | null | undefined) {
  if (!surface)
    return null
  return buildMindEcology({
    now: surface.perception.updatedAt,
    watchMode: surface.perception.watchMode,
    worldModel: surface.world.worldModel ?? null,
    appraisal: surface.cognition.appraisal ?? null,
    subjectiveInference: surface.cognition.subjectiveInference ?? null,
    beliefRevision: surface.cognition.beliefRevision ?? null,
    relationshipModel: surface.world.relationshipModel ?? null,
    longHorizonMemory: surface.memory.longHorizonMemory ?? null,
    selfContinuity: surface.memory.selfContinuity ?? null,
    autobiographicalSelf: surface.memory.autobiographicalSelf ?? null,
    motiveEngine: surface.memory.motiveEngine ?? null,
    selfState: surface.agency.selfState ?? null,
    selfGovernor: surface.agency.selfGovernor ?? null,
    habitPolicy: surface.agency.habitPolicy ?? null,
    mindDynamics: surface.cognition.mindDynamics ?? null,
    mindKernel: surface.cognition.mindKernel ?? null,
    commitmentLedger: surface.memory.commitmentLedger ?? null,
    inquiryPlanner: surface.memory.inquiryPlanner ?? null,
    reflectionLedger: surface.memory.reflectionLedger ?? null,
    desireMemory: surface.memory.desireMemory ?? null,
    privateThought: surface.cognition.privateThought ?? null,
    actionEcology: surface.agency.actionEcology ?? null,
    answerPlanner: null,
    conversationState: surface.dialogue.conversationState ?? null,
  })
}

function episodeSignature(surface: AlicizationDigitalLifeRuntimeSurface | null | undefined) {
  if (!surface)
    return ''
  const dominantGoal = pickDominantAutobiographicalGoal(surface.memory.autobiographicalSelf ?? null)
  return [
    surface.world.worldModel?.activeThread?.id ?? 'none',
    surface.cognition.privateThought?.emotionalTension ?? 'none',
    surface.dialogue.replyDeliberation?.selectedMotive ?? 'none',
    surface.memory.motiveEngine?.rulingDrive ?? 'none',
    dominantGoal?.kind ?? 'none',
    surface.agency.actionEcology?.mode ?? 'none',
    surface.dialogue.answerPlanner?.act ?? 'none',
    sanitizeText(surface.memory.autobiographicalSelf?.latestInflection ?? '', 120) || 'none',
  ].join('::')
}

export function buildAutobiographicalEpisodeFragment(input: {
  previousRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  nextRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
}) {
  const previousSurface = input.previousRuntimeSurface ?? null
  const nextSurface = input.nextRuntimeSurface ?? null
  if (!nextSurface)
    return ''

  if (episodeSignature(previousSurface) === episodeSignature(nextSurface))
    return ''

  const ecology = resolveEpisodeEcology(nextSurface)
  const dominantGoal = pickDominantAutobiographicalGoal(nextSurface.memory.autobiographicalSelf ?? null)
  const continuityLines = buildAutobiographicalContinuityLines({
    autobiographicalSelf: nextSurface.memory.autobiographicalSelf ?? null,
    longHorizonMemory: nextSurface.memory.longHorizonMemory ?? null,
    goalStack: nextSurface.memory.goalStack ?? null,
    desireMemory: nextSurface.memory.desireMemory ?? null,
    privateThought: nextSurface.cognition.privateThought ?? null,
    mindEcology: ecology,
  })
  const summary = sanitizeText(
    continuityLines[0]
    || nextSurface.cognition.privateThought?.thoughtText
    || nextSurface.memory.motiveEngine?.backgroundAgendas[0]?.summary
    || dominantGoal?.summary
    || nextSurface.world.worldModel?.activeThread?.summary
    || nextSurface.perception.currentScene?.summary
    || '',
    220,
  )
  if (!summary)
    return ''

  const lesson = sanitizeText(
    nextSurface.memory.autobiographicalSelf?.latestInflection
    || latestReflectionRevision(nextSurface)
    || nextSurface.memory.longHorizonMemory?.rememberedPreferenceSummary
    || nextSurface.memory.longHorizonMemory?.rememberedConstraintSummary
    || '',
    180,
  )

  return [
    nextSurface.world.worldModel?.activeThread?.kind ? `episode_thread:${nextSurface.world.worldModel.activeThread.kind}` : '',
    nextSurface.cognition.privateThought?.emotionalTension ? `episode_emotion:${nextSurface.cognition.privateThought.emotionalTension}` : '',
    nextSurface.world.relationshipModel?.climate ? `episode_relation:${nextSurface.world.relationshipModel.climate}/${nextSurface.world.relationshipModel.approachVector}` : '',
    nextSurface.memory.motiveEngine?.rulingDrive ? `episode_motive:${nextSurface.memory.motiveEngine.rulingDrive}` : '',
    dominantGoal?.kind ? `episode_goal:${dominantGoal.kind}/${dominantGoal.status}` : '',
    nextSurface.agency.actionEcology?.mode ? `episode_action:${nextSurface.agency.actionEcology.mode}` : '',
    nextSurface.dialogue.replyDeliberation?.selectedMotive ? `episode_reply:${nextSurface.dialogue.replyDeliberation.selectedMotive}` : '',
    ecology?.moodLabel ? `episode_mood:${ecology.moodLabel}` : '',
    lesson ? `episode_lesson:${lesson}` : '',
    `episode_summary:${summary}`,
  ].filter(Boolean).join(' ')
}
