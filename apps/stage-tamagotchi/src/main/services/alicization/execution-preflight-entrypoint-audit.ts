import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

function toServiceRelativePath(absolutePath: string) {
  return absolutePath.split('/apps/stage-tamagotchi/src/main/services/alicization/')[1] ?? absolutePath
}

function forEachAlicizationExecutionPreflightSourceFile(
  rootDir: string,
  visitor: (relativePath: string, source: string) => void,
) {
  const queued = [rootDir]

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
      const relativePath = toServiceRelativePath(absolutePath)

      visitor(relativePath, source)
    }
  }
}

export function collectAlicizationExecutionPreflightGovernedFiles(rootDir: string) {
  const discovered = new Set<string>()

  forEachAlicizationExecutionPreflightSourceFile(rootDir, (relativePath, source) => {
    if (source.includes('return buildAlicizationExecutionRuntimeContext({'))
      discovered.add(relativePath)

    if (source.includes('export function buildAlicizationExecutionRuntimeContext(input: {'))
      discovered.add(relativePath)

    if (source.includes('async function ensureDispatchInvocationRuntimeContext('))
      discovered.add(relativePath)

    if (source.includes('buildExecutionRuntimeContext: async (toolContext) => {'))
      discovered.add(relativePath)

    if (source.includes('buildExecutionRuntimeContext: async ({'))
      discovered.add(relativePath)

    if (source.includes('function buildResumeDispatchPayload(input: {'))
      discovered.add(relativePath)

    if (source.includes('[ALICIZATION_EXECUTION_BRIEFING]'))
      discovered.add(relativePath)

    if (source.includes('async function persistExecutionRuntimeContext('))
      discovered.add(relativePath)

    if (source.includes('function buildBlockedDispatchSafetyGate('))
      discovered.add(relativePath)
  })

  return [...discovered].sort()
}
