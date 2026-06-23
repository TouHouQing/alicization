<script setup lang="ts">
import type { StageEmbodimentDiagnosticsSnapshot } from './use-stage-embodiment-diagnostics'

import { computed } from 'vue'

import {
  buildStageEmbodimentDiagnosticsAlertFocusSummary,
  buildStageEmbodimentDiagnosticsAlertReasonSummary,
  resolveStageEmbodimentDiagnosticsAlertBanner,
  resolveStageEmbodimentDiagnosticsAlertToneClasses,
} from './stage-embodiment-diagnostics-alerts'
import {
  buildStageEmbodimentCompanionshipReasonSurfaceSummary,
  buildStageEmbodimentContinuitySignatureSurfaceSummary,
  buildStageEmbodimentContinuitySourceSurfaceSummary,
  buildStageEmbodimentDriverSurfaceSummary,
  buildStageEmbodimentLipSyncExecutionSurfaceSummary,
  buildStageEmbodimentLoopSurfaceSummary,
  buildStageEmbodimentMotionExecutionSurfaceSummary,
  buildStageEmbodimentRendererAlignmentSurfaceSummary,
  buildStageEmbodimentRendererLaneFocusSurfaceSummary,
} from './stage-embodiment-diagnostics-overlay-summary'

const props = defineProps<{
  diagnostics: StageEmbodimentDiagnosticsSnapshot
}>()

const alertBanner = computed(() => resolveStageEmbodimentDiagnosticsAlertBanner(props.diagnostics.speech.alerts))
const alertReasonSummary = computed(() => {
  if (!alertBanner.value)
    return null

  return buildStageEmbodimentDiagnosticsAlertReasonSummary(
    alertBanner.value.primary,
    props.diagnostics.speech.rendererAlignment,
    props.diagnostics.speech.authoritySummary?.authorityMismatchDisplay ?? null,
  )
})
const alertFocusSummary = computed(() => {
  if (!alertBanner.value)
    return null

  return buildStageEmbodimentDiagnosticsAlertFocusSummary(
    alertBanner.value.primary,
    props.diagnostics.speech.rendererAlignment,
    props.diagnostics.speech.authoritySummary?.authorityMismatchDisplay ?? null,
  )
})
const alertBannerClasses = computed(() => {
  if (!alertBanner.value)
    return []

  return [
    'rounded-2 border px-2 py-2 sm:col-span-2',
    ...resolveStageEmbodimentDiagnosticsAlertToneClasses(alertBanner.value.tone),
  ]
})
const speechLipsyncEvidenceSummary = computed(() => {
  const visemeIntensity = props.diagnostics.speech.visemeIntensity
  const articulationClosure = props.diagnostics.speech.articulation?.lipClosure ?? null
  const parts = [
    Number.isFinite(visemeIntensity) ? `visemeIntensity=${formatUnit(visemeIntensity)}` : null,
    Number.isFinite(articulationClosure) ? `closure=${formatUnit(Number(articulationClosure))}` : null,
  ].filter((value): value is string => Boolean(value))

  return parts.length > 0 ? parts.join(' | ') : null
})
const speechIntentSummary = computed(() => {
  const parts = [
    props.diagnostics.speech.convergence?.summary
      ? `convergence=${props.diagnostics.speech.convergence.summary}`
      : null,
    props.diagnostics.speech.authoritySummary?.bindingSummary
      ? `authority=${props.diagnostics.speech.authoritySummary.bindingSummary}`
      : null,
    props.diagnostics.speech.cueMicroSummary?.cue
      ? `cue=${props.diagnostics.speech.cueMicroSummary.cue}`
      : null,
    props.diagnostics.speech.cueMicroSummary?.timing
      ? `timing=${props.diagnostics.speech.cueMicroSummary.timing}`
      : null,
  ].filter((value): value is string => Boolean(value))

  return parts.length > 0 ? parts.join(' | ') : null
})
const speechEmbodimentDriverSummary = computed(() => {
  return buildStageEmbodimentDriverSurfaceSummary(
    props.diagnostics.speech.driverSummary,
  )
})
const speechEmbodimentLoopSummary = computed(() => {
  return buildStageEmbodimentLoopSurfaceSummary(
    props.diagnostics.speech.driverSummary,
  )
})
const live2dSurfaceSummary = computed(() => {
  return buildStageEmbodimentRendererAlignmentSurfaceSummary(
    props.diagnostics.speech.rendererAlignment.live2d,
  )
})
const live2dLaneFocusSummary = computed(() => {
  return buildStageEmbodimentRendererLaneFocusSurfaceSummary(
    props.diagnostics.speech.rendererAlignment.live2d,
  )
})
const live2dMouthSurfaceSummary = computed(() => buildStageEmbodimentLipSyncExecutionSurfaceSummary(
  props.diagnostics.speech.live2dExecution?.activeLipSync ?? null,
))
const live2dMotionSurfaceSummary = computed(() => buildStageEmbodimentMotionExecutionSurfaceSummary(
  props.diagnostics.speech.live2dExecution?.activeMotion
    ? {
        ...props.diagnostics.speech.live2dExecution.activeMotion,
        cue: props.diagnostics.speech.live2dExecution.activeMotion.group ?? null,
        residentMode: props.diagnostics.speech.live2dExecution.cue?.residentMode ?? null,
        preferredBlinkCadence: props.diagnostics.speech.live2dExecution.cue?.preferredBlinkCadence ?? null,
        preferredGazeMode: props.diagnostics.speech.live2dExecution.cue?.preferredGazeMode ?? null,
      }
    : null,
))
const vrmSurfaceSummary = computed(() => {
  return buildStageEmbodimentRendererAlignmentSurfaceSummary(
    props.diagnostics.speech.rendererAlignment.vrm,
  )
})
const vrmLaneFocusSummary = computed(() => {
  return buildStageEmbodimentRendererLaneFocusSurfaceSummary(
    props.diagnostics.speech.rendererAlignment.vrm,
  )
})
const vrmMouthSurfaceSummary = computed(() => buildStageEmbodimentLipSyncExecutionSurfaceSummary(
  props.diagnostics.speech.vrmExecution?.activeLipSync ?? null,
))
const vrmMotionSurfaceSummary = computed(() => buildStageEmbodimentMotionExecutionSurfaceSummary(
  props.diagnostics.speech.vrmExecution?.activeMotion
    ? {
        ...props.diagnostics.speech.vrmExecution.activeMotion,
        residentMode: props.diagnostics.speech.vrmExecution.cue?.residentMode ?? null,
        preferredBlinkCadence: props.diagnostics.speech.vrmExecution.cue?.preferredBlinkCadence ?? null,
        preferredGazeMode: props.diagnostics.speech.vrmExecution.cue?.preferredGazeMode ?? null,
      }
    : null,
))
const companionshipReasonSurfaceSummary = computed(() => buildStageEmbodimentCompanionshipReasonSurfaceSummary(
  props.diagnostics.performance.runtimeDynamics.companionshipTransition.reasonSummary,
))
const companionshipContinuitySourceSurfaceSummary = computed(() => buildStageEmbodimentContinuitySourceSurfaceSummary({
  reasonTags: props.diagnostics.performance.runtimeDynamics.companionshipTransition.reasonTags,
  signature: props.diagnostics.performance.runtimeDynamics.companionshipTransition.signature,
}))
const companionshipContinuitySignatureSurfaceSummary = computed(() => buildStageEmbodimentContinuitySignatureSurfaceSummary(
  props.diagnostics.performance.runtimeDynamics.companionshipTransition.signature,
))

function formatUnit(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : '0.00'
}

function formatPoint(value: { x: number, y: number }) {
  return `${Math.round(value.x)}, ${Math.round(value.y)}`
}
</script>

<template>
  <div
    :class="[
      'pointer-events-none absolute right-3 top-3 z-40 max-w-[22rem]',
      'rounded-2xl border border-white/15 bg-black/68 px-3 py-3 text-white shadow-2xl backdrop-blur-md',
      'font-mono text-[11px] leading-4',
    ]"
  >
    <div :class="['mb-2 flex items-center justify-between gap-3']">
      <div :class="['text-[10px] uppercase tracking-[0.18em] text-white/55']">
        Embodiment
      </div>
      <div :class="['text-white/72']">
        {{ diagnostics.visualPresence.watchMode ?? 'none' }}
      </div>
    </div>

    <div :class="['grid gap-2 sm:grid-cols-2']">
      <div :class="['rounded-2 border border-white/10 bg-white/6 px-2 py-2']">
        <div :class="['mb-1 text-white/45']">
          Presence
        </div>
        <div>{{ diagnostics.attention.resolvedPresence?.embodiedPresence ?? 'none' }}</div>
        <div :class="['text-white/62']">
          source: {{ diagnostics.attention.resolvedPresence?.source ?? 'none' }}
        </div>
        <div :class="['text-white/62']">
          thought: {{ diagnostics.visualPresence.thoughtStance ?? 'none' }}
        </div>
        <div :class="['text-white/62']">
          body: {{ diagnostics.visualPresence.currentBodyState ?? 'none' }} / {{ diagnostics.visualPresence.continuityMode ?? 'none' }}
        </div>
      </div>

      <div :class="['rounded-2 border border-white/10 bg-white/6 px-2 py-2']">
        <div :class="['mb-1 text-white/45']">
          Posture
        </div>
        <div>{{ diagnostics.posture.mode }}</div>
        <div :class="['text-white/62']">
          pitch: {{ formatUnit(diagnostics.posture.bodyPitch) }}
        </div>
        <div :class="['text-white/62']">
          yaw: {{ formatUnit(diagnostics.posture.bodyYaw) }}
        </div>
      </div>

      <div :class="['rounded-2 border border-white/10 bg-white/6 px-2 py-2']">
        <div :class="['mb-1 text-white/45']">
          Gaze
        </div>
        <div>{{ formatPoint(diagnostics.attention.targetPoint) }}</div>
        <div :class="['text-white/62']">
          bias: {{ formatUnit(diagnostics.attention.runtimeBias.x) }}, {{ formatUnit(diagnostics.attention.runtimeBias.y) }}
        </div>
        <div :class="['text-white/62']">
          engaged: {{ diagnostics.attention.engaged ? 'yes' : 'no' }}
        </div>
      </div>

      <div :class="['rounded-2 border border-white/10 bg-white/6 px-2 py-2']">
        <div :class="['mb-1 text-white/45']">
          Capture
        </div>
        <div>{{ diagnostics.visualPresence.capturePermission ?? 'unknown' }}</div>
        <div :class="['text-white/62']">
          source: {{ diagnostics.visualPresence.captureSourceName ?? 'none' }}
        </div>
        <div :class="['text-white/62']">
          degrade: {{ diagnostics.visualPresence.degradedReason ?? 'none' }}
        </div>
      </div>

      <div :class="['rounded-2 border border-white/10 bg-white/6 px-2 py-2']">
        <div :class="['mb-1 text-white/45']">
          Alicization
        </div>
        <div>{{ diagnostics.visualPresence.runtimeDominantChannel ?? 'none' }}</div>
        <div :class="['text-white/62']">
          speak/act: {{ diagnostics.visualPresence.runtimeShouldSpeak ?? 'none' }} / {{ diagnostics.visualPresence.runtimeShouldAct ?? 'none' }}
        </div>
        <div :class="['text-white/62']">
          pressure: {{ diagnostics.visualPresence.runtimeContinuityPressure != null ? formatUnit(diagnostics.visualPresence.runtimeContinuityPressure) : 'none' }} / {{ diagnostics.visualPresence.runtimeCompanionshipPressure != null ? formatUnit(diagnostics.visualPresence.runtimeCompanionshipPressure) : 'none' }}
        </div>
        <div :class="['break-all text-white/62']">
          memory: {{ diagnostics.visualPresence.runtimeMemoryClosureIdentityKey ?? 'none' }}
        </div>
      </div>

      <div :class="['rounded-2 border border-white/10 bg-white/6 px-2 py-2 sm:col-span-2']">
        <div :class="['mb-1 text-white/45']">
          Mind
        </div>
        <div>
          {{ diagnostics.performance.runtimeDynamics.profile }}
        </div>
        <div :class="['text-white/62']">
          cue: {{ diagnostics.performance.runtimeDynamics.residentFacialCue ?? 'none' }} / {{ diagnostics.performance.runtimeDynamics.residentActionCue ?? 'none' }}
        </div>
        <div :class="['text-white/62']">
          l2d bias: {{ diagnostics.performance.runtimeDynamics.residentLive2DExpressionBias.join(', ') || 'none' }}
        </div>
        <div :class="['text-white/62']">
          vrm bias: {{ diagnostics.performance.runtimeDynamics.residentVrmExpressionBias.join(', ') || 'none' }}
        </div>
        <div :class="['text-white/62']">
          l2d final: {{ diagnostics.performance.runtimeDynamics.residentLive2DResolvedExpression?.name ?? 'none' }} / {{ diagnostics.performance.runtimeDynamics.residentLive2DResolvedExpression?.reason ?? 'none' }}
        </div>
        <div :class="['text-white/62']">
          vrm final: {{ diagnostics.performance.runtimeDynamics.residentVrmResolvedExpression?.name ?? 'none' }} / {{ diagnostics.performance.runtimeDynamics.residentVrmResolvedExpression?.reason ?? 'none' }}
        </div>
        <div :class="['text-white/62']">
          drive: a {{ formatUnit(diagnostics.performance.runtimeDynamics.actionIntensity) }} | b {{ formatUnit(diagnostics.performance.runtimeDynamics.breathDrive) }} | f {{ formatUnit(diagnostics.performance.runtimeDynamics.focusDrive) }}
        </div>
        <div :class="['text-white/62']">
          inward: {{ diagnostics.visualPresence.currentInwardPreoccupation ?? 'none' }}
        </div>
      </div>
      <div :class="['rounded-2 border border-white/10 bg-white/6 px-2 py-2 sm:col-span-2']">
        <div :class="['mb-1 text-white/45']">
          Companionship
        </div>
        <div>
          {{ diagnostics.performance.runtimeDynamics.companionshipTransition.residentMode ?? 'none' }}
        </div>
        <div :class="['text-white/62']">
          face bias: {{ diagnostics.performance.runtimeDynamics.companionshipTransition.expressionAliases.join(', ') || 'none' }}
        </div>
        <div :class="['text-white/62']">
          motion bias: {{ diagnostics.performance.runtimeDynamics.companionshipTransition.motionAliases.join(', ') || 'none' }}
        </div>
        <div :class="['text-white/62']">
          reason: {{ companionshipReasonSurfaceSummary ?? 'none' }}
        </div>
        <div :class="['text-white/62']">
          continuity: {{ companionshipContinuitySourceSurfaceSummary ?? 'none' }}
        </div>
        <div :class="['text-white/62']">
          signature: {{ companionshipContinuitySignatureSurfaceSummary ?? 'none' }}
        </div>
        <div :class="['text-white/62']">
          settle: {{ diagnostics.performance.runtimeDynamics.companionshipTransition.settleSummary ?? diagnostics.speech.authoritySummary?.settleSummary ?? 'none' }}
        </div>
      </div>
      <div :class="['rounded-2 border border-white/10 bg-white/6 px-2 py-2 sm:col-span-2']">
        <div :class="['mb-1 text-white/45']">
          Renderer
        </div>
        <div :class="['text-white/62']">
          l2d: {{ live2dSurfaceSummary ?? 'none' }}
        </div>
        <div :class="['text-white/48']">
          l2d focus: {{ live2dLaneFocusSummary ?? 'none' }}
        </div>
        <div :class="['text-white/62']">
          l2d mouth: {{ live2dMouthSurfaceSummary ?? 'none' }}
        </div>
        <div :class="['text-white/62']">
          l2d motion: {{ live2dMotionSurfaceSummary ?? 'none' }}
        </div>
        <div :class="['mt-1 text-white/62']">
          vrm: {{ vrmSurfaceSummary ?? 'none' }}
        </div>
        <div :class="['text-white/48']">
          vrm focus: {{ vrmLaneFocusSummary ?? 'none' }}
        </div>
        <div :class="['text-white/62']">
          vrm mouth: {{ vrmMouthSurfaceSummary ?? 'none' }}
        </div>
        <div :class="['text-white/62']">
          vrm motion: {{ vrmMotionSurfaceSummary ?? 'none' }}
        </div>
      </div>

      <div
        v-if="alertBanner"
        :class="alertBannerClasses"
      >
        <div :class="['flex items-start justify-between gap-3']">
          <div>
            <div :class="['text-[10px] uppercase tracking-[0.16em] opacity-75']">
              Alert / {{ alertBanner.primary.severity }}
            </div>
            <div :class="['mt-1 font-semibold']">
              {{ alertBanner.title }}
            </div>
            <div :class="['mt-1 text-[10px] opacity-82']">
              {{ alertBanner.primary.message }}
            </div>
            <div
              v-if="alertFocusSummary"
              :class="['mt-1 text-[10px] font-semibold opacity-88']"
            >
              focus: {{ alertFocusSummary }}
            </div>
            <div
              v-if="alertReasonSummary"
              :class="['mt-1 text-[10px] opacity-68']"
            >
              {{ alertReasonSummary }}
            </div>
          </div>
          <div
            v-if="alertBanner.additionalCount > 0"
            :class="['shrink-0 rounded-full border border-current/18 px-2 py-0.5 text-[10px] opacity-82']"
          >
            +{{ alertBanner.additionalCount }}
          </div>
        </div>
      </div>

      <div :class="['rounded-2 border border-white/10 bg-white/6 px-2 py-2 sm:col-span-2']">
        <div :class="['mb-1 text-white/45']">
          Speech
        </div>
        <div :class="['text-white/62']">
          {{ diagnostics.speech.phase }} | e {{ formatUnit(diagnostics.speech.speechEnergy) }} | p {{ formatUnit(diagnostics.speech.prosodyIntensity) }} | em {{ formatUnit(diagnostics.speech.emphasisLevel) }} | c {{ formatUnit(diagnostics.speech.cadencePulse) }}
        </div>
        <div :class="['text-white/62']">
          voice: {{ diagnostics.speech.articulationSummary?.voice ?? 'none' }}
        </div>
        <div :class="['text-white/62']">
          visemes: {{ diagnostics.speech.lipsyncExecutionSummary ?? diagnostics.speech.articulationSummary?.topVisemes ?? diagnostics.speech.visemeHintsSummary ?? 'none' }}
        </div>
        <div :class="['text-white/62']">
          mouth: {{ speechLipsyncEvidenceSummary ?? 'none' }}
        </div>
        <div :class="['text-white/62']">
          embodiment: {{ speechEmbodimentDriverSummary ?? 'none' }}
        </div>
        <div :class="['text-white/62']">
          loop: {{ speechEmbodimentLoopSummary ?? 'none' }}
        </div>
        <div :class="['text-white/62']">
          convergence: {{ diagnostics.speech.convergence?.summary ?? 'none' }}
        </div>
        <div :class="['text-white/62']">
          performance: {{ diagnostics.speech.driverExecutionSummary ?? 'none' }}
        </div>
        <div :class="['text-white/62']">
          intent: {{ speechIntentSummary ?? 'none' }}
        </div>
      </div>
    </div>

    <div
      v-if="diagnostics.speech.vrmExecution"
      :class="['mt-2 rounded-2 border border-white/10 bg-white/6 px-2 py-2 text-white/68']"
    >
      vrm runtime {{ diagnostics.speech.vrmExecution.activeEmotion?.resolvedExpressionNames.join(', ') || diagnostics.speech.vrmExecution.activeEmotion?.name || 'none' }} |
      cue {{ diagnostics.speech.vrmExecution.activeFacialCue?.name ?? 'none' }} |
      mouth {{ vrmMouthSurfaceSummary ?? 'none' }} |
      motion {{ vrmMotionSurfaceSummary ?? 'none' }}
    </div>
  </div>
</template>
