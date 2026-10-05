<template>
  <PageShell :title="t('settings.kofiTitle')" :subtitle="t('settings.kofiDescription')">
    <v-card rounded="xl" variant="tonal" class="kofi-card">
      <v-card-text class="pa-6">
        <v-alert
          v-if="ownerStreamerItems.length === 0"
          type="info"
          variant="tonal"
          density="comfortable"
        >
          {{ t('settings.kofiNeedsInstance') }}
        </v-alert>

        <template v-else>
          <v-select
            v-if="ownerStreamerItems.length > 1"
            v-model="selectedStreamerId"
            :items="ownerStreamerItems"
            item-title="title"
            item-value="value"
            :label="t('settings.kofiStreamer')"
            prepend-inner-icon="mdi-account-star-outline"
            variant="outlined"
            hide-details="auto"
            class="mb-6"
          />

          <v-card variant="outlined" rounded="lg" class="kofi-webhook-card">
            <v-card-text class="pa-5">
              <div class="d-flex align-center ga-2 mb-1">
                <v-icon icon="mdi-webhook" />
                <div class="text-subtitle-1 font-weight-bold">{{ t('settings.kofiWebhookUrl') }}</div>
              </div>
              <div class="text-body-2 text-medium-emphasis mb-4">
                {{ t('settings.kofiWebhookHint') }}
              </div>

              <v-alert
                type="info"
                variant="tonal"
                density="compact"
                class="mb-4"
              >
                <div class="d-flex align-center justify-space-between ga-3 flex-wrap">
                  <span>{{ t('settings.kofiManageHint') }}</span>
                  <v-btn
                    href="https://ko-fi.com/manage/webhooks"
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="text"
                    size="small"
                    append-icon="mdi-open-in-new"
                  >
                    {{ t('settings.kofiManageOpen') }}
                  </v-btn>
                </div>
              </v-alert>

              <div class="kofi-webhook-row">
                <v-text-field
                  :model-value="kofiWebhookUrl"
                  :placeholder="t('settings.kofiWebhookUnavailable')"
                  variant="outlined"
                  readonly
                  hide-details
                  class="kofi-webhook-field"
                />
                <v-btn
                  color="primary"
                  variant="tonal"
                  :prepend-icon="webhookCopied ? 'mdi-check' : 'mdi-content-copy'"
                  :disabled="!kofiWebhookUrl"
                  class="kofi-copy-btn"
                  @click="copyWebhookUrl"
                >
                  {{ webhookCopied ? t('settings.kofiCopied') : t('settings.kofiCopy') }}
                </v-btn>
              </div>
            </v-card-text>
          </v-card>

          <v-divider class="my-6" />

          <div class="text-subtitle-1 font-weight-bold mb-4">{{ t('settings.kofiAuthenticationTitle') }}</div>

          <v-text-field
            v-model="verificationToken"
            :label="t('settings.kofiVerificationToken')"
            :hint="currentTokenConfigured ? t('settings.kofiTokenConfiguredHint') : t('settings.kofiTokenHint')"
            persistent-hint
            prepend-inner-icon="mdi-key-outline"
            variant="outlined"
            :type="showToken ? 'text' : 'password'"
            :append-inner-icon="showToken ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
            autocomplete="off"
            class="mb-5"
            @click:append-inner="showToken = !showToken"
          />

          <v-textarea
            v-model="relayUrlsText"
            :label="t('settings.kofiRelayUrls')"
            :hint="t('settings.kofiRelayHint')"
            persistent-hint
            prepend-inner-icon="mdi-call-split"
            variant="outlined"
            rows="4"
            auto-grow
          />

          <div class="d-flex align-center justify-space-between ga-3 mt-5 flex-wrap">
            <div class="text-caption text-medium-emphasis">
              {{ t('settings.kofiRelayLimit') }}
            </div>
            <v-btn
              color="primary"
              prepend-icon="mdi-content-save-outline"
              :loading="kofiSaving"
              :disabled="!selectedStreamerId || !canSaveKofi"
              @click="saveKofi"
            >
              {{ t('common.save') }}
            </v-btn>
          </div>

          <v-alert
            v-if="kofiSaved"
            type="success"
            variant="tonal"
            density="compact"
            class="mt-4"
            closable
            @click:close="kofiSaved = false"
          >
            {{ t('settings.kofiSaved') }}
          </v-alert>
          <v-alert v-if="kofiError" type="error" variant="tonal" density="compact" class="mt-4">
            {{ kofiError }}
          </v-alert>
        </template>
      </v-card-text>
    </v-card>
  </PageShell>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import PageShell from '@/components/PageShell.vue'
import { useI18n } from '@/i18n'
import { instanceIsOwner, useAppStore } from '@/stores/app'

const store = useAppStore()
const { t } = useI18n()

const selectedStreamerId = ref('')
const verificationToken = ref('')
const relayUrlsText = ref('')
const showToken = ref(false)
const kofiSaving = ref(false)
const kofiSaved = ref(false)
const kofiError = ref('')
const webhookCopied = ref(false)
let copyResetTimer: ReturnType<typeof setTimeout> | null = null

function firstString(...values: any[]) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim()
  }
  return ''
}

function streamerIdFrom(value: any) {
  return firstString(value?.streamer_id, value?.streamerId, value?.channel_id, value?.channelId, value?.broadcaster_id, value?.broadcasterId, value?.twitch_id, value?.twitchId, value?.id, value?.user_id, value?.userId)
}

function streamerLabel(value: any, fallbackId: string) {
  return firstString(value?.display_name, value?.displayName, value?.channel_display_name, value?.channelDisplayName, value?.login, value?.channel_login, value?.username, fallbackId)
}

const ownerStreamerItems = computed(() => {
  const ownedInstances = store.instances.filter(instance => instanceIsOwner(instance, store.me))
  if (!ownedInstances.length) return []

  const knownStreamers = new Map<string, any>()
  for (const streamer of store.streamers ?? []) {
    const id = streamerIdFrom(streamer)
    if (id) knownStreamers.set(id, streamer)
  }

  const currentUserId = firstString(store.me?.twitch_id, store.me?.twitchId, store.me?.id, store.me?.user_id, store.me?.userId)
  const items = new Map<string, { title: string; value: string }>()

  for (const instance of ownedInstances) {
    const id = firstString(
      instance?.streamer_id, instance?.streamerId,
      instance?.channel_id, instance?.channelId,
      instance?.broadcaster_id, instance?.broadcasterId,
      instance?.streamer?.id, instance?.streamer?.twitch_id,
      currentUserId,
    )
    if (!id) continue
    const streamer = knownStreamers.get(id) ?? instance?.streamer ?? instance
    items.set(id, { title: streamerLabel(streamer, id), value: id })
  }

  return [...items.values()].sort((a, b) => a.title.localeCompare(b.title))
})

const currentKofi = computed(() => selectedStreamerId.value ? store.kofiSettings[selectedStreamerId.value] ?? null : null)
const kofiWebhookUrl = computed(() => firstString(currentKofi.value?.webhook_url, currentKofi.value?.webhookUrl))
const currentTokenConfigured = computed(() => Boolean(
  currentKofi.value?.verification_token_configured ??
  currentKofi.value?.verificationTokenConfigured ??
  currentKofi.value?.has_verification_token ??
  currentKofi.value?.hasVerificationToken
))

const relayUrls = computed(() => relayUrlsText.value
  .split(/\r?\n/)
  .map(value => value.trim())
  .filter(Boolean)
)

const canSaveKofi = computed(() => {
  if (relayUrls.value.length > 10) return false
  return Boolean(verificationToken.value.trim())
})

watch(ownerStreamerItems, items => {
  if (!items.length) {
    selectedStreamerId.value = ''
    return
  }
  if (!items.some(item => item.value === selectedStreamerId.value)) selectedStreamerId.value = items[0].value
}, { immediate: true })

watch([selectedStreamerId, currentKofi], () => {
  const settings = currentKofi.value
  verificationToken.value = ''
  relayUrlsText.value = Array.isArray(settings?.relay_urls ?? settings?.relayUrls)
    ? (settings?.relay_urls ?? settings?.relayUrls).join('\n')
    : ''
  kofiSaved.value = false
  kofiError.value = ''
  webhookCopied.value = false
}, { immediate: true })

async function saveKofi() {
  if (!selectedStreamerId.value || !canSaveKofi.value) return
  kofiSaving.value = true
  kofiSaved.value = false
  kofiError.value = ''

  try {
    await store.saveKofiSettings(selectedStreamerId.value, verificationToken.value.trim(), relayUrls.value)
    verificationToken.value = ''
    kofiSaved.value = true
  } catch (err: any) {
    kofiError.value = String(err?.message ?? t('settings.kofiSaveError'))
  } finally {
    kofiSaving.value = false
  }
}

async function copyWebhookUrl() {
  const url = kofiWebhookUrl.value
  if (!url) return

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = url
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      textarea.remove()
    }

    webhookCopied.value = true
    if (copyResetTimer) clearTimeout(copyResetTimer)
    copyResetTimer = setTimeout(() => {
      webhookCopied.value = false
    }, 1800)
  } catch (err: any) {
    kofiError.value = String(err?.message ?? t('settings.kofiCopyError'))
  }
}
</script>

