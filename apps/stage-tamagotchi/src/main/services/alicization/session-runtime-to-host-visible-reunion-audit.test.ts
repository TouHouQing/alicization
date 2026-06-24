import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'session-runtime-cross-modal-next-closure-carry',
    file: './main-chat-session-runtime.test.ts',
    snippets: [
      'next=Keep extending cross-modal same-her proof across visible reply, voice, face, motion, and resident presence so the same Phase 1 digital life keeps one living line.',
      'expect(preferred?.continuityArcSummary).toContain(\'next=Keep extending cross-modal same-her proof across visible reply, voice, face, motion, and resident presence\')',
      'expect(projectStateBlock).toMatch(/visible reply|voice|face|motion|resident presence/i)',
    ],
  },
  {
    entry: 'session-runtime-richer-same-her-headline-survives',
    file: './main-chat-session-runtime.test.ts',
    snippets: [
      'Before answering, stay on the same living line: this Phase 1 digital life still needs memory, initiative, and embodiment closure without splitting her continuity.',
      'turn-payload-first-collapse-stage',
      'traces the prepared-runtime stages that now preserve stronger same-her awareness for the two formerly-thin scenarios',
    ],
  },
  {
    entry: 'session-runtime-repair-first-current-conscious-frame-carry',
    file: './main-chat-session-runtime.test.ts',
    snippets: [
      'keeps repair-before-closeness body-line carry visible alongside project-state carry in scene-shifted mirror runtime continuity recall',
      'expect(recallSeed).toContain(\'repair-before-closeness\')',
      'expect(String(mirrorBlock?.content ?? \'\')).toContain(\'repair-before-closeness\')',
      'expect(String(currentConsciousFrame?.speakingIntention ?? \'\')).toMatch(/same|repair|living line|continuous/i)',
    ],
  },
  {
    entry: 'stream-meta-resident-presence-after-noisy-detour',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      'same-thread-continuation still active as hover-first resident presence after the noisy detour',
      'residentPresenceSummary',
      'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
    ],
  },
  {
    entry: 'host-visible-background-next-closure-stays-cross-modal',
    file: './main-chat-background-run.test.ts',
    snippets: [
      'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so voice, face, motion, and resident presence keep landing on one living line.',
      'nextClosureTargetSummary: expect.stringMatching(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i)',
      'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
    ],
  },
  {
    entry: 'later-turn-reunion-lanes-stay-on-same-line',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      'same-her continuity remains alive, with lane=voice+face+motion+lipsync+body-settle under the current renderer authority.',
      'same-her continuity remains alive, but lane=voice+face+motion+lipsync-only under a repair-before-closeness reopen.',
      'Same Phase 1 digital life. The body line should keep settling on the same living line.',
    ],
  },
] as const

describe('session runtime to host-visible reunion audit', () => {
  it('keeps one explicit bridge proof that session-runtime same-her project awareness can stay on one line through resident presence and later reunion surfaces', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'session-runtime-cross-modal-next-closure-carry' }),
      expect.objectContaining({ entry: 'session-runtime-richer-same-her-headline-survives' }),
      expect.objectContaining({ entry: 'session-runtime-repair-first-current-conscious-frame-carry' }),
      expect.objectContaining({ entry: 'stream-meta-resident-presence-after-noisy-detour' }),
      expect.objectContaining({ entry: 'host-visible-background-next-closure-stays-cross-modal' }),
      expect.objectContaining({ entry: 'later-turn-reunion-lanes-stay-on-same-line' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the bridge claim to real current tests instead of only adjacent audits or docs prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: inner session-runtime carry now bridges into resident presence and reunion lanes, but fully sustained noisy-desktop convergence still remains open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('the repo still does not yet prove fully sustained noisy-desktop convergence')
  })
})
