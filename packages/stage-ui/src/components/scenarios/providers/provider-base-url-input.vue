<script setup lang="ts">
import { FieldInput } from '@proj-alicization/ui'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  placeholder?: string
  required?: boolean
  label?: string
  description?: string
}>()

const modelValue = defineModel<string>({ required: true })
const { t } = useI18n()
</script>

<template>
  <FieldInput
    v-model="modelValue"
    :label="props.label || t('settings.dialogs.onboarding.baseUrl')"
    :description="props.description || t('settings.dialogs.onboarding.baseUrlHelp')"
    :placeholder="props.placeholder"
    :required="props.required"
    type="text"
  />
</template>
