import { randomUUID } from 'node:crypto'
import { chmod, mkdir, open as openFile, rename, stat, unlink } from 'node:fs/promises'
import { dirname } from 'node:path'
import { pid, platform as processPlatform } from 'node:process'

export interface AlicizationAtomicWriteAuditInput {
  level: 'notice' | 'warning'
  category: string
  action: string
  message: string
  payload?: Record<string, unknown>
}

export interface AlicizationAtomicWriteOptions {
  category: string
  content: string
  path: string
  directoryFsyncPath?: string
  directoryMode?: number
  fileMode?: number
  platform?: NodeJS.Platform
  appendAuditLog?: (input: AlicizationAtomicWriteAuditInput) => Promise<void> | void
  randomId?: () => string
  processId?: number
  now?: () => number
  sleep?: (ms: number) => Promise<void>
  renameRetryDelaysMs?: readonly number[]
  fsyncPath?: (path: string) => Promise<void>
  renamePath?: (source: string, destination: string) => Promise<void>
  runStep?: <T>(stage: string, task: () => Promise<T>) => Promise<T>
}

export interface AlicizationAtomicRenameOptions {
  category: string
  sourcePath: string
  targetPath: string
  platform?: NodeJS.Platform
  appendAuditLog?: AlicizationAtomicWriteOptions['appendAuditLog']
  renamePath?: AlicizationAtomicWriteOptions['renamePath']
  renameRetryDelaysMs?: AlicizationAtomicWriteOptions['renameRetryDelaysMs']
  runStep?: AlicizationAtomicWriteOptions['runStep']
  sleep?: AlicizationAtomicWriteOptions['sleep']
}

function isUnsupportedFsyncError(error: unknown) {
  const code = (error as { code?: unknown } | null)?.code
  return code === 'EPERM' || code === 'EBADF' || code === 'EINVAL' || code === 'ENOTSUP'
}

async function fsyncPath(path: string) {
  const handle = await openFile(path, 'r')
  try {
    await handle.sync()
  }
  finally {
    await handle.close()
  }
}

async function renameWithRetry(input: {
  tempPath: string
  targetPath: string
  category: string
  platform: NodeJS.Platform
  appendAuditLog: NonNullable<AlicizationAtomicWriteOptions['appendAuditLog']>
  renamePath: NonNullable<AlicizationAtomicWriteOptions['renamePath']>
  runStep: NonNullable<AlicizationAtomicWriteOptions['runStep']>
  sleep: NonNullable<AlicizationAtomicWriteOptions['sleep']>
  retryDelaysMs: readonly number[]
}) {
  if (input.platform !== 'win32') {
    try {
      await input.runStep('atomic rename', async () =>
        await input.renamePath(input.tempPath, input.targetPath))
    }
    catch (error: any) {
      if (error?.code !== 'ENOENT')
        throw error
      await input.runStep('atomic rename parent recreation', async () =>
        await mkdir(dirname(input.targetPath), { recursive: true }))
      await input.runStep('atomic rename retry', async () =>
        await input.renamePath(input.tempPath, input.targetPath))
    }
    return
  }

  let lastError: unknown
  for (const delayMs of input.retryDelaysMs) {
    try {
      await input.runStep('win32 atomic rename', async () =>
        await input.renamePath(input.tempPath, input.targetPath))
      return
    }
    catch (error: any) {
      if (!['EPERM', 'EBUSY', 'EACCES'].includes(error?.code))
        throw error

      lastError = error
      await input.runStep('win32 atomic rename retry audit', async () =>
        await input.appendAuditLog({
          level: 'notice',
          category: input.category,
          action: 'rename-retry',
          message: 'Retrying atomic rename because target file is locked on win32.',
          payload: {
            code: error?.code,
            delayMs,
          },
        }))
      await input.runStep('win32 atomic rename retry delay', async () =>
        await input.sleep(delayMs))
    }
  }

  const error = new Error('Alicization atomic rename failed after retries on win32.')
  ;(error as Error & { code?: string, cause?: unknown }).code = 'ALICIZATION_ATOMIC_RENAME_FAILED'
  ;(error as Error & { code?: string, cause?: unknown }).cause = lastError
  throw error
}

export async function renameAlicizationAtomicPath(options: AlicizationAtomicRenameOptions) {
  await renameWithRetry({
    tempPath: options.sourcePath,
    targetPath: options.targetPath,
    category: options.category,
    platform: options.platform ?? processPlatform,
    appendAuditLog: options.appendAuditLog ?? (async () => {}),
    renamePath: options.renamePath ?? rename,
    runStep: options.runStep ?? (async <T>(_stage: string, task: () => Promise<T>) =>
      await task()),
    sleep: options.sleep ?? (async ms =>
      await new Promise<void>(resolve => setTimeout(resolve, ms))),
    retryDelaysMs: options.renameRetryDelaysMs ?? [5, 10, 20, 40, 80],
  })
}

async function verifyMode(path: string, expectedMode: number) {
  const actualMode = (await stat(path)).mode & 0o777
  if (actualMode !== expectedMode) {
    throw new Error(
      `Alicization atomic write permissions mismatch for ${path}: expected ${expectedMode.toString(8)}, received ${actualMode.toString(8)}`,
    )
  }
}

export async function writeAlicizationAtomicContent(options: AlicizationAtomicWriteOptions) {
  const platform = options.platform ?? processPlatform
  const posix = platform !== 'win32'
  const appendAuditLog = options.appendAuditLog ?? (async () => {})
  const sleep = options.sleep ?? (async ms => await new Promise<void>(resolve => setTimeout(resolve, ms)))
  const retryDelaysMs = options.renameRetryDelaysMs ?? [5, 10, 20, 40, 80]
  const syncPath = options.fsyncPath ?? fsyncPath
  const renamePath = options.renamePath ?? rename
  const runStep = options.runStep ?? (async <T>(_stage: string, task: () => Promise<T>) =>
    await task())
  const randomId = options.randomId ?? randomUUID
  const processId = options.processId ?? pid
  const now = options.now ?? Date.now
  const directoryFsyncPath = options.directoryFsyncPath ?? dirname(options.path)
  const tempPath = `${options.path}.${processId}.${now()}.${randomId()}.tmp`
  let handle: Awaited<ReturnType<typeof openFile>> | null = null

  await runStep('atomic write directory creation', async () =>
    await mkdir(dirname(options.path), {
      recursive: true,
      mode: posix ? options.directoryMode : undefined,
    }))
  if (posix && options.directoryMode !== undefined) {
    await runStep('atomic write directory permission tightening', async () =>
      await chmod(dirname(options.path), options.directoryMode!))
    await runStep('atomic write directory permission verification', async () =>
      await verifyMode(dirname(options.path), options.directoryMode!))
  }
  try {
    handle = await runStep('atomic temporary file creation', async () =>
      await openFile(
        tempPath,
        'wx',
        posix ? options.fileMode : undefined,
      ))
    await runStep('atomic temporary file write', async () =>
      await handle!.writeFile(options.content, 'utf8'))
    if (posix && options.fileMode !== undefined) {
      await runStep('atomic temporary file permission tightening', async () =>
        await chmod(tempPath, options.fileMode!))
      await runStep('atomic temporary file permission verification', async () =>
        await verifyMode(tempPath, options.fileMode!))
    }
    try {
      await runStep('atomic temporary file sync', async () => {
        if (options.fsyncPath)
          await syncPath(tempPath)
        else
          await handle!.sync()
      })
    }
    catch (error) {
      if (platform !== 'win32' || !isUnsupportedFsyncError(error))
        throw error
      await runStep('atomic file fsync degradation audit', async () =>
        await appendAuditLog({
          level: 'notice',
          category: options.category,
          action: 'file-fsync-degraded',
          message: 'File fsync is not supported for this atomic write target; continuing after write succeeded.',
          payload: {
            code: (error as { code?: unknown })?.code,
            platform,
          },
        }))
    }
    await runStep('atomic temporary file close', async () =>
      await handle!.close())
    handle = null

    await renameAlicizationAtomicPath({
      sourcePath: tempPath,
      targetPath: options.path,
      category: options.category,
      platform,
      appendAuditLog,
      renamePath,
      runStep,
      sleep,
      renameRetryDelaysMs: retryDelaysMs,
    })

    try {
      await runStep('atomic parent directory sync', async () =>
        await syncPath(directoryFsyncPath))
    }
    catch (error) {
      if (platform !== 'win32' || !isUnsupportedFsyncError(error))
        throw error
      await runStep('atomic directory fsync degradation audit', async () =>
        await appendAuditLog({
          level: 'notice',
          category: options.category,
          action: 'directory-fsync-degraded',
          message: 'Directory fsync is not supported for this atomic write target.',
          payload: {
            code: (error as { code?: unknown })?.code,
            platform,
          },
        }))
    }
  }
  catch (error) {
    await runStep('atomic temporary file close after failure', async () =>
      await handle?.close()).catch(() => {})
    handle = null
    await runStep('atomic temporary file cleanup after failure', async () =>
      await unlink(tempPath)).catch(() => {})
    throw error
  }

  await runStep('atomic temporary file cleanup', async () =>
    await unlink(tempPath)).catch(() => {})
}
