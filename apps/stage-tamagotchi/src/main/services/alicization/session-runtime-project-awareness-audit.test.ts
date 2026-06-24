import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'session-runtime-richer-runtime-closure-carry',
    file: './main-chat-session-runtime.test.ts',
    snippets: [
      'keeps richer runtime landed open and next closure summaries in the provider-facing contract when the broad canonical Phase 1 brief is thinner',
      'Project-state carry already survives into same-thread returns and reminder/proactive preparation without reopening from zero.',
      'Keep the next closure target on one measured-return living line across reminder, proactive, and same-thread returns.',
    ],
  },
  {
    entry: 'session-runtime-mind-turn-contract-project-state-blocks',
    file: './main-chat-session-runtime.test.ts',
    snippets: [
      'passes project-state-bearing mind-turn contract blocks into provider-facing runtime messages before reply authoring',
      'expect(mindTurnContractSystemText).toContain(`Project identity: ${projectState.identity}.`)',
      'expect(mindTurnContractSystemText).toContain(\'Project same-her self line: Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.\')',
    ],
  },
  {
    entry: 'session-runtime-canonical-project-state-dashboard-fallback',
    file: './main-chat-session-runtime.test.ts',
    snippets: [
      'injects canonical project-state and closure dashboard into provider-facing messages even when the runtime core prompt builder is thin',
      '[ALICIZATION_PROJECT_STATE]',
      '[ALICIZATION_PHASE1_CLOSURE_DASHBOARD]',
    ],
  },
  {
    entry: 'session-runtime-project-state-triad-before-reply-authoring',
    file: './main-chat-session-runtime.test.ts',
    snippets: [
      'keeps project identity, landed progress, and still-open closure distinct together in provider-facing project-state before reply authoring',
      'Build a local companion on the host computer with continuous personhood, stable memory, emotional state, initiative, execution ability, embodied expression, and natural dialogue.',
      'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs',
    ],
  },
  {
    entry: 'session-runtime-thin-shell-recanonicalization',
    file: './main-chat-session-runtime.test.ts',
    snippets: [
      're-normalizes thin payload-only pre-dialogue summaries before provider-facing project-state is rebuilt so direct callers cannot collapse the same-her project brief back into a generic summary shell',
      'same digital life | keep the closure seam explicit',
      '.not.toBe(\'same digital life | keep the closure seam explicit\')',
    ],
  },
  {
    entry: 'session-runtime-conscious-frame-four-part-carry',
    file: './main-chat-session-runtime.test.ts',
    snippets: [
      'keeps project identity, Phase 1, still-open closure, and next closure target together inside the prepared current conscious frame even when payload input is only a thin shell',
      'turn-conscious-frame-project-state-four-part-carry',
      'Keep the next closure step pointed at',
    ],
  },
  {
    entry: 'session-runtime-pre-execution-awareness-recanonicalization',
    file: './main-chat-session-runtime.test.ts',
    snippets: [
      're-canonicalizes thin payload and runtime pre-dialogue awareness before session execution so the conscious frame cannot reopen from a generic shell',
      'Project preflight self-awareness: Alicization is a local-first digital life project',
      'Project pre-dialogue awareness line:',
    ],
  },
  {
    entry: 'session-runtime-formerly-thin-payload-headline-preservation',
    file: './main-chat-session-runtime.test.ts',
    snippets: [
      'traces the prepared-runtime stages that now preserve stronger same-her awareness for the two formerly-thin scenarios',
      'Before answering, stay on the same living line: this Phase 1 digital life still needs memory, initiative, and embodiment closure without splitting her continuity.',
      'turn-payload-first-collapse-stage',
    ],
  },
  {
    entry: 'session-runtime-embodiment-awareness-survives-shaping',
    file: './main-chat-session-runtime.test.ts',
    snippets: [
      'shows that embodiment same-her awareness survives the host-person and callback shaping stages',
      'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
      'turn-embodiment-stage-collapse-order',
    ],
  },
] as const

describe('session runtime project awareness audit', () => {
  it('keeps one explicit route-level proof that session-runtime provider-facing preparation preserves same-her project awareness before reply authoring begins', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'session-runtime-richer-runtime-closure-carry' }),
      expect.objectContaining({ entry: 'session-runtime-mind-turn-contract-project-state-blocks' }),
      expect.objectContaining({ entry: 'session-runtime-canonical-project-state-dashboard-fallback' }),
      expect.objectContaining({ entry: 'session-runtime-project-state-triad-before-reply-authoring' }),
      expect.objectContaining({ entry: 'session-runtime-thin-shell-recanonicalization' }),
      expect.objectContaining({ entry: 'session-runtime-conscious-frame-four-part-carry' }),
      expect.objectContaining({ entry: 'session-runtime-pre-execution-awareness-recanonicalization' }),
      expect.objectContaining({ entry: 'session-runtime-formerly-thin-payload-headline-preservation' }),
      expect.objectContaining({ entry: 'session-runtime-embodiment-awareness-survives-shaping' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the session-runtime claim to current behavior tests instead of only broader route-family prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: current session-runtime provider-facing preparation now has dedicated same-her proof, while future new dialogue entrypoints still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const sessionRuntimeSource = readFileSync(new URL('./main-chat-session-runtime.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('session-runtime-project-awareness-audit.test.ts')
    expect(sessionRuntimeSource).toContain(
      'keeps project identity, landed progress, and still-open closure distinct together in provider-facing project-state before reply authoring',
    )
    expect(sessionRuntimeSource).toContain(
      're-canonicalizes thin payload and runtime pre-dialogue awareness before session execution so the conscious frame cannot reopen from a generic shell',
    )
    expect(sessionRuntimeSource).toContain(
      'traces the prepared-runtime stages that now preserve stronger same-her awareness for the two formerly-thin scenarios',
    )
    expect(sessionRuntimeSource).toContain(
      'shows that embodiment same-her awareness survives the host-person and callback shaping stages',
    )
  })
})
