<script setup lang="ts">
import { LocalNotifications } from '@capacitor/local-notifications'
import { Button, FieldInput } from '@proj-alicization/ui'
import { useLocalStorage } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

const title = useLocalStorage('devtools/notifications/title', '')
const content = useLocalStorage('devtools/notifications/content', '')
const { t } = useI18n()

async function sendNotification() {
  const permission = await LocalNotifications.checkPermissions()
  if (permission.display === 'denied') {
    return toast.error(t('settings.pages.system.sections.section.developer.sections.section.notifications.toasts.permission_denied'))
  }
  if (permission.display !== 'granted') {
    await LocalNotifications.requestPermissions()
  }
  await LocalNotifications.schedule({
    notifications: [
      {
        id: Math.floor(Math.random() * 1000000),
        title: title.value,
        body: content.value,
        schedule: {
          at: new Date(Date.now() + 5000),
        },
      },
    ],
  })
}
</script>

<template>
  <div h="[calc(100dvh-40px)]">
    <div relative h-full>
      <div flex="~ col gap-4">
        <div class="rounded-lg bg-neutral-100 p-4 dark:bg-neutral-900">
          <FieldInput
            v-model="title"
            :label="t('settings.pages.system.sections.section.developer.sections.section.notifications.fields.title.label')"
            :description="t('settings.pages.system.sections.section.developer.sections.section.notifications.fields.title.description')"
          />
        </div>
        <div class="rounded-lg bg-neutral-100 p-4 dark:bg-neutral-900">
          <FieldInput
            v-model="content"
            :label="t('settings.pages.system.sections.section.developer.sections.section.notifications.fields.content.label')"
            :description="t('settings.pages.system.sections.section.developer.sections.section.notifications.fields.content.description')"
          />
        </div>
        <Button @click="sendNotification">
          {{ t('settings.pages.system.sections.section.developer.sections.section.notifications.actions.send') }}
        </Button>
      </div>
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: plain
</route>
