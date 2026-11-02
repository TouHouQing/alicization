type Operation = 'validation' | 'models' | 'instance'

// Persisted provider credentials are JSON data. Each request receives its own
// snapshot; a synchronous credential watcher revokes even A -> B -> A changes.
export function createProviderRequestOwnership(readConfig: (id: string) => Record<string, unknown> | undefined) {
  const owners = new Map<string, Map<Operation, object>>()
  let closed = false

  function invalidate(id: string, operation?: Operation) {
    if (operation)
      owners.get(id)?.delete(operation)
    else
      owners.delete(id)
  }

  function start(id: string, operation: Operation) {
    if (closed)
      throw new Error('Provider store scope is closed')
    const owner = owners.get(id) ?? new Map<Operation, object>()
    owners.set(id, owner)
    const token = {}
    const hash = JSON.stringify(readConfig(id) ?? {})
    const config: Record<string, unknown> = JSON.parse(hash)
    owner.set(operation, token)
    return {
      config,
      hash,
      isCurrent: () => !closed && owners.get(id) === owner && owner.get(operation) === token && JSON.stringify(readConfig(id) ?? {}) === hash,
    }
  }

  return {
    start,
    invalidate,
    close: () => {
      closed = true
      owners.clear()
    },
  }
}
