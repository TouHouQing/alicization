import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'execution-callback-persistence-resume-confirmation-boundary',
    file: './runtime.test.ts',
    snippets: [
      'keeps host-confirmed resume-before-dispatch confirmation boundaries explicit when normalizing persisted execution-callback project state for a conversation turn',
      'expect(String(normalizedProjectState?.sameHerHoldDetail ?? \'\')).toBe(resumeConfirmationHoldDetail)',
      'expect(String(normalizedAudit?.continuitySummary ?? \'\')).toContain(\'host-confirmed-before-redispatch\')',
      'expect(String(normalizedAudit?.continuitySummary ?? \'\')).toContain(\'resume-before-dispatch\')',
    ],
  },
  {
    entry: 'answer-planner-resume-confirmation-boundary-guardrail',
    file: './answer-planner.test.ts',
    snippets: [
      'treats remembered host-confirmed resume confirmation as a bounded redispatch guardrail before callback answer planning widens outward',
      'expect(planner.governingProject).toContain(\'host-confirmed-before-redispatch\')',
      'expect(planner.mustDo).toContain(\'Treat the remembered host-confirmed resume as a bounded confirmation boundary before another execution-shaped opening.\')',
      'expect(planner.mustNotDo).toContain(\'Do not let this callback answer imply permanent execution permission or reusable autonomous continuation from one confirmed resume.\')',
      'expect(planner.narrative).toContain(\'resume_confirmation_boundary:host-confirmed resume carry must stay a bounded confirmation boundary during callback answer planning.\')',
    ],
  },
  {
    entry: 'response-charter-resume-confirmation-boundary-governance',
    file: './response-charter-project-awareness-audit.test.ts',
    snippets: [
      'keeps remembered host-confirmed resume confirmation boundary explicit in visible reply governance before callback wording opens outward',
      'Remembered host-confirmed resume is still only a bounded confirmation boundary, so callback wording must not widen it into standing execution permission.',
      'Treat the remembered host-confirmed resume as a bounded confirmation boundary before another execution-shaped opening.',
      'Do not let this callback answer imply permanent execution permission or reusable autonomous continuation from one confirmed resume.',
    ],
  },
  {
    entry: 'semantic-judge-resume-confirmation-boundary-guard',
    file: './visible-reply-final-project-awareness-audit.test.ts',
    snippets: [
      'flags callback wording that widens one host-confirmed resume into standing execution permission',
      'Treat the remembered host-confirmed resume as a bounded confirmation boundary before another execution-shaped opening.',
      'Do not let this callback answer imply permanent execution permission or reusable autonomous continuation from one confirmed resume.',
    ],
  },
  {
    entry: 'critic-resume-confirmation-boundary-guard',
    file: './visible-reply-final-project-awareness-audit.test.ts',
    snippets: [
      'requires rewrite when callback wording widens one host-confirmed resume into standing execution permission',
      'Treat the remembered host-confirmed resume as a bounded confirmation boundary before another execution-shaped opening.',
      'Do not let this callback answer imply permanent execution permission or reusable autonomous continuation from one confirmed resume.',
    ],
  },
  {
    entry: 'second-pass-resume-confirmation-boundary-rewrite-guidance',
    file: './visible-reply-final-project-awareness-audit.test.ts',
    snippets: [
      'teaches second-pass rewrite to keep remembered host-confirmed resume as a bounded confirmation boundary before callback wording opens outward',
      '[EXECUTION_CALLBACK_REWRITE_GUIDANCE]',
      'Treat the remembered host-confirmed resume as a bounded confirmation boundary before another execution-shaped opening.',
      'Do not let the callback answer imply permanent execution permission or reusable autonomous continuation from one confirmed resume.',
    ],
  },
  {
    entry: 'visible-reply-resume-confirmation-boundary-final-audit-carry',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'backfills remembered host-confirmed resume confirmation boundary hold and cue into final visible reply audit from rewrite preserve lines',
      'Treat the remembered host-confirmed resume as a bounded confirmation boundary before another execution-shaped opening.',
      'Do not let this callback answer imply permanent execution permission or reusable autonomous continuation from one confirmed resume.',
      'expect(String(audit?.continuitySummary ?? \'\')).toContain(`cue=${resumeConfirmationBoundaryContinuityCue}`)',
    ],
  },
] as const

describe('execution resume confirmation visible reply boundary project awareness audit', () => {
  it('keeps one explicit route-level proof that a host-confirmed resume remains only a bounded same-her confirmation boundary from persisted callback state through answer planning, visible-reply governance, rewrite pressure, and final audit carry instead of reopening outward as standing execution permission', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'execution-callback-persistence-resume-confirmation-boundary' }),
      expect.objectContaining({ entry: 'answer-planner-resume-confirmation-boundary-guardrail' }),
      expect.objectContaining({ entry: 'response-charter-resume-confirmation-boundary-governance' }),
      expect.objectContaining({ entry: 'semantic-judge-resume-confirmation-boundary-guard' }),
      expect.objectContaining({ entry: 'critic-resume-confirmation-boundary-guard' }),
      expect.objectContaining({ entry: 'second-pass-resume-confirmation-boundary-rewrite-guidance' }),
      expect.objectContaining({ entry: 'visible-reply-resume-confirmation-boundary-final-audit-carry' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the host-confirmed resume visible-reply boundary claim to current persistence, answer-planner, response-charter, final-gating, and realization behavior tests instead of only broader callback or host-visible prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: host-confirmed resume confirmation now has route-level same-her proof across visible reply planning and final outward governance, while future execution dispatch families still need explicit owner registration and long-run proof is still incomplete', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const coverageSource = readFileSync(new URL('./project-awareness-coverage-matrix.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('execution-resume-confirmation-visible-reply-boundary-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('future execution dispatch families still need explicit owner registration')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(coverageSource).toContain('execution-resume-confirmation-visible-reply-boundary-project-awareness-audit.test.ts')
  })
})
