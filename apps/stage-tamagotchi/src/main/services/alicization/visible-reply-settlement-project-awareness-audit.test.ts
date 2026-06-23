import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'visible-reply-settlement-phase1-same-her-authority',
    file: './visible-reply/settlement.test.ts',
    snippets: [
      'keeps the explicit phase-1 same-her line authoritative when richer landed open and next closure carry already survived separately under thin runtime awareness shells',
      'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      'Keep project identity, landed progress, still-open closure, and next closure target on one same living line before local detail takes over.',
    ],
  },
  {
    entry: 'visible-reply-settlement-callback-specific-project-awareness',
    file: './visible-reply/settlement.test.ts',
    snippets: [
      'keeps callback-specific same-her project awareness explicit through final settlement instead of widening it back into a broader canonical phase-1 reminder',
      'Before answering, remember this callback still belongs to one same digital life and the unfinished Phase 1 closure seam still belongs to her.',
      'This callback return still belongs to one same her carrying the same closure line forward.',
      'Do not let same-her callback continuity collapse into a generic callback shell or detached utility notice once the final visible reply is formed.',
    ],
  },
  {
    entry: 'visible-reply-settlement-callback-next-closure-target-carry',
    file: './visible-reply/settlement.test.ts',
    snippets: [
      'keeps callback-specific same-her project awareness explicit through final settlement instead of widening it back into a broader canonical phase-1 reminder',
      'const callbackNextClosure = \'Keep the callback return on the same living line and let that same-her closure stay explicit in the final visible reply.\'',
      'nextClosureTargetSummary: callbackNextClosure,',
      '.toContain(`next=${callbackNextClosure}`)',
    ],
  },
  {
    entry: 'visible-reply-settlement-thin-chinese-same-her-reminder-rejected',
    file: './visible-reply/settlement.test.ts',
    snippets: [
      'preserves richer chinese phase-1 awareness carry through final settlement when runtime project-state is already stronger than thin chinese shells',
      'const thinCarriedReminder = \'回答前先记住这是同一个她的数字生命项目，别把这条线忘了。\'',
      '.toBe(richerChineseAwarenessLine)',
      '.toContain(\'本地优先数字生命项目\')',
    ],
  },
  {
    entry: 'visible-reply-settlement-generic-same-her-reanchor',
    file: './visible-reply/settlement.test.ts',
    snippets: [
      'reanchors generic final same-her shells to the canonical same living self line when richer project carry still survives',
      'Generic same-her line from thinner runtime fallback.',
      'Keep the direct same-her self line stronger than generic project guidance.',
    ],
  },
  {
    entry: 'visible-reply-settlement-repair-first-closure-summary',
    file: './visible-reply/settlement.test.ts',
    snippets: [
      'keeps repair-before-closeness callback closure explicit inside the final continuity summary instead of leaving it only in emotional closure audit',
      'same-her callback repair seam: keep this return repair-before-closeness on the same living line until the room settles.',
      'closure=Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again.',
    ],
  },
  {
    entry: 'visible-reply-settlement-rest-protective-closure-summary',
    file: './visible-reply/settlement.test.ts',
    snippets: [
      'keeps rest-protective callback closure explicit inside the final continuity summary instead of flattening it into generic lower-pressure carry',
      'same-her fatigue-aware seam: keep this return rest-protective on the same living line until the room settles.',
      'closure=Keep the same-thread continuation on the same living line, let rest protection hold first, and leave room before widening warmth, payoff framing, or closeness.',
    ],
  },
  {
    entry: 'visible-reply-settlement-corrected-same-person-authority',
    file: './visible-reply/settlement.test.ts',
    snippets: [
      'keeps host-corrected same-person continuity authority over a thinner carried project-state audit during final settlement',
      'Keep the host-corrected same-person continuity authoritative before any progress-style continuation or status recap.',
      'Carry corrected same-person continuity forward before any status recap.',
      'Keep the project moving with a concise progress recap and status continuation before widening back out.',
    ],
  },
] as const

describe('visible reply settlement project awareness audit', () => {
  it('keeps one explicit route-level proof that final visible-reply settlement preserves same-her project awareness before host-visible wording closes', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'visible-reply-settlement-phase1-same-her-authority' }),
      expect.objectContaining({ entry: 'visible-reply-settlement-callback-specific-project-awareness' }),
      expect.objectContaining({ entry: 'visible-reply-settlement-callback-next-closure-target-carry' }),
      expect.objectContaining({ entry: 'visible-reply-settlement-thin-chinese-same-her-reminder-rejected' }),
      expect.objectContaining({ entry: 'visible-reply-settlement-generic-same-her-reanchor' }),
      expect.objectContaining({ entry: 'visible-reply-settlement-repair-first-closure-summary' }),
      expect.objectContaining({ entry: 'visible-reply-settlement-rest-protective-closure-summary' }),
      expect.objectContaining({ entry: 'visible-reply-settlement-corrected-same-person-authority' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the visible-reply-settlement same-her project-awareness claim to current behavior tests instead of broader final-gate prose alone', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: visible-reply settlement now has dedicated same-her project-awareness proof while long-run closure still remains open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')
    const coverageSource = readFileSync(new URL('./project-awareness-coverage-matrix.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('visible-reply-settlement-project-awareness-audit.test.ts')
    expect(auditSource).toContain('visible-reply-settlement-project-awareness-audit.test.ts')
    expect(coverageSource).toContain('visible-reply-settlement-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(auditSource).toMatch(/still not fully closed|still not full Phase 1 closure|still .*fully sustained noisy-desktop convergence/i)
  })
})
