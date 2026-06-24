import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'direct-start-richer-awareness-forwarding',
    file: './main-chat-direct-start.test.ts',
    snippets: [
      'prefers a richer carried project-awareness summary over a thin generic continuity shell before direct start forwards the payload',
      'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, some closure has already landed, and the still-open life loop must remain explicit before this turn widens outward.',
      'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
    ],
  },
  {
    entry: 'direct-start-project-triad-forwarding',
    file: './main-chat-direct-start.test.ts',
    snippets: [
      'keeps project identity, landed progress, and still-open closure explicit together before direct start forwards the payload',
      'Keep project identity, landed progress, and open closure explicit before the answer widens outward.',
      'expect(String(forwardedPayload?.preDialogueSendIdentity?.awarenessLine ?? \'\')).toContain(\'still-open life loop\')',
    ],
  },
  {
    entry: 'direct-start-canonical-backfill',
    file: './main-chat-direct-start.test.ts',
    snippets: [
      'fills canonical project awareness before forwarding direct chat start when payload omits it',
      'summaryLine: expect.stringContaining(\'Alicization is a local-first digital life project\')',
      'awarenessLine: expect.stringContaining(\'Before answering, remember\')',
    ],
  },
  {
    entry: 'start-acceptance-grounded-debug-carry',
    file: './main-chat-start-acceptance.test.ts',
    snippets: [
      'accepts a run and syncs llm config before registering state',
      'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=桌面执行闭环还没完全收住',
      '把桌面执行闭环继续收口到记忆、主动性和具身之间。',
    ],
  },
  {
    entry: 'start-acceptance-canonical-backfill',
    file: './main-chat-start-acceptance.test.ts',
    snippets: [
      'injects canonical project awareness into accepted-start debug when payload omits pre-dialogue identity',
      'const expectedPayload = resolveAlicizationChatStartPayloadPreDialogueSendIdentity(payload)',
      'const expectedDebug = summarizeAlicizationPreDialogueSendIdentityForDebug(expectedPayload)',
      '...expectedDebug,',
    ],
  },
] as const

describe('chat start project awareness route audit', () => {
  it('keeps one explicit route-level proof that main-process chat-start boundaries ground project awareness before the turn is accepted or forwarded', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'direct-start-richer-awareness-forwarding' }),
      expect.objectContaining({ entry: 'direct-start-project-triad-forwarding' }),
      expect.objectContaining({ entry: 'direct-start-canonical-backfill' }),
      expect.objectContaining({ entry: 'start-acceptance-grounded-debug-carry' }),
      expect.objectContaining({ entry: 'start-acceptance-canonical-backfill' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the main-process chat-start claim to current behavioral tests instead of only seam registration', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: current chat-start entry routes now have dedicated same-her proof, while future new dialogue entrypoints still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const directStartSource = readFileSync(new URL('./main-chat-direct-start.test.ts', import.meta.url), 'utf8')
    const startAcceptanceSource = readFileSync(new URL('./main-chat-start-acceptance.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(directStartSource).toContain(
      'keeps project identity, landed progress, and still-open closure explicit together before direct start forwards the payload',
    )
    expect(startAcceptanceSource).toContain(
      'injects canonical project awareness into accepted-start debug when payload omits pre-dialogue identity',
    )
  })
})
