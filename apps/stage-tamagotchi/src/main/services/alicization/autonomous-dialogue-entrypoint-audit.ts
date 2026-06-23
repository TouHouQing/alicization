import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

function toServiceRelativePath(absolutePath: string) {
  return absolutePath.split('/apps/stage-tamagotchi/src/main/services/alicization/')[1] ?? absolutePath
}

const proactivePreludeAuthorityNeedle = '[ALICIZATION_PROACTIVE_SELF_BRIEF]'
const reminderGatewayNeedle = 'generateReminderStructuredWithGateway('
const autonomousTurnIdBuilderNeedle = 'buildAlicizationAutonomousDialogueTurnId({'
const reminderKindNeedle = 'kind: \'reminder\''
const executionCallbackKindNeedle = 'kind: \'execution-callback\''
const subconsciousKindNeedle = 'kind: \'subconscious\''
const subconsciousStructuredFormatNeedle = 'resolveAlicizationAutonomousDialogueStructuredFormat(\'subconscious-proactive\')'

export function collectAlicizationAutonomousDialogueGovernedFiles(rootDir: string) {
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
      const relativePath = toServiceRelativePath(absolutePath)

      const ownsProactivePreludeAuthority = source.includes(proactivePreludeAuthorityNeedle)
      const ownsReminderOrCallbackAutonomousTurnEntry
        = source.includes(reminderGatewayNeedle)
          && source.includes(autonomousTurnIdBuilderNeedle)
          && (source.includes(reminderKindNeedle)
            || source.includes(executionCallbackKindNeedle))
      const ownsSubconsciousAutonomousTurnEntry
        = source.includes(subconsciousKindNeedle)
          && source.includes(subconsciousStructuredFormatNeedle)

      if (ownsProactivePreludeAuthority || ownsReminderOrCallbackAutonomousTurnEntry || ownsSubconsciousAutonomousTurnEntry)
        discovered.add(relativePath)
    }
  }

  return [...discovered].sort()
}
