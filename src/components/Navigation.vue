<template>
  <v-navigation-drawer
    :expand-on-hover="drawerRail"
    permanent
    :rail="drawerRail"
    width="268"
    class="nav-drawer"
  >
    <v-list>
      <v-list-item
        :title="accountLabel"
        :prepend-avatar="avatarUrl"
      >
      </v-list-item>
    </v-list>

    <v-divider />

    <v-list density="compact" nav class="nav-list">
      <v-list-item
        to="/"
        prepend-icon="mdi-view-dashboard-outline"
        :title="t('nav.dashboard')"
        value="dashboard"
        exact
      />
      <v-list-item
        to="/instances"
        prepend-icon="mdi-server-network"
        :title="t('nav.instances')"
        value="instances"
      />
    </v-list>

    <template #append>
      <v-divider />
      <v-list density="compact" nav class="nav-list nav-list--bottom">
        <v-list-item
          to="/settings"
          prepend-icon="mdi-cog-outline"
          :title="t('nav.settings')"
          value="settings"
        />
        <v-list-item
          prepend-icon="mdi-logout"
          :title="t('nav.logout')"
          value="logout"
          @click="store.logout"
        />
      </v-list>
    </template>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useDisplay } from 'vuetify'
import { useAppStore } from '@/stores/app'
import { useI18n } from '@/i18n'
import logo from '@/assets/logo.svg'

const store = useAppStore()
const route = useRoute()
const { mdAndUp } = useDisplay()
const { t } = useI18n()

const isInstanceDashboard = computed(() =>
  /^\/instances\/[^/]+(?:\/)?$/.test(route.path)
)

const drawerRail = computed(() =>
  !mdAndUp.value || isInstanceDashboard.value
)

const accountLabel = computed(() =>
  store.me?.display_name ??
  store.me?.displayName ??
  store.me?.login ??
  store.me?.username ??
  'StreamDing'
)

const accountSubtitle = computed(() => {
  const value =
    store.me?.email ??
    store.me?.login ??
    store.me?.username ??
    t('nav.remotePanel')

  return value === accountLabel.value ? t('nav.remotePanel') : value
})

const avatarUrl = computed(() =>
  store.me?.profile_image_url ??
  store.me?.profileImageUrl ??
  store.me?.avatar_url ??
  store.me?.avatar ??
  logo ??
  ''
)
</script>
