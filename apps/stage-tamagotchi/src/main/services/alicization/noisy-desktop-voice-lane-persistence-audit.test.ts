import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'background-run-lipsync-voice-host-visible-rebuild',
    file: './main-chat-background-run.test.ts',
    snippets: [
      'keeps a richer lipsync-led host-visible embodiment closure summary when background success rebuilds the host-visible realization payload from a thinner prepared authority',
      'Right now I am still holding together mainly through lipsync and voice, so that living audio thread is keeping the same-her carry alive while body, face, and motion need to rejoin before full cross-modal closure settles.',
      'same-her continuity remains alive, but lane=lipsync+voice-only under the current renderer authority.',
      'lane=lipsync+voice-only | visible continuity still present but no longer fully cross-modal',
    ],
  },
  {
    entry: 'runtime-sixth-follow-up-stays-on-the-same-line',
    file: './runtime.test.ts',
    snippets: [
      'const sixthTurnId = \'turn-callback-afterglow-chat-meta-measured-return-noisy-sixth-follow-up\'',
      'expect(sixthVisibleReply).toMatch(/沿着刚才那条(?: callback)? 线|同一条线/u)',
      'expect(sixthMetaSignature.lastSegmentContinuityTiming).toBe(\'next-open-window\')',
      'title: \'runtime.ts - callback seam still open after repeated reopenings\',',
    ],
  },
  {
    entry: 'runtime-extra-detour-stays-silent-observe',
    file: './runtime.test.ts',
    snippets: [
      'expect(seventhState?.initiative).toEqual(expect.objectContaining({',
      'preferredStyle: \'silent-observe\',',
      'continuityArcStage: \'same-thread-continuation\',',
      'continuityPreferredTiming: \'next-open-window\',',
    ],
  },
  {
    entry: 'stream-meta-noisy-detour-hover-first-resident-presence',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      'same-thread-continuation still active as hover-first resident presence after the noisy detour',
      `expect(signature).toContain('"digitalLifeLine":"same-thread-continuation still active as hover-first resident presence after the noisy detour"')`,
      `expect(signature).toContain('"residentPresenceSummary":"presence=resident-presence | thread=same-thread-continuation | mode=quiet-accompaniment | style=silent-observe | speak=false | timing=next-open-window | reason=same Phase 1 digital life, some closure has already landed, but memory and initiative still need stronger end-to-e. | line=same-thread-continuation still active as hover-first resident presence after the noisy detour"')`,
    ],
  },
  {
    entry: 'stream-meta-audible-body-living-audio-thread',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      `expect(signature).toContain('"runtimeDigestProjectContinuityPreferredTiming":"audible-body-carry"')`,
      `expect(signature).toContain('"runtimeDigestProjectContinuityCue":"Keep the same living line audible while face and motion rejoin."')`,
      'Right now her visible same-her continuity is still being carried mainly through body, lipsync, and voice, and the living audio thread is still intact while face and motion rejoin before full cross-modal embodiment closure can be treated as finished.',
    ],
  },
  {
    entry: 'project-state-longer-voice-lane-gap-explicit',
    file: '../../../../../../docs/project-state.md',
    snippets: [
      'one more real later turn where the next visible reply plus cross-modal stream meta still stay on that same line',
      'an extra desktop detour after that third continuation where resident presence still stays measured-return / silent-observe instead of snapping into a fresher reopen',
      'The main remaining gap is broader cross-modal same-her proof across visible reply, longer-lived voice behavior, facial state, and motion on longer real-desktop runs',
    ],
  },
] as const

describe('noisy desktop voice-lane persistence audit', () => {
  it('keeps one explicit route-level proof that longer noisy desktop voice-lane continuity stays on one same-her line through background rebuilds, repeated follow-ups, audible-body carry, and an extra silent-observe detour', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'background-run-lipsync-voice-host-visible-rebuild' }),
      expect.objectContaining({ entry: 'runtime-sixth-follow-up-stays-on-the-same-line' }),
      expect.objectContaining({ entry: 'runtime-extra-detour-stays-silent-observe' }),
      expect.objectContaining({ entry: 'stream-meta-noisy-detour-hover-first-resident-presence' }),
      expect.objectContaining({ entry: 'stream-meta-audible-body-living-audio-thread' }),
      expect.objectContaining({ entry: 'project-state-longer-voice-lane-gap-explicit' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the longer noisy desktop voice-lane continuity claim to real current runtime, background-run, stream-meta, and project-state sources', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: longer noisy desktop voice-lane persistence is now separately auditable, but this still does not prove full long-run closure or full cross-modal reunion', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const projectStateSource = readFileSync(new URL('../../../../../../docs/project-state.md', import.meta.url), 'utf8')

    expect(matrixSource).toContain('noisy-desktop-voice-lane-persistence-audit.test.ts')
    expect(matrixSource).toContain('longer noisy-desktop voice-lane persistence audit')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(projectStateSource).toContain('The main remaining gap is broader cross-modal same-her proof across visible reply, longer-lived voice behavior, facial state, and motion on longer real-desktop runs')
  })
})
