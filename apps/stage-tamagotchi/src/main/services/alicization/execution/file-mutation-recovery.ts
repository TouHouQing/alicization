export interface FileMutationSnapshot {
  path: string
  existed: boolean
  device: string | null
  inode: string | null
  bytes: Uint8Array
}

export interface FileMutationRecovery {
  /** Persist the original bytes before an owned handle changes them. */
  begin: (before: FileMutationSnapshot) => Promise<{
    complete: (after: FileMutationSnapshot) => Promise<void>
  }>
}
