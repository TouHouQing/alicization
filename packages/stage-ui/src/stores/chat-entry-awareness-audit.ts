import type { AlicizationProjectEntrypointGovernanceEntry } from '../../../../apps/stage-tamagotchi/src/main/services/alicization/project-state-brief'

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { resolveAlicizationProjectEntrypointGovernanceRegistry } from '../../../../apps/stage-tamagotchi/src/main/services/alicization/project-state-brief'

export type RendererChatEntryAwarenessMode
  = 'explicit-pre-dialogue-identity'
    | 'relies-on-chat-store-fallback'
    | 'direct-bridge-canonical-awareness'
    | 'shared-send-authority'

export interface RendererChatEntryAwarenessAuditEntry {
  relativePath: string
  mode: RendererChatEntryAwarenessMode
  responsibility: string
}

const rendererChatEntryRepoRoot = new URL('../../../../', import.meta.url)

let cachedRendererChatIngestEntrypointFiles: string[] | null = null
let cachedRendererDirectBridgeDialogueConsumerFiles: string[] | null = null
let cachedRendererVoiceDispatchCallerFiles: string[] | null = null
let cachedRendererComposerSurfaceFiles: string[] | null = null
let cachedRendererChatEntryGovernedFiles: string[] | null = null

function isRendererChatEntryAuditSource(relativePath: string) {
  return relativePath.endsWith('-audit.ts')
}

export function collectRendererChatIngestEntrypointFiles() {
  if (cachedRendererChatIngestEntrypointFiles)
    return cachedRendererChatIngestEntrypointFiles

  const ingestOutput = execFileSync('rg', [
    '-l',
    '\\.ingest\\(|\\bingest\\(',
    'apps',
    'packages',
    '-g',
    '!**/*.test.ts',
  ], {
    cwd: rendererChatEntryRepoRoot,
    encoding: 'utf8',
  })
  const transportOutput = execFileSync('rg', [
    '-l',
    'sanitizeAlicizationChatStartPayloadForTransport\\(',
    'apps/stage-tamagotchi/src/renderer',
    '-g',
    '!**/*.test.ts',
  ], {
    cwd: rendererChatEntryRepoRoot,
    encoding: 'utf8',
  })

  cachedRendererChatIngestEntrypointFiles = [
    ...ingestOutput.split('\n'),
    ...transportOutput.split('\n'),
  ]
    .map(line => line.trim())
    .filter(Boolean)
    .filter((relativePath) => {
      if (isRendererChatEntryAuditSource(relativePath))
        return false
      if (relativePath === 'packages/stage-ui/src/stores/chat.ts')
        return false
      if (relativePath === 'packages/stage-ui/src/stores/markdown-stress.ts')
        return true
      return relativePath.endsWith('.ts') || relativePath.endsWith('.vue')
    })
    .map((relativePath) => {
      if (relativePath.startsWith('apps/'))
        return `../../../../${relativePath}`

      if (relativePath.startsWith('packages/stage-ui/src/stores/'))
        return relativePath.replace(/^packages\/stage-ui\/src\/stores\//, './')

      return `../../../../${relativePath}`
    })
    .sort()

  return cachedRendererChatIngestEntrypointFiles
}

export function collectRendererDirectBridgeDialogueConsumerFiles() {
  if (cachedRendererDirectBridgeDialogueConsumerFiles)
    return cachedRendererDirectBridgeDialogueConsumerFiles

  const output = execFileSync('rg', [
    '-l',
    'bridge\\.streamChat\\(|bridge\\.chatStart\\(|bridgeStreamChat\\(|bridgeChatStart\\(',
    'packages',
    '-g',
    '!**/*.test.ts',
  ], {
    cwd: rendererChatEntryRepoRoot,
    encoding: 'utf8',
  })

  cachedRendererDirectBridgeDialogueConsumerFiles = output
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .filter((relativePath) => {
      if (isRendererChatEntryAuditSource(relativePath))
        return false
      if (relativePath === 'packages/stage-ui/src/stores/alicization-bridge.ts')
        return false
      return relativePath.endsWith('.ts')
    })
    .map((relativePath) => {
      if (relativePath.startsWith('packages/stage-ui/src/stores/'))
        return relativePath.replace(/^packages\/stage-ui\/src\/stores\//, './')

      return `../../../../${relativePath}`
    })
    .sort()

  return cachedRendererDirectBridgeDialogueConsumerFiles
}

export function collectRendererVoiceDispatchCallerFiles() {
  if (cachedRendererVoiceDispatchCallerFiles)
    return cachedRendererVoiceDispatchCallerFiles

  const output = execFileSync('rg', [
    '-l',
    'dispatch(Web|Pocket|Desktop)(VoiceTurn\\(|PerformancePlaygroundChatTurn\\()',
    'apps',
    '-g',
    '!**/*.test.ts',
  ], {
    cwd: rendererChatEntryRepoRoot,
    encoding: 'utf8',
  })

  cachedRendererVoiceDispatchCallerFiles = output
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .filter((relativePath) => {
      if (isRendererChatEntryAuditSource(relativePath))
        return false
      const isSupportedVoiceDispatchEntrypoint
        = relativePath.endsWith('.vue') || relativePath.endsWith('.ts')
      if (!isSupportedVoiceDispatchEntrypoint)
        return false

      if (relativePath.endsWith('.vue'))
        return true

      const source = readFileSync(join(rendererChatEntryRepoRoot.pathname, relativePath), 'utf8')

      return !source.includes('.ingest(')
    })
    .map(relativePath => `../../../../${relativePath}`)
    .sort()

  return cachedRendererVoiceDispatchCallerFiles
}

export function collectRendererComposerSurfaceFiles() {
  if (cachedRendererComposerSurfaceFiles)
    return cachedRendererComposerSurfaceFiles

  const output = execFileSync('rg', [
    '-l',
    'useChatTextComposerStore\\(|sendCurrentMessage\\(',
    'apps',
    'packages',
    '-g',
    '**/*.vue',
    '-g',
    '**/*.ts',
    '-g',
    '!**/*.test.ts',
  ], {
    cwd: rendererChatEntryRepoRoot,
    encoding: 'utf8',
  })

  cachedRendererComposerSurfaceFiles = output
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .filter((relativePath) => {
      if (isRendererChatEntryAuditSource(relativePath))
        return false
      if (!relativePath.endsWith('.vue') && !relativePath.endsWith('.ts'))
        return false

      const source = readFileSync(join(rendererChatEntryRepoRoot.pathname, relativePath), 'utf8')
      return source.includes('useChatTextComposerStore(') && source.includes('sendCurrentMessage(')
    })
    .map((relativePath) => {
      if (relativePath.startsWith('packages/'))
        return `../../../../${relativePath}`

      if (relativePath.startsWith('apps/'))
        return `../../../../${relativePath}`

      return relativePath
    })
    .sort()

  return cachedRendererComposerSurfaceFiles
}

export function collectRendererChatEntryGovernedFiles() {
  if (cachedRendererChatEntryGovernedFiles)
    return cachedRendererChatEntryGovernedFiles

  cachedRendererChatEntryGovernedFiles = [
    ...new Set([
      ...collectRendererChatIngestEntrypointFiles(),
      ...collectRendererDirectBridgeDialogueConsumerFiles(),
      ...collectRendererVoiceDispatchCallerFiles(),
      ...collectRendererComposerSurfaceFiles(),
    ]),
  ].sort()

  return cachedRendererChatEntryGovernedFiles
}

export function classifyRendererChatEntryAwarenessMode(entry: Pick<AlicizationProjectEntrypointGovernanceEntry, 'relativePath' | 'mode'>) {
  if (entry.mode === 'authority')
    return 'explicit-pre-dialogue-identity' as const
  if (entry.mode === 'normalize-before-use')
    return 'relies-on-chat-store-fallback' as const
  if (entry.mode === 'read-only-downstream')
    return 'direct-bridge-canonical-awareness' as const
  if (entry.mode === 'shared-send-authority')
    return 'shared-send-authority' as const

  throw new Error(`Unexpected Alicization chat-entry governance mode for ${entry.relativePath}: ${entry.mode}`)
}

export const rendererChatEntryAwarenessAuditRegistry = resolveAlicizationProjectEntrypointGovernanceRegistry()
  .filter(entry => entry.domain === 'chat-entry')
  .map(entry => ({
    relativePath: entry.relativePath,
    mode: classifyRendererChatEntryAwarenessMode(entry),
    responsibility: entry.responsibility,
  })) as readonly RendererChatEntryAwarenessAuditEntry[]

export const rendererChatEntryExplicitPreDialogueIdentityFiles
  = rendererChatEntryAwarenessAuditRegistry
    .filter(entry => entry.mode === 'explicit-pre-dialogue-identity')
    .map(entry => entry.relativePath)

export const rendererChatEntryReliesOnChatStoreFallbackFiles
  = rendererChatEntryAwarenessAuditRegistry
    .filter(entry => entry.mode === 'relies-on-chat-store-fallback')
    .map(entry => entry.relativePath)

const rendererChatEntryOnlyFallbackBoundaryFile
  = '../../../../apps/stage-tamagotchi/src/renderer/components/InteractiveArea.vue' as const

export const rendererChatEntryDirectBridgeCanonicalAwarenessFiles
  = rendererChatEntryAwarenessAuditRegistry
    .filter(entry => entry.mode === 'direct-bridge-canonical-awareness')
    .map(entry => entry.relativePath)

export const rendererChatEntrySharedSendAuthorityFiles
  = rendererChatEntryAwarenessAuditRegistry
    .filter(entry => entry.mode === 'shared-send-authority')
    .map(entry => entry.relativePath)

export function resolveRendererChatEntryAwarenessAuditRegistry() {
  return rendererChatEntryAwarenessAuditRegistry
}

export function resolveRendererChatEntryAwarenessAuditFiles() {
  return rendererChatEntryAwarenessAuditRegistry.map(entry => entry.relativePath)
}

export function resolveRendererChatEntryAwarenessMode(relativePath: string) {
  return rendererChatEntryAwarenessAuditRegistry.find(entry => entry.relativePath === relativePath)?.mode ?? null
}

export function resolveRendererChatEntryOnlyFallbackBoundaryFile() {
  if (
    rendererChatEntryReliesOnChatStoreFallbackFiles.length !== 1
    || rendererChatEntryReliesOnChatStoreFallbackFiles[0] !== rendererChatEntryOnlyFallbackBoundaryFile
  ) {
    throw new Error(
      `Expected exactly one renderer chat-entry fallback boundary at ${rendererChatEntryOnlyFallbackBoundaryFile}, got ${rendererChatEntryReliesOnChatStoreFallbackFiles.join(', ') || '(none)'}`,
    )
  }

  return rendererChatEntryOnlyFallbackBoundaryFile
}
