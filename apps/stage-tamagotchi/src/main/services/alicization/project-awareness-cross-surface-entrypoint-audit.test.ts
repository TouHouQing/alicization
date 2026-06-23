import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  collectRendererChatEntryGovernedFiles,
} from '../../../../../../packages/stage-ui/src/stores/chat-entry-awareness-audit'
import {
  collectAlicizationChatEntryComposerSurfaceGovernedFiles,
} from './chat-entry-composer-surface-entrypoint-audit'
import {
  collectAlicizationPreDialogueTransportGovernedFiles,
} from './pre-dialogue-transport-entrypoint-audit'
import {
  collectAlicizationCrossSurfaceProjectAwarenessEntrypointCandidateFiles,
} from './project-awareness-cross-surface-entrypoint-audit'

describe('project awareness cross-surface entrypoint audit', () => {
  it('keeps the explicit governed cross-surface union sourced from one repo-level helper instead of re-encoding neighboring governance unions locally', () => {
    const source = readFileSync(new URL('./project-awareness-cross-surface-entrypoint-audit.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'./cross-surface-dialogue-entry-governance\'')
    expect(source).toContain('resolveAlicizationCrossSurfaceDialogueEntryGovernedFiles(')
    expect(source).not.toContain('const explicitGovernedFiles = new Set([')
  })

  it('keeps broader cross-surface dialogue-entry candidate discovery sourced from shared helpers instead of re-encoding one more local scan', () => {
    const helperSource = readFileSync(new URL('./cross-surface-dialogue-entry-governance.ts', import.meta.url), 'utf8')

    expect(helperSource).toContain('from \'./pre-dialogue-transport-entrypoint-audit\'')
    expect(helperSource).toContain('from \'./chat-entry-composer-surface-entrypoint-audit\'')
    expect(helperSource).toContain('from \'../../../../../../packages/stage-ui/src/stores/chat-entry-awareness-audit\'')
    expect(helperSource).toContain('collectAlicizationPreDialogueTransportGovernedFiles()')
    expect(helperSource).toContain('collectAlicizationChatEntryComposerSurfaceGovernedFiles()')
    expect(helperSource).toContain('collectRendererChatEntryGovernedFiles()')
    expect(/^function collectCrossSurfaceEntryFiles\(/m.test(helperSource)).toBe(false)
  })

  it('keeps cross-surface dialogue-entry candidate discovery broad enough to catch destructured ingest callers in real desktop chat surfaces instead of only member-call shapes', () => {
    const source = readFileSync(new URL('./project-awareness-cross-surface-entrypoint-audit.ts', import.meta.url), 'utf8')
    const interactiveAreaSource = readFileSync(new URL('../../../renderer/components/InteractiveArea.vue', import.meta.url), 'utf8')

    expect(interactiveAreaSource).toContain('await ingest(textToSend, {')
    expect(source).toContain('\\\\bingest\\\\(')
  })

  it('keeps cross-surface dialogue-entry candidate discovery broad enough to catch thin host-facing composer surfaces that reuse shared send authority instead of only direct ingest callsites', () => {
    const source = readFileSync(new URL('./project-awareness-cross-surface-entrypoint-audit.ts', import.meta.url), 'utf8')
    const chatAreaSource = readFileSync(new URL('../../../../../../packages/stage-layouts/src/components/Widgets/ChatArea.vue', import.meta.url), 'utf8')
    const mobileSource = readFileSync(new URL('../../../../../../packages/stage-layouts/src/components/Layouts/MobileInteractiveArea.vue', import.meta.url), 'utf8')
    const quickReplySource = readFileSync(new URL('../../../../../../packages/stage-ui/src/components/scenes/stage-quick-reply-composer.vue', import.meta.url), 'utf8')

    expect(chatAreaSource).toContain('const composerStore = useChatTextComposerStore()')
    expect(chatAreaSource).toContain('await composerStore.sendCurrentMessage()')
    expect(mobileSource).toContain('const composerStore = useChatTextComposerStore()')
    expect(mobileSource).toContain('await composerStore.sendCurrentMessage()')
    expect(quickReplySource).toContain('const composerStore = useChatTextComposerStore()')
    expect(quickReplySource).toContain('await composerStore.sendCurrentMessage()')
    expect(source).toContain('useChatTextComposerStore\\\\(')
    expect(source).toContain('sendCurrentMessage\\\\(')
  })

  it('keeps cross-surface dialogue-entry candidate discovery broad enough to catch future TypeScript composer wrappers instead of only Vue SFC surfaces', () => {
    const source = readFileSync(new URL('./project-awareness-cross-surface-entrypoint-audit.ts', import.meta.url), 'utf8')

    expect(source).toContain('useChatTextComposerStore\\\\(')
    expect(source).toContain('sendCurrentMessage\\\\(')
    expect(source).toContain('**/*.ts')
  })

  it('keeps cross-surface dialogue-entry candidate discovery broad enough to catch future package-level direct-bridge wrappers instead of only stage-ui store-local seams', () => {
    const source = readFileSync(new URL('./project-awareness-cross-surface-entrypoint-audit.ts', import.meta.url), 'utf8')

    expect(source).toMatch(/bridge\\\\\.streamChat\\\\\(\|bridge\\\\\.chatStart\\\\\(\|bridgeStreamChat\\\\\(\|bridgeChatStart\\\\\([\s\S]*'packages',/)
  })

  it('keeps the current cross-surface dialogue-entry candidate set equal to the explicit pre-dialogue transport, chat-entry, and composer-surface discovery union', () => {
    const rootDir = new URL('.', import.meta.url).pathname

    expect(collectAlicizationCrossSurfaceProjectAwarenessEntrypointCandidateFiles(rootDir)).toEqual([
      ...new Set([
        ...collectAlicizationPreDialogueTransportGovernedFiles(),
        ...collectAlicizationChatEntryComposerSurfaceGovernedFiles(),
        ...collectRendererChatEntryGovernedFiles(),
      ]),
    ].sort())
  }, 20_000)

  it('makes the current boundary explicit: broader cross-surface dialogue-entry candidates, including thin host-facing composer surfaces, now feed the same top-level project-awareness completeness guard, while wholly new route shapes still remain open', () => {
    const routeAuthoritySource = readFileSync(new URL('./project-awareness-route-authority-audit.test.ts', import.meta.url), 'utf8')
    const coverageSource = readFileSync(new URL('./project-awareness-coverage-matrix.test.ts', import.meta.url), 'utf8')
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')

    expect(routeAuthoritySource).toContain('from \'./project-awareness-cross-surface-entrypoint-audit\'')
    expect(routeAuthoritySource).toContain('collectAlicizationCrossSurfaceProjectAwarenessEntrypointCandidateFiles(')
    expect(coverageSource).toContain('project-awareness-cross-surface-entrypoint-audit.test.ts')
    expect(matrixSource).toContain('project-awareness-cross-surface-entrypoint-audit.test.ts')
    expect(matrixSource).toContain('cross-surface dialogue-entry candidate')
    expect(matrixSource).toContain('thin host-facing composer surfaces')
    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
  })
})
