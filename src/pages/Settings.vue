<template>
  <PageShell :title="t('settings.title')" :subtitle="t('settings.subtitle')">
    <div class="settings-grid settings-grid--single">
      <v-card rounded="xl" variant="tonal">
        <v-card-text class="pa-6">
          <div class="text-subtitle-1 font-weight-bold mb-1">{{ t('settings.languageTitle') }}</div>
          <div class="text-body-2 text-medium-emphasis mb-5">{{ t('settings.languageDescription') }}</div>

          <v-select
            v-model="selectedLanguage"
            :items="languageItems"
            item-title="title"
            item-value="value"
            :label="t('settings.languageLabel')"
            prepend-inner-icon="mdi-translate"
            variant="outlined"
            hide-details="auto"
            :disabled="loading"
          />

          <div class="d-flex justify-end mt-5">
            <v-btn
              color="primary"
              prepend-icon="mdi-content-save-outline"
              :loading="saving"
              :disabled="loading || !changed"
              @click="save"
            >
              {{ t('common.save') }}
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <v-alert
      v-if="saved"
      class="mt-4"
      type="success"
      variant="tonal"
      closable
      @click:close="saved = false"
    >
      {{ t('settings.saved') }}
    </v-alert>

    <v-alert v-if="error" class="mt-4" type="error" variant="tonal">
      {{ error }}
    </v-alert>
  </PageShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageShell from '@/components/PageShell.vue'
import { setLocale, useI18n, type SupportedLocale } from '@/i18n'
import { useAppStore } from '@/stores/app'

const store = useAppStore()
const { t } = useI18n()

const loading = ref(true)
const saving = ref(false)
const saved = ref(false)
const error = ref<string | null>(null)
const originalLanguage = ref<SupportedLocale>('en')
const selectedLanguage = ref<SupportedLocale>('en')

const languageItems = computed(() => [
  { title: t('settings.languageEnglish'), value: 'en' as SupportedLocale },
  { title: t('settings.languageGerman'), value: 'de' as SupportedLocale },
])

const changed = computed(() => selectedLanguage.value !== originalLanguage.value)

onMounted(async () => {
  try {
    const settings = await store.fetchUserSettings()
    selectedLanguage.value = settings.language
    originalLanguage.value = settings.language
  } catch (err: any) {
    error.value = err?.message ?? t('settings.loadError')
  } finally {
    loading.value = false
  }
})

async function save() {
  saving.value = true
  saved.value = false
  error.value = null

  try {
    const settings = await store.updateUserSettings({ language: selectedLanguage.value })
    selectedLanguage.value = settings.language
    originalLanguage.value = settings.language
    setLocale(settings.language)
    saved.value = true
  } catch (err: any) {
    error.value = err?.message ?? t('settings.saveError')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  align-items: start;
}

.settings-grid--single {
  grid-template-columns: minmax(0, 760px);
}

@media (max-width: 1100px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
}
</style>
