<script setup lang="ts">
import type { SoulForgeDraft } from './soul-forge'

import { Range } from '@proj-alicization/ui/components/form'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { clampSoulForgeUnit, soulForgeTraitMetas } from './soul-forge'

const props = withDefaults(defineProps<{
  memoryEcho?: string
  showMemoryEcho?: boolean
  showSaveButton?: boolean
  saving?: boolean
}>(), {
  memoryEcho: '',
  showMemoryEcho: false,
  showSaveButton: false,
  saving: false,
})

const emit = defineEmits<{
  (e: 'save'): void
}>()

const draft = defineModel<SoulForgeDraft>('draft', { required: true })
const { t } = useI18n()

const memoryEchoPreview = computed(() => {
  const text = props.memoryEcho.trim()
  return text || t('settings.pages.card.alicization.soul_forge.memory_echo.empty')
})

const genderOptions = computed(() => [
  { value: 'female', label: t('settings.pages.card.alicization.soul_forge.genders.female') },
  { value: 'male', label: t('settings.pages.card.alicization.soul_forge.genders.male') },
  { value: 'non-binary', label: t('settings.pages.card.alicization.soul_forge.genders.non_binary') },
  { value: 'neutral', label: t('settings.pages.card.alicization.soul_forge.genders.neutral') },
  { value: 'custom', label: t('settings.pages.card.alicization.soul_forge.genders.custom') },
])

const localizedTraitMetas = computed(() => {
  return soulForgeTraitMetas.map((trait) => {
    const baseKey = `settings.pages.card.alicization.soul_forge.traits.${trait.key}` as const
    return {
      ...trait,
      label: t(`${baseKey}.label`),
      description: t(`${baseKey}.description`),
      leftLabel: t(`${baseKey}.left`),
      rightLabel: t(`${baseKey}.right`),
    }
  })
})

function updateTrait(key: keyof Pick<SoulForgeDraft, 'obedience' | 'liveliness' | 'sensibility'>, value: number) {
  draft.value = {
    ...draft.value,
    [key]: clampSoulForgeUnit(value),
  }
}
</script>

<template>
  <section :class="['relative', 'overflow-hidden', 'rounded-[28px]', 'border', 'border-neutral-200/80', 'bg-white/92', 'p-5', 'shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)]', 'dark:border-neutral-700/80', 'dark:bg-neutral-900/90', 'sm:p-6']">
    <div :class="['pointer-events-none', 'absolute', '-right-10', '-top-12', 'h-40', 'w-40', 'rounded-full', 'bg-cyan-200/25', 'blur-3xl', 'dark:bg-cyan-400/12']" />
    <div :class="['pointer-events-none', 'absolute', '-bottom-18', '-left-10', 'h-48', 'w-48', 'rounded-full', 'bg-amber-200/20', 'blur-3xl', 'dark:bg-amber-300/10']" />

    <div :class="['relative', 'flex', 'flex-col', 'gap-6']">
      <header :class="['flex', 'flex-col', 'gap-3', 'border-b', 'border-neutral-200/80', 'pb-5', 'dark:border-neutral-700/80']">
        <div :class="['text-[11px]', 'font-medium', 'tracking-[0.36em]', 'text-neutral-500', 'uppercase', 'dark:text-neutral-400']">
          {{ t('settings.pages.card.alicization.soul_forge.eyebrow') }}
        </div>
        <div :class="['flex', 'flex-col', 'gap-2', 'md:flex-row', 'md:items-end', 'md:justify-between']">
          <div :class="['flex', 'flex-col', 'gap-2']">
            <h3 :class="['font-serif', 'text-2xl', 'leading-tight', 'text-neutral-950', 'dark:text-neutral-50']">
              {{ t('settings.pages.card.alicization.soul_forge.title') }}
            </h3>
            <p :class="['max-w-2xl', 'text-sm', 'leading-6', 'text-neutral-600', 'dark:text-neutral-300']">
              {{ t('settings.pages.card.alicization.soul_forge.description') }}
            </p>
          </div>
          <div :class="['inline-flex', 'items-center', 'gap-2', 'self-start', 'rounded-full', 'border', 'border-neutral-200/80', 'bg-neutral-100/80', 'px-3', 'py-1.5', 'text-[11px]', 'tracking-[0.12em]', 'text-neutral-500', 'uppercase', 'dark:border-neutral-700/80', 'dark:bg-neutral-800/80', 'dark:text-neutral-300']">
            <div class="i-solar:shield-keyhole-bold-duotone" />
            {{ t('settings.pages.card.alicization.soul_forge.trust_badge') }}
          </div>
        </div>
      </header>

      <div :class="['grid', 'grid-cols-1', 'gap-4', 'md:grid-cols-2']">
        <label :class="['flex', 'flex-col', 'gap-2', 'text-sm']">
          <span :class="['text-xs', 'tracking-[0.14em]', 'text-neutral-500', 'uppercase', 'dark:text-neutral-400']">{{ t('settings.pages.card.alicization.soul_forge.fields.owner_name') }}</span>
          <input v-model="draft.ownerName" :class="['w-full', 'rounded-2xl', 'border', 'border-neutral-200', 'bg-white/70', 'px-4', 'py-3', 'text-sm', 'text-neutral-900', 'outline-none', 'transition', 'focus:border-cyan-400/70', 'dark:border-neutral-700', 'dark:bg-neutral-950/70', 'dark:text-neutral-100']">
        </label>

        <label :class="['flex', 'flex-col', 'gap-2', 'text-sm']">
          <span :class="['text-xs', 'tracking-[0.14em]', 'text-neutral-500', 'uppercase', 'dark:text-neutral-400']">{{ t('settings.pages.card.alicization.soul_forge.fields.host_name') }}</span>
          <input v-model="draft.hostName" :class="['w-full', 'rounded-2xl', 'border', 'border-neutral-200', 'bg-white/70', 'px-4', 'py-3', 'text-sm', 'text-neutral-900', 'outline-none', 'transition', 'focus:border-cyan-400/70', 'dark:border-neutral-700', 'dark:bg-neutral-950/70', 'dark:text-neutral-100']">
        </label>

        <label :class="['flex', 'flex-col', 'gap-2', 'text-sm']">
          <span :class="['text-xs', 'tracking-[0.14em]', 'text-neutral-500', 'uppercase', 'dark:text-neutral-400']">{{ t('settings.pages.card.alicization.soul_forge.fields.alicization_name') }}</span>
          <input v-model="draft.alicizationName" :class="['w-full', 'rounded-2xl', 'border', 'border-neutral-200', 'bg-white/70', 'px-4', 'py-3', 'text-sm', 'text-neutral-900', 'outline-none', 'transition', 'focus:border-cyan-400/70', 'dark:border-neutral-700', 'dark:bg-neutral-950/70', 'dark:text-neutral-100']">
        </label>

        <label :class="['flex', 'flex-col', 'gap-2', 'text-sm']">
          <span :class="['text-xs', 'tracking-[0.14em]', 'text-neutral-500', 'uppercase', 'dark:text-neutral-400']">{{ t('settings.pages.card.alicization.soul_forge.fields.gender') }}</span>
          <select v-model="draft.gender" :class="['w-full', 'rounded-2xl', 'border', 'border-neutral-200', 'bg-white/70', 'px-4', 'py-3', 'text-sm', 'text-neutral-900', 'outline-none', 'transition', 'focus:border-cyan-400/70', 'dark:border-neutral-700', 'dark:bg-neutral-950/70', 'dark:text-neutral-100']">
            <option v-for="option in genderOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>

        <label v-if="draft.gender === 'custom'" :class="['flex', 'flex-col', 'gap-2', 'text-sm', 'md:col-span-2']">
          <span :class="['text-xs', 'tracking-[0.14em]', 'text-neutral-500', 'uppercase', 'dark:text-neutral-400']">{{ t('settings.pages.card.alicization.soul_forge.fields.gender_custom') }}</span>
          <input v-model="draft.genderCustom" :class="['w-full', 'rounded-2xl', 'border', 'border-neutral-200', 'bg-white/70', 'px-4', 'py-3', 'text-sm', 'text-neutral-900', 'outline-none', 'transition', 'focus:border-cyan-400/70', 'dark:border-neutral-700', 'dark:bg-neutral-950/70', 'dark:text-neutral-100']">
        </label>

        <label :class="['flex', 'flex-col', 'gap-2', 'text-sm', 'md:col-span-2']">
          <span :class="['text-xs', 'tracking-[0.14em]', 'text-neutral-500', 'uppercase', 'dark:text-neutral-400']">{{ t('settings.pages.card.alicization.soul_forge.fields.relationship') }}</span>
          <input v-model="draft.relationship" :class="['w-full', 'rounded-2xl', 'border', 'border-neutral-200', 'bg-white/70', 'px-4', 'py-3', 'text-sm', 'text-neutral-900', 'outline-none', 'transition', 'focus:border-cyan-400/70', 'dark:border-neutral-700', 'dark:bg-neutral-950/70', 'dark:text-neutral-100']">
        </label>

        <label :class="['flex', 'flex-col', 'gap-2', 'text-sm']">
          <span :class="['text-xs', 'tracking-[0.14em]', 'text-neutral-500', 'uppercase', 'dark:text-neutral-400']">{{ t('settings.pages.card.alicization.soul_forge.fields.mind_age') }}</span>
          <input v-model.number="draft.mindAge" type="number" min="1" max="120" :class="['w-full', 'rounded-2xl', 'border', 'border-neutral-200', 'bg-white/70', 'px-4', 'py-3', 'text-sm', 'text-neutral-900', 'outline-none', 'transition', 'focus:border-cyan-400/70', 'dark:border-neutral-700', 'dark:bg-neutral-950/70', 'dark:text-neutral-100']">
        </label>
      </div>

      <section :class="['rounded-[24px]', 'border', 'border-neutral-200/80', 'bg-linear-to-br', 'from-neutral-50', 'to-cyan-50/50', 'p-5', 'dark:border-neutral-700/80', 'dark:from-neutral-900', 'dark:to-cyan-950/20']">
        <div :class="['mb-5', 'flex', 'flex-col', 'gap-2', 'md:flex-row', 'md:items-end', 'md:justify-between']">
          <div>
            <div :class="['text-xs', 'tracking-[0.14em]', 'text-neutral-500', 'uppercase', 'dark:text-neutral-400']">
              {{ t('settings.pages.card.alicization.soul_forge.temperament.eyebrow') }}
            </div>
            <h4 :class="['mt-1', 'font-serif', 'text-xl', 'text-neutral-950', 'dark:text-neutral-50']">
              {{ t('settings.pages.card.alicization.soul_forge.temperament.title') }}
            </h4>
          </div>
          <p :class="['max-w-xl', 'text-sm', 'leading-6', 'text-neutral-600', 'dark:text-neutral-300']">
            {{ t('settings.pages.card.alicization.soul_forge.temperament.description') }}
          </p>
        </div>

        <div :class="['grid', 'grid-cols-1', 'gap-4']">
          <article v-for="trait in localizedTraitMetas" :key="trait.key" :class="['rounded-2xl', 'border', 'border-white/70', 'bg-white/75', 'p-4', 'shadow-[0_18px_40px_-34px_rgba(15,23,42,0.55)]', 'backdrop-blur-sm', 'dark:border-neutral-700/70', 'dark:bg-neutral-950/70']">
            <div :class="['flex', 'flex-col', 'gap-2']">
              <div :class="['flex', 'items-center', 'justify-between', 'gap-3']">
                <div :class="['text-base', 'font-medium', 'text-neutral-950', 'dark:text-neutral-50']">
                  {{ trait.label }}
                </div>
                <div :class="['text-[11px]', 'tracking-[0.16em]', 'text-neutral-400', 'uppercase', 'dark:text-neutral-500']">
                  {{ t('settings.pages.card.alicization.soul_forge.temperament.semantic_tuning') }}
                </div>
              </div>
              <p :class="['text-sm', 'leading-6', 'text-neutral-600', 'dark:text-neutral-300']">
                {{ trait.description }}
              </p>
            </div>

            <div :class="['mt-4', 'grid', 'grid-cols-[minmax(72px,112px)_1fr_minmax(72px,112px)]', 'items-center', 'gap-3']">
              <div :class="['text-right', 'text-[11px]', 'leading-5', 'text-neutral-500', 'dark:text-neutral-400']">
                {{ trait.leftLabel }}
              </div>
              <Range
                :model-value="draft[trait.key]"
                :min="0"
                :max="1"
                :step="0.01"
                :class="['w-full']"
                @update:model-value="value => updateTrait(trait.key, value)"
              />
              <div :class="['text-left', 'text-[11px]', 'leading-5', 'text-neutral-500', 'dark:text-neutral-400']">
                {{ trait.rightLabel }}
              </div>
            </div>
          </article>
        </div>
      </section>

      <label :class="['flex', 'flex-col', 'gap-3', 'rounded-[24px]', 'border', 'border-neutral-200/80', 'bg-neutral-50/85', 'p-5', 'dark:border-neutral-700/80', 'dark:bg-neutral-950/60']">
        <div :class="['flex', 'flex-col', 'gap-2', 'md:flex-row', 'md:items-start', 'md:justify-between']">
          <div :class="['flex', 'flex-col', 'gap-2']">
            <div :class="['text-xs', 'tracking-[0.14em]', 'text-neutral-500', 'uppercase', 'dark:text-neutral-400']">{{ t('settings.pages.card.alicization.soul_forge.directives.eyebrow') }}</div>
            <div :class="['text-lg', 'font-medium', 'text-neutral-950', 'dark:text-neutral-50']">
              {{ t('settings.pages.card.alicization.soul_forge.directives.title') }}
            </div>
            <p :class="['max-w-2xl', 'text-sm', 'leading-6', 'text-neutral-600', 'dark:text-neutral-300']">
              {{ t('settings.pages.card.alicization.soul_forge.directives.description') }}
            </p>
          </div>
          <div :class="['inline-flex', 'items-center', 'gap-2', 'self-start', 'rounded-full', 'bg-neutral-900', 'px-3', 'py-1.5', 'text-[11px]', 'tracking-[0.14em]', 'text-white', 'uppercase', 'dark:bg-cyan-200', 'dark:text-neutral-950']">
            <div class="i-solar:bolt-bold-duotone" />
            {{ t('settings.pages.card.alicization.soul_forge.directives.badge') }}
          </div>
        </div>
        <textarea
          v-model="draft.customDirectives"
          :class="['min-h-44', 'w-full', 'rounded-[22px]', 'border', 'border-neutral-200', 'bg-white/80', 'px-4', 'py-4', 'text-sm', 'leading-7', 'text-neutral-900', 'outline-none', 'transition', 'focus:border-cyan-400/70', 'dark:border-neutral-700', 'dark:bg-neutral-950/80', 'dark:text-neutral-100']"
          :placeholder="t('settings.pages.card.alicization.soul_forge.directives.placeholder')"
        />
      </label>

      <details v-if="showMemoryEcho" :class="['group', 'rounded-[24px]', 'border', 'border-neutral-200/80', 'bg-linear-to-br', 'from-amber-50/80', 'to-white', 'p-5', 'dark:border-neutral-700/80', 'dark:from-amber-950/20', 'dark:to-neutral-950']">
        <summary :class="['flex', 'cursor-pointer', 'list-none', 'items-center', 'justify-between', 'gap-3']">
          <div :class="['flex', 'flex-col', 'gap-1']">
            <div :class="['text-xs', 'tracking-[0.14em]', 'text-neutral-500', 'uppercase', 'dark:text-neutral-400']">
              {{ t('settings.pages.card.alicization.soul_forge.memory_echo.eyebrow') }}
            </div>
            <div :class="['text-lg', 'font-medium', 'text-neutral-950', 'dark:text-neutral-50']">
              {{ t('settings.pages.card.alicization.soul_forge.memory_echo.title') }}
            </div>
            <p :class="['text-sm', 'leading-6', 'text-neutral-600', 'dark:text-neutral-300']">
              {{ t('settings.pages.card.alicization.soul_forge.memory_echo.description') }}
            </p>
          </div>
          <div :class="['flex', 'items-center', 'gap-2', 'text-xs', 'tracking-[0.12em]', 'text-neutral-500', 'uppercase', 'dark:text-neutral-400']">
            {{ t('settings.pages.card.alicization.soul_forge.memory_echo.expand') }}
            <div class="i-solar:alt-arrow-down-linear" />
          </div>
        </summary>

        <div :class="['mt-4', 'rounded-[20px]', 'border', 'border-white/80', 'bg-white/85', 'p-4', 'text-sm', 'leading-7', 'text-neutral-700', 'shadow-[0_18px_40px_-34px_rgba(15,23,42,0.55)]', 'whitespace-pre-wrap', 'dark:border-neutral-700/80', 'dark:bg-neutral-950/70', 'dark:text-neutral-200']">
          {{ memoryEchoPreview }}
        </div>
      </details>

      <div v-if="showSaveButton" :class="['flex', 'justify-end']">
        <button
          type="button"
          :class="['inline-flex', 'items-center', 'gap-2', 'rounded-full', 'border', 'border-neutral-900', 'bg-neutral-950', 'px-5', 'py-3', 'text-sm', 'text-white', 'transition', 'disabled:cursor-not-allowed', 'disabled:opacity-60', 'hover:bg-neutral-800', 'dark:border-cyan-200', 'dark:bg-cyan-200', 'dark:text-neutral-950', 'dark:hover:bg-cyan-100']"
          :disabled="saving"
          @click="emit('save')"
        >
          <div class="i-solar:shield-check-bold-duotone" />
          {{ saving
            ? t('settings.pages.card.alicization.soul_forge.save.saving')
            : t('settings.pages.card.alicization.soul_forge.save.idle') }}
        </button>
      </div>
    </div>
  </section>
</template>
