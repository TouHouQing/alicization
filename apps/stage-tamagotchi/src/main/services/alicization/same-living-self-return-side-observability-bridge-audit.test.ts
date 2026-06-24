import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateCoverage } from './project-state-brief'

const proofRows = [
  {
    entry: 'return-side-project-awareness-registry',
    file: './return-side-project-awareness-audit.test.ts',
    snippets: [
      'keeps every return-side project-awareness bridge explicitly registered',
      'expect(source).toContain(\'readConversationTurnProjectStateObservation({\')',
      'expect(source).toContain(\'projectStateObservationToContinuitySnapshot(\')',
    ],
  },
  {
    entry: 'direct-bridge-project-awareness-route',
    file: '../../../../../../packages/stage-ui/src/stores/direct-bridge-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that direct bridge dialogue surfaces preserve or intentionally rebuild same-her project awareness across remote channels',
      'expect.objectContaining({ entry: \'context-bridge-broadcast-forwarding\' })',
      'expect(toolCallBroadcast?.context?.preDialogueSendIdentity).toEqual(context.preDialogueSendIdentity)',
    ],
  },
  {
    entry: 'renderer-fallback-project-awareness-route',
    file: '../../../../../../packages/stage-ui/src/stores/renderer-fallback-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that renderer chat fallback restores same-her project awareness before both compose-time and send-time dialogue surfaces',
      'expect.objectContaining({ entry: \'before-send-richer-host-visible-awareness\' })',
      'expect.objectContaining({ entry: \'before-compose-awareness-over-embodiment-headline\' })',
    ],
  },
  {
    entry: 'reopen-persistence-project-awareness-route',
    file: '../../../../../../packages/stage-ui/src/stores/reopen-persistence-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that restored-session fallback and browser-local replay preserve same-her project awareness before the next outward turn',
      'expect.objectContaining({ entry: \'restored-session-inward-low-pressure-same-her-carry\' })',
      'expect.objectContaining({ entry: \'duplicate-turn-merge-inward-low-pressure-same-her-carry\' })',
    ],
  },
  {
    entry: 'browser-local-return-side-project-awareness-route',
    file: '../../../../../../packages/stage-ui/src/stores/browser-local-return-side-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that browser-local return-side persistence rebuilds same-her project awareness before the next outward turn',
      'expect.objectContaining({ entry: \'browser-local-awareness-over-embodiment-headline\' })',
      'expect.objectContaining({ entry: \'browser-local-inward-low-pressure-awareness-compaction\' })',
    ],
  },
  {
    entry: 'project-state-observation-project-awareness-route',
    file: '../../../../../../packages/stage-ui/src/stores/project-state-observation-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that return-side observation rebuilds same-her continuity snapshots before later turns reopen',
      'expect.objectContaining({ entry: \'observation-base-project-state-reason-preview-backfill\' })',
      'expect.objectContaining({ entry: \'observation-awareness-over-embodiment-headline\' })',
      'expect.objectContaining({ entry: \'observation-inward-low-pressure-awareness-compaction\' })',
      'expect.objectContaining({ entry: \'observation-resume-reasons-carry\' })',
    ],
  },
  {
    entry: 'self-evolution-inspector-fallback-project-awareness-route',
    file: '../../../../../../packages/stage-ui/src/stores/alicization-self-evolution-inspector.test.ts',
    snippets: [
      'builds the pre-dialogue closure snapshot from the latest project-state observation when the canonical continuity snapshot is unavailable',
      'Inspector awareness rebuilding still needs to keep the richer next closure target explicit instead of flattening back into a generic closure shell.',
      'Keep the richer Phase 1 closure target explicit so inspector-facing turns still remember which same-her repair remains open.',
      'expect(getLatestProjectStateObservation).toBeCalledTimes(1)',
      'expect(store.projectStateContinuitySnapshot).toEqual({',
      'expect(store.preDialogueAwarenessSnapshot).toEqual({',
      'expect(store.preDialogueClosureSnapshot).toEqual(expect.objectContaining({',
    ],
  },
  {
    entry: 'dialogue-session-mirror-project-awareness-route',
    file: './dialogue-session-mirror-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that same-session mirror rebuilding preserves same-her project awareness through prepared runtime summaries callback carry same-thread follow-through one-shot agent-session ingestion agent-session project carry thin prepared-spine fallback and thin-shell repair instead of reopening from a generic project shell',
      'expect.objectContaining({ entry: \'session-mirror-callback-project-carry\' })',
      'expect.objectContaining({ entry: \'session-mirror-thin-shell-repair\' })',
      'expect.objectContaining({ entry: \'session-mirror-agent-session-project-carry\' })',
    ],
  },
] as const

describe('same living self return side observability bridge audit', () => {
  it('keeps one explicit compact cold proof that same-living-self project awareness can stay inspectable through direct-bridge remote forwarding, renderer fallback rebuilding, restored-session/browser-local reopen persistence, return-side observation reduction, and same-session mirror rebuilding instead of reopening from detached shells when the active self has to be reconstituted outside the main runtime', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'return-side-project-awareness-registry' }),
      expect.objectContaining({ entry: 'direct-bridge-project-awareness-route' }),
      expect.objectContaining({ entry: 'renderer-fallback-project-awareness-route' }),
      expect.objectContaining({ entry: 'reopen-persistence-project-awareness-route' }),
      expect.objectContaining({ entry: 'browser-local-return-side-project-awareness-route' }),
      expect.objectContaining({ entry: 'project-state-observation-project-awareness-route' }),
      expect.objectContaining({ entry: 'self-evolution-inspector-fallback-project-awareness-route' }),
      expect.objectContaining({ entry: 'dialogue-session-mirror-project-awareness-route' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the same-living-self return-side observability claim to current direct-bridge, fallback, observation, and mirror audits instead of only broader living-self prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('registers the same-living-self return-side observability bridge as repo truth while keeping future dialogue entrypoints and fuller long-run closure explicitly open', () => {
    const coverage = resolveAlicizationProjectStateCoverage()
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('same-living-self-return-side-observability-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('direct-bridge-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('renderer-fallback-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('reopen-persistence-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('browser-local-return-side-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('project-state-observation-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('alicization-self-evolution-inspector.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('dialogue-session-mirror-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.responsibility).toContain('self-evolution inspector fallback')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.responsibility).toContain('same-living-self return-side observability bridge')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.responsibility).toContain('richer next closure target explicit')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.responsibility).toContain('reopen-persistence rebuilding')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.responsibility).toContain('browser-local return-side rebuilding')

    expect(matrixSource).toContain('same-living-self-return-side-observability-bridge-audit.test.ts')
    expect(matrixSource).toContain('same-living-self return-side observability bridge')
    expect(matrixSource).toContain('same-living-self return-side observability bridge now also keeps the richer next closure target explicit')
    expect(matrixSource).toContain('self-evolution inspector fallback')
    expect(matrixSource).toContain('reopen-persistence-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('Browser-local return-side rebuild now also has its own explicit route-level proof that stored turns, continuity summaries, imported assistant history, and compact same-her / inward / low-pressure carry preserve richer host-visible same-her project awareness')
    expect(matrixSource).toContain('The return-side observation reducer now also has dedicated route-level proof that thin-shell carry, unfinished embodiment closure, quieter body-led closure carry, compact same-her / inward / low-pressure awareness compaction, richer Phase 1 awareness, and resumed same-her reasons survive observation-to-continuity rebuilding before later turns reopen')
    expect(auditSource).toContain('self-evolution inspector fallback')
    expect(auditSource).toContain('same-living-self return-side observability bridge now also keeps the richer next closure target explicit')
    expect(auditSource).toContain('same-living-self return-side observability bridge now also ties direct-bridge remote channels, renderer fallback before-compose/before-send rebuilding, reopen-persistence rebuilding, browser-local return-side rebuilding, project-state observation reducers, and same-session mirror rebuilding onto the same inward project-awareness line, including the compact same-her / inward / low-pressure carry on colder reopen paths')
    expect(auditSource).toContain('This still does not prove every future dialogue entrypoint will inherit the same chain automatically.')
  })
})
