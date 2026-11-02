import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'

export function isMainFilesystemMutation(capabilityId: unknown) {
  return ['tool.filesystem_write_file', 'tool.filesystem_edit_file', 'tool.filesystem_patch_file'].includes(String(capabilityId))
}

/** Replacement text is literal, including dollar signs and CRLF sequences. */
export function replaceFilesystemText(content: string, oldText: string, newText: string, replaceAll: boolean) {
  if (!oldText)
    throw new Error('File replacement requires nonempty oldText')
  const occurrences = content.split(oldText).length - 1
  const index = content.indexOf(oldText)
  return {
    content: index < 0 ? content : replaceAll ? content.split(oldText).join(newText) : content.slice(0, index) + newText + content.slice(index + oldText.length),
    replacedCount: replaceAll ? occurrences : Math.min(1, occurrences),
  }
}

/** Recompute native bytes from the immutable approved instructions and read snapshot. */
export function mainFilesystemMutationDispatchInput(capabilityId: string, parameters: unknown, sourceContent: string) {
  if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters) || Buffer.byteLength(sourceContent, 'utf8') > 2 * 1024 * 1024)
    throw new Error('File mutation requires bounded source content and instructions')
  const input = parameters as Record<string, unknown>
  if (typeof input.path !== 'string' || !input.path.trim())
    throw new Error('File mutation requires its approved path')
  const expectedHash = createHash('sha256').update(sourceContent, 'utf8').digest('hex')
  if (typeof input.expectedHash === 'string' && input.expectedHash.trim() && input.expectedHash.trim() !== expectedHash)
    throw new Error('File mutation source changed since its approved read')
  const changes = capabilityId === 'tool.filesystem_edit_file' ? [input] : capabilityId === 'tool.filesystem_patch_file' && input.dryRun !== true ? input.changes : null
  if (!Array.isArray(changes) || !changes.length)
    throw new Error('This capability has no native file mutation projection')
  let content = sourceContent
  let count = 0
  for (const change of changes) {
    if (!change || typeof change !== 'object' || typeof change.oldText !== 'string' || !change.oldText || typeof change.newText !== 'string')
      throw new Error('File mutation has invalid replacement instructions')
    const result = replaceFilesystemText(content, change.oldText, change.newText, change.replaceAll === true)
    if (!result.replacedCount && (capabilityId !== 'tool.filesystem_patch_file' || input.ignoreMissing !== true))
      throw new Error('File mutation target was not found in its source')
    content = result.content
    count += result.replacedCount
  }
  if (!count)
    throw new Error('File mutation contains no applicable replacements')
  return { path: input.path.trim(), content, expectedHash }
}
