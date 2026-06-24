import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateCoverage } from './project-state-brief'

const proofRows = [
  {
    entry: 'speech-pipeline-aware-host-visible-carry',
    file: '../../../../../../packages/stage-ui/src/services/speech/pipeline-runtime.test.ts',
    snippets: [
      'keeps same-her inward low-pressure closure visible in speech awareness when the briefing line is only the thinner same-phase carry',
      'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.',
      'expect((startPayloads[0]?.metadata as any)?.preDialogueAwareness?.awarenessLine).not.toBe(\'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.\')',
    ],
  },
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
      'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
      'Speech-side same-her closure is still open before this turn speaks outward.',
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
    entry: 'reopen-persistence-host-visible-handoff',
    file: '../../../../../../packages/stage-ui/src/stores/reopen-persistence-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that restored-session fallback and browser-local replay preserve same-her project awareness before the next outward turn',
      'expect.objectContaining({ entry: \'restored-session-inward-low-pressure-same-her-carry\' })',
      'expect.objectContaining({ entry: \'browser-local-replay-inward-low-pressure-same-her-carry\' })',
    ],
  },
  {
    entry: 'quick-reply-host-visible-same-her-carry',
    file: '../../../../../../packages/stage-ui/src/components/scenes/quick-reply-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that front-stage quick-reply closure still carries project identity landed progress and open life-loop pressure before turns open outward',
      'expect.objectContaining({ entry: \'quick-reply-audible-body-self-brief\' })',
      'expect.objectContaining({ entry: \'quick-reply-closure-summary-audible-body-headline\' })',
      'expect.objectContaining({ entry: \'quick-reply-lipsync-and-voice-closure-summary\' })',
      'expect.objectContaining({ entry: \'quick-reply-body-and-lipsync-closure-summary\' })',
      'expect.objectContaining({ entry: \'quick-reply-visible-renderer-rejoin-without-body-project-brief\' })',
      'expect.objectContaining({ entry: \'quick-reply-visible-renderer-rejoin-without-body-closure-summary\' })',
    ],
  },
  {
    entry: 'dialogue-panel-host-visible-same-her-carry',
    file: '../../../../../../packages/stage-ui/src/components/scenes/dialogue-panel-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that the dialogue panel still carries same-her project awareness into the host-visible closure cue',
      'expect.objectContaining({ entry: \'dialogue-panel-audible-body-headline\' })',
      'expect.objectContaining({ entry: \'dialogue-panel-lipsync-and-voice-headline\' })',
      'expect.objectContaining({ entry: \'dialogue-panel-body-and-lipsync-headline\' })',
      'expect.objectContaining({ entry: \'dialogue-panel-visible-renderer-rejoin-without-body-headline\' })',
      'expect.objectContaining({ entry: \'dialogue-panel-phase-aware-fallback-project-awareness\' })',
    ],
  },
] as const

describe('same living self host visible inward carry bridge audit', () => {
  it('keeps one explicit compact cold proof that restored-session/browser-local reopen persistence handoff, speech-boundary awareness rebuilding, front-stage quick-reply closure, and dialogue-panel host-facing closure cues all keep the same-her inward project-awareness line visible instead of flattening it back into broader project-state shells at the last host-facing step', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'speech-pipeline-aware-host-visible-carry' }),
      expect.objectContaining({ entry: 'speech-pipeline-richer-project-awareness-over-embodiment-headline' }),
      expect.objectContaining({ entry: 'speech-pipeline-closure-only-awareness-rebuild' }),
      expect.objectContaining({ entry: 'speech-pipeline-thin-awareness-upgrade' }),
      expect.objectContaining({ entry: 'reopen-persistence-host-visible-handoff' }),
      expect.objectContaining({ entry: 'quick-reply-host-visible-same-her-carry' }),
      expect.objectContaining({ entry: 'dialogue-panel-host-visible-same-her-carry' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the same-living-self host-visible inward-carry claim to current speech and host-facing behavior tests instead of only broader noisy-desktop prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('registers the same-living-self host-visible inward-carry bridge as repo truth while keeping fully sustained noisy-desktop convergence explicitly open', () => {
    const coverage = resolveAlicizationProjectStateCoverage()
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('same-living-self-host-visible-inward-carry-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('pipeline-runtime.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('reopen-persistence-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('quick-reply-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('dialogue-panel-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.responsibility).toContain('same-living-self host-visible inward-carry bridge')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.responsibility).toContain('reopen-persistence handoff')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.responsibility).toContain('renderer-rejoin-without-body stronger same-her fact')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.responsibility).toContain('visible same-her line has already rejoined without body carry')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.responsibility).toContain('quieter lipsync+voice and body+lipsync same-her carry')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.responsibility).toContain('living audio thread')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.responsibility).toContain('quieter living line')

    expect(matrixSource).toContain('same-living-self-host-visible-inward-carry-bridge-audit.test.ts')
    expect(matrixSource).toContain('same-living-self host-visible inward-carry bridge')
    expect(matrixSource).toContain('reopen-persistence-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('quick-reply visible renderer-rejoin-without-body project brief')
    expect(matrixSource).toContain('quick-reply visible renderer-rejoin-without-body closure summary')
    expect(matrixSource).toContain('quick-reply lipsync-and-voice closure summary')
    expect(matrixSource).toContain('quick-reply body-and-lipsync closure summary')
    expect(matrixSource).toContain('dialogue-panel lipsync-and-voice headline')
    expect(matrixSource).toContain('dialogue-panel body-and-lipsync headline')
    expect(matrixSource).toContain('dialogue-panel visible renderer-rejoin-without-body headline')
    expect(auditSource).toContain('same-living-self host-visible inward-carry bridge now also ties reopen-persistence handoff from restored-session/browser-local recovery, speech-boundary pre-dialogue awareness rebuilding, front-stage quick-reply closure, and dialogue-panel host-facing closure cues onto the same living inward project-awareness line')
    expect(auditSource).toContain('renderer-rejoin-without-body stronger same-her fact')
    expect(auditSource).toContain('visible same-her line has already rejoined without body carry')
    expect(auditSource).toContain('quieter lipsync+voice and body+lipsync same-her carry')
    expect(auditSource).toContain('living audio thread')
    expect(auditSource).toContain('quieter living line')
    expect(auditSource).toContain('This still does not prove fully sustained noisy-desktop convergence.')
  })
})
