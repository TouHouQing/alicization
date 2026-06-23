export function resolvePerformanceVisualizerEvidenceLineScrollTargetId(input: {
  panelId: string
  line: string
}) {
  if (
    input.panelId === 'runtime-continuity-projection'
    && input.line === 'bodyContinuityPhase: body-only-hold'
  ) {
    return 'self-evolution-evidence:runtime-continuity-body-only-hold'
  }

  if (
    input.panelId === 'runtime-continuity-projection'
    && input.line === 'bodyContinuityPhase: body-carried-to-renderer-rejoin'
  ) {
    return 'self-evolution-evidence:runtime-continuity-body-carried-to-renderer-rejoin'
  }

  if (
    input.panelId === 'runtime-continuity-projection'
    && input.line === 'bodyContinuityPhase: full-cross-modal-lock'
  ) {
    return 'self-evolution-evidence:runtime-continuity-full-cross-modal-lock'
  }

  if (
    input.panelId === 'runtime-continuity-projection'
    && input.line === 'bodyContinuityPhase: renderer-rejoin-without-body'
  ) {
    return 'self-evolution-evidence:runtime-continuity-renderer-rejoin-without-body'
  }

  return null
}
