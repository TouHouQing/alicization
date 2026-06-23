import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'reply-deliberator-project-status-closure-triad-carry',
    file: './reply-deliberator.test.ts',
    snippets: [
      'keeps landed progress, still-open closure, and next closure explicit in visible-reply deliberation for direct project-status turns',
      'Project-status summary:',
      'landed=continuity, memory, and execution already land together',
      'open=memory, initiative, and embodiment still need stronger closure',
      'next=keep identity, progr',
    ],
  },
  {
    entry: 'reply-deliberator-same-thread-project-followthrough-carry',
    file: './reply-deliberator.test.ts',
    snippets: [
      'keeps landed progress, still-open closure, and next closure explicit for same-her project follow-through turns that only ask to continue the line',
      'This is still the same digital life line.',
      'same living line',
      'still-open life loop',
      'next closure',
    ],
  },
  {
    entry: 'reply-deliberator-live-project-awareness-opening-beat',
    file: './reply-deliberator.test.ts',
    snippets: [
      'lets explicit pre-dialogue project awareness upgrade the opening beat so project self-knowledge lands before widening',
      'lets companion briefing project awareness upgrade the opening beat when no fresher pre-dialogue awareness line is present',
      'Open by keeping the live project awareness explicit first, then stay on the same living line before widening.',
    ],
  },
  {
    entry: 'reply-deliberator-live-drift-risk-priority',
    file: './reply-deliberator.test.ts',
    snippets: [
      'keeps an explicit live same-her drift risk from the conscious frame instead of falling back to the canonical brief wording',
      'LIVE DRIFT RISK',
      'generic project shell',
    ],
  },
  {
    entry: 'reply-deliberator-thin-shell-same-her-precedence',
    file: './reply-deliberator.test.ts',
    snippets: [
      'does not let thin live landed-open-next project shells outrank richer canonical same-her closure pressure in reply deliberation',
      'sameHerSelfLine: \'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.\',',
      'expect(state?.whyThisReplyNow).toContain(\'Memory still needs stronger end-to-end closure\')',
      'expect(state?.whyThisReplyNow).toContain(\'Keep extending cross-modal same-her proof\')',
      'expect(state?.whyThisReplyNow).not.toContain(\'Project continuity exists.\')',
    ],
  },
  {
    entry: 'reply-deliberator-summary-only-same-her-project-carry',
    file: './reply-deliberator.test.ts',
    snippets: [
      'keeps summary-only richer same-her project truth alive in reply deliberation when current conscious frame no longer carries legacy project-state fields',
      'does not let empty legacy project-state strings shadow richer summary-only same-her carry in reply deliberation',
      'audible-body same-her repair',
      'cross-modal same-her proof',
      'same-her audible-body line can disappear before face and motion finish rejoining',
    ],
  },
] as const

describe('reply deliberator project awareness audit', () => {
  it('keeps one explicit route-level proof that reply-deliberator preserves same-her project awareness before outward reply planning widens', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'reply-deliberator-project-status-closure-triad-carry' }),
      expect.objectContaining({ entry: 'reply-deliberator-same-thread-project-followthrough-carry' }),
      expect.objectContaining({ entry: 'reply-deliberator-live-project-awareness-opening-beat' }),
      expect.objectContaining({ entry: 'reply-deliberator-live-drift-risk-priority' }),
      expect.objectContaining({ entry: 'reply-deliberator-thin-shell-same-her-precedence' }),
      expect.objectContaining({ entry: 'reply-deliberator-summary-only-same-her-project-carry' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the reply-deliberator same-her project-awareness claim to current behavior tests instead of broader downstream-reply prose alone', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: reply-deliberator now has dedicated same-her project-awareness proof while long-run closure still remains open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')
    const coverageSource = readFileSync(new URL('./project-awareness-coverage-matrix.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('reply-deliberator-project-awareness-audit.test.ts')
    expect(auditSource).toContain('reply-deliberator-project-awareness-audit.test.ts')
    expect(coverageSource).toContain('reply-deliberator-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(auditSource).toMatch(/still not fully closed|still not full Phase 1 closure|still .*fully sustained noisy-desktop convergence/i)
  })
})
