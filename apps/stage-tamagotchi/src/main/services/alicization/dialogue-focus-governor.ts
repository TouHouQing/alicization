import type {
  AlicizationDialogueAnswerSubject,
  AlicizationDialogueScreenReferenceMode,
  AlicizationVisualSceneSnapshot,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDialogueObligation } from './dialogue-obligation'
import type { AlicizationDialogueTurnOwnership } from './dialogue-turn-ownership'
import type { AlicizationDialogueTurnSemantics } from './dialogue-turn-semantics'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'

import { isDialogueFirstSubject } from './dialogue-surface-text'

export type { AlicizationDialogueScreenReferenceMode }

export interface AlicizationDialogueFocusGovernance {
  subject: AlicizationDialogueAnswerSubject
  screenReferenceMode: AlicizationDialogueScreenReferenceMode
  shouldBypassScreenRepair: boolean
  weakLiveScene: boolean
  focusSummary: string
  confidence: number
  reasonTags: string[]
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function normalizeSurfaceText(raw: unknown) {
  return sanitizeText(raw, 160).toLowerCase()
}

function looksLikeProjectStateContinuityQuestion(text: unknown) {
  const normalized = normalizeSurfaceText(text)
  if (!normalized)
    return false

  const asksProjectIdentity = normalized.includes('这个项目')
    || normalized.includes('what this project is')
    || normalized.includes('project is')
    || normalized.includes('project-state')
  const asksProgressOrOpenClosure = normalized.includes('做到什么程度')
    || normalized.includes('还差什么')
    || normalized.includes('没闭环')
    || normalized.includes('what has landed')
    || normalized.includes('what still remains open')
    || normalized.includes('remains open')
    || normalized.includes('has landed')
    || normalized.includes('what still remains open')
    || normalized.includes('closure')

  return asksProjectIdentity && asksProgressOrOpenClosure
}

// NOTICE: These generic surface markers are not user-language intent rules.
// They only down-rank OS/window shells that repeatedly showed up in runtime
// evidence as stale anchor residue instead of meaningful scene content.
const weakSurfaceMarkers = [
  'entire screen',
  'screen 1',
  'screen 2',
  'desktop',
  'finder',
  'unknown',
  'chat overlay',
  'alicization',
  'codex',
] as const

function hasWeakSurfaceMarker(raw: unknown) {
  const normalized = normalizeSurfaceText(raw)
  if (!normalized)
    return false
  return weakSurfaceMarkers.some(marker => normalized.includes(marker))
}

function isWeakLiveScene(input: {
  currentScene: AlicizationVisualSceneSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
}) {
  const scene = input.currentScene
  const activeThread = input.worldModel?.activeThread ?? null
  const genericSurface = hasWeakSurfaceMarker(scene?.summary)
    || hasWeakSurfaceMarker(scene?.target?.title)
    || hasWeakSurfaceMarker(scene?.target?.appName)
    || hasWeakSurfaceMarker(scene?.target?.processName)
  const unknownScene = !scene
    || (
      scene.workloadKind === 'unknown'
      && scene.contentKind === 'unknown'
      && !activeThread
    )
  const weakThread = !activeThread
    || activeThread.kind === 'unknown'
    || hasWeakSurfaceMarker(activeThread.title)

  return genericSurface || (unknownScene && weakThread)
}

function uniqueLabels(values: Array<string | null | undefined>) {
  return [...new Set(values.map(value => sanitizeText(value, 64).toLowerCase()).filter(Boolean))]
}

export function buildDialogueFocusGovernance(input: {
  semantics: AlicizationDialogueTurnSemantics
  obligation?: AlicizationDialogueObligation | null
  ownership?: AlicizationDialogueTurnOwnership | null
  currentScene: AlicizationVisualSceneSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
}) {
  const runtimeSurface = input.runtimeSurface ?? null
  const currentScene = runtimeSurface?.perception.currentScene ?? input.currentScene
  const worldModel = runtimeSurface?.world.worldModel ?? input.worldModel ?? null
  const inspectionOwnedTurn = input.semantics.reasonTags.includes('inspection-owned-turn')
    || input.semantics.reasonTags.includes('inspection-requested-turn')
  const sceneBoundTurn = input.semantics.reasonTags.includes('scene-bound-turn')
  const detachedTurn = input.semantics.reasonTags.includes('scene-detached-turn')
  const complaintTurn = input.semantics.reasonTags.includes('direct-complaint')
    || input.semantics.reasonTags.includes('intelligence-critique')
    || input.semantics.reasonTags.includes('frustration-expression')
  const weakLiveScene = isWeakLiveScene({
    currentScene,
    worldModel,
  })
  const preferredSubject = input.semantics.subjectPreference ?? null
  const projectStateContinuityQuestion = looksLikeProjectStateContinuityQuestion(input.semantics.summary)
    || looksLikeProjectStateContinuityQuestion(input.obligation?.summary)
  const shouldPreferProjectStateSelfContinuity
    = projectStateContinuityQuestion
      && (
        preferredSubject === 'alicization-self'
        || preferredSubject === 'general'
        || input.semantics.reasonTags.includes('dialogue-first-turn')
        || input.semantics.reasonTags.includes('scene-detached-turn')
      )

  let subject: AlicizationDialogueAnswerSubject = input.ownership?.subject ?? 'general'
  if (input.ownership) {
    subject = input.ownership.subject
  }
  else if (shouldPreferProjectStateSelfContinuity) {
    subject = 'alicization-self'
  }
  else if (inspectionOwnedTurn) {
    subject = worldModel?.activeThread ? 'task-knot' : 'visible-scene'
  }
  else if ((input.semantics.act === 'challenge' || complaintTurn) && preferredSubject !== 'visible-scene' && preferredSubject !== 'task-knot') {
    subject = 'alicization-self'
  }
  else if (preferredSubject) {
    subject = preferredSubject
  }
  else if (
    input.obligation?.kind === 'repair'
    || input.semantics.act === 'correct'
    || (input.semantics.act === 'challenge' && sceneBoundTurn)
  ) {
    subject = 'visible-scene'
  }
  else if (detachedTurn) {
    subject = 'alicization-self'
  }
  else if (
    input.obligation?.kind === 'guide'
    || input.obligation?.kind === 'teach'
    || input.semantics.responseNeed === 'guide'
    || input.semantics.responseNeed === 'teach'
  ) {
    subject = 'task-knot'
  }
  else if (input.semantics.act === 'verify-grounding') {
    subject = sceneBoundTurn && worldModel?.activeThread
      ? 'task-knot'
      : 'visible-scene'
  }
  else if (input.obligation?.kind === 'care' || input.semantics.act === 'seek-care' || input.semantics.act === 'share-state') {
    subject = 'host-state'
  }
  else if (input.obligation?.kind === 'accompany' || input.semantics.act === 'social-bid') {
    subject = 'relationship'
  }
  else if (sceneBoundTurn) {
    subject = worldModel?.activeThread ? 'task-knot' : 'visible-scene'
  }

  let screenReferenceMode: AlicizationDialogueScreenReferenceMode = input.ownership?.screenReferenceMode ?? 'incidental'
  if (input.ownership) {
    screenReferenceMode = input.ownership.screenReferenceMode
  }
  else if (subject === 'visible-scene') {
    screenReferenceMode = 'required'
  }
  else if (subject === 'task-knot') {
    screenReferenceMode = inspectionOwnedTurn
      ? 'helpful'
      : weakLiveScene
        ? 'incidental'
        : 'helpful'
  }
  else if (subject === 'host-state') {
    screenReferenceMode = sceneBoundTurn && !weakLiveScene ? 'incidental' : 'avoid'
  }
  else if (subject === 'relationship' || subject === 'alicization-self') {
    screenReferenceMode = 'avoid'
  }
  else if (weakLiveScene) {
    screenReferenceMode = 'avoid'
  }

  const shouldBypassScreenRepair
    = inspectionOwnedTurn
      ? false
      : screenReferenceMode === 'avoid'
        || (weakLiveScene && !isDialogueFirstSubject(subject) && subject !== 'visible-scene')

  const focusSummary = sanitizeText(
    (isDialogueFirstSubject(subject)
      ? input.semantics.summary
      : '')
    || input.obligation?.summary
    || input.semantics.summary
    || (!isDialogueFirstSubject(subject)
      ? input.semantics.taskAnchor
      : '')
    || (!isDialogueFirstSubject(subject)
      ? worldModel?.activeThread?.summary
      : '')
    || (!isDialogueFirstSubject(subject)
      ? currentScene?.summary
      : '')
    || 'Stay with the actual subject of this turn.',
    180,
  ) || 'Stay with the actual subject of this turn.'

  return {
    subject,
    screenReferenceMode,
    shouldBypassScreenRepair,
    weakLiveScene,
    focusSummary,
    confidence: clamp01(
      input.semantics.confidence * 0.72
      + (input.obligation?.confidence ?? 0.42) * 0.28,
    ),
    reasonTags: uniqueLabels([
      `subject:${subject}`,
      `screen:${screenReferenceMode}`,
      input.ownership ? 'ownership-ssot' : '',
      shouldPreferProjectStateSelfContinuity ? 'project-state-continuity' : '',
      sceneBoundTurn ? 'scene-bound' : '',
      detachedTurn ? 'scene-detached' : '',
      inspectionOwnedTurn ? 'inspection-owned-turn' : '',
      weakLiveScene ? 'weak-live-scene' : '',
      shouldBypassScreenRepair ? 'bypass-screen-repair' : '',
    ]),
  } satisfies AlicizationDialogueFocusGovernance
}

export function buildDialogueFocusGovernanceSystemBlock(governance: AlicizationDialogueFocusGovernance) {
  return [
    '[ALICIZATION_DIALOGUE_FOCUS]',
    'This block decides what the current turn is fundamentally about before screen truth, memory continuity, or persona styling can weigh in.',
    `Answer subject: ${governance.subject}.`,
    `Screen reference mode: ${governance.screenReferenceMode}.`,
    `Weak live scene: ${governance.weakLiveScene ? 'yes' : 'no'}.`,
    `Bypass screen repair drift: ${governance.shouldBypassScreenRepair ? 'yes' : 'no'}.`,
    `Focus summary: ${governance.focusSummary}.`,
    'If screen reference mode is avoid, do not drag live-scene repair, grounding talk, or stale screen residue into the opening answer.',
    'If the live scene is weak and generic, it cannot outrank the true subject of the turn on its own.',
  ].join('\n')
}
