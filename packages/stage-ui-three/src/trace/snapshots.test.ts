import {
  createIdleStageEmbodimentPerformanceState,
  createIdleStageEmbodimentSpeechRenderState,
} from '@proj-alicization/stage-shared'
import type { VRM } from '@pixiv/three-vrm'
import type { WebGLRenderer } from 'three'

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
      expressionIntensity: 0.9,
      facialCueIntensity: 0.8,
      performancePhase: 'speaking',
      segmentId: 'segment-1',
      speechPhase: 'playing',
      visemeIntensity: 0.72,
    })
  })
})
