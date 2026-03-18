<script setup lang="ts">
import { ContextUpdateStrategy } from '@proj-alicization/server-sdk'
import { Section } from '@proj-alicization/stage-ui/components'
import { Button, FieldInput, FieldTextArea, SelectTab } from '@proj-alicization/ui'
import { useI18n } from 'vue-i18n'

const emit = defineEmits<{
  (event: 'sendContextUpdate'): void
  (event: 'sendSparkNotify'): void
}>()
const testStrategy = defineModel<ContextUpdateStrategy>('testStrategy', { required: true })
const testPayload = defineModel<string>('testPayload', { required: true })
const testSparkNotifyPayload = defineModel<string>('testSparkNotifyPayload', { required: true })
const attentionTickInterval = defineModel<number>('attentionTickInterval', { required: true })
const attentionTaskWindow = defineModel<number>('attentionTaskWindow', { required: true })
const attentionRequeueDelay = defineModel<number>('attentionRequeueDelay', { required: true })
const attentionMaxAttempts = defineModel<number>('attentionMaxAttempts', { required: true })
const { t } = useI18n()

const strategyOptions = [
  { label: t('settings.pages.system.sections.section.developer.sections.section.context-flow.actions.strategy.replace'), value: ContextUpdateStrategy.ReplaceSelf },
  { label: t('settings.pages.system.sections.section.developer.sections.section.context-flow.actions.strategy.append'), value: ContextUpdateStrategy.AppendSelf },
]
</script>

<template>
  <div :class="['flex', 'flex-col', 'gap-2']">
    <Section :title="t('settings.pages.system.sections.section.developer.sections.section.context-flow.actions.send.title')" icon="i-solar:plain-2-bold-duotone" inner-class="gap-3" :expand="false">
      <div :class="['flex', 'flex-col', 'gap-2']">
        <div :class="['text-xs', 'font-medium', 'text-neutral-500', 'dark:text-neutral-400']">
          {{ t('settings.pages.system.sections.section.developer.sections.section.context-flow.actions.strategy.label') }}
        </div>
        <SelectTab
          v-model="testStrategy"
          size="sm"
          :options="strategyOptions"
        />
        <FieldTextArea
          v-model="testPayload"
          :label="t('settings.pages.system.sections.section.developer.sections.section.context-flow.actions.payload.label')"
          :description="t('settings.pages.system.sections.section.developer.sections.section.context-flow.actions.payload.description')"
          :input-class="['font-mono', 'min-h-32']"
        />
        <div :class="['flex', 'justify-end']">
          <Button :label="t('settings.pages.system.sections.section.developer.sections.section.context-flow.actions.send_context_update')" icon="i-solar:plain-2-bold-duotone" size="sm" @click="emit('sendContextUpdate')" />
        </div>
      </div>
    </Section>
    <Section :title="t('settings.pages.system.sections.section.developer.sections.section.context-flow.actions.attention.title')" icon="i-solar:settings-bold-duotone" inner-class="gap-3" :expand="false">
      <div :class="['grid', 'gap-3', 'sm:grid-cols-2']">
        <FieldInput
          v-model.number="attentionTickInterval"
          :label="t('settings.pages.system.sections.section.developer.sections.section.context-flow.actions.attention.tick_interval.label')"
          :description="t('settings.pages.system.sections.section.developer.sections.section.context-flow.actions.attention.tick_interval.description')"
          type="number"
        />
        <FieldInput
          v-model.number="attentionTaskWindow"
          :label="t('settings.pages.system.sections.section.developer.sections.section.context-flow.actions.attention.task_window.label')"
          :description="t('settings.pages.system.sections.section.developer.sections.section.context-flow.actions.attention.task_window.description')"
          type="number"
        />
        <FieldInput
          v-model.number="attentionRequeueDelay"
          :label="t('settings.pages.system.sections.section.developer.sections.section.context-flow.actions.attention.requeue_delay.label')"
          :description="t('settings.pages.system.sections.section.developer.sections.section.context-flow.actions.attention.requeue_delay.description')"
          type="number"
        />
        <FieldInput
          v-model.number="attentionMaxAttempts"
          :label="t('settings.pages.system.sections.section.developer.sections.section.context-flow.actions.attention.max_attempts.label')"
          :description="t('settings.pages.system.sections.section.developer.sections.section.context-flow.actions.attention.max_attempts.description')"
          type="number"
        />
      </div>
    </Section>
    <Section :title="t('settings.pages.system.sections.section.developer.sections.section.context-flow.actions.simulate.title')" icon="i-solar:plain-2-bold-duotone" inner-class="gap-3" :expand="false">
      <FieldTextArea
        v-model="testSparkNotifyPayload"
        :label="t('settings.pages.system.sections.section.developer.sections.section.context-flow.actions.simulate.spark_notify.label')"
        :description="t('settings.pages.system.sections.section.developer.sections.section.context-flow.actions.simulate.spark_notify.description')"
        :input-class="['font-mono', 'min-h-44', 'overflow-hidden']"
      />
      <div :class="['flex', 'justify-end']">
        <Button
          :label="t('settings.pages.system.sections.section.developer.sections.section.context-flow.actions.send_spark_notify')"
          icon="i-solar:bell-bing-bold-duotone"
          size="sm"
          @click="emit('sendSparkNotify')"
        />
      </div>
    </Section>
  </div>
</template>
