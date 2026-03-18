<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const router = useRouter()
const { t } = useI18n()

// NOTICE: Alicization 人格编辑已经迁移到统一的 airi-card 面板。
// 这个页面保留为纯跳转壳，避免旧版表单继续向主进程发送过时 payload。
void router.replace('/settings/airi-card')
</script>

<template>
  <div :class="['flex', 'min-h-40', 'items-center', 'justify-center', 'rounded-3xl', 'border', 'border-neutral-200', 'bg-neutral-50/80', 'p-6', 'text-sm', 'text-neutral-500', 'dark:border-neutral-700', 'dark:bg-neutral-900/70', 'dark:text-neutral-400']">
    {{ t('tamagotchi.settings.alicization.redirect_notice') }}
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.card.alicization.title
  descriptionKey: tamagotchi.settings.alicization.redirect_notice
  icon: i-solar:atom-bold-duotone
  order: 8
  stageTransition:
    name: slide
</route>
