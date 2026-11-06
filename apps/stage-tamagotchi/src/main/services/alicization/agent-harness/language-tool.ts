import type { LanguageQuery } from './native-language-runtime'

import { tool } from '@xsai/tool'
import { z } from 'zod'

export const languageToolName = 'life_language_query'
export const languageInputSchema = { type: 'object', properties: { workspaceRoot: { type: 'string', minLength: 1 }, filePath: { type: 'string', minLength: 1 }, operation: { type: 'string', enum: ['definition', 'references', 'hover', 'symbols', 'diagnostics'] }, line: { type: 'integer', minimum: 0 }, character: { type: 'integer', minimum: 0 } }, required: ['workspaceRoot', 'filePath', 'operation'], additionalProperties: false }

export function createLanguageTool(query: (input: LanguageQuery, signal?: AbortSignal) => Promise<unknown>) {
  return tool({
    name: languageToolName,
    description: 'Read actual TypeScript/JavaScript LSP diagnostics, definition, references, hover or document symbols in a declared local workspace. Positions are zero-based UTF-16. Uses the shipped language server, current file bytes, scrubbed environment and an owned process tree. Returns a source hash and actual server result. Diagnostics are a published document snapshot. Does not apply edits or run server commands; other languages are not offered by this provider.',
    parameters: z.object({ workspaceRoot: z.string().min(1), filePath: z.string().min(1), operation: z.enum(['definition', 'references', 'hover', 'symbols', 'diagnostics']), line: z.number().int().min(0).optional(), character: z.number().int().min(0).optional() }).strict(),
    execute: (input, options) => query(input, options?.abortSignal),
  })
}
