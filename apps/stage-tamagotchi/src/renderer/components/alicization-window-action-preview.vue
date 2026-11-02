<script setup lang="ts">
import type { AlicizationSafetyPermissionRequest } from '../../shared/eventa'

import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{ image: NonNullable<AlicizationSafetyPermissionRequest['interfaceImagePreview']> }>()
const { t } = useI18n()
const actionLabel = computed(() => {
  const action = props.image.action
  if (!action)
    return ''
  if (action.kind === 'click')
    return t('tamagotchi.settings.hitl.fields.window_click', { button: t(`tamagotchi.settings.hitl.fields.window_button_${action.button}`) })
  if (action.kind === 'drag')
    return t('tamagotchi.settings.hitl.fields.window_drag')
  return t('tamagotchi.settings.hitl.fields.window_scroll', { direction: t(`tamagotchi.settings.hitl.fields.window_scroll_${action.direction}`), notches: action.notches })
})
const valid = computed(() => /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/u.test(props.image.dataUrl) && props.image.dataUrl.length <= 5592430 && props.image.width > 0 && props.image.width <= 4096 && props.image.height > 0 && props.image.height <= 4096 && props.image.markers.length <= 2)
const markers = computed(() => props.image.markers.filter(point => Number.isInteger(point.x) && Number.isInteger(point.y) && point.x >= 0 && point.y >= 0 && point.x < props.image.width && point.y < props.image.height).map((point, index) => ({ label: point.label, key: index, style: { left: `${(point.x + 0.5) / props.image.width * 100}%`, top: `${(point.y + 0.5) / props.image.height * 100}%` } })))
</script>

<template>
  <figure v-if="valid" data-window-action-preview class="m-0 space-y-2">
    <figcaption class="text-sm font-medium">
      {{ t('tamagotchi.settings.hitl.fields.window_preview') }}
    </figcaption>
    <p v-if="actionLabel" data-window-review-action class="text-sm">
      {{ actionLabel }}
    </p>
    <div class="relative inline-block max-w-full overflow-hidden border border-zinc-200 rounded-lg bg-zinc-50 align-top">
      <img :src="image.dataUrl" :width="image.width" :height="image.height" :alt="t('tamagotchi.settings.hitl.fields.window_preview')" class="block h-auto max-h-64 max-w-full w-auto" draggable="false">
      <span v-for="marker in markers" :key="marker.key" data-window-target-marker :style="marker.style" :class="['pointer-events-none absolute h-6 w-6 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center', 'border-2 border-white rounded-full bg-red-600 text-xs text-white shadow-sm']">{{ marker.label }}</span>
    </div>
    <p v-if="markers.length" class="text-xs text-zinc-500">
      {{ t('tamagotchi.settings.hitl.fields.window_target_markers') }}
    </p>
    <p v-if="image.action" class="text-xs text-zinc-500">
      {{ t('tamagotchi.settings.hitl.fields.window_foreground_hint') }}
    </p>
  </figure>
</template>
