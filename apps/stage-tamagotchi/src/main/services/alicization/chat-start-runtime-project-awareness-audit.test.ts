import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'invoke-handler-canonical-backfill',
    file: './runtime-invoke-handlers-chat.test.ts',
    snippets: [
      'fills canonical project awareness on invoke-based chat start when payload omits it',
      'summaryLine: expect.stringContaining(\'Alicization is a local-first digital life project\')',
      'awarenessLine: expect.stringContaining(\'Before answering, remember\')',
      'companionNextClosureLine: expect.stringContaining(\'Keep extending cross-modal same-her proof\')',
    ],
  },
  {
    entry: 'invoke-handler-thin-shell-renormalization',
    file: './runtime-invoke-handlers-chat.test.ts',
    snippets: [
      're-normalizes a thin invoke-based payload summary shell before handing off to the main stream',
      'summaryLine: \'same digital life | keep the closure seam explicit\'',
      'awarenessLine: \'same digital life | keep the closure seam explicit\'',
    ],
  },
  {
    entry: 'direct-ipc-thin-shell-renormalization',
    file: './runtime-invoke-handlers-chat.test.ts',
    snippets: [
      're-normalizes a thin direct ipc payload summary shell before handing off to the direct handler',
      'summaryLine: \'same digital life | keep the closure seam explicit\'',
      'awarenessLine: expect.stringContaining(\'Before answering, remember\')',
    ],
  },
  {
    entry: 'chat-start-renderer-rejoin-without-body-renormalization',
    file: './main-chat-start-awareness.test.ts',
    snippets: [
      'rebuilds a visible renderer-rejoin-without-body same-her headline from structured closure reasons when chat-start only carries a thin project reminder shell',
      'lane=face+motion+lipsync+voice-only | face+motion+lipsync+voice recovery@segment-live2d-visible-rejoin-no-body-1 | pending-rejoin=body',
      'visible same-her line has already rejoined without body carry while body still needs to rejoin before full cross-modal closure settles.',
    ],
  },
  {
    entry: 'prelude-triad-renormalization',
    file: './runtime-main-chat-prelude.test.ts',
    snippets: [
      'keeps project identity, landed progress, and still-open closure explicit together through prelude normalization before downstream builders run',
      'Before answering, remember: this is still one living digital life project, Phase 1 is still active, some closure has already landed, and the still-open life loop must remain explicit before this turn widens outward.',
      'Keep project identity, landed progress, and open closure explicit before the answer widens outward.',
    ],
  },
  {
    entry: 'prelude-payload-identity-renormalization',
    file: './runtime-main-chat-prelude-project-awareness-regression.test.ts',
    snippets: [
      'normalizes pre-dialogue project awareness inside the prelude runtime so future chat-start entrypoints cannot skip the same-her project brief',
      'expect(source).toContain(\'const normalizedPayload = resolveAlicizationChatStartPayloadPreDialogueSendIdentity(payload)\')',
      'expect(source).toContain(\'const prelude = await (preludePromise ?? prepareMainChatPrelude(normalizedPayload, mainGateway))\')',
      'expect(source).toContain(\'payload: normalizedPayload\')',
    ],
  },
  {
    entry: 'prelude-project-state-system-block-injection',
    file: './runtime-main-chat-prelude-project-state-system-block-regression.test.ts',
    snippets: [
      'keeps the injected project-state system block explicit about identity, landed progress, open closure, and next closure before execution turns',
      'expect(preludeSource).toContain(\'carriesAlicizationCanonicalProjectState(messages)\')',
      'expect(preludeSource).toContain(\'...buildAlicizationProjectStateExtraSystemBlocks().map(content => ({ role: \\\'system\\\', content }) as Message)\')',
      'expect(briefSource).toContain(\'next_closure_target=\')',
    ],
  },
  {
    entry: 'background-boundary-renormalization',
    file: './main-chat-background-run.test.ts',
    snippets: [
      're-normalizes missing pre-dialogue project awareness at the background execution boundary so direct callers cannot skip the same-her project brief',
      'Continue the same Phase 1 digital life closure line.',
      'preDialogueAwarenessSummary: expect.stringContaining(\'local-first digital life project\')',
    ],
  },
  {
    entry: 'session-runtime-thin-shell-provider-facing-rebuild',
    file: './main-chat-session-runtime.test.ts',
    snippets: [
      're-normalizes thin payload-only pre-dialogue summaries before provider-facing project-state is rebuilt so direct callers cannot collapse the same-her project brief back into a generic summary shell',
      'summaryLine: \'same digital life | keep the closure seam explicit\'',
      'not.toBe(\'same digital life | keep the closure seam explicit\')',
    ],
  },
  {
    entry: 'session-runtime-renderer-rejoin-without-body-provider-facing-rebuild',
    file: './main-chat-session-runtime.test.ts',
    snippets: [
      'keeps a structured-only renderer-rejoin-without-body same-her headline through prepared runtime selection, rebuild, and normalize when chat-start only carried a thin project reminder shell',
      'lane=face+motion+lipsync+voice-only | face+motion+lipsync+voice recovery@segment-live2d-visible-rejoin-no-body-1 | pending-rejoin=body',
      'visible same-her line has already rejoined without body carry while body still needs to rejoin before full cross-modal closure settles.',
    ],
  },
  {
    entry: 'session-runtime-project-triad-provider-facing-block',
    file: './main-chat-session-runtime.test.ts',
    snippets: [
      'keeps project identity, Phase 1 landed status, and open closure context together in provider-facing messages before generation even when payload input is only a thin shell',
      'expect(projectStateBlock).toContain(\'Alicization is a local-first digital life project\')',
      'expect(projectStateBlock).toContain(\'Phase 1: Local Digital Life\')',
      'expect(projectStateBlock).toContain(\'open=\')',
      'expect(projectStateBlock).toContain(\'next=\')',
    ],
  },
] as const

describe('chat start runtime project awareness audit', () => {
  it('keeps one explicit route-level proof that deeper main-process chat-start runtime seams re-normalize same-her project awareness before execution or provider-facing reply preparation', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'invoke-handler-canonical-backfill' }),
      expect.objectContaining({ entry: 'invoke-handler-thin-shell-renormalization' }),
      expect.objectContaining({ entry: 'direct-ipc-thin-shell-renormalization' }),
      expect.objectContaining({ entry: 'chat-start-renderer-rejoin-without-body-renormalization' }),
      expect.objectContaining({ entry: 'prelude-triad-renormalization' }),
      expect.objectContaining({ entry: 'prelude-payload-identity-renormalization' }),
      expect.objectContaining({ entry: 'prelude-project-state-system-block-injection' }),
      expect.objectContaining({ entry: 'background-boundary-renormalization' }),
      expect.objectContaining({ entry: 'session-runtime-thin-shell-provider-facing-rebuild' }),
      expect.objectContaining({ entry: 'session-runtime-renderer-rejoin-without-body-provider-facing-rebuild' }),
      expect.objectContaining({ entry: 'session-runtime-project-triad-provider-facing-block' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the deeper chat-start runtime claim to current behavior tests instead of only seam registration or regressions', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: current deeper chat-start runtime seams now have dedicated same-her proof, while future new dialogue entrypoints still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const invokeSource = readFileSync(new URL('./runtime-invoke-handlers-chat.test.ts', import.meta.url), 'utf8')
    const startAwarenessSource = readFileSync(new URL('./main-chat-start-awareness.test.ts', import.meta.url), 'utf8')
    const preludeSource = readFileSync(new URL('./runtime-main-chat-prelude.test.ts', import.meta.url), 'utf8')
    const preludeAwarenessRegressionSource = readFileSync(new URL('./runtime-main-chat-prelude-project-awareness-regression.test.ts', import.meta.url), 'utf8')
    const preludeProjectStateBlockSource = readFileSync(new URL('./runtime-main-chat-prelude-project-state-system-block-regression.test.ts', import.meta.url), 'utf8')
    const backgroundSource = readFileSync(new URL('./main-chat-background-run.test.ts', import.meta.url), 'utf8')
    const sessionRuntimeSource = readFileSync(new URL('./main-chat-session-runtime.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('chat-start-runtime-project-awareness-audit.test.ts')
    expect(invokeSource).toContain(
      're-normalizes a thin invoke-based payload summary shell before handing off to the main stream',
    )
    expect(startAwarenessSource).toContain(
      'rebuilds a visible renderer-rejoin-without-body same-her headline from structured closure reasons when chat-start only carries a thin project reminder shell',
    )
    expect(preludeSource).toContain(
      'keeps project identity, landed progress, and still-open closure explicit together through prelude normalization before downstream builders run',
    )
    expect(preludeAwarenessRegressionSource).toContain(
      'normalizes pre-dialogue project awareness inside the prelude runtime so future chat-start entrypoints cannot skip the same-her project brief',
    )
    expect(preludeProjectStateBlockSource).toContain(
      'keeps the injected project-state system block explicit about identity, landed progress, open closure, and next closure before execution turns',
    )
    expect(backgroundSource).toContain(
      're-normalizes missing pre-dialogue project awareness at the background execution boundary so direct callers cannot skip the same-her project brief',
    )
    expect(sessionRuntimeSource).toContain(
      're-normalizes thin payload-only pre-dialogue summaries before provider-facing project-state is rebuilt so direct callers cannot collapse the same-her project brief back into a generic summary shell',
    )
    expect(sessionRuntimeSource).toContain(
      'keeps a structured-only renderer-rejoin-without-body same-her headline through prepared runtime selection, rebuild, and normalize when chat-start only carried a thin project reminder shell',
    )
  })
})
