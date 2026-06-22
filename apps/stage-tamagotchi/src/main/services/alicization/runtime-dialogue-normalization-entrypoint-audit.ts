import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

function toServiceRelativePath(absolutePath: string) {
  return absolutePath.split('/apps/stage-tamagotchi/src/main/services/alicization/')[1] ?? absolutePath
}

const normalizeDialogueRespondedPayloadNeedle = 'normalizeDialogueRespondedPayload('

export function collectAlicizationRuntimeDialogueNormalizationFiles(rootDir: string) {
  const queued = [rootDir]
  const discovered: string[] = []

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

      if (relativePath === 'runtime-governance.ts' || source.includes(normalizeDialogueRespondedPayloadNeedle))
        discovered.push(relativePath)
    }
  }

  return discovered.sort()
}
