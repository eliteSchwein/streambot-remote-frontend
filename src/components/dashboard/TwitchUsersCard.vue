<template>
  <div class="twitch-users-card">
    <v-text-field
      v-model="search"
      prepend-inner-icon="mdi-magnify"
      :placeholder="t('twitchUsers.searchPlaceholder')"
      density="compact"
      variant="outlined"
      clearable
      hide-details
      class="twitch-users-card__search"
      @keydown.enter.prevent="lookupSearch"
    />

    <div v-if="filteredGroups.length" class="twitch-users-card__groups">
      <section v-for="group in filteredGroups" :key="group.key" class="twitch-users-card__group">
        <div class="twitch-users-card__group-title">
          <span>{{ group.title }}</span>
        </div>

        <button
          v-for="user in group.users"
          :key="userKey(user)"
          type="button"
          class="twitch-users-card__user"
          @click="openUser(user, group.key)"
        >
          <v-icon :icon="group.icon" size="18" class="twitch-users-card__role-icon" />
          <div class="twitch-users-card__identity">
            <div class="twitch-users-card__display-name">{{ displayName(user) }}</div>
          </div>
          <v-icon icon="mdi-chevron-right" size="18" class="twitch-users-card__chevron" />
        </button>
      </section>
    </div>

    <div v-if="searchText && filteredGroups.length" class="twitch-users-card__lookup-anyway">
      <v-btn
        size="small"
        variant="text"
        prepend-icon="mdi-account-search-outline"
        :loading="lookupPending"
        @click="lookupSearch"
      >
        {{ t('twitchUsers.lookupUser', { user: searchText }) }}
      </v-btn>
    </div>

    <div v-if="searchText && !filteredGroups.length" class="twitch-users-card__lookup-empty">
      <v-icon icon="mdi-account-search-outline" size="34" />
      <div class="text-body-2">{{ t('twitchUsers.noUserFound') }}</div>
      <v-btn
        color="primary"
        variant="tonal"
        prepend-icon="mdi-account-search-outline"
        :loading="lookupPending"
        @click="lookupSearch"
      >
        {{ t('twitchUsers.lookupUser', { user: searchText }) }}
      </v-btn>
    </div>

    <div v-if="!searchText && !filteredGroups.length" class="empty-state">{{ t('twitchUsers.empty') }}</div>

    <v-dialog v-model="userDialog" max-width="680">
      <v-card rounded="xl" class="twitch-user-dialog-card">
        <v-btn
          icon="mdi-close"
          variant="text"
          class="twitch-user-dialog__close"
          @click="userDialog = false"
        />

        <v-card-text v-if="selectedUser" class="twitch-user-dialog">
          <div class="twitch-user-dialog__profile">
            <v-avatar size="88" class="twitch-user-dialog__avatar">
              <v-img v-if="profileImage(selectedUser)" :src="profileImage(selectedUser)" cover />
              <span v-else>{{ initials(selectedUser) }}</span>
            </v-avatar>
            <div class="min-w-0 flex-grow-1">
              <div class="text-h6 text-truncate">{{ displayName(selectedUser) }}</div>
              <div v-if="login(selectedUser)" class="text-body-2 text-medium-emphasis">@{{ login(selectedUser) }}</div>
              <v-chip v-if="selectedRole" size="small" variant="tonal" class="mt-2" :prepend-icon="roleIcon(selectedRole)">{{ roleTitle(selectedRole) }}</v-chip>
            </div>
          </div>

          <div v-if="selectedUser.description" class="twitch-user-dialog__description text-body-2">
            {{ selectedUser.description }}
          </div>

          <v-progress-linear v-if="lookupPending" indeterminate rounded class="my-4" />

          <div class="twitch-user-dialog__details">
            <div v-if="selectedUser.id" class="twitch-user-dialog__detail">
              <span>{{ t('twitchUsers.userId') }}</span>
              <strong>{{ selectedUser.id }}</strong>
            </div>
            <div v-if="selectedUser.created_at" class="twitch-user-dialog__detail">
              <span>{{ t('twitchUsers.accountCreated') }}</span>
              <strong>{{ formatDate(selectedUser.created_at) }}</strong>
            </div>
            <div v-if="selectedUser.broadcaster_type" class="twitch-user-dialog__detail">
              <span>{{ t('twitchUsers.broadcasterType') }}</span>
              <strong>{{ selectedUser.broadcaster_type }}</strong>
            </div>
            <div v-if="followedAt" class="twitch-user-dialog__detail">
              <span>{{ t('twitchUsers.followingSince') }}</span>
              <strong>{{ formatDate(followedAt) }}</strong>
            </div>
            <div v-if="subscriptionTier" class="twitch-user-dialog__detail">
              <span>{{ t('twitchUsers.subscription') }}</span>
              <strong>{{ subscriptionLabel }}</strong>
            </div>
          </div>

          <v-divider v-if="canModerateSelectedUser" class="my-5" />

          <div v-if="canModerateSelectedUser" class="twitch-user-dialog__moderation">
            <div class="text-subtitle-2 mb-3">{{ t('twitchUsers.moderation') }}</div>

            <div class="twitch-user-dialog__timeout-row">
              <v-text-field
                v-model.number="timeoutValue"
                type="number"
                min="1"
                :max="timeoutMaxForUnit"
                :label="t('twitchUsers.timeoutDuration')"
                density="compact"
                variant="outlined"
                hide-details
              />
              <v-select
                v-model="timeoutUnit"
                :items="timeoutUnits"
                item-title="title"
                item-value="value"
                density="compact"
                variant="outlined"
                hide-details
              />
            </div>

            <v-text-field
              v-model="moderationReason"
              :label="t('twitchUsers.reasonOptional')"
              density="compact"
              variant="outlined"
              clearable
              hide-details
              class="mt-3"
            />

            <div class="twitch-user-dialog__actions mt-4">
              <v-btn color="warning" variant="tonal" prepend-icon="mdi-timer-outline" @click="timeoutUser">
                {{ t('twitchUsers.timeout') }}
              </v-btn>
              <v-btn color="error" variant="tonal" prepend-icon="mdi-account-cancel-outline" @click="banUser">
                {{ t('twitchUsers.ban') }}
              </v-btn>
              <v-btn variant="tonal" prepend-icon="mdi-account-check-outline" @click="unbanUser">
                {{ t('twitchUsers.unban') }}
              </v-btn>
              <v-btn variant="tonal" prepend-icon="mdi-alert-outline" @click="warnUser">
                {{ t('twitchUsers.warn') }}
              </v-btn>
            </div>

          </div>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from '@/i18n'

const props = defineProps<{
  userList: any
  userInfoResult?: any
  viewerIsOwner?: boolean
}>()

const emit = defineEmits<{
  command: [method: string, params: any]
}>()

const { t, formatDateTime } = useI18n()
const search = ref<string | null>('')
const userDialog = ref(false)
const selectedUser = ref<any>(null)
const selectedRole = ref('')
const lookupPending = ref(false)
const lookupTarget = ref('')
const timeoutValue = ref(10)
const timeoutUnit = ref<'seconds' | 'minutes' | 'hours' | 'days'>('minutes')
const moderationReason = ref('')

const groupDefinitions = computed(() => [
  { key: 'streamer', title: t('twitchUsers.broadcaster'), icon: 'mdi-account' },
  { key: 'moderator', title: t('twitchUsers.moderators'), icon: 'mdi-shield' },
  { key: 'vips', title: t('twitchUsers.vips'), icon: 'mdi-star' },
  { key: 'normal', title: t('twitchUsers.users'), icon: 'mdi-account-multiple' },
])

const groups = computed(() => groupDefinitions.value.map(group => ({
  ...group,
  users: normalizeUsers(props.userList?.[group.key]),
})))

const searchText = computed(() => String(search.value ?? '').trim())

const filteredGroups = computed(() => {
  const query = searchText.value.toLowerCase()
  return groups.value
    .map(group => ({
      ...group,
      users: query
        ? group.users.filter(user => `${displayName(user)} ${login(user)}`.toLowerCase().includes(query))
        : group.users,
    }))
    .filter(group => group.users.length)
})

const timeoutUnits = computed(() => [
  { title: t('twitchUsers.seconds'), value: 'seconds' },
  { title: t('twitchUsers.minutes'), value: 'minutes' },
  { title: t('twitchUsers.hours'), value: 'hours' },
  { title: t('twitchUsers.days'), value: 'days' },
])

const timeoutMaxForUnit = computed(() => ({ seconds: 1209600, minutes: 20160, hours: 336, days: 14 })[timeoutUnit.value])
const isBroadcaster = computed(() => selectedRole.value === 'streamer')
const selectedIsModerator = computed(() => selectedRole.value === 'moderator')
const canModerateSelectedUser = computed(() => !isBroadcaster.value && (props.viewerIsOwner === true || !selectedIsModerator.value))
const followedAt = computed(() => selectedUser.value?.follow?.followed_at ?? selectedUser.value?.followed_at ?? '')
const subscriptionTier = computed(() => selectedUser.value?.subscription?.tier ?? selectedUser.value?.subscription_tier ?? '')
const subscriptionLabel = computed(() => {
  const tier = String(subscriptionTier.value || '')
  const label = tier === '1000' ? 'Tier 1' : tier === '2000' ? 'Tier 2' : tier === '3000' ? 'Tier 3' : tier
  return selectedUser.value?.subscription?.is_gift ? `${label} · ${t('twitchUsers.gifted')}` : label
})

watch(() => props.userInfoResult, (result) => {
  if (!result || !lookupPending.value) return
  const payload = unwrapActionResult(result)
  const target = lookupTarget.value.toLowerCase()
  const resultLogin = login(payload).toLowerCase()
  const resultId = String(payload?.id ?? '')
  if (target && resultLogin && target !== resultLogin && target !== resultId) return

  lookupPending.value = false
  if (payload && typeof payload === 'object' && (payload.id || payload.login || payload.display_name)) {
    selectedUser.value = { ...(selectedUser.value ?? {}), ...payload }
    selectedRole.value = roleForUser(payload) || selectedRole.value || 'normal'
    userDialog.value = true
  }
}, { deep: true })

function normalizeUsers(value: any): any[] {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (value && typeof value === 'object') return Object.values(value).filter(Boolean)
  return []
}

function userKey(user: any): string {
  return String(user?.id ?? user?.login ?? user?.display_name ?? JSON.stringify(user))
}

function login(user: any): string {
  return String(user?.login ?? user?.user_login ?? user?.name ?? '').trim()
}

function displayName(user: any): string {
  return String(user?.display_name ?? user?.displayName ?? user?.name ?? user?.login ?? t('common.item')).trim()
}

function profileImage(user: any): string {
  return String(user?.profile_image_url ?? user?.profileImageUrl ?? user?.avatar ?? '').trim()
}

function initials(user: any): string {
  const value = displayName(user)
  return value.slice(0, 2).toUpperCase()
}

function roleTitle(role: string): string {
  return groupDefinitions.value.find(group => group.key === role)?.title ?? t('twitchUsers.users')
}

function roleIcon(role: string): string {
  return groupDefinitions.value.find(group => group.key === role)?.icon ?? 'mdi-account'
}

function roleForUser(user: any): string {
  const id = String(user?.id ?? '')
  const userLogin = login(user).toLowerCase()
  for (const group of groups.value) {
    if (group.users.some(candidate => String(candidate?.id ?? '') === id || (userLogin && login(candidate).toLowerCase() === userLogin))) return group.key
  }
  return ''
}

function unwrapActionResult(result: any): any {
  let value = result?.result ?? result?.data ?? result?.value ?? result?.user ?? result
  for (let i = 0; i < 4; i += 1) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) break
    const nested = value.user ?? value.result ?? value.data
    if (!nested || nested === value || typeof nested !== 'object') break
    value = nested
  }
  return value
}

function requestUserInfo(value: string) {
  const user = value.trim()
  if (!user) return
  lookupTarget.value = user
  lookupPending.value = true
  emit('command', 'twitch_user_info', { user })
}

function openUser(user: any, role: string) {
  selectedUser.value = { ...user }
  selectedRole.value = role
  userDialog.value = true
  requestUserInfo(login(user) || String(user?.id ?? ''))
}

function lookupSearch() {
  const value = searchText.value.replace(/^@/, '')
  if (!value) return
  selectedUser.value = { login: value, display_name: value }
  selectedRole.value = roleForUser(selectedUser.value) || 'normal'
  userDialog.value = true
  requestUserInfo(value)
}

function moderationUser(): string {
  return login(selectedUser.value) || String(selectedUser.value?.id ?? '')
}

function timeoutSeconds(): number {
  const amount = Math.max(1, Number(timeoutValue.value) || 1)
  const multiplier = timeoutUnit.value === 'seconds' ? 1 : timeoutUnit.value === 'minutes' ? 60 : timeoutUnit.value === 'hours' ? 3600 : 86400
  return Math.min(1209600, Math.round(amount * multiplier))
}

function timeoutUser() {
  if (!canModerateSelectedUser.value) return
  emit('command', 'twitch_timeout', { user: moderationUser(), duration: timeoutSeconds(), reason: moderationReason.value.trim() })
}

function banUser() {
  if (!canModerateSelectedUser.value) return
  emit('command', 'twitch_ban', { user: moderationUser(), reason: moderationReason.value.trim() })
}

function unbanUser() {
  if (!canModerateSelectedUser.value) return
  emit('command', 'twitch_unban', { user: moderationUser() })
}

function warnUser() {
  if (!canModerateSelectedUser.value) return
  emit('command', 'twitch_warn', { user: moderationUser(), reason: moderationReason.value.trim() })
}

function formatDate(value: any): string {
  if (!value) return ''
  try { return formatDateTime(value) } catch { return String(value) }
}
</script>
