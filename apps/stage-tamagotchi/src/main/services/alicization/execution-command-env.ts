import { execFile } from 'node:child_process'
import { constants } from 'node:fs'
import { access, readdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { delimiter, join } from 'node:path'
import { env as processEnv, platform as processPlatform } from 'node:process'

type AccessImpl = (path: string, mode?: number) => Promise<void>
type ReaddirImpl = (path: string) => Promise<string[]>
type VersionImpl = (path: string) => Promise<string>

const executionBinaryVersionProbeTimeoutMs = 3_000

interface LocateAlicizationExecutionBinaryOptions {
  accessImpl?: AccessImpl
  readdirImpl?: ReaddirImpl
  homeDir?: string
  pathValue?: string
  explicitPath?: string
  platform?: NodeJS.Platform
  versionImpl?: VersionImpl
}

function unique(values: string[]) {
  return [...new Set(values)]
}

function normalizeEntries(values: string[]) {
  return values
    .map(value => value.trim())
    .filter(Boolean)
}

function removeParentCodexEnvironment(baseEnv: NodeJS.ProcessEnv) {
  return Object.fromEntries(
    Object.entries(baseEnv).filter(([key, value]) => (
      !key.startsWith('CODEX_')
      && key !== 'TEST'
      && !key.startsWith('VITEST')
      && (key !== 'NODE_ENV' || value !== 'test')
    )),
  ) as NodeJS.ProcessEnv
}

function buildKnownExecutionRootEntries(homeDir: string) {
  return normalizeEntries([
    join(homeDir, '.local', 'bin'),
    join(homeDir, '.bun', 'bin'),
    join(homeDir, 'bin'),
    '/Applications/Codex.app/Contents/Resources',
    '/Applications/ChatGPT.app/Contents/Resources',
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
      '/Applications/ChatGPT.app/Contents/Resources/codex',
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

function parseVersion(raw: string) {
  const match = raw.match(/(?:^|\s)v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\s|$)/u)
  if (!match)
    return null

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4]?.split('.') ?? [],
  }
}

function comparePrerelease(left: string[], right: string[]) {
  if (left.length === 0 && right.length === 0)
    return 0
  if (left.length === 0)
    return 1
  if (right.length === 0)
    return -1

  const length = Math.max(left.length, right.length)
  for (let index = 0; index < length; index++) {
    const leftPart = left[index]
    const rightPart = right[index]
    if (leftPart === undefined)
      return -1
    if (rightPart === undefined)
      return 1
    if (leftPart === rightPart)
      continue

    const leftNumeric = /^\d+$/u.test(leftPart)
    const rightNumeric = /^\d+$/u.test(rightPart)
    if (leftNumeric && rightNumeric)
      return Number(leftPart) - Number(rightPart)
    if (leftNumeric !== rightNumeric)
      return leftNumeric ? -1 : 1
    return leftPart.localeCompare(rightPart)
  }
  return 0
}

function compareVersions(left: ReturnType<typeof parseVersion>, right: ReturnType<typeof parseVersion>) {
  if (!left || !right)
    return 0
  return left.major - right.major
    || left.minor - right.minor
    || left.patch - right.patch
    || comparePrerelease(left.prerelease, right.prerelease)
}

function createVersionProbe(): VersionImpl {
  return async (path: string) => {
    const result = await new Promise<{ stdout: string, stderr: string }>((resolve, reject) => {
      execFile(path, ['--version'], {
        timeout: executionBinaryVersionProbeTimeoutMs,
        windowsHide: true,
      }, (error, stdout, stderr) => {
        if (error) {
          reject(error)
          return
        }
        resolve({ stdout, stderr })
      })
    })
    return `${result.stdout}\n${result.stderr}`.trim()
  }
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
): NodeJS.ProcessEnv & { PATH: string } {
  const mergedEnv = {
    ...removeParentCodexEnvironment(baseEnv),
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
  const explicitPath = typeof options.explicitPath === 'string'
    ? options.explicitPath.trim()
    : ''
  const candidates = unique([
    ...(explicitPath ? extensions.map(extension => explicitPath.endsWith(extension) ? explicitPath : `${explicitPath}${extension}`) : []),
    ...inheritedPathCandidates,
    ...versionManagerCandidates,
    ...buildKnownExecutionBinaryCandidates(normalizedBinary, homeDir),
    ...fallbackPathCandidates,
  ])

  const executableCandidates: string[] = []
  for (const candidate of candidates) {
    try {
      await accessImpl(candidate, constants.X_OK)
      executableCandidates.push(candidate)
    }
    catch {
      // no-op: keep scanning candidates until one is executable.
    }
  }

  if (executableCandidates.length === 0)
    return null

  if (normalizedBinary === 'codex' && !explicitPath) {
    const versionImpl = options.versionImpl ?? createVersionProbe()
    const versionedCandidates = (await Promise.all(executableCandidates.map(async (candidate, index) => {
      try {
        const version = parseVersion(await versionImpl(candidate))
        return version
          ? { candidate, index, version }
          : null
      }
      catch {
        return null
      }
    }))).filter((value): value is {
      candidate: string
      index: number
      version: NonNullable<ReturnType<typeof parseVersion>>
    } => value != null)

    if (versionedCandidates.length > 0) {
      versionedCandidates.sort((left, right) => (
        compareVersions(right.version, left.version)
        || left.index - right.index
      ))
      return versionedCandidates[0]?.candidate ?? executableCandidates[0]
    }
  }

  return executableCandidates[0]
}

export async function resolveAlicizationExecutionBinary(
  binary: string,
  options?: LocateAlicizationExecutionBinaryOptions,
) {
  return await locateAlicizationExecutionBinary(binary, options) ?? binary
}
