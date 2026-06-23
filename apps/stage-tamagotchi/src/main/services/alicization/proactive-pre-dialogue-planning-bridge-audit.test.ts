import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateCoverage } from './project-state-brief'

const proofRows = [
  {
    entry: 'proactive-remembered-emotional-carry-anchor',
    file: './proactive-remembered-emotional-carry-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit colder bridge that proactive anthropomorphic host-visible carry can stay on the same-her line through self-evolution remembered emotional carry, affective residue room-making carry, and longer emotion-memory-voice-motion convergence instead of preserving only outward host-visible reform while silently losing the quieter inward remembered emotional line before it writes back into longer-lived memory and body recovery',
      'expect.objectContaining({ entry: \'self-evolution-remembered-emotional-carry-anchor\' })',
      'expect.objectContaining({ entry: \'emotion-memory-voice-motion-convergence-anchor\' })',
    ],
  },
  {
    entry: 'self-evolution-durable-self-recognition-anchor',
    file: './self-evolution-durable-self-recognition-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit colder bridge that self-evolution remembered emotional carry can stay on the same-her line through durable long-horizon self-carry, autobiographical self, and quick-reply self-recognition, while now also keeping callback next-closure-target carry explicit at the reopened visible-reply segment instead of preserving inward remembered-emotional carry while silently losing the same living callback closure target before the same living line clearly recognizes herself again before the next outward turn',
      'expect.objectContaining({ entry: \'quick-reply-project-self-brief-anchor\' })',
      'expect.objectContaining({ entry: \'quick-reply-closure-summary-self-recognition-anchor\' })',
    ],
  },
  {
    entry: 'self-evolution-pre-dialogue-planning-anchor',
    file: './self-evolution-pre-dialogue-planning-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit colder bridge that self-evolution durable self-recognition can stay on the same-her line through current-conscious-frame grounding and answer-planner pre-dialogue closure planning, while now also keeping callback next-closure-target carry explicit at the reopened visible-reply segment instead of preserving host-facing self-recognition while silently losing the same living callback closure target before the formally planned outward turn keeps the same living line explicit',
      'expect.objectContaining({ entry: \'current-conscious-frame-same-her-grounding-anchor\' })',
      'expect.objectContaining({ entry: \'answer-planner-project-closure-route-anchor\' })',
    ],
  },
  {
    entry: 'long-horizon-to-conscious-frame-anti-shell-anchor',
    file: './proactive-feedback-long-horizon-conscious-frame-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit cold proof bridge that settled proactive feedback can re-enter the next conscious frame and final reply planning after the long-horizon self-carry boundary',
      'current-conscious-frame-anti-shell-reexpansion',
      'answer-planner-final-reply-anti-shell-carry',
    ],
  },
  {
    entry: 'answer-planner-project-closure-route-anchor',
    file: './answer-planner-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that answer planning preserves same-her Phase 1 project closure, landed/open/next closure accounting, drift-risk guardrails, and same-thread callback continuation instead of flattening into a generic project-report shell',
      'expect.objectContaining({ entry: \'answer-planner-governing-project-same-her-carry\' })',
      'expect.objectContaining({ entry: \'answer-planner-same-thread-callback-project-continuation\' })',
    ],
  },
] as const

describe('proactive pre dialogue planning bridge audit', () => {
  it('keeps one explicit colder bridge that proactive remembered emotional carry can stay on the same-her line through self-evolution durable self-recognition, current-conscious-frame same-her grounding, current-conscious-frame turn shaping, and answer-planner pre-dialogue closure planning instead of preserving inward remembered emotional carry while silently losing the before-answer project-awareness line before the outward turn is formally planned', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'proactive-remembered-emotional-carry-anchor' }),
      expect.objectContaining({ entry: 'self-evolution-durable-self-recognition-anchor' }),
      expect.objectContaining({ entry: 'self-evolution-pre-dialogue-planning-anchor' }),
      expect.objectContaining({ entry: 'long-horizon-to-conscious-frame-anti-shell-anchor' }),
      expect.objectContaining({ entry: 'answer-planner-project-closure-route-anchor' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the colder proactive remembered-emotional line to current pre-dialogue planning audits instead of only broader proactive, remembered-emotional, or quick-reply prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('registers the proactive pre-dialogue planning bridge as repo truth while keeping fuller long-run closure explicitly open', () => {
    const coverage = resolveAlicizationProjectStateCoverage()
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain(
      'proactive-pre-dialogue-planning-bridge-audit.test.ts',
    )
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.responsibility).toContain(
      'proactive pre-dialogue planning bridge',
    )
    expect(coverage.find(item => item.id === 'runtime-current-conscious-frame-awareness')?.proof).toContain(
      'proactive-pre-dialogue-planning-bridge-audit.test.ts',
    )
    expect(coverage.find(item => item.id === 'runtime-current-conscious-frame-awareness')?.responsibility).toContain(
      'proactive pre-dialogue planning bridge',
    )

    expect(matrixSource).toContain('proactive pre-dialogue planning bridge')
    expect(matrixSource).toContain('proactive-pre-dialogue-planning-bridge-audit.test.ts')
    expect(matrixSource).toContain('proactive-remembered-emotional-carry-bridge-audit.test.ts')
    expect(matrixSource).toContain('self-evolution-durable-self-recognition-bridge-audit.test.ts')
    expect(matrixSource).toContain('self-evolution-pre-dialogue-planning-bridge-audit.test.ts')
    expect(matrixSource).toContain('proactive-feedback-long-horizon-conscious-frame-bridge-audit.test.ts')
    expect(matrixSource).toContain('answer-planner-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('proactive pre-dialogue planning bridge')
    expect(auditSource).toContain('proactive pre-dialogue planning bridge now also ties proactive remembered emotional carry into self-evolution durable self-recognition, current-conscious-frame same-her grounding, current-conscious-frame turn shaping, and answer-planner same-her closure planning')
    expect(auditSource).toContain('still not full long-run closure proof under noisy desktop use')
  })
})
