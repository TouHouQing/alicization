import type {
  AlicizationDialogueAnswerSubject,
  AlicizationDialogueScreenReferenceMode,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDialogueObligation } from './dialogue-obligation'
import type { AlicizationDialogueTurnSemantics } from './dialogue-turn-semantics'
import type { AlicizationInspectionTurnState } from './inspection-turn-state-machine'

import { isDialogueFirstSubject } from './dialogue-surface-text'

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function uniqueLabels(values: Array<string | null | undefined>, maxItems = 10) {
  return [...new Set(values.map(value => typeof value === 'string' ? value.trim() : '').filter(Boolean))].slice(0, maxItems)
}

function resolveSceneSubject(input: {
  semantics: AlicizationDialogueTurnSemantics
  obligation?: AlicizationDialogueObligation | null
  worldModel?: AlicizationWorldModelSnapshot | null
}) {
  if (input.semantics.subjectPreference === 'task-knot' || input.semantics.subjectPreference === 'visible-scene')
    return input.semantics.subjectPreference

  if (input.obligation?.kind === 'guide' || input.obligation?.kind === 'teach')
    return 'task-knot' as const
  if (input.obligation?.kind === 'repair')
    return 'visible-scene' as const
  if (input.semantics.reasonTags.includes('scene-bound-turn'))
    return input.worldModel?.activeThread ? 'task-knot' as const : 'visible-scene' as const

  return input.worldModel?.activeThread ? 'task-knot' as const : 'visible-scene' as const
}

function resolveDialogueFirstSubject(input: {
  semantics: AlicizationDialogueTurnSemantics
  obligation?: AlicizationDialogueObligation | null
}) {
  const preferred = input.semantics.subjectPreference
  if (preferred && isDialogueFirstSubject(preferred))
    return preferred
  if (input.obligation?.kind === 'care')
    return 'host-state' as const
  if (input.obligation?.kind === 'accompany')
    return 'relationship' as const
  if (input.semantics.act === 'seek-care' || input.semantics.act === 'share-state')
    return 'host-state' as const
  if (input.semantics.act === 'social-bid')
    return 'relationship' as const
  if (input.semantics.reasonTags.includes('scene-detached-turn'))
    return 'alicization-self' as const
  return 'general' as const
}

function continuityModeFromSubject(subject: AlicizationDialogueAnswerSubject) {
  if (subject === 'task-knot')
    return 'task-first' as const
  if (subject === 'visible-scene')
    return 'scene-first' as const
  return 'dialogue-first' as const
}

function isSceneSubject(subject: AlicizationDialogueAnswerSubject): subject is 'task-knot' | 'visible-scene' {
  return subject === 'task-knot' || subject === 'visible-scene'
}

function normalizeScreenReferenceMode(input: {
  subject: AlicizationDialogueAnswerSubject
  screenReferenceModeHint?: AlicizationDialogueScreenReferenceMode | null
  inspectionRequested: boolean
  inspectionState: AlicizationInspectionTurnState
}) {
  const hint = input.screenReferenceModeHint ?? null
  if (input.subject === 'relationship' || input.subject === 'alicization-self')
    return 'avoid' as const
  if (input.subject === 'host-state')
    return hint === 'incidental' ? 'incidental' as const : 'avoid' as const
  if (input.subject === 'visible-scene')
    return 'required' as const
  if (input.subject === 'task-knot') {
    return hint === 'required' ? 'helpful' as const : (hint ?? 'helpful')
  }
  return hint ?? (input.inspectionRequested ? 'incidental' : 'avoid')
}

export interface AlicizationDialogueTurnOwnershipHint {
  subject: AlicizationDialogueAnswerSubject
  screenReferenceMode: AlicizationDialogueScreenReferenceMode
  confidence: number
  reasonTags: string[]
}

export interface AlicizationDialogueTurnOwnership {
  subject: AlicizationDialogueAnswerSubject
  screenReferenceMode: AlicizationDialogueScreenReferenceMode
  continuityMode: 'dialogue-first' | 'task-first' | 'scene-first'
  inspectionRequested: boolean
  inspectionState: AlicizationInspectionTurnState
  releaseInspectionCarry: boolean
  confidence: number
  reasonTags: string[]
}

export function buildDialogueTurnOwnership(input: {
  semantics: AlicizationDialogueTurnSemantics
  obligation?: AlicizationDialogueObligation | null
  worldModel?: AlicizationWorldModelSnapshot | null
  inspectionRequested: boolean
  inspectionState: AlicizationInspectionTurnState
  releaseInspectionCarry?: boolean
  ingressHint?: AlicizationDialogueTurnOwnershipHint | null
}): AlicizationDialogueTurnOwnership {
  const dialogueFirstFromSemantics = Boolean(
    isDialogueFirstSubject(input.semantics.subjectPreference)
    || input.semantics.reasonTags.includes('dialogue-first-turn')
    || input.semantics.reasonTags.includes('scene-detached-turn'),
  )
  const ingressSubject = input.ingressHint?.subject ?? null
  let canApplyIngressSceneSubject = false

  let subject: AlicizationDialogueAnswerSubject = input.inspectionRequested
    ? resolveSceneSubject({
        semantics: input.semantics,
        obligation: input.obligation,
        worldModel: input.worldModel ?? null,
      })
    : resolveDialogueFirstSubject({
        semantics: input.semantics,
        obligation: input.obligation,
      })

  if (input.inspectionRequested && ingressSubject && isSceneSubject(ingressSubject)) {
    canApplyIngressSceneSubject = true
    subject = ingressSubject
  }

  if (input.inspectionRequested && dialogueFirstFromSemantics) {
    subject = resolveDialogueFirstSubject({
      semantics: input.semantics,
      obligation: input.obligation,
    })
  }
  else if (input.inspectionRequested && isDialogueFirstSubject(subject)) {
    subject = resolveSceneSubject({
      semantics: input.semantics,
      obligation: input.obligation,
      worldModel: input.worldModel ?? null,
    })
  }
  else if (!input.inspectionRequested && dialogueFirstFromSemantics) {
    subject = resolveDialogueFirstSubject({
      semantics: input.semantics,
      obligation: input.obligation,
    })
  }

  const normalizedInspectionRequested = input.inspectionRequested && !isDialogueFirstSubject(subject)
  const inspectionState = normalizedInspectionRequested
    ? input.inspectionState === 'dialogue-first'
      ? 'inspection-live'
      : input.inspectionState
    : 'dialogue-first'

  const screenReferenceMode = normalizeScreenReferenceMode({
    subject,
    screenReferenceModeHint: input.ingressHint?.screenReferenceMode ?? null,
    inspectionRequested: normalizedInspectionRequested,
    inspectionState,
  })

  return {
    subject,
    screenReferenceMode,
    continuityMode: continuityModeFromSubject(subject),
    inspectionRequested: normalizedInspectionRequested,
    inspectionState,
    releaseInspectionCarry: input.releaseInspectionCarry === true || !normalizedInspectionRequested,
    confidence: clamp01(
      input.semantics.confidence * 0.58
      + (input.obligation?.confidence ?? 0.34) * 0.18
      + (input.ingressHint?.confidence ?? 0.34) * 0.24,
    ),
    reasonTags: uniqueLabels([
      `subject:${subject}`,
      `screen:${screenReferenceMode}`,
      `inspection-state:${inspectionState}`,
      normalizedInspectionRequested ? 'inspection-requested' : 'inspection-released',
      dialogueFirstFromSemantics ? 'dialogue-first-semantics' : '',
      canApplyIngressSceneSubject ? 'ingress-scene-hint-applied' : '',
      input.ingressHint && !canApplyIngressSceneSubject ? 'ingress-hint-ignored' : '',
      input.inspectionRequested ? 'inspection-requested-input' : '',
      input.releaseInspectionCarry ? 'release-inspection-carry' : '',
      ...((input.ingressHint?.reasonTags ?? []).slice(0, 4)),
    ]),
  } satisfies AlicizationDialogueTurnOwnership
}
