import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

function toServiceRelativePath(absolutePath: string) {
  return absolutePath.split('/apps/stage-tamagotchi/src/main/services/alicization/')[1] ?? absolutePath
}

const localGovernanceImportNeedle = 'from \'./project-state-answer-governance\''
const parentGovernanceImportNeedle = 'from \'../project-state-answer-governance\''
const answerGovernanceEnricherNeedle = 'enrichProjectStateAnswerGovernanceIfNeeded('
const answerContractSurfaceNeedle = 'alicizationProjectStateAnswerContractLines'
const visibleReplySameHerReminderNeedle = 'alicizationProjectStateVisibleReplySameHerReminder'
const visibleReplyProjectStateResolutionNeedle = 'const projectState = resolveVisibleReplyProjectState({'
const visibleReplyExecutiveAnswerBriefNeedle = 'const executiveAnswerBrief = buildAlicizationExecutiveAnswerBrief({'
const visibleReplyResponseSurfaceContractNeedle = 'const responseSurfaceContract = buildAlicizationResponseSurfaceContract({'

export function collectAlicizationProjectStateAnswerGovernanceFiles(rootDir: string) {
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

      if (relativePath === 'project-state-answer-governance.ts') {
        discovered.add(relativePath)
        continue
      }

      if (source.includes(localGovernanceImportNeedle) || source.includes(parentGovernanceImportNeedle))
        discovered.add(relativePath)

      // Keep real direct governance sinks explicit instead of relying only on import adjacency.
      if (source.includes(answerGovernanceEnricherNeedle))
        discovered.add(relativePath)

      if (source.includes(answerContractSurfaceNeedle))
        discovered.add(relativePath)

      if (source.includes(visibleReplySameHerReminderNeedle))
        discovered.add(relativePath)

      const ownsVisibleReplyReplySurfacePreflight
        = source.includes(visibleReplyProjectStateResolutionNeedle)
          && source.includes(visibleReplyExecutiveAnswerBriefNeedle)
          && source.includes(visibleReplyResponseSurfaceContractNeedle)

      if (ownsVisibleReplyReplySurfacePreflight)
        discovered.add(relativePath)
    }
  }

  return [...discovered].sort()
}
