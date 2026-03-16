<script setup lang="ts">
import type { AiriCard } from '@proj-airi/stage-ui/stores/modules/airi-card'

import { useAiriCardStore } from '@proj-airi/stage-ui/stores/modules/airi-card'
import { Button } from '@proj-airi/ui'
import { storeToRefs } from 'pinia'
import {
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import AlicizationPanel from './AlicizationPanel.vue'
import DeleteCardDialog from './DeleteCardDialog.vue'

interface Props {
  modelValue: boolean
  cardId: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const { t } = useI18n()
const cardStore = useAiriCardStore()
const { removeCard } = cardStore
const { activeCardId } = storeToRefs(cardStore)

// Get selected card data
const selectedCard = computed<AiriCard | undefined>(() => {
  if (!props.cardId)
    return undefined
  return cardStore.getCard(props.cardId)
})

// Check if card is active
const isActive = computed(() => props.cardId === activeCardId.value)

// Animation control for card activation
const isActivating = ref(false)

function handleActivate() {
  isActivating.value = true
  setTimeout(() => {
    activeCardId.value = props.cardId
    isActivating.value = false
  }, 300)
}

// Delete confirmation
const showDeleteConfirm = ref(false)
const deleteErrorMessage = ref('')

async function handleDeleteConfirm() {
  if (selectedCard.value) {
    try {
      const removed = await removeCard(props.cardId)
      if (!removed) {
        deleteErrorMessage.value = t('settings.pages.card.card_not_found')
        return
      }
      deleteErrorMessage.value = ''
      emit('update:modelValue', false)
    }
    catch (error) {
      deleteErrorMessage.value = error instanceof Error ? error.message : String(error)
    }
  }
  if (!deleteErrorMessage.value)
    showDeleteConfirm.value = false
}

function handleDeleteCancel() {
  showDeleteConfirm.value = false
  deleteErrorMessage.value = ''
}
</script>

<template>
  <DialogRoot :open="modelValue" @update:open="emit('update:modelValue', $event)">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-100 bg-black/50 backdrop-blur-sm data-[state=closed]:animate-fadeOut data-[state=open]:animate-fadeIn" />
      <DialogContent class="fixed left-1/2 top-1/2 z-100 m-0 max-h-[90vh] max-w-6xl w-[92vw] flex flex-col overflow-auto border border-neutral-200 rounded-xl bg-white p-5 shadow-xl 2xl:w-[60vw] lg:w-[80vw] md:w-[85vw] xl:w-[70vw] -translate-x-1/2 -translate-y-1/2 data-[state=closed]:animate-contentHide data-[state=open]:animate-contentShow dark:border-neutral-700 dark:bg-neutral-800 sm:p-6">
        <div v-if="selectedCard" class="w-full flex flex-col gap-5">
          <!-- Header with status indicator -->
          <div flex="~ col" gap-3>
            <div flex="~ row" items-center justify-between>
              <div>
                <div flex="~ row" items-center gap-2>
                  <DialogTitle text-2xl font-normal class="from-primary-500 to-primary-400 bg-gradient-to-r bg-clip-text text-transparent">
                    {{ selectedCard.name }}
                  </DialogTitle>
                  <div v-if="isActive" class="flex items-center gap-1 rounded-full bg-primary-100 px-2 py-0.5 text-xs text-primary-600 font-medium dark:bg-primary-900/40 dark:text-primary-400">
                    <div i-solar:check-circle-bold-duotone text-xs />
                    {{ t('settings.pages.card.active_badge') }}
                  </div>
                </div>
                <div mt-1 text-sm text-neutral-500 dark:text-neutral-400>
                  v{{ selectedCard.version }}
                  <template v-if="selectedCard.creator">
                    · {{ t('settings.pages.card.created_by') }} <span font-medium>{{ selectedCard.creator }}</span>
                  </template>
                </div>
              </div>

              <!-- Action buttons -->
              <div flex="~ row" gap-2>
                <!-- Activation button -->
                <Button
                  variant="primary"
                  :icon="isActive ? 'i-solar:check-circle-bold-duotone' : 'i-solar:play-circle-broken'"
                  :label="isActive ? t('settings.pages.card.active') : t('settings.pages.card.activate')"
                  :disabled="isActive"
                  :class="{ 'animate-pulse': isActivating }"
                  @click="handleActivate"
                />
              </div>
            </div>

            <div class="mt-4">
              <div
                v-if="deleteErrorMessage"
                class="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
              >
                {{ deleteErrorMessage }}
              </div>
              <div v-if="isActive">
                <AlicizationPanel />
              </div>
              <div
                v-else
                bg="neutral-50/50 dark:neutral-900/50"
                rounded-xl p-4 text-sm text-neutral-500
                border="~ neutral-200/50 dark:neutral-700/30"
              >
                {{ t('settings.pages.card.alicization.inactive_hint') }}
              </div>
            </div>
          </div>
        </div>
        <div
          v-else
          bg="neutral-50/50 dark:neutral-900/50"
          rounded-xl p-8 text-center
          border="~ neutral-200/50 dark:neutral-700/30"
          shadow="sm"
        >
          <div i-solar:card-search-broken mx-auto mb-3 text-6xl text-neutral-400 />
          {{ t('settings.pages.card.card_not_found') }}
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>

  <!-- Delete confirmation dialog -->
  <DeleteCardDialog
    v-model="showDeleteConfirm"
    :card-name="selectedCard?.name"
    @confirm="handleDeleteConfirm"
    @cancel="handleDeleteCancel"
  />
</template>
