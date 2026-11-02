// Exact-copy contracts bind a future read receipt. Older runtimes must not
// execute a stored plan whose completion predicate they cannot interpret.
export const lifeSchemaVersion = 7

export function readSupportedLifeSchemaVersion(raw: string | undefined) {
  if (raw === undefined)
    return 0
  const version = Number(raw)
  if (!/^\d+$/u.test(raw) || !Number.isSafeInteger(version) || version > lifeSchemaVersion)
    throw new Error('Unsupported life schema version; preserve the database for recovery')
  return version
}
