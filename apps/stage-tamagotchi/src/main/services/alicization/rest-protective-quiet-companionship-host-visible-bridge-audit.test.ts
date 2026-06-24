import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateCoverage } from './project-state-brief'

const proofRows = [
  {
    entry: 'desktop-execution-host-visible-embodiment-bridge',
    file: './desktop-execution-host-visible-embodiment-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit compact cold proof that the desktop execution callback line can continue from the colder emotion-memory-voice-motion convergence line into embodiment-facing host-visible resident presence, lane summaries, audible-body carry, and later reunion surfaces instead of stopping before the living body line reforms outwardly',
      'expect.objectContaining({ entry: \'desktop-execution-emotion-memory-voice-motion-convergence-bridge\' })',
      'expect.objectContaining({ entry: \'later-turn-embodiment-host-visible-progress\' })',
    ],
  },
  {
    entry: 'memory-ledger-rest-protective-emotional-closure',
    file: './runtime-memory-closure.test.ts',
    snippets: [
      'persists richer emotional closure carry into the person-state memory ledger instead of flattening it to the canonical project brief',
      'late-night-drain closure: keep reply low-pressure, initiative rest-protective, and embodiment repair-before-closeness on the same living line.',
      'Rest-protective companionship helped the same living line stay believable.',
    ],
  },
  {
    entry: 'self-continuity-rest-protective-quiet-companionship-authority',
    file: './self-continuity-authority-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that self-continuity authority preserves same-her Phase 1 project carry, canonical fallback, and quiet-companionship inward authority instead of flattening runtime selfhood into a generic project shell',
      'expect.objectContaining({ entry: \'self-continuity-rest-protective-project-carry\' })',
      'expect.objectContaining({ entry: \'self-continuity-hyphenated-quiet-companionship\' })',
    ],
  },
  {
    entry: 'visible-rest-protective-companionship-carry',
    file: './proactive-mind/visible-utterance-realization.test.ts',
    snippets: [
      'keeps richer rest-protective companionship carry from the active self-revision patch when late-night inward care is the only surviving authority',
      'late-night-drain closure: keep reply low-pressure, initiative rest-protective, and embodiment quiet-companionship while the line holds inward.',
      'expect(resolved.visibleReplyRealization.sameHerInwardCarry).toContain(\'rest-protective companionship\')',
      'expect(resolved.visibleReplyRealization.projectStateAudit).toEqual(expect.objectContaining({',
    ],
  },
  {
    entry: 'runtime-rest-protective-visual-presence-host-line',
    file: './runtime.test.ts',
    snippets: [
      'continuityRestraint: \'rest-protective\'',
      'continuityCadence: \'rest-protective\'',
      'expect(visualPresenceState?.residentPerformance?.reasonTags).toEqual(expect.arrayContaining([',
      '\'same-her-inward-carry\',',
      '\'rest-protective\',',
      '\'quiet-companionship\',',
    ],
  },
  {
    entry: 'stream-meta-quiet-companionship-cross-modal-host-line',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      'reasonTags: [\'main-runtime\', \'quiet-companionship\', \'same-her-inward-carry\']',
      'Keep the same living line inward for now, and let quiet companionship hold before widening outward.',
      '"lastSegmentVoiceSummary":"pitch=-2.00 | rate=0.95 | energy=0.46 | cadence=0.40 | companion=quiet-companionship',
      '"lastSegmentFaceSummary":"emotion=thinking | cue=soft-gaze | expression=hold | intensity=0.34 | hold=280ms | mode=quiet-companionship',
      '"lastSegmentMotionSummary":"motion=stillness_guard | tail=quiet-companionship',
      '"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | continuity=reactive-articulation | hold=300ms | companion=quiet-companionship',
    ],
  },
] as const

describe('rest protective quiet companionship host visible bridge audit', () => {
  it('keeps one explicit compact cold proof that the desktop execution callback line can continue through host-visible embodiment recovery into rest-protective emotional closure writeback, self-continuity inward authority, proactive companionship carry, runtime resident presence, and host-visible quiet-companionship lane summaries instead of cooling noisy-desktop recovery back into a generic lower-pressure shell', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'desktop-execution-host-visible-embodiment-bridge' }),
      expect.objectContaining({ entry: 'memory-ledger-rest-protective-emotional-closure' }),
      expect.objectContaining({ entry: 'self-continuity-rest-protective-quiet-companionship-authority' }),
      expect.objectContaining({ entry: 'visible-rest-protective-companionship-carry' }),
      expect.objectContaining({ entry: 'runtime-rest-protective-visual-presence-host-line' }),
      expect.objectContaining({ entry: 'stream-meta-quiet-companionship-cross-modal-host-line' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the rest-protective quiet-companionship host-visible claim to current execution embodiment, memory, self-continuity, proactive, runtime, and stream-meta tests instead of only broader cross-modal prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('registers the rest-protective quiet-companionship host-visible bridge as repo truth while keeping fully sustained noisy-desktop convergence explicitly open', () => {
    const coverage = resolveAlicizationProjectStateCoverage()
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain(
      'rest-protective-quiet-companionship-host-visible-bridge-audit.test.ts',
    )
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain(
      'rest-protective quiet-companionship host-visible bridge',
    )

    expect(matrixSource).toContain('rest-protective-quiet-companionship-host-visible-bridge-audit.test.ts')
    expect(matrixSource).toContain('rest-protective quiet-companionship host-visible bridge')
    expect(auditSource).toContain(
      'rest-protective quiet-companionship host-visible bridge now also ties richer emotional closure writeback, self-continuity inward authority, proactive rest-protective companionship carry, runtime resident presence, and host-visible quiet-companionship lane summaries onto the same anthropomorphic same-her line',
    )
    expect(auditSource).toContain('still not full long-run closure proof under noisy desktop use')
  })
})
