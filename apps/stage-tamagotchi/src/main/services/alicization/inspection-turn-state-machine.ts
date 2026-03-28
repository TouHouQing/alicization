export type AlicizationInspectionTurnState
  = | 'dialogue-first'
    | 'inspection-live'
    | 'inspection-carry'
    | 'screen-repair'

export interface AlicizationInspectionTurnStateDecision {
  state: AlicizationInspectionTurnState
  inspectionRequested: boolean
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

export function resolveInspectionTurnState(input: {
  candidateInspectionActive: boolean
  explicitInspectionIntent: boolean
  continuityActive: boolean
  anchoredSceneContinuation: boolean
  sharedAttentionContinuation: boolean
  repairSignal: boolean
  dialoguePivot: boolean
  identityPivot: boolean
  ingressInspectionEligible: boolean
}): AlicizationInspectionTurnStateDecision {
  const forcedDialoguePivot = input.identityPivot || input.dialoguePivot
  const continuityOwnsTurn = input.continuityActive
    && (input.anchoredSceneContinuation || input.sharedAttentionContinuation)

  let state: AlicizationInspectionTurnState = 'dialogue-first'
  if (!forcedDialoguePivot && input.ingressInspectionEligible && input.candidateInspectionActive) {
    if (input.explicitInspectionIntent && input.repairSignal)
      state = 'screen-repair'
    else if (input.explicitInspectionIntent)
      state = 'inspection-live'
    else if (continuityOwnsTurn)
      state = 'inspection-carry'
    else
      state = 'inspection-live'
  }

  const inspectionRequested = state !== 'dialogue-first'
  const releaseCarry = !inspectionRequested && input.continuityActive

  return {
    state,
    inspectionRequested,
    releaseCarry,
    confidence: clamp01(
      (inspectionRequested ? 0.62 : 0.22)
      + (input.explicitInspectionIntent ? 0.2 : 0)
      + (continuityOwnsTurn ? 0.12 : 0)
      + (input.repairSignal ? 0.08 : 0)
      + (forcedDialoguePivot ? -0.34 : 0)
      + (input.ingressInspectionEligible ? 0.06 : -0.12),
    ),
    reasonTags: uniqueLabels([
      `inspection-state:${state}`,
      input.explicitInspectionIntent ? 'explicit-inspection-intent' : '',
      input.continuityActive ? 'inspection-continuity-active' : '',
      continuityOwnsTurn ? 'continuity-owned-turn' : '',
      input.repairSignal ? 'inspection-repair-signal' : '',
      forcedDialoguePivot ? 'dialogue-pivot-away' : '',
      releaseCarry ? 'release-inspection-carry' : '',
      input.ingressInspectionEligible ? 'ingress-inspection-eligible' : 'ingress-inspection-withheld',
    ]),
  } satisfies AlicizationInspectionTurnStateDecision
}
