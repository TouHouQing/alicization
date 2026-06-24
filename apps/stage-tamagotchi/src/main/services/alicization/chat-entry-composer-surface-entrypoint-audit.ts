import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const composerSurfaceRepoRoot = new URL('../../../../../../', import.meta.url)

let cachedChatEntryComposerSurfaceGovernedFiles: string[] | null = null

function toComposerSurfaceAuditRelativePath(repoRelativePath: string) {
  if (repoRelativePath.startsWith('packages/'))
    return `../../../../../../${repoRelativePath}`

  if (repoRelativePath.startsWith('apps/'))
    return `../../../../${repoRelativePath}`

  return repoRelativePath
}

function collectRepoRelativePaths(args: string[]) {
  const output = execFileSync('rg', args, {
    cwd: composerSurfaceRepoRoot,
    encoding: 'utf8',
  })

  return output
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
}

export function collectAlicizationChatEntryComposerSurfaceGovernedFiles() {
  if (cachedChatEntryComposerSurfaceGovernedFiles)
    return cachedChatEntryComposerSurfaceGovernedFiles

  cachedChatEntryComposerSurfaceGovernedFiles = collectRepoRelativePaths([
    '-l',
    'useChatTextComposerStore\\(',
    'apps',
    'packages',
    '-g',
    '**/*.vue',
    '-g',
    '**/*.ts',
    '-g',
    '!**/*.test.ts',
  ])
    .filter((repoRelativePath) => {
      const source = readFileSync(new URL(repoRelativePath, composerSurfaceRepoRoot), 'utf8')
      return source.includes('sendCurrentMessage(')
    })
    .map(toComposerSurfaceAuditRelativePath)
    .sort()

  return cachedChatEntryComposerSurfaceGovernedFiles
}

export function resolveAlicizationChatEntryComposerSurfaceAuditFiles() {
  return collectAlicizationChatEntryComposerSurfaceGovernedFiles()
}
