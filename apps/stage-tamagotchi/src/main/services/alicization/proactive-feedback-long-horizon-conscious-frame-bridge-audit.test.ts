import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateCoverage } from './project-state-brief'

const proofRows = [
  {
    entry: 'post-answer-dream-carry-fragment',
    file: './proactive-feedback-post-answer-dream-carry-audit.test.ts',
    snippets: [
      'keeps one explicit cold proof fragment that settled proactive feedback can survive the next project-state answer, one more noisy detour, and the next dream prompt without dropping the same-her project line',
      'feedback-next-dream-project-state-carry',
      'same-her-project-state-answer-contract',
    ],
  },
  {
    entry: 'dream-to-long-horizon-bridge',
    file: './proactive-feedback-dream-long-horizon-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit cold proof bridge that settled proactive feedback can stay on the same-her project line from the next dream prompt into the long-horizon self-carry boundary',
      'long-horizon-self-carry-boundary',
      'refreshed-long-horizon-callback-anti-shell-carry-into-conscious-frame-and-planner',
    ],
  },
  {
    entry: 'long-horizon-boundary-keeps-anti-shell-carry-live',
    file: './long-horizon-project-awareness-audit.test.ts',
    snippets: [
      'refreshed-long-horizon-callback-anti-shell-carry-into-conscious-frame-and-planner',
      'keeps refreshed long-horizon callback anti-shell carry alive through the next conscious frame and final reply planning even when the live runtime project state stays thin',
    ],
  },
  {
    entry: 'current-conscious-frame-anti-shell-reexpansion',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'same-her callback closure seam',
      'A generic callback shell would thin the callback continuity back into detached utility narration.',
      'Project pre-dialogue awareness line:',
      'Project same-her self line:',
      'Project same-her drift risk:',
    ],
  },
  {
    entry: 'answer-planner-final-reply-anti-shell-carry',
    file: './answer-planner.test.ts',
    snippets: [
      'keeps refreshed long-horizon callback anti-shell carry alive through the next conscious frame and final reply planning even when the live runtime project state stays thin',
      'expect(frame?.projectState?.sameHerSelfLine).toContain(\'Same Phase 1 digital life\')',
      'expect(frame?.projectState?.sameHerDriftRisk).toContain(\'detached project status talk\')',
      'expect(planner.governingProject).not.toContain(\'Generic next closure shell\')',
    ],
  },
] as const

describe('proactive feedback long-horizon conscious-frame bridge audit', () => {
  it('keeps one explicit cold proof bridge that settled proactive feedback can re-enter the next conscious frame and final reply planning after the long-horizon self-carry boundary', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'post-answer-dream-carry-fragment' }),
      expect.objectContaining({ entry: 'dream-to-long-horizon-bridge' }),
      expect.objectContaining({ entry: 'long-horizon-boundary-keeps-anti-shell-carry-live' }),
      expect.objectContaining({ entry: 'current-conscious-frame-anti-shell-reexpansion' }),
      expect.objectContaining({ entry: 'answer-planner-final-reply-anti-shell-carry' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the long-horizon-to-conscious-frame bridge claim to current route tests instead of only broader same-her continuity prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('registers the long-horizon-to-conscious-frame anti-shell bridge as repo truth while keeping durable long-run closure explicitly open', () => {
    const coverage = resolveAlicizationProjectStateCoverage()
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(coverage.find(item => item.id === 'long-horizon-self-carry-hardening')?.proof).toContain('proactive-feedback-long-horizon-conscious-frame-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'long-horizon-self-carry-hardening')?.responsibility).toContain('long-horizon-to-conscious-frame anti-shell bridge')

    expect(matrixSource).toContain('proactive-feedback-long-horizon-conscious-frame-bridge-audit.test.ts')
    expect(matrixSource).toContain('long-horizon-to-conscious-frame anti-shell bridge')
    expect(auditSource).toContain('long-horizon-to-conscious-frame anti-shell bridge now also ties settled proactive feedback continuity block')
    expect(auditSource).toContain('the repo still does not yet prove fully sustained noisy-desktop convergence')
  })
})
