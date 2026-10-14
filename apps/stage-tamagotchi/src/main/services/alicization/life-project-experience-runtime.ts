import type { AlicizationEpisodicEventInput } from '@proj-alicization/stage-shared'

import type { LifeCommitInput, LifeCommitReceipt, LifeObligation, LifeStateView } from '../../../shared/life-contracts'

import { projectExperienceEpisode, sameVerifiedProject } from './life-project-experience'

export function createLifeProjectExperienceRecorder(options: {
  read: () => Promise<LifeStateView>
  commit: (input: LifeCommitInput) => Promise<LifeCommitReceipt>
  readMeta: (key: string) => Promise<string | undefined>
  appendEpisodes: (events: AlicizationEpisodicEventInput[]) => Promise<unknown>
}) {
  return async (goal: LifeObligation) => {
    const episode = projectExperienceEpisode(goal)
    if (!episode || !goal.verification)
      return
    const id = `project-experience:${goal.threadId}:${goal.generation}`
    const marker = `life:experience:${goal.cardId}:${id}`
    if (await options.readMeta(marker))
      return
    const before = await options.read()
    if (before.cardId !== goal.cardId)
      throw new Error('Project memory crossed the card boundary')
    if (!sameVerifiedProject(before.obligations.find(item => item.id === goal.id), goal))
      return
    const authored = before.effects.some(effect => effect.turnId === goal.threadId && effect.status === 'settled' && effect.payload.capabilityId === 'owned-note' && effect.receipt?.outcome === 'completed' && (effect.payload.parameters as { ownedNote?: { contentHash?: string } })?.ownedNote?.contentHash === goal.proof.contentHash)
    if (!authored)
      return
    // A deterministic episode makes a crash between publication and cursor save
    // recoverable. Verification time is not presented as file creation time.
    await options.appendEpisodes([episode])
    const view = await options.read()
    if (view.cardId !== goal.cardId)
      throw new Error('Project memory crossed the card boundary')
    const current = view.obligations.find(item => item.id === goal.id)
    if (!sameVerifiedProject(current, goal))
      return
    await options.commit({ cardId: goal.cardId, operationKey: `project-memory:${goal.id}:${goal.generation}`, changes: [], mutations: [{ type: 'project-experience-indexed', goalId: goal.id, generation: goal.generation, episodeId: id, verificationId: goal.verification.id }] })
  }
}
