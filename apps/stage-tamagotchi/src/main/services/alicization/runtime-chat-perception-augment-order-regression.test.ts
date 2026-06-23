import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('runtime-chat-perception-augment order regression', () => {
  it('keeps visible-reply surface governance blocks ahead of reply deliberation and answer planner blocks', () => {
    const source = readFileSync(new URL('./runtime-chat-perception-augment.ts', import.meta.url), 'utf8')

    const executiveIndex = source.indexOf('visibleReplySurfacePlan.systemBlocks.executiveAnswerBrief')
    const surfaceContractIndex = source.indexOf('visibleReplySurfacePlan.systemBlocks.responseSurfaceContract')
    const mindTurnContractIndex = source.indexOf('visibleReplySurfacePlan.systemBlocks.mindTurnContract')
    const responseCharterIndex = source.indexOf('visibleReplySurfacePlan.systemBlocks.responseCharter')
    const replyDeliberationIndex = source.indexOf('buildReplyDeliberationSystemBlock(visualPresenceState.replyDeliberation)')
    const answerPlannerIndex = source.indexOf('buildAlicizationAnswerPlannerSystemBlock(visualPresenceState.answerPlanner)')

    expect(executiveIndex).toBeGreaterThan(-1)
    expect(surfaceContractIndex).toBeGreaterThan(-1)
    expect(mindTurnContractIndex).toBeGreaterThan(-1)
    expect(responseCharterIndex).toBeGreaterThan(-1)
    expect(replyDeliberationIndex).toBeGreaterThan(-1)
    expect(answerPlannerIndex).toBeGreaterThan(-1)

    expect(executiveIndex).toBeLessThan(replyDeliberationIndex)
    expect(surfaceContractIndex).toBeLessThan(replyDeliberationIndex)
    expect(mindTurnContractIndex).toBeLessThan(replyDeliberationIndex)
    expect(responseCharterIndex).toBeLessThan(replyDeliberationIndex)
    expect(executiveIndex).toBeLessThan(answerPlannerIndex)
    expect(surfaceContractIndex).toBeLessThan(answerPlannerIndex)
    expect(mindTurnContractIndex).toBeLessThan(answerPlannerIndex)
    expect(responseCharterIndex).toBeLessThan(answerPlannerIndex)
  })

  it('still injects reply deliberation after mind-turn and response-charter governance so project-status closure summaries reach generation from the inner arbitration layer', () => {
    const source = readFileSync(new URL('./runtime-chat-perception-augment.ts', import.meta.url), 'utf8')

    const mindTurnContractIndex = source.indexOf('visibleReplySurfacePlan.systemBlocks.mindTurnContract')
    const responseCharterIndex = source.indexOf('visibleReplySurfacePlan.systemBlocks.responseCharter')
    const replyDeliberationIndex = source.indexOf('buildReplyDeliberationSystemBlock(visualPresenceState.replyDeliberation)')

    expect(mindTurnContractIndex).toBeGreaterThan(-1)
    expect(responseCharterIndex).toBeGreaterThan(-1)
    expect(replyDeliberationIndex).toBeGreaterThan(-1)

    expect(mindTurnContractIndex).toBeLessThan(replyDeliberationIndex)
    expect(responseCharterIndex).toBeLessThan(replyDeliberationIndex)
  })

  it('feeds recent humanlike memory candidates and fresh host corrections into the main-chat memory recall seed instead of leaving fresh corrections audit-only', () => {
    const source = readFileSync(new URL('./runtime-chat-perception-augment.ts', import.meta.url), 'utf8')

    expect(source).toContain('resolveHumanlikeMemoryRecallSeedFromEventHistory')
    expect(source).toContain('listHumanlikeMemoryRecallEvents?:')
    expect(source).toContain('const humanlikeMemoryRecallSeed = await')
    expect(source).toContain('humanlikeMemoryRecallSeed,')
    expect(source).toContain('resolveHumanlikeMemoryRecallSeedFromEventHistory({')
    expect(source).toContain('listHumanlikeMemoryRecallEvents,')
    expect(source).toContain('limit: 24,')
  })
})
