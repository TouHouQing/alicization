import type { AlicizationEpisodicEventInput } from '@proj-alicization/stage-shared'

import type { LifeObligation } from '../../../shared/life-contracts'

/** Only the committed goal and its independent proof can describe this event. */
export function projectExperienceEpisode(goal: LifeObligation): AlicizationEpisodicEventInput | null {
  if (goal.kind !== 'personal-project' || goal.status !== 'fulfilled' || goal.invalidatedBy || !goal.threadId || goal.verification?.verdict !== 'satisfied' || !goal.verification.independent)
    return null
  return { id: `project-experience:${goal.threadId}:${goal.generation}`, cardId: goal.cardId, turnId: goal.threadId, sourceKind: 'execution-result', provenance: 'observed', occurredAt: goal.verification.verifiedAt, createdAt: goal.verification.verifiedAt, updatedAt: goal.verification.verifiedAt, whatHappened: goal.personalActivity === 'visual-study-v1' ? '完成了本地视觉创作练习，并独立核验了 SVG 作品；画面不作为真实世界经历。' : goal.personalActivity === 'creative-writing-v1' ? '完成了一次虚构作品的创作练习，并通过独立读取核验了本地作品文件；作品中的故事不作为真实经历。' : '完成了一个本地札记目标，并通过独立读取核验了文件内容。', sourceSummary: `independent-file-proof:${goal.verification.id}`, confidence: 1, salience: 0.55, withWhom: ['self'], tags: ['personal-project', 'owned-note', 'verified-artifact'], derivedFrom: [{ kind: 'task-thread', id: goal.threadId }] }
}

export function sameVerifiedProject(current: LifeObligation | undefined, expected: LifeObligation) {
  return current?.cardId === expected.cardId && current.id === expected.id && current.generation === expected.generation && current.verification?.id === expected.verification?.id && projectExperienceEpisode(current) !== null
}
