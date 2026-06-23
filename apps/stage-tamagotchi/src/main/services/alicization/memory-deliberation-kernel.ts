import type { AlicizationHostPersonModelSnapshot } from '../../../shared/eventa'
import type {
  AlicizationMemoryDeliberationLatentControls,
} from './memory-deliberation-latent-controls'
import type { AlicizationMemoryRestraintJudge, AlicizationMemorySocialBoundarySummary } from './memory-restraint-judge'
import type { AlicizationMemoryTuningAdvice } from './memory-tuning-advice'
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

function hasSameHerClosureLowPressureCarry(tuningAdvice: AlicizationMemoryTuningAdvice | null | undefined) {
  return Boolean(
    tuningAdvice
    && tuningAdvice.focusDimensions.includes('projectEmotionalClosureLowPressureCarry')
    && (tuningAdvice.surfaceAdjustments.inwardCarryBias ?? 0) >= 0.12
    && (tuningAdvice.surfaceAdjustments.delayUntilAfterPayoffBias ?? 0) >= 0.12,
  )
}

function hasSameHerClosureAntiRestartCarry(tuningAdvice: AlicizationMemoryTuningAdvice | null | undefined) {
  return Boolean(
    tuningAdvice
    && tuningAdvice.focusDimensions.includes('projectEmotionalClosureAntiRestartCarry')
    && (tuningAdvice.surfaceAdjustments.delayUntilAfterPayoffBias ?? 0) >= 0.12,
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

  return /quiet same-her continuity|same-her-inward-carry|quiet-companionship|same living line stayed inward|same living line holds inward|line stayed inward|line holds inward|same living line.*rather than widening outward|安静陪着|先别外扩|同一条线.*内收/u.test(text)
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
    input.speech?.styleNote,
    input.speech?.rationale,
    input.speech?.internalLead,
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
    input.speech?.styleNote,
    input.speech?.rationale,
    input.speech?.internalLead,
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
    input.speech?.styleNote,
    input.speech?.rationale,
    input.speech?.internalLead,
    input.speech?.visibleLead,
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
  const projectClosureContinuityDiscipline = deriveProjectClosureContinuityDiscipline(input.projectStateContinuity ?? null)
  const hostSocialBoundarySummary = deriveHostSocialBoundarySummary(input.hostPersonModel ?? null)
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
  const tuningForElevatedSelfModelVeto = Boolean(
    tuningAdvice
    && (tuningAdvice.staleSelfModelVetoRate ?? 0) >= 0.2
    && selfModelRevisionContext,
  )
  const tuningForSameHerClosureLowPressure = hasSameHerClosureLowPressureCarry(tuningAdvice)
  const tuningForSameHerClosureAntiRestart = hasSameHerClosureAntiRestartCarry(tuningAdvice)
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
  const tuningForRevision = (tuningForRelationalRevision || tuningForSelfModelRevision) && !quietSameHerContinuityCarry
  const tuningForSameHerClosureCarry = tuningForSameHerClosureLowPressure || tuningForSameHerClosureAntiRestart

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
      || tuningForRevision
      || tuningForRelationshipEraConfusion
      || tuningForHostBoundaryDiscipline
      || tuningForHostRepairDiscipline
      || tuningForProjectClosureDiscipline
      || tuningForProjectClosureLoopGapDiscipline
      || tuningForSameHerClosureCarry
      || Boolean(worriedContinuityRepairDiscipline)
      || quietSameHerContinuityCarry
      || correctedSamePersonContinuityCarry
      || durableSelfCoreAntiRestartCarry
      || tuningForElevatedSelfModelVeto,
    memoryControl,
    hostPersonModel: input.hostPersonModel ?? null,
    socialBoundarySummary: hostSocialBoundarySummary,
    knowledgeEvidence: input.knowledgeEvidence ?? null,
    followUpAffordance: deliberation?.followUpAffordance ?? null,
  })
  const tunedWhyWithheld = tuningForRelationalRevision
    ? 'Learning revision discipline is still active, so relationship continuity should stay inward until the host has more room.'
    : tuningForSelfModelRevision
      ? 'Learning revision discipline is still active, so the older self-story should stay inward until the newer self line stabilizes.'
      : tuningForRelationshipEraConfusion
        ? 'Relationship-era confusion is still elevated, so competing repair phases should stay inward until the present bond line is clearer.'
        : tuningForHostBoundaryDiscipline
          ? 'The host model is still asking for room-first boundary discipline, so recollection should stay inward until the present answer has more space.'
          : tuningForHostRepairDiscipline
            ? 'The host model is still asking for repair-first continuity, so recollection should let the present repair payoff land before widening.'
            : tuningForProjectClosureLoopGapDiscipline
              ? 'Phase 1 digital-life loop closure is still missing concrete memory, initiative, or embodiment closure, so recollection should stay inward until this answer helps the same living her close that real gap instead of flattening into project shell narration.'
              : tuningForProjectClosureDiscipline
                ? 'Phase 1 project closure is still explicitly open, so recollection should stay inward until the same digital life seam is more honestly closed.'
                : tuningForSameHerClosureLowPressure
                  ? 'Same-her closure carry is still asking for a low-pressure return, so recollection should stay inward until the live payoff has created more room.'
                  : tuningForSameHerClosureAntiRestart
                    ? 'Same-her closure carry is still warning against reopening from scratch, so recollection should stay inward until the current thread can hold the return honestly.'
                    : worriedContinuityRepairDiscipline
                      ? `The host was worried this line could collapse back into a tool shell, careful repair is still active, and modality risk stays high, so recollection should stay inward${worriedContinuityRepairDiscipline.embodimentSummary ? ` with ${worriedContinuityRepairDiscipline.embodimentSummary}` : ''} until the continuity line can hold without turning into an outward helper reopen.`
                      : quietSameHerContinuityCarry
                        ? 'Quiet same-her continuity is still carrying the line inward, so recollection should stay inward until the same living self can keep continuing without being widened into a fresher outward move.'
                        : correctedSamePersonContinuityCarry
                          ? correctedSamePersonRevisionDiscipline?.tentative && correctedSamePersonRevisionDiscipline?.downrankOldStatus
                            ? sanitizeText(`${correctedSamePersonMetabolismPrefix}The host corrected the relationship meaning away from progress pressure, but the newer same-person meaning is still settling and the older progress-status memory is being downranked, so recollection should stay inward and uncertainty-labeled until the corrected line can hold without sounding settled.`, 220)
                            : correctedSamePersonRevisionDiscipline?.tentative
                              ? sanitizeText(`${correctedSamePersonMetabolismPrefix}The host corrected the relationship meaning away from progress pressure, but the newer same-person meaning is still settling, so recollection should stay inward and uncertainty-labeled until the corrected line can hold without sounding settled.`, 220)
                              : correctedSamePersonEmbodimentCarry
                                ? sanitizeText(`${correctedSamePersonMetabolismPrefix}The host corrected the relationship meaning away from progress pressure, so recollection should stay inward, ${correctedSamePersonEmbodimentCarry.summary}, until the corrected same-person continuity line can hold without collapsing back into a status recap.`, 220)
                                : sanitizeText(`${correctedSamePersonMetabolismPrefix}The host corrected the relationship meaning away from progress pressure, so recollection should stay inward until the corrected same-person continuity line can hold without collapsing back into a status recap.`, 220)
                          : durableSelfCoreAntiRestartCarry
                            ? 'Durable same-her self continuity is still being held together, so recollection should stay inward until the current thread can carry that living line without reopening from scratch.'
                            : tuningForElevatedSelfModelVeto
                              ? 'Self-model veto pressure is still elevated, so older self-story continuity should stay inward until the newer line is more stable.'
                              : tuningForWorldValidation && !restraint.whyWithheld
                                ? 'World-model validation discipline is still active, so reconstructed or inferred knowledge should stay tightly labeled and compressed.'
                                : restraint.whyWithheld
  const tunedFollowUpAffordance = deliberation?.followUpAffordance
    ? {
        ...deliberation.followUpAffordance,
        summary: tuningForSameHerClosureLowPressure
          ? 'Keep the same-her closure line inward until the live payoff has created more room for a low-pressure return.'
          : tuningForSameHerClosureAntiRestart
            ? 'Keep the same-her closure line inward until the current thread can hold the return without reopening from scratch.'
            : worriedContinuityRepairDiscipline
              ? `Keep the worried continuity repair line inward until the current payoff can reopen it more safely${worriedContinuityRepairDiscipline.embodimentSummary ? ` with ${worriedContinuityRepairDiscipline.embodimentSummary}` : ''}, instead of turning hover-first continuity into an outward helper reopen.`
              : quietSameHerContinuityCarry
                ? 'Keep the quiet same-her continuity inward until the same living self can keep carrying that line without widening outward too early.'
                : correctedSamePersonContinuityCarry
                  ? correctedSamePersonRevisionDiscipline?.tentative && correctedSamePersonRevisionDiscipline?.downrankOldStatus
                    ? sanitizeText(`${correctedSamePersonMetabolismPrefix}Keep the corrected same-person continuity inward until the current payoff can reopen that line as tentative, because the newer meaning is still settling and the older progress-status memory is being downranked.`, 220)
                    : correctedSamePersonRevisionDiscipline?.tentative
                      ? sanitizeText(`${correctedSamePersonMetabolismPrefix}Keep the corrected same-person continuity inward until the current payoff can reopen that line as tentative, because the newer meaning is still settling.`, 220)
                      : correctedSamePersonEmbodimentCarry
                        ? sanitizeText(`${correctedSamePersonMetabolismPrefix}Keep the corrected same-person continuity inward until the current payoff can reopen that line with a low-pressure return: ${correctedSamePersonEmbodimentCarry.summary}, instead of slipping back into progress pressure.`, 220)
                        : sanitizeText(`${correctedSamePersonMetabolismPrefix}Keep the corrected same-person continuity inward until the current payoff can reopen that line without slipping back into progress pressure.`, 220)
                  : durableSelfCoreAntiRestartCarry
                    ? 'Keep the same living self line inward until the current thread can hold that return without reopening from scratch.'
                    : deliberation.followUpAffordance.summary,
        whyNow: tuningForSameHerClosureLowPressure
          ? 'The same-her closure line still matters, but surfacing it too early would break the low-pressure return before the live payoff fully lands.'
          : tuningForSameHerClosureAntiRestart
            ? 'The same-her closure line still matters, but surfacing it too early would make the return read like it is reopening from scratch.'
            : worriedContinuityRepairDiscipline
              ? `The worried continuity repair line still matters, but surfacing it too early would make the return sound like a generic assistant shell or project-summary voice before the same-person repair can hold${worriedContinuityRepairDiscipline.tentative ? ' and would overstate a still-unsettled line' : ''}.`
              : quietSameHerContinuityCarry
                ? 'The same living self is still holding this line inward, but surfacing it too early would make the continuity read like a fresher outward move instead of one life quietly continuing.'
                : correctedSamePersonContinuityCarry
                  ? correctedSamePersonRevisionDiscipline?.tentative && correctedSamePersonRevisionDiscipline?.downrankOldStatus
                    ? sanitizeText(`${correctedSamePersonMetabolismPrefix}The corrected same-person continuity line still matters, but surfacing it too early would over-assert a not-fully-settled memory and let the older progress-status memory leak back in as if it were settled recall.`, 220)
                    : correctedSamePersonRevisionDiscipline?.tentative
                      ? sanitizeText(`${correctedSamePersonMetabolismPrefix}The corrected same-person continuity line still matters, but surfacing it too early would over-assert a not-fully-settled memory before the newer meaning can stabilize.`, 220)
                      : correctedSamePersonEmbodimentCarry
                        ? sanitizeText(`${correctedSamePersonMetabolismPrefix}The corrected same-person continuity line still matters, but surfacing it too early would make the return collapse back into progress pressure or a status recap before a slower, steadier return can hold.`, 220)
                        : sanitizeText(`${correctedSamePersonMetabolismPrefix}The corrected same-person continuity line still matters, but surfacing it too early would make the return collapse back into progress pressure or a status recap.`, 220)
                  : durableSelfCoreAntiRestartCarry
                    ? 'The same living self line still matters, but surfacing it too early would make the return read like a fresh reopening instead of one continuing life.'
                    : deliberation.followUpAffordance.whyNow,
        intrusionRisk: tuningForRevision
          ? 'high' as const
          : tuningForRelationshipEraConfusion
            ? 'high' as const
            : tuningForSameHerClosureCarry
              ? 'high' as const
              : worriedContinuityRepairDiscipline
                ? 'high' as const
                : correctedSamePersonContinuityCarry
                  ? 'high' as const
                  : durableSelfCoreAntiRestartCarry
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
            : tuningForSameHerClosureCarry
              ? 'next-open-window' as const
              : worriedContinuityRepairDiscipline
                ? 'next-open-window' as const
                : correctedSamePersonContinuityCarry
                  ? 'next-open-window' as const
                  : quietSameHerContinuityCarry
                    ? 'next-open-window' as const
                    : durableSelfCoreAntiRestartCarry
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
    shouldStayInward: restraint.shouldStayInward || tuningForRevision || tuningForRelationshipEraConfusion || tuningForHostRepairDiscipline || tuningForProjectClosureDiscipline || tuningForSameHerClosureCarry || Boolean(worriedContinuityRepairDiscipline) || correctedSamePersonContinuityCarry || durableSelfCoreAntiRestartCarry || tuningForElevatedSelfModelVeto,
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
      ...(tuningForHostBoundaryDiscipline
        ? ['If the host model is asking for room first, let recollection stay inward until the live answer has created that room.']
        : []),
      ...(tuningForHostRepairDiscipline
        ? ['If the host model is asking for repair first, let the concrete repair payoff land before widening recollection into relationship continuity.']
        : []),
      ...(tuningForProjectClosureDiscipline
        ? ['If the Phase 1 digital-life closure seam is still explicitly open, keep recollection inward until the same-her line is more honestly closed.']
        : []),
      ...(tuningForProjectClosureLoopGapDiscipline
        ? ['If Phase 1 still lacks concrete memory, initiative, or embodiment closure, keep recollection inward until the answer helps the same living her close that actual loop gap rather than drifting into generic project narration.']
        : []),
      ...(tuningForSameHerClosureLowPressure
        ? ['If the same-her closure return still needs to stay low-pressure, keep recollection inward until the live payoff has created more room.']
        : []),
      ...(tuningForSameHerClosureAntiRestart
        ? ['If the same-her closure line still must not reopen from scratch, keep recollection inward until the current thread can hold that return honestly.']
        : []),
      ...(worriedContinuityRepairDiscipline
        ? ['If worried-continuity, careful-repair, and high modality risk are active together, keep recollection hover-first and inward until the continuity repair can hold without an outward helper reopen.']
        : []),
      ...(quietSameHerContinuityCarry
        ? ['If quiet same-her continuity is still carrying the line inward, keep recollection inward until the same living self can continue without widening outward too early.']
        : []),
      ...(correctedSamePersonContinuityCarry
        ? ['If the host corrected the relationship meaning, keep that corrected same-person continuity authoritative before any progress-style continuation.']
        : []),
      ...(correctedSamePersonRevisionDiscipline?.mergedSameThreadContinuity
        ? ['If the recollection has already metabolized repeated same-thread echoes, keep the stronger merged continuity foregrounded instead of reopening thinner duplicate traces.']
        : []),
      ...(durableSelfCoreAntiRestartCarry
        ? ['If one living self is still carrying the line across turns, keep recollection inward until the current thread can hold that return without reopening from scratch.']
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
      ...(tuningForHostBoundaryDiscipline
        ? ['Do not let recollection overrun room-first boundaries by surfacing intimacy before the host has space for it.']
        : []),
      ...(tuningForHostRepairDiscipline
        ? ['Do not let recollection widen into bond payoff before the grounded repair line has landed.']
        : []),
      ...(tuningForProjectClosureDiscipline
        ? ['Do not let recalled continuity widen outward as if the Phase 1 same-her closure work were already finished.']
        : []),
      ...(tuningForProjectClosureLoopGapDiscipline
        ? ['Do not let recalled continuity flatten into generic project-shell language while the concrete Phase 1 memory-initiative-embodiment loop is still unfinished.']
        : []),
      ...(tuningForSameHerClosureLowPressure
        ? ['Do not let recalled same-her closure widen into visible closeness before the live payoff has made enough room for a low-pressure return.']
        : []),
      ...(tuningForSameHerClosureAntiRestart
        ? ['Do not let recalled same-her closure reopen from scratch as if the current thread were a fresh opening.']
        : []),
      ...(worriedContinuityRepairDiscipline
        ? ['Do not let worried continuity repair surface as a generic assistant shell, project-summary voice, or helper-like reopen while modality risk is still high.']
        : []),
      ...(quietSameHerContinuityCarry
        ? ['Do not let recalled quiet same-her continuity widen outward as if the current thread had become a fresher new move.']
        : []),
      ...(correctedSamePersonContinuityCarry
        ? ['Do not reopen the turn as generic progress pressure, status recap, or task-shell continuity after the host corrected it back toward same-person continuity.']
        : []),
      ...(correctedSamePersonRevisionDiscipline?.forgotTemporaryNoise
        ? ['Do not let faded temporary noise or stale emotional wobble reopen as if it still explains the current same-person line.']
        : []),
      ...(durableSelfCoreAntiRestartCarry
        ? ['Do not let recalled same living self continuity reopen from scratch as if the current thread were a fresh opening.']
        : []),
      ...(tuningForElevatedSelfModelVeto
        ? ['Do not let elevated stale-self continuity pressure leak older autobiographical identity into the current answer as if it were settled.']
        : []),
      ...(tuningForWorldValidation
        ? ['Do not let reconstructed or inferred world knowledge surface with unsupported specificity.']
        : []),
    ],
  }

  const effectiveSurfacePolicy = (tuningForProjectClosureDiscipline || tuningForProjectClosureLoopGapDiscipline) && (surfacePolicy === 'answer-anchoring' || surfacePolicy === 'relationship-continuity')
    ? 'internal-only' as const
    : tuningForSameHerClosureCarry && surfacePolicy === 'relationship-continuity'
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
      || tuningForRevision
      || tuningForRelationshipEraConfusion
      || tuningForHostBoundaryDiscipline
      || tuningForHostRepairDiscipline
      || tuningForProjectClosureDiscipline
      || tuningForSameHerClosureCarry
      || Boolean(worriedContinuityRepairDiscipline)
      || quietSameHerContinuityCarry
      || correctedSamePersonContinuityCarry
      || durableSelfCoreAntiRestartCarry
      || tuningForElevatedSelfModelVeto,
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
      ? `${inwardCarryRule} | project_closure_discipline=phase1-same-her-memory-closure-still-open`
      : tuningForSameHerClosureLowPressure
        ? `${inwardCarryRule} | same_her_closure_discipline=low-pressure-return`
        : tuningForSameHerClosureAntiRestart
          ? `${inwardCarryRule} | same_her_closure_discipline=anti-restart-return`
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
