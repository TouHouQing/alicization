<script setup lang="ts">
import type { BeatSyncStyleName } from '@proj-alicization/stage-ui-live2d'

import { createBeatSyncController } from '@proj-alicization/stage-ui-live2d'
import { Section } from '@proj-alicization/stage-ui/components'
import { Button, Callout, FieldCheckbox, FieldRange, FieldSelect } from '@proj-alicization/ui'
import { useRafFn } from '@vueuse/core'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

interface TrailPoint { x: number, y: number, t: number }
interface ScalarSample { t: number, x: number, y: number, z: number }

const baseAngleX = ref(0)
const baseAngleY = ref(0)
const baseAngleZ = ref(0)
const scale = ref(6) // px per degree
const dampingOverlay = ref(0.08)
const timeWindowMs = 4000
const style = ref<BeatSyncStyleName>('punchy-v')
const autoStyleShift = ref(false)
const { t } = useI18n()

const controller = createBeatSyncController({
  baseAngles: () => ({ x: baseAngleX.value, y: baseAngleY.value, z: baseAngleZ.value }),
  initialStyle: style.value,
  autoStyleShift: autoStyleShift.value,
})

const state = reactive({
  angleX: baseAngleX.value,
  angleY: baseAngleY.value,
  angleZ: baseAngleZ.value,
  velX: 0,
  velY: 0,
  velZ: 0,
  last: performance.now(),
})

const trail = ref<TrailPoint[]>([])
const scalars = ref<ScalarSample[]>([])
const canvasXY = ref<HTMLCanvasElement>()
const debugState = computed(() => controller.debugState())
const nowTs = ref(performance.now())
const styleOptions = computed<Array<{ label: string, value: BeatSyncStyleName }>>(() => [
  { label: t('settings.pages.system.sections.section.developer.sections.section.beat-sync.styles.punchy-v'), value: 'punchy-v' },
  { label: t('settings.pages.system.sections.section.developer.sections.section.beat-sync.styles.balanced-v'), value: 'balanced-v' },
  { label: t('settings.pages.system.sections.section.developer.sections.section.beat-sync.styles.swing-lr'), value: 'swing-lr' },
  { label: t('settings.pages.system.sections.section.developer.sections.section.beat-sync.styles.sway-sine'), value: 'sway-sine' },
])

watch(style, val => controller.setStyle(val))
watch(autoStyleShift, enabled => controller.setAutoStyleShift(enabled))

const currentPose = computed(() => ({
  x: controller.targetX.value,
  y: controller.targetY.value,
  z: controller.targetZ.value,
}))

const formatDegrees = (value: number) => `${value.toFixed(1)}°`
const formatScale = (value: number) => `${value.toFixed(1)} px/deg`
const formatFade = (value: number) => value.toFixed(2)

function springTowardTarget(now: number) {
  const dt = now - state.last
  if (!Number.isFinite(dt))
    return
  state.last = now

  controller.updateTargets(now)

  // Same semi-implicit Euler params as runtime
  const stiffness = 120
  const damping = 16
  const mass = 1

  // X
  {
    const target = controller.targetX.value
    const pos = state.angleX
    const vel = state.velX
    const accel = (stiffness * (target - pos) - damping * vel) / mass
    state.velX = vel + accel * dt
    state.angleX = pos + state.velX * dt
  }

  // Y
  {
    const target = controller.targetY.value
    const pos = state.angleY
    const vel = state.velY
    const accel = (stiffness * (target - pos) - damping * vel) / mass
    state.velY = vel + accel * dt
    state.angleY = pos + state.velY * dt
  }

  // Z
  {
    const target = controller.targetZ.value
    const pos = state.angleZ
    const vel = state.velZ
    const accel = (stiffness * (target - pos) - damping * vel) / mass
    state.velZ = vel + accel * dt
    state.angleZ = pos + state.velZ * dt
  }
}

function pushSamples(now: number) {
  if (!Number.isFinite(state.angleX) || !Number.isFinite(state.angleZ))
    return

  trail.value.push({ x: state.angleX, y: state.angleZ, t: now })
  scalars.value.push({ t: now, x: state.angleX, y: state.angleY, z: state.angleZ })
  const cutoff = now - timeWindowMs
  while (trail.value.length && trail.value[0].t < cutoff)
    trail.value.shift()
  while (scalars.value.length && scalars.value[0].t < cutoff)
    scalars.value.shift()
}

function drawXY() {
  const canvas = canvasXY.value
  if (!canvas)
    return

  const dpr = window.devicePixelRatio || 1
  const { clientWidth, clientHeight } = canvas
  if (canvas.width !== clientWidth * dpr || canvas.height !== clientHeight * dpr) {
    canvas.width = clientWidth * dpr
    canvas.height = clientHeight * dpr
  }

  const ctx = canvas.getContext('2d')
  if (!ctx)
    return

  ctx.save()
  ctx.scale(dpr, dpr)

  ctx.fillStyle = `rgba(0, 0, 0, ${dampingOverlay.value})`
  ctx.fillRect(0, 0, clientWidth, clientHeight)

  const centerX = clientWidth / 2
  const centerY = clientHeight / 2

  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, centerY)
  ctx.lineTo(clientWidth, centerY)
  ctx.moveTo(centerX, 0)
  ctx.lineTo(centerX, clientHeight)
  ctx.stroke()

  ctx.fillStyle = 'rgba(94,234,212,0.4)'
  ctx.strokeStyle = 'rgba(94,234,212,1)'
  ctx.lineWidth = 2
  ctx.beginPath()
  trail.value.forEach((p, idx) => {
    const x = centerX + p.x * scale.value
    const y = centerY - p.y * scale.value
    if (idx === 0)
      ctx.moveTo(x, y)
    else
      ctx.lineTo(x, y)
  })
  ctx.stroke()

  const head = trail.value[trail.value.length - 1]
  if (head) {
    ctx.beginPath()
    ctx.arc(centerX + head.x * scale.value, centerY - head.y * scale.value, 5, 0, Math.PI * 2)
    ctx.fill()
  }

  // Current target marker
  ctx.fillStyle = 'rgba(244,114,182,0.8)'
  ctx.beginPath()
  ctx.arc(centerX + controller.targetY.value * scale.value, centerY - controller.targetZ.value * scale.value, 4, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

useRafFn(({ timestamp }) => {
  nowTs.value = timestamp
  springTowardTarget(timestamp)
  pushSamples(timestamp)
  drawXY()
})

onMounted(() => {
  // Seed initial trail
  const now = performance.now()
  pushSamples(now)
  drawXY()
})

function hitBeat() {
  controller.scheduleBeat(performance.now())
}

function hitVSequence() {
  const now = performance.now()
  const spacing = 180
  controller.scheduleBeat(now)
  controller.scheduleBeat(now + spacing)
  controller.scheduleBeat(now + spacing * 2)
}
</script>

<template>
  <div class="grid gap-4 p-4 lg:grid-cols-[2fr_1fr]">
    <Section
      :title="t('settings.pages.system.sections.section.developer.sections.section.beat-sync.page.driver_title')"
      icon="i-solar:cursor-linear"
      inner-class="gap-4"
    >
      <div class="flex flex-wrap items-center gap-3">
        <Button :label="t('settings.pages.system.sections.section.developer.sections.section.beat-sync.actions.hit_beat')" icon="i-solar:flash-bold-duotone" size="sm" @click="hitBeat" />
        <Button
          :label="t('settings.pages.system.sections.section.developer.sections.section.beat-sync.actions.hit_sequence')"
          icon="i-solar:repeat-one-minimalistic-bold-duotone"
          size="sm"
          variant="secondary"
          @click="hitVSequence"
        />
        <FieldCheckbox
          v-model="autoStyleShift"
          class="min-w-[240px]"
          :label="t('settings.pages.system.sections.section.developer.sections.section.beat-sync.fields.auto_style.label')"
          :description="t('settings.pages.system.sections.section.developer.sections.section.beat-sync.fields.auto_style.description')"
        />
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <FieldSelect
          v-model="style"
          :label="t('settings.pages.system.sections.section.developer.sections.section.beat-sync.fields.style.label')"
          :description="t('settings.pages.system.sections.section.developer.sections.section.beat-sync.fields.style.description')"
          :options="styleOptions"
          layout="vertical"
          select-class="w-full"
        />
        <Callout :label="t('settings.pages.system.sections.section.developer.sections.section.beat-sync.callouts.current_targets.title')" theme="violet">
          <div class="text-sm text-neutral-800 dark:text-neutral-100">
            X/Y/Z: {{ currentPose.x.toFixed(2) }} / {{ currentPose.y.toFixed(2) }} / {{ currentPose.z.toFixed(2) }}
          </div>
          <div class="text-xs text-neutral-500 dark:text-neutral-400">
            {{ t('settings.pages.system.sections.section.developer.sections.section.beat-sync.callouts.current_targets.description') }}
          </div>
        </Callout>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <FieldRange
          v-model="baseAngleX"
          :label="t('settings.pages.system.sections.section.developer.sections.section.beat-sync.fields.base_x.label')"
          :description="t('settings.pages.system.sections.section.developer.sections.section.beat-sync.fields.base_x.description')"
          :min="-20"
          :max="20"
          :step="0.1"
          :format-value="formatDegrees"
        />
        <FieldRange
          v-model="baseAngleY"
          :label="t('settings.pages.system.sections.section.developer.sections.section.beat-sync.fields.base_y.label')"
          :description="t('settings.pages.system.sections.section.developer.sections.section.beat-sync.fields.base_y.description')"
          :min="-20"
          :max="20"
          :step="0.1"
          :format-value="formatDegrees"
        />
        <FieldRange
          v-model="baseAngleZ"
          :label="t('settings.pages.system.sections.section.developer.sections.section.beat-sync.fields.base_z.label')"
          :description="t('settings.pages.system.sections.section.developer.sections.section.beat-sync.fields.base_z.description')"
          :min="-20"
          :max="20"
          :step="0.1"
          :format-value="formatDegrees"
        />
        <FieldRange
          v-model="scale"
          :label="t('settings.pages.system.sections.section.developer.sections.section.beat-sync.fields.scale.label')"
          :description="t('settings.pages.system.sections.section.developer.sections.section.beat-sync.fields.scale.description')"
          :min="2"
          :max="18"
          :step="0.5"
          :format-value="formatScale"
        />
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <FieldRange
          v-model="dampingOverlay"
          :label="t('settings.pages.system.sections.section.developer.sections.section.beat-sync.fields.trail_fade.label')"
          :description="t('settings.pages.system.sections.section.developer.sections.section.beat-sync.fields.trail_fade.description')"
          :min="0.02"
          :max="0.3"
          :step="0.01"
          :format-value="formatFade"
        />
        <Callout :label="t('settings.pages.system.sections.section.developer.sections.section.beat-sync.callouts.controller.title')" theme="lime">
          <div class="text-xs text-neutral-700 dark:text-neutral-200">
            {{ t('settings.pages.system.sections.section.developer.sections.section.beat-sync.callouts.controller.description') }}
          </div>
        </Callout>
      </div>

      <div class="h-80 w-full overflow-hidden border border-neutral-200/70 rounded-xl bg-neutral-900/80 dark:border-neutral-800/60">
        <canvas ref="canvasXY" class="h-full w-full" />
      </div>
    </Section>

    <Section
      :title="t('settings.pages.system.sections.section.developer.sections.section.beat-sync.page.signals_title')"
      icon="i-solar:chart-2-bold-duotone"
      inner-class="gap-4"
    >
      <div class="space-y-3">
        <div class="text-sm text-neutral-500 dark:text-neutral-400">
          {{ t('settings.pages.system.sections.section.developer.sections.section.beat-sync.page.scalars', { seconds: (timeWindowMs / 1000).toFixed(1) }) }}
        </div>
      </div>

      <Callout :label="t('settings.pages.system.sections.section.developer.sections.section.beat-sync.callouts.spring.title')" theme="orange">
        <div class="text-xs text-neutral-700 dark:text-neutral-200">
          {{ t('settings.pages.system.sections.section.developer.sections.section.beat-sync.callouts.spring.description') }}
        </div>
      </Callout>

      <div class="text-xs text-neutral-500 space-y-1 dark:text-neutral-400">
        <div>{{ t('settings.pages.system.sections.section.developer.sections.section.beat-sync.debug.style', { value: debugState.style }) }}</div>
        <div>{{ t('settings.pages.system.sections.section.developer.sections.section.beat-sync.debug.bpm', { value: debugState.bpm ? debugState.bpm.toFixed(1) : '—' }) }}</div>
        <div>{{ t('settings.pages.system.sections.section.developer.sections.section.beat-sync.debug.primed', { value: debugState.primed }) }}</div>
        <div>{{ t('settings.pages.system.sections.section.developer.sections.section.beat-sync.debug.pattern_started', { value: debugState.patternStarted }) }}</div>
        <div>{{ t('settings.pages.system.sections.section.developer.sections.section.beat-sync.debug.segments', { value: debugState.segments.length }) }}</div>
        <div v-if="debugState.segments.length">
          {{ t('settings.pages.system.sections.section.developer.sections.section.beat-sync.debug.next_segment', {
            toY: debugState.segments[0].toY.toFixed(2),
            toZ: debugState.segments[0].toZ.toFixed(2),
            start: Math.max(0, debugState.segments[0].start - nowTs).toFixed(0),
          }) }}
        </div>
      </div>
    </Section>
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.modules.beat_sync.title
  subtitleKey: tamagotchi.settings.devtools.title
</route>
