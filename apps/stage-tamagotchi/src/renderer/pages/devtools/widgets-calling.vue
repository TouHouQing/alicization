<script setup lang="ts">
import { useElectronEventaInvoke } from '@proj-alicization/electron-vueuse'
import { Button, FieldInput, FieldSelect, FieldTextArea } from '@proj-alicization/ui'
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { widgetsAdd, widgetsClear, widgetsOpenWindow, widgetsPrepareWindow, widgetsRemove, widgetsUpdate } from '../../../shared/eventa'

type SizePreset = 's' | 'm' | 'l' | 'custom'

interface FormState {
  id: string
  componentName: string
  sizePreset: SizePreset
  customCols: string
  customRows: string
  ttlSeconds: string
  componentProps: string
}

const openWidgets = useElectronEventaInvoke(widgetsOpenWindow)
const prepareWindow = useElectronEventaInvoke(widgetsPrepareWindow)
const addWidget = useElectronEventaInvoke(widgetsAdd)
const updateWidget = useElectronEventaInvoke(widgetsUpdate)
const removeWidget = useElectronEventaInvoke(widgetsRemove)
const clearWidgets = useElectronEventaInvoke(widgetsClear)
const { t } = useI18n()

const defaultWeatherProps = {
  city: t('devtools.pages.widgets-calling.presets.weather.data.city'),
  temperature: '15°C',
  condition: t('devtools.pages.widgets-calling.presets.weather.data.condition'),
  high: '18°C',
  low: '12°C',
  humidity: '72%',
  wind: '3 m/s',
  precipitation: '40%',
}

const defaultMapProps = {
  title: t('devtools.pages.widgets-calling.presets.map.data.title'),
  eta: '38 min',
  distance: '27 km',
  mode: t('devtools.pages.widgets-calling.presets.map.data.mode'),
  status: t('devtools.pages.widgets-calling.presets.map.data.status'),
  originLabel: t('devtools.pages.widgets-calling.presets.map.data.origin'),
  destinationLabel: 'HND',
  accent: '#22c55e',
  origin: { x: 18, y: 70 },
  destination: { x: 82, y: 26 },
  route: [
    { x: 18, y: 70 },
    { x: 28, y: 62 },
    { x: 42, y: 58 },
    { x: 54, y: 50 },
    { x: 64, y: 42 },
    { x: 74, y: 34 },
    { x: 82, y: 26 },
  ],
  stops: [
    { x: 28, y: 62, label: t('devtools.pages.widgets-calling.presets.map.data.stop_1') },
    { x: 54, y: 50, label: t('devtools.pages.widgets-calling.presets.map.data.stop_2') },
    { x: 74, y: 34, label: t('devtools.pages.widgets-calling.presets.map.data.stop_3') },
  ],
}

const form = reactive<FormState>({
  id: '',
  componentName: 'weather',
  sizePreset: 'm',
  customCols: '2',
  customRows: '1',
  ttlSeconds: '',
  componentProps: JSON.stringify(defaultWeatherProps, null, 2),
})

const busy = ref(false)
const lastAction = ref('')
const lastError = ref('')

const sizePresetOptions = computed<Array<{ label: string, value: SizePreset }>>(() => [
  { label: t('devtools.pages.widgets-calling.size_presets.small'), value: 's' },
  { label: t('devtools.pages.widgets-calling.size_presets.medium'), value: 'm' },
  { label: t('devtools.pages.widgets-calling.size_presets.large'), value: 'l' },
  { label: t('devtools.pages.widgets-calling.size_presets.custom'), value: 'custom' },
])

const resolvedSize = computed(() => {
  if (form.sizePreset !== 'custom')
    return form.sizePreset

  const parsedCols = Number.parseInt(form.customCols, 10)
  const parsedRows = Number.parseInt(form.customRows, 10)
  const cols = Number.isFinite(parsedCols) && parsedCols > 0 ? parsedCols : 1
  const rows = Number.isFinite(parsedRows) && parsedRows > 0 ? parsedRows : 1

  return { cols, rows }
})

function resetFeedback() {
  lastAction.value = ''
  lastError.value = ''
}

function parseProps() {
  try {
    return JSON.parse(form.componentProps || '{}')
  }
  catch (error) {
    throw new Error(t('devtools.pages.widgets-calling.errors.invalid_json', { error: (error as Error).message }))
  }
}

function parseTtl() {
  if (!form.ttlSeconds)
    return 0

  const ttl = Number(form.ttlSeconds)
  if (Number.isNaN(ttl) || ttl < 0)
    throw new Error(t('devtools.pages.widgets-calling.errors.invalid_ttl'))

  return Math.floor(ttl * 1000)
}

async function prepareAndOpenWindow(targetId?: string) {
  try {
    const id = await prepareWindow(targetId ? { id: targetId } : {})
    await openWidgets({ id })
    return id
  }
  catch (error) {
    console.warn('Failed to prepare widget window', error)
    throw error
  }
}

async function handleAdd() {
  if (!form.componentName.trim()) {
    lastError.value = t('devtools.pages.widgets-calling.errors.component_name_required')
    return
  }

  resetFeedback()
  busy.value = true

  try {
    const componentProps = parseProps()
    const ttlMs = parseTtl()
    const desiredId = form.id || undefined
    const preparedId = await prepareAndOpenWindow(desiredId)
    const createdId = await addWidget({ id: preparedId, componentName: form.componentName.trim(), componentProps, size: resolvedSize.value, ttlMs })

    const resolvedId = createdId || preparedId
    if (!form.id && resolvedId)
      form.id = resolvedId

    lastAction.value = t('devtools.pages.widgets-calling.feedback.spawned', {
      suffix: resolvedId ? ` (${resolvedId})` : '',
    })
  }
  catch (error) {
    lastError.value = (error as Error).message || t('devtools.pages.widgets-calling.errors.spawn_failed')
  }
  finally {
    busy.value = false
  }
}

async function handleUpdate() {
  if (!form.id) {
    lastError.value = t('devtools.pages.widgets-calling.errors.widget_id_required_update')
    return
  }

  resetFeedback()
  busy.value = true

  try {
    const componentProps = parseProps()
    await updateWidget({
      id: form.id,
      componentProps,
    })
    lastAction.value = t('devtools.pages.widgets-calling.feedback.updated', { id: form.id })
  }
  catch (error) {
    lastError.value = (error as Error).message || t('devtools.pages.widgets-calling.errors.update_failed')
  }
  finally {
    busy.value = false
  }
}

async function handleRemove() {
  if (!form.id) {
    lastError.value = t('devtools.pages.widgets-calling.errors.widget_id_required_remove')
    return
  }

  resetFeedback()
  busy.value = true

  try {
    await removeWidget({ id: form.id })
    lastAction.value = t('devtools.pages.widgets-calling.feedback.removed', { id: form.id })
  }
  catch (error) {
    lastError.value = (error as Error).message || t('devtools.pages.widgets-calling.errors.remove_failed')
  }
  finally {
    busy.value = false
  }
}

async function handleClear() {
  resetFeedback()
  busy.value = true

  try {
    await clearWidgets()
    lastAction.value = t('devtools.pages.widgets-calling.feedback.cleared')
  }
  catch (error) {
    lastError.value = (error as Error).message || t('devtools.pages.widgets-calling.errors.clear_failed')
  }
  finally {
    busy.value = false
  }
}

function applyWeatherPreset() {
  form.componentName = 'weather'
  form.sizePreset = 'm'
  form.customCols = '2'
  form.customRows = '1'
  form.componentProps = JSON.stringify(defaultWeatherProps, null, 2)
  form.ttlSeconds = ''
  resetFeedback()
}

function applyMapPreset() {
  form.componentName = 'map'
  form.sizePreset = 'custom'
  form.customCols = '3'
  form.customRows = '2'
  form.componentProps = JSON.stringify(defaultMapProps, null, 2)
  form.ttlSeconds = ''
  resetFeedback()
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <p class="text-sm text-neutral-500 dark:text-neutral-300">
          {{ t('devtools.pages.widgets-calling.description') }}
        </p>
        <p class="text-xs text-neutral-400 dark:text-neutral-500">
          {{ t('devtools.pages.widgets-calling.hint') }}
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          :disabled="busy"
          @click="applyWeatherPreset"
        >
          {{ t('devtools.pages.widgets-calling.presets.weather.label') }}
        </Button>
        <Button
          variant="secondary"
          :disabled="busy"
          @click="applyMapPreset"
        >
          {{ t('devtools.pages.widgets-calling.presets.map.label') }}
        </Button>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <FieldInput
        v-model="form.id"
        :label="t('devtools.pages.widgets-calling.fields.widget_id.label')"
        :description="t('devtools.pages.widgets-calling.fields.widget_id.description')"
        :placeholder="t('devtools.pages.widgets-calling.fields.widget_id.placeholder')"
        :required="false"
      />
      <FieldInput
        v-model="form.componentName"
        :label="t('devtools.pages.widgets-calling.fields.component_name.label')"
        :description="t('devtools.pages.widgets-calling.fields.component_name.description')"
        :placeholder="t('devtools.pages.widgets-calling.fields.component_name.placeholder')"
      />
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      <FieldSelect
        v-model="form.sizePreset"
        :label="t('devtools.pages.widgets-calling.fields.size_preset.label')"
        :description="t('devtools.pages.widgets-calling.fields.size_preset.description')"
        :options="sizePresetOptions"
        :placeholder="t('devtools.pages.widgets-calling.fields.size_preset.placeholder')"
      />
      <FieldInput
        v-model="form.customCols"
        :label="t('devtools.pages.widgets-calling.fields.custom_columns.label')"
        :description="t('devtools.pages.widgets-calling.fields.custom_columns.description')"
        type="number"
        min="1"
        :disabled="form.sizePreset !== 'custom'"
      />
      <FieldInput
        v-model="form.customRows"
        :label="t('devtools.pages.widgets-calling.fields.custom_rows.label')"
        :description="t('devtools.pages.widgets-calling.fields.custom_rows.description')"
        type="number"
        min="1"
        :disabled="form.sizePreset !== 'custom'"
      />
    </div>

    <FieldInput
      v-model="form.ttlSeconds"
      :label="t('devtools.pages.widgets-calling.fields.ttl.label')"
      :description="t('devtools.pages.widgets-calling.fields.ttl.description')"
      type="number"
      min="0"
      placeholder="0"
      :required="false"
    />

    <FieldTextArea
      v-model="form.componentProps"
      :label="t('devtools.pages.widgets-calling.fields.component_props.label')"
      :description="t('devtools.pages.widgets-calling.fields.component_props.description')"
      :rows="8"
    />

    <div class="flex flex-wrap gap-3">
      <Button
        variant="primary"
        :disabled="busy"
        @click="handleAdd"
      >
        {{ t('devtools.pages.widgets-calling.actions.spawn_replace') }}
      </Button>
      <Button
        variant="secondary"
        :disabled="busy"
        @click="handleUpdate"
      >
        {{ t('devtools.pages.widgets-calling.actions.update_props') }}
      </Button>
      <Button
        variant="secondary"
        :disabled="busy"
        @click="handleRemove"
      >
        {{ t('devtools.pages.widgets-calling.actions.remove_widget') }}
      </Button>
      <Button
        class="ml-auto"
        variant="danger"
        :disabled="busy"
        @click="handleClear"
      >
        {{ t('devtools.pages.widgets-calling.actions.clear_all') }}
      </Button>
    </div>

    <div class="text-sm space-y-1">
      <p v-if="lastAction" class="text-primary-200/90">
        {{ lastAction }}
      </p>
      <p v-if="lastError" class="text-danger-200/90">
        {{ lastError }}
      </p>
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: tamagotchi.settings.devtools.pages.widgets-calling.title
  subtitleKey: tamagotchi.settings.devtools.title
</route>
