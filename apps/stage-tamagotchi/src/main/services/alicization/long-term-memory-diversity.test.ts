import type { RankedLongTermMemoryEvidence } from './long-term-memory-recall'

import { expect, it } from 'vitest'

import { selectDiverseLongTermEvidence } from './long-term-memory-diversity'

it('does not let copies of a preference crowd out a related shared experience', () => {
  const item = (id: string, summary: string, score: number): RankedLongTermMemoryEvidence => ({ candidate: { id, summary, kind: 'episode', source: 'episodic_events', confidence: 0.9 }, score, queryMatches: [], rankReasons: [], scope: { userId: 'local', cardId: 'alice' }, provenance: 'observed', evidenceVersion: 'v1', version: 'v1' })
  const selected = selectDiverseLongTermEvidence([
    item('a', '用户喜欢白露茶，晚上不喝咖啡。', 0.9),
    item('b', '用户喜欢白露茶，晚上不喝咖啡。', 0.88),
    item('c', '用户喜欢白露茶，晚上不喝咖啡。', 0.87),
    item('d', '我们一起在窗边喝白露茶，那天用户向我分享了生日计划。', 0.82),
  ], 2)
  expect(selected.map(entry => entry.candidate.id)).toEqual(['a', 'd'])
})
