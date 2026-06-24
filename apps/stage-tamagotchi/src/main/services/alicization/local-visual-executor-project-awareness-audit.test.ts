import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'local-visual-executor-runtime-context-normalization',
    file: './executor-adapters/local-visual.ts',
    snippets: [
      'function buildExecutorTaskThreadInvocation(input: {',
      'const runtimeContext = normalizeAlicizationExecutionRuntimeContext(input.commandRuntimeContext)',
      'function buildLocalVisualExecutorContext(input: {',
      'runtimeContext: runtimeContext ?? undefined,',
    ],
  },
  {
    entry: 'local-visual-codex-delegation-project-briefing-carry',
    file: './executor-adapters/local-visual.test.ts',
    snippets: [
      'auto-continues coding investigation into codex and reinspects the desktop scene',
      'const expectedDelegatedRuntimeProjectBriefing = expect.objectContaining({',
      'projectBriefing: expectedDelegatedRuntimeProjectBriefing',
      'latestLandedProgress: expect.stringContaining(\'Local-visual executor continuation now stays\')',
    ],
  },
  {
    entry: 'local-visual-claude-code-delegation-project-briefing-carry',
    file: './executor-adapters/local-visual.test.ts',
    snippets: [
      'auto-continues coding investigation into claude code and reinspects the desktop scene',
      'projectBriefing: expectedDelegatedRuntimeProjectBriefing',
      'preDialogueAwarenessLine: expect.stringContaining(\'same local-first digital life project\')',
    ],
  },
  {
    entry: 'local-visual-cli-delegation-project-briefing-carry',
    file: './executor-adapters/local-visual.test.ts',
    snippets: [
      'auto-continues terminal investigation into cli and reinspects the desktop scene',
      'projectBriefing: expectedDelegatedRuntimeProjectBriefing',
      'nextClosureTarget: expect.stringContaining(\'delegated desktop execution line project-aware\')',
    ],
  },
] as const

describe('local visual executor project awareness audit', () => {
  it('keeps one explicit route-level proof that local-visual desktop inspection continuation preserves same-her project awareness when suggested actions delegate into cli, codex, or claude code before reinspection returns', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'local-visual-executor-runtime-context-normalization' }),
      expect.objectContaining({ entry: 'local-visual-codex-delegation-project-briefing-carry' }),
      expect.objectContaining({ entry: 'local-visual-claude-code-delegation-project-briefing-carry' }),
      expect.objectContaining({ entry: 'local-visual-cli-delegation-project-briefing-carry' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the local-visual executor delegation claim to current bridge code and behavior tests instead of leaving the same-her execution handoff implicit inside broader desktop execution prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: local-visual executor delegation now has dedicated project-awareness proof, while future execution dispatch families still need explicit owner registration', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(matrixSource).toContain('local-visual-executor-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('local-visual desktop inspection continuation now also has dedicated route-level proof')
    expect(matrixSource).toContain('future execution dispatch families still need explicit owner registration')

    expect(auditSource).toContain('local-visual executor delegation now has one explicit route-level proof')
    expect(auditSource).toContain('local-visual-executor-project-awareness-audit.test.ts')
  })
})
