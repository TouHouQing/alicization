import { execFileSync } from 'node:child_process'

import { resolveAlicizationReturnSideProjectAwarenessAuditFiles } from './return-side-project-awareness-audit'

const returnSideProjectAwarenessRepoRoot = new URL('../../../../../../', import.meta.url)

let cachedReturnSideProjectAwarenessCandidateFiles: string[] | null = null

function collectRepoRelativePaths(args: string[]) {
  let output = ''
  try {
    output = execFileSync('rg', args, {
      cwd: returnSideProjectAwarenessRepoRoot,
      encoding: 'utf8',
    })
  }
  catch (error: any) {
    if (error?.status !== 1)
      throw error
  }

  return output
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
}

function toReturnSideProjectAwarenessCandidateRelativePath(repoRelativePath: string) {
  if (repoRelativePath === 'apps/stage-tamagotchi/src/renderer/App.vue')
    return '../../../renderer/App.vue'

  if (repoRelativePath === 'apps/stage-tamagotchi/src/renderer/alicization-chat-stream-bridge.ts')
    return '../../../renderer/alicization-chat-stream-bridge.ts'

  if (repoRelativePath.startsWith('packages/'))
    return `../../../../../../${repoRelativePath}`

  if (repoRelativePath.startsWith('apps/'))
    return `../../../../${repoRelativePath}`

  return repoRelativePath
}

export function collectAlicizationReturnSideProjectAwarenessCandidateFiles(rootDir: string) {
  void rootDir

  if (cachedReturnSideProjectAwarenessCandidateFiles)
    return cachedReturnSideProjectAwarenessCandidateFiles

  const broaderCandidateFiles = [
    ...collectRepoRelativePaths([
      '-l',
      'readConversationTurnProjectStateObservation\\(',
      'apps/stage-tamagotchi/src/renderer',
      'packages/stage-ui/src/stores',
      '-g',
      '!**/*.test.ts',
      '-g',
      '!**/*-audit.ts',
    ]),
    ...collectRepoRelativePaths([
      '-l',
      'normalizeStructuredPreDialogueClosurePayload\\(',
      'apps/stage-tamagotchi/src/renderer',
      '-g',
      '!**/*.test.ts',
      '-g',
      '!**/*-audit.ts',
    ]),
    ...collectRepoRelativePaths([
      '-l',
      'export function normalizeStructuredProjectStatePayload\\(|export function normalizeStructuredPreDialogueAwarenessPayload\\(|export function normalizeStructuredPreDialogueClosurePayload\\(',
      'packages/stage-ui/src/composables',
      '-g',
      '!**/*.test.ts',
      '-g',
      '!**/*-audit.ts',
    ]),
    ...collectRepoRelativePaths([
      '-l',
      'turnProjectState = normalizeStructuredProjectStatePayload\\(|turnPreDialogueAwareness = normalizeStructuredPreDialogueAwarenessPayload\\(',
      'packages/stage-ui/src/stores',
      '-g',
      '!**/*.test.ts',
      '-g',
      '!**/*-audit.ts',
    ]),
    ...collectRepoRelativePaths([
      '-l',
      'maybeBackfillRestoredPreDialogueAwareness\\(',
      'packages/stage-ui/src/stores',
      '-g',
      '!**/*.test.ts',
      '-g',
      '!**/*-audit.ts',
    ]),
    ...collectRepoRelativePaths([
      '-l',
      'Promise\\.resolve\\(bridge\\.getLatestProjectStateObservation\\(\\)\\)|projectStateObservationToContinuitySnapshot\\(nextProjectStateObservation\\)',
      'packages/stage-ui/src/stores',
      '-g',
      '!**/*.test.ts',
      '-g',
      '!**/*-audit.ts',
    ]),
  ]

  cachedReturnSideProjectAwarenessCandidateFiles = [
    ...new Set([
      ...resolveAlicizationReturnSideProjectAwarenessAuditFiles(),
      ...broaderCandidateFiles.map(toReturnSideProjectAwarenessCandidateRelativePath),
    ]),
  ].sort()

  return cachedReturnSideProjectAwarenessCandidateFiles
}
