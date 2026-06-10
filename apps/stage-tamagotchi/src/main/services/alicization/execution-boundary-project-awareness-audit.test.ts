import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateCoverage } from './project-state-brief'

const proofRows = [
  {
    entry: 'shared-runtime-context-block-project-awareness',
    file: '../../../../../../packages/stage-shared/src/alicization-execution-runtime-context.test.ts',
    snippets: [
      'renders a reusable execution context block for embodied runtimes',
      'project_preflight=identity=Alicization | phase=Phase 1 | open=Embodiment still needs stronger same-line closure | next=Keep execution grounded on the same living line before widening outward.',
      'project_awareness=Before execution begins, remember this is still the same local-first digital life project and the unfinished Phase 1 closure still belongs to one living her.',
    ],
  },
  {
    entry: 'shared-runtime-context-legacy-landed-progress-carry',
    file: '../../../../../../packages/stage-shared/src/alicization-execution-runtime-context.test.ts',
    snippets: [
      'keeps legacy latestProgress alive inside execution project briefing and surfaces landed progress in the runtime context block',
      'project_landed_progress=legacy execution-context project progress still survives from older runtime briefing payloads',
      'project_landed_progress=Audit-style execution project progress still says the same-her Phase 1 loop has real landed continuity.',
    ],
  },
  {
    entry: 'shared-runtime-context-thin-awareness-upgrade',
    file: '../../../../../../packages/stage-shared/src/alicization-execution-runtime-context.test.ts',
    snippets: [
      'prefers a richer project-aware execution briefing over a thin explicit Chinese awareness shell so execution starts knowing the project, landed progress, and open loop',
      'Before execution begins, remember what this digital life project is, what has landed, and which life loop is still open.',
      'latestLandedProgress: \'Execution-side project continuity already survives into runtime context preparation.\'',
    ],
  },
  {
    entry: 'runtime-context-sanitization-anti-shell',
    file: './execution-runtime-context.test.ts',
    snippets: [
      'does not let a thin generic awareness shell erase richer open-loop and same-her execution briefing fields during runtime-context sanitization',
      'does not let blank legacy execution briefing fields block richer summary-only project-state aliases during runtime-context sanitization',
      'prefers a broader execution project briefing over an embodiment-only awareness line so dispatch still knows the project, Phase 1 route, landed progress, and open closure before widening outward',
    ],
  },
] as const

describe('execution boundary project awareness audit', () => {
  it('keeps one explicit route-level proof that the execution boundary carries richer same-her project awareness before dispatch begins instead of leaving the shared runtime-context block implicit inside broader execution-chain audits', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'shared-runtime-context-block-project-awareness' }),
      expect.objectContaining({ entry: 'shared-runtime-context-legacy-landed-progress-carry' }),
      expect.objectContaining({ entry: 'shared-runtime-context-thin-awareness-upgrade' }),
      expect.objectContaining({ entry: 'runtime-context-sanitization-anti-shell' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the execution-boundary claim to current shared runtime-context and main-process sanitization behavior tests instead of only execution-preflight ownership prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('registers the execution boundary explicitly while keeping future execution-preflight families and long-run closure still open', () => {
    const coverage = resolveAlicizationProjectStateCoverage()
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(coverage.find(item => item.id === 'execution-preflight-registration')?.proof).toContain('execution-boundary-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'execution-preflight-registration')?.responsibility).toContain('execution-boundary project awareness')
    expect(coverage.find(item => item.id === 'execution-preflight-registration')?.responsibility).toContain('shared execution runtime-context block')

    expect(matrixSource).toContain('execution-boundary-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('execution-boundary project awareness')
    expect(matrixSource).toContain('Before execution begins, remember what this digital life project is, what has landed, and which life loop is still open.')
    expect(matrixSource).toContain('future execution-preflight families still need explicit classification')
    expect(matrixSource).toContain('Long-run proof is still incomplete')

    expect(auditSource).toContain('execution-boundary project awareness')
    expect(auditSource).toContain('shared execution runtime-context block')
    expect(auditSource).toContain('execution-boundary-project-awareness-audit.test.ts')
  })
})
