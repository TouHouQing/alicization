import type { AlicizationMemoryClosureDiscipline } from '@proj-alicization/stage-shared'

export interface AlicizationResponseSurfaceMemoryClosureRules {
  mustDo: string[]
  mustNotDo: string[]
}

function pushUnique(target: string[], value: string) {
  const normalized = value.trim()
  if (!normalized || target.includes(normalized))
    return
  target.push(normalized)
}

export function buildAlicizationResponseSurfaceMemoryClosureRules(
  discipline: AlicizationMemoryClosureDiscipline,
): AlicizationResponseSurfaceMemoryClosureRules {
  const mustDo: string[] = []
  const mustNotDo: string[] = []

  if (!discipline.hasLedger)
    return { mustDo, mustNotDo }

  if (discipline.shouldBlockVisibleMemory || discipline.surfacePermission === 'inward-only') {
    pushUnique(mustDo, 'memory_closure.surface_visibility=inward_only; memory_influence=care,caution,ordering')
    pushUnique(mustNotDo, 'memory_closure.visible_citation=blocked; memory_closure.recall_narration=blocked')
  }
  if (discipline.allowedSurface === 'gist') {
    pushUnique(mustDo, 'memory_closure.surface_visibility=gist; memory_closure.payoff_role=support_current_turn')
    pushUnique(mustNotDo, 'memory_closure.verbatim_quote=blocked; memory_closure.exact_detail_reconstruction=blocked')
  }
  if (discipline.allowedSurface === 'explicit')
    pushUnique(mustDo, 'memory_closure.surface_visibility=explicit; memory_closure.archive_report=blocked')
  if (discipline.shouldLabelUncertainty) {
    pushUnique(mustDo, 'memory_closure.uncertainty_label=required')
    pushUnique(mustNotDo, 'memory_closure.exact_wording_claim=blocked; memory_closure.settled_chronology_claim=blocked')
  }
  if (discipline.shouldUseStableCoreOnly) {
    pushUnique(mustDo, 'memory_closure.conflict_pressure=present; visible_memory_core=stable_only')
    pushUnique(mustNotDo, 'memory_closure.competing_thread_merge=blocked')
  }
  if (discipline.retrievalQuality === 'low' || discipline.retrievalQuality === 'insufficient') {
    pushUnique(mustDo, `memory_closure.retrieval_quality=${discipline.retrievalQuality}; recall_position=behind_live_answer`)
    pushUnique(mustNotDo, 'memory_closure.low_quality_recall.visible_answer_driver=blocked')
  }
  if (discipline.shouldDelayUntilAfterPayoff)
    pushUnique(mustDo, 'memory_closure.surface_timing=after_live_payoff')

  return { mustDo, mustNotDo }
}
