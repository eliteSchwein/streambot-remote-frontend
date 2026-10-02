<template>
  <v-dialog :model-value="Boolean(registration)" persistent max-width="520">
    <v-card v-if="registration" rounded="xl">
      <v-card-title class="d-flex align-center ga-2 pa-5 pb-2">
        <v-icon color="primary">mdi-link-variant-plus</v-icon>
        {{ t('pairing.title') }}
      </v-card-title>

      <v-card-text class="pa-5 pt-3">
        <p class="text-body-2 text-medium-emphasis mb-5">{{ t('pairing.description') }}</p>

        <v-list v-if="registration.name || registration.twitchLogin" bg-color="transparent" density="compact" class="mb-4 pa-0">
          <v-list-item v-if="registration.name" prepend-icon="mdi-server-outline" :title="t('pairing.instance')" :subtitle="registration.name" />
          <v-list-item v-if="registration.twitchLogin" prepend-icon="mdi-twitch" :title="t('pairing.account')" :subtitle="`@${registration.twitchLogin}`" />
        </v-list>

        <div class="pairing-pin text-center py-5 px-4 rounded-lg">
          <div class="text-caption text-medium-emphasis mb-2">{{ t('pairing.pin') }}</div>
          <div class="pairing-pin__value">{{ formattedPin }}</div>
        </div>

        <div class="d-flex align-center justify-center ga-2 mt-5 text-body-2 text-medium-emphasis">
          <v-progress-circular indeterminate size="18" width="2" />
          {{ t('pairing.waiting') }}
        </div>
      </v-card-text>

      <v-card-actions class="px-5 pb-5">
        <v-spacer />
        <v-btn variant="text" @click="store.clearRegistration()">{{ t('common.close') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'
import { useI18n } from '@/i18n'

const store = useAppStore()
const { t } = useI18n()
const registration = computed(() => store.registration?.status === 'pending' ? store.registration : null)
const formattedPin = computed(() => {
  const pin = registration.value?.pin ?? ''
  return /^\d{6}$/.test(pin) ? `${pin.slice(0, 3)} ${pin.slice(3)}` : pin
})
</script>
