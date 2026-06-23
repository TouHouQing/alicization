import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

function toServiceRelativePath(absolutePath: string) {
  return absolutePath.split('/apps/stage-tamagotchi/src/main/services/alicization/')[1] ?? absolutePath
}

const chatStartPayloadTypeNeedle = /\bAlicizationChatStartPayload\b/u
const mainChatPreludeNeedle = 'prepareMainChatPrelude('
const mainChatExecutionNeedle = 'prepareMainChatExecution('
const timeoutFallbackReplyNeedle = 'buildAlicizationMainGatewayTimeoutFallbackReply('

function forEachAlicizationChatStartSourceFile(
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

export function collectAlicizationChatStartPayloadTypeConsumerFiles(rootDir: string) {
  const discovered = new Set<string>()

  forEachAlicizationChatStartSourceFile(rootDir, (relativePath, source) => {
    if (chatStartPayloadTypeNeedle.test(source))
      discovered.add(relativePath)
  })

  return [...discovered].sort()
}

export function collectAlicizationChatStartDeepHelperOwnerFiles(rootDir: string) {
  const discovered = new Set<string>()

  forEachAlicizationChatStartSourceFile(rootDir, (relativePath, source) => {
    if (relativePath !== 'runtime-main-chat-prelude.ts' && source.includes(mainChatPreludeNeedle))
      discovered.add(relativePath)
    if (relativePath !== 'runtime-main-chat-prelude.ts' && source.includes(mainChatExecutionNeedle))
      discovered.add(relativePath)
    if (relativePath !== 'main-chat-timeout-fallback.ts' && source.includes(timeoutFallbackReplyNeedle))
      discovered.add(relativePath)
  })

  return [...discovered].sort()
}

export function collectAlicizationChatStartGovernedFiles(rootDir: string) {
  const discovered = new Set([
    ...collectAlicizationChatStartPayloadTypeConsumerFiles(rootDir),
    ...collectAlicizationChatStartDeepHelperOwnerFiles(rootDir),
  ])

  return [...discovered].sort()
}
