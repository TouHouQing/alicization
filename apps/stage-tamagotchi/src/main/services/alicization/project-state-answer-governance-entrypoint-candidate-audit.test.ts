import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  resolveAlicizationProjectStateAnswerGovernanceAuditedFiles,
} from './project-state-answer-governance-audit'
import {
  collectAlicizationProjectStateAnswerGovernanceFiles,
} from './project-state-answer-governance-entrypoint-audit'

describe('project state answer governance entrypoint candidate audit', () => {
  it('keeps broader project-state answer-governance candidate discovery sourced from the shared audited helper instead of re-encoding one more local project-status answer scan', () => {
    const source = readFileSync(new URL('./project-state-answer-governance-audit.test.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'./project-state-answer-governance-entrypoint-audit\'')
    expect(source).toContain('collectAlicizationProjectStateAnswerGovernanceFiles(')
    expect(/^function collectProjectStateAnswerGovernanceOwnerFiles\(/m.test(source)).toBe(false)
  })

  it('keeps broader project-state answer-governance candidate discovery broad enough to catch governance authority, semantics classification, answer planning, response charter shaping, runtime answer enrichers, contract surfaces, reply-surface preflight, and visible-reply continuity surfaces instead of only one project-status answer seam flavor', () => {
    const source = readFileSync(new URL('./project-state-answer-governance-entrypoint-audit.ts', import.meta.url), 'utf8')
    const semanticsSource = readFileSync(new URL('./dialogue-turn-semantics.ts', import.meta.url), 'utf8')
    const plannerSource = readFileSync(new URL('./answer-planner.ts', import.meta.url), 'utf8')
    const responseCharterSource = readFileSync(new URL('./response-charter.ts', import.meta.url), 'utf8')
    const governanceSource = readFileSync(new URL('./project-state-answer-governance.ts', import.meta.url), 'utf8')
    const activeDialogueSource = readFileSync(new URL('./main-chat-active-dialogue-loop.ts', import.meta.url), 'utf8')
    const backgroundSource = readFileSync(new URL('./main-chat-background-run.ts', import.meta.url), 'utf8')
    const oneShotSource = readFileSync(new URL('./runtime-main-gateway-one-shot.ts', import.meta.url), 'utf8')
    const sessionRuntimeSource = readFileSync(new URL('./main-chat-session-runtime.ts', import.meta.url), 'utf8')
    const responseSurfaceContractSource = readFileSync(new URL('./response-surface-contract.ts', import.meta.url), 'utf8')
    const remindersSource = readFileSync(new URL('./runtime-delivery-reminders.ts', import.meta.url), 'utf8')
    const runtimeGovernanceSource = readFileSync(new URL('./runtime-governance.ts', import.meta.url), 'utf8')
    const visibleReplyCriticSource = readFileSync(new URL('./visible-reply/critic.ts', import.meta.url), 'utf8')
    const visibleReplyFacadeSource = readFileSync(new URL('./visible-reply/facade.ts', import.meta.url), 'utf8')
    const semanticJudgeSource = readFileSync(new URL('./visible-reply/semantic-judge.ts', import.meta.url), 'utf8')

    expect(semanticsSource).toContain('const projectStateMergeReadinessCuePattern')
    expect(semanticsSource).toContain('const projectStateCompletionTimelineCuePattern')
    expect(semanticsSource).toContain('const projectStateLanguageDriftCuePattern')
    expect(plannerSource).toContain('function looksLikeProjectStateDirectAnswerTurn(')
    expect(plannerSource).toContain('same digital life line: Phase 1 landed progress, when the goal is expected to close, and whether the thread drifted out of the host language or project line still need one direct answer.')
    expect(responseCharterSource).toContain('Keep direct project-state answers inward-first so the live payoff lands before any project-summary voice appears.')
    expect(responseCharterSource).toContain('Do not reopen this same-thread project-state turn from scratch or let it flatten into a fresh report opening.')
    expect(governanceSource).toContain('export function enrichProjectStateAnswerGovernanceIfNeeded')
    expect(activeDialogueSource).toContain('[ALICIZATION_PROJECT_STATE_ANSWER_CONTRACT]')
    expect(backgroundSource).toContain('enrichProjectStateAnswerGovernanceIfNeeded(')
    expect(oneShotSource).toContain('alicizationProjectStateAnswerContractLines')
    expect(sessionRuntimeSource).toContain('enrichProjectStateAnswerGovernanceIfNeeded(')
    expect(responseSurfaceContractSource).toContain('rules.push(alicizationProjectStateVisibleReplySameHerReminder.replace(\'questions\', \'status\'))')
    expect(remindersSource).toContain('?? alicizationProjectStateVisibleReplySameHerReminder')
    expect(runtimeGovernanceSource).toContain('function resolveProjectStateContinuityCarry(')
    expect(runtimeGovernanceSource).toContain('preDialogueAwarenessSummary')
    expect(runtimeGovernanceSource).toContain('landedProgressSummary')
    expect(runtimeGovernanceSource).toContain('openClosureSummary')
    expect(runtimeGovernanceSource).toContain('nextClosureTargetSummary')
    expect(visibleReplyCriticSource).toContain('pushUnique(mustPreserve, alicizationProjectStateVisibleReplySameHerReminder)')
    expect(visibleReplyFacadeSource).toContain('const projectState = resolveVisibleReplyProjectState({')
    expect(visibleReplyFacadeSource).toContain('const executiveAnswerBrief = buildAlicizationExecutiveAnswerBrief({')
    expect(visibleReplyFacadeSource).toContain('const responseSurfaceContract = buildAlicizationResponseSurfaceContract({')
    expect(semanticJudgeSource).toContain('alicizationProjectStateVisibleReplySameHerReminder')
    expect(source).toContain('answerGovernanceEnricherNeedle')
    expect(source).toContain('answerContractSurfaceNeedle')
    expect(source).toContain('visibleReplySameHerReminderNeedle')
    expect(source).toContain('localGovernanceImportNeedle')
    expect(source).toContain('parentGovernanceImportNeedle')
    expect(source).toContain('projectStateSemanticsClassificationNeedle')
    expect(source).toContain('projectStateAnswerPlanningNeedle')
    expect(source).toContain('projectStateResponseCharterNeedle')
    expect(source).toContain('visibleReplyProjectStateResolutionNeedle')
    expect(source).toContain('visibleReplyExecutiveAnswerBriefNeedle')
    expect(source).toContain('visibleReplyResponseSurfaceContractNeedle')
    expect(source).toContain('runtimeGovernanceProjectStateContinuityCarryNeedle')
    expect(source).toContain('runtimeGovernanceProjectStateAwarenessNeedle')
    expect(source).toContain('runtimeGovernanceProjectStateLandedSummaryNeedle')
    expect(source).toContain('runtimeGovernanceProjectStateOpenSummaryNeedle')
    expect(source).toContain('runtimeGovernanceProjectStateNextSummaryNeedle')
  })

  it('keeps the current project-state answer-governance candidate set equal to the explicit audited files so the broader project-status answer scan and audit registry stay synchronized', () => {
    const rootDir = new URL('.', import.meta.url).pathname

    expect(collectAlicizationProjectStateAnswerGovernanceFiles(rootDir)).toEqual(
      resolveAlicizationProjectStateAnswerGovernanceAuditedFiles().slice().sort(),
    )
  })

  it('makes the current boundary explicit: broader project-state answer-governance candidates now feed the same top-level completeness guard, while future project-status answer surfaces still remain open', () => {
    const routeAuthoritySource = readFileSync(new URL('./project-awareness-route-authority-audit.test.ts', import.meta.url), 'utf8')
    const coverageSource = readFileSync(new URL('./project-awareness-coverage-matrix.test.ts', import.meta.url), 'utf8')
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')

    expect(routeAuthoritySource).toContain('from \'./project-state-answer-governance-entrypoint-audit\'')
    expect(routeAuthoritySource).toContain('collectAlicizationProjectStateAnswerGovernanceFiles(')
    expect(coverageSource).toContain('project-state-answer-governance-entrypoint-candidate-audit.test.ts')
    expect(matrixSource).toContain('project-state-answer-governance-entrypoint-candidate-audit.test.ts')
    expect(coverageSource).toContain('semantics classification, answer planning, response charter shaping')
    expect(matrixSource).toContain('semantics classification, answer planning, response charter shaping')
    expect(matrixSource).toContain('future project-status answer surfaces still need explicit classification')
  })
})
