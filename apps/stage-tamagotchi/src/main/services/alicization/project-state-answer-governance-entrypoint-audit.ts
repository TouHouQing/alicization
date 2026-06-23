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
const projectStateSemanticsClassificationNeedle = 'const projectStateMergeReadinessCuePattern'
const projectStateCompletionTimelineNeedle = 'const projectStateCompletionTimelineCuePattern'
const projectStateLanguageDriftNeedle = 'const projectStateLanguageDriftCuePattern'
const projectStateAnswerPlanningNeedle = 'function looksLikeProjectStateDirectAnswerTurn('
const projectStateAnswerPlanningLineNeedle = 'same digital life line: Phase 1 landed progress, when the goal is expected to close, and whether the thread drifted out of the host language or project line still need one direct answer.'
const projectStateResponseCharterNeedle = 'Keep direct project-state answers inward-first so the live payoff lands before any project-summary voice appears.'
const projectStateResponseCharterRestartNeedle = 'Do not reopen this same-thread project-state turn from scratch or let it flatten into a fresh report opening.'
const visibleReplyProjectStateResolutionNeedle = 'const projectState = resolveVisibleReplyProjectState({'
const visibleReplyExecutiveAnswerBriefNeedle = 'const executiveAnswerBrief = buildAlicizationExecutiveAnswerBrief({'
const visibleReplyResponseSurfaceContractNeedle = 'const responseSurfaceContract = buildAlicizationResponseSurfaceContract({'
const runtimeGovernanceProjectStateContinuityCarryNeedle = 'function resolveProjectStateContinuityCarry('
const runtimeGovernanceProjectStateAwarenessNeedle = 'preDialogueAwarenessSummary'
const runtimeGovernanceProjectStateLandedSummaryNeedle = 'landedProgressSummary'
const runtimeGovernanceProjectStateOpenSummaryNeedle = 'openClosureSummary'
const runtimeGovernanceProjectStateNextSummaryNeedle = 'nextClosureTargetSummary'

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

      const ownsProjectStateSemanticsClassification
        = source.includes(projectStateSemanticsClassificationNeedle)
          && source.includes(projectStateCompletionTimelineNeedle)
          && source.includes(projectStateLanguageDriftNeedle)

      if (ownsProjectStateSemanticsClassification)
        discovered.add(relativePath)

      const ownsProjectStateAnswerPlanning
        = source.includes(projectStateAnswerPlanningNeedle)
          && source.includes(projectStateAnswerPlanningLineNeedle)

      if (ownsProjectStateAnswerPlanning)
        discovered.add(relativePath)

      const ownsProjectStateResponseCharter
        = source.includes(projectStateResponseCharterNeedle)
          && source.includes(projectStateResponseCharterRestartNeedle)

      if (ownsProjectStateResponseCharter)
        discovered.add(relativePath)

      const ownsVisibleReplyReplySurfacePreflight
        = source.includes(visibleReplyProjectStateResolutionNeedle)
          && source.includes(visibleReplyExecutiveAnswerBriefNeedle)
          && source.includes(visibleReplyResponseSurfaceContractNeedle)

      if (ownsVisibleReplyReplySurfacePreflight)
        discovered.add(relativePath)

      const ownsRuntimeGovernanceProjectStateContinuityCarry
        = source.includes(runtimeGovernanceProjectStateContinuityCarryNeedle)
          && source.includes(runtimeGovernanceProjectStateAwarenessNeedle)
          && source.includes(runtimeGovernanceProjectStateLandedSummaryNeedle)
          && source.includes(runtimeGovernanceProjectStateOpenSummaryNeedle)
          && source.includes(runtimeGovernanceProjectStateNextSummaryNeedle)

      if (ownsRuntimeGovernanceProjectStateContinuityCarry)
        discovered.add(relativePath)
    }
  }

  return [...discovered].sort()
}
