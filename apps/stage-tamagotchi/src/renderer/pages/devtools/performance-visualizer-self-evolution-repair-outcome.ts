export interface SelfEvolutionRepairClosureLike {
  isClosed: boolean
  sessionCovered: boolean
  hasFreshValidationSnapshot: boolean
  samePatternStillPresent: boolean
  prosodyAuthorityRelevant: boolean
  prosodyAuthorityValidated: boolean | null
  summaryLines: string[]
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  rendererRejoinSurfaceKey?: 'authority:renderer-rejoin:speech' | 'authority:renderer-rejoin:live2d' | 'authority:renderer-rejoin:vrm' | null
  survivingVisibleLane?: 'face+lipsync-only' | 'motion+lipsync-only' | 'face+lipsync+voice-only' | 'motion+lipsync+voice-only' | null
}

function formatSignals(signals: string[]) {
  return signals.length > 0 ? signals.join(',') : 'none'
}

export function buildSelfEvolutionRepairOutcome(input: {
  repairClosureBefore: SelfEvolutionRepairClosureLike | null
  repairClosureAfter: SelfEvolutionRepairClosureLike | null
}) {
  const before = input.repairClosureBefore
  const after = input.repairClosureAfter
  if (!before || !after)
    return null

  const improvedSignals: string[] = []
  const unresolvedSignals: string[] = []

  if (!before.sessionCovered && after.sessionCovered)
    improvedSignals.push('repair-checklist-covered')
  if (!before.hasFreshValidationSnapshot && after.hasFreshValidationSnapshot)
    improvedSignals.push('validation-snapshot-present')
  if (before.samePatternStillPresent && !after.samePatternStillPresent)
    improvedSignals.push('recurring-pattern-cleared')
  if (
    after.prosodyAuthorityRelevant
    && before.prosodyAuthorityValidated === false
    && after.prosodyAuthorityValidated === true
  ) {
    improvedSignals.push('prosody-authority-validated')
  }

  if (!after.sessionCovered)
    unresolvedSignals.push('repair-checklist-incomplete')
  if (!after.hasFreshValidationSnapshot)
    unresolvedSignals.push('validation-snapshot-missing')
  if (after.samePatternStillPresent)
    unresolvedSignals.push('recurring-pattern-present')
  if (after.prosodyAuthorityRelevant && after.prosodyAuthorityValidated === false)
    unresolvedSignals.push('prosody-authority-unvalidated')

  const closureChanged = !before.isClosed && after.isClosed
  const factLine = [
    `improved=${formatSignals(improvedSignals)}`,
    `unresolved=${formatSignals(unresolvedSignals)}`,
    `bodyContinuityPhase=${after.bodyContinuityPhase ?? 'n/a'}`,
    `rendererRejoinSurfaceKey=${after.rendererRejoinSurfaceKey ?? 'n/a'}`,
    `survivingVisibleLane=${after.survivingVisibleLane ?? 'n/a'}`,
  ].join('; ')

  return {
    closureChanged,
    improvedSignals,
    unresolvedSignals,
    summaryLine: closureChanged
      ? 'repairClosure: open -> closed'
      : after.isClosed
        ? 'repairClosure: closed'
        : improvedSignals.length > 0
          ? 'repairClosure: open; evidence changed'
          : 'repairClosure: open; no new evidence',
    detailLine: factLine,
  }
}
