import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'resume-confirmed-thread-project-triad-carry',
    file: './executor-runtime.test.ts',
    snippets: [
      'keeps project identity, current phase, and still-open closure explicit when resuming a confirmed execution thread',
      'project_identity=Alicization is a local-first digital life project building one continuous "her" on the host computer.',
      'project_phase=Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      'primary_open_loop=Memory still needs stronger end-to-end closure across turns so Project identity carry remains explicit.',
      'project_awareness=Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
    ],
  },
  {
    entry: 'resume-confirmation-callback-runtime-carry',
    file: './execution-callback-runtime.test.ts',
    snippets: [
      'carries host-confirmed resume confirmation boundaries into callback recall, system block, and continuity metadata',
      'host-confirmed-before-redispatch',
      'resume-before-dispatch',
      'process-not-yet-restarted',
      'resumeConfirmationSummary: expect.stringContaining(\'resume-before-dispatch\')',
    ],
  },
  {
    entry: 'resume-confirmation-thin-shell-does-not-outrank-event-carry',
    file: './execution-callback-runtime.test.ts',
    snippets: [
      'does not let a thin stored thread shell outrank richer host-confirmed resume event project carry in callback project awareness',
      'Host-confirmed resume writes an execution event before redispatch so richer event-side project carry survives callback recall.',
      'Keep host-confirmed redispatch and later callback recall on one same-her Phase 1 line.',
      'project continuity exists',
      'generic next closure',
    ],
  },
  {
    entry: 'resume-confirmation-delivery-queue-carry',
    file: './runtime-execution-delivery.test.ts',
    snippets: [
      'folds host-confirmed resume-before-dispatch confirmation boundaries into queued execution delivery project state so later callback persistence keeps the bounded redispatch line visible',
      'same-her hold: execution-resume-confirmation approval=host-confirmed',
      'host-confirmed-before-redispatch',
      'resume-before-dispatch',
      'process-not-yet-restarted',
    ],
  },
  {
    entry: 'resume-confirmation-callback-persistence',
    file: './runtime-delivery-reminders.test.ts',
    snippets: [
      'keeps host-confirmed resume confirmation boundaries explicit in host-visible callback persistence even when the callback llm payload no longer repeats them',
      'same-her hold: execution-resume-confirmation approval=host-confirmed confirmation=host-confirmed-before-redispatch audit=resume-before-dispatch interrupt=process-not-yet-restarted affirmation=medium-risk-proactive-action-requires-affirmation Keep this as a bounded confirmation boundary before another execution-shaped opening.',
      'host-confirmed-before-redispatch',
      'resume-before-dispatch',
      'process-not-yet-restarted',
    ],
  },
  {
    entry: 'resume-confirmation-feedback-memory-reconsolidation',
    file: './runtime-execution-feedback.test.ts',
    snippets: [
      'passes host-confirmed resume evidence from execution events into result feedback memory reconsolidation',
      'confirmationBoundary: \'host-confirmed-before-redispatch\'',
      'auditability: \'resume-before-dispatch\'',
      'interruptibility: \'process-not-yet-restarted\'',
      'resumeConfirmationSummary: \'approval=host-confirmed previous=needs-affirmation resumed=planned previousPermission=none permission=explicit effect=mutate risk=medium confirmation=host-confirmed-before-redispatch audit=resume-before-dispatch interrupt=process-not-yet-restarted affirmation=medium-risk-proactive-action-requires-affirmation\'',
    ],
  },
  {
    entry: 'resume-confirmation-proactive-restraint',
    file: './proactive-policy.test.ts',
    snippets: [
      'treats remembered host-confirmed resume as a bounded confirmation memory instead of permanent execution permission',
      'execution-resume-confirmation:host-confirmed-before-redispatch',
      'memory_execution_resume_confirmation=approval=host-confirmed audit=resume-before-dispatch interrupt=process-not-yet-restarted',
      'execution resume confirmation: remember host-confirmed-before-redispatch as a bounded confirmation boundary, not as permanent autonomous permission.',
      'expect(decision.whyNow).toMatch(/host-confirmed|resume-before-dispatch|confirmation boundary|确认边界/u)',
    ],
  },
  {
    entry: 'resume-confirmation-resident-conscious-frame-carry',
    file: './runtime-subconscious-tick.test.ts',
    snippets: [
      'keeps host-confirmed resume memory as a measured-return boundary instead of reusable execution permission',
      'surfaces remembered host-confirmed resume as a resident confirmation boundary before another execution-shaped opening',
      'host-confirmed-before-redispatch',
      'resume-before-dispatch',
      'execution-resume-confirmation:process-not-yet-restarted',
    ],
  },
  {
    entry: 'resume-confirmation-long-horizon-boundary-carry',
    file: './long-horizon-memory.test.ts',
    snippets: [
      'turns reconsolidated host-confirmed resume-before-dispatch into a durable long-horizon confirmation boundary cue',
      'Host-confirmed resume before redispatch should stay a bounded confirmation boundary instead of becoming generic autonomous continuation.',
      'Remember host-confirmed-before-redispatch as a bounded confirmation boundary before another execution-shaped opening.',
      'resume-before-dispatch',
      'process-not-yet-restarted',
    ],
  },
  {
    entry: 'resume-confirmation-autobiographical-doctrine',
    file: './autobiographical-self.test.ts',
    snippets: [
      'treats remembered host-confirmed resume confirmation as a bounded redispatch boundary instead of permanent execution permission in relationship doctrine',
      'Remembered execution resume confirmation boundary: approval=host-confirmed confirmation=host-confirmed-before-redispatch audit=resume-before-dispatch interrupt=process-not-yet-restarted Keep this as a bounded confirmation boundary before another execution-shaped opening.',
      'That relationship era kept one confirmed resume from turning into standing permission.',
      'A single confirmation should stay bounded until the next boundary is real again.',
      'bounded confirmation boundary',
    ],
  },
] as const

describe('execution resume confirmation boundary project awareness audit', () => {
  it('keeps one explicit route-level proof that host-confirmed resume stays a bounded same-her confirmation boundary from redispatch through callback recall, queued delivery, callback persistence, feedback reconsolidation, later restraint, and longer-horizon self memory instead of widening into permanent execution permission', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'resume-confirmed-thread-project-triad-carry' }),
      expect.objectContaining({ entry: 'resume-confirmation-callback-runtime-carry' }),
      expect.objectContaining({ entry: 'resume-confirmation-thin-shell-does-not-outrank-event-carry' }),
      expect.objectContaining({ entry: 'resume-confirmation-delivery-queue-carry' }),
      expect.objectContaining({ entry: 'resume-confirmation-callback-persistence' }),
      expect.objectContaining({ entry: 'resume-confirmation-feedback-memory-reconsolidation' }),
      expect.objectContaining({ entry: 'resume-confirmation-proactive-restraint' }),
      expect.objectContaining({ entry: 'resume-confirmation-resident-conscious-frame-carry' }),
      expect.objectContaining({ entry: 'resume-confirmation-long-horizon-boundary-carry' }),
      expect.objectContaining({ entry: 'resume-confirmation-autobiographical-doctrine' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the host-confirmed resume confirmation-boundary claim to current behavior tests instead of only broader execution-preflight, callback, and memory prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: host-confirmed resume confirmation now has route-level same-her proof across callback carry, persistence, later restraint, and longer-horizon memory, while future execution-preflight families still need explicit classification and future execution dispatch families still need explicit owner registration', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const coverageSource = readFileSync(new URL('./project-awareness-coverage-matrix.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('execution-resume-confirmation-boundary-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('future execution-preflight families still need explicit classification')
    expect(matrixSource).toContain('future execution dispatch families still need explicit owner registration')
    expect(coverageSource).toContain('execution-resume-confirmation-boundary-project-awareness-audit.test.ts')
  })
})
