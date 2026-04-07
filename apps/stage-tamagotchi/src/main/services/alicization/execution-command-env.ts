import { constants } from 'node:fs'
import { access } from 'node:fs/promises'
import { homedir } from 'node:os'
import { delimiter, join } from 'node:path'
import { env as processEnv, platform as processPlatform } from 'node:process'

type AccessImpl = (path: string, mode?: number) => Promise<void>

interface LocateAlicizationExecutionBinaryOptions {
  accessImpl?: AccessImpl
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
  const pathEntries = normalizeEntries(
    buildAlicizationExecutionPath(options.pathValue, homeDir).split(delimiter),
  )
  const extensions = buildPathExtensions(platform)
  const candidates = unique([
    ...buildKnownExecutionBinaryCandidates(normalizedBinary, homeDir),
    ...pathEntries.flatMap(root => extensions.map(extension => join(root, `${normalizedBinary}${extension}`))),
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
