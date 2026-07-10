import type { AlicizationMindTurnGovernance } from '../../../shared/eventa'
import type { AlicizationMemoryTurnArtifact } from './memory-os/memory-turn-artifact'

function pushUnique(target: string[], value: string) {
  const normalized = value.trim()
  if (!normalized || target.includes(normalized))
    return
  target.push(normalized)
}

function compactText(raw: unknown, maxChars = 220) {
  return typeof raw === 'string'
    ? raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
    : ''
}

export function applyMemoryTurnGateToGovernance(input: {
  governance: AlicizationMindTurnGovernance | null
  memoryTurnArtifact?: AlicizationMemoryTurnArtifact | null
}): AlicizationMindTurnGovernance | null {
  const governance = input.governance ?? null
  const artifact = input.memoryTurnArtifact ?? null
  if (!governance || !artifact)
    return governance

  const mustDo = [...(governance.mustDo ?? [])]
  const mustNotDo = [...(governance.mustNotDo ?? [])]
  const gate = artifact.visibleMemoryGate

  pushUnique(mustDo, `memory_turn_gate.status=${gate.status}`)
  if (gate.status === 'closed' || gate.status === 'inward-only') {
    pushUnique(mustDo, 'memory_surface.visibility=inward_only; memory_influence=caution,ordering,care,uncertainty')
    pushUnique(mustNotDo, 'memory_surface.visible_citation=blocked; memory_surface.recall_narration=blocked')
  }
  if (gate.status === 'gist-only') {
    pushUnique(mustDo, 'memory_surface.visibility=gist_only; memory_surface.payoff_role=support_current_turn')
    pushUnique(mustNotDo, 'memory_surface.verbatim_quote=blocked; memory_surface.exact_chronology=blocked; memory_surface.archive_report=blocked')
  }
  if (gate.recallReadiness < 0.42)
    pushUnique(mustNotDo, 'memory_recall_readiness.visible_answer_driver=blocked')
  if (gate.precisionProxy < 0.56)
    pushUnique(mustNotDo, 'memory_precision.exact_detail_claim=blocked; memory_precision.settled_continuity_claim=blocked')
  if (gate.wrongThreadRisk >= 0.38)
    pushUnique(mustNotDo, 'memory_wrong_thread.merge_into_current_answer=blocked')
  if (gate.latencyPressure >= 0.72)
    pushUnique(mustDo, 'memory_latency_pressure.priority=live_payoff')

  const closureTrace = artifact.memoryClosureTrace ?? null
  if (closureTrace?.authority === 'memory-os') {
    const initiative = closureTrace.nextInfluence?.initiative ?? null
    const execution = closureTrace.nextInfluence?.execution ?? null
    const embodiment = closureTrace.nextInfluence?.embodiment ?? null
    const initiativeRestraint = compactText(initiative?.restraint, 80)
    const initiativeTiming = compactText(initiative?.preferredTiming, 80)
    const executionCarry = compactText(execution?.carry, 220)
    const embodimentCadence = compactText(embodiment?.cadence, 220)

    pushUnique(mustDo, 'memory_closure_trace.authority=memory_os')
    if (initiativeRestraint || initiativeTiming) {
      pushUnique(
        mustDo,
        `memory_closure_trace.initiative_restraint=${initiativeRestraint || 'restrained'}${initiativeTiming ? `; initiative_timing=${initiativeTiming}` : ''}`,
      )
    }
    if (executionCarry)
      pushUnique(mustDo, `memory_closure_trace.execution_carry=${executionCarry}`)
    if (embodimentCadence)
      pushUnique(mustDo, `memory_closure_trace.embodiment_cadence=${embodimentCadence}`)
    if (closureTrace.closureState.open || closureTrace.closureState.revisionRequired) {
      pushUnique(
        mustNotDo,
        'memory_closure_trace.close_or_over_certify=blocked; closure_state=open_or_revision_required',
      )
    }
  }

  return {
    ...governance,
    mustDo,
    mustNotDo,
  }
}
