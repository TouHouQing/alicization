import { describe, expect, it } from 'vitest'

import { buildRuntimeAuthorityOverview } from './performance-visualizer-runtime-authority-overview'

describe('performance visualizer runtime authority overview', () => {
  it('surfaces top-level authority mismatch summary for the current renderer diagnostics snapshot', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        recentDrivingEvent: {
          kind: 'person-state-updated',
          decisionTraceId: 'mind:rest:1',
          summary: 'protective-watch settled after fatigue pressure rose',
          createdAt: 2468,
        },
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
        recentDrivingTraceEvents: [
          {
            kind: 'governance-normalized',
            summary: 'turn=care | truth=live-grounded | repair=none',
            createdAt: 2430,
          },
          {
            kind: 'person-state-updated',
            summary: 'protective-watch settled after fatigue pressure rose',
            createdAt: 2468,
          },
        ],
        playbackTelemetry: {
          rendererTarget: 'vrm',
          prosodyAuthority: {
            segmentId: 'segment-zh-1',
            provenance: 'authority-bound',
            source: 'prosody-authority',
            mode: 'energy-phoneme-hybrid',
            cueProsodyWeight: 0.35,
            cueMouthWeight: 0.35,
            cueHeadWeight: 0.32,
            visemePeakWeight: 0.75,
          },
          driverAuthority: {
            segmentId: 'segment-zh-1',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
        },
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-zh-1',
        authoritySegmentId: 'segment-zh-1',
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['lipsync'],
        authoritySources: ['prosody-authority'],
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
        authorityBindingSummary: 'target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes',
        authorityMatchSummary: 'face:no motion:no lipsync:yes',
        settleAuthoritySummary: 'authority-bound | segment=segment-zh-1 | target=vrm | drivers=lipsync | sources=prosody-authority',
        preferredExpressionAliases: [],
        preferredMotionAliases: [],
        live2dFacialReleaseMs: null,
        live2dMotionFollowThroughMs: null,
        vrmActionFadeMs: null,
        vrmExpressionBlendMs: null,
      },
      traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=lipsync | execution=none | scenario=late-night-fatigue | stance=observe-first | sourceTrail=fatigue, care, grounded-recall',
    })

    expect(overview).toEqual({
      rendererTarget: 'vrm',
      authoritySegmentId: 'segment-zh-1',
      authorityBindingSummary: 'target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes',
      authorityMatchSummary: 'face:no motion:no lipsync:yes',
      authorityTrustSummary: '韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
      authorityMismatchSummary: 'face-mismatch, motion-mismatch',
      authorityMismatchReasonSummary: '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是无执行；当前表面策略是 procedural-carry。',
      authorityMismatchDisplay: '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是无执行；当前表面策略是 procedural-carry。',
      prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-zh-1',
          summaryEntries: [
            { key: 'renderer-target', label: '渲染目标', value: 'vrm' },
            { key: 'authority-segment', label: '权威片段', value: 'segment-zh-1' },
            {
              key: 'authority-binding',
              label: '权威绑定',
              value: '目标 VRM，驱动 口型，来源 prosody-authority，命中 表情未命中 / 动作未命中 / 口型命中',
              technicalValue: 'target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes',
            },
            {
              key: 'authority-match',
              label: '绑定命中',
              value: '表情未命中 / 动作未命中 / 口型命中',
              technicalValue: 'face:no motion:no lipsync:yes',
            },
        { key: 'authority-trust', label: '权威可信性', value: '韵律权威链已重新绑定到当前片段，可直接进入长期基线。' },
        {
          key: 'prosody-authority',
          label: '韵律权威',
          value: '模式 energy-phoneme-hybrid，韵律 0.35，口部 0.35，头部 0.32，峰值口型 0.75，权威绑定，来源 韵律权威，片段 segment-zh-1',
          technicalValue: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-zh-1',
        },
        { key: 'authority-mismatch', label: '权威漂移', value: '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是无执行；当前表面策略是 procedural-carry。' },
            {
              key: 'settle-authority',
              label: '稳定段归因',
              value: 'authority-bound，片段 segment-zh-1，目标 VRM，驱动 口型，来源 prosody-authority',
              technicalValue: 'authority-bound | segment=segment-zh-1 | target=vrm | drivers=lipsync | sources=prosody-authority',
            },
          ],
          traceSummary: {
            cueId: 'segment-zh-1',
            decisionTraceId: 'mind:rest:1',
            turnMode: 'care',
            truthState: 'live-grounded',
            repairState: 'none',
            finalSurfacePolicy: 'procedural-carry',
            closureState: 'grounded-recall',
            activeThreadId: 'runtime-thread-rest-1',
            suppressionTags: ['late-night-fatigue'],
            latestEventSummary: 'protective-watch settled after fatigue pressure rose',
            segmentBinding: {
              matched: true,
              rendererTarget: 'vrm',
              matchedDrivers: ['lipsync'],
              matchedSources: ['prosody-authority'],
            },
          },
          traceSummaryEntries: [
            { key: 'trace-id', label: '决策轨迹', value: 'mind:rest:1' },
            { key: 'turn-mode', label: '回合模式', value: 'care' },
            { key: 'truth-state', label: '真值状态', value: 'live-grounded' },
            { key: 'repair-state', label: '修复状态', value: 'none' },
            { key: 'surface-policy', label: '表面策略', value: 'procedural-carry' },
            { key: 'closure-state', label: '收口状态', value: 'grounded-recall' },
            { key: 'thread-id', label: '运行线程', value: 'runtime-thread-rest-1' },
            { key: 'suppression-tags', label: '抑制标签', value: 'late-night-fatigue' },
            { key: 'binding-state', label: '绑定状态', value: 'matched' },
            { key: 'binding-target', label: '绑定目标', value: 'vrm' },
            { key: 'binding-drivers', label: '命中驱动', value: 'lipsync' },
            { key: 'binding-sources', label: '命中来源', value: 'prosody-authority' },
            { key: 'trace-embodiment', label: '轨迹落点', value: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达），权威驱动 口型，实际执行 无，场景 深夜疲劳照看，姿态 先观察后表达，来源链 fatigue -> care -> grounded-recall', technicalValue: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=lipsync | execution=none | scenario=late-night-fatigue | stance=observe-first | sourceTrail=fatigue, care, grounded-recall' },
            { key: 'latest-event', label: '最近事件', value: 'protective-watch settled after fatigue pressure rose' },
          ],
          settleAuthoritySummary: 'authority-bound | segment=segment-zh-1 | target=vrm | drivers=lipsync | sources=prosody-authority',
          traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=lipsync | execution=none | scenario=late-night-fatigue | stance=observe-first | sourceTrail=fatigue, care, grounded-recall',
        })
  })

  it('returns null when runtime speech telemetry has no authority signal', () => {
    expect(buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        playbackTelemetry: null,
      } as any,
      playbackCueAuthorityView: null,
    })).toBeNull()
  })

  it('prefers driver authority prosody metadata when top-level runtime prosody telemetry is absent', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        playbackTelemetry: {
          rendererTarget: 'vrm',
          prosodyAuthority: null,
          driverAuthority: {
            segmentId: 'segment-driver-runtime-native',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
            prosodyAuthority: {
              segmentId: 'segment-driver-runtime-native',
              provenance: 'authority-bound',
              source: 'prosody-authority',
              mode: 'energy-phoneme-hybrid',
              cueProsodyWeight: 0.35,
              cueMouthWeight: 0.35,
              cueHeadWeight: 0.32,
              visemePeakWeight: 0.75,
            },
          },
        },
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-driver-runtime-native',
        authoritySegmentId: 'segment-driver-runtime-native',
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['lipsync'],
        authoritySources: ['prosody-authority'],
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
        authorityBindingSummary: 'target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes',
        authorityMatchSummary: 'face:no motion:no lipsync:yes',
        settleAuthoritySummary: 'authority-bound | segment=segment-driver-runtime-native | target=vrm | drivers=lipsync | sources=prosody-authority',
        preferredExpressionAliases: [],
        preferredMotionAliases: [],
        live2dFacialReleaseMs: null,
        live2dMotionFollowThroughMs: null,
        vrmActionFadeMs: null,
        vrmExpressionBlendMs: null,
      },
    })

    expect(overview?.prosodyAuthoritySummary).toBe(
      'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-driver-runtime-native',
    )
    expect(overview?.authorityTrustSummary).toBe('韵律权威链已重新绑定到当前片段，可直接进入长期基线。')
  })

  it('prefers snapshot-native authority summaries when speech embodiment already carries them', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        authoritySummary: {
          cueId: 'segment-summary-native',
          segmentId: 'segment-summary-native',
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          matchedSources: ['prosody-authority'],
          bindingSummary: '上游 authority 绑定',
          matchSummary: '上游 authority 命中',
          authorityMismatchSummary: 'face-mismatch, motion-mismatch',
          authorityMismatchReasonSummary: '上游 authority reason：表情与动作已经偏离绑定片段。',
          authorityMismatchDisplay: '上游 authority 展示：当前仍在同一主线程里，但表情与动作落点已经和绑定片段分叉。',
          settleSummary: '上游 authority settle',
          traceEmbodimentSummary: '上游轨迹落点摘要',
        },
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:rest:1',
          activeThreadId: 'runtime-thread-rest-1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          prosodyAuthority: {
            segmentId: 'segment-summary-native',
            provenance: 'authority-bound',
            source: 'prosody-authority',
            mode: 'energy-phoneme-hybrid',
            cueProsodyWeight: 0.35,
            cueMouthWeight: 0.35,
            cueHeadWeight: 0.32,
            visemePeakWeight: 0.75,
          },
          driverAuthority: {
            segmentId: 'segment-summary-native',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
        },
      } as any,
      playbackCueAuthorityView: null,
    })

    expect(overview).toEqual({
      rendererTarget: 'vrm',
      authoritySegmentId: 'segment-summary-native',
      authorityBindingSummary: '上游 authority 绑定',
      authorityMatchSummary: '上游 authority 命中',
      authorityTrustSummary: '韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
      authorityMismatchSummary: 'face-mismatch, motion-mismatch',
      authorityMismatchReasonSummary: '上游 authority reason：表情与动作已经偏离绑定片段。',
      authorityMismatchDisplay: '上游 authority 展示：当前仍在同一主线程里，但表情与动作落点已经和绑定片段分叉。',
      prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-summary-native',
      settleAuthoritySummary: '上游 authority settle',
      traceEmbodimentSummary: '上游轨迹落点摘要',
      summaryEntries: [
        { key: 'renderer-target', label: '渲染目标', value: 'vrm' },
        { key: 'authority-segment', label: '权威片段', value: 'segment-summary-native' },
        { key: 'authority-binding', label: '权威绑定', value: '上游 authority 绑定' },
        { key: 'authority-match', label: '绑定命中', value: '上游 authority 命中' },
        { key: 'authority-trust', label: '权威可信性', value: '韵律权威链已重新绑定到当前片段，可直接进入长期基线。' },
        { key: 'prosody-authority', label: '韵律权威', value: '模式 energy-phoneme-hybrid，韵律 0.35，口部 0.35，头部 0.32，峰值口型 0.75，权威绑定，来源 韵律权威，片段 segment-summary-native', technicalValue: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-summary-native' },
        { key: 'authority-mismatch', label: '权威漂移', value: '上游 authority 展示：当前仍在同一主线程里，但表情与动作落点已经和绑定片段分叉。' },
        { key: 'settle-authority', label: '稳定段归因', value: '上游 authority settle' },
      ],
      traceSummary: {
        cueId: 'segment-summary-native',
        decisionTraceId: 'mind:rest:1',
        turnMode: 'care',
        truthState: 'live-grounded',
        repairState: 'none',
        finalSurfacePolicy: 'procedural-carry',
        closureState: 'grounded-recall',
        activeThreadId: 'runtime-thread-rest-1',
        suppressionTags: [],
        latestEventSummary: null,
        segmentBinding: {
          matched: true,
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          matchedSources: ['prosody-authority'],
        },
      },
      traceSummaryEntries: [
        { key: 'trace-id', label: '决策轨迹', value: 'mind:rest:1' },
        { key: 'turn-mode', label: '回合模式', value: 'care' },
        { key: 'truth-state', label: '真值状态', value: 'live-grounded' },
        { key: 'repair-state', label: '修复状态', value: 'none' },
        { key: 'surface-policy', label: '表面策略', value: 'procedural-carry' },
        { key: 'closure-state', label: '收口状态', value: 'grounded-recall' },
        { key: 'thread-id', label: '运行线程', value: 'runtime-thread-rest-1' },
        { key: 'binding-state', label: '绑定状态', value: 'matched' },
        { key: 'binding-target', label: '绑定目标', value: 'vrm' },
        { key: 'binding-drivers', label: '命中驱动', value: 'lipsync' },
        { key: 'binding-sources', label: '命中来源', value: 'prosody-authority' },
        { key: 'trace-embodiment', label: '轨迹落点', value: '上游轨迹落点摘要' },
      ],
    })
  })

  it('prefers snapshot-native authority trust text over locally deriving it from prosody authority', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        authoritySummary: {
          cueId: 'segment-trust-upstream',
          segmentId: 'segment-trust-upstream',
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          matchedSources: ['prosody-authority'],
          bindingSummary: '上游 authority 绑定',
          matchSummary: '上游 authority 命中',
          authorityTrustSummary: '上游 authority trust：已经回到当前片段主链。',
          authorityMismatchSummary: null,
          authorityMismatchReasonSummary: null,
          authorityMismatchDisplay: null,
          settleSummary: '上游 authority settle',
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          prosodyAuthority: {
            segmentId: 'segment-trust-upstream',
            provenance: 'authority-bound',
            source: 'prosody-authority',
            mode: 'energy-phoneme-hybrid',
            cueProsodyWeight: 0.35,
            cueMouthWeight: 0.35,
            cueHeadWeight: 0.32,
            visemePeakWeight: 0.75,
          },
          driverAuthority: {
            segmentId: 'segment-trust-upstream',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
        },
      } as any,
      playbackCueAuthorityView: null,
    })

    expect(overview?.authorityTrustSummary).toBe('上游 authority trust：已经回到当前片段主链。')
    expect(overview?.summaryEntries).toContainEqual({
      key: 'authority-trust',
      label: '权威可信性',
      value: '上游 authority trust：已经回到当前片段主链。',
    })
  })

  it('prefers snapshot-native trace embodiment summary over external fallback input', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        authoritySummary: {
          cueId: 'segment-trace-priority',
          segmentId: 'segment-trace-priority',
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          matchedSources: ['prosody-authority'],
          bindingSummary: '上游 authority 绑定',
          matchSummary: '上游 authority 命中',
          authorityMismatchSummary: null,
          authorityMismatchReasonSummary: null,
          authorityMismatchDisplay: null,
          settleSummary: '上游 authority settle',
          traceEmbodimentSummary: '上游优先轨迹摘要',
        },
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:trace:priority-1',
          activeThreadId: 'runtime-thread-priority-1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-trace-priority',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: true,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
        },
      } as any,
      traceEmbodimentSummary: '下游 fallback 轨迹摘要',
    })

    expect(overview?.traceEmbodimentSummary).toBe('上游优先轨迹摘要')
    expect(overview?.traceSummaryEntries).toContainEqual({
      key: 'trace-embodiment',
      label: '轨迹落点',
      value: '上游优先轨迹摘要',
    })
  })

  it('prefers snapshot-native trace summary over locally rebuilt trace telemetry', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        authoritySummary: {
          cueId: 'segment-trace-summary-native',
          segmentId: 'segment-trace-summary-native',
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          matchedSources: ['prosody-authority'],
          bindingSummary: '上游 authority 绑定',
          matchSummary: '上游 authority 命中',
          authorityMismatchSummary: null,
          authorityMismatchReasonSummary: null,
          authorityMismatchDisplay: null,
          settleSummary: '上游 authority settle',
          traceEmbodimentSummary: '上游轨迹落点摘要',
        },
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:trace:local-fallback',
          activeThreadId: 'runtime-thread-local-fallback',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: ['should-not-win'],
        },
        traceSummary: {
          decisionTraceId: 'mind:trace:upstream-native',
          turnMode: 'protect',
          truthState: 'memory-grounded',
          repairState: 'minor',
          finalSurfacePolicy: 'authority-first',
          closureState: 'open-loop',
          activeThreadId: 'runtime-thread-upstream-native',
          suppressionTags: ['upstream-suppression'],
          latestEventSummary: '上游 trace 最近事件',
          segmentBinding: {
            matched: true,
            rendererTarget: 'vrm',
            matchedDrivers: ['motion'],
            matchedSources: ['upstream-source'],
          },
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-trace-summary-native',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
        },
      } as any,
      playbackCueAuthorityView: null,
    })

    expect(overview?.traceSummary).toEqual({
      cueId: 'segment-trace-summary-native',
      decisionTraceId: 'mind:trace:upstream-native',
      turnMode: 'protect',
      truthState: 'memory-grounded',
      repairState: 'minor',
      finalSurfacePolicy: 'authority-first',
      closureState: 'open-loop',
      activeThreadId: 'runtime-thread-upstream-native',
      suppressionTags: ['upstream-suppression'],
      latestEventSummary: '上游 trace 最近事件',
      segmentBinding: {
        matched: true,
        rendererTarget: 'vrm',
        matchedDrivers: ['motion'],
        matchedSources: ['upstream-source'],
      },
    })
    expect(overview?.traceSummaryEntries).toContainEqual({
      key: 'trace-id',
      label: '决策轨迹',
      value: 'mind:trace:upstream-native',
    })
    expect(overview?.traceSummaryEntries).toContainEqual({
      key: 'binding-drivers',
      label: '命中驱动',
      value: 'motion',
    })
    expect(overview?.traceSummaryEntries).toContainEqual({
      key: 'binding-sources',
      label: '命中来源',
      value: 'upstream-source',
    })
  })

  it('prefers overview authority mismatch display in summary entries when a human-facing upstream display already exists', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:rest:1',
          activeThreadId: 'runtime-thread-rest-1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-display-first',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
        },
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-display-first',
        authoritySegmentId: 'segment-display-first',
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['lipsync'],
        authoritySources: ['prosody-authority'],
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
        authorityBindingSummary: 'target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes',
        authorityMatchSummary: 'face:no motion:no lipsync:yes',
        settleAuthoritySummary: 'authority-bound | segment=segment-display-first | target=vrm | drivers=lipsync | sources=prosody-authority',
        preferredExpressionAliases: [],
        preferredMotionAliases: [],
        live2dFacialReleaseMs: null,
        live2dMotionFollowThroughMs: null,
        vrmActionFadeMs: null,
        vrmExpressionBlendMs: null,
      },
    })

    expect(overview).toEqual(expect.objectContaining({
      authorityMismatchDisplay: '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是无执行；当前表面策略是 procedural-carry。',
      summaryEntries: [
        { key: 'renderer-target', label: '渲染目标', value: 'vrm' },
        { key: 'authority-segment', label: '权威片段', value: 'segment-display-first' },
        {
          key: 'authority-binding',
          label: '权威绑定',
          value: '目标 VRM，驱动 口型，来源 prosody-authority，命中 表情未命中 / 动作未命中 / 口型命中',
          technicalValue: 'target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes',
        },
        {
          key: 'authority-match',
          label: '绑定命中',
          value: '表情未命中 / 动作未命中 / 口型命中',
          technicalValue: 'face:no motion:no lipsync:yes',
        },
        { key: 'authority-mismatch', label: '权威漂移', value: '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是无执行；当前表面策略是 procedural-carry。' },
        {
          key: 'settle-authority',
          label: '稳定段归因',
          value: 'authority-bound，片段 segment-display-first，目标 VRM，驱动 口型，来源 prosody-authority',
          technicalValue: 'authority-bound | segment=segment-display-first | target=vrm | drivers=lipsync | sources=prosody-authority',
        },
      ],
    }))
  })

  it('does not reuse authority-summary trace embodiment text when playback cue already points at a different current cue', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        authoritySummary: {
          cueId: 'segment-authority-summary',
          segmentId: 'segment-authority-summary',
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          matchedSources: ['prosody-authority'],
          bindingSummary: '上游 authority 绑定',
          matchSummary: '上游 authority 命中',
          authorityMismatchSummary: null,
          authorityMismatchReasonSummary: null,
          authorityMismatchDisplay: null,
          settleSummary: '上游 authority settle',
          traceEmbodimentSummary: '上游 authority 轨迹落点摘要',
        },
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:trace:scoped-1',
          activeThreadId: 'runtime-thread-scoped-1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-authority-summary',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
        },
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-current-playback',
        authoritySegmentId: 'segment-authority-summary',
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['lipsync'],
        authoritySources: ['prosody-authority'],
        traceEmbodimentSummary: null,
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
        authorityBindingSummary: '上游 authority 绑定',
        authorityMatchSummary: '上游 authority 命中',
        settleAuthoritySummary: '上游 authority settle',
        preferredExpressionAliases: [],
        preferredMotionAliases: [],
        live2dFacialReleaseMs: null,
        live2dMotionFollowThroughMs: null,
        vrmActionFadeMs: null,
        vrmExpressionBlendMs: null,
      },
      traceEmbodimentSummary: '下游 fallback 轨迹摘要',
    })

    expect(overview?.traceEmbodimentSummary).toBe('下游 fallback 轨迹摘要')
    expect(overview?.traceSummary?.cueId).toBe('segment-current-playback')
    expect(overview?.traceSummaryEntries).toContainEqual({
      key: 'trace-embodiment',
      label: '轨迹落点',
      value: '下游 fallback 轨迹摘要',
    })
  })

  it('does not rehydrate binding, match, or settle summaries from authority summary when playback cue view already scoped them away for another cue', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        authoritySummary: {
          cueId: 'segment-authority-summary',
          segmentId: 'segment-authority-summary',
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          matchedSources: ['prosody-authority'],
          bindingSummary: '上游 authority 绑定',
          matchSummary: '上游 authority 命中',
          authorityMismatchSummary: null,
          authorityMismatchReasonSummary: null,
          authorityMismatchDisplay: null,
          settleSummary: '上游 authority settle',
          traceEmbodimentSummary: '上游 authority 轨迹落点摘要',
        },
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:trace:scoped-2',
          activeThreadId: 'runtime-thread-scoped-2',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-authority-summary',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
        },
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-current-playback',
        authoritySegmentId: 'segment-authority-summary',
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['lipsync'],
        authoritySources: ['prosody-authority'],
        traceEmbodimentSummary: null,
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
        authorityBindingSummary: null,
        authorityMatchSummary: null,
        settleAuthoritySummary: null,
        preferredExpressionAliases: [],
        preferredMotionAliases: [],
        live2dFacialReleaseMs: null,
        live2dMotionFollowThroughMs: null,
        vrmActionFadeMs: null,
        vrmExpressionBlendMs: null,
      },
    })

    expect(overview?.authorityBindingSummary).toBeNull()
    expect(overview?.authorityMatchSummary).toBeNull()
    expect(overview?.settleAuthoritySummary).toBeNull()
    expect(overview?.summaryEntries).toEqual([
      { key: 'renderer-target', label: '渲染目标', value: 'vrm' },
      { key: 'authority-segment', label: '权威片段', value: 'segment-authority-summary' },
      { key: 'authority-mismatch', label: '权威漂移', value: '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是无执行；当前表面策略是 procedural-carry。' },
    ])
  })

  it('does not rehydrate mismatch summaries from authority summary when playback cue view already scoped them away for another cue', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        authoritySummary: {
          cueId: 'segment-authority-summary',
          segmentId: 'segment-authority-summary',
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          matchedSources: ['prosody-authority'],
          bindingSummary: '上游 authority 绑定',
          matchSummary: '上游 authority 命中',
          authorityMismatchSummary: 'upstream-mismatch-summary',
          authorityMismatchReasonSummary: '上游 authority reason',
          authorityMismatchDisplay: '上游 authority display',
          settleSummary: '上游 authority settle',
          traceEmbodimentSummary: '上游 authority 轨迹落点摘要',
        },
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:trace:scoped-3',
          activeThreadId: 'runtime-thread-scoped-3',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-authority-summary',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
        },
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-current-playback',
        authoritySegmentId: 'segment-authority-summary',
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['lipsync'],
        authoritySources: ['prosody-authority'],
        traceEmbodimentSummary: null,
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
        authorityBindingSummary: null,
        authorityMatchSummary: null,
        settleAuthoritySummary: null,
        preferredExpressionAliases: [],
        preferredMotionAliases: [],
        live2dFacialReleaseMs: null,
        live2dMotionFollowThroughMs: null,
        vrmActionFadeMs: null,
        vrmExpressionBlendMs: null,
      },
    })

    expect(overview?.authorityMismatchSummary).toBe('face-mismatch, motion-mismatch')
    expect(overview?.authorityMismatchReasonSummary).toBe('表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是无执行；当前表面策略是 procedural-carry。')
    expect(overview?.authorityMismatchDisplay).toBe('表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是无执行；当前表面策略是 procedural-carry。')
  })
})
