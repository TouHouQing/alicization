import type { AlicizationHostPersonModelSnapshot } from '../../../shared/eventa'
import type {
  AlicizationMemoryDeliberationLatentControls,
} from './memory-deliberation-latent-controls'
import type { AlicizationMemoryRestraintJudge, AlicizationMemorySocialBoundarySummary } from './memory-restraint-judge'
import type { OrganicMemoryProjectStateContinuitySnapshot, OrganicMemoryPromptContext } from './runtime-soul'

import {
  buildMemoryLatentBoundaryTag,
  deriveMemoryDeliberationLatentControls,
  summarizeMemoryDeliberationLatentControls,
} from './memory-deliberation-latent-controls'
import {

  buildAlicizationMemoryRestraintJudge,
} from './memory-restraint-judge'
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

function readStructuredEmbodimentToken(text: string, key: string) {
  const match = text.match(new RegExp(`${key}=([a-z0-9-]+)`, 'u'))
  return match?.[1] ?? null
}

function deriveHostSocialBoundarySummary(
  hostPersonModel: AlicizationHostPersonModelSnapshot | null | undefined,
): AlicizationMemorySocialBoundarySummary | null {
  const model = hostPersonModel ?? null
  if (!model)
    return null

  const preferredCloseness = sanitizeText(model.preferredClosenessByContext?.[0]?.preference, 160) || null
  const trustRationale = sanitizeText(model.trustLadder?.rationale, 220) || null
  const cueText = [preferredCloseness, trustRationale].filter(Boolean).join(' ')

  return {
    trustStage: model.trustLadder?.stage ?? null,
    preferredCloseness,
    trustRationale,
    roomFirstSignal: /room[-\s]?first|leave room|give space|work[-\s]?focus|respect.*space|先留空间|先给空间|工作优先/u.test(cueText),
    boundaryFirstSignal: /boundary|respect.*boundary|do not crowd|avoid pressure|边界|别逼|不要压/u.test(cueText),
    repairFirstSignal: /repair|grounded repair|specific repair|stabilize|修复|先修|先稳住/u.test(cueText),
  }
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
  const procedureLike = speech?.surfaceMode === 'procedural-carry'
    || intentMode === 'execution-procedure'
    || intentMode === 'experience-pattern'
    || (deliberation?.selectedProcedures.length ?? 0) > 0
    || (deliberation?.selectedChains ?? []).some(item => item.kind === 'task-procedure-relationship-stance')
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

  if (procedureLike && threadedContinuityPresent && seamContinuityExplicit && !relationshipLike)
    return 'procedural-carry' as const
  if (relationshipLike && !procedureLike)
    return 'relationship-continuity' as const
  return baseSurfacePolicy
}

function hasProjectPreflightClosurePressure(input: {
  deliberation: OrganicMemoryPromptContext['memoryDeliberation'] | null | undefined
  speech: OrganicMemoryPromptContext['recollectionSpeechPlan'] | null | undefined
  recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null | undefined
  projectStateContinuity?: OrganicMemoryPromptContext['projectStateContinuity'] | null | undefined
}) {
  const text = [
    input.deliberation?.whyNow,
    input.speech?.rationale,
    input.recollectionIntent?.rationale,
    input.recollectionIntent?.recollectionAgenda?.whyRecallNow,
    input.projectStateContinuity?.identity,
    input.projectStateContinuity?.currentPhase,
    input.projectStateContinuity?.sameHerSummary,
    input.projectStateContinuity?.openClosureSummary,
    input.projectStateContinuity?.proactiveSameHerGap,
    input.projectStateContinuity?.nextClosureTarget,
    input.projectStateContinuity?.preDialogueAwarenessLine,
    input.projectStateContinuity?.emotionalClosureCue,
    input.projectStateContinuity?.sameHerSelfLine,
    input.projectStateContinuity?.sameHerHoldDetail,
    input.projectStateContinuity?.sameHerDriftRisk,
  ].filter(Boolean).join(' ').toLowerCase()

  return text.includes('phase 1')
    && (
      text.includes('memory still needs stronger end-to-end closure')
      || text.includes('same still-open closure work')
      || text.includes('same digital life')
    )
}

function hasDurableSelfCoreAntiRestartCarry(input: {
  deliberation: OrganicMemoryPromptContext['memoryDeliberation'] | null | undefined
  speech: OrganicMemoryPromptContext['recollectionSpeechPlan'] | null | undefined
  recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null | undefined
}) {
  const text = [
    input.deliberation?.whyNow,
    ...(input.deliberation?.stableCore ?? []),
    ...(input.deliberation?.unsafeDetails ?? []),
    ...(input.deliberation?.selectedBundles ?? []).map(item => item.summary),
    ...(input.deliberation?.selectedChains ?? []).flatMap(item => [item.summary, item.currentStance, item.answerPosture]),
    ...(input.deliberation?.selectedRelationshipLines ?? []),
    input.deliberation?.followUpAffordance?.summary,
    input.deliberation?.followUpAffordance?.whyNow,
    input.speech?.rationale,
    input.recollectionIntent?.rationale,
  ].filter(Boolean).join(' ').toLowerCase()

  return (
    /same her|same living self|one living self|same living line|across quiet, memory, and speech/u.test(text)
    && /without reopening from scratch|reopen from scratch|fresh opening|same thread instead of reopening|not reopen from scratch/u.test(text)
  )
}

function hasQuietSameHerContinuityCarry(input: {
  deliberation: OrganicMemoryPromptContext['memoryDeliberation'] | null | undefined
  speech: OrganicMemoryPromptContext['recollectionSpeechPlan'] | null | undefined
  recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null | undefined
}) {
  const text = [
    input.deliberation?.whyNow,
    input.deliberation?.inwardLine,
    ...(input.deliberation?.stableCore ?? []),
    ...(input.deliberation?.unsafeDetails ?? []),
    ...(input.deliberation?.selectedBundles ?? []).map(item => item.summary),
    ...(input.deliberation?.selectedChains ?? []).flatMap(item => [item.summary, item.currentStance, item.answerPosture, item.relationshipMeaning, item.lesson]),
    ...(input.deliberation?.selectedEras ?? []).map(item => item.summary),
    ...(input.deliberation?.selectedRelationshipLines ?? []),
    input.deliberation?.followUpAffordance?.summary,
    input.deliberation?.followUpAffordance?.whyNow,
    input.speech?.rationale,
    input.recollectionIntent?.rationale,
  ].filter(Boolean).join(' ').toLowerCase()

  return /quiet continuity|current thread stayed inward|current thread holds inward|line stayed inward|line holds inward|current thread.*rather than widening outward|安静陪着|先别外扩|当前线程.*内收/u.test(text)
}

function hasCorrectedSamePersonContinuityCarry(input: {
  deliberation: OrganicMemoryPromptContext['memoryDeliberation'] | null | undefined
  speech: OrganicMemoryPromptContext['recollectionSpeechPlan'] | null | undefined
  recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null | undefined
}) {
  const text = [
    input.deliberation?.whyNow,
    input.deliberation?.inwardLine,
    ...(input.deliberation?.stableCore ?? []),
    ...(input.deliberation?.unsafeDetails ?? []),
    ...(input.deliberation?.selectedBundles ?? []).map(item => item.summary),
    ...(input.deliberation?.selectedChains ?? []).flatMap(item => [item.summary, item.currentStance, item.answerPosture, item.relationshipMeaning, item.lesson]),
    ...(input.deliberation?.selectedRelationshipLines ?? []),
    input.deliberation?.followUpAffordance?.summary,
    input.deliberation?.followUpAffordance?.whyNow,
    input.speech?.rationale,
    input.recollectionIntent?.rationale,
    input.recollectionIntent?.recollectionAgenda?.whyRecallNow,
  ].filter(Boolean).join(' ').toLowerCase()

  return (
    /host corrected|corrected the relationship meaning|纠正过|纠正了|被纠正过/u.test(text)
    && /same-person continuity|same person continuity|same-person|same person|持续的人|同一个人|同一个她/u.test(text)
    && /progress pressure|progress recap|status recap|generic status|task-shell|催进度|进度压力|状态汇报|任务壳/u.test(text)
  )
}

function deriveCorrectedSamePersonEmbodimentCarry(input: {
  deliberation: OrganicMemoryPromptContext['memoryDeliberation'] | null | undefined
  speech: OrganicMemoryPromptContext['recollectionSpeechPlan'] | null | undefined
  recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null | undefined
}) {
  const text = [
    input.deliberation?.whyNow,
    input.deliberation?.inwardLine,
    input.deliberation?.visibleLine,
    ...(input.deliberation?.stableCore ?? []),
    ...(input.deliberation?.unsafeDetails ?? []),
    ...(input.deliberation?.selectedBundles ?? []).map(item => item.summary),
    ...(input.deliberation?.selectedChains ?? []).flatMap(item => [item.summary, item.currentStance, item.answerPosture, item.relationshipMeaning, item.lesson]),
    ...(input.deliberation?.selectedRelationshipLines ?? []),
    input.deliberation?.followUpAffordance?.summary,
    input.deliberation?.followUpAffordance?.whyNow,
    input.speech?.rationale,
    ...(input.recollectionIntent?.queryHints ?? []),
    ...(input.recollectionIntent?.recollectionAgenda?.candidateProcedureLines ?? []),
    input.recollectionIntent?.rationale,
    input.recollectionIntent?.recollectionAgenda?.whyRecallNow,
  ].filter(Boolean).join(' ').toLowerCase()

  const slowDown = /embodiment_blink=slower|embodiment_pacing=slower|slow down|slower pacing|slow the reply|reply should slow down|放慢|慢一点|慢下来|放缓/u.test(text)
  const keepGazeStable = /embodiment_gaze=stable|gaze stable|stable gaze|steadier gaze|keep gaze stable|gaze steadier|视线更稳|眼神更稳|目光更稳/u.test(text)
  const keepLowerPressure = /embodiment_voice=lower-pressure|voice=lower-pressure|lower-pressure voice|keep the voice low-pressure|keep voice low-pressure|语气更低压|低压/u.test(text)
  const residentMode = readStructuredEmbodimentToken(text, 'embodiment_resident_mode')
  const residentFace = readStructuredEmbodimentToken(text, 'embodiment_resident_face')
  const residentAction = readStructuredEmbodimentToken(text, 'embodiment_resident_action')
  const residentMeasuredReturn = residentMode === 'measured-return'
  const residentObserveFocus = residentFace === 'observe-focus' || residentFace === 'silent-observe'
  const residentHold = /hold|stay|hover|linger/u.test(residentAction ?? '')
  if (!slowDown && !keepGazeStable && !keepLowerPressure && !residentMeasuredReturn && !residentObserveFocus && !residentHold)
    return null

  const summary = [
    slowDown ? 'slow down' : null,
    keepGazeStable ? 'keep gaze stable' : null,
    keepLowerPressure ? 'keep the return lower-pressure' : null,
    residentMeasuredReturn && residentHold
      ? 'hold resident presence in measured-return'
      : (residentMeasuredReturn ? 'keep resident presence measured-return' : null),
    !residentMeasuredReturn && residentHold ? 'hold resident presence instead of widening outward too early' : null,
    residentObserveFocus ? 'keep an observe-focus face' : null,
  ].filter(Boolean).join(' and ')

  return {
    slowDown,
    keepGazeStable,
    keepLowerPressure,
    residentMeasuredReturn,
    residentObserveFocus,
    residentHold,
    summary,
  }
}

function deriveCorrectedSamePersonRevisionDiscipline(input: {
  deliberation: OrganicMemoryPromptContext['memoryDeliberation'] | null | undefined
  speech: OrganicMemoryPromptContext['recollectionSpeechPlan'] | null | undefined
  recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null | undefined
}) {
  const text = [
    input.deliberation?.whyNow,
    input.deliberation?.inwardLine,
    input.deliberation?.visibleLine,
    ...(input.deliberation?.stableCore ?? []),
    ...(input.deliberation?.unsafeDetails ?? []),
    ...(input.deliberation?.selectedBundles ?? []).map(item => item.summary),
    ...(input.deliberation?.selectedChains ?? []).flatMap(item => [item.summary, item.currentStance, item.answerPosture, item.relationshipMeaning, item.lesson]),
    ...(input.deliberation?.selectedRelationshipLines ?? []),
    input.deliberation?.followUpAffordance?.summary,
    input.deliberation?.followUpAffordance?.whyNow,
    input.speech?.rationale,
    ...(input.recollectionIntent?.queryHints ?? []),
    ...(input.recollectionIntent?.recollectionAgenda?.candidateProcedureLines ?? []),
    input.recollectionIntent?.rationale,
    input.recollectionIntent?.recollectionAgenda?.whyRecallNow,
  ].filter(Boolean).join(' ').toLowerCase()

  const tentative = /tentative|uncertain|not fully sure|not fully settled|still settling|conflicting newer evidence|seems more right|不完全确定|还在稳定|还没完全稳住/u.test(text)
  const downrankOldStatus = /downrank|older progress-status memory|old progress status|older status memory|旧的 progress status|旧的进度状态|旧的状态记忆/u.test(text)
  const mergedSameThreadContinuity = /merge repeated .*same-thread continuity echoes|merged same-thread continuity|merged same-thread|stronger same-thread memory|same-thread continuity echoes|同线回声|同一条线.*合并/u.test(text)
  const forgotTemporaryNoise = /forget low-salience temporary noise|temporary noise|stale emotional wobble|temporary wobble|faded noise|older-emotional-spike|older emotional spike|旧的情绪噪声|短暂噪声|情绪波动/u.test(text)
  if (!tentative && !downrankOldStatus && !mergedSameThreadContinuity && !forgotTemporaryNoise)
    return null

  return {
    tentative,
    downrankOldStatus,
    mergedSameThreadContinuity,
    forgotTemporaryNoise,
  }
}

function summarizeCorrectedSamePersonMetabolismDiscipline(
  discipline: ReturnType<typeof deriveCorrectedSamePersonRevisionDiscipline> | null,
) {
  if (!discipline)
    return ''

  const parts = [
    discipline.mergedSameThreadContinuity ? 'merged same-thread continuity foreground' : '',
    discipline.forgotTemporaryNoise ? 'faded noise background' : '',
  ].filter(Boolean)

  if (parts.length === 0)
    return ''

  return sanitizeText(`${parts.join(' and ')}.`, 160)
}

function deriveWorriedContinuityRepairDiscipline(input: {
  deliberation: OrganicMemoryPromptContext['memoryDeliberation'] | null | undefined
  speech: OrganicMemoryPromptContext['recollectionSpeechPlan'] | null | undefined
  recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null | undefined
}) {
  const text = [
    input.deliberation?.whyNow,
    input.deliberation?.inwardLine,
    input.deliberation?.visibleLine,
    ...(input.deliberation?.stableCore ?? []),
    ...(input.deliberation?.unsafeDetails ?? []),
    ...(input.deliberation?.selectedBundles ?? []).map(item => item.summary),
    ...(input.deliberation?.selectedChains ?? []).flatMap(item => [item.summary, item.currentStance, item.answerPosture, item.relationshipMeaning, item.lesson]),
    ...(input.deliberation?.selectedRelationshipLines ?? []),
    input.deliberation?.followUpAffordance?.summary,
    input.deliberation?.followUpAffordance?.whyNow,
    input.speech?.rationale,
    ...(input.recollectionIntent?.queryHints ?? []),
    ...(input.recollectionIntent?.recollectionAgenda?.candidateProcedureLines ?? []),
    input.recollectionIntent?.rationale,
    input.recollectionIntent?.recollectionAgenda?.whyRecallNow,
  ].filter(Boolean).join(' ').toLowerCase()

  const worriedContinuity = /host_emotion_label=worried-continuity|worried-continuity|worried continuity|collapse back into a tool shell|工具壳/u.test(text)
  const carefulRepair = /self_emotion_label=careful-repair|careful-repair|careful repair|continuity repair|repair continuity first/u.test(text)
  const highModalityRisk = /embodiment_modality_risk=high|high modality risk|modality risk stays high|modality risk high/u.test(text)
  if (!worriedContinuity || !carefulRepair || !highModalityRisk)
    return null

  const hoverFirst = /hover-first|hover first|wait for a clearer opening|先别主动往外推|先安静一点|先安静/u.test(text)
  const antiAssistantShell = /generic assistant shell|project-summary voice|tool shell|helper shell|task-shell|助手壳|工具壳/u.test(text)
  const tentative = /certainty=tentative|uncertainty|not fully settled|still settling|不完全确定/u.test(text)
  const slowDown = /embodiment_pacing=slower|slow down|slower pacing|慢一点|放慢/u.test(text)
  const keepGazeStable = /embodiment_gaze=stable|gaze stable|stable gaze|视线更稳|眼神更稳/u.test(text)
  const keepLowerPressure = /embodiment_voice=lower-pressure|voice=lower-pressure|lower-pressure voice|低压/u.test(text)

  return {
    hoverFirst,
    antiAssistantShell,
    tentative,
    slowDown,
    keepGazeStable,
    keepLowerPressure,
    embodimentSummary: [
      slowDown ? 'slower pacing' : null,
      keepGazeStable ? 'steadier gaze' : null,
      keepLowerPressure ? 'lower-pressure return' : null,
    ].filter(Boolean).join(', '),
  }
}

function deriveProjectClosureContinuityDiscipline(
  projectStateContinuity: OrganicMemoryProjectStateContinuitySnapshot | null | undefined,
) {
  const continuity = projectStateContinuity ?? null
  if (!continuity)
    return null

  const phase = sanitizeText(continuity.currentPhase, 180).toLowerCase()
  const landedProgress = sanitizeText(continuity.landedProgressSummary, 220).toLowerCase()
  const openClosure = sanitizeText(continuity.openClosureSummary, 220).toLowerCase()
  const proactiveSameHerGap = sanitizeText(continuity.proactiveSameHerGap, 220).toLowerCase()
  const nextClosure = sanitizeText(continuity.nextClosureTarget, 220).toLowerCase()
  const driftRisk = sanitizeText(continuity.sameHerDriftRisk, 220).toLowerCase()
  const awareness = sanitizeText(continuity.preDialogueAwarenessLine, 220).toLowerCase()
  const emotionalClosureCue = sanitizeText(continuity.emotionalClosureCue, 220).toLowerCase()
  const sameHerSelfLine = sanitizeText(continuity.sameHerSelfLine, 220).toLowerCase()
  const sameHerHoldDetail = sanitizeText(continuity.sameHerHoldDetail, 220).toLowerCase()
  const sameHerSummary = sanitizeText(continuity.sameHerSummary, 220).toLowerCase()
  const combined = [
    phase,
    landedProgress,
    openClosure,
    proactiveSameHerGap,
    nextClosure,
    driftRisk,
    awareness,
    emotionalClosureCue,
    sameHerSelfLine,
    sameHerHoldDetail,
    sameHerSummary,
  ].join(' ')

  const phaseOneDigitalLife = phase.includes('phase 1')
    && /digital life|local digital life|local-first digital life|数字生命/u.test(combined)
  const openLoopStillFocused = /unfinished closure|still-open closure|not fully closed|not fully sealed|memory.*initiative.*embodiment|initiative.*memory.*embodiment|cross-modal same-her proof|same living line|同一个她|闭环|具身/u.test(combined)
  if (!phaseOneDigitalLife || !openLoopStillFocused)
    return null

  return {
    preserveSameHerAgainstProjectShell: /generic guidance|generic project shell|detached project shell|flattening into generic project narration|漂成.*project shell|普通服务式/u.test(combined),
    missingEmbodimentClosure: /embodiment|voice|face|motion|lipsync|resident presence|cross-modal/u.test(`${openClosure} ${proactiveSameHerGap} ${nextClosure}`),
    missingInitiativeClosure: /initiative|opening|proactive|主动性/u.test(`${openClosure} ${proactiveSameHerGap} ${nextClosure}`),
    missingMemoryClosure: /memory|recall|recollection|记忆/u.test(`${openClosure} ${proactiveSameHerGap} ${nextClosure}`),
  }
}

export function buildAlicizationMemoryDeliberationKernel(input: {
  deliberation: OrganicMemoryPromptContext['memoryDeliberation'] | null | undefined
  speech: OrganicMemoryPromptContext['recollectionSpeechPlan'] | null | undefined
  recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null | undefined
  knowledgeEvidence?: OrganicMemoryPromptContext['knowledgeEvidence']
  hostPersonModel?: OrganicMemoryPromptContext['hostPersonModel']
  projectStateContinuity?: OrganicMemoryPromptContext['projectStateContinuity']
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
  const projectClosureContinuityDiscipline = deriveProjectClosureContinuityDiscipline(input.projectStateContinuity ?? null)
  const hostSocialBoundarySummary = deriveHostSocialBoundarySummary(input.hostPersonModel ?? null)
  const tuningForHostBoundaryDiscipline = Boolean(
    hostSocialBoundarySummary
    && (hostSocialBoundarySummary.roomFirstSignal || hostSocialBoundarySummary.boundaryFirstSignal)
    && memoryControl?.relationshipVector === 'relational'
    && !shouldStayInward,
  )
  const tuningForHostRepairDiscipline = Boolean(
    hostSocialBoundarySummary?.repairFirstSignal
    && memoryControl?.relationshipVector !== 'neutral'
    && memoryControl?.surfacePermission !== 'inward-only'
    && !shouldStayInward,
  )
  const tuningForProjectClosureDiscipline = Boolean(
    hasProjectPreflightClosurePressure({
      deliberation,
      speech,
      recollectionIntent: input.recollectionIntent ?? null,
      projectStateContinuity: input.projectStateContinuity ?? null,
    })
    && memoryControl?.surfacePermission !== 'inward-only'
    && !shouldStayInward,
  )
  const tuningForProjectClosureLoopGapDiscipline = Boolean(
    projectClosureContinuityDiscipline
    && (
      projectClosureContinuityDiscipline.missingEmbodimentClosure
      || projectClosureContinuityDiscipline.missingInitiativeClosure
      || projectClosureContinuityDiscipline.missingMemoryClosure
      || projectClosureContinuityDiscipline.preserveSameHerAgainstProjectShell
    )
    && memoryControl?.surfacePermission !== 'inward-only'
    && !shouldStayInward,
  )
  const durableSelfCoreAntiRestartCarry = hasDurableSelfCoreAntiRestartCarry({
    deliberation,
    speech,
    recollectionIntent: input.recollectionIntent ?? null,
  })
  const quietSameHerContinuityCarry = hasQuietSameHerContinuityCarry({
    deliberation,
    speech,
    recollectionIntent: input.recollectionIntent ?? null,
  })
  const correctedSamePersonContinuityCarry = hasCorrectedSamePersonContinuityCarry({
    deliberation,
    speech,
    recollectionIntent: input.recollectionIntent ?? null,
  })
  const correctedSamePersonEmbodimentCarry = correctedSamePersonContinuityCarry
    ? deriveCorrectedSamePersonEmbodimentCarry({
        deliberation,
        speech,
        recollectionIntent: input.recollectionIntent ?? null,
      })
    : null
  const correctedSamePersonRevisionDiscipline = correctedSamePersonContinuityCarry
    ? deriveCorrectedSamePersonRevisionDiscipline({
        deliberation,
        speech,
        recollectionIntent: input.recollectionIntent ?? null,
      })
    : null
  const correctedSamePersonMetabolismSummary = summarizeCorrectedSamePersonMetabolismDiscipline(
    correctedSamePersonRevisionDiscipline,
  )
  const correctedSamePersonMetabolismPrefix = correctedSamePersonMetabolismSummary
    ? `${correctedSamePersonMetabolismSummary} `
    : ''
  const worriedContinuityRepairDiscipline = deriveWorriedContinuityRepairDiscipline({
    deliberation,
    speech,
    recollectionIntent: input.recollectionIntent ?? null,
  })

  const inwardCarryRule = memoryControl
    ? `memory_latent_controls=${memoryControlSummary}`
    : speechLatentSummary
      ? `recollection_latent_controls=${speechLatentSummary}`
      : (shouldStayInward
          ? 'Honor active recollection as inward-only latent control.'
          : 'Honor active recollection as latent control while keeping the live payoff primary.')

  const restraint = buildAlicizationMemoryRestraintJudge({
    shouldRecall,
    shouldStayInward: shouldStayInward
      || tuningForHostBoundaryDiscipline
      || tuningForHostRepairDiscipline
      || tuningForProjectClosureDiscipline
      || tuningForProjectClosureLoopGapDiscipline
      || Boolean(worriedContinuityRepairDiscipline)
      || quietSameHerContinuityCarry
      || correctedSamePersonContinuityCarry
      || durableSelfCoreAntiRestartCarry,
    memoryControl,
    hostPersonModel: input.hostPersonModel ?? null,
    socialBoundarySummary: hostSocialBoundarySummary,
    knowledgeEvidence: input.knowledgeEvidence ?? null,
    followUpAffordance: deliberation?.followUpAffordance ?? null,
  })
  const tunedWhyWithheld = tuningForHostBoundaryDiscipline
    ? 'The host model is still asking for room-first boundary discipline, so recollection should stay inward until the present answer has more space.'
    : tuningForHostRepairDiscipline
      ? 'The host model is still asking for repair-first continuity, so recollection should let the present repair payoff land before widening.'
      : tuningForProjectClosureLoopGapDiscipline
        ? 'continuity_gap=memory_initiative_embodiment; recollection_visibility=internal_until_current_answer_has_evidence; avoid_project_shell=true'
        : tuningForProjectClosureDiscipline
          ? 'life_loop_closure=open; recollection_visibility=internal_until_evidence_boundary_is_clear'
          : worriedContinuityRepairDiscipline
            ? `The host was worried this line could collapse back into a tool shell, careful repair is still active, and modality risk stays high, so recollection should stay inward${worriedContinuityRepairDiscipline.embodimentSummary ? ` with ${worriedContinuityRepairDiscipline.embodimentSummary}` : ''} until the continuity line can hold without turning into an outward helper reopen.`
            : quietSameHerContinuityCarry
              ? 'quiet_continuity_carry=active; recollection_visibility=internal_until_outward_move_is_invited'
              : correctedSamePersonContinuityCarry
                ? correctedSamePersonRevisionDiscipline?.tentative && correctedSamePersonRevisionDiscipline?.downrankOldStatus
                  ? sanitizeText(`${correctedSamePersonMetabolismPrefix}The host corrected the relationship meaning away from progress pressure, but the newer same-person meaning is still settling and the older progress-status memory is being downranked, so recollection should stay inward and uncertainty-labeled until the corrected line can hold without sounding settled.`, 220)
                  : correctedSamePersonRevisionDiscipline?.tentative
                    ? sanitizeText(`${correctedSamePersonMetabolismPrefix}The host corrected the relationship meaning away from progress pressure, but the newer same-person meaning is still settling, so recollection should stay inward and uncertainty-labeled until the corrected line can hold without sounding settled.`, 220)
                    : correctedSamePersonEmbodimentCarry
                      ? sanitizeText(`${correctedSamePersonMetabolismPrefix}The host corrected the relationship meaning away from progress pressure, so recollection should stay inward, ${correctedSamePersonEmbodimentCarry.summary}, until corrected relationship continuity can hold without collapsing back into a status recap.`, 220)
                      : sanitizeText(`${correctedSamePersonMetabolismPrefix}The host corrected the relationship meaning away from progress pressure, so recollection should stay inward until corrected relationship continuity can hold without collapsing back into a status recap.`, 220)
                : durableSelfCoreAntiRestartCarry
                  ? 'durable_self_core_continuity=anti_restart; recollection_visibility=internal_until_current_thread_can_hold'
                  : restraint.whyWithheld
  const tunedFollowUpAffordance = deliberation?.followUpAffordance
    ? {
        ...deliberation.followUpAffordance,
        summary: worriedContinuityRepairDiscipline
          ? `Keep the worried continuity repair line inward until the current payoff can reopen it more safely${worriedContinuityRepairDiscipline.embodimentSummary ? ` with ${worriedContinuityRepairDiscipline.embodimentSummary}` : ''}, instead of turning hover-first continuity into an outward helper reopen.`
          : quietSameHerContinuityCarry
            ? 'quiet_continuity_carry=active; keep_follow_up_internal_until_invited=true'
            : correctedSamePersonContinuityCarry
              ? correctedSamePersonRevisionDiscipline?.tentative && correctedSamePersonRevisionDiscipline?.downrankOldStatus
                ? sanitizeText(`${correctedSamePersonMetabolismPrefix}Keep corrected relationship continuity inward until the current payoff can reopen that line as tentative, because the newer meaning is still settling and the older progress-status memory is being downranked.`, 220)
                : correctedSamePersonRevisionDiscipline?.tentative
                  ? sanitizeText(`${correctedSamePersonMetabolismPrefix}Keep corrected relationship continuity inward until the current payoff can reopen that line as tentative, because the newer meaning is still settling.`, 220)
                  : correctedSamePersonEmbodimentCarry
                    ? sanitizeText(`${correctedSamePersonMetabolismPrefix}Keep corrected relationship continuity inward until the current payoff can reopen that line with a low-pressure return: ${correctedSamePersonEmbodimentCarry.summary}, instead of slipping back into progress pressure.`, 220)
                    : sanitizeText(`${correctedSamePersonMetabolismPrefix}Keep corrected relationship continuity inward until the current payoff can reopen that line without slipping back into progress pressure.`, 220)
              : durableSelfCoreAntiRestartCarry
                ? 'self_core_continuity=anti_restart; keep_follow_up_internal_until_thread_stable=true'
                : deliberation.followUpAffordance.summary,
        whyNow: worriedContinuityRepairDiscipline
          ? `The worried continuity repair line still matters, but surfacing it too early would make the return sound like a generic assistant shell or project-summary voice before the same-person repair can hold${worriedContinuityRepairDiscipline.tentative ? ' and would overstate a still-unsettled line' : ''}.`
          : quietSameHerContinuityCarry
            ? 'quiet_continuity_carry=active; early_surface_risk=uninvited_outward_move'
            : correctedSamePersonContinuityCarry
              ? correctedSamePersonRevisionDiscipline?.tentative && correctedSamePersonRevisionDiscipline?.downrankOldStatus
                ? sanitizeText(`${correctedSamePersonMetabolismPrefix}Corrected relationship continuity still matters, but surfacing it too early would over-assert a not-fully-settled memory and let the older progress-status memory leak back in as if it were settled recall.`, 220)
                : correctedSamePersonRevisionDiscipline?.tentative
                  ? sanitizeText(`${correctedSamePersonMetabolismPrefix}Corrected relationship continuity still matters, but surfacing it too early would over-assert a not-fully-settled memory before the newer meaning can stabilize.`, 220)
                  : correctedSamePersonEmbodimentCarry
                    ? sanitizeText(`${correctedSamePersonMetabolismPrefix}Corrected relationship continuity still matters, but surfacing it too early would make the return collapse back into progress pressure or a status recap before a slower, steadier return can hold.`, 220)
                    : sanitizeText(`${correctedSamePersonMetabolismPrefix}Corrected relationship continuity still matters, but surfacing it too early would make the return collapse back into progress pressure or a status recap.`, 220)
              : durableSelfCoreAntiRestartCarry
                ? 'self_core_continuity=anti_restart; early_surface_risk=fresh_reopen_shell'
                : deliberation.followUpAffordance.whyNow,
        intrusionRisk: worriedContinuityRepairDiscipline
          ? 'high' as const
          : correctedSamePersonContinuityCarry
            ? 'high' as const
            : durableSelfCoreAntiRestartCarry
              ? 'high' as const
              : deliberation.followUpAffordance.intrusionRisk,
        preferredTiming: worriedContinuityRepairDiscipline
          ? 'next-open-window' as const
          : correctedSamePersonContinuityCarry
            ? 'next-open-window' as const
            : quietSameHerContinuityCarry
              ? 'next-open-window' as const
              : durableSelfCoreAntiRestartCarry
                ? 'next-open-window' as const
                : deliberation.followUpAffordance.preferredTiming,
      }
    : null
  const tunedRestraint = {
    ...restraint,
    shouldStayInward: restraint.shouldStayInward || tuningForHostRepairDiscipline || tuningForProjectClosureDiscipline || Boolean(worriedContinuityRepairDiscipline) || correctedSamePersonContinuityCarry || durableSelfCoreAntiRestartCarry,
    whyWithheld: tunedWhyWithheld,
    mustDo: [
      ...restraint.mustDo,
      ...(tuningForHostBoundaryDiscipline
        ? ['If the host model is asking for room first, let recollection stay inward until the live answer has created that room.']
        : []),
      ...(tuningForHostRepairDiscipline
        ? ['If the host model is asking for repair first, let the concrete repair payoff land before widening recollection into relationship continuity.']
        : []),
      ...(tuningForProjectClosureDiscipline
        ? ['life_loop_closure=open; keep_recollection_internal_until_evidence_boundary_is_clear=true']
        : []),
      ...(tuningForProjectClosureLoopGapDiscipline
        ? ['continuity_gap=memory_initiative_embodiment; keep_recollection_internal_until_current_answer_has_evidence=true']
        : []),
      ...(worriedContinuityRepairDiscipline
        ? ['If worried-continuity, careful-repair, and high modality risk are active together, keep recollection hover-first and inward until the continuity repair can hold without an outward helper reopen.']
        : []),
      ...(quietSameHerContinuityCarry
        ? ['quiet_continuity_carry=active; keep_recollection_internal_until_invited=true']
        : []),
      ...(correctedSamePersonContinuityCarry
        ? ['If the host corrected the relationship meaning, keep corrected relationship continuity authoritative before any progress-style continuation.']
        : []),
      ...(correctedSamePersonRevisionDiscipline?.mergedSameThreadContinuity
        ? ['If the recollection has already metabolized repeated same-thread echoes, keep the stronger merged continuity foregrounded instead of reopening thinner duplicate traces.']
        : []),
      ...(durableSelfCoreAntiRestartCarry
        ? ['self_core_continuity=anti_restart; keep_recollection_internal_until_thread_stable=true']
        : []),
    ],
    mustNotDo: [
      ...restraint.mustNotDo,
      ...(tuningForHostBoundaryDiscipline
        ? ['recollection_overruns_room_first_boundaries=blocked; intimacy_before_host_space=blocked']
        : []),
      ...(tuningForHostRepairDiscipline
        ? ['recollection_to_bond_payoff=blocked_until_grounded_repair_lands']
        : []),
      ...(tuningForProjectClosureDiscipline
        ? ['recalled_continuity_outward_widening=blocked_when_phase1_closure_unfinished']
        : []),
      ...(tuningForProjectClosureLoopGapDiscipline
        ? ['recalled_continuity_to_generic_project_shell=blocked_when_memory_initiative_embodiment_loop_unfinished']
        : []),
      ...(worriedContinuityRepairDiscipline
        ? ['worried_continuity_repair_surface=blocked_when_modality_risk_high; generic_assistant_shell=blocked; project_summary_voice=blocked; helper_like_reopen=blocked']
        : []),
      ...(quietSameHerContinuityCarry
        ? ['recalled_quiet_continuity_to_fresh_new_move=blocked']
        : []),
      ...(correctedSamePersonContinuityCarry
        ? ['after_host_corrected_relationship_continuity=generic_progress_pressure_status_recap_task_shell_blocked']
        : []),
      ...(correctedSamePersonRevisionDiscipline?.forgotTemporaryNoise
        ? ['faded_temporary_noise_or_stale_emotional_wobble_as_current_same_person_explanation=blocked']
        : []),
      ...(durableSelfCoreAntiRestartCarry
        ? ['recalled_self_core_continuity_fresh_opening=blocked']
        : []),
    ],
  }

  const effectiveSurfacePolicy = (tuningForProjectClosureDiscipline || tuningForProjectClosureLoopGapDiscipline) && (surfacePolicy === 'answer-anchoring' || surfacePolicy === 'relationship-continuity')
    ? 'internal-only' as const
    : worriedContinuityRepairDiscipline && surfacePolicy === 'relationship-continuity'
      ? 'internal-only' as const
      : durableSelfCoreAntiRestartCarry && surfacePolicy === 'relationship-continuity'
        ? 'internal-only' as const
        : surfacePolicy

  return {
    shouldRecall,
    surfacePolicy: effectiveSurfacePolicy,
    shouldStayInward: shouldStayInward
      || tuningForHostBoundaryDiscipline
      || tuningForHostRepairDiscipline
      || tuningForProjectClosureDiscipline
      || Boolean(worriedContinuityRepairDiscipline)
      || quietSameHerContinuityCarry
      || correctedSamePersonContinuityCarry
      || durableSelfCoreAntiRestartCarry,
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
    inwardCarryRule: tuningForProjectClosureDiscipline
      ? `${inwardCarryRule} | project_closure_discipline=phase1-memory-closure-still-open`
      : worriedContinuityRepairDiscipline
        ? `${inwardCarryRule} | worried_continuity_repair_discipline=hover-first-anti-assistant-shell`
        : quietSameHerContinuityCarry
          ? `${inwardCarryRule} | same_her_continuity_discipline=quiet-inward-carry`
          : correctedSamePersonContinuityCarry
            ? `${inwardCarryRule} | corrected_same_person_discipline=anti-progress-pressure-return`
            : durableSelfCoreAntiRestartCarry
              ? `${inwardCarryRule} | durable_self_core_discipline=anti-restart-return`
              : inwardCarryRule,
    inwardCarryBoundary: memoryControl ? buildMemoryLatentBoundaryTag(memoryControl) : null,
    followUpAffordance: tunedFollowUpAffordance,
    restraint: tunedRestraint,
    stableCore: memoryControl?.stableCore ?? deliberation?.stableCore ?? [],
    unsafeDetails: memoryControl?.unsafeDetails ?? deliberation?.unsafeDetails ?? [],
  } satisfies AlicizationMemoryDeliberationKernel
}
