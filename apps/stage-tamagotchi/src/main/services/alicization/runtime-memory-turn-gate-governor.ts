import type { AlicizationMindTurnGovernance } from '../../../shared/eventa'
import type { AlicizationMemoryTurnArtifact } from './memory-os/memory-turn-artifact'

function pushUnique(target: string[], value: string) {
  const normalized = value.trim()
  if (!normalized || target.includes(normalized))
    return
  target.push(normalized)
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

  return {
    ...governance,
    mustDo,
    mustNotDo,
  }
}
