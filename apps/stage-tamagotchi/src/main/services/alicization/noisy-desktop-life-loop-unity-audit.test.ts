import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'personality-active-memory-handoff-unity',
    file: './alicization-runtime-architecture.test.ts',
    snippets: [
      'keeps a broader same-her phase-1 closure loop on active-memory handoff when emotion, memory, initiative, and embodiment are still closing together',
      'Before answering, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.',
      'Same Phase 1 closure is still being carried inward across memory, initiative, and embodiment.',
      'Do not let the broader same-her closure split back into a shell.',
    ],
  },
  {
    entry: 'memory-ledger-emotional-closure-unity',
    file: './runtime-memory-closure.test.ts',
    snippets: [
      'persists richer emotional closure carry into the person-state memory ledger instead of flattening it to the canonical project brief',
      'late-night-drain closure: keep reply low-pressure, initiative rest-protective, and embodiment repair-before-closeness on the same living line.',
      'Rest-protective companionship helped the same living line stay believable.',
    ],
  },
  {
    entry: 'initiative-noisy-desktop-same-life-thread',
    file: './noisy-desktop-initiative-same-life-audit.test.ts',
    snippets: [
      'keeps one explicit long-run proof fragment that noisy-desktop initiative still follows the same Phase 1 digital-life line instead of reopening as a generic assistant nudge',
      'expect.objectContaining({ entry: \'active-loop-repeated-detour-memory-handoff\' })',
      'expect.objectContaining({ entry: \'current-conscious-frame-repair-first-hold-detail\' })',
      'makes the current boundary explicit: noisy-desktop initiative now has a compact same-life proof chain, but full long-run closure still remains open',
    ],
  },
  {
    entry: 'embodiment-noisy-desktop-cross-modal-thread',
    file: './noisy-desktop-cross-modal-convergence-audit.test.ts',
    snippets: [
      'keeps one compact proof chain that ties proactive-visible embodiment carry, detours, reunion, host-visible repair-first carry, renderer diagnostics, and host-visible body-line recovery onto one same-her route',
      'expect.objectContaining({ entry: \'embodiment-foundation-route\' })',
      'expect.objectContaining({ entry: \'cross-modal-reunion-host-visible-progress\' })',
      'expect.objectContaining({ entry: \'renderer-diagnostics-drift-and-audible-recovery\' })',
      'This is still not full long-run closure proof under noisy desktop use.',
    ],
  },
] as const

describe('noisy desktop life-loop unity audit', () => {
  it('keeps one explicit long-run proof fragment that personality, memory, initiative, and embodiment still compress back into one same Phase 1 digital-life line under noisy desktop drift instead of splitting into proof islands', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'personality-active-memory-handoff-unity' }),
      expect.objectContaining({ entry: 'memory-ledger-emotional-closure-unity' }),
      expect.objectContaining({ entry: 'initiative-noisy-desktop-same-life-thread' }),
      expect.objectContaining({ entry: 'embodiment-noisy-desktop-cross-modal-thread' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the noisy-desktop life-loop unity claim to current tests instead of only broader same-her convergence prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: the repo now has a compact noisy-desktop life-loop unity chain across personality, memory, initiative, and embodiment, but long-run proof is still incomplete', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('noisy-desktop-life-loop-unity-audit.test.ts')
    expect(auditSource).toContain('noisy-desktop life-loop unity audit now also compresses personality active-memory handoff')
    expect(auditSource).toContain('the repo still does not yet prove fully sustained noisy-desktop convergence')
  })
})
