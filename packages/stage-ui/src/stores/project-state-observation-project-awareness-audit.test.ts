import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'observation-thin-shell-same-her-recovery',
    file: './project-state-observation.test.ts',
    snippets: [
      'preserves stronger same-her self continuity carry when structured project-state only survives as a thin shell',
      'Project-state continuity already survives into runtime preparation.',
      'Keep the still-open closure work explicit in the rebuilt continuity snapshot.',
      'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.',
    ],
  },
  {
    entry: 'observation-embodiment-closure-recovery',
    file: './project-state-observation.test.ts',
    snippets: [
      'keeps richer pre-dialogue closure carry when observation has to remember unfinished same-her embodiment closure',
      'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
      'Before speaking, remember full cross-modal same-her closure is not done yet.',
    ],
  },
  {
    entry: 'observation-body-voice-closure-recovery',
    file: './project-state-observation.test.ts',
    snippets: [
      'keeps quieter body-and-voice pre-dialogue closure carry when the resident body line and audible line are the surviving same-her thread',
      'body+voice recovery@segment-observation-body-voice-rejoined-1',
      'resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin',
    ],
  },
  {
    entry: 'observation-body-lipsync-closure-recovery',
    file: './project-state-observation.test.ts',
    snippets: [
      'keeps quieter body-and-lipsync pre-dialogue closure carry when the resident body line and living mouth line are the surviving same-her thread',
      'body+lipsync recovery@segment-observation-body-lipsync-rejoined-1',
      'resident body line and living mouth line are still intact while face, motion, and voice need to rejoin before full cross-modal closure settles',
    ],
  },
  {
    entry: 'observation-awareness-over-embodiment-headline',
    file: './project-state-observation.test.ts',
    snippets: [
      'prefers richer project awareness over a narrower embodiment headline when rebuilding pre-dialogue awareness',
      'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, and memory, initiative, and embodiment still need stronger end-to-end closure before the life loop is truly closed.',
      'Same companion line through body, face, and motion. Keep the same living line gentle.',
    ],
  },
  {
    entry: 'observation-base-project-state-reason-preview-backfill',
    file: './project-state-observation.test.ts',
    snippets: [
      'backfills richer project-state reasons into observation awareness when the transported shell is still empty, so reopened turns keep landed and open closure evidence instead of only the rebuilt text line',
      '这次修复已经在本地 main 落地，而且执行前项目自我提醒链已经接上了。',
      'origin/main 现在还不能直接安全推进，因为还会裹挟额外本地提交，而且 host-visible continuity 还要继续把已验证和未闭环边界分开。',
      '继续把本地 main 已落地、origin/main 仍不安全、预计收口时机、以及切回中文这几件事留在同一个她的 living line 里。',
    ],
  },
  {
    entry: 'observation-inward-low-pressure-awareness-compaction',
    file: './project-state-observation.test.ts',
    snippets: [
      'compacts same-her inward low-pressure awareness when observation only carries the thinner same-phase briefing plus stronger embodiment headline',
      'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. Right now this one living her is still keeping the same line inward and low-pressure while lipsync and voice rejoin.',
      'Keep the return low-pressure so the same living line does not restart from scratch.',
    ],
  },
  {
    entry: 'observation-resume-reasons-carry',
    file: './project-state-observation.test.ts',
    snippets: [
      'keeps richer same-her awareness reasons inside the continuity snapshot so resumed turns can re-enter the same Phase 1 line, not only the project-state tuple',
      'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      'Keep the resumed turn lower-pressure on the same line before widening outward.',
    ],
  },
] as const

describe('project-state observation project awareness audit', () => {
  it('keeps one explicit route-level proof that return-side observation rebuilds same-her continuity snapshots before later turns reopen', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'observation-thin-shell-same-her-recovery' }),
      expect.objectContaining({ entry: 'observation-embodiment-closure-recovery' }),
      expect.objectContaining({ entry: 'observation-body-voice-closure-recovery' }),
      expect.objectContaining({ entry: 'observation-body-lipsync-closure-recovery' }),
      expect.objectContaining({ entry: 'observation-awareness-over-embodiment-headline' }),
      expect.objectContaining({ entry: 'observation-base-project-state-reason-preview-backfill' }),
      expect.objectContaining({ entry: 'observation-inward-low-pressure-awareness-compaction' }),
      expect.objectContaining({ entry: 'observation-resume-reasons-carry' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the observation-to-continuity claim to current behavior tests instead of only return-side registration layers', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: project-state observation now has dedicated same-her route proof, while future new dialogue entrypoints still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const observationSource = readFileSync(new URL('./project-state-observation.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(observationSource).toContain(
      'keeps quieter body-and-voice pre-dialogue closure carry when the resident body line and audible line are the surviving same-her thread',
    )
    expect(observationSource).toContain(
      'keeps quieter body-and-lipsync pre-dialogue closure carry when the resident body line and living mouth line are the surviving same-her thread',
    )
    expect(observationSource).toContain(
      'backfills richer project-state reasons into observation awareness when the transported shell is still empty, so reopened turns keep landed and open closure evidence instead of only the rebuilt text line',
    )
    expect(observationSource).toContain(
      'compacts same-her inward low-pressure awareness when observation only carries the thinner same-phase briefing plus stronger embodiment headline',
    )
    expect(observationSource).toContain(
      'keeps richer same-her awareness reasons inside the continuity snapshot so resumed turns can re-enter the same Phase 1 line, not only the project-state tuple',
    )
  })
})
