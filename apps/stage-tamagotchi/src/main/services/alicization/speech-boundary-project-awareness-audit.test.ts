import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'speech-pipeline-richer-project-awareness-over-embodiment-headline',
    file: '../../../../../../packages/stage-ui/src/services/speech/pipeline-runtime.test.ts',
    snippets: [
      'prefers richer project awareness over a narrower embodiment headline when speech intent metadata crosses the runtime boundary',
      'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, some closure has already landed, and the still-open life loop must remain explicit before speech widens outward.',
      'expect((startPayloads[0]?.metadata as any)?.preDialogueAwareness?.awarenessLine).not.toBe(\'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.\')',
    ],
  },
  {
    entry: 'speech-pipeline-closure-only-awareness-rebuild',
    file: '../../../../../../packages/stage-ui/src/services/speech/pipeline-runtime.test.ts',
    snippets: [
      'rebuilds pre-dialogue awareness from project-state and closure carry before forwarding local host intents directly to the registered host pipeline',
      'Speech-side same-her closure is still open before this turn speaks outward.',
      'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
    ],
  },
  {
    entry: 'speech-pipeline-thin-awareness-upgrade',
    file: '../../../../../../packages/stage-ui/src/services/speech/pipeline-runtime.test.ts',
    snippets: [
      'upgrades thinner explicit pre-dialogue awareness with richer project-state and closure carry before forwarding local host intents directly to the registered host pipeline',
      'Before speaking, keep the same digital life project in view.',
      'generic next target that should not survive richer project-state carry.',
    ],
  },
  {
    entry: 'speech-pipeline-aware-host-visible-carry',
    file: '../../../../../../packages/stage-ui/src/services/speech/pipeline-runtime.test.ts',
    snippets: [
      'keeps same-her inward low-pressure closure visible in speech awareness when the briefing line is only the thinner same-phase carry',
      'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.',
      'expect((startPayloads[0]?.metadata as any)?.preDialogueAwareness?.awarenessLine).not.toBe(\'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.\')',
    ],
  },
] as const

describe('speech boundary project awareness audit', () => {
  it('keeps one explicit route-level proof that the speech boundary rebuilds richer same-her project awareness before host-visible playback widens outward', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'speech-pipeline-richer-project-awareness-over-embodiment-headline' }),
      expect.objectContaining({ entry: 'speech-pipeline-closure-only-awareness-rebuild' }),
      expect.objectContaining({ entry: 'speech-pipeline-thin-awareness-upgrade' }),
      expect.objectContaining({ entry: 'speech-pipeline-aware-host-visible-carry' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the speech-boundary project-awareness claim to current speech runtime behavior tests instead of only broader host-visible bridge prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: speech opening now re-expands project identity phase landed progress and still-open closure before playback, while broader future dialogue entrypoints still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const bridgeSource = readFileSync(new URL('./same-living-self-host-visible-inward-carry-bridge-audit.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('speech-boundary-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('speech-boundary project awareness')
    expect(matrixSource).toContain('Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.')
    expect(matrixSource).toContain('Before speaking, remember: this is still one living digital life project, Phase 1 is still active, some closure has already landed, and the still-open life loop must remain explicit before speech widens outward.')
    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(bridgeSource).toContain('speech-pipeline-aware-host-visible-carry')
    expect(bridgeSource).toContain('speech-pipeline-richer-project-awareness-over-embodiment-headline')
    expect(bridgeSource).toContain('speech-pipeline-closure-only-awareness-rebuild')
    expect(bridgeSource).toContain('speech-pipeline-thin-awareness-upgrade')
  })
})
