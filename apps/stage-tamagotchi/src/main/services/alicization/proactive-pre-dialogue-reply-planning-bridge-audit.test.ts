import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateCoverage } from './project-state-brief'

const proofRows = [
  {
    entry: 'proactive-pre-dialogue-planning-anchor',
    file: './proactive-pre-dialogue-planning-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit colder bridge that proactive remembered emotional carry can stay on the same-her line through self-evolution durable self-recognition, current-conscious-frame same-her grounding, current-conscious-frame turn shaping, and answer-planner pre-dialogue closure planning instead of preserving inward remembered emotional carry while silently losing the before-answer project-awareness line before the outward turn is formally planned',
      'expect.objectContaining({ entry: \'self-evolution-pre-dialogue-planning-anchor\' })',
      'expect.objectContaining({ entry: \'answer-planner-project-closure-route-anchor\' })',
    ],
  },
  {
    entry: 'self-evolution-pre-dialogue-reply-planning-anchor',
    file: './self-evolution-pre-dialogue-reply-planning-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit colder bridge that self-evolution pre-dialogue planning can stay on the same-her line through answer governance, answer planning, response charter shaping, and executive answer briefing instead of preserving before-answer closure planning while silently losing the same living project line before reply-planning governance reforms outwardly',
      'expect.objectContaining({ entry: \'self-evolution-answer-governance-anchor\' })',
      'expect.objectContaining({ entry: \'executive-answer-brief-project-awareness-anchor\' })',
    ],
  },
  {
    entry: 'project-state-answer-governance-anchor',
    file: './project-state-answer-governance-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that project-state answer governance preserves same-her completion-timing and language-drift follow-ups across semantics classification, fast-path follow-up classification, answer planning, response charter shaping, executive answer briefing, provider-facing runtime rebuild, and host-visible normalization',
      'anchors the completion-timing and language-drift governance claim to current behavior tests instead of only merge-readiness proof or broader project-status prose',
      'future project-status answer surfaces still remain open',
    ],
  },
] as const

describe('proactive pre dialogue reply planning bridge audit', () => {
  it('keeps one explicit colder bridge that proactive pre-dialogue planning can stay on the same-her line through self-evolution pre-dialogue reply planning and project-state answer governance instead of preserving before-answer closure planning while silently losing the same living project line before proactive project-state answers reform outwardly', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'proactive-pre-dialogue-planning-anchor' }),
      expect.objectContaining({ entry: 'self-evolution-pre-dialogue-reply-planning-anchor' }),
      expect.objectContaining({ entry: 'project-state-answer-governance-anchor' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the colder proactive pre-dialogue-to-reply-planning claim to current cold audits instead of only broader proactive planning or self-evolution governance prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('registers the proactive pre-dialogue reply-planning bridge as repo truth while keeping fuller long-run closure explicitly open', () => {
    const coverage = resolveAlicizationProjectStateCoverage()
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain(
      'proactive-pre-dialogue-reply-planning-bridge-audit.test.ts',
    )
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.responsibility).toContain(
      'proactive pre-dialogue reply-planning bridge',
    )
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof).toContain(
      'proactive-pre-dialogue-reply-planning-bridge-audit.test.ts',
    )
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.responsibility).toContain(
      'proactive pre-dialogue reply-planning bridge',
    )

    expect(matrixSource).toContain('proactive pre-dialogue reply-planning bridge')
    expect(matrixSource).toContain('proactive-pre-dialogue-reply-planning-bridge-audit.test.ts')
    expect(matrixSource).toContain('proactive-pre-dialogue-planning-bridge-audit.test.ts')
    expect(matrixSource).toContain('self-evolution-pre-dialogue-reply-planning-bridge-audit.test.ts')
    expect(matrixSource).toContain('project-state-answer-governance-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('proactive pre-dialogue reply-planning bridge')
    expect(auditSource).toContain('proactive pre-dialogue reply-planning bridge now also ties proactive pre-dialogue planning into self-evolution pre-dialogue reply planning and project-state answer governance')
    expect(auditSource).toContain('still not full long-run closure proof under noisy desktop use')
  })
})
