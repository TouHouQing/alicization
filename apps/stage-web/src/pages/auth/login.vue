<script setup lang="ts">
import type { OAuthProvider } from '@proj-alicization/stage-ui/libs/auth'

import { LoginDrawer } from '@proj-alicization/stage-ui/components/auth'
import { fetchSession, signIn } from '@proj-alicization/stage-ui/libs/auth'
import { Button } from '@proj-alicization/ui'
import { useMediaQuery } from '@vueuse/core'
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import alicizationLogo from '../../assets/logo.png'

const router = useRouter()
const { t } = useI18n()

const isDesktop = useMediaQuery('(min-width: 768px)')

const loading = ref<Record<OAuthProvider, boolean>>({
  google: false,
  github: false,
})

async function handleSignIn(provider: OAuthProvider) {
  loading.value[provider] = true
  try {
    await signIn(provider)
  }
  catch (error) {
    toast.error(error instanceof Error ? error.message : t('auth.login.errors.unknown'))
  }
  finally {
    loading.value[provider] = false
  }
}

onMounted(() => {
  fetchSession()
    .then((authenticated) => {
      if (authenticated || !isDesktop.value) {
        router.replace('/')
      }
    })
    .catch(() => {})
})

watch(isDesktop, (val) => {
  if (!val) {
    router.replace('/')
  }
})
</script>

<template>
  <div v-if="isDesktop" class="min-h-screen flex flex-col items-center justify-center">
    <div class="mb-8 text-3xl font-bold">
      {{ t('auth.login.title') }}
    </div>
    <div class="max-w-xs w-full flex flex-col gap-3">
      <Button
        :class="['w-full', 'py-2', 'flex', 'items-center', 'justify-center']"
        :loading="loading.google"
        @click="handleSignIn('google')"
      >
        <div v-if="!loading.google" class="i-simple-icons-google" />
        <span>{{ t('auth.login.providers.google') }}</span>
      </Button>
      <Button
        :class="['w-full', 'py-2', 'flex', 'items-center', 'justify-center']"
        :loading="loading.github"
        @click="handleSignIn('github')"
      >
        <div v-if="!loading.github" class="i-simple-icons-github" />
        <span>{{ t('auth.login.providers.github') }}</span>
      </Button>
    </div>
    <div class="mt-8 text-xs text-gray-400">
      <i18n-t keypath="auth.login.legal" tag="span">
        <template #terms>
          <a href="#" class="underline">{{ t('auth.login.terms') }}</a>
        </template>
        <template #privacy>
          <a href="#" class="underline">{{ t('auth.login.privacy') }}</a>
        </template>
      </i18n-t>
    </div>
  </div>

  <div v-else class="min-h-screen flex flex-col items-center justify-center bg-neutral-100 dark:bg-neutral-950">
    <div class="mb-12 flex flex-col items-center gap-4">
      <img :src="alicizationLogo" class="h-24 w-24 rounded-3xl shadow-lg">
      <div class="text-3xl font-bold">
        {{ t('auth.login.mobile_title') }}
      </div>
    </div>

    <LoginDrawer :open="true" />
  </div>
</template>
