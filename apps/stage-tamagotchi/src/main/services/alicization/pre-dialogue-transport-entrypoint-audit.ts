import { spawnSync } from 'node:child_process'

const preDialogueTransportRepoRoot = new URL('../../../../../../', import.meta.url)

let cachedPreDialogueIdentityConstructionFiles: string[] | null = null
let cachedPreDialogueTransportSanitizationFiles: string[] | null = null
let cachedPreDialogueBridgeForwardingFiles: string[] | null = null
let cachedPreDialogueTransportGovernedFiles: string[] | null = null

function toPreDialogueTransportAuditRelativePath(repoRelativePath: string) {
  if (repoRelativePath.startsWith('packages/stage-ui/src/stores/'))
    return `../../../../../../${repoRelativePath}`

  if (repoRelativePath.startsWith('packages/'))
    return `../../../../../../${repoRelativePath}`

  if (repoRelativePath.startsWith('apps/stage-tamagotchi/src/'))
    return `../../../${repoRelativePath.slice('apps/stage-tamagotchi/src/'.length)}`

  return repoRelativePath
}

function collectRepoRelativePaths(args: string[]) {
  const result = spawnSync('rg', args, {
    cwd: preDialogueTransportRepoRoot,
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
}

export function collectAlicizationPreDialogueIdentityConstructionFiles() {
  if (cachedPreDialogueIdentityConstructionFiles)
    return cachedPreDialogueIdentityConstructionFiles

  cachedPreDialogueIdentityConstructionFiles = collectRepoRelativePaths([
    '-l',
    'toAlicizationChatStartPreDialogueSendIdentity\\(',
    'packages',
    '-g',
    '!**/*.test.ts',
  ])
    .map(toPreDialogueTransportAuditRelativePath)
    .sort()

  return cachedPreDialogueIdentityConstructionFiles
}

export function collectAlicizationPreDialogueTransportSanitizationFiles() {
  if (cachedPreDialogueTransportSanitizationFiles)
    return cachedPreDialogueTransportSanitizationFiles

  cachedPreDialogueTransportSanitizationFiles = collectRepoRelativePaths([
    '-l',
    'sanitizeAlicizationChatStartPayloadForTransport\\(\\{',
    'apps',
    '-g',
    '!**/*.test.ts',
  ])
    .map(toPreDialogueTransportAuditRelativePath)
    .sort()

  return cachedPreDialogueTransportSanitizationFiles
}

export function collectAlicizationPreDialogueBridgeForwardingFiles() {
  if (cachedPreDialogueBridgeForwardingFiles)
    return cachedPreDialogueBridgeForwardingFiles

  cachedPreDialogueBridgeForwardingFiles = collectRepoRelativePaths([
    '-l',
    '\\.\\.\\.\\(context\\.preDialogueSendIdentity !== undefined',
    'packages',
    '-g',
    '!**/*.test.ts',
  ])
    .map(toPreDialogueTransportAuditRelativePath)
    .sort()

  return cachedPreDialogueBridgeForwardingFiles
}

export function collectAlicizationPreDialogueTransportGovernedFiles() {
  if (cachedPreDialogueTransportGovernedFiles)
    return cachedPreDialogueTransportGovernedFiles

  cachedPreDialogueTransportGovernedFiles = [
    ...new Set([
      ...collectAlicizationPreDialogueIdentityConstructionFiles(),
      ...collectAlicizationPreDialogueTransportSanitizationFiles(),
      ...collectAlicizationPreDialogueBridgeForwardingFiles(),
    ]),
  ].sort()

  return cachedPreDialogueTransportGovernedFiles
}
