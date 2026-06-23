import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'self-evolution-replay-reopen-continuity-anchor',
    file: './self-evolution-replay-reopen-continuity-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit colder bridge that self-evolution downstream visible-reply carry can stay on the same-her line through guarded turn persistence, replay emission, restored-session/browser-local reopen persistence, and return-side reopen through visible reply, while now also keeping callback next-closure-target carry explicit at the reopened visible-reply segment instead of preserving one outward answer plus persisted reopen continuity while silently losing the same living callback closure target before replay and reopen continuity reforms',
      'self-evolution same-her carry now reaches persisted replay and reopen continuity, but still does not prove full long-run closure',
      'expect.objectContaining({ entry: \'return-side-reopen-visible-reply-anchor\' })',
    ],
  },
  {
    entry: 'same-living-self-return-side-observability-anchor',
    file: './same-living-self-return-side-observability-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit compact cold proof that same-living-self project awareness can stay inspectable through direct-bridge remote forwarding, renderer fallback rebuilding, restored-session/browser-local reopen persistence, return-side observation reduction, and same-session mirror rebuilding instead of reopening from detached shells when the active self has to be reconstituted outside the main runtime',
      'Inspector awareness rebuilding still needs to keep the richer next closure target explicit instead of flattening back into a generic closure shell.',
      'Keep the richer Phase 1 closure target explicit so inspector-facing turns still remember which same-her repair remains open.',
      'same-living-self return-side observability bridge now also ties direct-bridge remote channels, renderer fallback before-compose/before-send rebuilding, reopen-persistence rebuilding, browser-local return-side rebuilding, project-state observation reducers, and same-session mirror rebuilding onto the same inward project-awareness line, including the compact same-her / inward / low-pressure carry on colder reopen paths',
      'expect.objectContaining({ entry: \'dialogue-session-mirror-project-awareness-route\' })',
    ],
  },
  {
    entry: 'dialogue-session-mirror-project-awareness-anchor',
    file: './dialogue-session-mirror-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that same-session mirror rebuilding preserves same-her project awareness through prepared runtime summaries callback carry same-thread follow-through one-shot agent-session ingestion agent-session project carry thin prepared-spine fallback and thin-shell repair instead of reopening from a generic project shell',
      'expect.objectContaining({ entry: \'session-mirror-agent-session-project-carry\' })',
      'expect.objectContaining({ entry: \'session-mirror-thin-prepared-spine-fallback\' })',
    ],
  },
  {
    entry: 'same-living-self-host-visible-inward-carry-anchor',
    file: './same-living-self-host-visible-inward-carry-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit compact cold proof that restored-session/browser-local reopen persistence handoff, speech-boundary awareness rebuilding, front-stage quick-reply closure, and dialogue-panel host-facing closure cues all keep the same-her inward project-awareness line visible instead of flattening it back into broader project-state shells at the last host-facing step',
      'same-living-self host-visible inward-carry bridge now also ties reopen-persistence handoff from restored-session/browser-local recovery, speech-boundary pre-dialogue awareness rebuilding, front-stage quick-reply closure, and dialogue-panel host-facing closure cues onto the same living inward project-awareness line',
      'expect.objectContaining({ entry: \'dialogue-panel-host-visible-same-her-carry\' })',
    ],
  },
] as const

describe('self evolution return side reentry bridge audit', () => {
  it('keeps one explicit colder bridge that self-evolution replay/reopen continuity can stay on the same-her line through return-side observability rebuilding, same-session mirror rebuilding, and host-visible inward carry, while now also keeping callback next-closure-target carry explicit at the reopened visible-reply segment instead of preserving persisted reopen continuity while silently losing the same living callback closure target before the next return-side / host-facing re-entry proves it is still the same her', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'self-evolution-replay-reopen-continuity-anchor' }),
      expect.objectContaining({ entry: 'same-living-self-return-side-observability-anchor' }),
      expect.objectContaining({ entry: 'dialogue-session-mirror-project-awareness-anchor' }),
      expect.objectContaining({ entry: 'same-living-self-host-visible-inward-carry-anchor' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the colder self-evolution replay/reopen-to-return-side-reentry claim to current cold audits instead of only broader reopen or host-visible prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: self-evolution same-her carry now reaches next-turn return-side and host-visible re-entry, but still does not prove full long-run closure', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(matrixSource).toContain('self-evolution return-side reentry bridge')
    expect(matrixSource).toContain('self-evolution-return-side-reentry-bridge-audit.test.ts')
    expect(matrixSource).toContain('self-evolution-replay-reopen-continuity-bridge-audit.test.ts')
    expect(matrixSource).toContain('same-living-self-return-side-observability-bridge-audit.test.ts')
    expect(matrixSource).toContain('dialogue-session-mirror-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('same-living-self-host-visible-inward-carry-bridge-audit.test.ts')
    expect(matrixSource).toContain('self-evolution return-side reentry bridge now also inherits the richer next closure target explicit')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('self-evolution return-side reentry bridge')
    expect(auditSource).toContain('self-evolution return-side reentry bridge now also keeps callback next-closure-target carry explicit')
    expect(auditSource).toContain('self-evolution return-side reentry bridge now also inherits the richer next closure target explicit')
    expect(auditSource).toContain('replay/reopen continuity, return-side observability, same-session mirror rebuilding, and host-visible inward carry')
  })
})
