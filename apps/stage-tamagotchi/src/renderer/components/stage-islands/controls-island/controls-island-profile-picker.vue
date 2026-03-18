<script setup lang="ts">
import { useElectronEventaInvoke } from '@proj-alicization/electron-vueuse'
import { ProfileSwitcherPopover } from '@proj-alicization/stage-ui/components'

import { electronOpenSettings } from '../../../../shared/eventa'

const openSettings = useElectronEventaInvoke(electronOpenSettings)

function handleNavigation() {
  openSettings({ route: '/settings/airi-card' })
}
</script>

<template>
  <ProfileSwitcherPopover placement="up" @create="handleNavigation" @manage="handleNavigation">
    <template #default="{ open, toggle, activeCard }">
      <slot :open="open" :toggle="toggle" :active-card="activeCard" />
    </template>
  </ProfileSwitcherPopover>
</template>
