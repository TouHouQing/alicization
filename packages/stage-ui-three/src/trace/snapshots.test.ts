import type { VRM } from '@pixiv/three-vrm'
import type { WebGLRenderer } from 'three'

import {
  createIdleStageEmbodimentPerformanceState,
  createIdleStageEmbodimentSpeechRenderState,
} from '@proj-alicization/stage-shared'
import {
  Bone,
  BoxGeometry,
  Mesh,
  MeshStandardMaterial,
  Scene,
  Skeleton,
  SkinnedMesh,
  Texture,
} from 'three'
import { describe, expect, it } from 'vitest'

import {
  createThreeRendererMemorySnapshot,
  createVrmEmbodimentFrameSnapshot,
  createVrmSceneSummarySnapshot,
} from './snapshots'

describe('stage three runtime snapshots', () => {
  it('reads renderer info without requiring performance.memory', () => {
    const renderer = {
      info: {
        memory: {
          geometries: 4,
          textures: 3,
        },
        programs: [{}, {}],
        render: {
          calls: 9,
          lines: 2,
          points: 1,
          triangles: 42,
        },
      },
    } as WebGLRenderer

    const snapshot = createThreeRendererMemorySnapshot(renderer)

    expect(snapshot.calls).toBe(9)
    expect(snapshot.triangles).toBe(42)
    expect(snapshot.points).toBe(1)
    expect(snapshot.lines).toBe(2)
    expect(snapshot.textures).toBe(3)
    expect(snapshot.geometries).toBe(4)
    expect(snapshot.programs).toBe(2)
  })

  it('returns zeroed scene summary when vrm is unavailable', () => {
    expect(createVrmSceneSummarySnapshot()).toEqual({
      animationActionCount: 0,
      materialCount: 0,
      meshCount: 0,
      sceneChildCount: 0,
      skinnedMeshCount: 0,
      textureRefCount: 0,
    })
  })

  it('summarizes mesh, material, texture, and action counts from a vrm scene', () => {
    const scene = new Scene()
    const sharedTexture = new Texture()
    const material = new MeshStandardMaterial({ map: sharedTexture })
    const mesh = new Mesh(new BoxGeometry(1, 1, 1), material)

    const skinnedMaterial = new MeshStandardMaterial({ map: sharedTexture })
    const skinnedMesh = new SkinnedMesh(new BoxGeometry(1, 1, 1), skinnedMaterial)
    const rootBone = new Bone()
    const childBone = new Bone()
    rootBone.add(childBone)
    skinnedMesh.add(rootBone)
    skinnedMesh.bind(new Skeleton([rootBone, childBone]))

    scene.add(mesh)
    scene.add(skinnedMesh)

    const summary = createVrmSceneSummarySnapshot({
      mixer: { _actions: [1, 2, 3] } as any,
      vrm: { scene } as unknown as VRM,
    })

    expect(summary.sceneChildCount).toBe(2)
    expect(summary.meshCount).toBe(2)
    expect(summary.skinnedMeshCount).toBe(1)
    expect(summary.materialCount).toBe(2)
    expect(summary.textureRefCount).toBe(1)
    expect(summary.animationActionCount).toBe(3)
  })

  it('captures active embodiment authority and speech state for vrm frame telemetry', () => {
    const performanceState = createIdleStageEmbodimentPerformanceState()
    performanceState.phase = 'speaking'
    performanceState.activeFacialCue = 'segment_focus'
    performanceState.activeFacialCueSource = 'segment'
    performanceState.activeActionCue = 'segment_bow'
    performanceState.activeActionCueSource = 'preview'
    performanceState.expressionIntensity = 0.9
    performanceState.facialCueIntensity = 0.8
    performanceState.actionIntensity = 0.6
    performanceState.activeCue = {
      id: 'segment-1',
      index: 0,
      startOffset: 0,
      endOffset: 4,
      text: '请继续。',
      emotion: 'thinking',
      gestureWeight: 0.4,
      facialWeight: 0.6,
      prosodyWeight: 0.5,
      beatWeight: 0.4,
      mouthWeight: 0.3,
      headWeight: 0.4,
      facialHoldMs: 320,
      actionHoldMs: 220,
      emotionHoldMs: 320,
      facialCue: 'segment_focus',
      actionCue: 'segment_bow',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      rendererSettle: {
        vrmExpressionBlendMs: 260,
        vrmActionFadeMs: 220,
        live2dFacialReleaseMs: 320,
        live2dMotionFollowThroughMs: 420,
      },
      rendererHints: {
        preferredExpressionAliases: ['CalmInspect'],
        preferredMotionAliases: ['ObserveSoft'],
      },
    }
    performanceState.activeSegment = {
      intentId: 'intent-1',
      streamId: 'stream-1',
      segmentId: 'segment-1',
      ownerId: null,
      text: '请继续。',
      special: null,
      continuityHoldMs: 0,
      playbackDurationMs: 420,
      metadata: null,
      cue: null,
      digitalLifeFrame: null,
    }
    performanceState.driverAuthority = {
      segmentId: 'segment-1',
      rendererTarget: 'vrm',
      matchedDrivers: ['body', 'face', 'motion', 'lipsync', 'voice'],
      sources: ['playback-reconciler'],
      bodySegmentMatched: true,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: true,
      prosodyAuthority: null,
    }

    const speechRenderState = {
      ...createIdleStageEmbodimentSpeechRenderState(),
      active: true,
      phase: 'playing' as const,
      playbackPhase: 'playing' as const,
      visemeIntensity: 0.72,
      item: {
        intentId: 'intent-1',
        streamId: 'stream-1',
        segmentId: 'segment-1',
        ownerId: null,
        text: '请继续。',
        special: null,
        continuityHoldMs: 0,
        playbackDurationMs: 420,
        metadata: null,
        cue: null,
        digitalLifeFrame: null,
      },
    }

    expect(createVrmEmbodimentFrameSnapshot({
      performanceState,
      speechRenderState,
    })).toEqual({
      activeActionCue: 'segment_bow',
      activeActionCueSource: 'preview',
      activeCuePreferredExpressionAliases: ['CalmInspect'],
      activeCuePreferredMotionAliases: ['ObserveSoft'],
      activeCueVrmActionFadeMs: 220,
      activeCueVrmExpressionBlendMs: 260,
      activeFacialCue: 'segment_focus',
      activeFacialCueSource: 'segment',
      actionIntensity: 0.6,
      bodyActive: true,
      embodimentSegmentAligned: true,
      embodimentSegmentMismatchDrivers: [],
      expressionIntensity: 0.9,
      faceActive: true,
      facialCueIntensity: 0.8,
      lipsyncActive: true,
      motionActive: true,
      performancePhase: 'speaking',
      performanceSegmentId: 'segment-1',
      segmentId: 'segment-1',
      speechSegmentId: 'segment-1',
      speechPhase: 'playing',
      visemeIntensity: 0.72,
      voiceActive: true,
    })
  })

  it('exposes stale speech drivers when vrm frame segment authority drifts', () => {
    const performanceState = createIdleStageEmbodimentPerformanceState()
    performanceState.phase = 'speaking'
    performanceState.activeFacialCue = 'segment_focus'
    performanceState.activeFacialCueSource = 'segment'
    performanceState.activeActionCue = 'segment_bow'
    performanceState.activeActionCueSource = 'segment'
    performanceState.expressionIntensity = 0.64
    performanceState.facialCueIntensity = 0.72
    performanceState.actionIntensity = 0.58
    performanceState.activeSegment = {
      intentId: 'intent-1',
      streamId: 'stream-1',
      segmentId: 'segment-current-line',
      ownerId: null,
      text: '我们先把这段闭环。',
      special: null,
      continuityHoldMs: 0,
      playbackDurationMs: 520,
      metadata: null,
      cue: null,
      digitalLifeFrame: null,
    }
    performanceState.driverAuthority = {
      segmentId: 'segment-current-line',
      rendererTarget: 'vrm',
      matchedDrivers: ['body', 'face', 'motion'],
      sources: ['playback-reconciler'],
      bodySegmentMatched: true,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: false,
      voiceSegmentMatched: false,
      prosodyAuthority: null,
    }

    const speechRenderState = {
      ...createIdleStageEmbodimentSpeechRenderState(),
      active: true,
      phase: 'playing' as const,
      playbackPhase: 'playing' as const,
      visemeIntensity: 0.57,
      item: {
        intentId: 'intent-1',
        streamId: 'stream-1',
        segmentId: 'segment-stale-voice-line',
        ownerId: null,
        text: '旧的一段声音还在。',
        special: null,
        continuityHoldMs: 0,
        playbackDurationMs: 480,
        metadata: null,
        cue: null,
        digitalLifeFrame: null,
      },
    }

    expect(createVrmEmbodimentFrameSnapshot({
      performanceState,
      speechRenderState,
    })).toMatchObject({
      bodyActive: true,
      embodimentSegmentAligned: false,
      embodimentSegmentMismatchDrivers: ['lipsync', 'voice'],
      faceActive: true,
      lipsyncActive: true,
      motionActive: true,
      performanceSegmentId: 'segment-current-line',
      segmentId: 'segment-current-line',
      speechSegmentId: 'segment-stale-voice-line',
      voiceActive: true,
    })
  })
})
