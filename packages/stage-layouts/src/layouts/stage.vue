<script setup lang="ts">
import { LoginDrawer } from '@proj-alicization/stage-ui/components/auth/index'
import { useAuthStore } from '@proj-alicization/stage-ui/stores/auth'
import { storeToRefs } from 'pinia'
import { RouterView } from 'vue-router'

const authStore = useAuthStore()
const { isLoginDrawerOpen } = storeToRefs(authStore)
</script>

<template>
  <main h-full font-cute>
    <RouterView />
    <LoginDrawer v-model:open="isLoginDrawerOpen" />
  </main>
</template>
