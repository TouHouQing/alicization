export const localFilesystemMaximumBytes = 2 * 1024 * 1024
export const localFilesystemSearchMaximumResults = 256
export const localFilesystemSearchMaximumBytes = 256000

const path = { type: 'string', minLength: 1 }

/** One local contract is consumed by discovery, planning and final MCP dispatch. */
export const localFilesystemInputSchemas = {
  read_file: {
    type: 'object',
    additionalProperties: false,
    required: ['path'],
    properties: { path, maxReturnBytes: { type: 'integer', minimum: 1, maximum: localFilesystemMaximumBytes } },
  },
  write_file: {
    type: 'object',
    additionalProperties: false,
    required: ['path', 'content'],
    properties: { path, content: { type: 'string', maxLength: localFilesystemMaximumBytes }, expectedHash: { type: 'string' } },
  },
  list_directory: {
    type: 'object',
    additionalProperties: false,
    required: ['path'],
    properties: {
      path,
      recursive: { type: 'boolean' },
      maxEntries: { type: 'integer', minimum: 1, maximum: 2000 },
      maxReturnBytes: { type: 'integer', minimum: 1000, maximum: 256000 },
    },
  },
  search_files: {
    type: 'object',
    additionalProperties: false,
    required: ['path', 'query'],
    properties: {
      path,
      query: { type: 'string', minLength: 1, maxLength: 4096, pattern: '^[^\u0000\r\n]+$' },
      recursive: { type: 'boolean' },
      maxResults: { type: 'integer', minimum: 1, maximum: localFilesystemSearchMaximumResults },
      maxReturnBytes: { type: 'integer', minimum: 1000, maximum: localFilesystemSearchMaximumBytes },
      caseSensitive: { type: 'boolean' },
      regex: { type: 'boolean' },
      includeGlobs: { type: 'array', maxItems: 32, items: { type: 'string', minLength: 1, maxLength: 512, pattern: '^[^!\u0000\r\n][^\u0000\r\n]*$' } },
      excludeGlobs: { type: 'array', maxItems: 32, items: { type: 'string', minLength: 1, maxLength: 512, pattern: '^[^!\u0000\r\n][^\u0000\r\n]*$' } },
      pathMode: { type: 'string', enum: ['absolute', 'raw', 'relative'], description: 'Select displayPath presentation. Structured path targets always remain canonical absolute paths.' },
    },
  },
}
