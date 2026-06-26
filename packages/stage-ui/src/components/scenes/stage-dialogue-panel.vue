<script setup lang="ts">
import type { StageBubblePlacement, StageCharacterFrame, StageDialoguePanelRect } from '../../utils'

import { useResizeObserver } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { computed, onUnmounted, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import StageDialogueOverlay from './stage-dialogue-overlay.vue'
import StageQuickReplyComposer from './stage-quick-reply-composer.vue'

import { useStageDialogueStore } from '../../stores/stage-dialogue'
import {
  clampStageDialogueOrbRect,
  clampStageDialoguePanelRect,
  resolveStageDialogueAnchoredPanelRect,
  resolveStageDialogueDefaultPanelRect,
  stageDialogueOrbSize,
  stageDialoguePanelChromeWidth,
} from '../../utils'

const props = withDefaults(defineProps<{
  text: string
  loading?: boolean
  streaming?: boolean
  placement?: StageBubblePlacement
  quickReplyEnabled?: boolean
  proactiveFeedbackActions?: {
    dismissLabel: string
    positiveLabel: string
  } | null
  characterFrame?: StageCharacterFrame | null
  visible?: boolean
}>(), {
  loading: false,
  streaming: false,
  placement: 'top-right',
  quickReplyEnabled: true,
  proactiveFeedbackActions: null,
  characterFrame: null,
  visible: false,
})

const emit = defineEmits<{
  (e: 'hoverChange', hovered: boolean): void
  (e: 'focusChange', focused: boolean): void
  (e: 'interactionChange', active: boolean): void
  (e: 'proactiveFeedback', kind: 'dismiss' | 'positive'): void
}>()

type InteractionSource = 'panel' | 'orb'
type InteractionMode = 'drag' | 'resize'
type ResizeHandle = 'north' | 'south' | 'east' | 'west' | 'north-east' | 'north-west' | 'south-east' | 'south-west'

interface ActiveInteraction {
  mode: InteractionMode
  source: InteractionSource
  pointerId: number
  startClientX: number
  startClientY: number
  originRect: StageDialoguePanelRect
  moved: boolean
  resizeHandle?: ResizeHandle
}

const stageDialogueStore = useStageDialogueStore()
const { minimized } = storeToRefs(stageDialogueStore)
const { t } = useI18n()

const hostRef = useTemplateRef<HTMLDivElement>('host')
const panelRootRef = useTemplateRef<HTMLDivElement>('panelRoot')
const hostSize = ref({ width: 0, height: 0 })
const activeInteraction = ref<ActiveInteraction | null>(null)
const liveRect = ref<StageDialoguePanelRect | null>(null)

const boundsInput = computed(() => ({
  containerWidth: hostSize.value.width,
  containerHeight: hostSize.value.height,
  characterFrame: props.characterFrame,
  placement: props.placement,
  quickReplyEnabled: props.quickReplyEnabled,
}))

function hasUsableBounds() {
  return boundsInput.value.containerWidth > 0 && boundsInput.value.containerHeight > 0
}

function clampExpandedRect(rect: StageDialoguePanelRect) {
  return clampStageDialoguePanelRect(rect, boundsInput.value)
}

function clampOrbRect(rect: StageDialoguePanelRect) {
  return clampStageDialogueOrbRect(rect, boundsInput.value)
}

function resolveStoredPanelRect() {
  const storedSize = stageDialogueStore.getSize(props.placement)
  return resolveStageDialogueAnchoredPanelRect(boundsInput.value, {
    offset: stageDialogueStore.hasCustomizedOffset(props.placement)
      ? stageDialogueStore.getOffset(props.placement)
      : undefined,
    size: {
      width: storedSize.width > 0 ? storedSize.width : undefined,
      height: storedSize.height > 0 ? storedSize.height : undefined,
    },
  })
}

function resolveDefaultOrbRect() {
  const defaultPanelRect = resolveStageDialogueDefaultPanelRect(boundsInput.value)
  return clampOrbRect({
    x: defaultPanelRect.x,
    y: defaultPanelRect.y,
    width: stageDialogueOrbSize,
    height: stageDialogueOrbSize,
  })
}

function resolveExpandedRect() {
  if (!hasUsableBounds())
    return { x: 0, y: 0, width: 0, height: 0 }

  if (liveRect.value && activeInteraction.value?.source !== 'orb')
    return clampExpandedRect(liveRect.value)

  return resolveStoredPanelRect()
}

function resolveOrbRect() {
  if (!hasUsableBounds()) {
    return {
      x: 0,
      y: 0,
      width: stageDialogueOrbSize,
      height: stageDialogueOrbSize,
    }
  }

  if (liveRect.value && activeInteraction.value?.source === 'orb')
    return clampOrbRect(liveRect.value)

  const defaultOrbRect = resolveDefaultOrbRect()
  if (!stageDialogueStore.hasCustomizedOrbOffset())
    return defaultOrbRect

  const storedOffset = stageDialogueStore.getOrbOffset()
  return clampOrbRect({
    x: defaultOrbRect.x + storedOffset.x,
    y: defaultOrbRect.y + storedOffset.y,
    width: stageDialogueOrbSize,
    height: stageDialogueOrbSize,
  })
}

function resolvePanelOffset(rect: StageDialoguePanelRect) {
  const anchoredRect = resolveStageDialogueAnchoredPanelRect(boundsInput.value, {
    size: {
      width: rect.width,
      height: rect.height,
    },
  })

  return {
    x: rect.x - anchoredRect.x,
    y: rect.y - anchoredRect.y,
  }
}

function resolveOrbOffset(rect: StageDialoguePanelRect) {
  const anchoredRect = resolveDefaultOrbRect()
  return {
    x: rect.x - anchoredRect.x,
    y: rect.y - anchoredRect.y,
  }
}

function commitExpandedRect(rect: StageDialoguePanelRect, options: { markCustomized?: boolean } = {}) {
  if (!hasUsableBounds())
    return

  const nextRect = clampExpandedRect(rect)
  liveRect.value = null
  stageDialogueStore.setPanelLayout(props.placement, nextRect, resolvePanelOffset(nextRect), options)
}

function commitOrbRect(rect: StageDialoguePanelRect, options: { markCustomized?: boolean } = {}) {
  if (!hasUsableBounds())
    return

  const nextRect = clampOrbRect(rect)
  liveRect.value = null
  stageDialogueStore.setOrbLayout(resolveOrbOffset(nextRect), options)
}

function previewExpandedRect(rect: StageDialoguePanelRect) {
  if (!hasUsableBounds())
    return

  liveRect.value = clampExpandedRect(rect)
}

function previewOrbRect(rect: StageDialoguePanelRect) {
  if (!hasUsableBounds())
    return

  liveRect.value = clampOrbRect(rect)
}

function syncRect() {
  if (!hasUsableBounds())
    return

  liveRect.value = null

  const nextPanelRect = resolveStoredPanelRect()
  stageDialogueStore.setPanelLayout(
    props.placement,
    nextPanelRect,
    resolvePanelOffset(nextPanelRect),
    { markCustomized: stageDialogueStore.hasCustomizedOffset(props.placement) },
  )

  const nextOrbRect = resolveOrbRect()
  stageDialogueStore.setOrbLayout(
    resolveOrbOffset(nextOrbRect),
    { markCustomized: stageDialogueStore.hasCustomizedOrbOffset() },
  )
}

useResizeObserver(hostRef, (entries) => {
  const entry = entries[0]
  if (!entry)
    return

  hostSize.value = {
    width: entry.contentRect.width,
    height: entry.contentRect.height,
  }
  syncRect()
})

watch([() => props.placement, () => props.quickReplyEnabled], () => {
  syncRect()
}, { immediate: true })

watch(() => props.loading, (loading) => {
  if (loading)
    stageDialogueStore.expand()
})

watch(() => props.streaming, (streaming) => {
  if (streaming)
    stageDialogueStore.expand()
})

watch(() => props.text, (text, previousText) => {
  if (text.trim() && text !== previousText)
    stageDialogueStore.expand()
})

watch(() => props.visible, (visible) => {
  if (visible)
    stageDialogueStore.expand()
}, { immediate: true })

watch(activeInteraction, (interaction) => {
  emit('interactionChange', Boolean(interaction))
}, { flush: 'sync', immediate: true })

const expandedRect = computed(() => resolveExpandedRect())
const orbRect = computed(() => resolveOrbRect())
const panelRect = computed(() => minimized.value ? orbRect.value : expandedRect.value)
const bubbleBodyHeight = computed(() => {
  const reservedHeight = props.quickReplyEnabled ? 122 : 18
  return Math.max(108, expandedRect.value.height - reservedHeight)
})
const panelStyle = computed(() => ({
  transform: minimized.value
    ? `translate(${panelRect.value.x}px, ${panelRect.value.y}px)`
    : `translate(${props.placement === 'top-left' ? panelRect.value.x - stageDialoguePanelChromeWidth : panelRect.value.x}px, ${panelRect.value.y}px)`,
  width: minimized.value ? `${stageDialogueOrbSize}px` : `${panelRect.value.width + stageDialoguePanelChromeWidth}px`,
}))
const shellClasses = computed(() => [
  props.placement === 'top-left' ? 'stage-dialogue-panel__shell--left' : 'stage-dialogue-panel__shell--right',
  minimized.value ? 'stage-dialogue-panel__shell--minimized' : 'stage-dialogue-panel__shell--expanded',
])

function removeInteractionListeners() {
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerUp)
  window.removeEventListener('pointercancel', handlePointerUp)
}

function beginInteraction(
  event: PointerEvent,
  mode: InteractionMode,
  source: InteractionSource,
  resizeHandle?: ResizeHandle,
) {
  if (event.button !== 0)
    return

  activeInteraction.value = {
    mode,
    source,
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    originRect: { ...panelRect.value },
    moved: false,
    resizeHandle,
  }

  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
  window.addEventListener('pointercancel', handlePointerUp)
}

function onDragPointerDown(event: PointerEvent, source: InteractionSource) {
  event.preventDefault()
  beginInteraction(event, 'drag', source)
}

function onResizePointerDown(event: PointerEvent, resizeHandle: ResizeHandle) {
  event.preventDefault()
  event.stopPropagation()
  beginInteraction(event, 'resize', 'panel', resizeHandle)
}

function resolveResizedRect(
  originRect: StageDialoguePanelRect,
  deltaX: number,
  deltaY: number,
  resizeHandle: ResizeHandle,
): StageDialoguePanelRect {
  const nextRect = { ...originRect }

  if (resizeHandle.includes('west')) {
    nextRect.x += deltaX
    nextRect.width -= deltaX
  }

  if (resizeHandle.includes('east'))
    nextRect.width += deltaX

  if (resizeHandle.includes('north')) {
    nextRect.y += deltaY
    nextRect.height -= deltaY
  }

  if (resizeHandle.includes('south'))
    nextRect.height += deltaY

  return nextRect
}

function handlePointerMove(event: PointerEvent) {
  const interaction = activeInteraction.value
  if (!interaction || interaction.pointerId !== event.pointerId)
    return

  const deltaX = event.clientX - interaction.startClientX
  const deltaY = event.clientY - interaction.startClientY
  if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)
    interaction.moved = true

  if (interaction.mode === 'drag') {
    const nextRect = {
      ...interaction.originRect,
      x: interaction.originRect.x + deltaX,
      y: interaction.originRect.y + deltaY,
    }
    if (interaction.source === 'orb')
      previewOrbRect(nextRect)
    else
      previewExpandedRect(nextRect)
    return
  }

  previewExpandedRect(resolveResizedRect(
    interaction.originRect,
    deltaX,
    deltaY,
    interaction.resizeHandle ?? 'south-east',
  ))
}

function handlePointerUp(event: PointerEvent) {
  const interaction = activeInteraction.value
  if (!interaction || interaction.pointerId !== event.pointerId)
    return

  removeInteractionListeners()
  activeInteraction.value = null

  if (liveRect.value) {
    if (interaction.source === 'orb')
      commitOrbRect(liveRect.value, { markCustomized: true })
    else
      commitExpandedRect(liveRect.value)
  }

  if (interaction.source === 'orb' && !interaction.moved)
    stageDialogueStore.expand()
}

function handlePanelPointerEnter() {
  emit('hoverChange', true)
}

function handlePanelPointerLeave() {
  emit('hoverChange', false)
}

function handlePanelFocusIn() {
  emit('focusChange', true)
}

function handlePanelFocusOut(event: FocusEvent) {
  const nextFocused = event.relatedTarget
  if (nextFocused instanceof Node && panelRootRef.value?.contains(nextFocused))
    return

  emit('focusChange', false)
}

function panelRootElement() {
  return panelRootRef.value ?? undefined
}

onUnmounted(() => {
  removeInteractionListeners()
  emit('interactionChange', false)
})

defineExpose({
  panelRootElement,
})
</script>

<template>
  <div ref="host" class="stage-dialogue-panel-host">
    <div
      ref="panelRoot"
      class="stage-dialogue-panel"
      :style="panelStyle"
      @pointerenter="handlePanelPointerEnter"
      @pointerleave="handlePanelPointerLeave"
      @focusin="handlePanelFocusIn"
      @focusout="handlePanelFocusOut"
    >
      <button
        v-if="minimized"
        type="button"
        class="stage-dialogue-panel__orb"
        :title="t('stage.dialogue.expand-panel')"
        @pointerdown="onDragPointerDown($event, 'orb')"
      >
        <span class="stage-dialogue-panel__orb-ring" />
        <span class="stage-dialogue-panel__orb-icon i-solar:chat-round-like-bold-duotone" aria-hidden="true" />
      </button>

      <div
        v-else
        class="stage-dialogue-panel__shell"
        :class="shellClasses"
      >
        <div
          class="stage-dialogue-panel__resize-handle stage-dialogue-panel__resize-handle--north"
          @pointerdown="onResizePointerDown($event, 'north')"
        />
        <div
          class="stage-dialogue-panel__resize-handle stage-dialogue-panel__resize-handle--south"
          @pointerdown="onResizePointerDown($event, 'south')"
        />
        <div
          class="stage-dialogue-panel__resize-handle stage-dialogue-panel__resize-handle--east"
          @pointerdown="onResizePointerDown($event, 'east')"
        />
        <div
          class="stage-dialogue-panel__resize-handle stage-dialogue-panel__resize-handle--west"
          @pointerdown="onResizePointerDown($event, 'west')"
        />
        <div
          class="stage-dialogue-panel__resize-handle stage-dialogue-panel__resize-handle--north-east"
          @pointerdown="onResizePointerDown($event, 'north-east')"
        />
        <div
          class="stage-dialogue-panel__resize-handle stage-dialogue-panel__resize-handle--north-west"
          @pointerdown="onResizePointerDown($event, 'north-west')"
        />
        <div
          class="stage-dialogue-panel__resize-handle stage-dialogue-panel__resize-handle--south-east"
          @pointerdown="onResizePointerDown($event, 'south-east')"
        />
        <div
          class="stage-dialogue-panel__resize-handle stage-dialogue-panel__resize-handle--south-west"
          @pointerdown="onResizePointerDown($event, 'south-west')"
        />

        <div class="stage-dialogue-panel__content">
          <div
            class="stage-dialogue-panel__toolbar"
            @pointerdown="onDragPointerDown($event, 'panel')"
          >
            <div class="stage-dialogue-panel__toolbar-label">
              <span class="stage-dialogue-panel__toolbar-dot" />
              <span>{{ t('stage.dialogue.window-title') }}</span>
            </div>
            <div class="stage-dialogue-panel__toolbar-hint">
              {{ t('stage.dialogue.move-panel') }}
            </div>
          </div>

          <StageDialogueOverlay
            :loading="props.loading"
            :streaming="props.streaming"
            :text="props.text"
            :placement="props.placement"
            :max-body-height="bubbleBodyHeight"
            :proactive-feedback-actions="props.proactiveFeedbackActions"
            @proactive-feedback="emit('proactiveFeedback', $event)"
          />
          <StageQuickReplyComposer v-if="props.quickReplyEnabled" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stage-dialogue-panel-host {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.stage-dialogue-panel {
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: auto;
}

.stage-dialogue-panel__shell {
  position: relative;
  display: flex;
  align-items: stretch;
}

.stage-dialogue-panel__content {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.stage-dialogue-panel__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 999px;
  background: rgb(255 246 233 / 66%);
  box-shadow: 0 0.8rem 1.8rem rgb(73 45 23 / 10%);
  color: rgb(101 68 40 / 82%);
  backdrop-filter: blur(16px);
  cursor: grab;
  padding: 0.45rem 0.8rem;
  touch-action: none;
  user-select: none;
}

.stage-dialogue-panel__toolbar:active {
  cursor: grabbing;
}

.stage-dialogue-panel__toolbar-label {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.stage-dialogue-panel__toolbar-dot {
  width: 0.46rem;
  height: 0.46rem;
  border-radius: 999px;
  background: rgb(208 129 70 / 85%);
  box-shadow: 0 0 0 0.25rem rgb(255 214 181 / 52%);
}

.stage-dialogue-panel__toolbar-hint {
  font-size: 0.72rem;
  opacity: 0.72;
}

.stage-dialogue-panel__resize-handle {
  position: absolute;
  z-index: 2;
  touch-action: none;
}

.stage-dialogue-panel__resize-handle--north,
.stage-dialogue-panel__resize-handle--south {
  left: 0.85rem;
  right: 0.85rem;
  height: 0.9rem;
}

.stage-dialogue-panel__resize-handle--north {
  top: -0.45rem;
  cursor: ns-resize;
}

.stage-dialogue-panel__resize-handle--south {
  bottom: -0.45rem;
  cursor: ns-resize;
}

.stage-dialogue-panel__resize-handle--east,
.stage-dialogue-panel__resize-handle--west {
  top: 1.2rem;
  bottom: 0.9rem;
  width: 0.9rem;
}

.stage-dialogue-panel__resize-handle--east {
  right: -0.45rem;
  cursor: ew-resize;
}

.stage-dialogue-panel__resize-handle--west {
  left: -0.45rem;
  cursor: ew-resize;
}

.stage-dialogue-panel__resize-handle--north-east,
.stage-dialogue-panel__resize-handle--north-west,
.stage-dialogue-panel__resize-handle--south-east,
.stage-dialogue-panel__resize-handle--south-west {
  width: 1rem;
  height: 1rem;
}

.stage-dialogue-panel__resize-handle--north-east {
  top: -0.45rem;
  right: -0.45rem;
  cursor: nesw-resize;
}

.stage-dialogue-panel__resize-handle--north-west {
  top: -0.45rem;
  left: -0.45rem;
  cursor: nwse-resize;
}

.stage-dialogue-panel__resize-handle--south-east {
  right: -0.45rem;
  bottom: -0.45rem;
  cursor: nwse-resize;
}

.stage-dialogue-panel__resize-handle--south-west {
  bottom: -0.45rem;
  left: -0.45rem;
  cursor: nesw-resize;
}

.stage-dialogue-panel__orb {
  position: relative;
  display: inline-flex;
  width: 4.5rem;
  height: 4.5rem;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(255 255 255 / 22%);
  border-radius: 999px;
  background:
    radial-gradient(circle at 32% 28%, rgb(255 246 229 / 96%), rgb(234 193 154 / 90%) 46%, rgb(116 84 58 / 95%));
  box-shadow:
    0 1rem 2rem rgb(62 39 21 / 22%),
    inset 0 1px 0 rgb(255 255 255 / 28%);
  color: rgb(255 251 245 / 96%);
  cursor: grab;
  touch-action: none;
}

.stage-dialogue-panel__orb:active {
  cursor: grabbing;
}

.stage-dialogue-panel__orb-ring {
  position: absolute;
  inset: -0.28rem;
  border: 1px solid rgb(255 230 208 / 48%);
  border-radius: 999px;
  animation: stage-dialogue-orb-pulse 2.8s ease-in-out infinite;
}

.stage-dialogue-panel__orb-icon {
  position: relative;
  font-size: 1.65rem;
}

@keyframes stage-dialogue-orb-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.08);
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .stage-dialogue-panel__toolbar {
    padding-inline: 0.7rem;
  }

  .stage-dialogue-panel__toolbar-hint {
    display: none;
  }
}
</style>
