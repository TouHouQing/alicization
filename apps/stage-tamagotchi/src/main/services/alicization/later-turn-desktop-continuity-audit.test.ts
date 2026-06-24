import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'runtime-third-turn-same-thread-meta-carry',
    file: './runtime.test.ts',
    snippets: [
      'runtimeDigestProjectContinuityArcStage',
      'same-digital-life-project-thread',
      'phase1-route=desktop-life-loop',
      'unresolved=callback-seam',
      'same-her hold',
      'lower-pressure before it widens again',
      'growth=phase1-open',
    ],
  },
  {
    entry: 'runtime-fourth-turn-resident-presence-carry',
    file: './runtime.test.ts',
    snippets: [
      'thread=same-thread-continuation',
      'mode=measured-return',
      'style=silent-observe',
      'route=desktop-life-loop',
      'blink=linger',
      'gaze=soften',
    ],
  },
  {
    entry: 'runtime-noisy-detour-vrm-follow-up-carry',
    file: './runtime.test.ts',
    snippets: [
      'keeps VRM renderer-native measured-return motion authority on a real later chat turn after noisier callback detours',
      'turn-callback-afterglow-chat-meta-measured-return-vrm-noisy-third-follow-up',
      'continuity-arc:same-thread-continuation',
      'residentMode: \'measured-return\'',
    ],
  },
  {
    entry: 'runtime-later-turn-repair-first-authority',
    file: './runtime.test.ts',
    snippets: [
      'emits repair-before-closeness embodiment authority on a real later chat turn after cooldown callback repair survives scene hops',
      'turn-callback-afterglow-chat-meta-repair-before-closeness',
      'reason=Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again',
      'continuityRestraint).toBe(\'repair-before-closeness\')',
    ],
  },
  {
    entry: 'resident-presence-repair-first-after-another-detour',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      'prefers a stronger repair-before-closeness project-state audit seam over a thinner runtime measured-return cue in resident presence summaries',
      'same-thread-continuation still active as hover-first resident presence after another coding detour',
      'Keep this return repair-before-closeness on the same living line until repair settles.',
      '"residentPresenceSummary":"presence=resident-presence | thread=same-thread-continuation | mode=repair-before-closeness',
    ],
  },
  {
    entry: 'resident-presence-rest-protective-after-host-settle',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      'keeps rest-protective resident presence explicit when project-state closure and runtime restraint already carry that quieter same living line',
      'continuityRestraint: \'rest-protective\'',
      'Keep emotion, memory, initiative, and embodiment closing on the same living line while this return stays rest-protective and inward.',
      'expect(parsed.lastSegmentVoiceSummary).toBe(`pitch=-2.00 | rate=0.95 | energy=0.46 | cadence=0.40 | companion=rest-protective',
      'expect(parsed.lastSegmentFaceSummary).toBe(`emotion=thinking | expression=hold | mode=rest-protective',
      'expect(parsed.lastSegmentMotionSummary).toBe(`tail=rest-protective | timing=next-open-window',
      'expect(parsed.lastSegmentLipSyncSummary).toBe(`mode=closed | continuity=brief-close | hold=300ms | companion=rest-protective',
      'expect(parsed.lastSegmentBodyContinuitySummary).toBe(`resident=rest-protective | timing=next-open-window',
      'expect(parsed.residentPresenceSummary).toBe(`presence=resident-presence | thread=same-thread-continuation | mode=rest-protective',
    ],
  },
  {
    entry: 'background-run-structured-project-state-carry',
    file: './main-chat-background-run.test.ts',
    snippets: [
      'finishedStructured.projectState?.latestLandedProgress',
      'finishedStructured.projectState?.nextClosureTarget',
      'sameHerSummary: expect.stringContaining(canonicalProjectState.sameHerSelfLine)',
      'nextClosureTargetSummary: expect.stringMatching(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i)',
    ],
  },
  {
    entry: 'background-run-repair-first-closure-priority',
    file: './main-chat-background-run.test.ts',
    snippets: [
      'prefers a shorter repair-before-closeness closure seam over a longer thinner measured-return carry in active-dialogue host-visible project-state audit merge',
      'Keep this return repair-before-closeness on the same living line until repair settles.',
      'preDialogueAwarenessSummary: \'Before answering, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.\'',
      'emotionalClosureCue: expect.stringMatching(/repair-before-closeness|same living line/i)',
    ],
  },
  {
    entry: 'background-run-lane-limited-embodiment-closure',
    file: './main-chat-background-run.test.ts',
    snippets: [
      'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
      'embodimentClosureSummary: \'Right now her visible same-her continuity is still being carried mainly through face and motion, so she should keep treating full cross-modal embodiment closure as unfinished.\'',
    ],
  },
] as const

describe('later-turn desktop continuity audit', () => {
  it('keeps one explicit route-level proof that longer chained desktop turns still carry the same digital-life line through later runtime, repair-first resident presence, and recovery surfaces', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'runtime-third-turn-same-thread-meta-carry' }),
      expect.objectContaining({ entry: 'runtime-fourth-turn-resident-presence-carry' }),
      expect.objectContaining({ entry: 'runtime-noisy-detour-vrm-follow-up-carry' }),
      expect.objectContaining({ entry: 'runtime-later-turn-repair-first-authority' }),
      expect.objectContaining({ entry: 'resident-presence-repair-first-after-another-detour' }),
      expect.objectContaining({ entry: 'resident-presence-rest-protective-after-host-settle' }),
      expect.objectContaining({ entry: 'background-run-structured-project-state-carry' }),
      expect.objectContaining({ entry: 'background-run-repair-first-closure-priority' }),
      expect.objectContaining({ entry: 'background-run-lane-limited-embodiment-closure' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the later-turn desktop continuity claim to real current tests instead of only broad long-run wording', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: later chained desktop turns now keep the same digital-life line visible across runtime meta, repair-first resident presence, and structured recovery, but still do not prove full noisy-desktop closure', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const runtimeSource = readFileSync(new URL('./runtime.test.ts', import.meta.url), 'utf8')
    const streamMetaSource = readFileSync(new URL('./main-chat-stream-meta.test.ts', import.meta.url), 'utf8')
    const backgroundRunSource = readFileSync(new URL('./main-chat-background-run.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(runtimeSource).toContain('phase1-route=desktop-life-loop')
    expect(runtimeSource).toContain('turn-callback-afterglow-chat-meta-measured-return-vrm-noisy-third-follow-up')
    expect(runtimeSource).toContain('turn-callback-afterglow-chat-meta-repair-before-closeness')
    expect(streamMetaSource).toContain(
      'prefers a stronger repair-before-closeness project-state audit seam over a thinner runtime measured-return cue in resident presence summaries',
    )
    expect(backgroundRunSource).toContain(
      'Right now her visible same-her continuity is still being carried mainly through face and motion, so she should keep treating full cross-modal embodiment closure as unfinished.',
    )
    expect(backgroundRunSource).toContain(
      'prefers a shorter repair-before-closeness closure seam over a longer thinner measured-return carry in active-dialogue host-visible project-state audit merge',
    )
  })
})
