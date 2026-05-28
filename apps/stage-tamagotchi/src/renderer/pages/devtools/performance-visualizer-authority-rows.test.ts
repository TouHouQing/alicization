import { describe, expect, it } from 'vitest'

import { buildAuthorityDisplayRows } from './performance-visualizer-authority-rows'

describe('performance visualizer authority rows', () => {
  it('builds compact display rows from authority segment rows', () => {
    const rows = buildAuthorityDisplayRows([
      {
        cueId: 'segment-live2d-1',
        cueText: '继续看这里。',
        surfaces: ['live2d'],
        lanes: ['expression', 'lipsync', 'settle'],
        aligned: false,
        driftStatus: 'partial-drift',
        entries: [
          {
            surface: 'live2d',
            lane: 'expression',
            cueId: 'segment-live2d-1',
            planned: 'CalmInspect',
            consumed: 'RecoverSoft',
            source: null,
            aligned: false,
          },
          {
            surface: 'live2d',
            lane: 'lipsync',
            cueId: 'segment-live2d-1',
            planned: 'I',
            consumed: 'I',
            source: 'prosody-authority',
            confidence: 0.91,
            aligned: true,
          },
          {
            surface: 'live2d',
            lane: 'settle',
            cueId: 'segment-live2d-1',
            planned: 'settle',
            consumed: 'settle',
            source: null,
            settle: {
              live2dFacialReleaseMs: {
                planned: 320,
                consumed: 300,
              },
            },
            aligned: false,
          },
        ],
      },
    ] as any)

    expect(rows).toEqual([
      {
        cueId: 'segment-live2d-1',
        cueText: '继续看这里。',
        surfaces: 'live2d',
        lanes: 'expression, lipsync, settle',
        driftStatus: 'partial-drift',
        aligned: false,
        detailRows: [
          {
            surface: 'live2d',
            lane: 'expression',
            planned: 'CalmInspect',
            consumed: 'RecoverSoft',
            source: 'n/a',
            confidence: 'n/a',
            settle: undefined,
            aligned: false,
            settleLines: [],
          },
          {
            surface: 'live2d',
            lane: 'lipsync',
            planned: 'I',
            consumed: 'I',
            source: 'prosody-authority',
            confidence: '0.91',
            settle: undefined,
            aligned: true,
            settleLines: [],
          },
          {
            surface: 'live2d',
            lane: 'settle',
            planned: 'settle',
            consumed: 'settle',
            source: 'n/a',
            confidence: 'n/a',
            settle: {
              live2dFacialReleaseMs: {
                planned: 320,
                consumed: 300,
              },
            },
            aligned: false,
            settleLines: ['live2dFacialReleaseMs: 320 -> 300'],
          },
        ],
      },
    ])
  })
})
