import type { VRM } from '@pixiv/three-vrm'
import type {
  StageEmbodimentPerformanceState,
  StageEmbodimentSpeechRenderState,
} from '@proj-alicization/stage-shared'
import type { AnimationMixer, Material, Object3D, WebGLRenderer } from 'three'

import type {
  ThreeRendererMemorySnapshot,
  VrmEmbodimentSegmentDriver,
  VrmSceneSnapshotInput,
  VrmSceneSummarySnapshot,
} from './types'

import { Mesh, SkinnedMesh, Texture } from 'three'

function maybeGetJsHeapUsedBytes() {
  const performanceMemory = (globalThis.performance as {
    memory?: { usedJSHeapSize?: number }
  } | undefined)?.memory

  const heapUsed = performanceMemory?.usedJSHeapSize
  return typeof heapUsed === 'number' && Number.isFinite(heapUsed)
    ? heapUsed
    : undefined
}

export function createThreeRendererMemorySnapshot(renderer?: WebGLRenderer): ThreeRendererMemorySnapshot {
  if (!renderer) {
    return {
      calls: 0,
      geometries: 0,
      jsHeapUsedBytes: maybeGetJsHeapUsedBytes(),
      lines: 0,
      points: 0,
      textures: 0,
      triangles: 0,
    }
  }

  return {
    calls: renderer.info.render.calls,
    geometries: renderer.info.memory.geometries,
    jsHeapUsedBytes: maybeGetJsHeapUsedBytes(),
    lines: renderer.info.render.lines,
    points: renderer.info.render.points,
    programs: renderer.info.programs?.length,
    textures: renderer.info.memory.textures,
    triangles: renderer.info.render.triangles,
  }
}

function collectMaterialTextures(material: Material, textures: Set<Texture>) {
  for (const value of Object.values(material)) {
    if (value instanceof Texture)
      textures.add(value)
  }
}

export function createVrmSceneSummarySnapshot(input?: VrmSceneSnapshotInput | VRM, maybeMixer?: AnimationMixer): VrmSceneSummarySnapshot {
  const params: VrmSceneSnapshotInput = input && 'scene' in input
    ? { mixer: maybeMixer, vrm: input }
    : (input ?? {})

  const activeVrm = params.vrm
  if (!activeVrm) {
    return {
      animationActionCount: params.mixer ? ((params.mixer as AnimationMixer & { _actions?: unknown[] })._actions?.length ?? 0) : 0,
      materialCount: 0,
      meshCount: 0,
      sceneChildCount: 0,
      skinnedMeshCount: 0,
      textureRefCount: 0,
    }
  }

  let meshCount = 0
  let skinnedMeshCount = 0
  const materials = new Set<Material>()
  const textures = new Set<Texture>()

  activeVrm.scene.traverse((child: Object3D) => {
    if (child instanceof Mesh)
      meshCount += 1

    if (child instanceof SkinnedMesh)
      skinnedMeshCount += 1

    const maybeMaterial = (child as Mesh).material
    if (!maybeMaterial)
      return

    const materialList = Array.isArray(maybeMaterial) ? maybeMaterial : [maybeMaterial]
    for (const material of materialList) {
      if (!material || materials.has(material))
        continue
      materials.add(material)
      collectMaterialTextures(material, textures)
    }
  })

  return {
    animationActionCount: params.mixer ? ((params.mixer as AnimationMixer & { _actions?: unknown[] })._actions?.length ?? 0) : 0,
    materialCount: materials.size,
    meshCount,
    sceneChildCount: activeVrm.scene.children.length,
    skinnedMeshCount,
    textureRefCount: textures.size,
  }
}

function normalizeFrameSegmentId(value: string | null | undefined) {
  if (typeof value !== 'string')
    return null

  const normalized = value.trim()
  return normalized || null
}

function resolveSegmentMismatchDrivers(input: {
  bodyActive: boolean
  faceActive: boolean
  lipsyncActive: boolean
  motionActive: boolean
  performanceState?: StageEmbodimentPerformanceState | null
  performanceSegmentId: string | null
  speechSegmentId: string | null
  voiceActive: boolean
}) {
  const mismatchDrivers: VrmEmbodimentSegmentDriver[] = []
  const driverAuthority = input.performanceState?.driverAuthority

  if (driverAuthority) {
    if (input.bodyActive && driverAuthority.bodySegmentMatched === false)
      mismatchDrivers.push('body')
    if (input.faceActive && driverAuthority.faceSegmentMatched === false)
      mismatchDrivers.push('face')
    if (input.motionActive && driverAuthority.motionSegmentMatched === false)
      mismatchDrivers.push('motion')
    if (input.lipsyncActive && driverAuthority.lipsyncSegmentMatched === false)
      mismatchDrivers.push('lipsync')
    if (input.voiceActive && driverAuthority.voiceSegmentMatched === false)
      mismatchDrivers.push('voice')

    return mismatchDrivers
  }

  if (
    input.performanceSegmentId
    && input.speechSegmentId
    && input.performanceSegmentId !== input.speechSegmentId
  ) {
    if (input.lipsyncActive)
      mismatchDrivers.push('lipsync')
    if (input.voiceActive)
      mismatchDrivers.push('voice')
  }

  return mismatchDrivers
}

export function createVrmEmbodimentFrameSnapshot(input: {
  performanceState?: StageEmbodimentPerformanceState | null
  speechRenderState?: StageEmbodimentSpeechRenderState | null
}) {
  const performanceSegmentId = normalizeFrameSegmentId(
    input.performanceState?.activeSegment?.segmentId
    ?? input.performanceState?.driverAuthority?.segmentId
    ?? input.performanceState?.activeCue?.id
    ?? null,
  )
  const speechSegmentId = normalizeFrameSegmentId(input.speechRenderState?.item?.segmentId ?? null)
  const segmentId = performanceSegmentId ?? speechSegmentId
  const voiceActive = input.speechRenderState?.active === true
    || input.speechRenderState?.playbackPhase === 'playing'
  const lipsyncActive = voiceActive || (input.speechRenderState?.visemeIntensity ?? 0) > 0.015
  const faceActive = input.performanceState?.activeFacialCue != null
    || (input.performanceState?.expressionIntensity ?? 0) > 0.015
    || (input.performanceState?.facialCueIntensity ?? 0) > 0.015
  const motionActive = input.performanceState?.activeActionCue != null
    || (input.performanceState?.actionIntensity ?? 0) > 0.015
    || (input.performanceState?.motionPulse ?? 0) > 0.015
  const bodyActive = input.performanceState?.phase !== 'idle'
    && (
      input.performanceState?.activeSegment != null
      || input.performanceState?.driverAuthority?.matchedDrivers.includes('body') === true
      || motionActive
    )
  const embodimentSegmentMismatchDrivers = resolveSegmentMismatchDrivers({
    bodyActive,
    faceActive,
    lipsyncActive,
    motionActive,
    performanceState: input.performanceState,
    performanceSegmentId,
    speechSegmentId,
    voiceActive,
  })
  const hasSegmentEvidence = performanceSegmentId != null || speechSegmentId != null
  const hasActiveDriver = bodyActive || faceActive || motionActive || lipsyncActive || voiceActive
  const embodimentSegmentAligned = hasSegmentEvidence && hasActiveDriver
    ? embodimentSegmentMismatchDrivers.length === 0
    : null

  return {
    activeActionCue: input.performanceState?.activeActionCue ?? null,
    activeActionCueSource: input.performanceState?.activeActionCueSource ?? null,
    activeCuePreferredExpressionAliases: input.performanceState?.activeCue?.rendererHints?.preferredExpressionAliases
      ? [...input.performanceState.activeCue.rendererHints.preferredExpressionAliases]
      : null,
    activeCuePreferredMotionAliases: input.performanceState?.activeCue?.rendererHints?.preferredMotionAliases
      ? [...input.performanceState.activeCue.rendererHints.preferredMotionAliases]
      : null,
    activeCueVrmActionFadeMs: input.performanceState?.activeCue?.rendererSettle?.vrmActionFadeMs ?? null,
    activeCueVrmExpressionBlendMs: input.performanceState?.activeCue?.rendererSettle?.vrmExpressionBlendMs ?? null,
    activeFacialCue: input.performanceState?.activeFacialCue ?? null,
    activeFacialCueSource: input.performanceState?.activeFacialCueSource ?? null,
    actionIntensity: input.performanceState?.actionIntensity ?? null,
    bodyActive,
    embodimentSegmentAligned,
    embodimentSegmentMismatchDrivers,
    expressionIntensity: input.performanceState?.expressionIntensity ?? null,
    faceActive,
    facialCueIntensity: input.performanceState?.facialCueIntensity ?? null,
    lipsyncActive,
    motionActive,
    performancePhase: input.performanceState?.phase ?? null,
    performanceSegmentId,
    segmentId,
    speechSegmentId,
    speechPhase: input.speechRenderState?.phase ?? null,
    visemeIntensity: input.speechRenderState?.visemeIntensity ?? null,
    voiceActive,
  }
}
