import { statfs } from 'node:fs/promises'
import { dirname, isAbsolute } from 'node:path'

const reserveBytes = 256n * 1024n * 1024n

export class ExecutionStorageBudgetError extends Error {
  readonly code = 'EXECUTION_DISK_BUDGET_EXCEEDED'
  readonly effectMayHaveOccurred = false
  readonly availableBytes: string
  readonly requiredBytes: string
  constructor(availableBytes: bigint, requiredBytes: bigint) {
    super('Not enough free disk space to safely write this result. Free disk space before continuing this work.')
    this.availableBytes = String(availableBytes)
    this.requiredBytes = String(requiredBytes)
  }
}

/** An early refusal, not a disk reservation: actual I/O must still handle ENOSPC. */
export async function assertExecutionStorageCapacity(target: string, estimatedBytes: number) {
  if (!isAbsolute(target) || !Number.isSafeInteger(estimatedBytes) || estimatedBytes < 0 || estimatedBytes > 64 * 1024 * 1024)
    throw new TypeError('Storage admission requires an absolute target and a bounded byte estimate')
  let existing = target
  while (true) {
    try {
      const info = await statfs(existing, { bigint: true })
      const available = info.bavail * info.bsize
      const required = reserveBytes + BigInt(estimatedBytes)
      if (available < required)
        throw new ExecutionStorageBudgetError(available, required)
      return { availableBytes: available, requiredBytes: required }
    }
    catch (error) {
      if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'ENOENT')
        throw error
      const parent = dirname(existing)
      if (parent === existing)
        throw error
      existing = parent
    }
  }
}
