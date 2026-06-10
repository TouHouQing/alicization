import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('visible-reply project-state facade regression', () => {
  it('keeps the visible-reply surface plan anchored on repo truth while preferring live runtime project-state before shaping system blocks', () => {
    const source = readFileSync(new URL('./facade.ts', import.meta.url), 'utf8')
    const projectStateIndex = source.indexOf('const projectState = resolveVisibleReplyProjectState({')
    const responseCharterIndex = source.indexOf('const responseCharter = buildAlicizationResponseCharter({')
    const executiveAnswerBriefIndex = source.indexOf('const executiveAnswerBrief = buildAlicizationExecutiveAnswerBrief({')

    expect(source).toContain('resolveAlicizationSurfaceProjectStateSnapshot')
    expect(source).toContain('from \'../project-state-brief\'')
    expect(source).toContain('function resolveVisibleReplyProjectState(input: {')
    expect(source).toContain('const projectState = resolveAlicizationSurfaceProjectStateSnapshot({')
    expect(source).toContain('runtimeSurface: input.runtimeSurface,')
    expect(source).toContain('const currentConsciousProjectState = input.runtimeSurface.dialogue.currentConsciousFrame?.projectState ?? null')
    expect(source).toContain('|| sanitizeProjectStateText(projectState.identity, 220)')
    expect(source).toContain('|| sanitizeProjectStateText(projectState.currentPhase, 160)')
    expect(source).toContain('|| sanitizeProjectStateText(projectState.preflightSummary, 320)')
    expect(source).toContain('|| sanitizeProjectStateText(projectState.latestLandedProgress, 220)')
    expect(source).toContain('|| sanitizeProjectStateText(projectState.primaryOpenLoop, 220)')
    expect(source).toContain('|| sanitizeProjectStateText(projectState.nextClosureTarget, 220)')
    expect(source).toContain('const explicitPreDialogueAwarenessLine')
    expect(source).toContain('buildAlicizationProjectPreDialogueAwarenessLine({')
    expect(source).toContain('const projectState = resolveVisibleReplyProjectState({')
    expect(projectStateIndex).toBeGreaterThan(-1)
    expect(responseCharterIndex).toBeGreaterThan(projectStateIndex)
    expect(executiveAnswerBriefIndex).toBeGreaterThan(responseCharterIndex)
  })
})
