import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateCoverage } from './project-state-brief'

const proofRows = [
  {
    entry: 'return-side-stream-project-awareness-route',
    file: './return-side-stream-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that return-side stream bridging, structured normalization, active ingest persistence, and restored assistant history preserve same-her project awareness',
      'current return-side stream and restore routes now have dedicated same-her proof',
      'future new dialogue entrypoints still remain open',
    ],
  },
  {
    entry: 'browser-local-return-side-project-awareness-route',
    file: '../../../../../../packages/stage-ui/src/stores/browser-local-return-side-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that browser-local return-side persistence rebuilds same-her project awareness before the next outward turn',
      'browser-local return-side rebuild now has dedicated same-her proof',
      'future new dialogue entrypoints still remain open',
    ],
  },
  {
    entry: 'renderer-fallback-before-send-awareness-route',
    file: '../../../../../../packages/stage-ui/src/stores/renderer-fallback-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that renderer chat fallback restores same-her project awareness before both compose-time and send-time dialogue surfaces',
      'rebuilds actual before-send pre-dialogue identity from session fallback when inspector snapshots are missing',
      'Before-send entry awareness still needs to preserve the stronger host-visible project brief before runtime dispatch starts.',
    ],
  },
  {
    entry: 'chat-entry-route-project-awareness-route',
    file: './chat-entry-route-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that known renderer and bridge dialogue entry routes either inject explicit same-her identity or intentionally rely on canonical fallback authority',
      'fallback-authority-rebuilds-richer-awareness',
      'future new dialogue entrypoints still remain open',
    ],
  },
  {
    entry: 'shared-pre-dialogue-send-identity-authority',
    file: '../../../../../../packages/stage-ui/src/stores/chat-core-pre-dialogue-authority.test.ts',
    snippets: [
      'anchors the shared helper to current thin-shell repair proof so explicit send-entry authority does not stop at delegation',
      'upgrades thin carried awareness to the richer same-her project brief before building send identity',
      'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
    ],
  },
] as const

describe('return-side reopen pre-dialogue send-identity bridge audit', () => {
  it('keeps one explicit cold proof bridge that return-side reopen continuity can rematerialize into pre-dialogue send identity before the next outward turn re-enters chat-start execution', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'return-side-stream-project-awareness-route' }),
      expect.objectContaining({ entry: 'browser-local-return-side-project-awareness-route' }),
      expect.objectContaining({ entry: 'renderer-fallback-before-send-awareness-route' }),
      expect.objectContaining({ entry: 'chat-entry-route-project-awareness-route' }),
      expect.objectContaining({ entry: 'shared-pre-dialogue-send-identity-authority' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the return-side reopen to pre-dialogue send-identity claim to current return-side, fallback, and chat-entry tests instead of only broader entrypoint or route-authority prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('registers the return-side-reopen-to-pre-dialogue-send-identity same-her bridge as repo truth while keeping future entrypoint drift explicitly open', () => {
    const coverage = resolveAlicizationProjectStateCoverage()
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(coverage.find(item => item.id === 'chat-start-pre-dialogue-awareness-chain')?.proof).toContain('return-side-reopen-pre-dialogue-send-identity-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'chat-start-pre-dialogue-awareness-chain')?.responsibility).toContain('return-side-reopen-to-pre-dialogue-send-identity same-her bridge')

    expect(matrixSource).toContain('return-side-reopen-pre-dialogue-send-identity-bridge-audit.test.ts')
    expect(matrixSource).toContain('return-side-reopen-to-pre-dialogue-send-identity same-her bridge')
    expect(auditSource).toContain('return-side-reopen-to-pre-dialogue-send-identity same-her bridge now also ties return-side stream bridging')
    expect(auditSource).toContain('the repo still does not yet prove every future dialogue entrypoint will inherit the same chain automatically')
  })
})
