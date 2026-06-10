import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('visible-reply second-pass project-state regression', () => {
  it('keeps second-pass fallback anchored on repo truth while preferring live runtime project-state', () => {
    const source = readFileSync(new URL('./second-pass-rewrite.ts', import.meta.url), 'utf8')

    expect(source).toContain('resolveAlicizationProjectStateBrief')
    expect(source).toContain('from \'../prepared-runtime-continuity\'')
    expect(source).toContain('function resolveSecondPassProjectState(input?: {')
    expect(source).toContain('const projectStateBrief = resolveAlicizationProjectStateBrief()')
    expect(source).toContain('const runtimeProjectState = resolvePreparedRuntimeProjectStateSnapshot(input?.prepared)')
    expect(source).toContain('const canonicalProjectState = resolvePreparedRuntimeProjectStateSnapshot(input?.prepared)')
    expect(source).toContain('const rawPreparedProjectState = resolvePreparedRuntimeProjectState(input?.prepared)')
    expect(source).toContain('const projectState = resolveSecondPassProjectState({')
    expect(source).toContain('identity: canonicalProjectState.identity')
    expect(source).toContain('currentPhase: sanitizeBoundedText(runtimeProjectState.currentPhase, 220) || canonicalProjectState.currentPhase')
    expect(source).toContain('resolvePreparedRuntimeProjectPreDialogueAwarenessSummary(input?.prepared)')
    expect(source).toContain('latestLandedProgress: sanitizeBoundedText(')
    expect(source).toContain('?? canonicalProjectState.latestLandedProgress')
    expect(source).toContain('primaryOpenLoop: sanitizeBoundedText(')
    expect(source).toContain('?? canonicalProjectState.primaryOpenLoop')
    expect(source).toMatch(/16_000,\s*\)\s*\|\|\s*null/u)
    expect(source).toContain('nextClosureTarget: sanitizeBoundedText(')
    expect(source).toContain('?? canonicalProjectState.nextClosureTarget')
    expect(source).toMatch(/16_000,\s*\)\s*\|\|\s*projectStateBrief\.nextClosureTarget/u)
    expect(source).toContain('sameHerSelfLine: canonicalProjectState.sameHerSelfLine')
    expect(source).toContain('sameHerDriftRisk: sanitizeBoundedText(')
    expect(source).toContain('?? projectStateBrief.sameHerDriftRisk')
    expect(source).toContain('projectState: {')
    expect(source).toContain('preflightSummary: projectState.preflightSummary')
    expect(source).toContain('latestLandedProgress: projectState.latestLandedProgress')
    expect(source).toContain('primaryOpenLoop: projectState.primaryOpenLoop')
    expect(source).toContain('sameHerDriftRisk: projectState.sameHerDriftRisk')
    expect(source).toContain('const projectStateClosureDashboard = buildAlicizationProjectStateClosureDashboard({')
    expect(source).toContain('continuityProgressSummary: projectState.latestLandedProgress ?? projectStateBrief.continuityProgressSummary')
    expect(source).toContain('openLoops: projectState.primaryOpenLoop ? [projectState.primaryOpenLoop] : projectStateBrief.openLoops')
    expect(source).toContain('nextClosureTarget: projectState.nextClosureTarget')
    expect(source).toContain('reason: \'visible-reply-second-pass-transport-failure\'')
  })

  it('teaches project-state second-pass rewrite not to reopen same-thread callback continuity from scratch', () => {
    const source = readFileSync(new URL('./second-pass-rewrite.ts', import.meta.url), 'utf8')

    expect(source).toContain('[SAME_THREAD_CONTINUATION_REWRITE_GUIDANCE]')
    expect(source).toContain('[PROJECT_STATE_REWRITE_GUIDANCE]')
    expect(source).toContain('This turn is already on the same living line and should not be reopened from zero.')
    expect(source).toContain('Carry this same-her self line directly into the rewritten answer:')
    expect(source).toContain('Before drafting the rewritten answer, re-enter the turn through this pre-dialogue project awareness line:')
    expect(source).toContain('Do not reopen the project-state answer from scratch, and do not let it sound like a fresh report opening just because the turn is restating project identity.')
  })

  it('keeps second-pass project-awareness scoring specialized instead of flattening it to the generic shared baseline', () => {
    const source = readFileSync(new URL('./second-pass-rewrite.ts', import.meta.url), 'utf8')

    expect(source).toContain('function scoreProjectAwarenessLine(value: string | null | undefined) {')
    expect(source).toContain('scoreAlicizationProjectAwarenessLine,')
    expect(source).toContain('let score = scoreAlicizationProjectAwarenessLine(normalized)')
    expect(source).toContain('still belongs to one living her|still belongs to one living digital life|current screen')
    expect(source).toContain('looksLikeStrongEmbodimentClosureCarry(normalized)')
    expect(source).not.toContain('from \'./project-awareness\'')
  })
})
