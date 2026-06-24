import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'low-risk-autonomous-self-start-ownership-gate',
    file: './executor-adapters/thread-permission.test.ts',
    snippets: [
      'recognizes low-risk grounded autonomous code-agent self-start threads',
      'rejects origin-only proactive threads from the low-risk self-start whitelist when no autonomous turn-id ownership survives',
      'expect(isLowRiskAutonomousCodeAgentSelfStartThread(spoofedAutonomousOriginThread)).toBe(false)',
    ],
  },
  {
    entry: 'codex-self-start-keeps-structural-autonomy',
    file: './executor-adapters/codex.test.ts',
    snippets: [
      'allows low-risk autonomous code edits to self-start on codex when planning already marked them as grounded same-her execution',
      'turnId: \'subconscious:codex-self-start-1\'',
      'permissionMode: \'none\'',
    ],
  },
  {
    entry: 'claude-code-self-start-keeps-structural-autonomy',
    file: './executor-adapters/claude-code.test.ts',
    snippets: [
      'allows low-risk autonomous code edits to self-start on claude-code when planning already marked them as grounded same-her execution',
      'turnId: \'subconscious:claude-self-start-1\'',
      'permissionMode: \'none\'',
    ],
  },
] as const

describe('execution autonomy ownership project awareness audit', () => {
  it('keeps one explicit route-level proof that low-risk autonomous execution self-start requires structural same-her thread ownership', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'low-risk-autonomous-self-start-ownership-gate' }),
      expect.objectContaining({ entry: 'codex-self-start-keeps-structural-autonomy' }),
      expect.objectContaining({ entry: 'claude-code-self-start-keeps-structural-autonomy' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the autonomous self-start ownership claim to current execution permission and adapter behavior tests instead of only broader execution-preflight prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: low-risk autonomous execution self-start now has route-level ownership proof, while future execution-preflight families still need explicit classification', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const coverageSource = readFileSync(new URL('./project-awareness-coverage-matrix.test.ts', import.meta.url), 'utf8')
    const permissionSource = readFileSync(new URL('./executor-adapters/thread-permission.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('future execution-preflight families still need explicit classification')
    expect(coverageSource).toContain('execution-autonomy-ownership-project-awareness-audit.test.ts')
    expect(permissionSource).toContain(
      'rejects origin-only proactive threads from the low-risk self-start whitelist when no autonomous turn-id ownership survives',
    )
  })
})
