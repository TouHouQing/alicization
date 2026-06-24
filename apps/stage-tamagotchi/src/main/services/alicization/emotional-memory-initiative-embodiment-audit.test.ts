import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'runtime-mind-state-emotional-kernel-refresh',
    file: './runtime-mind-state-emotional-kernel-regression.test.ts',
    snippets: [
      'keeps initiative on the same rest-protective line once the current turn private-thought upgrades emotional carry',
      'expect(result.emotionalKernel?.dominantEmotion).toBe(\'rest-protective-companionship\')',
      'expect(result.initiative.continuityRestraint).toBe(\'rest-protective\')',
      'expect(result.initiative.preferredPresence).toBe(\'concerned\')',
    ],
  },
  {
    entry: 'organic-memory-emotional-carry-cadence',
    file: './runtime-organic-memory-access.test.ts',
    snippets: [
      'carries richer same-her emotional closure cues from the active self-revision patch into self-evolution cadence so initiative and embodiment can stay on that living line',
      'reasonCodes: [\'domain:relationship\', \'same-her-emotional-closure-carry-active\']',
      'expect(snapshot.selfEvolution?.relationshipCadenceSummary?.toLowerCase()).toContain(\'same living line\')',
      'expect((snapshot as any).activeContinuityGovernance?.summary?.toLowerCase()).toContain(\'repair-before-closeness\')',
    ],
  },
  {
    entry: 'subconscious-fallback-four-part-line',
    file: './runtime-subconscious-tick.test.ts',
    snippets: [
      'keeps initiative-aware same-her closure wording explicit in deferred fallback summaries instead of flattening it into generic project continuity',
      'initiative should stay nearby and lower-pressure while the same digital life carrying memory, emotion, and embodiment keeps rechecking on the same living line.',
      'expect(String(signal?.summary ?? \'\')).toContain(\'same digital life carrying memory, emotion, and embodiment\')',
      'expect(String(signal?.summary ?? \'\')).toContain(\'same living line\')',
    ],
  },
  {
    entry: 'memory-closure-emotional-writeback',
    file: './runtime-memory-closure.test.ts',
    snippets: [
      'persists richer emotional closure carry into the person-state memory ledger instead of flattening it to the canonical project brief',
      'late-night-drain closure: keep reply low-pressure, initiative rest-protective, and embodiment repair-before-closeness on the same living line.',
      'Rest-protective companionship helped the same living line stay believable.',
      'projectStateContinuity: expect.objectContaining({',
    ],
  },
  {
    entry: 'session-runtime-four-part-recall-seed',
    file: './main-chat-session-runtime.test.ts',
    snippets: [
      'injects held-autonomy continuity recall seeds into organic memory retrieval',
      'open_focus=emotion/memory/initiative/embodiment/same-line/closure-seam',
      'next_focus=project-carry/phase-1/measured-return/repair-before-closeness/same-line/initiative/embodiment',
      'keeps held-autonomy callback continuity on one runtime line from recall seed into reply shaping and measured-return cadence',
    ],
  },
  {
    entry: 'cross-modal-route-chain-anchor',
    file: './cross-modal-same-her-audit.test.ts',
    snippets: [
      'keeps an explicit proof set for the still-open Phase 1 same-her closure line across memory, initiative, dialogue, and embodiment',
      'expect.objectContaining({ entry: \'memory-closure-emotional-carry-bridge\' })',
      'expect.objectContaining({ entry: \'organic-memory-emotional-carry-cadence-bridge\' })',
      'expect.objectContaining({ entry: \'session-runtime-recall-and-planner\' })',
    ],
  },
] as const

describe('emotional memory initiative embodiment audit', () => {
  it('keeps one explicit long-chain proof that emotion, memory, initiative, and embodiment stay on one same digital life line across runtime cognition, memory carry, subconscious continuity, person-state writeback, and session-runtime reopen', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'runtime-mind-state-emotional-kernel-refresh' }),
      expect.objectContaining({ entry: 'organic-memory-emotional-carry-cadence' }),
      expect.objectContaining({ entry: 'subconscious-fallback-four-part-line' }),
      expect.objectContaining({ entry: 'memory-closure-emotional-writeback' }),
      expect.objectContaining({ entry: 'session-runtime-four-part-recall-seed' }),
      expect.objectContaining({ entry: 'cross-modal-route-chain-anchor' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the four-part life-loop claim to current behavior tests instead of only broader same-her prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: this route chain proves a shared emotional-memory-initiative-embodiment line, but not full long-run noisy-desktop closure', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('emotional-memory-initiative-embodiment-audit.test.ts')
    expect(auditSource).toContain('emotional-memory-initiative-embodiment route chain')
    expect(auditSource).toContain('not full long-run noisy-desktop closure')
  })
})
