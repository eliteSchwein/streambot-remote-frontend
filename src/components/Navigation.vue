<template>
  <v-navigation-drawer
    permanent
    :rail="instanceDashboardOpen"
    width="250"
    rail-width="82"
    class="nav-drawer"
  >
    <div class="nav-inner">
      <div class="brand" :class="{ 'brand--rail': instanceDashboardOpen }">
        <img v-if="logoOk" :src="logo" alt="StreamDing" @error="logoOk = false" />
        <div v-if="!instanceDashboardOpen" class="min-w-0">
          <div class="text-subtitle-1 font-weight-bold">StreamDing</div>
          <div class="text-caption text-medium-emphasis">{{ t('nav.remotePanel') }}</div>
        </div>
      </div>

      <v-list nav density="comfortable" class="nav-list">
        <v-list-item
          to="/"
          prepend-icon="mdi-view-dashboard-outline"
          :title="t('nav.dashboard')"
          exact
          rounded="lg"
        />
        <v-list-item
          to="/instances"
          prepend-icon="mdi-server-network"
          :title="t('nav.instances')"
          rounded="lg"
        />
      </v-list>

      <div class="nav-spacer" />

      <v-list nav density="comfortable" class="nav-list nav-list--bottom">
        <v-list-item
          to="/settings"
          prepend-icon="mdi-cog-outline"
          :title="t('nav.settings')"
          rounded="lg"
        />
      </v-list>

      <div class="nav-account" :class="{ 'nav-account--rail': instanceDashboardOpen }">
        <div v-if="!instanceDashboardOpen" class="nav-account__label">{{ accountLabel }}</div>
        <v-btn
          :block="!instanceDashboardOpen"
          :icon="instanceDashboardOpen ? 'mdi-logout' : undefined"
          :prepend-icon="instanceDashboardOpen ? undefined : 'mdi-logout'"
          variant="text"
          rounded="lg"
          :title="t('nav.logout')"
          @click="store.logout"
        >
          <span v-if="!instanceDashboardOpen">{{ t('nav.logout') }}</span>
        </v-btn>
      </div>
    </div>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useI18n } from '@/i18n'
import logo from '@/assets/logo.svg'

const store = useAppStore()
const route = useRoute()
const { t } = useI18n()
const logoOk = ref(true)
const accountLabel = computed(() => store.me?.display_name ?? store.me?.login ?? store.me?.username ?? t('common.signedIn'))
const instanceDashboardOpen = computed(() => route.name === 'instance')
</script>
