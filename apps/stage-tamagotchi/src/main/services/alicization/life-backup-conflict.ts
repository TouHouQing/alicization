const changedDuringSnapshot = Symbol('life-backup-snapshot-conflict')

export function createLifeBackupSnapshotConflict() {
  return new Error('Life state changed during backup; retry when the current interaction settles', { cause: changedDuringSnapshot })
}

export function isLifeBackupSnapshotConflict(error: unknown) {
  return error instanceof Error && error.cause === changedDuringSnapshot
}
