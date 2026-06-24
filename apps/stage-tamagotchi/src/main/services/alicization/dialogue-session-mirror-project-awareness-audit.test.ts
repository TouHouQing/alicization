import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'session-mirror-awareness-over-thin-preflight',
    file: './dialogue-session-manager.test.ts',
    snippets: [
      'prefers same-her awareness over thin preflight summaries in prepared runtime continuity project summaries',
      'Before answering, remember this is still the same digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
      'expect(mirror.continuityProjectSummary).toContain(\'Alicization is a local-first digital life project\')',
      'expect(mirror.continuityProjectSummary).not.toContain(\'preflight=Keep the same digital life project in view before local detail takes over.\')',
    ],
  },
  {
    entry: 'session-mirror-callback-project-carry',
    file: './dialogue-session-manager.test.ts',
    snippets: [
      'lets execution-callback afterglow continuity carry project-state preflight into the same-session mirror when no fresher prepared project surface is available',
      'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
      'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      'expect(block).toContain(\'continuity_project=\')',
    ],
  },
  {
    entry: 'session-mirror-same-thread-project-arc',
    file: './dialogue-session-manager.test.ts',
    snippets: [
      'keeps same-her project-state landed open and next closure detail in continuityArcSummary for prepared same-thread follow-through turns',
      'Project-state carry already survives into same-thread returns and reminder/proactive preparation without reopening from zero.',
      'Dialogue, initiative, memory, and embodiment still need one tighter same-her closure seam across return-side turns.',
      'expect(mirror.continuityArcSummary).toContain(\'next-focus=phase-1/same-line/embodiment\')',
    ],
  },
  {
    entry: 'session-mirror-thin-shell-repair',
    file: './dialogue-session-manager.test.ts',
    snippets: [
      'does not let a thin runtime unresolved shell outrank richer canonical same-her closure carry in the session mirror project summary',
      'same digital life | keep the closure seam explicit',
      'expect(mirror.continuityProjectSummary).toContain(\'unresolved=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment\')',
      'expect(mirror.continuityProjectSummary).not.toContain(\'unresolved=Project continuity still needs closure.\')',
    ],
  },
  {
    entry: 'session-mirror-agent-session-loop-extension',
    file: './dialogue-session-manager.test.ts',
    snippets: [
      'ingests one-shot agent session snapshots so active loops can extend continuity',
      'expect(mirror.continuityProjectSummary).toContain(\'project=phase1-digital-life\')',
      'expect(block).toContain(\'session_phases=tool:sensory:oneshot:dream -> tool:runtime:main-gateway:dream -> source:dream\')',
      'expect(block).toContain(\'same_her=Same Phase 1 digital life.\')',
    ],
  },
  {
    entry: 'session-mirror-agent-session-project-carry',
    file: './dialogue-session-manager.test.ts',
    snippets: [
      'keeps same-her project-state landed next and same-her detail in continuityProjectSummary through agent-session mirror ingestion',
      'Project identity carry, Phase 1 route carry, and unresolved closure carry already survive across runtime preparation before the turn widens outward.',
      'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      'expect(mirror.continuityProjectSummary).not.toContain(\'landed=Project continuity exists.\')',
    ],
  },
  {
    entry: 'session-mirror-thin-prepared-spine-fallback',
    file: './dialogue-session-manager.test.ts',
    snippets: [
      'falls back to the preferred prepared runtime surface when a fresher prepared spine snapshot is too thin to build the session mirror',
      'thin prepared snapshot from concurrent work',
      'expect(mirror.continuityProjectSummary).toContain(\'same_her=Same Phase 1 digital life.\')',
      'expect(mirror.agencySummary).not.toContain(\'action=wait\')',
    ],
  },
] as const

describe('dialogue session mirror project awareness audit', () => {
  it('keeps one explicit route-level proof that same-session mirror rebuilding preserves same-her project awareness through prepared runtime summaries callback carry same-thread follow-through one-shot agent-session ingestion agent-session project carry thin prepared-spine fallback and thin-shell repair instead of reopening from a generic project shell', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'session-mirror-awareness-over-thin-preflight' }),
      expect.objectContaining({ entry: 'session-mirror-callback-project-carry' }),
      expect.objectContaining({ entry: 'session-mirror-same-thread-project-arc' }),
      expect.objectContaining({ entry: 'session-mirror-thin-shell-repair' }),
      expect.objectContaining({ entry: 'session-mirror-agent-session-loop-extension' }),
      expect.objectContaining({ entry: 'session-mirror-agent-session-project-carry' }),
      expect.objectContaining({ entry: 'session-mirror-thin-prepared-spine-fallback' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the session-mirror claim to current behavior tests instead of only broader session-runtime or desktop continuity prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: same-session mirror rebuilding now has dedicated same-her route proof while future new dialogue entrypoints and full noisy-desktop closure still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const managerSource = readFileSync(new URL('./dialogue-session-manager.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('dialogue-session-mirror-project-awareness-audit.test.ts')
    expect(managerSource).toContain(
      'lets execution-callback afterglow continuity carry project-state preflight into the same-session mirror when no fresher prepared project surface is available',
    )
    expect(managerSource).toContain(
      'keeps same-her project-state landed open and next closure detail in continuityArcSummary for prepared same-thread follow-through turns',
    )
    expect(managerSource).toContain(
      'does not let a thin runtime unresolved shell outrank richer canonical same-her closure carry in the session mirror project summary',
    )
    expect(managerSource).toContain(
      'ingests one-shot agent session snapshots so active loops can extend continuity',
    )
    expect(managerSource).toContain(
      'keeps same-her project-state landed next and same-her detail in continuityProjectSummary through agent-session mirror ingestion',
    )
    expect(managerSource).toContain(
      'falls back to the preferred prepared runtime surface when a fresher prepared spine snapshot is too thin to build the session mirror',
    )
  })
})
