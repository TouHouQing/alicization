import { describe, expect, it } from 'vitest'

import {
  buildMemoryConsolidationRecords,
  searchMemoryConsolidationRecords,
} from './memory-consolidation'

describe('memory consolidation', () => {
  it('builds consolidation summaries from source evidence without narrative wrappers', () => {
    const records = buildMemoryConsolidationRecords({
      now: Date.UTC(2026, 3, 20, 12, 0, 0),
      events: [
        {
          id: 'event-relationship-1',
          cardId: 'default',
          decisionTraceId: null,
          turnId: 'turn-relationship-1',
          sessionId: 'session-relationship-1',
          sourceKind: 'dialogue-feedback',
          provenance: 'remembered',
          occurredAt: Date.UTC(2026, 3, 18, 8, 0, 0),
          whereSummary: 'focused work boundary',
          withWhom: ['host'],
          threadAnchor: 'focused work boundary',
          whatHappened: 'The host needed more room before closeness during focused work.',
          felt: 'careful',
          emotionTags: ['boundary'],
          whatChanged: 'burden dropped once the reply backed off.',
          relationshipMeaning: 'Back off first, then reopen with a lighter touch.',
          lesson: 'Focused windows need more room before closeness.',
          sourceSummary: 'relationship repair period',
          confidence: 0.84,
          salience: 0.82,
          sceneAttachment: 0.34,
          consolidationPriority: 0.76,
          relationshipShift: null,
          derivedFrom: [],
          tags: ['focused-work', 'lighter-touch'],
          createdAt: Date.UTC(2026, 3, 18, 8, 30, 0),
          updatedAt: Date.UTC(2026, 3, 18, 8, 30, 0),
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
          latestReconsolidation: null,
        },
        {
          id: 'event-relationship-2',
          cardId: 'default',
          decisionTraceId: null,
          turnId: 'turn-relationship-2',
          sessionId: 'session-relationship-2',
          sourceKind: 'reply',
          provenance: 'observed',
          occurredAt: Date.UTC(2026, 3, 19, 8, 0, 0),
          whereSummary: 'bond repair seam',
          withWhom: ['host'],
          threadAnchor: 'bond repair seam',
          whatHappened: 'The answer landed better once Alicization gave more room before leaning closer.',
          felt: 'relieved',
          emotionTags: ['repair'],
          whatChanged: 'trust rose once the reply stopped pressing in.',
          relationshipMeaning: 'Space before closeness keeps the bond steadier here.',
          lesson: 'Repair should land before warmth expands.',
          sourceSummary: 'reply repair period',
          confidence: 0.82,
          salience: 0.8,
          sceneAttachment: 0.3,
          consolidationPriority: 0.74,
          relationshipShift: null,
          derivedFrom: [],
          tags: ['bond-repair', 'lighter-touch'],
          createdAt: Date.UTC(2026, 3, 19, 8, 30, 0),
          updatedAt: Date.UTC(2026, 3, 19, 8, 30, 0),
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
          latestReconsolidation: null,
        },
        {
          id: 'event-task-1',
          cardId: 'default',
          decisionTraceId: null,
          turnId: 'turn-task-1',
          sessionId: 'session-task-1',
          sourceKind: 'execution-result',
          provenance: 'observed',
          occurredAt: Date.UTC(2026, 3, 19, 10, 0, 0),
          whereSummary: 'runtime continuity thread',
          withWhom: ['host'],
          threadAnchor: 'runtime continuity',
          whatHappened: 'We kept returning to the runtime seam until the flow stabilized.',
          felt: 'focused',
          emotionTags: ['focused'],
          whatChanged: 'trust up 0.04',
          relationshipMeaning: 'Carry the same runtime seam before branching.',
          lesson: 'Return to the same seam before branching.',
          sourceSummary: 'runtime continuity repair',
          confidence: 0.86,
          salience: 0.84,
          sceneAttachment: 0.32,
          consolidationPriority: 0.74,
          relationshipShift: null,
          derivedFrom: [],
          tags: ['runtime-seam'],
          createdAt: Date.UTC(2026, 3, 19, 10, 30, 0),
          updatedAt: Date.UTC(2026, 3, 19, 10, 30, 0),
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
          latestReconsolidation: null,
        },
        {
          id: 'event-task-2',
          cardId: 'default',
          decisionTraceId: null,
          turnId: 'turn-task-2',
          sessionId: 'session-task-2',
          sourceKind: 'execution-result',
          provenance: 'remembered',
          occurredAt: Date.UTC(2026, 3, 19, 12, 0, 0),
          whereSummary: 'runtime continuity thread',
          withWhom: ['host'],
          threadAnchor: 'runtime continuity',
          whatHappened: 'The safest way through the runtime seam was still patch then verify.',
          felt: 'steady',
          emotionTags: ['focused'],
          whatChanged: 'the task line stayed coherent.',
          relationshipMeaning: 'Stay on the same seam before branching.',
          lesson: 'Patch and verify before branching.',
          sourceSummary: 'runtime continuity procedure',
          confidence: 0.84,
          salience: 0.82,
          sceneAttachment: 0.3,
          consolidationPriority: 0.72,
          relationshipShift: null,
          derivedFrom: [],
          tags: ['runtime-seam', 'procedure-learning'],
          createdAt: Date.UTC(2026, 3, 19, 12, 30, 0),
          updatedAt: Date.UTC(2026, 3, 19, 12, 30, 0),
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
          latestReconsolidation: null,
        },
      ],
    })

    const relationshipEra = records.find(record => record.kind === 'autobiographical' && record.facet === 'relationship-era')
    const taskEra = records.find(record => record.kind === 'autobiographical' && record.facet === 'task-era')
    const procedural = records.find(record => record.kind === 'procedural')

    expect(relationshipEra).toEqual(expect.objectContaining({
      summary: 'Back off first, then reopen with a lighter touch.',
      cues: expect.arrayContaining(['Back off first, then reopen with a lighter touch.']),
    }))
    expect(taskEra).toEqual(expect.objectContaining({
      summary: 'Carry the same runtime seam before branching.',
      cues: expect.arrayContaining(['runtime continuity']),
    }))
    expect(records).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'autobiographical',
        facet: 'phase',
      }),
    ]))
    expect(procedural?.summary).toBe('Return to the same seam before branching.')

    for (const summary of records.map(record => record.summary)) {
      expect(summary).not.toContain('the strongest remembered line was')
      expect(summary).not.toMatch(/During .* the dominant/u)
      expect(summary).not.toContain('The dominant mood was')
      expect(summary).not.toContain('The recurrent burden was')
      expect(summary).not.toContain('The remembered way of handling')
      expect(summary).not.toContain('an ongoing continuity seam')
    }
  })

  it('prefers autobiographical era records that match recollection intent', () => {
    const rows = searchMemoryConsolidationRecords({
      query: '为什么你这次会这样回应我',
      records: [
        {
          id: 'autobio:relationship-era:2026-W16',
          kind: 'autobiographical',
          facet: 'relationship-era',
          periodKey: '2026-W16',
          periodStartedAt: Date.UTC(2026, 3, 14, 0, 0, 0),
          periodEndedAt: Date.UTC(2026, 3, 20, 0, 0, 0),
          summary: 'Giving more room before closeness kept the relationship steadier.',
          lesson: 'Focused windows need more room before closeness.',
          cues: ['focused work', 'lighter touch'],
          confidence: 0.86,
          dominantProvenance: 'remembered',
          derivedEventIds: ['episode-relationship-1', 'episode-relationship-2'],
          updatedAt: Date.UTC(2026, 3, 20, 12, 0, 0),
        },
        {
          id: 'autobio:task-era:2026-W16',
          kind: 'autobiographical',
          facet: 'task-era',
          periodKey: '2026-W16',
          periodStartedAt: Date.UTC(2026, 3, 14, 0, 0, 0),
          periodEndedAt: Date.UTC(2026, 3, 20, 0, 0, 0),
          summary: 'Return to the same runtime seam before branching.',
          lesson: 'Patch and verify before branching.',
          cues: ['runtime continuity', 'procedure-learning'],
          confidence: 0.84,
          dominantProvenance: 'remembered',
          derivedEventIds: ['episode-task-1', 'episode-task-2'],
          updatedAt: Date.UTC(2026, 3, 20, 12, 0, 0),
        },
      ],
      recollectionIntent: {
        mode: 'relationship-history',
        temporalFocus: 'cross-session',
        searchEpisodes: true,
        searchProceduralExperience: false,
        queryHints: ['focused work', 'lighter touch'],
        rationale: 'Long-range relationship history should start from the right era.',
        confidence: 0.82,
      },
    })

    expect(rows[0]?.facet).toBe('relationship-era')
  })

  it('uses semantic and graph cues to surface the right task-era even when the recall wording changes', () => {
    const rows = searchMemoryConsolidationRecords({
      query: '继续把那条断掉的线接回去',
      records: [
        {
          id: 'autobio:task-era:runtime',
          kind: 'autobiographical',
          facet: 'task-era',
          periodKey: 'runtime-seam',
          periodStartedAt: Date.UTC(2026, 3, 18, 8, 0, 0),
          periodEndedAt: Date.UTC(2026, 3, 18, 10, 0, 0),
          summary: 'That task era kept turning back to the runtime seam until it stabilized.',
          lesson: 'Return to the same seam before branching.',
          cues: ['runtime seam', 'repair rhythm'],
          confidence: 0.78,
          dominantProvenance: 'remembered',
          derivedEventIds: ['episode-seam', 'episode-handoff'],
          updatedAt: Date.UTC(2026, 3, 18, 10, 0, 0),
          memoryTier: 'warm',
        },
        {
          id: 'autobio:phase:other',
          kind: 'autobiographical',
          facet: 'phase',
          periodKey: 'other-phase',
          periodStartedAt: Date.UTC(2026, 3, 17, 8, 0, 0),
          periodEndedAt: Date.UTC(2026, 3, 17, 10, 0, 0),
          summary: 'That phase was mostly about a general dashboard cleanup.',
          lesson: 'Keep the UI tidy.',
          cues: ['dashboard', 'cleanup'],
          confidence: 0.8,
          dominantProvenance: 'remembered',
          derivedEventIds: ['episode-other'],
          updatedAt: Date.UTC(2026, 3, 17, 10, 0, 0),
          memoryTier: 'warm',
        },
      ],
      recollectionIntent: {
        mode: 'experience-pattern',
        temporalFocus: 'experience-matched',
        searchEpisodes: true,
        searchProceduralExperience: true,
        queryHints: ['return before branching', 'runtime seam'],
        rationale: 'The host is asking to reconnect the same task line.',
        confidence: 0.82,
      },
    })

    expect(rows[0]?.id).toBe('autobio:task-era:runtime')
  })

  it('keeps autobiographical facet authority invariant when only free prose changes', () => {
    const buildRecords = (prose: {
      first: string
      second: string
    }) => buildMemoryConsolidationRecords({
      now: Date.UTC(2026, 6, 26, 12, 0, 0),
      events: [
        {
          id: 'event-prose-invariance-1',
          cardId: 'default',
          decisionTraceId: 'decision-prose-invariance-1',
          turnId: 'turn-prose-invariance-1',
          sessionId: 'session-prose-invariance',
          sourceKind: 'execution-result',
          provenance: 'observed',
          occurredAt: Date.UTC(2026, 6, 24, 8, 0, 0),
          whereSummary: prose.first,
          withWhom: ['host'],
          threadAnchor: prose.first,
          whatHappened: prose.first,
          felt: prose.first,
          emotionTags: [prose.first],
          whatChanged: prose.first,
          relationshipMeaning: prose.first,
          lesson: prose.first,
          sourceSummary: prose.first,
          confidence: 0.88,
          salience: 0.84,
          sceneAttachment: 0.4,
          consolidationPriority: 0.82,
          relationshipShift: null,
          derivedFrom: [{ kind: 'execution-event', id: 'execution-1', label: 'completed' }],
          tags: [prose.first],
          createdAt: Date.UTC(2026, 6, 24, 8, 5, 0),
          updatedAt: Date.UTC(2026, 6, 24, 8, 5, 0),
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
          latestReconsolidation: null,
        },
        {
          id: 'event-prose-invariance-2',
          cardId: 'default',
          decisionTraceId: 'decision-prose-invariance-2',
          turnId: 'turn-prose-invariance-2',
          sessionId: 'session-prose-invariance',
          sourceKind: 'execution-result',
          provenance: 'remembered',
          occurredAt: Date.UTC(2026, 6, 25, 8, 0, 0),
          whereSummary: prose.second,
          withWhom: ['host'],
          threadAnchor: prose.second,
          whatHappened: prose.second,
          felt: prose.second,
          emotionTags: [prose.second],
          whatChanged: prose.second,
          relationshipMeaning: prose.second,
          lesson: prose.second,
          sourceSummary: prose.second,
          confidence: 0.86,
          salience: 0.82,
          sceneAttachment: 0.38,
          consolidationPriority: 0.8,
          relationshipShift: null,
          derivedFrom: [{ kind: 'execution-event', id: 'execution-2', label: 'completed' }],
          tags: [prose.second],
          createdAt: Date.UTC(2026, 6, 25, 8, 5, 0),
          updatedAt: Date.UTC(2026, 6, 25, 8, 5, 0),
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
          latestReconsolidation: null,
        },
      ],
    })

    const collectFacets = (records: ReturnType<typeof buildMemoryConsolidationRecords>) => records
      .filter(record => record.kind === 'autobiographical')
      .map(record => record.facet)
      .sort()

    const neutralFacets = collectFacets(buildRecords({
      first: 'The first execution completed.',
      second: 'The second execution completed.',
    }))
    const legacyCueFacets = collectFacets(buildRecords({
      first: 'retired tool-shell quiet-companionship repair-first residue',
      second: 'retired identity refrain corrected meaning lower-pressure stable gaze',
    }))

    expect(neutralFacets).toEqual(['phase', 'task-era'])
    expect(legacyCueFacets).toEqual(neutralFacets)
  })
})
