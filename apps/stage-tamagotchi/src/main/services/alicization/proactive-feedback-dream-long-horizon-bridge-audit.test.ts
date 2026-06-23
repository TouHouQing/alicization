import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateCoverage } from './project-state-brief'

const proofRows = [
  {
    entry: 'feedback-next-dream-project-state-carry',
    file: './runtime.test.ts',
    snippets: [
      'it(\'feeds settled proactive reply feedback into the next dream prompt\'',
      'expect(dreamSystemTexts[0]).toContain(\'proactive:coding:reply-within-120s\')',
      'expect(dreamSystemTexts[0]).toContain(\'same-thread-continuation\')',
      'expect(dreamSystemTexts[0]).toContain(\'quiet_same_her_continuity=When the current continuity is inward and lower-pressure, preserve it as quiet same-her continuity rather than flattening it into a generic measured-return helper state.\')',
    ],
  },
  {
    entry: 'dream-autobiographical-self-brief-boundary',
    file: './runtime.test.ts',
    snippets: [
      'it(\'injects quiet same-her continuity guidance into dream autobiographical synthesis prompts\'',
      'expect(runtimeSource).toContain(\'[ALICIZATION_DREAM_AUTOBIOGRAPHICAL_SUMMARIES]\')',
      'expect(runtimeSource).toContain(\'Dream metabolism must stay inside the same digital life project line, the same Phase 1 proving ground, and the same still-open closure work.\')',
      'expect(runtimeSource).toContain(\'Do not let dream metabolism collapse into detached trait optimization, generic self-improvement advice, or shallow assistant-style preference cleanup.\')',
    ],
  },
  {
    entry: 'memory-consolidation-self-brief-boundary',
    file: './runtime.test.ts',
    snippets: [
      'it(\'injects quiet same-her continuity guidance into memory consolidation refinement prompts\'',
      'expect(runtimeSource).toContain(\'[ALICIZATION_MEMORY_CONSOLIDATION_SELF_BRIEF]\')',
      'expect(runtimeSource).toContain(\'Memory consolidation refinement must stay inside the same digital life project line, the same Phase 1 proving ground, and the same still-open closure work.\')',
      'expect(runtimeSource).toContain(\'Do not let consolidation refinement collapse into generic summarization, detached note cleanup, or assistant-style timeline compression.\')',
    ],
  },
  {
    entry: 'long-horizon-self-carry-boundary',
    file: './long-horizon-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that longer-lived self-carry preserves project identity landed progress still-open closure and repair-first same-her continuity pressure before outward turns reopen',
      'long-horizon-repair-first-closure-pressure',
      'refreshed-long-horizon-callback-anti-shell-carry-into-conscious-frame-and-planner',
      'keeps refreshed long-horizon callback anti-shell carry alive through the next conscious frame and final reply planning even when the live runtime project state stays thin',
    ],
  },
] as const

describe('proactive feedback dream long-horizon bridge audit', () => {
  it('keeps one explicit cold proof bridge that settled proactive feedback can stay on the same-her project line from the next dream prompt into the long-horizon self-carry boundary', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'feedback-next-dream-project-state-carry' }),
      expect.objectContaining({ entry: 'dream-autobiographical-self-brief-boundary' }),
      expect.objectContaining({ entry: 'memory-consolidation-self-brief-boundary' }),
      expect.objectContaining({ entry: 'long-horizon-self-carry-boundary' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the dream-to-long-horizon bridge claim to current runtime and long-horizon audit tests instead of only broad same-her continuity prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('registers the dream-to-long-horizon self-carry bridge as repo truth while keeping the durable writeback boundary explicit', () => {
    const coverage = resolveAlicizationProjectStateCoverage()
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(coverage.find(item => item.id === 'long-horizon-self-carry-hardening')?.proof).toContain('proactive-feedback-dream-long-horizon-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'long-horizon-self-carry-hardening')?.responsibility).toContain('dream-to-long-horizon self-carry bridge')

    expect(matrixSource).toContain('proactive-feedback-dream-long-horizon-bridge-audit.test.ts')
    expect(matrixSource).toContain('dream-to-long-horizon self-carry bridge')
    expect(auditSource).toContain('dream-to-long-horizon self-carry bridge now also ties settled proactive feedback continuity block')
    expect(auditSource).toContain('the repo still does not yet prove fully sustained noisy-desktop convergence')
  })
})
