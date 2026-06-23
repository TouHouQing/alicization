import { describe, expect, it } from 'vitest'

import {
  buildTraceAuthorityExecutionSummary,
  buildTraceEmbodimentSummary,
  formatTraceEmbodimentDisplaySummary,
} from './performance-visualizer-trace-embodiment'

describe('performance visualizer trace embodiment', () => {
  it('builds a shared trace embodiment summary with stable ordering', () => {
    expect(buildTraceEmbodimentSummary({
      recentDrivingTraceRecord: {
        decisionTraceId: 'mind:rest:1',
        activeThreadId: 'runtime-thread-rest-1',
        turnMode: 'care',
        truthState: 'live-grounded',
        repairState: 'none',
        finalSurfacePolicy: 'procedural-carry',
        closureState: 'grounded-recall',
        suppressionTags: ['late-night-fatigue'],
      },
      recentDrivingTraceDetails: [
        {
          kind: 'presence-pulse-dispatched',
          summary: 'protective-watch settled after fatigue pressure rose',
          createdAt: 2468,
          details: [
            { label: 'scenario', value: 'late-night-fatigue' },
            { label: 'stance', value: 'observe-first' },
          ],
        },
        {
          kind: 'person-state-updated',
          summary: 'source trail applied',
          createdAt: 2469,
          details: [
            { label: 'sourceTrail', value: 'fatigue, care, grounded-recall' },
          ],
        },
      ],
    })).toBe('turn=care | closure=grounded-recall | surface=procedural-carry | authority=none | execution=none | scenario=late-night-fatigue | stance=observe-first | sourceTrail=fatigue, care, grounded-recall')
  })

  it('extends the shared trace embodiment summary with authority and execution lanes', () => {
    expect(buildTraceAuthorityExecutionSummary({
      turnMode: 'care',
      closureState: 'grounded-recall',
      finalSurfacePolicy: 'procedural-carry',
      matchedDrivers: ['face', 'motion', 'lipsync'],
      driverExecutionSummary: 'face=attentive/focused@0.61 hold=320 | motion=observe_focus hold=240 | lipsync=energy-phoneme-hybrid phase=playing',
      traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=none | execution=none | scenario=late-night-fatigue | stance=observe-first | sourceTrail=fatigue, care, grounded-recall',
    })).toBe('turn=care | closure=grounded-recall | surface=procedural-carry | authority=face, motion, lipsync | execution=face+motion+lipsync | scenario=late-night-fatigue | stance=observe-first | sourceTrail=fatigue, care, grounded-recall')
  })

  it('keeps body and voice execution lanes when rebuilding same-her trace embodiment summaries from body-lipsync-voice carry', () => {
    expect(buildTraceAuthorityExecutionSummary({
      turnMode: 'care',
      closureState: 'grounded-recall',
      finalSurfacePolicy: 'procedural-carry',
      matchedDrivers: ['body', 'lipsync', 'voice'],
      driverExecutionSummary: 'body=measured-return seg=segment-audible-body-voice-1 | lipsync=energy-phoneme-hybrid phase=playing seg=segment-audible-body-voice-1 | voice=authority-bound phase=playing seg=segment-audible-body-voice-1',
      traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=none | execution=none | scenario=same-body-line | stance=observe-first | sourceTrail=care, grounded-recall',
    })).toBe('turn=care | closure=grounded-recall | surface=procedural-carry | authority=body, lipsync, voice | execution=body+lipsync+voice | scenario=same-body-line | stance=observe-first | sourceTrail=care, grounded-recall')
  })

  it('formats generated trace embodiment summaries into Chinese-first display text while preserving raw summaries elsewhere', () => {
    expect(formatTraceEmbodimentDisplaySummary(
      'turn=care | closure=grounded-recall | surface=procedural-carry | authority=face, motion, lipsync | execution=face+motion+lipsync | scenario=late-night-fatigue | stance=observe-first | sourceTrail=fatigue, care, grounded-recall',
    )).toBe('关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达），权威驱动 表情、动作、口型，实际执行 表情+动作+口型，场景 深夜疲劳照看，姿态 先观察后表达，来源链 fatigue -> care -> grounded-recall')
  })

  it('maps known closure, surface, stance, scenario, and none markers into more natural Chinese semantics', () => {
    expect(formatTraceEmbodimentDisplaySummary(
      'turn=care | closure=grounded-recall | surface=procedural-carry | authority=none | execution=none | scenario=late-night-fatigue | stance=observe-first',
    )).toBe('关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达），权威驱动 无，实际执行 无，场景 深夜疲劳照看，姿态 先观察后表达')
  })
})
