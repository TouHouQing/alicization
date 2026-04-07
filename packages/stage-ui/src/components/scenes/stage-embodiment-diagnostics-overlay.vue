<script setup lang="ts">
import type { StageEmbodimentDiagnosticsSnapshot } from './use-stage-embodiment-diagnostics'

defineProps<{
  diagnostics: StageEmbodimentDiagnosticsSnapshot
}>()

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
    </div>

    <div :class="['mt-2 rounded-2 border border-white/10 bg-white/6 px-2 py-2 text-white/68']">
      speech {{ diagnostics.speech.phase }} |
      e {{ formatUnit(diagnostics.speech.speechEnergy) }} |
      p {{ formatUnit(diagnostics.speech.prosodyIntensity) }} |
      em {{ formatUnit(diagnostics.speech.emphasisLevel) }} |
      c {{ formatUnit(diagnostics.speech.cadencePulse) }}
    </div>
  </div>
</template>
