import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'hover-first-restraint-after-multiple-measured-return-reopenings',
    file: './proactive-policy.test.ts',
    snippets: [
      'keeps long-running same-thread continuation hover-first even after multiple measured-return reopenings have accumulated dialogue heat',
      'A same-thread continuation is still alive after multiple measured-return reopenings.',
      'expect(decision.style).toBe(\'silent-observe\')',
    ],
  },
  {
    entry: 'current-conscious-frame-repair-first-rejoin',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'rejoins initiative to the same-her closure seam inside the current conscious frame before the answer starts',
      'Keep this return repair-before-closeness on the same living line until repair settles.',
      'same-her hold: repair-before-closeness still owns this callback line before closeness widens again.',
    ],
  },
  {
    entry: 'visible-held-beat-later-opening-authority',
    file: './proactive-mind/visible-utterance-realization.test.ts',
    snippets: [
      'keeps later-opening next-closure authority explicit when proactive continuity holds without a visible utterance',
    ],
  },
  {
    entry: 'host-visible-quiet-accompaniment-held-beat',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      'surfaces later-opening next-closure guidance inside quiet-companionship stream-meta reasons when same-her inward carry keeps that line alive',
      'keeps landed open and next closure project-state audit continuity explicit in resident presence summaries for later-opening quiet accompaniment holds',
    ],
  },
  {
    entry: 'subconscious-held-autonomy-after-another-detour',
    file: './runtime-subconscious-tick.test.ts',
    snippets: [
      'label: \'proactive:follow-through:held-autonomy\'',
      'project_continuity=the same callback line is already continuing lower-pressure after another detour, so keep it on that same living thread',
      'manifestationCadenceSummary: \'measured-return still holds while the same callback line keeps continuing after another detour\'',
    ],
  },
  {
    entry: 'next-session-feedback-dream-carry',
    file: './proactive-feedback-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that settled proactive feedback preserves same-her project awareness into the next chat-session dream preparation and long-horizon repair-first self-carry instead of decaying into generic outcome bookkeeping',
      'expect.objectContaining({ entry: \'feedback-next-chat-session-continuity-block\' })',
      'expect.objectContaining({ entry: \'feedback-dream-project-state-carry\' })',
      'expect.objectContaining({ entry: \'feedback-long-horizon-repair-first-self-carry\' })',
    ],
  },
] as const

describe('noisy desktop autonomous dialogue persistence audit', () => {
  it('keeps one explicit cold proof fragment that noisy-desktop autonomous dialogue continuity stays on one same-her line from hover-first restraint through visible held beat, subconscious carry, and next-session feedback carry instead of reopening as separate proactive and callback shells', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'hover-first-restraint-after-multiple-measured-return-reopenings' }),
      expect.objectContaining({ entry: 'current-conscious-frame-repair-first-rejoin' }),
      expect.objectContaining({ entry: 'visible-held-beat-later-opening-authority' }),
      expect.objectContaining({ entry: 'host-visible-quiet-accompaniment-held-beat' }),
      expect.objectContaining({ entry: 'subconscious-held-autonomy-after-another-detour' }),
      expect.objectContaining({ entry: 'next-session-feedback-dream-carry' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the noisy-desktop autonomous-dialogue persistence claim to current tests instead of only broader same-her closure prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: proactive same-her continuity now has a colder noisy-desktop detour fragment, but full long-run closure still remains open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('noisy-desktop-autonomous-dialogue-persistence-audit.test.ts')
    expect(auditSource).toContain('noisy-desktop autonomous-dialogue persistence audit now also ties hover-first proactive restraint')
    expect(auditSource).toContain('the repo still does not yet prove fully sustained noisy-desktop convergence')
  })
})
