<script setup lang="ts">
import type { ProviderMetadata } from '../../../../stores/providers'
import type {
  OnboardingConfiguredPayload,
  OnboardingStep,
  OnboardingStepGuard,
  OnboardingStepNextHandler,
  OnboardingStepPrevHandler,
  ProviderConfigData,
} from './types'

import { usePreferredReducedMotion } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

import StepActionMappingGuide from './step-action-mapping-guide.vue'
import StepModelSelection from './step-model-selection.vue'
import StepPersonaCalibration from './step-persona-calibration.vue'
import StepPersonaCore from './step-persona-core.vue'
import StepPersonaIntro from './step-persona-intro.vue'
import StepPersonaPreview from './step-persona-preview.vue'
import StepProviderConfiguration from './step-provider-configuration.vue'
import StepProviderSelection from './step-provider-selection.vue'
import StepWelcome from './step-welcome.vue'

import { useAiriCardStore } from '../../../../stores/modules/airi-card'
import { useConsciousnessStore } from '../../../../stores/modules/consciousness'
import { useOnboardingStore } from '../../../../stores/onboarding'
import { useProvidersStore } from '../../../../stores/providers'

interface Emits {
  (e: 'configured', payload?: OnboardingConfiguredPayload): void
  (e: 'skipped'): void
}

const props = withDefaults(defineProps<{
  extraSteps?: OnboardingStep[]
  isOpen?: boolean
}>(), {
  extraSteps: () => [],
  isOpen: true,
})
const emit = defineEmits<Emits>()
const onboardingStore = useOnboardingStore()
const preferredReducedMotion = usePreferredReducedMotion()
const step = ref(0)
const direction = ref<'next' | 'previous'>('next')
const pendingProviderConfig = ref<ProviderConfigData | null>(null)
let navigationRevision = 0
onBeforeUnmount(() => {
  navigationRevision++
})

const providersStore = useProvidersStore()
const { providers, allChatProvidersMetadata } = storeToRefs(providersStore)
const cardStore = useAiriCardStore()
const consciousnessStore = useConsciousnessStore()
const {
  activeProvider,
} = storeToRefs(consciousnessStore)

// Popular providers for first-time setup
const popularProviders = computed(() => {
  const popular = ['openai', 'anthropic', 'google-generative-ai', 'groq', 'nvidia', 'openrouter-ai', 'ollama', 'deepseek', 'player2', 'openai-compatible']
  return allChatProvidersMetadata.value
    .filter(provider => popular.includes(provider.id))
    .sort((a, b) => popular.indexOf(a.id) - popular.indexOf(b.id))
})

// Selected provider and form data
const selectedProviderId = ref('')

// Computed selected provider
const selectedProvider = computed(() => {
  return allChatProvidersMetadata.value.find(p => p.id === selectedProviderId.value) || null
})

// Reset validation state when provider changes
function selectProvider(provider: ProviderMetadata) {
  navigationRevision++
  selectedProviderId.value = provider.id
}

const requestPreviousStep: OnboardingStepPrevHandler = () => {
  return navigatePrevious()
}

const requestNextStep: OnboardingStepNextHandler = async (configData?: ProviderConfigData) => {
  pendingProviderConfig.value = configData ?? null
  await navigateNext()
}

async function saveProviderConfiguration(data: ProviderConfigData) {
  if (!selectedProvider.value)
    return
  const providerId = selectedProvider.value.id

  const config: Record<string, unknown> = {}

  if (data.apiKey)
    config.apiKey = data.apiKey.trim()
  if (data.baseUrl)
    config.baseUrl = data.baseUrl.trim()
  if (data.accountId)
    config.accountId = data.accountId.trim()

  providers.value[providerId] = {
    ...providers.value[providerId],
    ...config,
  }

  activeProvider.value = providerId
  providersStore.markProviderAdded(providerId)
  await nextTick()

  try {
    await consciousnessStore.loadModelsForProvider(providerId)
  }
  catch (err) {
    console.error('error', err)
  }
}

function syncAlicizationCardConsciousnessBinding() {
  return cardStore.syncCurrentConsciousnessToCard()
}

async function handleSave(payload?: OnboardingConfiguredPayload) {
  emit('configured', payload)
}

const allSteps = computed<OnboardingStep[]>(() => {
  const coreSteps: OnboardingStep[] = [
    {
      id: 'welcome',
      component: StepWelcome,
    },
    {
      id: 'persona-intro',
      component: StepPersonaIntro,
    },
    {
      id: 'persona-core',
      component: StepPersonaCore,
    },
    {
      id: 'persona-calibration',
      component: StepPersonaCalibration,
    },
    {
      id: 'persona-preview',
      component: StepPersonaPreview,
    },
    {
      id: 'provider-selection',
      component: StepProviderSelection,
      props: () => ({
        selectedProviderId: selectedProviderId.value,
        popularProviders: popularProviders.value,
        onSelectProvider: selectProvider,
      }),
    },
    {
      id: 'provider-configuration',
      component: StepProviderConfiguration,
      props: () => ({
        selectedProviderId: selectedProviderId.value,
        selectedProvider: selectedProvider.value,
      }),
      beforeNext: async () => {
        const config = pendingProviderConfig.value
        if (!config)
          return false

        await saveProviderConfiguration(config)
        if (pendingProviderConfig.value === config)
          pendingProviderConfig.value = null
        return true
      },
    },
    ...props.extraSteps.map(step => ({
      ...step,
      props: () => ({
        ...step.props?.(),
      }),
    })),
    {
      id: 'model-selection',
      component: StepModelSelection,
      beforeNext: async () => syncAlicizationCardConsciousnessBinding(),
    },
    {
      id: 'action-mapping-guide',
      component: StepActionMappingGuide,
      props: () => ({
        onComplete: () => handleSave(),
        onOpenActionMapping: () => handleSave({ followUpRoute: '/settings/models' }),
      }),
    },
  ]

  return coreSteps
})

const preferredEntryStepIndex = computed(() => {
  const preferredStepId = onboardingStore.preferredEntryStepId
  const preferredIndex = allSteps.value.findIndex(step => step.id === preferredStepId)
  return preferredIndex >= 0 ? preferredIndex : 0
})

const currentStep = computed(() => allSteps.value[step.value] ?? null)
const isLastStep = computed(() => step.value === allSteps.value.length - 1)
const currentStepProps = computed(() => currentStep.value?.props?.() ?? {})
const wasOpen = ref(false)
const hasNavigated = ref(false)

watch(() => props.isOpen, (open) => {
  if (!open) {
    navigationRevision++
    pendingProviderConfig.value = null
    wasOpen.value = false
    hasNavigated.value = false
    step.value = 0
    return
  }

  if (!wasOpen.value) {
    step.value = preferredEntryStepIndex.value
    wasOpen.value = true
  }
}, { immediate: true })

watch(preferredEntryStepIndex, (index) => {
  if (props.isOpen && !hasNavigated.value)
    step.value = index
})

async function canPassGuard(guard?: OnboardingStepGuard) {
  if (!guard)
    return true

  return await guard()
}

async function navigateNext() {
  hasNavigated.value = true
  const origin = currentStep.value
  const originIndex = step.value
  if (!origin)
    return
  const revision = ++navigationRevision

  if (!(await canPassGuard(origin.beforeNext)))
    return
  // A guard may fetch models while the user goes back or starts another
  // configuration. Its completion belongs only to the original navigation.
  if (revision !== navigationRevision || currentStep.value !== origin || step.value !== originIndex)
    return

  if (isLastStep.value) {
    await handleSave()
    return
  }

  direction.value = 'next'
  step.value++
}

async function navigatePrevious() {
  const origin = currentStep.value
  const originIndex = step.value
  if (!origin || originIndex <= 0)
    return
  const revision = ++navigationRevision

  if (!(await canPassGuard(origin.beforePrev)))
    return
  if (revision !== navigationRevision || currentStep.value !== origin || step.value !== originIndex)
    return

  direction.value = 'previous'
  step.value--
}
</script>

<template>
  <div class="onboarding-step-container" h-full w-full>
    <!-- Reduced motion must not wait for a CSS animation frame to mount the next step. -->
    <Transition
      :name="direction === 'next' ? 'slide-next' : 'slide-prev'"
      :css="preferredReducedMotion !== 'reduce'"
      :mode="preferredReducedMotion === 'reduce' ? undefined : 'out-in'"
    >
      <component
        :is="currentStep.component"
        v-if="currentStep"
        :key="currentStep.id"
        v-bind="currentStepProps"
        :on-next="requestNextStep"
        :on-previous="requestPreviousStep"
      />
    </Transition>
  </div>
</template>

<style scoped>
.onboarding-step-container {
  overflow-x: hidden;
}

.slide-next-enter-active,
.slide-next-leave-active,
.slide-prev-enter-active,
.slide-prev-leave-active {
  will-change: transform, opacity;
}

.slide-next-enter-active {
  animation: onboarding-slide-next-in 0.2s ease-in-out both;
}

.slide-next-leave-active {
  animation: onboarding-slide-next-out 0.2s ease-in-out both;
}

.slide-prev-enter-active {
  animation: onboarding-slide-prev-in 0.2s ease-in-out both;
}

.slide-prev-leave-active {
  animation: onboarding-slide-prev-out 0.2s ease-in-out both;
}

@keyframes onboarding-slide-next-in {
  from {
    transform: translateX(2rem);
    opacity: 0;
  }

  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes onboarding-slide-next-out {
  from {
    transform: translateX(0);
    opacity: 1;
  }

  to {
    transform: translateX(-2rem);
    opacity: 0;
  }
}

@keyframes onboarding-slide-prev-in {
  from {
    transform: translateX(-2rem);
    opacity: 0;
  }

  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes onboarding-slide-prev-out {
  from {
    transform: translateX(0);
    opacity: 1;
  }

  to {
    transform: translateX(2rem);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .slide-next-enter-active,
  .slide-next-leave-active,
  .slide-prev-enter-active,
  .slide-prev-leave-active {
    animation-duration: 1ms;
  }
}
</style>
