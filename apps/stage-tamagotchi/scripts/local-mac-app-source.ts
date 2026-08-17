import { existsSync } from 'node:fs'
import { stat as statFile } from 'node:fs/promises'
import { join } from 'node:path'

export interface LocalMacAppCandidate {
  path: string
  modifiedAt: number
}

interface FileStatLike {
  mtimeMs: number
}

interface BuiltAppFreshnessInput {
  appPath: string
  mainBundlePath: string
  stat?: (path: string) => Promise<FileStatLike>
}

export function isOptionalSecurityAuthorizationError(error: unknown) {
  if (!(error instanceof Error))
    return false

  return /security:/i.test(error.message)
    && /User canceled the operation|Unable to obtain authorization|interaction is not allowed|authorization denied/i.test(error.message)
}

function appPayloadPath(appPath: string) {
  return join(appPath, 'Contents', 'Resources', 'app.asar')
}

export function selectLatestBuiltApp(candidates: LocalMacAppCandidate[]) {
  return candidates
    .slice()
    .sort((left, right) =>
      right.modifiedAt - left.modifiedAt
      || left.path.localeCompare(right.path),
    )[0]
    ?.path
}

export async function assertBuiltAppIsFresh(input: BuiltAppFreshnessInput) {
  const stat = input.stat ?? statFile
  const packagedPayloadPath = existsSync(appPayloadPath(input.appPath))
    ? appPayloadPath(input.appPath)
    : input.appPath
  const [appStat, mainBundleStat] = await Promise.all([
    stat(packagedPayloadPath),
    stat(input.mainBundlePath),
  ])

  if (appStat.mtimeMs < mainBundleStat.mtimeMs) {
    throw new Error([
      'The built macOS app is older than the current main build.',
      `App payload: ${packagedPayloadPath} (${new Date(appStat.mtimeMs).toISOString()})`,
      `Main build: ${input.mainBundlePath} (${new Date(mainBundleStat.mtimeMs).toISOString()})`,
      'Run pnpm -F @proj-alicization/stage-tamagotchi build:unpack before installing.',
    ].join('\n'))
  }
}

export async function readLocalMacAppCandidate(appPath: string): Promise<LocalMacAppCandidate> {
  const payloadPath = appPayloadPath(appPath)
  const metadataPath = existsSync(payloadPath) ? payloadPath : appPath
  const metadata = await statFile(metadataPath)

  return {
    path: appPath,
    modifiedAt: metadata.mtimeMs,
  }
}
