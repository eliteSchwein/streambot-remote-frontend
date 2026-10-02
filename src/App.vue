<template>
  <v-app>
    <Navigation v-if="store.authenticated" />
    <v-main :class="{ 'with-nav': store.authenticated }">
      <div v-if="!store.bootstrapped" class="fill-screen-center">
        <v-progress-circular indeterminate size="44" width="4" color="primary" />
      </div>
      <router-view v-else />
    </v-main>

    <RegistrationDialog v-if="store.authenticated" />

    <v-snackbar v-model="showRegistrationNotice" :color="registrationNoticeColor" location="bottom right" :timeout="5000">
      {{ registrationNoticeText }}
    </v-snackbar>

    <v-snackbar v-model="showError" color="error" location="bottom right" :timeout="6000">
      {{ store.error }}
    </v-snackbar>
  </v-app>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Navigation from '@/components/Navigation.vue'
import RegistrationDialog from '@/components/RegistrationDialog.vue'
import { useAppStore } from '@/stores/app'
import { useI18n } from '@/i18n'

const store = useAppStore()
const { t } = useI18n()

const showError = computed({
  get: () => Boolean(store.error),
  set: (value) => { if (!value) store.error = null },
})

const showRegistrationNotice = computed({
  get: () => Boolean(store.registrationNotice),
  set: (value) => { if (!value) store.clearRegistrationNotice() },
})

const registrationNoticeColor = computed(() => store.registrationNotice === 'completed' ? 'success' : 'error')
const registrationNoticeText = computed(() => {
  if (store.registrationNotice === 'completed') return t('pairing.completed')
  if (store.registrationNotice === 'expired') return t('pairing.expired')
  if (store.registrationNotice === 'failed') return t('pairing.failed')
  return ''
})
</script>
