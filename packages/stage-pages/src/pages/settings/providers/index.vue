<script setup lang="ts">
import { IconStatusItem, RippleGrid, Section } from '@proj-alicization/stage-ui/components'
import { useAnalytics, useScrollToHash } from '@proj-alicization/stage-ui/composables'
import { useRippleGridState } from '@proj-alicization/stage-ui/composables/use-ripple-grid-state'
import { useProvidersStore } from '@proj-alicization/stage-ui/stores/providers'
import { storeToRefs } from 'pinia'
import { computed, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

const route = useRoute()
const { t } = useI18n()
const providersStore = useProvidersStore()
const { lastClickedIndex, setLastClickedIndex } = useRippleGridState()
const { trackProviderClick } = useAnalytics()

const {
  allChatProvidersMetadata,
  allAudioSpeechProvidersMetadata,
  allAudioTranscriptionProvidersMetadata,
} = storeToRefs(providersStore)

type ProviderBlockId = 'chat' | 'speech' | 'transcription'

const expandedProviderBlocks = reactive<Record<ProviderBlockId, boolean>>({
  chat: false,
  speech: false,
  transcription: false,
})

const providerBlocks = computed(() => {
  let globalIndex = 0

  return [
    {
      id: 'chat' as const,
      icon: 'i-solar:chat-square-like-bold-duotone',
      title: 'Chat',
      description: t('settings.providers.explained.chat'),
      providers: allChatProvidersMetadata.value,
    },
    {
      id: 'speech' as const,
      icon: 'i-solar:user-speak-rounded-bold-duotone',
      title: 'Speech',
      description: t('settings.providers.explained.Speech'),
      providers: allAudioSpeechProvidersMetadata.value,
    },
    {
      id: 'transcription' as const,
      icon: 'i-solar:microphone-3-bold-duotone',
      title: 'Transcription',
      description: t('settings.providers.explained.Transcription'),
      providers: allAudioTranscriptionProvidersMetadata.value,
    },
  ].map((block) => {
    const startIndex = globalIndex

    return {
      ...block,
      startIndex,
      providers: block.providers.map(provider => ({
        ...provider,
        renderIndex: globalIndex++,
      })),
    }
  })
})

watch(
  () => route.hash,
  (hash) => {
    const blockId = hash.startsWith('#') ? hash.slice(1) as ProviderBlockId : undefined
    if (!blockId || !(blockId in expandedProviderBlocks))
      return
    expandedProviderBlocks[blockId] = true
  },
  { immediate: true },
)

function getBlockOriginIndex(startIndex: number, providerCount: number) {
  const localIndex = lastClickedIndex.value - startIndex
  return localIndex >= 0 && localIndex < providerCount ? localIndex : 0
}

useScrollToHash(() => route.hash, {
  auto: true, // automatically react to route hash
  offset: 16, // header + margin spacing
  behavior: 'smooth', // smooth scroll animation
  maxRetries: 15, // retry if target element isn't ready
  retryDelay: 150, // wait between retries
  scrollContainer: '#settings-scroll-container',
})
</script>

<template>
  <div mb-6 flex flex-col gap-5>
    <div bg="primary-500/10 dark:primary-800/25" rounded-lg p-4>
      <div mb-2 text-xl font-normal text="primary-800 dark:primary-100">
        {{ $t('settings.pages.providers.helpinfo.title') }}
      </div>
      <div text="primary-700 dark:primary-300">
        <i18n-t keypath="settings.pages.providers.helpinfo.description">
          <template #chat>
            <div bg="primary-500/10 dark:primary-800/25" inline-flex items-center gap-1 rounded-lg px-2 py-0.5 translate-y="[0.25lh]">
              <div i-solar:chat-square-like-bold-duotone />
              <strong class="font-normal">Chat</strong>
            </div>
          </template>
        </i18n-t>
      </div>
    </div>

    <div
      v-for="block in providerBlocks"
      :id="block.id"
      :key="block.id"
    >
      <Section
        :title="block.title"
        :icon="block.icon"
        :expand="expandedProviderBlocks[block.id]"
      >
        <div :class="['flex', 'flex-col', 'gap-4']">
          <p :class="['text-sm', 'text-neutral-400', 'sm:text-base', 'dark:text-neutral-500']">
            {{ block.description }}
          </p>

          <RippleGrid
            :items="block.providers"
            :columns="{ default: 1, sm: 2, xl: 3 }"
            :origin-index="getBlockOriginIndex(block.startIndex, block.providers.length)"
            @item-click="({ item }) => setLastClickedIndex(item.renderIndex)"
          >
            <template #item="{ item: provider }">
              <IconStatusItem
                :title="provider.localizedName || 'Unknown'"
                :description="provider.localizedDescription"
                :icon="provider.icon"
                :icon-color="provider.iconColor"
                :icon-image="provider.iconImage"
                :to="`/settings/providers/${provider.category}/${provider.id}`"
                :configured="provider.configured"
                @click="trackProviderClick(provider.id, provider.category)"
              />
            </template>
          </RippleGrid>
        </div>
      </Section>
    </div>
  </div>
  <div
    v-motion
    text="neutral-500/5 dark:neutral-600/20" pointer-events-none
    fixed top="[calc(100dvh-15rem)]" bottom-0 right--5 z--1
    :initial="{ scale: 0.9, opacity: 0, y: 20 }"
    :enter="{ scale: 1, opacity: 1, y: 0 }"
    :duration="500"
    size-60
    flex items-center justify-center
  >
    <div text="60" i-solar:box-minimalistic-bold-duotone />
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.providers.title
  subtitleKey: settings.title
  descriptionKey: settings.pages.providers.description
  icon: i-solar:box-minimalistic-bold-duotone
  settingsEntry: true
  order: 6
  stageTransition:
    name: slide
    pageSpecificAvailable: true
</route>
