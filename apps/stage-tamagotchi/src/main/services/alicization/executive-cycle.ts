import type {
  AlicizationExecutiveCycleSnapshot,
  AlicizationExecutivePhase,
  AlicizationIntentionStreamSnapshot,
  AlicizationMindKernelSnapshot,
  AlicizationReflectionLedgerSnapshot,
  AlicizationRepairLedgerSnapshot,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'

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

function dominantProject(stream?: AlicizationIntentionStreamSnapshot | null) {
  return stream?.projects.find(project => project.id === stream.dominantProjectId)
    ?? stream?.projects[0]
    ?? null
}

function latestReflection(ledger?: AlicizationReflectionLedgerSnapshot | null) {
  return ledger?.entries.find(entry => entry.id === ledger.latestEntryId)
    ?? ledger?.entries[0]
    ?? null
}

function governingRepair(ledger?: AlicizationRepairLedgerSnapshot | null) {
  return ledger?.entries.find(entry => entry.id === ledger.governingRepairId)
    ?? ledger?.entries[0]
    ?? null
}

function resolvePhase(input: {
  now: number
  worldModel?: AlicizationWorldModelSnapshot | null
  repairLedger?: AlicizationRepairLedgerSnapshot | null
  intentionStream?: AlicizationIntentionStreamSnapshot | null
  reflectionLedger?: AlicizationReflectionLedgerSnapshot | null
  mindKernel?: AlicizationMindKernelSnapshot | null
  previous?: AlicizationExecutiveCycleSnapshot | null
}) {
  const project = dominantProject(input.intentionStream)
  const reflection = latestReflection(input.reflectionLedger)
  const repair = governingRepair(input.repairLedger)
  const certainty = input.worldModel?.epistemicState.certainty ?? 'uncertain'
  const reflectionStillHot = Boolean(reflection && input.now - reflection.createdAt <= 5 * 60_000)

  let phase: AlicizationExecutivePhase = 'perceiving'
  if (
    reflectionStillHot
    && (reflection?.outcome === 'missed' || reflection?.outcome === 'corrected' || reflection?.outcome === 'stalled')
  ) {
    phase = 'reflecting'
  }
  else if (
    input.repairLedger?.shouldConstrainPresentTense
    || certainty === 'uncertain'
    || certainty === 'lingering'
    || project?.kind === 'repair-truth'
    || project?.kind === 'reacquire-scene'
    || input.mindKernel?.dominantMode === 'repairing'
    || input.mindKernel?.dominantMode === 'orienting'
  ) {
    phase = 'inferring'
  }
  else if (
    project?.speakAffinity && project.speakAffinity >= 0.56
    && certainty === 'grounded'
    && !input.repairLedger?.shouldConstrainPresentTense
    && project.status !== 'withheld'
  ) {
    phase = 'acting'
  }
  else if (
    project
    && project.continuityWeight >= 0.52
  ) {
    phase = 'committing'
  }
  else if (
    project
    || input.mindKernel?.dominantMode === 'tracking'
    || input.mindKernel?.dominantMode === 'guarding'
    || input.mindKernel?.dominantMode === 'accompanying'
  ) {
    phase = 'deliberating'
  }

  if (
    input.previous
    && input.previous.updatedAt >= input.now - 3 * 60_000
    && input.previous.dominantProjectId === project?.id
    && input.previous.phase !== 'reflecting'
    && phase === 'deliberating'
  ) {
    phase = input.previous.phase === 'acting' ? 'committing' : input.previous.phase
  }

  return {
    phase,
    repair,
    project,
    reflection,
  }
}

export function buildExecutiveCycle(input: {
  now: number
  worldModel?: AlicizationWorldModelSnapshot | null
  repairLedger?: AlicizationRepairLedgerSnapshot | null
  intentionStream?: AlicizationIntentionStreamSnapshot | null
  reflectionLedger?: AlicizationReflectionLedgerSnapshot | null
  mindKernel?: AlicizationMindKernelSnapshot | null
  previous?: AlicizationExecutiveCycleSnapshot | null
}): AlicizationExecutiveCycleSnapshot {
  const { phase, repair, project, reflection } = resolvePhase(input)
  const actionReadiness = clamp01(
    (project?.speakAffinity ?? 0.12) * 0.36
    + (project?.confidence ?? 0.22) * 0.16
    + (input.worldModel?.activeThread?.confidence ?? 0.22) * 0.16
    + (input.worldModel?.epistemicState.certainty === 'grounded' ? 0.2 : input.worldModel?.epistemicState.certainty === 'observed' ? 0.1 : 0)
    - (input.repairLedger?.shouldConstrainPresentTense ? 0.22 : 0)
    - (input.reflectionLedger?.revisionPressure ?? 0) * 0.18,
  )
  const shouldReflect = phase === 'reflecting'
  const shouldAct = phase === 'acting' || (phase === 'committing' && actionReadiness >= 0.64)
  const currentLine = sanitizeText(
    reflection?.revision
    ?? project?.summary
    ?? repair?.summary
    ?? input.worldModel?.activeThread?.summary
    ?? input.previous?.currentLine
    ?? '',
    220,
  ) || 'Hold the living seam until the next move earns itself.'
  const cycleStable = input.previous
    && input.previous.dominantProjectId === project?.id
    && input.previous.phase === phase
    && input.previous.updatedAt >= input.now - 5 * 60_000

  return {
    cycleId: cycleStable
      ? input.previous!.cycleId
      : [
          'executive-cycle',
          phase,
          sanitizeText(project?.id, 160).toLowerCase() || 'projectless',
          input.now,
        ].join('::'),
    phase,
    dominantProjectId: project?.id ?? null,
    activeReflectionId: reflection?.id ?? null,
    governingThreadId: project?.targetThreadId ?? input.worldModel?.activeThread?.id ?? null,
    governingRepairId: repair?.id ?? null,
    shouldAct,
    shouldReflect,
    actionReadiness,
    currentLine,
    narrative: [
      `executive_phase:${phase}`,
      project ? `executive_project:${project.kind}/${project.status}` : 'executive_project:none',
      reflection ? `executive_reflection:${reflection.outcome}` : '',
      currentLine,
    ].filter(Boolean),
    updatedAt: input.now,
  } satisfies AlicizationExecutiveCycleSnapshot
}
