import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

function toServiceRelativePath(absolutePath: string) {
  return absolutePath.split('/apps/stage-tamagotchi/src/main/services/alicization/')[1] ?? absolutePath
}

const mainGatewayTypedProviderNeedle = /generateMainGatewayText:\s*AlicizationMainGatewayGenerateTextProvider</u
const memoryGatewayTypedProviderNeedle = /generateMainGatewayText:\s*AlicizationMemoryGatewayTextProvider/u
const mainGatewayProviderAliasNeedle = /const mainGatewayTextProvider:\s*AlicizationMainGatewayTextProvider\s*=/u
const mainGatewayProviderInterfaceNeedle = /export interface AlicizationMainGatewayTextProvider/u

export function collectAlicizationProviderConsumerGovernedFiles(rootDir: string) {
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
      if (
        mainGatewayTypedProviderNeedle.test(source)
        || memoryGatewayTypedProviderNeedle.test(source)
        || mainGatewayProviderAliasNeedle.test(source)
        || mainGatewayProviderInterfaceNeedle.test(source)
      ) {
        discovered.push(absolutePath)
      }
    }
  }

  return discovered
    .map(toServiceRelativePath)
    .sort()
}
