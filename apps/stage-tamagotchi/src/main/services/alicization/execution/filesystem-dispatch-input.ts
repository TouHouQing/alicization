import { localFilesystemSearchMaximumBytes, localFilesystemSearchMaximumResults } from '../../airi/mcp-servers/local-filesystem-schema'

export const filesystemDefaultReturnBytes = 128 * 1024
export const filesystemMaximumReturnBytes = 512 * 1024
export const filesystemDefaultSearchResults = 200

export function normalizeFilesystemReturnLimit(raw: unknown) {
  return typeof raw === 'number' && Number.isFinite(raw) ? Math.max(64, Math.min(filesystemMaximumReturnBytes, Math.floor(raw))) : filesystemDefaultReturnBytes
}

const text = (raw: unknown) => typeof raw === 'string' ? raw.trim() : ''
function globs(raw: unknown) {
  const values = Array.isArray(raw) ? [...new Set(raw.map(text).filter(Boolean))] : []
  return values.length ? values : undefined
}

/** The same main-owned lowering is used for actual arguments and their gate. */
export function mainFilesystemSearchDispatchInput(input: Record<string, unknown>) {
  return {
    path: text(input.path),
    query: text(input.query),
    recursive: input.recursive === true,
    maxResults: typeof input.maxResults === 'number' && Number.isFinite(input.maxResults) ? Math.max(1, Math.min(localFilesystemSearchMaximumResults, Math.floor(input.maxResults))) : filesystemDefaultSearchResults,
    maxReturnBytes: Math.min(localFilesystemSearchMaximumBytes, Math.max(1000, normalizeFilesystemReturnLimit(input.maxReturnBytes))),
    caseSensitive: input.caseSensitive === true,
    regex: input.regex === true,
    includeGlobs: globs(input.includeGlobs),
    excludeGlobs: globs(input.excludeGlobs),
    pathMode: (input.pathMode ?? 'raw') as 'absolute' | 'raw' | 'relative',
  }
}

/**
 * Keep the approved provider input intact. Only its known read facade may lower
 * display limits or defaults into native arguments. Native MCP inputs stay exact.
 */
export function mainFilesystemDispatchInput(capabilityId: string, parameters: unknown) {
  if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters))
    throw new TypeError('Filesystem dispatch requires an object input')
  const input = parameters as Record<string, unknown>
  if (capabilityId === 'tool.filesystem_search_files')
    return mainFilesystemSearchDispatchInput(input)
  if (['tool.filesystem_read_file', 'tool.filesystem_edit_file', 'tool.filesystem_patch_file'].includes(capabilityId))
    return { path: text(input.path) }
  if (capabilityId === 'tool.filesystem_list_directory')
    return { path: text(input.path), recursive: input.recursive === true }
  if (['mcp.filesystem::read_file', 'mcp.filesystem::list_directory', 'mcp.filesystem::search_files'].includes(capabilityId))
    return input
  throw new Error('This capability has no main filesystem read projection')
}
