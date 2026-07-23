import { spawnSync } from 'node:child_process'

import { resolveAlicizationCrossSurfaceDialogueEntryGovernedFiles } from './cross-surface-dialogue-entry-governance'

const crossSurfaceEntrypointRepoRoot = new URL('../../../../../../', import.meta.url)

let cachedCrossSurfaceRepoRelativeCandidates: string[] | null = null
let cachedCrossSurfaceEntrypointCandidateFiles: string[] | null = null

function isCrossSurfaceEntrypointAuditSource(repoRelativePath: string) {
  return repoRelativePath.endsWith('-audit.ts')
}

function collectRepoRelativePaths(args: string[]) {
  const result = spawnSync('rg', args, {
    cwd: crossSurfaceEntrypointRepoRoot,
    encoding: 'utf8',
  })

  if (result.status === 1)
    return []
  if (result.status !== 0)
    throw result.error ?? new Error(result.stderr || `rg exited with status ${result.status}`)

  return result.stdout
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .filter(relativePath => !isCrossSurfaceEntrypointAuditSource(relativePath))
}

function toCrossSurfaceCandidateRelativePath(
  repoRelativePath: string,
  explicitGovernedFiles: ReadonlySet<string>,
) {
  if (repoRelativePath === 'apps/stage-tamagotchi/src/shared/alicization-chat-transport.ts')
    return null

  if (repoRelativePath === 'apps/stage-tamagotchi/src/renderer/App.vue')
    return '../../../renderer/App.vue'

  if (repoRelativePath.startsWith('packages/stage-ui/src/stores/')) {
    const packageShortPath = `./${repoRelativePath.slice('packages/stage-ui/src/stores/'.length)}`
    if (explicitGovernedFiles.has(packageShortPath))
      return packageShortPath

    return `../../../../../../${repoRelativePath}`
  }

  if (repoRelativePath.startsWith('packages/'))
    return `../../../../../../${repoRelativePath}`

  if (repoRelativePath.startsWith('apps/'))
    return `../../../../${repoRelativePath}`

  return repoRelativePath
}

export function collectAlicizationCrossSurfaceProjectAwarenessEntrypointCandidateFiles(rootDir: string) {
  void rootDir

  if (cachedCrossSurfaceEntrypointCandidateFiles)
    return cachedCrossSurfaceEntrypointCandidateFiles

  const explicitGovernedFiles = new Set(
    resolveAlicizationCrossSurfaceDialogueEntryGovernedFiles(),
  )

  if (!cachedCrossSurfaceRepoRelativeCandidates) {
    cachedCrossSurfaceRepoRelativeCandidates = [
      ...collectRepoRelativePaths([
        '-l',
        'toAlicizationChatStartPreDialogueSendIdentity\\(',
        'packages/stage-ui/src/stores',
        '-g',
        '!**/*.test.ts',
      ]),
      ...collectRepoRelativePaths([
        '-l',
        'sanitizeAlicizationChatStartPayloadForTransport\\(',
        'apps',
        '-g',
        '!**/*.test.ts',
      ]),
      ...collectRepoRelativePaths([
        '-l',
        '\\.\\.\\.\\(context\\.preDialogueSendIdentity !== undefined',
        'packages/stage-ui/src/stores',
        '-g',
        '!**/*.test.ts',
      ]),
      ...collectRepoRelativePaths([
        '-l',
        '\\.ingest\\(|\\bingest\\(',
        'apps',
        'packages/stage-ui/src/stores',
        '-g',
        '!**/*.test.ts',
      ]),
      ...collectRepoRelativePaths([
        '-l',
        'bridge\\.streamChat\\(|bridge\\.chatStart\\(|bridgeStreamChat\\(|bridgeChatStart\\(',
        'packages',
        '-g',
        '!**/*.test.ts',
      ]),
      ...collectRepoRelativePaths([
        '-l',
        'dispatch(Web|Pocket|Desktop)(VoiceTurn\\(|PerformancePlaygroundChatTurn\\()',
        'apps',
        '-g',
        '!**/*.test.ts',
      ]),
      ...collectRepoRelativePaths([
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
      ]),
    ]
  }

  cachedCrossSurfaceEntrypointCandidateFiles = [
    ...new Set([
      ...[...explicitGovernedFiles],
      ...cachedCrossSurfaceRepoRelativeCandidates
        .map(relativePath => toCrossSurfaceCandidateRelativePath(relativePath, explicitGovernedFiles))
        .filter((relativePath): relativePath is string => Boolean(relativePath)),
    ]),
  ].sort()

  return cachedCrossSurfaceEntrypointCandidateFiles
}
