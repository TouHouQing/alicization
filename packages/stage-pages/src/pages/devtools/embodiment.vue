<script setup lang="ts">
import type { StageEmbodimentDiagnosticsSnapshot } from '@proj-alicization/stage-ui/components/scenes/use-stage-embodiment-diagnostics'

import { WidgetStage } from '@proj-alicization/stage-ui/components/scenes'
import { Button } from '@proj-alicization/ui'
import { useElementSize } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

interface StageEmbodimentExpose {
  embodimentDiagnostics: StageEmbodimentDiagnosticsSnapshot
}

const { t } = useI18n()
const previewRef = ref<HTMLDivElement | null>(null)
const stageRef = ref<StageEmbodimentExpose | null>(null)
const followPointer = ref(true)
const showOverlay = ref(true)
const focusAt = ref({ x: 0, y: 0 })
const { width: previewWidth, height: previewHeight } = useElementSize(previewRef, {
  width: 960,
  height: 580,
})

const diagnostics = computed(() => stageRef.value?.embodimentDiagnostics ?? null)
const rawDiagnostics = computed(() => JSON.stringify(diagnostics.value ?? {}, null, 2))
const focusText = computed(() => t('settings.pages.system.sections.section.developer.sections.section.embodiment.page.preview.focus', {
  x: Math.round(focusAt.value.x),
  y: Math.round(focusAt.value.y),
}))
const previewHint = computed(() => {
  return followPointer.value
    ? t('settings.pages.system.sections.section.developer.sections.section.embodiment.page.preview.hint_follow')
    : t('settings.pages.system.sections.section.developer.sections.section.embodiment.page.preview.hint_manual')
})

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function centerFocus() {
  focusAt.value = {
    x: Math.max(0, previewWidth.value / 2),
    y: Math.max(0, previewHeight.value / 2),
  }
}

function updateFocusFromPointer(clientX: number, clientY: number) {
  const rect = previewRef.value?.getBoundingClientRect()
  if (!rect)
    return

  focusAt.value = {
    x: clamp(clientX - rect.left, 0, rect.width),
    y: clamp(clientY - rect.top, 0, rect.height),
  }
}

function handlePreviewPointerMove(event: PointerEvent) {
  if (!followPointer.value && !(event.buttons & 1))
    return
  updateFocusFromPointer(event.clientX, event.clientY)
}

function toggleFollowPointer() {
  followPointer.value = !followPointer.value
}

function toggleOverlay() {
  showOverlay.value = !showOverlay.value
}

watch([previewWidth, previewHeight], ([width, height], previous) => {
  if (width <= 0 || height <= 0)
    return

  const [previousWidth = 0, previousHeight = 0] = previous ?? []
  if (previousWidth <= 0 || previousHeight <= 0 || (focusAt.value.x === 0 && focusAt.value.y === 0)) {
    centerFocus()
    return
  }

  focusAt.value = {
    x: clamp(focusAt.value.x, 0, width),
    y: clamp(focusAt.value.y, 0, height),
  }
}, {
  immediate: true,
})
</script>

<template>
  <div
    :class="[
      'flex', 'h-full', 'flex-col', 'gap-4', 'overflow-auto', 'p-4',
    ]"
  >
    <section
      :class="[
        'rounded-2xl', 'border', 'border-solid', 'border-neutral-200/80',
        'bg-neutral-50/85', 'p-4',
        'dark:border-neutral-800/70', 'dark:bg-neutral-950/40',
      ]"
    >
      <div
        :class="[
          'flex', 'flex-wrap', 'items-center', 'justify-between', 'gap-3',
        ]"
      >
        <div>
          <div :class="['text-sm', 'font-medium', 'text-neutral-900', 'dark:text-neutral-100']">
            {{ t('settings.pages.system.sections.section.developer.sections.section.embodiment.page.preview.title') }}
          </div>
          <div :class="['mt-1', 'text-xs', 'text-neutral-500', 'dark:text-neutral-400']">
            {{ previewHint }}
          </div>
        </div>

        <div :class="['flex', 'flex-wrap', 'items-center', 'gap-2']">
          <span :class="['rounded-full', 'bg-neutral-900/6', 'px-3', 'py-1', 'text-xs', 'text-neutral-600', 'dark:bg-white/8', 'dark:text-neutral-300']">
            {{ focusText }}
          </span>
          <Button
            :label="followPointer
              ? t('settings.pages.system.sections.section.developer.sections.section.embodiment.page.actions.follow_pointer')
              : t('settings.pages.system.sections.section.developer.sections.section.embodiment.page.actions.manual_focus')"
            icon="i-solar:cursor-bold-duotone"
            size="sm"
            variant="secondary"
            @click="toggleFollowPointer"
          />
          <Button
            :label="showOverlay
              ? t('settings.pages.system.sections.section.developer.sections.section.embodiment.page.actions.hide_overlay')
              : t('settings.pages.system.sections.section.developer.sections.section.embodiment.page.actions.show_overlay')"
            icon="i-solar:eye-bold-duotone"
            size="sm"
            variant="secondary"
            @click="toggleOverlay"
          />
          <Button
            :label="t('settings.pages.system.sections.section.developer.sections.section.embodiment.page.actions.reset_focus')"
            icon="i-solar:refresh-bold-duotone"
            size="sm"
            @click="centerFocus"
          />
        </div>
      </div>

      <div
        ref="previewRef"
        :class="[
          'relative', 'mt-4', 'h-[32rem]', 'overflow-hidden', 'rounded-[1.75rem]',
          'border', 'border-solid', 'border-neutral-200/70',
          'bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_rgba(227,232,239,0.75)_38%,_rgba(193,206,217,0.52)_100%)]',
          'dark:border-neutral-800/70',
          'dark:bg-[radial-gradient(circle_at_top,_rgba(24,24,27,0.94),_rgba(18,24,37,0.86)_42%,_rgba(7,10,17,0.96)_100%)]',
        ]"
        @pointerdown="handlePreviewPointerMove"
        @pointermove="handlePreviewPointerMove"
      >
        <div :class="['pointer-events-none', 'absolute', 'inset-0', 'opacity-35', 'bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.32)_100%)]']" />

        <WidgetStage
          ref="stageRef"
          :class="['relative', 'h-full', 'w-full']"
          :focus-at="focusAt"
          :debug-embodiment="showOverlay"
          :quick-reply-enabled="false"
        />
      </div>
    </section>

    <section
      :class="[
        'rounded-2xl', 'border', 'border-solid', 'border-neutral-200/80',
        'bg-white/85', 'p-4',
        'dark:border-neutral-800/70', 'dark:bg-neutral-950/45',
      ]"
    >
      <div :class="['text-sm', 'font-medium', 'text-neutral-900', 'dark:text-neutral-100']">
        {{ t('settings.pages.system.sections.section.developer.sections.section.embodiment.page.sections.summary') }}
      </div>

      <div
        v-if="diagnostics"
        :class="[
          'mt-3', 'grid', 'gap-3', 'lg:grid-cols-3',
        ]"
      >
        <article :class="['rounded-2xl', 'border', 'border-solid', 'border-neutral-200/80', 'bg-neutral-50/80', 'p-3', 'dark:border-neutral-800/70', 'dark:bg-neutral-900/60']">
          <div :class="['text-xs', 'uppercase', 'tracking-[0.14em]', 'text-neutral-500', 'dark:text-neutral-400']">
            {{ t('settings.pages.system.sections.section.developer.sections.section.embodiment.page.cards.presence') }}
          </div>
          <div :class="['mt-2', 'text-sm', 'font-medium', 'text-neutral-900', 'dark:text-neutral-100']">
            {{ diagnostics.attention.resolvedPresence?.embodiedPresence ?? 'none' }}
          </div>
          <div :class="['mt-1', 'text-xs', 'text-neutral-500', 'dark:text-neutral-400']">
            source: {{ diagnostics.attention.resolvedPresence?.source ?? 'none' }}
          </div>
          <div :class="['text-xs', 'text-neutral-500', 'dark:text-neutral-400']">
            thought: {{ diagnostics.visualPresence.thoughtStance ?? 'none' }}
          </div>
        </article>

        <article :class="['rounded-2xl', 'border', 'border-solid', 'border-neutral-200/80', 'bg-neutral-50/80', 'p-3', 'dark:border-neutral-800/70', 'dark:bg-neutral-900/60']">
          <div :class="['text-xs', 'uppercase', 'tracking-[0.14em]', 'text-neutral-500', 'dark:text-neutral-400']">
            {{ t('settings.pages.system.sections.section.developer.sections.section.embodiment.page.cards.posture') }}
          </div>
          <div :class="['mt-2', 'text-sm', 'font-medium', 'text-neutral-900', 'dark:text-neutral-100']">
            {{ diagnostics.posture.mode }}
          </div>
          <div :class="['mt-1', 'text-xs', 'text-neutral-500', 'dark:text-neutral-400']">
            pitch: {{ diagnostics.posture.bodyPitch.toFixed(2) }}
          </div>
          <div :class="['text-xs', 'text-neutral-500', 'dark:text-neutral-400']">
            yaw: {{ diagnostics.posture.bodyYaw.toFixed(2) }}
          </div>
        </article>

        <article :class="['rounded-2xl', 'border', 'border-solid', 'border-neutral-200/80', 'bg-neutral-50/80', 'p-3', 'dark:border-neutral-800/70', 'dark:bg-neutral-900/60']">
          <div :class="['text-xs', 'uppercase', 'tracking-[0.14em]', 'text-neutral-500', 'dark:text-neutral-400']">
            {{ t('settings.pages.system.sections.section.developer.sections.section.embodiment.page.cards.gaze') }}
          </div>
          <div :class="['mt-2', 'text-sm', 'font-medium', 'text-neutral-900', 'dark:text-neutral-100']">
            {{ Math.round(diagnostics.attention.targetPoint.x) }}, {{ Math.round(diagnostics.attention.targetPoint.y) }}
          </div>
          <div :class="['mt-1', 'text-xs', 'text-neutral-500', 'dark:text-neutral-400']">
            engaged: {{ diagnostics.attention.engaged ? 'yes' : 'no' }}
          </div>
          <div :class="['text-xs', 'text-neutral-500', 'dark:text-neutral-400']">
            bias: {{ diagnostics.attention.runtimeBias.x.toFixed(3) }}, {{ diagnostics.attention.runtimeBias.y.toFixed(3) }}
          </div>
        </article>

        <article :class="['rounded-2xl', 'border', 'border-solid', 'border-neutral-200/80', 'bg-neutral-50/80', 'p-3', 'dark:border-neutral-800/70', 'dark:bg-neutral-900/60']">
          <div :class="['text-xs', 'uppercase', 'tracking-[0.14em]', 'text-neutral-500', 'dark:text-neutral-400']">
            {{ t('settings.pages.system.sections.section.developer.sections.section.embodiment.page.cards.speech') }}
          </div>
          <div :class="['mt-2', 'text-sm', 'font-medium', 'text-neutral-900', 'dark:text-neutral-100']">
            {{ diagnostics.speech.phase }}
          </div>
          <div :class="['mt-1', 'text-xs', 'text-neutral-500', 'dark:text-neutral-400']">
            energy: {{ diagnostics.speech.speechEnergy.toFixed(2) }}
          </div>
          <div :class="['text-xs', 'text-neutral-500', 'dark:text-neutral-400']">
            prosody: {{ diagnostics.speech.prosodyIntensity.toFixed(2) }}
          </div>
        </article>

        <article :class="['rounded-2xl', 'border', 'border-solid', 'border-neutral-200/80', 'bg-neutral-50/80', 'p-3', 'dark:border-neutral-800/70', 'dark:bg-neutral-900/60']">
          <div :class="['text-xs', 'uppercase', 'tracking-[0.14em]', 'text-neutral-500', 'dark:text-neutral-400']">
            {{ t('settings.pages.system.sections.section.developer.sections.section.embodiment.page.cards.capture') }}
          </div>
          <div :class="['mt-2', 'text-sm', 'font-medium', 'text-neutral-900', 'dark:text-neutral-100']">
            {{ diagnostics.visualPresence.capturePermission ?? 'unknown' }}
          </div>
          <div :class="['mt-1', 'text-xs', 'text-neutral-500', 'dark:text-neutral-400']">
            source: {{ diagnostics.visualPresence.captureSourceName ?? 'none' }}
          </div>
          <div :class="['text-xs', 'text-neutral-500', 'dark:text-neutral-400']">
            degrade: {{ diagnostics.visualPresence.degradedReason ?? 'none' }}
          </div>
        </article>
      </div>

      <div
        v-else
        :class="[
          'mt-3', 'rounded-2xl', 'border', 'border-dashed', 'border-neutral-300/70',
          'bg-neutral-50/70', 'px-4', 'py-6', 'text-sm', 'text-neutral-500',
          'dark:border-neutral-800/70', 'dark:bg-neutral-900/40', 'dark:text-neutral-400',
        ]"
      >
        {{ t('settings.pages.system.sections.section.developer.sections.section.embodiment.page.states.waiting') }}
      </div>
    </section>

    <section
      :class="[
        'rounded-2xl', 'border', 'border-solid', 'border-neutral-200/80',
        'bg-white/85', 'p-4',
        'dark:border-neutral-800/70', 'dark:bg-neutral-950/45',
      ]"
    >
      <div :class="['text-sm', 'font-medium', 'text-neutral-900', 'dark:text-neutral-100']">
        {{ t('settings.pages.system.sections.section.developer.sections.section.embodiment.page.sections.raw') }}
      </div>
      <pre
        :class="[
          'mt-3', 'max-h-[28rem]', 'overflow-auto', 'rounded-2xl',
          'bg-neutral-950', 'p-4', 'font-mono', 'text-xs', 'text-neutral-100',
        ]"
      >{{ rawDiagnostics }}</pre>
    </section>
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.system.sections.section.developer.sections.section.embodiment.title
  subtitleKey: tamagotchi.settings.devtools.title
  descriptionKey: settings.pages.system.sections.section.developer.sections.section.embodiment.description
</route>
