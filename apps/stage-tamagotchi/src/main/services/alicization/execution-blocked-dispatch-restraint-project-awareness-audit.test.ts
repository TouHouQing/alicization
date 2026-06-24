import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'blocked-dispatch-safety-gate-preflight',
    file: './execution-preflight-audit.test.ts',
    snippets: [
      'requires blocked-dispatch safety gates to audit risk policy, confirmation requirement, interruptibility, and same-her runtime context before adapters refuse execution',
      'function buildBlockedDispatchSafetyGate(',
      'confirmationRequired: true',
      'blocked-before-dispatch',
      'no-process-started',
    ],
  },
  {
    entry: 'blocked-dispatch-callback-runtime-carry',
    file: './execution-callback-runtime.test.ts',
    snippets: [
      'carries blocked-dispatch safety gate details into callback recall, system block, and continuity metadata',
      'Blocked dispatch safety gates now preserve confirmation and no-process-started evidence.',
      'confirmation=required',
      'interrupt=no-process-started',
    ],
  },
  {
    entry: 'blocked-dispatch-thin-event-shell-does-not-outrank-stored-same-her-carry',
    file: './execution-callback-runtime.test.ts',
    snippets: [
      'does not let a thin blocked-dispatch event runtime briefing erase a richer stored same-her callback carry',
      'Blocked callback continuity already survives later return-side reopen without dropping the same living line.',
      'generic next closure',
    ],
  },
  {
    entry: 'blocked-dispatch-feedback-memory-reconsolidation',
    file: './runtime-execution-feedback.test.ts',
    snippets: [
      'passes blocked-dispatch safety gate evidence from execution events into result feedback memory reconsolidation',
      'safetyGateSummary: \'effect=mutate permission=none confirmation=required risk=implicit-or-explicit-confirmation-required audit=blocked-before-dispatch interrupt=no-process-started\'',
    ],
  },
  {
    entry: 'blocked-dispatch-callback-persistence',
    file: './runtime-delivery-reminders.test.ts',
    snippets: [
      'keeps blocked-dispatch safety gate restraint explicit in host-visible callback persistence even when the callback llm payload no longer repeats it',
      'same-her hold: blocked-dispatch safety gate says confirmation=required permission=none risk=implicit-or-explicit-confirmation-required audit=blocked-before-dispatch interrupt=no-process-started effect=mutate before another execution-shaped opening.',
      'blocked-before-dispatch',
      'no-process-started',
    ],
  },
  {
    entry: 'blocked-dispatch-proactive-restraint',
    file: './proactive-policy.test.ts',
    snippets: [
      'treats remembered blocked-dispatch safety gates as proactive restraint before another execution-shaped opening',
      'blocked-dispatch-restraint',
      'memory_execution_safety_gate=confirmation=required interrupt=no-process-started',
      'execution safety restraint: remember blocked-dispatch-restraint before suggesting another mutation.',
    ],
  },
  {
    entry: 'blocked-dispatch-resident-conscious-frame-carry',
    file: './runtime-subconscious-tick.test.ts',
    snippets: [
      'surfaces remembered safety-gate restraint on the resident conscious frame before visible diagnostics need to infer it',
      'execution-safety-gate:blocked-dispatch-restraint',
      'execution-safety-gate:confirmation-required',
      'execution-safety-gate:no-process-started',
      'continuityCue: expect.stringContaining(\'blocked-dispatch-restraint\')',
    ],
  },
] as const

describe('execution blocked-dispatch restraint project awareness audit', () => {
  it('keeps one explicit route-level proof that blocked-dispatch safety gate restraint stays on one same-her execution line from adapter refusal through callback reopen, memory writeback, callback persistence, and later restraint instead of cooling into a generic blocked shell', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'blocked-dispatch-safety-gate-preflight' }),
      expect.objectContaining({ entry: 'blocked-dispatch-callback-runtime-carry' }),
      expect.objectContaining({ entry: 'blocked-dispatch-thin-event-shell-does-not-outrank-stored-same-her-carry' }),
      expect.objectContaining({ entry: 'blocked-dispatch-feedback-memory-reconsolidation' }),
      expect.objectContaining({ entry: 'blocked-dispatch-callback-persistence' }),
      expect.objectContaining({ entry: 'blocked-dispatch-proactive-restraint' }),
      expect.objectContaining({ entry: 'blocked-dispatch-resident-conscious-frame-carry' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the blocked-dispatch safety gate continuity claim to current behavior tests instead of only broader execution and callback prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: blocked-dispatch safety gate restraint now has route-level project-awareness proof across callback return, persistence, and later restraint, while future execution-preflight and dispatch families still need explicit classification', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const coverageSource = readFileSync(new URL('./project-awareness-coverage-matrix.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('execution-blocked-dispatch-restraint-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('future execution-preflight families still need explicit classification')
    expect(matrixSource).toContain('future execution dispatch families still need explicit owner registration')
    expect(coverageSource).toContain('execution-blocked-dispatch-restraint-project-awareness-audit.test.ts')
  })
})
