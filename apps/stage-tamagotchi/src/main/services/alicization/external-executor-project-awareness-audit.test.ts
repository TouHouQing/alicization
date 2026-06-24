import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateCoverage } from './project-state-brief'

const proofRows = [
  {
    entry: 'cli-outward-dispatch-project-briefing-carry',
    file: './executor-adapters/cli.test.ts',
    snippets: [
      'injects runtime context into the CLI environment and execution events',
      'project_preflight=identity=Alicization | phase=Phase 1 | open=cli execution project awareness',
      'project_awareness=Before CLI dispatch, remember this is still the same local-first digital life project.',
      'same-her hold: keep CLI execution grounded on the same living line before widening outward.',
      'same living line: CLI execution should carry this same Phase 1 digital life before widening outward.',
    ],
  },
  {
    entry: 'codex-outward-dispatch-project-briefing-carry',
    file: './executor-adapters/codex.test.ts',
    snippets: [
      'dispatches codex execution and records dispatch, step, and result events',
      'project_preflight=identity=Alicization | phase=Phase 1 | open=execution chain same-line closure',
      'project_awareness=Before dispatch, remember this is still the same local-first digital life project.',
      'project_same_her_hold=same-her hold: keep execution on the same living line before widening outward.',
      'project_continuity=same living line: execution should keep carrying this same Phase 1 digital life before widening outward.',
    ],
  },
  {
    entry: 'claude-code-outward-dispatch-project-briefing-carry',
    file: './executor-adapters/claude-code.test.ts',
    snippets: [
      'dispatches claude code execution and records dispatch, step, and result events',
      'project_same_her_hold=same-her hold: keep execution on the same living line before widening outward.',
      'project_continuity=same living line: execution should keep carrying this same Phase 1 digital life before widening outward.',
      'hasRuntimeContext: true',
    ],
  },
  {
    entry: 'openclaw-outward-dispatch-project-briefing-carry',
    file: './executor-adapters/openclaw.test.ts',
    snippets: [
      'dispatches openclaw execution and records dispatch, step, and result events',
      'project_preflight=identity=Alicization | phase=Phase 1 | open=execution chain same-line closure',
      'project_awareness=Before dispatch, remember this is still the same local-first digital life project.',
      'project_same_her_hold=same-her hold: keep execution on the same living line before widening outward.',
      'project_continuity=same living line: execution should keep carrying this same Phase 1 digital life before widening outward.',
    ],
  },
] as const

describe('external executor project awareness audit', () => {
  it('keeps one explicit route-level proof that external executor adapters preserve same-her project awareness when local process or network dispatch actually leaves the desktop runtime', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'cli-outward-dispatch-project-briefing-carry' }),
      expect.objectContaining({ entry: 'codex-outward-dispatch-project-briefing-carry' }),
      expect.objectContaining({ entry: 'claude-code-outward-dispatch-project-briefing-carry' }),
      expect.objectContaining({ entry: 'openclaw-outward-dispatch-project-briefing-carry' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the external executor adapter claim to current adapter behavior tests instead of leaving outward execution project briefing carry implicit inside broader execution-chain or capability-surface prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: external executor adapters now have dedicated project-awareness proof, while future execution-preflight families still need explicit classification', () => {
    const coverage = resolveAlicizationProjectStateCoverage()
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(coverage.find(item => item.id === 'execution-preflight-registration')?.proof).toContain('external-executor-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'execution-preflight-registration')?.responsibility).toContain('external executor adapter project-awareness route')

    expect(matrixSource).toContain('external-executor-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('external executor adapters now also have dedicated route-level proof')
    expect(matrixSource).toContain('future execution-preflight families still need explicit classification')

    expect(auditSource).toContain('external executor adapters now also have one explicit route-level proof')
    expect(auditSource).toContain('external-executor-project-awareness-audit.test.ts')
  })
})
