import { constants } from 'node:fs'
import { access, readdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { delimiter, join } from 'node:path'
import { env as processEnv, platform as processPlatform } from 'node:process'

type AccessImpl = (path: string, mode?: number) => Promise<void>
type ReaddirImpl = (path: string) => Promise<string[]>

interface LocateAlicizationExecutionBinaryOptions {
  accessImpl?: AccessImpl
  readdirImpl?: ReaddirImpl
  homeDir?: string
  pathValue?: string
  platform?: NodeJS.Platform
}

function unique(values: string[]) {
  return [...new Set(values)]
}

function normalizeEntries(values: string[]) {
  return values
    .map(value => value.trim())
    .filter(Boolean)
}

function buildKnownExecutionRootEntries(homeDir: string) {
  return normalizeEntries([
    join(homeDir, '.local', 'bin'),
    join(homeDir, '.bun', 'bin'),
    join(homeDir, 'bin'),
    '/Applications/Codex.app/Contents/Resources',
    '/opt/homebrew/bin',
    '/opt/homebrew/sbin',
    '/usr/local/bin',
    '/usr/local/sbin',
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin',
  ])
}

function buildKnownExecutionBinaryCandidates(binary: string, homeDir: string) {
  if (binary === 'codex') {
    return normalizeEntries([
      '/Applications/Codex.app/Contents/Resources/codex',
      join(homeDir, '.local', 'bin', 'codex'),
      join(homeDir, 'bin', 'codex'),
      join(homeDir, '.nvm', 'current', 'bin', 'codex'),
      join(homeDir, '.volta', 'bin', 'codex'),
    ])
  }

  if (binary === 'claude') {
    return normalizeEntries([
      join(homeDir, '.local', 'bin', 'claude'),
      '/opt/homebrew/bin/claude',
      '/usr/local/bin/claude',
    ])
  }

  return []
}

async function buildVersionManagerBinaryCandidates(binary: string, homeDir: string, readdirImpl: ReaddirImpl) {
  const roots = [
    join(homeDir, '.nvm', 'versions', 'node'),
    join(homeDir, '.fnm', 'node-versions'),
  ]
  const candidates: string[] = []
  for (const root of roots) {
    const entries = (await readdirImpl(root).catch(() => []))
      .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }))
    for (const entry of entries) {
      if (root.endsWith(join('.fnm', 'node-versions')))
        candidates.push(join(root, entry, 'installation', 'bin', binary))
      else
        candidates.push(join(root, entry, 'bin', binary))
    }
  }
  return candidates
}

function buildPathExtensions(platform: NodeJS.Platform) {
  return platform === 'win32'
    ? ['', '.exe', '.cmd', '.bat']
    : ['']
}

export function buildAlicizationExecutionPath(pathValue = processEnv.PATH, homeDir = homedir()) {
  const baseEntries = typeof pathValue === 'string'
    ? normalizeEntries(pathValue.split(delimiter))
    : []

  return unique([
    ...baseEntries,
    ...buildKnownExecutionRootEntries(homeDir),
  ]).join(delimiter)
}

export function buildAlicizationExecutionEnv(
  baseEnv: NodeJS.ProcessEnv = processEnv,
  extraEnv?: NodeJS.ProcessEnv,
  homeDir = homedir(),
) {
  const mergedEnv = {
    ...baseEnv,
    ...extraEnv,
  }

  return {
    ...mergedEnv,
    PATH: buildAlicizationExecutionPath(mergedEnv.PATH, homeDir),
  }
}

export async function locateAlicizationExecutionBinary(
  binary: string,
  options: LocateAlicizationExecutionBinaryOptions = {},
) {
  const normalizedBinary = binary.trim()
  if (!normalizedBinary)
    return null

  const homeDir = options.homeDir ?? homedir()
  const platform = options.platform ?? processPlatform
  const accessImpl = options.accessImpl ?? access
  const readdirImpl = options.readdirImpl ?? (async (path: string) => await readdir(path, { withFileTypes: false }))
  const inheritedPathValue = options.pathValue ?? processEnv.PATH
  const inheritedPathEntries = typeof inheritedPathValue === 'string'
    ? normalizeEntries(inheritedPathValue.split(delimiter))
    : []
  const extensions = buildPathExtensions(platform)
  const inheritedPathCandidates = inheritedPathEntries.flatMap(root => extensions.map(extension => join(root, `${normalizedBinary}${extension}`)))
  const versionManagerCandidates = platform === 'darwin' || platform === 'linux'
    ? await buildVersionManagerBinaryCandidates(normalizedBinary, homeDir, readdirImpl)
    : []
  const fallbackPathEntries = buildKnownExecutionRootEntries(homeDir)
  const fallbackPathCandidates = fallbackPathEntries.flatMap(root => extensions.map(extension => join(root, `${normalizedBinary}${extension}`)))
  const candidates = unique([
    ...inheritedPathCandidates,
    ...versionManagerCandidates,
    ...buildKnownExecutionBinaryCandidates(normalizedBinary, homeDir),
    ...fallbackPathCandidates,
  ])

  for (const candidate of candidates) {
    try {
      await accessImpl(candidate, constants.X_OK)
      return candidate
    }
    catch {
      // no-op: keep scanning candidates until one is executable.
    }
  }

  return null
}

export async function resolveAlicizationExecutionBinary(
  binary: string,
  options?: LocateAlicizationExecutionBinaryOptions,
) {
  return await locateAlicizationExecutionBinary(binary, options) ?? binary
}
