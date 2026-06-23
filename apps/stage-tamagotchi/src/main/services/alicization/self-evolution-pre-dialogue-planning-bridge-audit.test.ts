import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'self-evolution-durable-self-recognition-anchor',
    file: './self-evolution-durable-self-recognition-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit colder bridge that self-evolution remembered emotional carry can stay on the same-her line through durable long-horizon self-carry, autobiographical self, and quick-reply self-recognition, while now also keeping callback next-closure-target carry explicit at the reopened visible-reply segment instead of preserving inward remembered-emotional carry while silently losing the same living callback closure target before the same living line clearly recognizes herself again before the next outward turn',
      'expect.objectContaining({ entry: \'quick-reply-closure-summary-self-recognition-anchor\' })',
      'self-evolution same-her carry now reaches durable self-recognition before the next outward turn, but still does not prove full long-run closure',
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
    entry: 'current-conscious-frame-same-her-grounding-anchor',
    file: './initiative-current-conscious-frame-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that initiative restraint rejoins the active self on the same Phase 1 digital-life line before the turn speaks',
      'expect.objectContaining({ entry: \'current-conscious-frame-project-triad\' })',
      'expect.objectContaining({ entry: \'current-conscious-frame-thin-shell-repair\' })',
    ],
  },
  {
    entry: 'current-conscious-frame-turn-shaping-anchor',
    file: './current-conscious-frame-turn-shaping-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that current-conscious-frame turn shaping preserves observation restraint, dialogue-first selfhood, quiet-companionship rest carry, runtime cue precedence, personality regime care framing, and same-line callback continuity before answer planning widens',
      'expect.objectContaining({ entry: \'current-conscious-frame-chinese-same-line-callback-continuation\' })',
      'current-conscious-frame turn shaping now has route-level same-her proof',
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

describe('self evolution pre dialogue planning bridge audit', () => {
  it('keeps one explicit colder bridge that self-evolution durable self-recognition can stay on the same-her line through current-conscious-frame grounding and answer-planner pre-dialogue closure planning, while now also keeping callback next-closure-target carry explicit at the reopened visible-reply segment instead of preserving host-facing self-recognition while silently losing the same living callback closure target before the formally planned outward turn keeps the same living line explicit', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'self-evolution-durable-self-recognition-anchor' }),
      expect.objectContaining({ entry: 'long-horizon-to-conscious-frame-anti-shell-anchor' }),
      expect.objectContaining({ entry: 'current-conscious-frame-same-her-grounding-anchor' }),
      expect.objectContaining({ entry: 'current-conscious-frame-turn-shaping-anchor' }),
      expect.objectContaining({ entry: 'answer-planner-project-closure-route-anchor' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the colder self-evolution to pre-dialogue planning claim to current cold audits instead of only broader quick-reply or long-horizon prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: self-evolution same-her carry now reaches current-conscious-frame grounding and answer-planner closure planning before the turn opens outward, but still does not prove full long-run closure', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(matrixSource).toContain('self-evolution pre-dialogue planning bridge')
    expect(matrixSource).toContain('self-evolution-pre-dialogue-planning-bridge-audit.test.ts')
    expect(matrixSource).toContain('self-evolution-durable-self-recognition-bridge-audit.test.ts')
    expect(matrixSource).toContain('proactive-feedback-long-horizon-conscious-frame-bridge-audit.test.ts')
    expect(matrixSource).toContain('initiative-current-conscious-frame-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('current-conscious-frame-turn-shaping-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('answer-planner-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('self-evolution pre-dialogue planning bridge')
    expect(auditSource).toContain('self-evolution pre-dialogue planning bridge now also keeps callback next-closure-target carry explicit')
    expect(auditSource).toContain('self-evolution durable self-recognition, current-conscious-frame same-her grounding, current-conscious-frame turn shaping, and answer-planner same-her closure planning')
  })
})
