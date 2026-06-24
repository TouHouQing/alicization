import { randomUUID } from 'node:crypto'
import { mkdir, open as openFile, rename, unlink, writeFile } from 'node:fs/promises'
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
  platform?: NodeJS.Platform
  appendAuditLog?: (input: AlicizationAtomicWriteAuditInput) => Promise<void> | void
  randomId?: () => string
  processId?: number
  now?: () => number
  sleep?: (ms: number) => Promise<void>
  renameRetryDelaysMs?: readonly number[]
  fsyncPath?: (path: string) => Promise<void>
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
  sleep: NonNullable<AlicizationAtomicWriteOptions['sleep']>
  retryDelaysMs: readonly number[]
}) {
  if (input.platform !== 'win32') {
    try {
      await rename(input.tempPath, input.targetPath)
    }
    catch (error: any) {
      if (error?.code !== 'ENOENT')
        throw error
      await mkdir(dirname(input.targetPath), { recursive: true })
      await rename(input.tempPath, input.targetPath)
    }
    return
  }

  let lastError: unknown
  for (const delayMs of input.retryDelaysMs) {
    try {
      await rename(input.tempPath, input.targetPath)
      return
    }
    catch (error: any) {
      if (!['EPERM', 'EBUSY', 'EACCES'].includes(error?.code))
        throw error

      lastError = error
      await input.appendAuditLog({
        level: 'notice',
        category: input.category,
        action: 'rename-retry',
        message: 'Retrying atomic rename because target file is locked on win32.',
        payload: {
          code: error?.code,
          delayMs,
        },
      })
      await input.sleep(delayMs)
    }
  }

  const error = new Error('Alicization atomic rename failed after retries on win32.')
  ;(error as Error & { code?: string, cause?: unknown }).code = 'ALICIZATION_ATOMIC_RENAME_FAILED'
  ;(error as Error & { code?: string, cause?: unknown }).cause = lastError
  throw error
}

export async function writeAlicizationAtomicContent(options: AlicizationAtomicWriteOptions) {
  const platform = options.platform ?? processPlatform
  const appendAuditLog = options.appendAuditLog ?? (async () => {})
  const sleep = options.sleep ?? (async ms => await new Promise<void>(resolve => setTimeout(resolve, ms)))
  const retryDelaysMs = options.renameRetryDelaysMs ?? [5, 10, 20, 40, 80]
  const syncPath = options.fsyncPath ?? fsyncPath
  const randomId = options.randomId ?? randomUUID
  const processId = options.processId ?? pid
  const now = options.now ?? Date.now
  const directoryFsyncPath = options.directoryFsyncPath ?? dirname(options.path)
  const tempPath = `${options.path}.${processId}.${now()}.${randomId()}.tmp`

  await mkdir(dirname(options.path), { recursive: true })
  try {
    await writeFile(tempPath, options.content, 'utf-8')
    try {
      await syncPath(tempPath)
    }
    catch (error) {
      if (!isUnsupportedFsyncError(error))
        throw error
      await appendAuditLog({
        level: 'notice',
        category: options.category,
        action: 'file-fsync-degraded',
        message: 'File fsync is not supported for this atomic write target; continuing after write succeeded.',
        payload: {
          code: (error as { code?: unknown })?.code,
          platform,
        },
      })
    }

    await renameWithRetry({
      tempPath,
      targetPath: options.path,
      category: options.category,
      platform,
      appendAuditLog,
      sleep,
      retryDelaysMs,
    })

    try {
      await syncPath(directoryFsyncPath)
    }
    catch (error) {
      if (!isUnsupportedFsyncError(error))
        throw error
      await appendAuditLog({
        level: 'notice',
        category: options.category,
        action: 'directory-fsync-degraded',
        message: 'Directory fsync is not supported for this atomic write target.',
        payload: {
          code: (error as { code?: unknown })?.code,
          platform,
        },
      })
    }
  }
  catch (error) {
    await unlink(tempPath).catch(() => {})
    throw error
  }

  await unlink(tempPath).catch(() => {})
}
