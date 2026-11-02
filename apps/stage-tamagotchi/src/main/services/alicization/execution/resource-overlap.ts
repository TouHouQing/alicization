import { isAbsolute, relative } from 'node:path'

import { isWorkAdmissionResources } from './work-admission-resource'

function filesystemScope(key: string) {
  const kind = key.startsWith('file-tree:') ? 'tree' : key.startsWith('file-path:') ? 'file' : null
  if (!kind)
    return null
  const path = key.slice('file-tree:'.length)
  if (!isAbsolute(path))
    throw new Error('Filesystem resource scope must be an absolute canonical path')
  return { kind, path }
}

export function assertResourceOnlyFilesystemScopes(keys: readonly string[]) {
  if (!keys.some(key => key.startsWith('file-tree:')) || keys.some(key => !/^(?:file-tree:|file-path:|file-inode:)/u.test(key)))
    throw new Error('Resource-only leases require a bounded filesystem subtree')
  for (const key of keys)
    filesystemScope(key)
}

function within(root: string, path: string) {
  const tail = relative(root, path)
  return tail === '' || tail !== '..' && !tail.startsWith('../') && !tail.startsWith('..\\') && !isAbsolute(tail)
}

/** Ordinary siblings remain independent; shared objects need an alias fence. */
export function executionResourcesOverlap(left: readonly string[], right: readonly string[], options: { leftResourceOnly?: boolean, rightResourceOnly?: boolean, leftCoordinationOnly?: boolean, rightCoordinationOnly?: boolean } = {}) {
  // Admitting work is a card-local state transaction, never permission to
  // drive a file, browser or input channel. Actual steps retain those fences.
  if (isWorkAdmissionResources(left) || isWorkAdmissionResources(right))
    return left.some(key => right.includes(key))
  if (left.includes('host:execution') && (!options.leftCoordinationOnly || !options.rightResourceOnly) || right.includes('host:execution') && (!options.rightCoordinationOnly || !options.leftResourceOnly))
    return true
  for (const first of left) {
    for (const second of right) {
      if (first === second)
        return true
      // Older durable desktop effects own the whole physical input channel.
      // A per-desktop native writer cannot bypass that existing quarantine.
      if ((first === 'physical-input:desktop' && second.startsWith('physical-input:')) || (second === 'physical-input:desktop' && first.startsWith('physical-input:')))
        return true
      const a = filesystemScope(first)
      const b = filesystemScope(second)
      // A hard link may name a file inside an owned subtree from outside it.
      // Without a complete alias inventory, defer shared objects symmetrically
      // against tree owners instead of assuming their lexical path is enough.
      if (a?.kind === 'tree' && second.startsWith('file-shared-inode:') || b?.kind === 'tree' && first.startsWith('file-shared-inode:'))
        return true
      if (a && b && (a.kind === 'tree' || b.kind === 'tree') && (within(a.path, b.path) || within(b.path, a.path)))
        return true
    }
  }
  return false
}
