import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'initiative-active-loop-memory-handoff-bridge',
    file: './alicization-active-loop.test.ts',
    snippets: [
      'holds initiative budget one step lower when the Phase 1 same-her closure itself is still the active project target',
      'expect(sameHerBound?.initiativeBudget ?? 1).toBeLessThan((baseline?.initiativeBudget ?? 0) - 0.03)',
      'expect(loop?.handoffTarget).toBe(\'active-memory\')',
    ],
  },
  {
    entry: 'initiative-restraint-same-her-rationale',
    file: './proactive-policy.test.ts',
    snippets: [
      'keeps proactive policy on the same unfinished digital-life line when initiative already carries stronger same-her restraint than a thin project shell',
      'Keep initiative serving the same unfinished Phase 1 digital-life closure instead of widening into a generic assistant nudge.',
      'expect(decision.consideredSignals).toContain(\'initiative.continuityRestraint\')',
    ],
  },
  {
    entry: 'memory-closure-to-restraint-bridge',
    file: './proactive-memory-boundary.test.ts',
    snippets: [
      'keeps proactive resurfacing on a rest-protective inward line when project emotional closure says care should stay quiet and inward',
      'late-night-drain closure: keep reply low-pressure, initiative rest-protective, and embodiment quiet-companionship while the line holds inward.',
      'expect(adjusted.companionshipHoldMode).toBe(\'rest-protective\')',
    ],
  },
  {
    entry: 'current-conscious-frame-project-triad',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'keeps structured project-state identity, landed progress, and still-open closure pressure inside the pre-turn conscious frame',
      'expect(frame?.projectState?.identity).toContain(\'local-first digital life project\')',
      'expect(frame?.projectState?.primaryOpenLoop).toContain(\'Memory still needs stronger end-to-end closure\')',
    ],
  },
  {
    entry: 'current-conscious-frame-emotional-closure-seam',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'keeps the active emotional closure seam visible in rich current-conscious-frame project-state carry',
      'rejoins initiative to the same-her closure seam inside the current conscious frame before the answer starts',
      'repair-before-closeness on the same living line until repair settles',
    ],
  },
  {
    entry: 'current-conscious-frame-thin-shell-repair',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'carries same-her drift-risk into current-conscious-frame pre-dialogue awareness when the available project reminder is only a thin shell',
      'does not let the compact thin closure shell survive into current-conscious-frame grounding when a broader same-her phase-1 closure line is present',
      'expect(frame?.projectState?.preDialogueAwarenessLine).not.toContain(\'same digital life | keep the closure seam explicit\')',
    ],
  },
  {
    entry: 'current-conscious-frame-resume-confirmation-boundary-grounding',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'keeps remembered host-confirmed resume confirmation boundary explicit in conscious need and speaking intention before callback wording opens outward',
      'expect(frame?.consciousNeed).toContain(\'bounded confirmation boundary\')',
      'expect(frame?.speakingIntention).toContain(\'host-confirmed-before-redispatch\')',
      'expect(frame?.speakingIntention).toContain(\'not permanent execution permission\')',
    ],
  },
] as const

describe('initiative -> current-conscious-frame project-awareness audit', () => {
  it('keeps one explicit route-level proof that initiative restraint rejoins the active self on the same Phase 1 digital-life line before the turn speaks', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'initiative-active-loop-memory-handoff-bridge' }),
      expect.objectContaining({ entry: 'initiative-restraint-same-her-rationale' }),
      expect.objectContaining({ entry: 'memory-closure-to-restraint-bridge' }),
      expect.objectContaining({ entry: 'current-conscious-frame-project-triad' }),
      expect.objectContaining({ entry: 'current-conscious-frame-emotional-closure-seam' }),
      expect.objectContaining({ entry: 'current-conscious-frame-thin-shell-repair' }),
      expect.objectContaining({ entry: 'current-conscious-frame-resume-confirmation-boundary-grounding' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the initiative-to-active-self same-her claim to current behavioral tests instead of matrix prose alone', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: initiative restraint and current-conscious-frame grounding now have a dedicated same-her route proof, while future new entrypoint families still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const proactiveSource = readFileSync(new URL('./proactive-policy.test.ts', import.meta.url), 'utf8')
    const consciousFrameSource = readFileSync(new URL('./current-conscious-frame.test.ts', import.meta.url), 'utf8')
    const activeLoopSource = readFileSync(new URL('./alicization-active-loop.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(proactiveSource).toContain(
      'Keep initiative serving the same unfinished Phase 1 digital-life closure instead of widening into a generic assistant nudge.',
    )
    expect(consciousFrameSource).toContain(
      'does not let the compact thin closure shell survive into current-conscious-frame grounding when a broader same-her phase-1 closure line is present',
    )
    expect(consciousFrameSource).toContain(
      'keeps remembered host-confirmed resume confirmation boundary explicit in conscious need and speaking intention before callback wording opens outward',
    )
    expect(activeLoopSource).toContain(
      'holds initiative budget one step lower when the Phase 1 same-her closure itself is still the active project target',
    )
  })
})
