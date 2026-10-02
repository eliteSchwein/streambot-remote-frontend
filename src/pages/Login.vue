<template>
  <div class="login-page">
    <v-card width="100%" max-width="560" class="pa-7 pa-sm-9" rounded="xl" elevation="8">
      <div class="d-flex align-center ga-4 mb-7">
        <v-avatar size="58" color="primary" variant="tonal">
          <v-icon size="31">mdi-robot-happy-outline</v-icon>
        </v-avatar>
        <div>
          <h1 class="text-h4 font-weight-bold">StreamDing Remote</h1>
          <p class="text-body-2 text-medium-emphasis mt-1">{{ t('login.subtitle') }}</p>
        </div>
      </div>

      <v-alert v-if="store.error" type="error" variant="tonal" class="mb-5">{{ store.error }}</v-alert>

      <p class="text-body-2 text-medium-emphasis mb-5">
        {{ t('login.description') }}
      </p>

      <v-btn
        block
        size="large"
        color="primary"
        prepend-icon="mdi-twitch"
        :href="backendUrl('/auth/login')"
      >
        {{ t('login.twitch') }}
      </v-btn>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { useAppStore } from '@/stores/app'
import { useI18n } from '@/i18n'
import { backendUrl } from '@/utils/backend'

const store = useAppStore()
const { t } = useI18n()
</script>
