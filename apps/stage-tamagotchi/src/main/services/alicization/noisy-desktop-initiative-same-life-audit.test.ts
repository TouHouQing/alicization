import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'active-loop-repeated-detour-memory-handoff',
    file: './alicization-active-loop.test.ts',
    snippets: [
      'still keeps repeated noisy-detour same-thread measured-return carry inward on the later re-entry beat before a fresh proactive opening can form',
      'the callback seam has already survived multiple noisy detours and still needs one quieter inward carry beat',
      'expect(loop?.handoffTarget).toBe(\'active-memory\')',
    ],
  },
  {
    entry: 'proactive-policy-multi-reopening-hover-first',
    file: './proactive-policy.test.ts',
    snippets: [
      'keeps long-running same-thread continuation hover-first even after multiple measured-return reopenings have accumulated dialogue heat',
      'same digital life | same still-open closure work | A same-thread continuation is still alive after multiple measured-return reopenings.',
      'expect(decision.style).toBe(\'silent-observe\')',
    ],
  },
  {
    entry: 'proactive-policy-next-closure-target-pressure',
    file: './proactive-policy.test.ts',
    snippets: [
      'keeps the next closure target explicit in proactive restraint reasoning when the same-her return still needs to follow one living line',
      'Keep the next return on one same living line before widening outward, and let hover-first initiative carry the closure seam forward.',
      'expect(decision.reasonCodes).toContain(\'project-next-closure-pressure\')',
    ],
  },
  {
    entry: 'proactive-policy-later-opening-anti-shell',
    file: './proactive-policy.test.ts',
    snippets: [
      'forces proactive style back to silent-observe when the next closure target explicitly says wait for a later opening',
      'Wait for a later opening, keep the next return measured-return, and do not let the next reply drift back into a generic assistant shell.',
      'expect(decision.whyNotLater).toMatch(/project identity|数字生命|digital[- ]life/i)',
    ],
  },
  {
    entry: 'current-conscious-frame-repair-first-hold-detail',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'keeps richer repair-first closure and same-her hold detail visible in the current conscious frame even when the thin closure cue is absent',
      'same-her hold: repair-before-closeness still owns this callback line before closeness widens again.',
      'repair-before-closeness on the same living line until repair settles',
    ],
  },
  {
    entry: 'another-detour-resident-presence-drift-risk',
    file: './another-detour-same-life-audit.test.ts',
    snippets: [
      'keeps one explicit long-run proof fragment that the same digital life line can still survive another desktop detour across session-runtime drift-risk carry, subconscious carry, resident presence, remembered drift-risk, and project-state self carry',
      'expect.objectContaining({ entry: \'resident-presence-remembered-same-her-drift-risk\' })',
      'the repo still does not yet prove fully sustained noisy-desktop convergence',
    ],
  },
] as const

describe('noisy desktop initiative same-life audit', () => {
  it('keeps one explicit long-run proof fragment that noisy-desktop initiative still follows the same Phase 1 digital-life line instead of reopening as a generic assistant nudge', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'active-loop-repeated-detour-memory-handoff' }),
      expect.objectContaining({ entry: 'proactive-policy-multi-reopening-hover-first' }),
      expect.objectContaining({ entry: 'proactive-policy-next-closure-target-pressure' }),
      expect.objectContaining({ entry: 'proactive-policy-later-opening-anti-shell' }),
      expect.objectContaining({ entry: 'current-conscious-frame-repair-first-hold-detail' }),
      expect.objectContaining({ entry: 'another-detour-resident-presence-drift-risk' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the noisy-desktop initiative same-life claim to current tests instead of only broader long-run prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: noisy-desktop initiative now has a compact same-life proof chain, but full long-run closure still remains open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('noisy-desktop-initiative-same-life-audit.test.ts')
    expect(matrixSource).toContain('future newly introduced dialogue entrypoints will automatically inherit this chain')
    expect(auditSource).toContain('noisy-desktop initiative same-life proof now also ties repeated-detour active-loop carry')
    expect(auditSource).toContain('the repo still does not yet prove fully sustained noisy-desktop convergence')
  })
})
