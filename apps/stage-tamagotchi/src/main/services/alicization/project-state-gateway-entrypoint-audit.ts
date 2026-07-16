import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

function toServiceRelativePath(absolutePath: string) {
  return absolutePath.split('/apps/stage-tamagotchi/src/main/services/alicization/')[1] ?? absolutePath
}

const directGenerateTextImportNeedle = 'from \'@xsai/generate-text\''
const directStreamTextImportNeedle = 'from \'@xsai/stream-text\''

export type AlicizationDirectProviderImportAuditMode
  = 'one-shot-provider-entry'
    | 'stream-provider-entry'
    | 'main-gateway-provider-wrapper'

export interface AlicizationDirectProviderImportAuditEntry {
  relativePath: string
  mode: AlicizationDirectProviderImportAuditMode
  responsibility: string
}

const alicizationDirectProviderImportAuditRegistry = [
  {
    relativePath: 'main-chat-one-shot.ts',
    mode: 'one-shot-provider-entry',
    responsibility: 'Compact one-shot Provider entry accepts only prepared task prompts, user instructions, and typed facts before direct non-streaming generation.',
  },
  {
    relativePath: 'main-chat-stream-runner.ts',
    mode: 'stream-provider-entry',
    responsibility: 'Streaming Provider entry consumes the prepared dialogue mainline and surfaces Provider, tool, and timeout failures without replacement dialogue.',
  },
  {
    relativePath: 'runtime-main-gateway-one-shot.ts',
    mode: 'main-gateway-provider-wrapper',
    responsibility: 'Unified one-shot wrapper requires a registered source tag and filters auxiliary system context to typed JSON facts before Provider execution.',
  },
] as const satisfies readonly AlicizationDirectProviderImportAuditEntry[]

export function collectAlicizationDirectProviderImportFiles(rootDir: string) {
  const queued = [rootDir]
  const discovered = new Set<string>()

  while (queued.length > 0) {
    const currentDir = queued.pop()
    if (!currentDir)
      continue

    for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
      const absolutePath = join(currentDir, entry.name)
      if (entry.isDirectory()) {
        queued.push(absolutePath)
        continue
      }
      if (!entry.isFile() || !entry.name.endsWith('.ts') || entry.name.endsWith('.test.ts') || entry.name.endsWith('-audit.ts'))
        continue

      const source = readFileSync(absolutePath, 'utf8')
      if (source.includes(directGenerateTextImportNeedle) || source.includes(directStreamTextImportNeedle))
        discovered.add(toServiceRelativePath(absolutePath))
    }
  }

  return [...discovered].sort()
}

export function resolveAlicizationDirectProviderImportAuditRegistry() {
  return alicizationDirectProviderImportAuditRegistry
}

export function resolveAlicizationDirectProviderImportAuditFiles() {
  return alicizationDirectProviderImportAuditRegistry.map(entry => entry.relativePath)
}

export function resolveAlicizationDirectProviderImportAuditMode(relativePath: string) {
  return alicizationDirectProviderImportAuditRegistry.find(entry => entry.relativePath === relativePath)?.mode ?? null
}
