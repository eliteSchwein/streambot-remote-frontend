import { defineStore } from 'pinia'
import { backendUrl, backendWsUrl } from '@/utils/backend'
import { applyPreferredLocale } from '@/i18n'

export type RemoteInstance = Record<string, any> & { id: string | number }
export type DashboardSectionName =
  | 'music' | 'giveaway' | 'interactions' | 'auto_macros' | 'macros'
  | 'channel_points' | 'rotating_scene' | 'audio' | 'obs' | 'yolobox'
export type DashboardCardConfig = { macros?: string[]; obs_connection?: string }
export type DashboardLayoutItem = {
  id?: string
  key: DashboardSectionName
  visible: boolean
  order: number
  column?: number
  config?: DashboardCardConfig
}
export type DashboardLayoutSettings = { version: 1 | 2 | 3 | 4; sections: DashboardLayoutItem[] }
export type UserSettings = {
  language: 'en' | 'de'
  dashboard_layouts?: Record<string, DashboardLayoutSettings>
}

export type KofiSettings = {
  streamer_id: string
  webhook_url?: string
  relay_urls: string[]
  verification_token_configured?: boolean
  [key: string]: any
}

export const dashboardSections: DashboardSectionName[] = [
  'music', 'giveaway', 'interactions', 'auto_macros', 'macros',
  'channel_points', 'rotating_scene', 'audio', 'obs', 'yolobox',
]

export function instanceKey(instance: any): string {
  if (!instance || typeof instance !== 'object') return ''
  const value = instance.id ?? instance.instance_id ?? instance.instanceId ?? instance.streambot_id ?? instance.streambotId ?? instance.uuid
  return value === undefined || value === null ? '' : String(value)
}

function normalizeInstance(instance: any): RemoteInstance | null {
  if (!instance || typeof instance !== 'object') return null
  const id = instanceKey(instance)
  if (!id) return null
  return { ...instance, id }
}

function normalizeInstances(value: any): RemoteInstance[] {
  // `notify_instances_update` is the canonical source for the instance list.
  // Backend payloads have used a couple of wrappers over time, including
  // `{ instances: [...] }` and `{ data: { instances: [...] } }`. Unwrap those
  // explicitly instead of treating nested wrapper objects as instance records.
  const unwrap = (input: any, depth = 0): any[] => {
    if (depth > 6 || input === undefined || input === null) return []
    if (Array.isArray(input)) return input
    if (typeof input !== 'object') return []

    for (const key of ['instances', 'items']) {
      if (input[key] !== undefined) return unwrap(input[key], depth + 1)
    }

    if (input.data !== undefined && input.data !== input) {
      return unwrap(input.data, depth + 1)
    }

    // Some backend versions keyed instances by UUID instead of returning an
    // array. Only treat the object as a map when its values look like records.
    const values = Object.values(input)
    if (values.length && values.every(value => value && typeof value === 'object' && !Array.isArray(value))) {
      return values
    }

    return []
  }

  const byId = new Map<string, RemoteInstance>()
  for (const raw of unwrap(value)) {
    const instance = normalizeInstance(raw)
    if (!instance) continue
    byId.set(instanceKey(instance), instance)
  }
  return [...byId.values()]
}

export function instanceIsOwner(instance: any, me?: any): boolean {
  if (!instance || typeof instance !== 'object') return false

  const explicit = instance.is_owner ?? instance.isOwner ?? instance.owner ?? instance.owned_by_me ?? instance.ownedByMe
  if (typeof explicit === 'boolean') return explicit

  const role = String(
    instance.access_role ?? instance.accessRole ?? instance.role ?? instance.permission ?? instance.access ?? ''
  ).trim().toLowerCase()
  if (role) return ['owner', 'broadcaster'].includes(role)

  const ownerId = firstNonEmptyString(
    instance.owner_id, instance.ownerId, instance.user_id, instance.userId, instance.owner?.id, instance.owner?.user_id
  )
  const meId = firstNonEmptyString(me?.id, me?.user_id, me?.userId, me?.twitch_id, me?.twitchId)
  return Boolean(ownerId && meId && ownerId === meId)
}

function firstNonEmptyString(...values: any[]): string {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim()
  }
  return ''
}

export type DashboardSnapshot = Partial<Record<DashboardSectionName, any>> & Record<string, any>
export type StreamDingRegistration = {
  pairingId: string | null
  pin: string
  name: string | null
  twitchLogin: string | null
  status: 'pending' | 'completed' | 'expired' | 'failed'
  expiresAt: string | null
  expiresIn: number | null
}

function asList<T>(value: any, keys: string[]): T[] {
  if (Array.isArray(value)) return value as T[]
  for (const key of keys) {
    const nested = value?.[key]
    if (Array.isArray(nested)) return nested as T[]
    if (nested && typeof nested === 'object') return Object.values(nested) as T[]
  }
  if (value && typeof value === 'object') return Object.values(value) as T[]
  return []
}

function registrationFromMessage(message: any): StreamDingRegistration | null {
  if (!message || typeof message !== 'object') return null
  const event = String(message.type ?? message.method ?? message.event ?? message.kind ?? '')
  const payload = message.params ?? message.data ?? message.payload ?? message.registration ?? message
  const nestedEvent = String(payload?.type ?? payload?.event ?? payload?.kind ?? event)
  if (!['streambot_registration', 'notify_streambot_registration'].includes(event) && !['streambot_registration', 'notify_streambot_registration'].includes(nestedEvent)) return null
  const statusRaw = String(payload?.status ?? message.status ?? 'pending').toLowerCase()
  const status: StreamDingRegistration['status'] =
    ['completed', 'complete', 'verified'].includes(statusRaw) ? 'completed' :
      statusRaw === 'expired' ? 'expired' : ['failed', 'error'].includes(statusRaw) ? 'failed' : 'pending'
  const pin = String(payload?.pin ?? message.pin ?? '')
  if (status === 'pending' && !pin) return null
  return {
    pairingId: payload?.pairing_id ?? payload?.pairingId ?? message?.pairing_id ?? message?.pairingId ?? null,
    pin,
    name: payload?.name ?? payload?.instance_name ?? message?.name ?? null,
    twitchLogin: payload?.twitch_login ?? payload?.twitchLogin ?? message?.twitch_login ?? null,
    status,
    expiresAt: payload?.expires_at ?? payload?.expiresAt ?? message?.expires_at ?? message?.expiresAt ?? null,
    expiresIn: (() => {
      const raw = payload?.remaining_seconds ?? payload?.remainingSeconds ?? payload?.expires_in ?? payload?.expiresIn
        ?? payload?.timeout_remaining ?? payload?.timeoutRemaining ?? payload?.countdown
        ?? message?.remaining_seconds ?? message?.remainingSeconds ?? message?.expires_in ?? message?.expiresIn
      const value = Number(raw)
      return Number.isFinite(value) ? Math.max(0, Math.ceil(value)) : null
    })(),
  }
}

function normalizeDashboardSnapshot(value: any): DashboardSnapshot {
  if (!value || typeof value !== 'object') return {}

  // Current notify_dashboard_snapshot payload:
  // { instance_id, online, connections, sections: { music, obs, ... }, updated_at, version }
  // The UI expects dashboard sections at the root, so unwrap `sections` and keep
  // the useful snapshot metadata alongside them.
  if (value.sections && typeof value.sections === 'object' && !Array.isArray(value.sections)) {
    return {
      ...value.sections,
      ...(value.version !== undefined ? { version: value.version } : {}),
      ...(value.updated_at !== undefined ? { updated_at: value.updated_at } : {}),
      ...(value.online !== undefined ? { online: value.online } : {}),
      ...(value.connections !== undefined ? { connections: value.connections } : {}),
    }
  }

  if (value.dashboard && typeof value.dashboard === 'object') return normalizeDashboardSnapshot(value.dashboard)
  if (value.data?.dashboard && typeof value.data.dashboard === 'object') return normalizeDashboardSnapshot(value.data.dashboard)
  if (value.payload?.data?.dashboard && typeof value.payload.data.dashboard === 'object') return normalizeDashboardSnapshot(value.payload.data.dashboard)
  return value
}

let userSocket: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0
let socketStopped = false

type InstanceSocketState = {
  socket: WebSocket | null
  reconnectTimer: ReturnType<typeof setTimeout> | null
  reconnectAttempts: number
  stopped: boolean
  waiters: Set<SocketWaiter>
}
const instanceSockets = new Map<string, InstanceSocketState>()

type SocketWaiter = {
  predicate: (message: any) => boolean
  resolve: (message: any) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}
const socketWaiters = new Set<SocketWaiter>()

function settleWaiters(message: any) {
  for (const waiter of Array.from(socketWaiters)) {
    if (!waiter.predicate(message)) continue
    clearTimeout(waiter.timer)
    socketWaiters.delete(waiter)
    waiter.resolve(message)
  }
}

function waitForSocketMessage(predicate: (message: any) => boolean, timeout = 10_000): Promise<any> {
  return new Promise((resolve, reject) => {
    const waiter = {} as SocketWaiter
    waiter.predicate = predicate
    waiter.resolve = resolve
    waiter.reject = reject
    waiter.timer = setTimeout(() => {
      socketWaiters.delete(waiter)
      reject(new Error('WebSocket request timed out'))
    }, timeout)
    socketWaiters.add(waiter)
  })
}

function getInstanceSocketState(instanceId: string): InstanceSocketState {
  let state = instanceSockets.get(instanceId)
  if (!state) {
    state = {
      socket: null,
      reconnectTimer: null,
      reconnectAttempts: 0,
      stopped: false,
      waiters: new Set<SocketWaiter>(),
    }
    instanceSockets.set(instanceId, state)
  }
  return state
}

function settleInstanceWaiters(instanceId: string, message: any) {
  const state = instanceSockets.get(instanceId)
  if (!state) return
  for (const waiter of Array.from(state.waiters)) {
    if (!waiter.predicate(message)) continue
    clearTimeout(waiter.timer)
    state.waiters.delete(waiter)
    waiter.resolve(message)
  }
}

function waitForInstanceSocketMessage(instanceId: string, predicate: (message: any) => boolean, timeout = 10_000): Promise<any> {
  const state = getInstanceSocketState(instanceId)
  return new Promise((resolve, reject) => {
    const waiter = {} as SocketWaiter
    waiter.predicate = predicate
    waiter.resolve = resolve
    waiter.reject = reject
    waiter.timer = setTimeout(() => {
      state.waiters.delete(waiter)
      reject(new Error('Instance WebSocket request timed out'))
    }, timeout)
    state.waiters.add(waiter)
  })
}

function socketSend(payload: Record<string, any>) {
  if (!userSocket || userSocket.readyState !== WebSocket.OPEN) throw new Error('WebSocket is not connected')
  userSocket.send(JSON.stringify(payload))
}

function instanceSocketSend(instanceId: string, payload: Record<string, any>) {
  const socket = instanceSockets.get(instanceId)?.socket
  if (!socket || socket.readyState !== WebSocket.OPEN) throw new Error('Instance WebSocket is not connected')
  socket.send(JSON.stringify(payload))
}

function eventType(message: any) {
  return String(message?.type ?? message?.method ?? message?.event ?? message?.kind ?? '')
}

function messagePayload(message: any) {
  return message?.params ?? message?.data ?? message?.payload ?? message ?? {}
}

function isAuthenticationError(message: any) {
  const type = eventType(message)
  if (type !== 'notify_error') return false
  const payload = messagePayload(message)
  const text = String(payload?.message ?? payload?.error ?? message?.message ?? '').toLowerCase()
  return [
    'not logged in', 'not authenticated', 'unauthenticated', 'unauthorized',
    'authentication required', 'login required', 'invalid session', 'session expired',
  ].some(value => text.includes(value))
}

function messageInstanceId(message: any) {
  const payload = messagePayload(message)
  return firstNonEmptyString(
    payload?.instance_id, payload?.instanceId, payload?.streambot_id, payload?.streambotId,
    payload?.instance?.id, payload?.instance?.instance_id, payload?.instance?.streambot_id, payload?.instance?.uuid,
    message?.instance_id, message?.instanceId, message?.streambot_id, message?.streambotId,
    message?.instance?.id, message?.instance?.instance_id, message?.instance?.streambot_id, message?.instance?.uuid,
  )
}

function inferDashboardSection(message: any, payload: any): DashboardSectionName | '' {
  const explicit = firstNonEmptyString(
    payload?.section, payload?.dashboard_section, payload?.dashboardSection, payload?.key,
    message?.section, message?.dashboard_section, message?.dashboardSection,
  )
  if (dashboardSections.includes(explicit as DashboardSectionName)) return explicit as DashboardSectionName

  const method = firstNonEmptyString(payload?.method, payload?.notify, payload?.event, message?.notify)
  const map: Record<string, DashboardSectionName> = {
    notify_music_update: 'music',
    notify_giveaway_update: 'giveaway',
    notify_interactions_update: 'interactions',
    notify_interaction_update: 'interactions',
    notify_auto_macro_update: 'auto_macros',
    notify_auto_macros_update: 'auto_macros',
    notify_macro_update: 'macros',
    notify_channel_points_update: 'channel_points',
    notify_channel_point_update: 'channel_points',
    notify_rotating_scene_update: 'rotating_scene',
    notify_audio_update: 'audio',
    notify_audio_outputs_update: 'audio',
    notify_obs_update: 'obs',
    notify_yolobox_update: 'yolobox',
  }
  return map[method] ?? ''
}

export const useAppStore = defineStore('app', {
  state: () => ({
    bootstrapped: false,
    loading: false,
    me: null as any,
    instances: [] as RemoteInstance[],
    streamers: [] as any[],
    moderators: [] as any[],
    dashboards: {} as Record<string, DashboardSnapshot>,
    userSettings: null as UserSettings | null,
    kofiSettings: {} as Record<string, KofiSettings>,
    registration: null as StreamDingRegistration | null,
    registrationNotice: null as 'completed' | 'expired' | 'failed' | null,
    userSocketConnected: false,
    activeDashboardId: null as string | null,
    error: null as string | null,
  }),
  getters: {
    authenticated: (state) => Boolean(state.me),
  },
  actions: {
    async bootstrap() {
      if (this.bootstrapped) return
      this.loading = true
      this.error = null
      applyPreferredLocale()
      try {
        // The notify-first backend pushes notify_user_update immediately for a valid
        // session. An unauthenticated socket closes/rejects instead. Treat that as a
        // normal logged-out state instead of waiting for the generic 10s request timeout.
        const authResponse = waitForSocketMessage(message => {
          const type = eventType(message)
          return type === 'notify_user_update' || type === '__socket_closed__' || isAuthenticationError(message)
        }, 4_000)
        this.connectUserSocket()
        const authMessage = await authResponse

        if (eventType(authMessage) !== 'notify_user_update') {
          this.me = null
          this.instances = []
          this.dashboards = {}
          this.disconnectUserSocket()
          applyPreferredLocale()
          return
        }

        const userPayload = messagePayload(authMessage)
        this.me = userPayload?.user ?? userPayload?.me ?? userPayload?.data ?? userPayload
        applyPreferredLocale(this.me)
      } catch {
        // Bootstrap failures before authentication are intentionally quiet. The router
        // will show /login; transient realtime errors are surfaced only after login.
        this.me = null
        this.instances = []
        this.dashboards = {}
        this.disconnectUserSocket()
        applyPreferredLocale()
      } finally {
        this.bootstrapped = true
        this.loading = false
      }
    },

    async fetchUserSettings() {
      if (this.userSettings?.language) return this.userSettings
      await this.waitForUserSocket()
      const message = await waitForSocketMessage(message => eventType(message) === 'notify_user_settings_update')
      const payload = messagePayload(message)
      const settings = (payload?.settings ?? payload?.user_settings ?? payload?.data ?? payload) as UserSettings
      this.userSettings = settings
      return settings
    },
    async updateUserSettings(settings: Partial<UserSettings>) {
      await this.waitForUserSocket()
      const merged: UserSettings = {
        ...(this.userSettings ?? { language: (this.me?.language === 'de' ? 'de' : 'en') }),
        ...settings,
        dashboard_layouts: settings.dashboard_layouts ?? this.userSettings?.dashboard_layouts,
      }
      const response = waitForSocketMessage(message => {
        const type = eventType(message)
        return type === 'notify_user_settings_update' || type === 'notify_error'
      })
      // The cloud settings WS API expects mutable setting fields at the top level,
      // not nested under a `settings` object.
      socketSend({ type: 'update_user_settings', ...merged })
      const message = await response
      if (eventType(message) === 'notify_error') {
        const errorPayload = messagePayload(message)
        throw new Error(String(errorPayload?.error ?? errorPayload?.message ?? 'Settings update failed'))
      }
      const payload = messagePayload(message)
      const updated = (payload?.settings ?? payload?.user_settings ?? payload?.data ?? payload) as UserSettings
      this.userSettings = updated
      if (updated?.language) {
        this.me = this.me ? { ...this.me, language: updated.language } : this.me
        applyPreferredLocale(this.me)
      }
      return updated
    },

    async saveKofiSettings(streamerId: string | number, verificationToken: string, relayUrls: string[]) {
      const key = String(streamerId).trim()
      if (!key) throw new Error('streamer_id is required')

      await this.waitForUserSocket()
      const response = waitForSocketMessage(message => {
        const type = eventType(message)
        if (type === 'notify_error') return true
        if (type !== 'notify_kofi_settings_update') return false
        const payload = messagePayload(message)
        const responseId = firstNonEmptyString(
          payload?.streamer_id, payload?.streamerId, payload?.settings?.streamer_id, payload?.settings?.streamerId,
          payload?.kofi?.streamer_id, payload?.kofi?.streamerId, payload?.data?.streamer_id, payload?.data?.streamerId,
        )
        return !responseId || responseId === key
      })

      socketSend({
        type: 'save_kofi_settings',
        streamer_id: key,
        verification_token: verificationToken,
        relay_urls: relayUrls,
      })

      const message = await response
      if (eventType(message) === 'notify_error') {
        const payload = messagePayload(message)
        throw new Error(String(payload?.error ?? payload?.message ?? 'Could not save Ko-fi settings'))
      }

      const payload = messagePayload(message)
      const raw = payload?.settings ?? payload?.kofi ?? payload?.data ?? payload
      const updated: KofiSettings = {
        ...(raw && typeof raw === 'object' ? raw : {}),
        streamer_id: firstNonEmptyString(raw?.streamer_id, raw?.streamerId, payload?.streamer_id, payload?.streamerId, key) || key,
        relay_urls: Array.isArray(raw?.relay_urls ?? raw?.relayUrls) ? (raw?.relay_urls ?? raw?.relayUrls).map((value: any) => String(value)) : relayUrls,
      }
      this.kofiSettings[updated.streamer_id] = updated
      return updated
    },

    async deleteInstance(id: string | number) {
      const instanceId = String(id)
      const instance = this.instances.find(candidate => instanceKey(candidate) === instanceId)
      if (!instance || !instanceIsOwner(instance, this.me)) throw new Error('Only the instance owner can remove this instance')

      await this.waitForUserSocket()
      const response = waitForSocketMessage(message => {
        const type = eventType(message)
        if (type === 'notify_instance_deleted') {
          const payload = messagePayload(message)
          const deletedId = messageInstanceId(message) || instanceKey(payload?.instance ?? payload) || firstNonEmptyString(payload?.instance_id, payload?.id)
          return !deletedId || deletedId === instanceId
        }
        return type === 'notify_error'
      })

      socketSend({ type: 'delete_instance', instance_id: instanceId })
      const message = await response
      if (eventType(message) === 'notify_error') {
        const payload = messagePayload(message)
        throw new Error(String(payload?.error ?? payload?.message ?? 'Could not remove instance'))
      }

      // The notify handler performs the same cleanup, but doing it here keeps the
      // UI deterministic even if the backend broadcasts the refreshed instance list first.
      this.instances = this.instances.filter(candidate => instanceKey(candidate) !== instanceId)
      delete this.dashboards[instanceId]
      this.disconnectInstanceSocket(instanceId)
      if (this.activeDashboardId === instanceId) this.activeDashboardId = null
    },

    async waitForUserSocket(timeout = 10_000) {
      if (userSocket?.readyState === WebSocket.OPEN) return
      this.connectUserSocket()
      await waitForSocketMessage(message => eventType(message) === '__socket_open__', timeout)
    },

    async openDashboard(id: string | number) {
      const key = String(id)
      this.activeDashboardId = key
      await this.waitForInstanceSocket(key)
    },

    closeDashboard(id?: string | number) {
      const key = id === undefined ? this.activeDashboardId : String(id)
      if (key) this.disconnectInstanceSocket(key)
      if (id === undefined || this.activeDashboardId === String(id)) this.activeDashboardId = null
    },

    async streamdingCommand(id: string | number, method: string, params: any = {}, section?: DashboardSectionName) {
      const key = String(id)
      await this.waitForInstanceSocket(key)
      instanceSocketSend(key, {
        type: 'dashboard_action',
        instance_id: key,
        section: section ?? null,
        action: method,
        payload: params ?? {},
      })
    },
    async dashboardAction(id: string | number, section: DashboardSectionName, action: string, payload: any = {}) {
      return this.streamdingCommand(id, action, payload, section)
    },

    async streamdingMethod(id: string | number, method: string, params: any = {}, section?: DashboardSectionName) {
      const key = String(id)
      await this.waitForInstanceSocket(key)
      const payload = params ?? {}
      instanceSocketSend(key, {
        type: 'dashboard_action',
        instance_id: key,
        section: section ?? null,
        action: method,
        payload,
        method,
        params: payload,
      })
    },

    async waitForInstanceSocket(id: string | number, timeout = 10_000) {
      const key = String(id)
      const state = getInstanceSocketState(key)
      if (state.socket?.readyState === WebSocket.OPEN) return
      this.connectInstanceSocket(key)
      const message = await waitForInstanceSocketMessage(
        key,
        message => ['__socket_open__', '__socket_closed__'].includes(eventType(message)) || eventType(message) === 'notify_error',
        timeout,
      )
      if (eventType(message) !== '__socket_open__') {
        const payload = messagePayload(message)
        throw new Error(String(payload?.message ?? payload?.error ?? message?.reason ?? 'Instance WebSocket connection failed'))
      }
    },

    handleInstanceSocketMessage(instanceId: string, message: any) {
      const type = eventType(message)
      const payload = messagePayload(message)

      if (type === 'notify_dashboard_snapshot') {
        const rawSnapshot = payload?.sections
          ? payload
          : payload?.dashboard
            ?? payload?.snapshot?.dashboard
            ?? payload?.snapshot
            ?? payload?.state?.dashboard
            ?? payload?.state
            ?? payload?.data?.dashboard
            ?? payload?.data
            ?? payload
        const snapshot = normalizeDashboardSnapshot(rawSnapshot)
        if (Object.keys(snapshot).length) this.dashboards[instanceId] = snapshot
        return
      }

      if (type === 'notify_dashboard_update') {
        const fullDashboard = payload?.dashboard ?? payload?.state?.dashboard
        if (fullDashboard && typeof fullDashboard === 'object') {
          this.dashboards[instanceId] = {
            ...(this.dashboards[instanceId] ?? {}),
            ...normalizeDashboardSnapshot(fullDashboard),
          }
          return
        }

        const section = inferDashboardSection(message, payload)
        if (!section) {
          const present = dashboardSections.filter(key => Object.prototype.hasOwnProperty.call(payload ?? {}, key))
          if (present.length) {
            const current = { ...(this.dashboards[instanceId] ?? {}) }
            for (const key of present) current[key] = payload[key]
            this.dashboards[instanceId] = current
          }
          return
        }

        const value = payload?.value
          ?? payload?.state
          ?? payload?.section_data
          ?? payload?.sectionData
          ?? payload?.data?.[section]
          ?? payload?.data
          ?? payload?.[section]
          ?? payload?.payload
          ?? payload
        this.dashboards[instanceId] = { ...(this.dashboards[instanceId] ?? {}), [section]: value }
        return
      }

      if (type === 'notify_yolobox_preview') {
        const value = payload?.preview ?? payload?.image ?? payload?.data ?? payload
        const current = this.dashboards[instanceId] ?? {}
        this.dashboards[instanceId] = { ...current, yolobox: { ...(current.yolobox ?? {}), preview: value } }
        return
      }

      if (type === 'notify_instance_presence') {
        const presence = payload?.presence ?? payload?.instance ?? payload
        const online = presence?.online ?? presence?.connected ?? presence?.is_connected
        const lastSeen = presence?.last_seen ?? presence?.lastSeen
        this.instances = this.instances.map(instance => {
          if (instanceKey(instance) !== instanceId) return instance
          return {
            ...instance,
            ...(online !== undefined ? { online: Boolean(online) } : {}),
            ...(lastSeen !== undefined ? { last_seen: lastSeen } : {}),
            id: instanceId,
          }
        })
        return
      }

      if (type === 'notify_moderators_update') {
        this.moderators = asList<any>(payload, ['moderators', 'items', 'data'])
        return
      }

      if (type === 'notify_dashboard_action_result') {
        if (payload?.success === false || payload?.error) this.error = String(payload?.error ?? 'Dashboard action failed')
        return
      }

      if (type === 'notify_error') {
        this.error = String(payload?.message ?? payload?.error ?? message?.message ?? 'Instance WebSocket error')
      }
    },

    connectInstanceSocket(id: string | number) {
      const key = String(id)
      const state = getInstanceSocketState(key)
      if (state.socket && [WebSocket.OPEN, WebSocket.CONNECTING].includes(state.socket.readyState)) return

      state.stopped = false
      if (state.reconnectTimer) {
        clearTimeout(state.reconnectTimer)
        state.reconnectTimer = null
      }

      const socket = new WebSocket(backendWsUrl(`/ws/instance/${encodeURIComponent(key)}`))
      state.socket = socket

      socket.onopen = () => {
        if (state.socket !== socket) return
        state.reconnectAttempts = 0
        settleInstanceWaiters(key, { type: '__socket_open__' })
      }

      socket.onmessage = (event) => {
        if (state.socket !== socket) return
        try {
          const message = JSON.parse(String(event.data))
          settleInstanceWaiters(key, message)
          this.handleInstanceSocketMessage(key, message)
        } catch { /* ignore unknown frames */ }
      }

      socket.onclose = (event) => {
        if (state.socket !== socket) return
        state.socket = null
        settleInstanceWaiters(key, { type: '__socket_closed__', code: event.code, reason: event.reason })
        if (state.stopped) return

        // Revoked instances are removed from the global instance list. Never keep
        // reconnecting a per-instance socket after access disappeared.
        if (!this.instances.some(instance => instanceKey(instance) === key)) {
          state.stopped = true
          return
        }

        state.reconnectAttempts += 1
        const delay = Math.min(30_000, 1000 * 2 ** Math.min(state.reconnectAttempts - 1, 5))
        state.reconnectTimer = setTimeout(() => this.connectInstanceSocket(key), delay)
      }
    },

    disconnectInstanceSocket(id: string | number) {
      const key = String(id)
      const state = instanceSockets.get(key)
      if (!state) return

      state.stopped = true
      if (state.reconnectTimer) {
        clearTimeout(state.reconnectTimer)
        state.reconnectTimer = null
      }
      for (const waiter of state.waiters) {
        clearTimeout(waiter.timer)
        waiter.reject(new Error('Instance WebSocket disconnected'))
      }
      state.waiters.clear()

      if (state.socket) {
        const socket = state.socket
        state.socket = null
        socket.onclose = null
        socket.close()
      }
      instanceSockets.delete(key)
    },

    connectUserSocket() {
      if (userSocket && [WebSocket.OPEN, WebSocket.CONNECTING].includes(userSocket.readyState)) return
      socketStopped = false
      if (reconnectTimer) clearTimeout(reconnectTimer)
      const socket = new WebSocket(backendWsUrl('/ws/user'))
      userSocket = socket
      socket.onopen = () => {
        if (userSocket !== socket) return
        reconnectAttempts = 0
        this.userSocketConnected = true
        settleWaiters({ type: '__socket_open__' })
        // Notify-first backend: authenticated state is pushed automatically on connect.
      }
      socket.onmessage = (event) => {
        if (userSocket !== socket) return
        try {
          const message = JSON.parse(String(event.data))
          settleWaiters(message)
          const type = eventType(message)
          const payload = messagePayload(message)

          const registration = registrationFromMessage(message)
          if (registration) {
            this.registration = registration
            if (registration.status !== 'pending') {
              this.registrationNotice = registration.status
            }

            // A completed registration belongs to the currently authenticated
            // user. If the backend already includes the new instance id in this
            // message, expose it immediately instead of waiting for the following
            // canonical notify_instances_update. The canonical list will replace
            // this lightweight record as soon as it arrives.
            if (registration.status === 'completed') {
              const registeredInstanceId = messageInstanceId(message)
              if (registeredInstanceId) {
                const existing = this.instances.find(instance => instanceKey(instance) === registeredInstanceId)
                const provisional = {
                  ...(existing ?? {}),
                  id: registeredInstanceId,
                  instance_id: registeredInstanceId,
                  ...(registration.name ? { name: registration.name } : {}),
                  is_owner: true,
                  access_role: existing?.access_role ?? 'owner',
                } as RemoteInstance
                this.instances = existing
                  ? this.instances.map(instance => instanceKey(instance) === registeredInstanceId ? provisional : instance)
                  : [...this.instances, provisional]
              }
            }
          }

          if (type === 'notify_user_update') {
            this.me = payload?.user ?? payload?.me ?? payload?.data ?? payload
            applyPreferredLocale(this.me)
            return
          }

          if (type === 'notify_user_settings_update') {
            const settings = (payload?.settings ?? payload?.user_settings ?? payload?.data ?? payload) as UserSettings
            this.userSettings = settings
            if (settings?.language) {
              this.me = this.me ? { ...this.me, language: settings.language } : this.me
              applyPreferredLocale(this.me)
            }
            return
          }

          if (type === 'notify_kofi_settings_update') {
            const raw = payload?.settings ?? payload?.kofi ?? payload?.data ?? payload
            const streamerId = firstNonEmptyString(
              raw?.streamer_id, raw?.streamerId, payload?.streamer_id, payload?.streamerId,
            )
            if (!streamerId) return
            const relayUrls = raw?.relay_urls ?? raw?.relayUrls ?? []
            this.kofiSettings[streamerId] = {
              ...(raw && typeof raw === 'object' ? raw : {}),
              streamer_id: streamerId,
              relay_urls: Array.isArray(relayUrls) ? relayUrls.map((value: any) => String(value)) : [],
            }
            return
          }

          if (type === 'notify_streamers_update') {
            this.streamers = asList<any>(payload, ['streamers', 'items', 'data'])
            return
          }

          if (type === 'notify_moderators_update') {
            this.moderators = asList<any>(payload, ['moderators', 'items', 'data'])
            return
          }

          if (type === 'notify_instances_update') {
            this.instances = normalizeInstances(payload)
            return
          }

          if (type === 'notify_instance_created') {
            // Registration-created instances belong to the current user. Show the
            // lightweight record immediately so the Instances page updates without
            // waiting for the canonical list. Ownership is explicit here so owner-
            // only controls (delete) are available immediately as well.
            const raw = payload?.instance ?? payload?.data?.instance ?? payload
            const instanceId = messageInstanceId(message) || instanceKey(raw)
            if (!instanceId) return

            const existing = this.instances.find(instance => instanceKey(instance) === instanceId)
            const normalized = normalizeInstance({
              ...(existing ?? {}),
              ...(raw && typeof raw === 'object' ? raw : {}),
              id: instanceId,
              instance_id: raw?.instance_id ?? instanceId,
              is_owner: raw?.is_owner ?? raw?.isOwner ?? true,
              access_role: raw?.access_role ?? raw?.accessRole ?? existing?.access_role ?? 'owner',
            })
            if (!normalized) return

            this.instances = existing
              ? this.instances.map(instance => instanceKey(instance) === instanceId ? normalized : instance)
              : [...this.instances, normalized]
            return
          }

          if (type === 'notify_instance_access_granted') {
            // Access grants are not necessarily ownership grants. Add the record if
            // enough data is present, but never invent owner metadata here.
            const raw = payload?.instance ?? payload?.data?.instance ?? payload
            const instanceId = messageInstanceId(message) || instanceKey(raw)
            if (!instanceId) return
            const existing = this.instances.find(instance => instanceKey(instance) === instanceId)
            const normalized = normalizeInstance({
              ...(existing ?? {}),
              ...(raw && typeof raw === 'object' ? raw : {}),
              id: instanceId,
              instance_id: raw?.instance_id ?? instanceId,
            })
            if (!normalized) return
            this.instances = existing
              ? this.instances.map(instance => instanceKey(instance) === instanceId ? normalized : instance)
              : [...this.instances, normalized]
            return
          }

          if (type === 'notify_instance_deleted') {
            const instanceId = messageInstanceId(message)
              || instanceKey(payload?.instance ?? payload)
              || firstNonEmptyString(payload?.instance_id, payload?.id)
            if (!instanceId) return
            this.instances = this.instances.filter(instance => instanceKey(instance) !== instanceId)
            delete this.dashboards[instanceId]
            this.disconnectInstanceSocket(instanceId)
            if (this.activeDashboardId === instanceId) this.activeDashboardId = null
            return
          }

          if (type === 'notify_instance_access_revoked') {
            const instanceId = messageInstanceId(message) || instanceKey(payload?.instance ?? payload)
            if (!instanceId) return
            this.instances = this.instances.filter(instance => instanceKey(instance) !== instanceId)
            delete this.dashboards[instanceId]
            this.disconnectInstanceSocket(instanceId)
            if (this.activeDashboardId === instanceId) this.activeDashboardId = null
            return
          }

          if (type === 'notify_instance_presence') {
            const instanceId = messageInstanceId(message) || instanceKey(payload?.instance ?? payload)
            if (!instanceId) return
            const presence = payload?.presence ?? payload?.instance ?? payload

            // Presence updates are partial by design. Patch only presence fields
            // and preserve the canonical ownership/access metadata from
            // `notify_instances_update`. Replace the array immutably so every
            // consumer reacts immediately.
            const online = presence?.online ?? presence?.connected ?? presence?.is_connected
            const lastSeen = presence?.last_seen ?? presence?.lastSeen
            this.instances = this.instances.map(instance => {
              if (instanceKey(instance) !== instanceId) return instance
              return {
                ...instance,
                ...(online !== undefined ? { online: Boolean(online) } : {}),
                ...(lastSeen !== undefined ? { last_seen: lastSeen } : {}),
                id: instanceId,
              }
            })
            return
          }

          if (type === 'notify_dashboard_snapshot') {
            // Snapshot notifies have changed nesting a few times. Resolve the instance
            // independently from the dashboard body and fall back to the dashboard that
            // is currently open when the notify is scoped by the socket rather than by ID.
            const instanceId = messageInstanceId(message)
              || firstNonEmptyString(payload?.id, payload?.uuid)
              || this.activeDashboardId
              || (this.instances.length === 1 ? instanceKey(this.instances[0]) : '')

            // Some versions can send several cached dashboards in one notification.
            const dashboardMap = payload?.dashboards ?? payload?.instances
            if (dashboardMap && typeof dashboardMap === 'object' && !Array.isArray(dashboardMap)) {
              for (const [key, raw] of Object.entries(dashboardMap)) {
                const snapshot = normalizeDashboardSnapshot((raw as any)?.dashboard ?? (raw as any)?.snapshot ?? raw)
                if (Object.keys(snapshot).length) this.dashboards[String(key)] = snapshot
              }
              return
            }

            if (!instanceId) return
            const rawSnapshot = payload?.sections
              ? payload
              : payload?.dashboard
                ?? payload?.snapshot?.dashboard
                ?? payload?.snapshot
                ?? payload?.state?.dashboard
                ?? payload?.state
                ?? payload?.data?.dashboard
                ?? payload?.data
                ?? payload
            const snapshot = normalizeDashboardSnapshot(rawSnapshot)
            if (Object.keys(snapshot).length) this.dashboards[instanceId] = snapshot
            return
          }

          if (type === 'notify_dashboard_update') {
            const instanceId = messageInstanceId(message)
              || this.activeDashboardId
              || (this.instances.length === 1 ? instanceKey(this.instances[0]) : '')
            if (!instanceId) return

            // A dashboard update may actually contain a complete dashboard. Merge it
            // directly before trying to interpret it as a single-section notification.
            const fullDashboard = payload?.dashboard ?? payload?.state?.dashboard
            if (fullDashboard && typeof fullDashboard === 'object') {
              this.dashboards[instanceId] = {
                ...(this.dashboards[instanceId] ?? {}),
                ...normalizeDashboardSnapshot(fullDashboard),
              }
              return
            }

            let section = inferDashboardSection(message, payload)
            if (!section) {
              const present = dashboardSections.filter(key => Object.prototype.hasOwnProperty.call(payload ?? {}, key))
              if (present.length) {
                const current = { ...(this.dashboards[instanceId] ?? {}) }
                for (const key of present) current[key] = payload[key]
                this.dashboards[instanceId] = current
              }
              return
            }

            const value = payload?.value
              ?? payload?.state
              ?? payload?.section_data
              ?? payload?.sectionData
              ?? payload?.data?.[section]
              ?? payload?.data
              ?? payload?.[section]
              ?? payload?.payload
              ?? payload
            this.dashboards[instanceId] = { ...(this.dashboards[instanceId] ?? {}), [section]: value }
            return
          }

          if (type === 'notify_yolobox_preview') {
            const instanceId = messageInstanceId(message)
              || this.activeDashboardId
              || (this.instances.length === 1 ? instanceKey(this.instances[0]) : '')
            if (!instanceId) return
            const value = payload?.preview ?? payload?.image ?? payload?.data ?? payload
            const current = this.dashboards[instanceId] ?? {}
            this.dashboards[instanceId] = { ...current, yolobox: { ...(current.yolobox ?? {}), preview: value } }
            return
          }

          if (type === 'notify_dashboard_action_result') {
            if (payload?.success === false || payload?.error) this.error = String(payload?.error ?? 'Dashboard action failed')
            return
          }

          if (type === 'notify_error') {
            // Authentication failures are expected while logged out/expired and should
            // redirect to login without a scary realtime error snackbar.
            if (!this.authenticated && isAuthenticationError(message)) return
            this.error = String(payload?.message ?? payload?.error ?? message?.message ?? 'WebSocket error')
            return
          }
        } catch { /* ignore unknown frames */ }
      }
      socket.onclose = (event) => {
        if (userSocket !== socket) return
        userSocket = null
        this.userSocketConnected = false
        settleWaiters({ type: '__socket_closed__', code: event.code, reason: event.reason })
        if (socketStopped) return

        // If the very first user socket dies before authentication, this is normally
        // simply a missing/expired login session. Do not reconnect-loop in the background.
        if (!this.me && !this.bootstrapped) {
          socketStopped = true
          return
        }

        reconnectAttempts += 1
        const delay = Math.min(30_000, 1000 * 2 ** Math.min(reconnectAttempts - 1, 5))
        reconnectTimer = setTimeout(() => this.connectUserSocket(), delay)
      }
    },
    disconnectUserSocket() {
      socketStopped = true
      this.userSocketConnected = false
      for (const instanceId of Array.from(instanceSockets.keys())) this.disconnectInstanceSocket(instanceId)
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
      for (const waiter of socketWaiters) {
        clearTimeout(waiter.timer)
        waiter.reject(new Error('WebSocket disconnected'))
      }
      socketWaiters.clear()
      if (userSocket) { const socket = userSocket; userSocket = null; socket.onclose = null; socket.close() }
    },
    clearRegistration() { this.registration = null },
    clearRegistrationNotice() { this.registrationNotice = null },
    logout() {
      this.disconnectUserSocket()
      window.location.assign(backendUrl('/auth/logout'))
    },
  },
})
