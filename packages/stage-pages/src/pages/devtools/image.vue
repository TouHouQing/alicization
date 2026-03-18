<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const image = ref<File>()
const imageDataURL = ref<string>('')
const { copy } = useClipboard({ source: imageDataURL })
const { t } = useI18n()

async function readAsDataURL(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      resolve(e.target?.result?.toString() || '')
    }
    reader.onerror = (e) => {
      reject(e)
    }

    reader.readAsDataURL(file)
  })
}

async function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    image.value = file

    const dataURL = await readAsDataURL(file)
    imageDataURL.value = dataURL
  }
}
</script>

<template>
  <div>
    <label bg="neutral-100" flex="~ col" items-center justify-center rounded-lg px-4 py-3>
      <input type="file" accept="image/*" hidden @change="handleFileChange">
      <span>{{ t('settings.pages.system.sections.section.developer.sections.section.image.actions.upload') }}</span>
    </label>
    <div v-if="imageDataURL">
      <img :src="imageDataURL" :alt="t('settings.pages.system.sections.section.developer.sections.section.image.preview_alt')" w-100>
      <pre bg="neutral-100" class="text-wrap-any" max-h="100" overflow-scroll rounded-lg text-wrap text-black font-mono>
        {{ imageDataURL }}
      </pre>
      <button bg="primary-500" text="white" mt-4 rounded-lg px-4 py-2 @click="() => copy()">
        {{ t('settings.pages.system.sections.section.developer.sections.section.image.actions.copy_data_url') }}
      </button>
    </div>
  </div>
</template>

<style lang="css" scoped>
.text-wrap-any {
  word-break: break-word;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
</style>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.system.sections.section.developer.sections.section.image.title
  subtitleKey: tamagotchi.settings.devtools.title
</route>
