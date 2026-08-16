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
  openPath?: (
    path: string,
    flags: string,
    mode?: number,
  ) => Promise<AlicizationAtomicFileHandle>
  renamePath?: (source: string, destination: string) => Promise<void>
  unlinkPath?: (path: string) => Promise<void>
  runStep?: <T>(stage: string, task: () => Promise<T>) => Promise<T>
}

export interface AlicizationAtomicFileHandle {
  writeFile: (content: string, encoding: BufferEncoding) => Promise<void>
  sync: () => Promise<void>
  close: () => Promise<void>
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
  const openPath = options.openPath ?? (async (
    path: string,
    flags: string,
    mode?: number,
  ) => await openFile(path, flags, mode))
  const renamePath = options.renamePath ?? rename
  const unlinkPath = options.unlinkPath ?? unlink
  const runStep = options.runStep ?? (async <T>(_stage: string, task: () => Promise<T>) =>
    await task())
  const randomId = options.randomId ?? randomUUID
  const processId = options.processId ?? pid
  const now = options.now ?? Date.now
  const directoryFsyncPath = options.directoryFsyncPath ?? dirname(options.path)
  const tempPath = `${options.path}.${processId}.${now()}.${randomId()}.tmp`
  let handle: AlicizationAtomicFileHandle | null = null
  let activeStep: Promise<unknown> | null = null
  let cleanupPromise: Promise<void> | null = null

  const runTrackedStep = async <T>(stage: string, task: () => Promise<T>) => {
    const operation = Promise.resolve().then(task)
    activeStep = operation
    void operation.then(
      () => {
        if (activeStep === operation)
          activeStep = null
      },
      () => {
        if (activeStep === operation)
          activeStep = null
      },
    )
    return await runStep(stage, () => operation)
  }

  const scheduleCleanup = () => {
    if (cleanupPromise)
      return cleanupPromise
    const pendingStep = activeStep
    cleanupPromise = (async () => {
      await pendingStep?.catch(() => {})
      const currentHandle = handle
      handle = null
      await currentHandle?.close().catch(() => {})
      await unlinkPath(tempPath).catch(() => {})
    })()
    return cleanupPromise
  }
  const requireHandle = () => {
    const currentHandle = handle as AlicizationAtomicFileHandle | null
    if (!currentHandle)
      throw new Error('Alicization atomic temporary file handle is unavailable.')
    return currentHandle
  }

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
    await runTrackedStep('atomic temporary file creation', async () => {
      handle = await openPath(
        tempPath,
        'wx',
        posix ? options.fileMode : undefined,
      )
    })
    await runTrackedStep('atomic temporary file write', async () =>
      await requireHandle().writeFile(options.content, 'utf8'))
    if (posix && options.fileMode !== undefined) {
      await runTrackedStep('atomic temporary file permission tightening', async () =>
        await chmod(tempPath, options.fileMode!))
      await runTrackedStep('atomic temporary file permission verification', async () =>
        await verifyMode(tempPath, options.fileMode!))
    }
    try {
      await runTrackedStep('atomic temporary file sync', async () => {
        if (options.fsyncPath)
          await syncPath(tempPath)
        else
          await requireHandle().sync()
      })
    }
    catch (error) {
      if (platform !== 'win32' || !isUnsupportedFsyncError(error))
        throw error
      await runTrackedStep('atomic file fsync degradation audit', async () =>
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
    const closingHandle = requireHandle()
    await runTrackedStep('atomic temporary file close', async () => {
      await closingHandle.close()
      if (handle === closingHandle)
        handle = null
    })

    await renameAlicizationAtomicPath({
      sourcePath: tempPath,
      targetPath: options.path,
      category: options.category,
      platform,
      appendAuditLog,
      renamePath,
      runStep: runTrackedStep,
      sleep,
      renameRetryDelaysMs: retryDelaysMs,
    })

    try {
      await runTrackedStep('atomic parent directory sync', async () =>
        await syncPath(directoryFsyncPath))
    }
    catch (error) {
      if (platform !== 'win32' || !isUnsupportedFsyncError(error))
        throw error
      await runTrackedStep('atomic directory fsync degradation audit', async () =>
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
    const cleanup = scheduleCleanup()
    void cleanup.catch(() => {})
    throw error
  }
}
