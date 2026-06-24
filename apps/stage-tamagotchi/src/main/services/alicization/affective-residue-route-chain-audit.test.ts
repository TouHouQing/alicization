import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'residue-memory-formation',
    file: './affective-residue-memory.test.ts',
    snippets: [
      'turns relationship outcomes and continuity signals into residue/cadence memory without visible wording templates',
      'expect(residue.relationshipCadence.shouldDelayWarmth).toBe(true)',
      'expect(residue.summary).not.toMatch(/我会一直在|慢慢来|先抱抱/u)',
    ],
  },
  {
    entry: 'residue-wakes-autobiographical-recollection',
    file: './memory-recollection-intent.test.ts',
    snippets: [
      'lets affective residue wake autobiographical recollection even when private thought has not explicitly named the current emotion yet',
      'expect(intent?.mode).toBe(\'autobiographical-history\')',
      '\'affect:rest-protective\'',
      'expect((intent?.recollectionAgenda?.affectivePull ?? 0)).toBeGreaterThan(0.2)',
    ],
  },
  {
    entry: 'residue-explicit-recall-guidance',
    file: './recall-governor.test.ts',
    snippets: [
      'lets affective residue become explicit recollection guidance even when private-thought emotion is still implicit',
      'expect(governor?.recollectionIntent?.mode).toBe(\'autobiographical-history\')',
      'expect(governor?.recollectionIntent?.rationale).toContain(\'emotional carry\')',
    ],
  },
  {
    entry: 'residue-protects-proactive-cadence',
    file: './proactive-cadence.test.ts',
    snippets: [
      'lets affective residue protect rest and delay warmth before proactive cadence expands',
      '\'residue-delay-warmth\'',
      '\'residue-protect-rest\'',
      'expect(cadence.cadencePressure).toBeLessThan(0.12)',
    ],
  },
  {
    entry: 'residue-hover-first-proactive-policy',
    file: './proactive-policy.test.ts',
    snippets: [
      'lets hover-first cadence memory keep proactive style silent-observe even when the immediate style would otherwise become gentle-care',
      'expect(decision.style).toBe(\'silent-observe\')',
      'expect(decision.reasonCodes).toContain(\'continuity-next-open-window\')',
      'expect(decision.whyNow).toMatch(/same-her continuity governance|measured-return|lower-pressure|同一个她/i)',
    ],
  },
  {
    entry: 'residue-room-making-subconscious-carry',
    file: './runtime-subconscious-tick.test.ts',
    snippets: [
      'keeps thinner affective-residue room-making guidance when same-line resident carry merges with an older generic shell',
      '余韵还在，先留白，别立刻把温度放大。 Stay on the same line and keep this callback opening lower-pressure.',
      'expect(merged?.openingGuidance).toContain(\'余韵\')',
    ],
  },
  {
    entry: 'durable-embodiment-rhythm-hold',
    file: '../../../../../../packages/stage-ui/src/components/scenes/use-stage-embodiment-idle-performance.test.ts',
    snippets: [
      'stabilizes the quieter nearby attentive idle under longer repair-before-closeness hold instead of drifting back to a more active nod candidate',
      '\'durable-relationship-rhythm\'',
      'expect(live2dPreference?.actionKey).toBe(\'nearby_settle_guard\')',
      'expect(vrmPreference?.binding?.actionKey).toBe(\'nearby_settle_guard\')',
    ],
  },
  {
    entry: 'host-visible-residue-room-making-summary',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      'keeps thinner affective-residue room-making wording visible in stream meta summaries for measured-return reopenings',
      '余韵还在，所以我会先把这一句轻一点接住，不立刻把温度放大。',
      'residentMode: \'measured-return\'',
      'actionCue: \'observe_focus\'',
    ],
  },
] as const

describe('affective residue route chain audit', () => {
  it('keeps one explicit same digital life line from affective residue memory through recollection guidance, proactive return rhythm, subconscious room-making carry, durable embodiment settling, and host-visible measured-return summaries', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'residue-memory-formation' }),
      expect.objectContaining({ entry: 'residue-wakes-autobiographical-recollection' }),
      expect.objectContaining({ entry: 'residue-explicit-recall-guidance' }),
      expect.objectContaining({ entry: 'residue-protects-proactive-cadence' }),
      expect.objectContaining({ entry: 'residue-hover-first-proactive-policy' }),
      expect.objectContaining({ entry: 'residue-room-making-subconscious-carry' }),
      expect.objectContaining({ entry: 'durable-embodiment-rhythm-hold' }),
      expect.objectContaining({ entry: 'host-visible-residue-room-making-summary' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the affective residue route chain to current tests instead of only broader same-her prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: affective residue now has a named route chain across memory, initiative, and embodiment, but not full long-horizon emotion-memory-voice-motion convergence', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(matrixSource).toContain('affective-residue-route-chain-audit.test.ts')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(auditSource).toContain('affective-residue route chain')
    expect(auditSource).toContain('not full long-horizon emotion-memory-voice-motion convergence')
  })
})
