import type { AlicizationDialogueAnswerSubject } from '../../../shared/eventa'
import type { AlicizationInspectionTurnState } from './inspection-turn-state-machine'

import { isDialogueFirstSubject } from './dialogue-surface-text'

export interface AlicizationInspectionGroundingGateDecision {
  inspectionRequested: boolean
  inspectionState: AlicizationInspectionTurnState
  releaseCarry: boolean
  confidence: number
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

export function resolveInspectionGroundingGate(input: {
  inspectionRequested: boolean
  inspectionState: AlicizationInspectionTurnState
  releaseCarry: boolean
  explicitInspectionIntent: boolean
  ingressInspectionEligible: boolean
  ingressOwner?: AlicizationDialogueAnswerSubject | null
  ingressDialogueFirstSignal?: boolean
  ingressSceneBoundSignal?: boolean
}): AlicizationInspectionGroundingGateDecision {
  if (!input.inspectionRequested || input.inspectionState === 'dialogue-first') {
    return {
      inspectionRequested: false,
      inspectionState: 'dialogue-first',
      releaseCarry: input.releaseCarry || input.inspectionState !== 'dialogue-first',
      confidence: clamp01(0.88 + (input.releaseCarry ? 0.06 : 0)),
      reasonTags: uniqueLabels([
        'grounding-gate:inspection-released',
        'grounding-gate:already-dialogue-first',
      ]),
    } satisfies AlicizationInspectionGroundingGateDecision
  }

  const ingressOwnerDialogueFirst = Boolean(
    input.ingressOwner && isDialogueFirstSubject(input.ingressOwner),
  )
  const ingressDialogueFirst = Boolean(
    input.ingressDialogueFirstSignal || ingressOwnerDialogueFirst,
  )
  const ingressSceneBound = input.ingressSceneBoundSignal === true
  const forceRelease = !input.explicitInspectionIntent && ingressDialogueFirst && !ingressSceneBound

  if (!input.ingressInspectionEligible || forceRelease) {
    return {
      inspectionRequested: false,
      inspectionState: 'dialogue-first',
      releaseCarry: true,
      confidence: clamp01(
        0.74
        + (!input.ingressInspectionEligible ? 0.14 : 0)
        + (forceRelease ? 0.12 : 0),
      ),
      reasonTags: uniqueLabels([
        'grounding-gate:inspection-released',
        !input.ingressInspectionEligible ? 'grounding-gate:ingress-ineligible' : '',
        forceRelease ? 'grounding-gate:dialogue-first-ingress' : '',
        input.explicitInspectionIntent ? 'grounding-gate:explicit-inspection-intent' : '',
      ]),
    } satisfies AlicizationInspectionGroundingGateDecision
  }

  return {
    inspectionRequested: true,
    inspectionState: input.inspectionState,
    releaseCarry: false,
    confidence: clamp01(
      0.72
      + (input.explicitInspectionIntent ? 0.16 : 0)
      + (ingressSceneBound ? 0.08 : 0),
    ),
    reasonTags: uniqueLabels([
      `grounding-gate:inspection-kept:${input.inspectionState}`,
      input.explicitInspectionIntent ? 'grounding-gate:explicit-inspection-intent' : '',
      ingressSceneBound ? 'grounding-gate:scene-bound-ingress' : '',
    ]),
  } satisfies AlicizationInspectionGroundingGateDecision
}
