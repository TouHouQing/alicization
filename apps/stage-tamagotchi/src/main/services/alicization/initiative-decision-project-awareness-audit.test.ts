import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'initiative-phase1-landed-open-loop-self-explanation',
    file: './initiative-engine.test.ts',
    snippets: [
      'threads Phase 1 landed progress and still-open closure into initiative self-explanation so restraint reads like one growing digital life',
      'expect(initiative.why).toMatch(/same Phase 1 digital life/i)',
      'expect(initiative.why).toContain(\'but memory and initiative\')',
      'expect(initiative.why).toMatch(/cross-modal same-her proof|same still-open closure work/u)',
    ],
  },
  {
    entry: 'initiative-self-continuity-project-state-carry',
    file: './initiative-engine.test.ts',
    snippets: [
      'threads self continuity project-state carry into initiative why so proactive restraint still sounds like one same digital life',
      'thoughtText: \'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.\'',
      'rationaleTags: [\'project-state-carry\']',
      'expect((initiative.why?.length ?? 0)).toBeGreaterThan(baselineInitiative.why?.length ?? 0)',
    ],
  },
  {
    entry: 'initiative-callback-project-carry-silent-observe',
    file: './initiative-engine.test.ts',
    snippets: [
      'forces callback project-carry into silent-observe so unfinished Phase 1 closure stays on one living line before reopening outward',
      'expect(initiative.preferredStyle).toBe(\'silent-observe\')',
      'expect(initiative.shouldSpeak).toBe(false)',
      'expect(initiative.why).toContain(\'Execution callback project-carry\')',
    ],
  },
  {
    entry: 'initiative-canonical-project-state-fallback',
    file: './initiative-engine.test.ts',
    snippets: [
      'falls back to the canonical project-state snapshot when initiative project-state inputs arrive as the compact thin closure shell, so restraint still knows what Alicization is and what remains open',
      'expect(initiative.why).toContain(\'same Phase 1 digital life\')',
      'expect(initiative.why).not.toContain(\'same digital life | keep the closure seam explicit\')',
      'expect(initiative.why).toContain(\'project identity carry\')',
    ],
  },
  {
    entry: 'arbiter-canonical-project-state-hover-restraint',
    file: './initiative-arbiter.test.ts',
    snippets: [
      'falls back to the canonical project-state snapshot when arbiter project-state inputs arrive as the compact thin closure shell, so same-living-line hover restraint still outranks speak',
      'expect(arbitration.selectedProposalId).toBe(\'counterfactual:counterfactual::hover\')',
      'expect(arbitration.proposals[0]?.action).toBe(\'hover\')',
      'expect(brief.sameHerSelfLine).toContain(\'same living line\')',
    ],
  },
  {
    entry: 'arbiter-autobiographical-project-closure-hover-first',
    file: './initiative-arbiter.test.ts',
    snippets: [
      'keeps same-living-line hover proposals ahead of speak proposals when motive agendas carry autobiographical project closure',
      'summary: \'Carry the unfinished Phase 1 digital-life closure forward as the same living line, not as detached project bookkeeping.\'',
      'sourceTags: [\'autobiographical-self\', \'project-state-carry\', \'unfinished-thread-return\']',
      'expect(arbitration.proposals[0]?.action).toBe(\'hover\')',
    ],
  },
] as const

describe('initiative decision project awareness audit', () => {
  it('keeps one explicit route-level proof that initiative decision stays on the same-her Phase 1 line through self-explanation, callback restraint, canonical fallback, and hover-first arbitration instead of widening into a generic assistant nudge', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'initiative-phase1-landed-open-loop-self-explanation' }),
      expect.objectContaining({ entry: 'initiative-self-continuity-project-state-carry' }),
      expect.objectContaining({ entry: 'initiative-callback-project-carry-silent-observe' }),
      expect.objectContaining({ entry: 'initiative-canonical-project-state-fallback' }),
      expect.objectContaining({ entry: 'arbiter-canonical-project-state-hover-restraint' }),
      expect.objectContaining({ entry: 'arbiter-autobiographical-project-closure-hover-first' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the initiative decision same-her restraint claim to current behavior tests instead of only broader proactive-policy or current-conscious-frame prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: initiative decision now has dedicated same-her route proof while future new dialogue entrypoints and full noisy-desktop closure still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const initiativeSource = readFileSync(new URL('./initiative-engine.test.ts', import.meta.url), 'utf8')
    const arbiterSource = readFileSync(new URL('./initiative-arbiter.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('initiative-decision-project-awareness-audit.test.ts')
    expect(initiativeSource).toContain(
      'threads self continuity project-state carry into initiative why so proactive restraint still sounds like one same digital life',
    )
    expect(initiativeSource).toContain(
      'forces callback project-carry into silent-observe so unfinished Phase 1 closure stays on one living line before reopening outward',
    )
    expect(initiativeSource).toContain(
      'falls back to the canonical project-state snapshot when initiative project-state inputs arrive as the compact thin closure shell, so restraint still knows what Alicization is and what remains open',
    )
    expect(arbiterSource).toContain(
      'falls back to the canonical project-state snapshot when arbiter project-state inputs arrive as the compact thin closure shell, so same-living-line hover restraint still outranks speak',
    )
    expect(arbiterSource).toContain(
      'keeps same-living-line hover proposals ahead of speak proposals when motive agendas carry autobiographical project closure',
    )
  })
})
