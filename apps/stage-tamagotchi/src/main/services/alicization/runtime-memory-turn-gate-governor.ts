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

  pushUnique(mustDo, `Honor the turn memory gate before speaking: ${gate.status}.`)
  if (gate.status === 'closed' || gate.status === 'inward-only') {
    pushUnique(mustDo, 'Let memory shape caution, ordering, care, and uncertainty inwardly without narrating recall this turn.')
    pushUnique(mustNotDo, 'Do not visibly cite, narrate, or dramatize recalled material while the turn memory gate is inward-only or closed.')
  }
  if (gate.status === 'gist-only') {
    pushUnique(mustDo, 'If memory becomes visible, reduce it to a brief gist that serves the current payoff.')
    pushUnique(mustNotDo, 'Do not quote remembered wording, over-specify chronology, or widen gist-only memory into an archive report.')
  }
  if (gate.recallReadiness < 0.42)
    pushUnique(mustNotDo, 'Do not let low recall readiness drive the visible answer.')
  if (gate.precisionProxy < 0.56)
    pushUnique(mustNotDo, 'Do not let low memory precision claim exact detail or settled continuity.')
  if (gate.wrongThreadRisk >= 0.38)
    pushUnique(mustNotDo, 'Do not merge competing or wrong-thread memory into the current answer.')
  if (gate.latencyPressure >= 0.72)
    pushUnique(mustDo, 'Prefer the live payoff over expensive recollection when memory latency pressure is high.')

  const closureTrace = artifact.memoryClosureTrace ?? null
  if (closureTrace?.authority === 'memory-os') {
    const initiative = closureTrace.nextInfluence?.initiative ?? null
    const execution = closureTrace.nextInfluence?.execution ?? null
    const embodiment = closureTrace.nextInfluence?.embodiment ?? null
    const initiativeRestraint = compactText(initiative?.restraint, 80)
    const initiativeTiming = compactText(initiative?.preferredTiming, 80)
    const executionCarry = compactText(execution?.carry, 220)
    const embodimentCadence = compactText(embodiment?.cadence, 220)

    pushUnique(mustDo, 'Use the Memory OS closure trace as the authority for this turn\'s memory carry.')
    if (initiativeRestraint || initiativeTiming) {
      pushUnique(
        mustDo,
        `Keep proactive pressure ${initiativeRestraint || 'restrained'}${initiativeTiming ? ` and wait for ${initiativeTiming}` : ''} before widening the memory line.`,
      )
    }
    if (executionCarry)
      pushUnique(mustDo, `Carry execution feedback forward: ${executionCarry}`)
    if (embodimentCadence)
      pushUnique(mustDo, `Keep embodied delivery coherent with memory: ${embodimentCadence}`)
    if (closureTrace.closureState.open || closureTrace.closureState.revisionRequired) {
      pushUnique(
        mustNotDo,
        'Do not close, revise away, or over-certify this memory line; the Memory OS trace still marks it open or revision-required.',
      )
    }
  }

  return {
    ...governance,
    mustDo,
    mustNotDo,
  }
}
