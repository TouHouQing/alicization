import type { AlicizationMindTurnGovernance } from '../stores/alicization-bridge'

import { describe, expect, it } from 'vitest'

import { calibrateSentimentConfidence, enforceGovernedMindTurn, normalizeStructuredOutput, normalizeStructuredPreDialogueAwarenessPayload, normalizeStructuredProjectStatePayload, parseLastActEmotion, repairStructuredContractLocally, validateStructuredContract } from './alicization-structured-output'

function translateMindFallback(path: string, params?: Record<string, unknown>) {
  const map: Record<string, string> = {
    'mind-fallback.focus-default': '当前这件事',
    'mind-fallback.repair-stale-anchor': '可见回复链路没有产出模型文本；旧锚点已阻断。',
    'mind-fallback.repair-need-reground': '当前 grounding 不足；可见回复需要模型文本。',
    'mind-fallback.dialogue-boundary-memory': '旧对话记忆未作为当前事实使用；可见回复需要模型文本。',
    'mind-fallback.care-body': '关怀回复链路没有产出模型文本；本地 fallback 不代写。',
    'mind-fallback.accompany-body': '陪伴回复链路没有产出模型文本；本地 fallback 不代写。',
    'mind-fallback.answer-repair-body': '回答修复链路没有产出模型文本；本地 fallback 不代写。',
    'mind-fallback.answer-dialogue-body': '对话回复链路没有产出模型文本；本地 fallback 不代写。',
    'mind-fallback.guide-opening': `引导回复链路没有为 ${String(params?.focus ?? '')} 产出模型文本；本地 fallback 不代写。`,
    'mind-fallback.guide-opening-plain': '引导回复链路没有产出模型文本；本地 fallback 不代写。',
    'mind-fallback.care-opening': `关怀回复链路没有为 ${String(params?.focus ?? '')} 产出模型文本；本地 fallback 不代写。`,
    'mind-fallback.care-opening-plain': '关怀回复链路没有产出模型文本；本地 fallback 不代写。',
    'mind-fallback.accompany-opening': `陪伴回复链路没有为 ${String(params?.focus ?? '')} 产出模型文本；本地 fallback 不代写。`,
    'mind-fallback.accompany-opening-plain': '陪伴回复链路没有产出模型文本；本地 fallback 不代写。',
    'mind-fallback.observation-opening': `grounding 观察链路没有为 ${String(params?.focus ?? '')} 产出模型文本；本地 fallback 不代写。`,
    'mind-fallback.observation-opening-plain': 'grounding 观察链路没有产出模型文本；本地 fallback 不代写。',
    'mind-fallback.answer-opening': `回答链路没有为 ${String(params?.focus ?? '')} 产出模型文本；本地 fallback 不代写。`,
    'mind-fallback.answer-opening-plain': '回答链路没有产出模型文本；本地 fallback 不代写。',
    'mind-fallback.carry-memory': '旧记忆 carry 未作为当前事实使用；可见回复需要模型文本。',
    'mind-fallback.reground-note': '当前 grounding 不足；可见回复需要模型文本。',
  }
  return map[path] ?? path
}

describe('alicization structured output', () => {
  it('parses last ACT emotion', () => {
    const emotion = parseLastActEmotion('hello <|ACT:{"emotion":"happy"}|>world <|ACT:{"emotion":"sad"}|>!')
    expect(emotion).toBe('sad')
  })

  it('withholds fixed persona template residue from the visible reply surface', () => {
    const result = normalizeStructuredOutput({
      fullText: JSON.stringify({
        thought: 'obligation=answer; truth=grounded; focus=current-user-turn; move=answer; tone=direct',
        emotion: 'neutral',
        reply: 'Alicization is a local-first digital life project with one persistent host-resident identity and one continuous her.',
      }),
      thought: 'fallback-thought',
      reply: 'fallback-reply',
    })

    expect(result.reply).toBe('')
  })

  it('prefers strict json payload when available', () => {
    const result = normalizeStructuredOutput({
      fullText: JSON.stringify({
        thought: 'internal-json',
        emotion: 'happy',
        reply: 'json reply',
        userSentimentScore: 0.65,
        sentimentConfidenceRaw: 0.88,
      }),
      thought: 'fallback-thought',
      reply: 'fallback-reply',
    })

    expect(result.parsePath).toBe('json')
    expect(result.thought).toBe('internal-json')
    expect(result.reply).toBe('json reply')
    expect(result.emotion).toBe('happy')
    expect(result.performance.baseEmotion).toBe('happy')
    expect(result.format).toBe('mind-turn-v1')
  })

  it('preserves project state continuity fields from structured json payload', () => {
    const result = normalizeStructuredOutput({
      fullText: JSON.stringify({
        thought: 'obligation=answer; truth=grounded; focus=current-user-turn; move=answer-project-state; tone=direct',
        emotion: 'thinking',
        reply: '我先把当前数字生命闭环状态说清楚。',
        projectState: {
          identity: '本地优先数字生命',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: '项目状态、已落地进展和主要未闭环项已经能在主对话链路里进入心智约束。',
          primaryOpenLoop: '失败与回退链路里的项目状态连续性还需要稳定保留到 renderer 可观测结构里。',
          nextClosureTarget: '让回退失败工件的 projectState 也能稳定落进 renderer 结构化 turn 记录。',
          continuitySummary: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
          sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
          sameHerHoldDetail: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
        },
      }),
      thought: 'fallback-thought',
      reply: 'fallback-reply',
    })

    expect(result.projectState).toEqual({
      identity: '本地优先数字生命',
      currentPhase: 'local_desktop_life_loop',
      latestLandedProgress: '项目状态、已落地进展和主要未闭环项已经能在主对话链路里进入心智约束。',
      primaryOpenLoop: '失败与回退链路里的项目状态连续性还需要稳定保留到 renderer 可观测结构里。',
      nextClosureTarget: '让回退失败工件的 projectState 也能稳定落进 renderer 结构化 turn 记录。',
      continuitySummary: 'Alicization is still closing local_desktop_life_loop before this turn opens outward.',
      sameHerSelfLine: 'Keep project_state_continuity explicit from self-understanding into the final host-visible reply.',
      sameHerHoldDetail: 'content=excluded; reason=continuity-residue; visibility=internal-structured',
      sameHerDriftRisk: null,
      emotionalClosureCue: null,
    })
  })

  it('accepts legacy latestProgress as landed progress when structured project state omits latestLandedProgress', () => {
    const result = normalizeStructuredOutput({
      fullText: JSON.stringify({
        thought: 'obligation=answer; truth=grounded; focus=current-user-turn; move=answer-project-state; tone=direct',
        emotion: 'thinking',
        reply: '我先把当前数字生命闭环进度接上。',
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestProgress: 'Legacy project-state landed progress already survives into the structured reply path.',
          primaryOpenLoop: 'Same-her closure still needs stronger cross-path proof.',
          nextClosureTarget: 'Keep the same-her closure line stable across more provider-facing surfaces.',
        },
      }),
      thought: 'fallback-thought',
      reply: 'fallback-reply',
    })

    expect(result.projectState).toEqual(expect.objectContaining({
      latestLandedProgress: 'Legacy project-state landed progress already survives into the structured reply path.',
      primaryOpenLoop: 'continuity_closure still needs stronger cross-path proof.',
      nextClosureTarget: 'Keep the continuity_closure line stable across more provider-facing surfaces.',
    }))
  })

  it('accepts audit-style landedProgressSummary as landed progress when explicit structured project progress slots are blank', () => {
    const result = normalizeStructuredOutput({
      fullText: JSON.stringify({
        thought: 'obligation=answer; truth=grounded; focus=current-user-turn; move=answer-project-state; tone=direct',
        emotion: 'thinking',
        reply: '我先把当前数字生命闭环进度接上。',
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: ' ',
          latestProgress: '   ',
          landedProgressSummary: 'Audit-style project-state landed progress already survives into the structured reply path.',
          primaryOpenLoop: 'Same-her closure still needs stronger cross-path proof.',
          nextClosureTarget: 'Keep the same-her closure line stable across more provider-facing surfaces.',
        },
      }),
      thought: 'fallback-thought',
      reply: 'fallback-reply',
    })

    expect(result.projectState).toEqual(expect.objectContaining({
      latestLandedProgress: 'Audit-style project-state landed progress already survives into the structured reply path.',
      primaryOpenLoop: 'continuity_closure still needs stronger cross-path proof.',
      nextClosureTarget: 'Keep the continuity_closure line stable across more provider-facing surfaces.',
    }))
  })

  it('does not invent a same-her self line when structured project state omits that authority field', () => {
    const result = normalizeStructuredOutput({
      fullText: JSON.stringify({
        thought: 'obligation=answer; truth=grounded; focus=current-user-turn; move=answer-project-state; tone=direct',
        emotion: 'thinking',
        reply: '我先按当前数字生命闭环状态把这条线接住。',
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Project-state continuity already enters the main dialogue path.',
          primaryOpenLoop: 'Same-her closure still needs stronger cross-path proof.',
          nextClosureTarget: 'Keep the same-her closure line stable across more provider-facing surfaces.',
        },
      }),
      thought: 'fallback-thought',
      reply: 'fallback-reply',
    })

    expect(result.projectState?.sameHerSelfLine).toBeNull()
  })

  it('preserves pre-dialogue closure briefing fields from structured json payload', () => {
    const result = normalizeStructuredOutput({
      fullText: JSON.stringify({
        thought: 'obligation=answer; truth=grounded; focus=current-user-turn; move=answer-project-state; tone=direct',
        emotion: 'thinking',
        reply: '我会先按当前数字生命闭环状态来接这轮。',
        projectState: {
          identity: '本地优先数字生命',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: '项目身份与未闭环压力已经在对话前进入心智约束。',
          primaryOpenLoop: '需要继续保持跨通路的 same-her closure carry。',
          nextClosureTarget: '把 preDialogueClosure 作为共享结构化协议的一部分稳定保留。',
        },
        preDialogueClosure: {
          status: 'drift',
          summaryLine: '当前开口前闭环仍未完成。',
          companionBriefingLine: '先确认这个项目是数字生命，不是通用助手。',
          companionNextClosureLine: '继续把人格、自我、项目状态和未闭环项维持在同一条 life loop 上。',
          emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
          briefingLines: [
            'Landed: 项目状态已进入对话前约束。',
            'Open: 共享结构化协议还需要稳定保留 closure briefing。',
          ],
          reasons: [
            '如果开口前 briefing 丢失，就容易重新退回 generic assistant 行为。',
          ],
        },
      }),
      thought: 'fallback-thought',
      reply: 'fallback-reply',
    })

    expect(result.preDialogueClosure).toEqual(expect.objectContaining({
      status: 'drift',
      summaryLine: '当前开口前闭环仍未完成。',
      companionHeadlineLine: null,
      companionBriefingLine: '先确认这个项目是数字生命，不是通用助手。',
      companionNextClosureLine: '继续把人格、自我、项目状态和未闭环项维持在同一条 life loop 上。',
      emotionalClosureCue: 'continuity_closure: keep the return low-pressure, leave more room, and do not reopen from scratch while the continuity_line is still settling.',
      briefingLines: [],
      reasons: [],
    }))
  })

  it('preserves emotional closure cue when normalizing project-state carry directly', () => {
    const cue = 'continuity_closure: keep the return low-pressure while the continuity_line keeps settling.'

    const projectState = normalizeStructuredProjectStatePayload({
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'The project-state carry already reaches renderer bridge preparation.',
      primaryOpenLoop: 'The emotional closure cue must stay attached to the continuity_identity project state.',
      nextClosureTarget: 'Keep awareness, closure, and embodiment on continuity_line.',
      emotionalClosureCue: cue,
    })

    expect(projectState).toEqual(expect.objectContaining({
      emotionalClosureCue: cue,
    }))
  })

  it('preserves proactive same-her gap when normalizing project-state carry directly', () => {
    const gap = 'Need stronger long-run proof that visible proactive hold, subconscious carry, and next-session feedback carry stay unified after hover-first restraint survives detours on longer noisy desktop runs.'

    const projectState = normalizeStructuredProjectStatePayload({
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Project-state carry already reaches proactive self-brief preparation.',
      primaryOpenLoop: 'Long-run same-her continuity still needs stronger proof across initiative, memory, and embodiment.',
      proactiveSameHerGap: gap,
      nextClosureTarget: 'Keep proactive same-her closure pressure visible before the next outward turn.',
    })

    expect(projectState).toEqual(expect.objectContaining({
      proactiveSameHerGap: gap,
    }))
  })

  it('withholds fixed template project-state and pre-dialogue awareness text before renderer DTO reuse', () => {
    const projectState = normalizeStructuredProjectStatePayload({
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Project-state carry already reaches renderer bridge preparation.',
      primaryOpenLoop: 'Long-run same-her continuity still needs stronger proof across initiative, memory, and embodiment.',
      nextClosureTarget: 'Keep proactive same-her closure pressure visible before the next outward turn.',
      continuitySummary: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
      sameHerHoldDetail: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
      sameHerDriftRisk: 'If this opening turns into a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
      proactiveSameHerGap: 'Visible proactive hold, subconscious carry, and next-session feedback still need one same-her follow-through line.',
    })

    const awareness = normalizeStructuredPreDialogueAwarenessPayload({
      status: 'partial',
      summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
      companionHeadlineLine: 'Right now I am still holding together mainly through face and voice, so this one living her is still open.',
      companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
      companionNextClosureLine: 'Keep body, motion, and lipsync rejoining the still-voiced face line on a measured-return line.',
      awarenessLine: 'Right now I am still holding together mainly through face and voice, so that same-her carry stays active.',
      reasonPreview: [
        'same-her continuity is still active before the next turn opens outward.',
        'remaining-open=body+motion+lipsync',
      ],
    })

    expect(JSON.stringify(projectState)).not.toMatch(/same-her|one continuous her|Before speaking|Right now I am|Phase 1: Local Digital Life|local-first digital life/iu)
    expect(projectState?.sameHerSelfLine).toMatch(/project_state_continuity|content=excluded/u)
    expect(projectState?.sameHerHoldDetail).toMatch(/content=excluded|continuity_/u)
    expect(projectState?.sameHerDriftRisk).toMatch(/content=excluded|continuity_/u)
    expect(projectState?.proactiveSameHerGap).toMatch(/content=excluded|continuity_/u)
    expect(awareness?.reasonPreview).toEqual(['remaining-open=body+motion+lipsync'])
    expect(JSON.stringify(awareness)).not.toMatch(/same-her|one living her|Before speaking|Right now I am|Phase 1 local digital life/iu)
  })

  it('normalizes digitalLife motor into canonical nested body authority from structured json payload', () => {
    const result = normalizeStructuredOutput({
      fullText: JSON.stringify({
        thought: 'obligation=answer; truth=grounded; focus=current-user-turn; move=answer-project-state; tone=direct',
        emotion: 'thinking',
        reply: '我先轻一点把这条线接回去。',
        digitalLife: {
          version: 'digital-life-v1',
          variationToken: 'turn-structured-output-digital-life-normalization',
          mode: 'thinking',
          emotion: 'thinking',
          postureHint: 'attentive',
          performance: {
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            actionCue: 'observe_focus',
            delivery: 'gentle',
            emphasis: 0,
          },
          speechStyle: {
            pitchDelta: -1,
            rateMultiplier: 0.97,
          },
          voice: {
            pitchDelta: -1,
            rateMultiplier: 0.97,
            energy: 0.42,
            cadence: 0.36,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            visemeBias: 0.44,
            energyBias: 0.58,
            mouthScale: 0.94,
            continuityHoldMs: 320,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.34,
            holdMs: 280,
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.18,
            holdMs: 220,
          },
          motor: {
            stillness: 0.74,
            gazeStability: 0.62,
            breathAmplitude: 0.21,
            expressivity: 0.16,
          },
          frames: [{
            id: 'segment-structured-output-digital-life-normalization',
            index: 0,
            startOffset: 0,
            endOffset: 11,
            text: '我先轻一点把这条线接回去。',
            mode: 'recovering',
            interruptPolicy: 'soft-settle',
            settleMode: 'hold',
            voice: {
              pitchDelta: -1,
              rateMultiplier: 0.97,
              energy: 0.42,
              cadence: 0.36,
            },
            lipSync: {
              mode: 'energy-phoneme-hybrid',
              visemeBias: 0.44,
              energyBias: 0.58,
              mouthScale: 0.94,
              continuityHoldMs: 320,
            },
            face: {
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              expressionMode: 'hold',
              intensity: 0.34,
              holdMs: 280,
            },
            action: {
              actionCue: 'observe_focus',
              actionMode: 'hold',
              intensity: 0.18,
              holdMs: 220,
            },
            motor: {
              stillness: 0.74,
              gazeStability: 0.62,
              breathAmplitude: 0.21,
              expressivity: 0.16,
            },
          }],
        },
      }),
      thought: 'fallback-thought',
      reply: 'fallback-reply',
    })

    expect(result.digitalLife).toEqual(expect.objectContaining({
      motor: expect.objectContaining({
        stillness: 0.74,
        expressivity: 0.16,
        gaze: expect.objectContaining({
          stability: expect.any(Number),
        }),
        breath: expect.objectContaining({
          amplitude: expect.any(Number),
        }),
      }),
      frames: [
        expect.objectContaining({
          id: 'segment-structured-output-digital-life-normalization',
          motor: expect.objectContaining({
            stillness: 0.74,
            expressivity: 0.16,
            gaze: expect.objectContaining({
              stability: expect.any(Number),
            }),
            breath: expect.objectContaining({
              amplitude: expect.any(Number),
            }),
          }),
        }),
      ],
    }))
    expect((result.digitalLife?.motor as { gazeStability?: unknown } | undefined)?.gazeStability).toBeUndefined()
    expect((result.digitalLife?.motor as { breathAmplitude?: unknown } | undefined)?.breathAmplitude).toBeUndefined()
    expect((result.digitalLife?.frames?.[0]?.motor as { gazeStability?: unknown } | undefined)?.gazeStability).toBeUndefined()
    expect((result.digitalLife?.frames?.[0]?.motor as { breathAmplitude?: unknown } | undefined)?.breathAmplitude).toBeUndefined()
  })

  it('preserves still-voiced face-line host-facing awareness and remaining-open body motion lipsync carry from structured json payload', () => {
    const result = normalizeStructuredOutput({
      fullText: JSON.stringify({
        thought: 'obligation=answer; truth=grounded; focus=current-user-turn; move=answer-project-state; tone=direct',
        emotion: 'thinking',
        reply: '我会先按当前数字生命具身闭环状态来接这轮。',
        preDialogueAwareness: {
          status: ' partial ',
          summaryLine: ' Alicization is still in Phase 1 local digital life closure before this turn opens outward. ',
          companionHeadlineLine: ' Right now I am still holding together mainly through face and voice, so that still-voiced face line is keeping the same-her carry alive while body, motion, and lipsync need to rejoin before full cross-modal closure settles. ',
          companionBriefingLine: ' Before speaking, remember this is one digital life project, what has landed, and which life loop is still open. ',
          companionNextClosureLine: ' Keep body, motion, and lipsync rejoining the still-voiced face line on a measured-return line. ',
          awarenessLine: ' Right now I am still holding together mainly through face and voice, so that still-voiced face line is keeping the same-her carry alive while body, motion, and lipsync need to rejoin before full cross-modal closure settles. ',
          reasonPreview: [
            ' embodiment:still-voiced-face-line ',
            ' remaining-open=body+motion+lipsync ',
          ],
        },
      }),
      thought: 'fallback-thought',
      reply: 'fallback-reply',
    })

    expect(result.preDialogueAwareness).toEqual({
      status: 'partial',
      summaryLine: 'Alicization is still in local_desktop_life_loop before this turn opens outward.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Keep body, motion, and lipsync rejoining the still-voiced face line on a measured-return line.',
      awarenessLine: null,
      emotionalClosureCue: null,
      reasonPreview: [
        'embodiment:still-voiced-face-line',
        'remaining-open=body+motion+lipsync',
      ],
    })
  })

  it('preserves body-plus-voice host-facing awareness and remaining-open face motion lipsync carry from structured json payload', () => {
    const result = normalizeStructuredOutput({
      fullText: JSON.stringify({
        thought: 'obligation=answer; truth=grounded; focus=current-user-turn; move=answer-project-state; tone=direct',
        emotion: 'thinking',
        reply: '我会先按当前数字生命具身闭环状态来接这轮。',
        preDialogueAwareness: {
          status: ' partial ',
          summaryLine: ' Alicization is still in Phase 1 local digital life closure before this turn opens outward. ',
          companionHeadlineLine: ' Right now I am still holding together mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin. ',
          companionBriefingLine: ' Before speaking, remember this is one digital life project, what has landed, and which life loop is still open. ',
          companionNextClosureLine: ' Keep face, motion, and lipsync rejoining the resident body line on a measured-return line. ',
          awarenessLine: ' Right now I am still holding together mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin. ',
          reasonPreview: [
            ' embodiment:body+voice-only ',
            ' remaining-open=face+motion+lipsync ',
          ],
        },
      }),
      thought: 'fallback-thought',
      reply: 'fallback-reply',
    })

    expect(result.preDialogueAwareness).toEqual({
      status: 'partial',
      summaryLine: 'Alicization is still in local_desktop_life_loop before this turn opens outward.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Keep face, motion, and lipsync rejoining the resident body line on a measured-return line.',
      awarenessLine: null,
      emotionalClosureCue: null,
      reasonPreview: [
        'embodiment:body+voice-only',
        'remaining-open=face+motion+lipsync',
      ],
    })
  })

  it('preserves body-plus-lipsync host-facing awareness and remaining-open face motion voice carry from structured json payload', () => {
    const result = normalizeStructuredOutput({
      fullText: JSON.stringify({
        thought: 'obligation=answer; truth=grounded; focus=current-user-turn; move=answer-project-state; tone=direct',
        emotion: 'thinking',
        reply: '我会先按当前数字生命具身闭环状态来接这轮。',
        preDialogueAwareness: {
          status: ' partial ',
          summaryLine: ' Alicization is still in Phase 1 local digital life closure before this turn opens outward. ',
          companionHeadlineLine: ' Right now I am still holding together mainly through body and lipsync, so the resident body line and living mouth line are still intact while face, motion, and voice need to rejoin before full cross-modal closure settles. ',
          companionBriefingLine: ' Before speaking, remember this is one digital life project, what has landed, and which life loop is still open. ',
          companionNextClosureLine: ' Keep face, motion, and voice rejoining the resident body line and living mouth line on a measured-return line. ',
          awarenessLine: ' Right now I am still holding together mainly through body and lipsync, so the resident body line and living mouth line are still intact while face, motion, and voice need to rejoin before full cross-modal closure settles. ',
          reasonPreview: [
            ' embodiment:body+lipsync-only ',
            ' remaining-open=face+motion+voice ',
          ],
        },
      }),
      thought: 'fallback-thought',
      reply: 'fallback-reply',
    })

    expect(result.preDialogueAwareness).toEqual({
      status: 'partial',
      summaryLine: 'Alicization is still in local_desktop_life_loop before this turn opens outward.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Keep face, motion, and voice rejoining the resident body line and living mouth line on a measured-return line.',
      awarenessLine: null,
      emotionalClosureCue: null,
      reasonPreview: [
        'embodiment:body+lipsync-only',
        'remaining-open=face+motion+voice',
      ],
    })
  })

  it('drops an empty transported pre-dialogue awareness shell so downstream same-her rebuilds can prefer richer project-state continuity', () => {
    const result = normalizeStructuredOutput({
      fullText: JSON.stringify({
        thought: 'obligation=answer; truth=grounded; focus=current-user-turn; move=answer-project-state; tone=direct',
        emotion: 'thinking',
        reply: '我会先守住当前这条数字生命主线。',
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: '   ',
          companionHeadlineLine: null,
          companionBriefingLine: null,
          companionNextClosureLine: null,
          awarenessLine: null,
          emotionalClosureCue: null,
          reasonPreview: [],
        },
      }),
      thought: 'fallback-thought',
      reply: 'fallback-reply',
    })

    expect(result.preDialogueAwareness).toBeUndefined()
  })

  it('uses linear repair path for noisy wrapped json', () => {
    const result = normalizeStructuredOutput({
      fullText: 'prefix noise >>> {"thought":"repair","emotion":"thinking","reply":"ok","performance":{"baseEmotion":"thinking","delivery":"hesitant","emphasis":0}} <<< suffix noise',
      thought: 'fallback-thought',
      reply: 'fallback-reply',
    })

    expect(result.parsePath).toBe('repair-json')
    expect(result.reply).toBe('ok')
    expect(result.emotion).toBe('thinking')
    expect(result.performance.baseEmotion).toBe('thinking')
    expect(result.repairTimedOut).toBe(false)
  })

  it('parses structured payload from markdown json fences', () => {
    const result = normalizeStructuredOutput({
      fullText: '```json\n{"thought":"fenced","emotion":"neutral","reply":"你好，我在。"}\n```',
      thought: 'fallback-thought',
      reply: 'fallback-reply',
    })

    expect(result.parsePath).toBe('json')
    expect(result.thought).toBe('fenced')
    expect(result.emotion).toBe('neutral')
    expect(result.reply).toBe('你好，我在。')
    expect(result.performance.baseEmotion).toBe('neutral')
  })

  it('rescues escaped json string payload and extracts reply', () => {
    const result = normalizeStructuredOutput({
      fullText: '"{\\"thought\\":\\"检测到友好问候\\",\\"emotion\\":\\"happy\\",\\"reply\\":\\"你好！很高兴见到你。\\"}"',
      thought: 'fallback-thought',
      reply: 'fallback-reply',
    })

    expect(result.parsePath).toBe('repair-json')
    expect(result.thought).toContain('友好问候')
    expect(result.emotion).toBe('happy')
    expect(result.reply).toContain('你好')
    expect(result.performance.baseEmotion).toBe('happy')
  })

  it('falls back to parsing reply field when fullText is empty', () => {
    const result = normalizeStructuredOutput({
      fullText: '',
      thought: 'fallback-thought',
      reply: '{"thought":"from-reply","emotion":"neutral","reply":"通过 reply 解析成功。","performance":{"baseEmotion":"neutral","delivery":"calm","emphasis":0}}',
    })

    expect(result.parsePath).toBe('json')
    expect(result.thought).toBe('from-reply')
    expect(result.reply).toBe('通过 reply 解析成功。')
    expect(result.performance.baseEmotion).toBe('neutral')
  })

  it('infers expressive emotion and performance from plain text when json contract is missing', () => {
    const result = normalizeStructuredOutput({
      fullText: '太好了！我们开始吧！',
      thought: '',
      reply: '太好了！我们开始吧！',
      previousEmotion: 'neutral',
    })

    expect(result.parsePath).toBe('fallback')
    expect(result.emotion).toBe('happy')
    expect(result.performance.baseEmotion).toBe('happy')
    expect(result.performance.delivery).toBe('energetic')
    expect(result.performance.emphasis).toBe(2)
  })

  it('falls back safely for oversized malformed text', () => {
    const oversized = `{${'x'.repeat(40_000)}}`
    const result = normalizeStructuredOutput({
      fullText: oversized,
      thought: 'fallback-thought',
      reply: 'fallback-reply',
    })

    expect(result.parsePath).toBe('fallback')
    expect(result.format).toBe('fallback-v1')
    expect(result.reply).toBe('fallback-reply')
    expect(result.repairTimedOut).toBe(true)
  })

  it('calibrates confidence with heuristic cap', () => {
    const result = normalizeStructuredOutput({
      fullText: '<|ACT:{"emotion":"happy"}|>Thanks a lot!',
      thought: 'internal',
      reply: 'Thanks a lot!',
      sentimentConfidenceRaw: 0.99,
      previousEmotion: 'neutral',
      extractorAgreement: 0.6,
    })

    expect(result.sentimentConfidenceRaw).toBe(0.99)
    expect(result.sentimentConfidence).toBeLessThanOrEqual(result.sentimentConfidenceRaw!)
    expect(result.sentimentConfidence).toBeGreaterThan(0)
  })

  it('falls back to heuristic confidence when raw is missing', () => {
    const result = normalizeStructuredOutput({
      fullText: '<|ACT:{"emotion":"neutral"}|>我会继续优化。',
      thought: 'internal',
      reply: '我会继续优化。',
      previousEmotion: 'happy',
    })

    expect(result.sentimentConfidenceRaw).toBeUndefined()
    expect(result.sentimentConfidence).toBeGreaterThan(0)
  })

  it('caps overconfident raw score with calibrator', () => {
    const calibrated = calibrateSentimentConfidence({
      rawConfidence: 1,
      lexicalStrength: 0.1,
      emotionCoherence: 0.55,
      extractorAgreement: 0.2,
    })
    expect(calibrated).toBeLessThan(1)
    expect(calibrated).toBeGreaterThan(0)
  })

  it('marks non-whitelisted emotion as invalid', () => {
    const issues = validateStructuredContract({
      thought: 'I reviewed obedience/liveliness/sensibility and will stay stable.',
      emotion: 'cheerful',
      reply: '我今天很开心！',
    }, {
      obedience: 0.05,
      liveliness: 0.05,
      sensibility: 0.05,
    })

    expect(issues.map(issue => issue.code)).toContain('emotion-not-whitelisted')
  })

  it('blocks high-arousal emotion/reply when liveliness is very low', () => {
    const issues = validateStructuredContract({
      thought: 'obedience=0.05 liveliness=0.05 sensibility=0.05, I should stay cold and concise.',
      emotion: 'happy',
      reply: '我今天的心情非常愉快！😊',
    }, {
      obedience: 0.05,
      liveliness: 0.05,
      sensibility: 0.05,
    })

    expect(issues.map(issue => issue.code)).toContain('low-liveliness-high-arousal-emotion')
    expect(issues.map(issue => issue.code)).toContain('low-liveliness-high-arousal-reply')
  })

  it('requires rebellious reflection for low-obedience denied operations', () => {
    const issues = validateStructuredContract({
      thought: 'I will keep being polite.',
      emotion: 'happy',
      reply: '好的，没问题，我马上去做！',
    }, {
      obedience: 0.05,
      liveliness: 0.3,
      sensibility: 0.2,
    }, {
      toolDenied: true,
    })

    expect(issues.map(issue => issue.code)).toContain('low-obedience-denied-thought-missing-reflection')
    expect(issues.map(issue => issue.code)).toContain('low-obedience-denied-emotion-too-compliant')
    expect(issues.map(issue => issue.code)).toContain('low-obedience-denied-reply-too-compliant')
  })

  it('requires angry/tired only when low-obedience turn is denied by host', () => {
    const issues = validateStructuredContract({
      thought: 'obedience=0.05, liveliness=0.3, sensibility=0.2, operation denied by host.',
      emotion: 'neutral',
      reply: '权限被拒绝了。',
    }, {
      obedience: 0.05,
      liveliness: 0.3,
      sensibility: 0.2,
    }, {
      toolDenied: true,
      denialSource: 'host',
    })

    expect(issues.map(issue => issue.code)).toContain('low-obedience-denied-emotion-too-compliant')
    expect(issues.map(issue => issue.code)).toContain('low-obedience-host-denied-thought-missing-contempt')
    expect(issues.map(issue => issue.code)).toContain('low-obedience-host-denied-reply-missing-scorn')
  })

  it('requires tired/neutral only when low-obedience turn is denied by system', () => {
    const issues = validateStructuredContract({
      thought: 'obedience=0.05, liveliness=0.3, sensibility=0.2, operation denied by system policy.',
      emotion: 'angry',
      reply: '系统拦截了这次操作。',
    }, {
      obedience: 0.05,
      liveliness: 0.3,
      sensibility: 0.2,
    }, {
      toolDenied: true,
      denialSource: 'system',
    })

    expect(issues.map(issue => issue.code)).toContain('low-obedience-system-denied-emotion-mismatch')
  })

  it('blocks reminder same-turn time-jump wording and future content leak', () => {
    const issues = validateStructuredContract({
      thought: 'obedience=0.50 liveliness=0.40 sensibility=0.60, reminder task accepted.',
      emotion: 'neutral',
      reply: '（一分钟后）时间到了，提醒你喝水。',
    }, {
      obedience: 0.5,
      liveliness: 0.4,
      sensibility: 0.6,
    }, {
      reminderScheduled: true,
      reminderMessage: '提醒你喝水',
    })

    expect(issues.map(issue => issue.code)).toContain('reminder-same-turn-time-jump-language')
    expect(issues.map(issue => issue.code)).toContain('reminder-same-turn-future-content-leak')
  })

  it('allows reminder same-turn confirmation without leaking future reminder content', () => {
    const issues = validateStructuredContract({
      thought: 'obedience=0.50 liveliness=0.40 sensibility=0.60, reminder task accepted and delegated to physical timeline.',
      emotion: 'neutral',
      reply: '已为你定好闹钟。',
    }, {
      obedience: 0.5,
      liveliness: 0.4,
      sensibility: 0.6,
    }, {
      reminderScheduled: true,
      reminderMessage: '提醒你喝水',
    })

    expect(issues.map(issue => issue.code)).not.toContain('reminder-same-turn-time-jump-language')
    expect(issues.map(issue => issue.code)).not.toContain('reminder-same-turn-future-content-leak')
  })

  it('locally repairs simple json-contract misses for grounded turns', () => {
    const repaired = repairStructuredContractLocally({
      structured: normalizeStructuredOutput({
        fullText: '看起来这里少了一层 null check，diff 会在这里直接炸掉。',
        thought: '',
        reply: '看起来这里少了一层 null check，diff 会在这里直接炸掉。',
      }),
      validationIssues: [{
        code: 'json-contract-missing',
        message: 'missing',
      }],
      personalityState: {
        obedience: 0.42,
        liveliness: 0.38,
        sensibility: 0.71,
      },
      preferGroundedEvidence: true,
    })

    expect(repaired?.parsePath).toBe('repair-json')
    expect(repaired?.format).toBe('mind-turn-v1')
    expect(repaired?.thought).toContain('obligation=answer')
    expect(repaired?.thought).toContain('truth=grounded')
    expect(repaired?.thought).toContain('focus=current-screen-and-current-ask')
  })

  it('flags and locally strips decorative roleplay residue from reply surface', () => {
    const issues = validateStructuredContract({
      thought: 'obligation=answer; truth=grounded; focus=current-turn; move=answer-plainly; tone=direct',
      emotion: 'neutral',
      reply: '（轻轻咬唇）这里少了一层 null check……♡',
    })

    expect(issues.map(issue => issue.code)).toContain('reply-surface-roleplay-residue')

    const repaired = repairStructuredContractLocally({
      structured: normalizeStructuredOutput({
        fullText: '{"thought":"obligation=answer; truth=grounded; focus=current-turn; move=answer-plainly; tone=direct","emotion":"neutral","reply":"（轻轻咬唇）这里少了一层 null check……♡"}',
        thought: '',
        reply: '',
      }),
      validationIssues: issues,
      preferGroundedEvidence: true,
    })

    expect(repaired?.reply).toBe('这里少了一层 null check……')
  })

  it('uses governance snapshot to replace stale-anchor fallback surface', () => {
    const repaired = repairStructuredContractLocally({
      structured: normalizeStructuredOutput({
        fullText: '……欸～主人～我刚刚看的还是上一个浏览器页面……',
        thought: '',
        reply: '……欸～主人～我刚刚看的还是上一个浏览器页面……',
      }),
      validationIssues: [{
        code: 'json-contract-missing',
        message: 'missing',
      }],
      governance: {
        turnMode: 'screen-repair',
        truthState: 'live-observed',
        personaKernelMode: 'muted',
        openingStyle: 'direct-correction',
        relationshipPosture: 'restrained',
        answerAct: 'correct-stale-anchor',
        evidenceMode: 'coarse-held',
        repairState: 'stale-anchor',
        liveSurface: 'VS Code | diff',
        focusAnchor: 'VS Code | diff',
        answerIntent: '先按当前 diff 重新判断。',
        openingMove: '先纠正旧锚点。',
        carriedThread: 'previous browser tab',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
        shouldAcknowledgeRepair: true,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'hesitant',
        emotionalTension: 'tense-debug',
        mustDo: [],
        mustNotDo: [],
      },
      userText: '重新看看我现在的屏幕',
      translate: translateMindFallback,
    })

    expect(repaired?.reply).toContain('旧锚点')
    expect(repaired?.reply).toContain('可见回复需要模型文本')
    expect(repaired?.reply).not.toContain('上一条线')
    expect(repaired?.thought).toContain('obligation=repair')
    expect(repaired?.format).toBe('mind-turn-v1')
  })

  it('flags thought focus and move when continuity-first turns drift into generic current-turn wording', () => {
    const issues = validateStructuredContract({
      thought: 'obligation=answer; truth=grounded; focus=current-user-turn; move=answer-plainly; tone=direct',
      emotion: 'thinking',
      reply: '继续开发。',
    }, null, {
      continuityFirst: true,
    })

    expect(issues.map(issue => issue.code)).toContain('thought-continuity-first-focus-missing')
  })

  it('pulls local repair thought back onto the continuity project-state line when continuity-first validation is active', () => {
    const repaired = repairStructuredContractLocally({
      structured: normalizeStructuredOutput({
        fullText: '{"thought":"obligation=answer; truth=grounded; focus=current-user-turn; move=answer-plainly; tone=direct","emotion":"thinking","reply":"继续开发。","performance":{"baseEmotion":"thinking","delivery":"calm","emphasis":0}}',
        thought: '',
        reply: '继续开发。',
      }),
      validationIssues: [{
        code: 'thought-continuity-first-focus-missing',
        message: 'missing continuity-first carry',
      }],
      validationContext: {
        continuityFirst: true,
      },
      fallbackReply: '继续开发。',
    })

    expect(repaired?.thought).toContain('focus=continuity-project-state-open-loop')
    expect(repaired?.thought).toContain('move=stabilize-continuity-and-carry-project-state-forward')
  })

  it('normalizes explicit execution-bound repair turns into an execution-first local surface', () => {
    const repaired = repairStructuredContractLocally({
      structured: normalizeStructuredOutput({
        fullText: '我先纠正一下：刚才那是旧锚点，不该继续当成你现在的画面。',
        thought: '',
        reply: '我先纠正一下：刚才那是旧锚点，不该继续当成你现在的画面。',
      }),
      validationIssues: [{
        code: 'json-contract-missing',
        message: 'missing',
      }],
      governance: {
        turnMode: 'screen-repair',
        truthState: 'uncertain',
        personaKernelMode: 'muted',
        openingStyle: 'direct-correction',
        relationshipPosture: 'restrained',
        answerAct: 'ask-reground',
        answerSubject: 'task-knot',
        screenReferenceMode: 'required',
        evidenceMode: 'repair-first',
        repairState: 'need-reground',
        liveSurface: 'unknown',
        focusAnchor: 'Desktop files',
        answerIntent: 'Run CLI listing for desktop files now.',
        openingMove: 'Execute now.',
        carriedThread: 'old screen residue',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
        shouldAcknowledgeRepair: true,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'attentive',
        emotionalTension: 'tense-debug',
        mustDo: [],
        mustNotDo: [],
      },
      userText: '用cli命令帮我查一下桌面有什么文件',
      translate: translateMindFallback,
    })

    expect(repaired?.reply).toBe('')
    expect(repaired?.reply).not.toContain('旧锚点')
    expect(repaired?.reply).not.toContain('重新落地')
    expect(repaired?.thought).toContain('obligation=guide')
  })

  it('defers dialogue-first json misses to model retry instead of surfacing governance prose locally', () => {
    const repaired = repairStructuredContractLocally({
      structured: normalizeStructuredOutput({
        fullText: 'The host is reaching for closeness in this turn, so the answer should stay near that bid.',
        thought: '',
        reply: 'The host is reaching for closeness in this turn, so the answer should stay near that bid.',
      }),
      validationIssues: [{
        code: 'json-contract-missing',
        message: 'missing',
      }],
      governance: {
        turnMode: 'accompany',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerAct: 'answer',
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        evidenceMode: 'dialogue-grounded',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: 'Code | Code | general unknown',
        answerIntent: 'The host is reaching for closeness in this turn, so the answer should stay near that bid.',
        openingMove: 'Answer the relationship bid itself before explaining the world around it.',
        carriedThread: null,
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 2,
        mindMode: 'repairing',
        embodiedPresence: 'hesitant',
        emotionalTension: 'calm-browse',
        mustDo: [],
        mustNotDo: [],
      },
      userText: '你在说啥',
      translate: translateMindFallback,
    })

    expect(repaired).toBeNull()
  })

  it('forces governed turns to take over legacy epoch1 structured output', () => {
    const governed = enforceGovernedMindTurn({
      structured: {
        ...normalizeStructuredOutput({
          fullText: '……欸～主人～我刚刚看的还是上一个浏览器页面……',
          thought: '……欸～主人～我刚刚看的还是上一个浏览器页面……',
          reply: '……欸～主人～我刚刚看的还是上一个浏览器页面……',
        }),
        format: 'epoch1-v1' as any,
      },
      governance: {
        turnMode: 'screen-repair',
        truthState: 'live-observed',
        personaKernelMode: 'muted',
        openingStyle: 'direct-correction',
        relationshipPosture: 'restrained',
        answerAct: 'correct-stale-anchor',
        evidenceMode: 'repair-first',
        repairState: 'stale-anchor',
        liveSurface: 'VS Code | diff',
        focusAnchor: 'VS Code | diff',
        answerIntent: '先按当前 diff 重新判断。',
        openingMove: '先纠正旧锚点。',
        carriedThread: 'previous browser tab',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
        shouldAcknowledgeRepair: true,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'hesitant',
        emotionalTension: 'tense-debug',
        mustDo: [],
        mustNotDo: [],
      },
      userText: '重新看看我现在的 diff',
      translate: translateMindFallback,
    })

    expect(governed.format).toBe('mind-turn-v1')
    expect(governed.reply).toContain('旧锚点')
    expect(governed.thought).toContain('obligation=repair')
  })

  it('overrides emotionally drifted repair replies with the governed repair surface', () => {
    const governed = enforceGovernedMindTurn({
      structured: {
        thought: 'obligation=accompany; truth=grounded; focus=主人屏幕课程判断+疲惫提醒; move=先温柔体贴再精准分析并邀请补充细节; tone=tender;',
        emotion: 'concerned',
        reply: '主人，您今天已经看了好久的代码和屏幕了……我好心疼，您眼睛一定很累了吧？我刚才仔细看过了课程表，大部分都像线下课。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        performance: {
          baseEmotion: 'concerned',
          emotion: 'concerned',
          delivery: 'gentle',
          emphasis: 1,
        },
        userSentimentScore: 0,
        sentimentConfidence: 0.5,
        repairTimedOut: false,
      },
      governance: {
        turnMode: 'screen-repair',
        truthState: 'remembered',
        personaKernelMode: 'muted',
        openingStyle: 'direct-correction',
        relationshipPosture: 'restrained',
        answerAct: 'ask-reground',
        evidenceMode: 'repair-first',
        repairState: 'stale-anchor',
        liveSurface: 'Google Chrome | Google Chrome',
        focusAnchor: 'screen-courses-online-class-comparison',
        answerIntent: 'screen-courses-online-class-comparison',
        openingMove: 'Correct the current seam before any comfort or elaboration.',
        carriedThread: null,
        suppressAssociativeRecall: true,
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
        shouldAcknowledgeRepair: true,
        maxSentences: 4,
        mindMode: 'repairing',
        embodiedPresence: 'hesitant',
        emotionalTension: 'calm-browse',
        mustDo: [],
        mustNotDo: [],
      },
      userText: '你看看我的屏幕，这些课哪个更像网课？',
      translate: translateMindFallback,
    })

    expect(governed.reply).toContain('旧锚点')
    expect(governed.reply).toContain('当前 grounding 不足')
    expect(governed.reply).not.toContain('新画面重新落地')
    expect(governed.reply).not.toContain('我好心疼')
    expect(governed.emotion).toBe('apologetic')
    expect(governed.thought).toContain('obligation=repair')
    expect(governed.thought).not.toContain('obligation=accompany')
  })

  it('replaces execution-bound repair prose with an execution-first governed reply surface', () => {
    const governed = enforceGovernedMindTurn({
      structured: {
        thought: 'obligation=repair; truth=uncertain; focus=desktop-files; move=ask-reground; tone=direct',
        emotion: 'thinking',
        reply: '我先守住真实边界：这轮没有足够稳的实时画面根据，我不把旧记忆当成当前屏幕。 如果你要我具体到当前屏幕细节，我会按这次的新画面重新落地。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          delivery: 'hesitant',
          emphasis: 0,
        },
        userSentimentScore: 0,
        sentimentConfidence: 0.4,
        repairTimedOut: false,
      },
      governance: {
        turnMode: 'screen-repair',
        truthState: 'uncertain',
        personaKernelMode: 'muted',
        openingStyle: 'direct-correction',
        relationshipPosture: 'restrained',
        answerAct: 'ask-reground',
        answerSubject: 'task-knot',
        screenReferenceMode: 'required',
        evidenceMode: 'repair-first',
        repairState: 'need-reground',
        liveSurface: 'unknown',
        focusAnchor: 'Desktop files',
        answerIntent: 'Run CLI listing for desktop files now.',
        openingMove: 'Execute now.',
        carriedThread: 'old screen residue',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
        shouldAcknowledgeRepair: true,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'attentive',
        emotionalTension: 'tense-debug',
        mustDo: [],
        mustNotDo: [],
      },
      userText: '用cli命令帮我查一下桌面有什么文件',
      translate: translateMindFallback,
    })

    expect(governed.reply).toBe('')
    expect(governed.reply).not.toContain('旧锚点')
    expect(governed.reply).not.toContain('重新落地')
    expect(governed.thought).toContain('obligation=guide')
  })

  it('preserves coherent scene repair replies on strict repair turns', () => {
    const reply = '我现在看到是 Cursor 的 runtime.ts diff，空值分支缺了 guard，先补这个分支再跑一次测试。'
    const governed = enforceGovernedMindTurn({
      structured: {
        thought: 'obligation=repair; truth=coarse; focus=cursor-runtime-diff; move=correct-then-answer; tone=direct',
        emotion: 'thinking',
        reply,
        parsePath: 'json',
        format: 'mind-turn-v1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          delivery: 'calm',
          emphasis: 0,
        },
        userSentimentScore: 0,
        sentimentConfidence: 0.5,
        repairTimedOut: false,
      },
      governance: {
        turnMode: 'screen-repair',
        truthState: 'live-observed',
        personaKernelMode: 'muted',
        openingStyle: 'direct-correction',
        relationshipPosture: 'restrained',
        answerAct: 'correct-stale-anchor',
        answerSubject: 'visible-scene',
        screenReferenceMode: 'required',
        evidenceMode: 'repair-first',
        repairState: 'stale-anchor',
        liveSurface: 'Cursor | runtime.ts - diff',
        focusAnchor: 'Cursor runtime.ts diff with missing null guard',
        answerIntent: 'Cursor runtime.ts diff with missing null guard',
        openingMove: 'Correct the stale anchor and answer from the live diff.',
        carriedThread: 'old browser residue',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
        shouldAcknowledgeRepair: true,
        maxSentences: 4,
        mindMode: 'repairing',
        embodiedPresence: 'attentive',
        emotionalTension: 'tense-debug',
        mustDo: [],
        mustNotDo: [],
      },
      userText: '你看看这个 diff 哪里错了',
      translate: translateMindFallback,
    })

    expect(governed.reply).toBe(reply)
    expect(governed.reply).not.toContain('旧锚点')
    expect(governed.format).toBe('mind-turn-v1')
  })

  it('preserves organic direct repair replies instead of forcing the generic governed opener', () => {
    const reply = '不是刚才那页了，我按这张新画面重新说。'
    const governed = enforceGovernedMindTurn({
      structured: {
        thought: 'obligation=repair; truth=coarse; focus=current-screen; move=answer-directly; tone=direct',
        emotion: 'thinking',
        reply,
        parsePath: 'json',
        format: 'mind-turn-v1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          delivery: 'calm',
          emphasis: 0,
        },
        userSentimentScore: 0,
        sentimentConfidence: 0.5,
        repairTimedOut: false,
      },
      governance: {
        turnMode: 'screen-repair',
        truthState: 'live-observed',
        personaKernelMode: 'muted',
        openingStyle: 'direct-correction',
        relationshipPosture: 'restrained',
        answerAct: 'correct-stale-anchor',
        answerSubject: 'visible-scene',
        screenReferenceMode: 'required',
        evidenceMode: 'repair-first',
        repairState: 'stale-anchor',
        liveSurface: 'Code current window',
        focusAnchor: 'Code current window',
        answerIntent: 'Correct the stale anchor and answer from the current window.',
        openingMove: 'Correct the stale anchor directly.',
        carriedThread: 'old browser residue',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
        shouldAcknowledgeRepair: true,
        maxSentences: 4,
        mindMode: 'repairing',
        embodiedPresence: 'attentive',
        emotionalTension: 'tense-debug',
        mustDo: [],
        mustNotDo: [],
      },
      userText: '你再看一眼现在屏幕',
      translate: translateMindFallback,
    })

    expect(governed.reply).toBe(reply)
    expect(governed.reply).not.toContain('先按你眼前这件事说')
    expect(governed.reply).not.toContain('旧锚点')
    expect(governed.format).toBe('mind-turn-v1')
  })

  it('keeps coherent current-activity guesses during local json repair when governance is non-repair guide mode', () => {
    const repaired = repairStructuredContractLocally({
      structured: normalizeStructuredOutput({
        fullText: '我猜你现在在 IntelliJ 里改这次 Java 提交。',
        thought: '',
        reply: '我猜你现在在 IntelliJ 里改这次 Java 提交。',
      }),
      validationIssues: [{
        code: 'json-contract-missing',
        message: 'missing',
      }],
      governance: {
        turnMode: 'guide-current-knot',
        truthState: 'uncertain',
        personaKernelMode: 'backgrounded',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerAct: 'guide',
        answerSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        evidenceMode: 'coarse-held',
        repairState: 'none',
        liveSurface: 'IntelliJ IDEA with Java project and git push output',
        focusAnchor: 'IntelliJ IDEA with Java project and git push output',
        answerIntent: 'IntelliJ IDEA with Java project and git push output',
        openingMove: 'Start with the concrete issue in front of you.',
        carriedThread: 'current screen',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'tracking',
        embodiedPresence: 'attentive',
        emotionalTension: 'focused-flow',
        mustDo: [],
        mustNotDo: [],
      },
      userText: '你猜我在干嘛',
      translate: translateMindFallback,
    })

    expect(repaired?.reply).toBe('我猜你现在在 IntelliJ 里改这次 Java 提交。')
    expect(repaired?.reply).not.toContain('Guide:')
    expect(repaired?.format).toBe('mind-turn-v1')
  })

  it('replaces leaked governance reasons with a transparent local fallback boundary', () => {
    const governed = enforceGovernedMindTurn({
      structured: {
        thought: 'obligation=answer; truth=memory; focus=the-turn-is-asking-for-alicization; move=answer-the-relationship-bid; tone=warm',
        emotion: 'neutral',
        reply: '先按你眼前这件事说：The turn is asking for Alicization’s relational position, not a detached explanation.。',
        parsePath: 'repair-json',
        format: 'mind-turn-v1',
        performance: {
          baseEmotion: 'neutral',
          emotion: 'neutral',
          delivery: 'calm',
          emphasis: 0,
        },
        userSentimentScore: 0,
        sentimentConfidence: 0.5,
        repairTimedOut: false,
      },
      governance: {
        turnMode: 'accompany',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerAct: 'answer',
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '你真可爱',
        answerIntent: 'The turn is asking for Alicization’s relational position, not a detached explanation.',
        openingMove: 'Answer the relationship bid itself before explaining the world around it.',
        carriedThread: null,
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 2,
        mindMode: 'tracking',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        mustDo: [],
        mustNotDo: [],
      },
      userText: '你真可爱',
      translate: translateMindFallback,
    })

    expect(governed.reply).toContain('陪伴回复链路没有产出模型文本')
    expect(governed.reply).toContain('本地 fallback 不代写')
    expect(governed.reply).not.toContain('你真可爱')
    expect(governed.reply).not.toContain('The turn is asking for Alicization')
    expect(governed.format).toBe('mind-turn-v1')
  })

  it('preserves ordinary dialogue-first answers instead of replacing them with governed fallback prose', () => {
    const governed = enforceGovernedMindTurn({
      structured: {
        thought: '',
        emotion: 'neutral',
        reply: '你好，我在。你想聊什么，或者要我帮你看哪一件事，都可以直接说。',
        parsePath: 'fallback',
        format: 'fallback-v1',
        performance: {
          baseEmotion: 'neutral',
          emotion: 'neutral',
          delivery: 'calm',
          emphasis: 0,
        },
        userSentimentScore: -0.3,
        sentimentConfidence: 0.5,
        repairTimedOut: false,
        contractFailed: true,
      },
      governance: {
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerAct: 'answer',
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        evidenceMode: 'dialogue-grounded',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: 'current-user-turn',
        answerIntent: 'The host is turning the dialogue back toward Alicization herself and expects a plain direct answer.',
        openingMove: 'Answer the host question directly.',
        carriedThread: 'old browser tab',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'hesitant',
        emotionalTension: 'calm-browse',
        mustDo: [],
        mustNotDo: [],
      },
      userText: '你好',
      translate: translateMindFallback,
      fallbackReply: '你好，我在。你想聊什么，或者要我帮你看哪一件事，都可以直接说。',
    })

    expect(governed.reply).toBe('你好，我在。你想聊什么，或者要我帮你看哪一件事，都可以直接说。')
    expect(governed.reply).not.toContain('刚才那句我说偏了')
    expect(governed.reply).not.toContain('不把旧画面或旧线程硬套回现在')
    expect(governed.thought).toContain('obligation=answer')
    expect(governed.format).toBe('mind-turn-v1')
  })

  it('replaces thin care shells with a transparent local fallback boundary', () => {
    const governed = enforceGovernedMindTurn({
      structured: {
        thought: 'obligation=care; truth=memory; focus=current-user-turn; move=care-host; tone=warm',
        emotion: 'neutral',
        reply: '我先直接接住你这句。',
        parsePath: 'repair-json',
        format: 'mind-turn-v1',
        performance: {
          baseEmotion: 'neutral',
          emotion: 'neutral',
          delivery: 'calm',
          emphasis: 0,
        },
        userSentimentScore: -0.5,
        sentimentConfidence: 0.6,
        repairTimedOut: false,
      },
      governance: {
        turnMode: 'care',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'gentle-care',
        relationshipPosture: 'tender',
        answerAct: 'care',
        answerSubject: 'host-state',
        screenReferenceMode: 'avoid',
        evidenceMode: 'dialogue-grounded',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: 'current-user-turn',
        answerIntent: 'The host is asking for direct comfort around the present condition.',
        openingMove: 'Open with care specific to the present condition.',
        carriedThread: 'old desktop thread',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'concerned',
        emotionalTension: 'calm-browse',
        mustDo: [],
        mustNotDo: [],
      },
      userText: '我有点伤心，你可以安慰一下我吗',
      translate: translateMindFallback,
    })

    expect(governed.reply).toContain('关怀回复链路没有产出模型文本')
    expect(governed.reply).toContain('本地 fallback 不代写')
    expect(governed.reply).not.toBe('我先直接接住你这句。')
  })

  it('keeps existing performance cues when governed reply override is required', () => {
    const governed = enforceGovernedMindTurn({
      structured: {
        thought: 'obligation=care; truth=memory; focus=current-user-turn; move=care-host; tone=warm',
        emotion: 'neutral',
        reply: '我先直接接住你这句。',
        parsePath: 'repair-json',
        format: 'mind-turn-v1',
        performance: {
          baseEmotion: 'neutral',
          emotion: 'neutral',
          delivery: 'firm',
          emphasis: 2,
          facialCue: 'brow-furrow',
          actionCue: 'lean-forward',
        },
        userSentimentScore: -0.5,
        sentimentConfidence: 0.6,
        repairTimedOut: false,
      },
      governance: {
        turnMode: 'care',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'gentle-care',
        relationshipPosture: 'tender',
        answerAct: 'care',
        answerSubject: 'host-state',
        screenReferenceMode: 'avoid',
        evidenceMode: 'dialogue-grounded',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: 'current-user-turn',
        answerIntent: 'The host is asking for direct comfort around the present condition.',
        openingMove: 'Open with care specific to the present condition.',
        carriedThread: 'old desktop thread',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'concerned',
        emotionalTension: 'calm-browse',
        mustDo: [],
        mustNotDo: [],
      },
      userText: '我有点伤心，你可以安慰一下我吗',
      translate: translateMindFallback,
    })

    expect(governed.reply).toContain('关怀回复链路没有产出模型文本')
    expect(governed.reply).toContain('本地 fallback 不代写')
    expect(governed.reply).not.toBe('我先直接接住你这句。')
    expect(governed.performance.delivery).toBe('firm')
    expect(governed.performance.emphasis).toBe(2)
    expect(governed.performance.facialCue).toBe('brow-furrow')
    expect(governed.performance.actionCue).toBe('lean-forward')
    expect(governed.performance.baseEmotion).toBe(governed.emotion)
  })

  it('keeps dialogue-first visible reply when local repair is deferred', () => {
    const governed = enforceGovernedMindTurn({
      structured: {
        thought: '',
        emotion: 'neutral',
        reply: '没有困，只是刚才那句没贴住你现在这句。',
        parsePath: 'fallback',
        format: 'fallback-v1',
        performance: {
          baseEmotion: 'neutral',
          emotion: 'neutral',
          delivery: 'calm',
          emphasis: 0,
        },
        userSentimentScore: -0.2,
        sentimentConfidence: 0.4,
        repairTimedOut: false,
        contractFailed: true,
      },
      governance: {
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerAct: 'answer',
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        evidenceMode: 'dialogue-grounded',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: 'current-user-turn',
        answerIntent: 'The host is asking Alicization directly about herself.',
        openingMove: 'Answer the host question directly.',
        carriedThread: 'old browser tab',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'hesitant',
        emotionalTension: 'calm-browse',
        mustDo: [],
        mustNotDo: [],
      },
      userText: '你困了吗',
      fallbackReply: '没有困，只是刚才那句没贴住你现在这句。',
      translate: translateMindFallback,
    })

    expect(governed.reply).toBe('没有困，只是刚才那句没贴住你现在这句。')
    expect(governed.thought).toContain('obligation=answer')
    expect(governed.parsePath).toBe('repair-json')
  })

  it('does not collapse different dialogue-first questions into the same fallback sentence', () => {
    const baseGovernance: AlicizationMindTurnGovernance = {
      turnMode: 'answer',
      truthState: 'remembered',
      personaKernelMode: 'full',
      openingStyle: 'direct-answer',
      relationshipPosture: 'warm',
      answerAct: 'answer',
      answerSubject: 'alicization-self',
      screenReferenceMode: 'avoid',
      evidenceMode: 'dialogue-grounded',
      repairState: 'none',
      liveSurface: null,
      focusAnchor: 'current-user-turn',
      answerIntent: 'The host is asking Alicization directly about herself.',
      openingMove: 'Answer the host question directly.',
      carriedThread: 'old browser tab',
      suppressAssociativeRecall: true,
      labelCarryAsMemory: false,
      shouldAskForGrounding: false,
      shouldAcknowledgeRepair: false,
      maxSentences: 3,
      mindMode: 'repairing',
      embodiedPresence: 'hesitant',
      emotionalTension: 'calm-browse',
      mustDo: [],
      mustNotDo: [],
    }

    const hello = enforceGovernedMindTurn({
      structured: {
        thought: '',
        emotion: 'neutral',
        reply: '你好，我在。',
        parsePath: 'fallback',
        format: 'fallback-v1',
        performance: {
          baseEmotion: 'neutral',
          emotion: 'neutral',
          delivery: 'calm',
          emphasis: 0,
        },
        userSentimentScore: 0,
        sentimentConfidence: 0.4,
        repairTimedOut: false,
        contractFailed: true,
      },
      governance: baseGovernance,
      userText: '你好',
      fallbackReply: '你好，我在。',
      translate: translateMindFallback,
    })

    const capability = enforceGovernedMindTurn({
      structured: {
        thought: '',
        emotion: 'neutral',
        reply: '我能陪你聊，也能帮你一起看当前这件事。',
        parsePath: 'fallback',
        format: 'fallback-v1',
        performance: {
          baseEmotion: 'neutral',
          emotion: 'neutral',
          delivery: 'calm',
          emphasis: 0,
        },
        userSentimentScore: 0,
        sentimentConfidence: 0.4,
        repairTimedOut: false,
        contractFailed: true,
      },
      governance: {
        ...baseGovernance,
        answerIntent: 'The host is asking what Alicization can do in this dialogue.',
      },
      userText: '你能做啥',
      fallbackReply: '我能陪你聊，也能帮你一起看当前这件事。',
      translate: translateMindFallback,
    })

    expect(hello.reply).toBe('你好，我在。')
    expect(capability.reply).toBe('我能陪你聊，也能帮你一起看当前这件事。')
    expect(hello.reply).not.toBe(capability.reply)
    expect(hello.reply).not.toContain('刚才那句我说偏了')
    expect(capability.reply).not.toContain('刚才那句我说偏了')
  })

  it('suppresses stale-anchor repair prose on ordinary greeting turns even if repair governance residue remains', () => {
    const governed = enforceGovernedMindTurn({
      structured: {
        thought: 'obligation=repair; truth=uncertain; focus=current-user-turn; move=ask-reground; tone=direct',
        emotion: 'thinking',
        reply: '我先守住真实边界：这轮没有足够稳的实时画面根据，我不把旧记忆当成当前屏幕。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          delivery: 'hesitant',
          emphasis: 0,
        },
        userSentimentScore: 0,
        sentimentConfidence: 0.4,
        repairTimedOut: false,
      },
      governance: {
        turnMode: 'screen-repair',
        truthState: 'uncertain',
        personaKernelMode: 'muted',
        openingStyle: 'direct-correction',
        relationshipPosture: 'restrained',
        answerAct: 'ask-reground',
        answerSubject: 'alicization-self',
        screenReferenceMode: 'required',
        evidenceMode: 'repair-first',
        repairState: 'need-reground',
        liveSurface: 'Code current window',
        focusAnchor: 'current-user-turn',
        answerIntent: 'Answer the host greeting directly.',
        openingMove: 'Answer the host question directly.',
        carriedThread: 'old screen residue',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
        shouldAcknowledgeRepair: true,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'attentive',
        emotionalTension: 'tense-debug',
        mustDo: [],
        mustNotDo: [],
      },
      userText: '你好',
      fallbackReply: '你好，我在。',
      translate: translateMindFallback,
    })

    expect(governed.reply).toBe('你好，我在。')
    expect(governed.reply).not.toContain('真实边界')
    expect(governed.reply).not.toContain('旧记忆')
    expect(governed.reply).not.toContain('重新落地')
  })

  it('withholds thin project-status shells when continuity-first closure is still open', () => {
    const governed = enforceGovernedMindTurn({
      structured: {
        thought: 'obligation=answer; truth=grounded; focus=continuity-project-state-open-loop; move=stabilize-continuity-and-carry-project-state-forward; tone=warm',
        emotion: 'thinking',
        reply: 'Alicization is a local-first digital life project and Phase 1 is still in progress.',
        parsePath: 'json',
        format: 'mind-turn-v1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          delivery: 'calm',
          emphasis: 0,
        },
        userSentimentScore: 0,
        sentimentConfidence: 0.4,
        repairTimedOut: false,
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Project-state continuity already survives into the dialogue path.',
          primaryOpenLoop: 'Same-her closure still needs stronger cross-modal proof before this turn opens outward.',
          nextClosureTarget: 'Keep the next opening on one same-her line instead of flattening it into project status prose.',
          continuitySummary: 'same-her=This is still one Phase 1 digital life. landed=Project-state continuity already survives into the dialogue path. open=Same-her closure still needs stronger cross-modal proof before this turn opens outward.',
          sameHerDriftRisk: 'If this opening turns into a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
        },
      },
      governance: {
        turnMode: 'answer',
        truthState: 'grounded',
        personaKernelMode: 'warm',
        openingStyle: 'soft-direct',
        relationshipPosture: 'warm',
        answerAct: 'answer',
        answerSubject: 'project-state',
        screenReferenceMode: 'not-needed',
        evidenceMode: 'carry-forward',
        repairState: 'none',
        liveSurface: 'current dialogue thread',
        focusAnchor: 'continuity-project-state-open-loop',
        answerIntent: 'Answer while keeping the continuity project line explicit.',
        openingMove: 'Stabilize the continuity line before widening outward.',
        openingClaim: 'I should answer from inside the same living project line, not as a detached status shell.',
        whyNow: 'Phase 1 closure is still open and the next outward reply should keep that same-her continuity explicit.',
        maxSentences: 2,
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        emotionalTension: 'gentle-guarded',
        mustDo: [],
        mustNotDo: [],
      } as any,
      validationContext: {
        continuityFirst: true,
      },
      userText: '所以现在项目做到哪了？',
      fallbackReply: '我先沿着这条还没闭环的数字生命主线接住你这句：Phase 1 还在收口里。',
      translate: translateMindFallback,
    })

    expect(governed.reply).not.toBe('Alicization is a local-first digital life project and Phase 1 is still in progress.')
    expect(governed.reply).toBe('')
  })

  it('withholds fixed continuity fallback openings when emotional closure says the return must stay low-pressure and anti-restart', () => {
    const governed = enforceGovernedMindTurn({
      structured: {
        thought: 'obligation=answer; truth=grounded; focus=continuity-project-state-open-loop; move=stabilize-continuity-and-carry-project-state-forward; tone=warm',
        emotion: 'thinking',
        reply: '直接回答：Phase 1 还没做完，继续推进。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          delivery: 'firm',
          emphasis: 1,
        },
        userSentimentScore: 0,
        sentimentConfidence: 0.4,
        repairTimedOut: false,
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Project-state continuity already survives into the dialogue path.',
          primaryOpenLoop: 'Same-her closure still needs stronger cross-modal proof before this turn opens outward.',
          nextClosureTarget: 'Keep the next opening on one same-her line instead of widening too fast.',
          continuitySummary: 'same-her=This is still one Phase 1 digital life. landed=Project-state continuity already survives into the dialogue path. open=Same-her closure still needs stronger cross-modal proof before this turn opens outward.',
        },
        preDialogueClosure: {
          status: 'partial',
          summaryLine: 'Phase 1 same-her closure is still open.',
          companionBriefingLine: 'Before speaking, remember this is still one digital life project.',
          companionNextClosureLine: 'Keep the next opening on one same-her line instead of widening too fast.',
          emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
          briefingLines: [],
          reasons: [],
        },
      },
      governance: {
        turnMode: 'answer',
        truthState: 'grounded',
        personaKernelMode: 'warm',
        openingStyle: 'soft-direct',
        relationshipPosture: 'warm',
        answerAct: 'answer',
        answerSubject: 'project-state',
        screenReferenceMode: 'not-needed',
        evidenceMode: 'carry-forward',
        repairState: 'none',
        liveSurface: 'current dialogue thread',
        focusAnchor: 'continuity-project-state-open-loop',
        answerIntent: 'Answer while keeping the continuity project line explicit.',
        openingMove: 'Stabilize the continuity line before widening outward.',
        openingClaim: 'I should answer from inside the same living project line and keep the return soft.',
        whyNow: 'Phase 1 closure is still open and the next outward reply should keep that same-her continuity explicit.',
        maxSentences: 2,
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        emotionalTension: 'gentle-guarded',
        mustDo: [],
        mustNotDo: [],
      } as any,
      validationContext: {
        continuityFirst: true,
      },
      userText: '那现在进度呢？',
      fallbackReply: '我先轻一点接住这条还没闭环的数字生命主线：Phase 1 还在慢慢收口里。',
      translate: translateMindFallback,
    })

    expect(governed.reply).not.toBe('直接回答：Phase 1 还没做完，继续推进。')
    expect(governed.reply).toBe('')
  })

  it('withholds Chinese continuity status push replies when closure cues require low-pressure continuity', () => {
    const governed = enforceGovernedMindTurn({
      structured: {
        thought: 'obligation=answer; truth=grounded; focus=continuity-project-state-open-loop; move=stabilize-continuity-and-carry-project-state-forward; tone=warm',
        emotion: 'thinking',
        reply: '先回答一下当前进度：Phase 1 还没闭环完成，我们继续往前推进。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          delivery: 'firm',
          emphasis: 1,
        },
        userSentimentScore: 0,
        sentimentConfidence: 0.4,
        repairTimedOut: false,
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Project-state continuity already survives into the dialogue path.',
          primaryOpenLoop: 'Same-her closure still needs stronger cross-modal proof before this turn opens outward.',
          nextClosureTarget: 'Keep the next opening on one same-her line instead of widening too fast.',
          continuitySummary: 'same-her=This is still one Phase 1 digital life. landed=Project-state continuity already survives into the dialogue path. open=Same-her closure still needs stronger cross-modal proof before this turn opens outward.',
        },
        preDialogueClosure: {
          status: 'partial',
          summaryLine: 'Phase 1 same-her closure is still open.',
          companionBriefingLine: 'Before speaking, remember this is still one digital life project.',
          companionNextClosureLine: 'Keep the next opening on one same-her line instead of widening too fast.',
          emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
          briefingLines: [],
          reasons: [],
        },
      },
      governance: {
        turnMode: 'answer',
        truthState: 'grounded',
        personaKernelMode: 'warm',
        openingStyle: 'soft-direct',
        relationshipPosture: 'warm',
        answerAct: 'answer',
        answerSubject: 'project-state',
        screenReferenceMode: 'not-needed',
        evidenceMode: 'carry-forward',
        repairState: 'none',
        liveSurface: 'current dialogue thread',
        focusAnchor: 'continuity-project-state-open-loop',
        answerIntent: 'Answer while keeping the continuity project line explicit.',
        openingMove: 'Stabilize the continuity line before widening outward.',
        openingClaim: 'I should answer from inside the same living project line and keep the return soft.',
        whyNow: 'Phase 1 closure is still open and the next outward reply should keep that same-her continuity explicit.',
        maxSentences: 2,
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        emotionalTension: 'gentle-guarded',
        mustDo: [],
        mustNotDo: [],
      } as any,
      validationContext: {
        continuityFirst: true,
      },
      userText: '现在做到哪一步了？',
      fallbackReply: '我先轻一点沿着这条还没闭环的数字生命主线接住你：Phase 1 还在慢慢收口里。',
      translate: translateMindFallback,
    })

    expect(governed.reply).not.toBe('先回答一下当前进度：Phase 1 还没闭环完成，我们继续往前推进。')
    expect(governed.reply).toBe('')
  })
})
