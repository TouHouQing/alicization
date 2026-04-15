import type { AlicizationDialogueAnswerSubject } from '../../../shared/eventa'
import type { AlicizationDialogueScreenReferenceMode } from './dialogue-focus-governor'
import type { AlicizationDialogueTurnSemantics } from './dialogue-turn-semantics'

import { deriveAlicizationInspectionSignalProfile } from '@proj-alicization/stage-shared'

import { isDialogueFirstSubject } from './dialogue-surface-text'

export interface AlicizationDialogueIngressGovernor {
  turnOwner: AlicizationDialogueAnswerSubject
  inspectionEligible: boolean
  releaseInspectionCarry: boolean
  screenReferenceMode: AlicizationDialogueScreenReferenceMode
  confidence: number
  summary: string
  reasonTags: string[]
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function uniqueLabels(values: Array<string | null | undefined>, maxItems = 8) {
  return [...new Set(values.map(value => typeof value === 'string' ? value.trim() : '').filter(Boolean))].slice(0, maxItems)
}

function resolveTurnOwner(semantics: AlicizationDialogueTurnSemantics): AlicizationDialogueAnswerSubject {
  if (semantics.subjectPreference)
    return semantics.subjectPreference
  if (semantics.reasonTags.includes('scene-bound-turn'))
    return semantics.taskAnchor ? 'task-knot' : 'visible-scene'
  return 'general'
}

function resolveDialogueFirst(semantics: AlicizationDialogueTurnSemantics, owner: AlicizationDialogueAnswerSubject) {
  return isDialogueFirstSubject(owner)
    || semantics.reasonTags.includes('dialogue-first-turn')
    || semantics.reasonTags.includes('scene-detached-turn')
    || semantics.reasonTags.includes('answer-realignment')
    || semantics.reasonTags.includes('companionship-bid')
    || semantics.reasonTags.includes('care-request')
    || semantics.reasonTags.includes('terse-social-turn')
    || semantics.reasonTags.includes('chat-goal')
}

function resolveHardDialogueFirst(semantics: AlicizationDialogueTurnSemantics, owner: AlicizationDialogueAnswerSubject) {
  return owner === 'relationship'
    || owner === 'host-state'
    || (
      owner === 'alicization-self'
      && !semantics.reasonTags.includes('detached-question')
      && !semantics.reasonTags.includes('scene-detached-turn')
    )
    || semantics.reasonTags.includes('answer-realignment')
    || semantics.reasonTags.includes('answer-realignment-followup')
    || semantics.reasonTags.includes('companionship-bid')
    || semantics.reasonTags.includes('care-request')
    || semantics.reasonTags.includes('chat-goal')
    || semantics.reasonTags.includes('terse-social-turn')
}

function resolveSceneBound(semantics: AlicizationDialogueTurnSemantics, owner: AlicizationDialogueAnswerSubject) {
  return owner === 'visible-scene'
    || owner === 'task-knot'
    || semantics.reasonTags.includes('scene-bound-turn')
    || semantics.reasonTags.includes('coding-question')
    || semantics.reasonTags.includes('coding-help-turn')
    || semantics.reasonTags.includes('current-activity-question')
    || semantics.reasonTags.includes('task-anchor')
}

export function buildDialogueIngressGovernor(input: {
  semantics: AlicizationDialogueTurnSemantics
  baseInspectionIntentActive: boolean
  semanticInspectionIntentActive: boolean
  semanticInspectionIntentConfidence?: number
  semanticInspectionReasonCodes?: string[]
  inspectionContinuityActive: boolean
  sharedAttentionActive: boolean
}): AlicizationDialogueIngressGovernor {
  const turnOwner = resolveTurnOwner(input.semantics)
  const dialogueFirst = resolveDialogueFirst(input.semantics, turnOwner)
  const hardDialogueFirst = resolveHardDialogueFirst(input.semantics, turnOwner)
  const softDialogueFirst = dialogueFirst && !hardDialogueFirst
  const semanticInspectionReasons = input.semanticInspectionReasonCodes ?? []
  const semanticInspectionProfile = deriveAlicizationInspectionSignalProfile({
    reasonCodes: semanticInspectionReasons,
    confidence: input.semanticInspectionIntentConfidence ?? 0,
  })
  const strongSemanticInspection = input.semanticInspectionIntentActive
    && semanticInspectionProfile.decisive
  const explicitInspectionClaim = input.baseInspectionIntentActive || strongSemanticInspection
  const detachedDialogueSceneClaim = turnOwner === 'alicization-self'
    && input.semantics.reasonTags.includes('scene-detached-turn')
    && (
      semanticInspectionProfile.explicitSceneDirective
      || semanticInspectionProfile.actionable
    )
  const inspectionOwnsTurn = explicitInspectionClaim
    && !hardDialogueFirst
    && (
      turnOwner === 'general'
      || detachedDialogueSceneClaim
    )
  const sceneBound = resolveSceneBound(input.semantics, turnOwner) || inspectionOwnsTurn
  const worldDirectedTurn = inspectionOwnsTurn || (!dialogueFirst && sceneBound)
  const screenReferenceMode: AlicizationDialogueScreenReferenceMode = dialogueFirst
    ? inspectionOwnsTurn
      ? 'required'
      : 'avoid'
    : turnOwner === 'visible-scene'
      ? 'required'
      : turnOwner === 'task-knot'
        ? 'helpful'
        : 'incidental'
  const inspectionEligible = (worldDirectedTurn || inspectionOwnsTurn) && (
    input.baseInspectionIntentActive
    || input.semanticInspectionIntentActive
    || (input.inspectionContinuityActive && sceneBound)
  )
  const releaseInspectionCarry = dialogueFirst && !inspectionOwnsTurn && input.inspectionContinuityActive

  return {
    turnOwner,
    inspectionEligible,
    releaseInspectionCarry,
    screenReferenceMode,
    confidence: clamp01(
      input.semantics.confidence * 0.72
      + (hardDialogueFirst ? 0.12 : softDialogueFirst ? 0.06 : 0.04)
      + (sceneBound ? 0.08 : 0)
      + (inspectionOwnsTurn ? 0.1 : 0)
      + (inspectionEligible ? 0.08 : 0),
    ),
    summary: inspectionOwnsTurn
      ? 'The host is speaking through Alicization toward the co-witnessed world, so inspection keeps ownership of this turn.'
      : dialogueFirst
        ? 'The host is speaking into Alicization’s side of the relationship, so scene carry cannot own this turn.'
        : inspectionEligible
          ? 'The turn still belongs to the co-witnessed scene or task knot, so inspection remains eligible.'
          : 'The turn does not currently justify visual grounding carry on its own.',
    reasonTags: uniqueLabels([
      `owner:${turnOwner}`,
      hardDialogueFirst ? 'dialogue-first-owner' : softDialogueFirst ? 'soft-dialogue-owner' : '',
      sceneBound ? 'scene-bound-owner' : '',
      inspectionOwnsTurn ? 'inspection-world-claim' : '',
      detachedDialogueSceneClaim ? 'detached-dialogue-scene-claim' : '',
      inspectionEligible ? 'inspection-eligible' : 'inspection-withheld',
      releaseInspectionCarry ? 'release-inspection-carry' : '',
      input.baseInspectionIntentActive ? 'base-inspection-intent' : '',
      input.semanticInspectionIntentActive ? 'semantic-inspection-intent' : '',
      input.sharedAttentionActive ? 'shared-attention-active' : '',
      input.inspectionContinuityActive ? 'inspection-continuity-active' : '',
    ]),
  } satisfies AlicizationDialogueIngressGovernor
}
