import { readonly, ref } from 'vue'

export type SupportedLocale = 'en' | 'de'

type Messages = Record<string, any>

const messages: Record<SupportedLocale, Messages> = {
  en: {
    common: {
      refresh: 'Refresh',
      save: 'Save',
      back: 'Back',
      online: 'Online',
      offline: 'Offline',
      yes: 'Yes',
      no: 'No',
      signedIn: 'Signed in',
      instance: 'Instance',
      macro: 'Macro',
      interaction: 'Interaction',
      close: 'Close',
      cancel: 'Cancel',
      item: 'Item',
    },
    nav: {
      remotePanel: 'Remote Panel',
      dashboard: 'Dashboard',
      instances: 'Instances',
      settings: 'Settings',
      logout: 'Log out',
    },
    login: {
      subtitle: 'Secure remote administration for StreamDing.',
      description: 'Sign in with Twitch to access the StreamDing instances available to your account.',
      twitch: 'Sign in with Twitch',
    },
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Remote StreamDing instances available to your Twitch account.',
      account: 'Account',
      twitchLogin: 'Twitch login',
      instances: 'Instances',
      onlineCount: '{count} online',
      noAccess: 'No access',
      remoteInstances: 'Remote instances',
      empty: 'No StreamDing instance currently grants you remote access.',
      remoteInstance: 'Remote StreamDing instance',
      lastSeen: 'Last seen {date}',
      loadError: 'Could not load instances.',
    },
    instances: {
      title: 'Instances',
      subtitle: 'StreamDing installations you currently have remote access to.',
      available: 'Available instances',
      empty: 'No StreamDing instance currently grants you remote access.',
      info: 'Instances are paired from the local StreamDing integration. Moderator access is synchronized by StreamDing and is not managed in this panel.',
      lastSeen: 'Last seen {date}',
      loadError: 'Could not load instances.',
      remove: 'Remove instance',
      removeTitle: 'Remove instance',
      removeConfirm: 'Remove {name}? This permanently unpairs the instance and removes its cloud state. This action cannot be undone.',
      removeError: 'Could not remove instance.',
    },
    instance: {
      subtitle: 'Remote controls provided by this StreamDing instance.',
      unavailable: 'This instance is no longer available to your account.',
      connection: 'Connection',
      remoteStreamDing: 'Remote StreamDing',
      lastSeen: 'Last seen {date}',
      macros: 'Macros',
      remoteActions: 'Remote actions',
      interactions: 'Interactions',
      currentQueue: 'Current queue',
      noMacros: 'No remote macros are exposed by this StreamDing.',
      status: 'Status',
      queuedInteraction: 'Queued interaction',
      loadError: 'Could not load remote state.',
      runError: 'Could not run macro.',
      liveState: 'Live state',
      websocket: 'User WebSocket',
      sections: 'Dashboard sections',
      cachedDashboard: 'Cached remote state',
      shuffle: 'Shuffle',
      loop: 'Loop',
      emptySection: 'No data is currently available for this section.',
      previewUnavailable: 'No Yolobox preview is currently available.',
      actionError: 'Remote action failed.',
      snapshotVersion: 'Snapshot version',
      connections: 'Connections',
      noTrack: 'No track playing',
      volume: 'Volume',
      playlistTracks: '{count} playlist tracks',
      songRequests: 'Song requests',
      queue: 'Queue',
      active: 'Active',
      inactive: 'Inactive',
      entries: 'Entries',
      command: 'Command',
      noGiveaway: 'No giveaway is currently running.',
      intervalSeconds: 'Every {count} seconds',
      nextTriggerIn: 'Next trigger in {time}',
      visibleMacros: 'Visible macros',
      selectMacros: 'Select macros',
      searchMacros: 'Search macros',
      selectAll: 'Select all',
      clearSelection: 'Clear',
      macrosSelected: '{count} macros selected',
      chooseMacros: 'Choose macros to show on this card.',
      obsConnection: 'OBS connection',
      localOnly: 'Local only',
      noRotatingScenes: 'No rotating scenes are configured.',
      outputs: 'Outputs',
      noOutput: 'No output linked',
      noScenes: 'No scenes are available for this OBS connection.',
      noInteractions: 'No interactions are currently queued.',
      interactionDuration: 'Duration: {duration}',
      interactionEta: 'ETA: {duration}',
      interactionPleaseWait: 'Please wait…',
      interactionAlerts: '{count} alert(s)',
      interactionCancel: 'Cancel interaction',
      interactionQueued: 'Queued',
      interactionActive: 'Active',
      interactionFinished: 'Finished',
      interactionCancelled: 'Cancelled',
      interactionFailed: 'Failed',
      interactionCommand: 'Command',
      interactionEvent: 'Event',
      interactionChannelPoint: 'Channel Point',
      interactionOther: 'Interaction',
      customizeDashboard: 'Customize dashboard',
      customizeDashboardHint: 'Choose which sections are visible and set their order for this instance.',
      editDashboard: 'Edit dashboard',
      finishEditing: 'Done',
      addCard: 'Add card',
      removeCard: 'Remove card',
      moveCard: 'Move card',
      dragCardsHint: 'Drag cards to rearrange them. Remove cards with the × button.',
      noDashboardCards: 'No dashboard cards',
      noDashboardCardsHint: 'Add a card to build this instance dashboard.',
      resetDashboard: 'Reset layout',
    },
    sections: {
      music: 'Music', giveaway: 'Giveaway', interactions: 'Interactions', auto_macros: 'Auto macros', macros: 'Macros', channel_points: 'Channel points', rotating_scene: 'Rotating scene', audio: 'Audio', obs: 'OBS', yolobox: 'Yolobox',
    },
    pairing: {
      title: 'Pair StreamDing',
      description: 'A StreamDing is requesting access to your cloud account. Enter this PIN in the local StreamDing panel to finish pairing.',
      instance: 'Instance',
      account: 'Twitch account',
      pin: 'Pairing PIN',
      waiting: 'Waiting for StreamDing to verify the PIN…',
      completed: 'StreamDing pairing completed.',
      expired: 'The StreamDing pairing request expired.',
      failed: 'StreamDing pairing failed.',
    },

    settings: {
      title: 'Settings',
      subtitle: 'Manage your personal remote admin preferences.',
      languageTitle: 'Language',
      languageDescription: 'Choose the language used by the remote admin panel. This setting is stored with your account.',
      languageLabel: 'Panel language',
      languageEnglish: 'English',
      languageGerman: 'German',
      saved: 'Settings saved.',
      loadError: 'Could not load user settings.',
      saveError: 'Could not save user settings.',
    },
    errors: {
      backend: 'Could not connect to the remote admin backend.',
    },
  },
  de: {
    common: {
      refresh: 'Aktualisieren',
      save: 'Speichern',
      back: 'Zurück',
      online: 'Online',
      offline: 'Offline',
      yes: 'Ja',
      no: 'Nein',
      signedIn: 'Angemeldet',
      instance: 'Instanz',
      macro: 'Makro',
      interaction: 'Interaktion',
      close: 'Schließen',
      cancel: 'Abbrechen',
      item: 'Eintrag',
    },
    nav: {
      remotePanel: 'Remote-Panel',
      dashboard: 'Dashboard',
      instances: 'Instanzen',
      settings: 'Einstellungen',
      logout: 'Abmelden',
    },
    login: {
      subtitle: 'Sichere Fernverwaltung für StreamDing.',
      description: 'Melde dich mit Twitch an, um auf die für deinen Account verfügbaren StreamDing-Instanzen zuzugreifen.',
      twitch: 'Mit Twitch anmelden',
    },
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Remote-StreamDing-Instanzen, die für deinen Twitch-Account verfügbar sind.',
      account: 'Account',
      twitchLogin: 'Twitch-Anmeldung',
      instances: 'Instanzen',
      onlineCount: '{count} online',
      noAccess: 'Kein Zugriff',
      remoteInstances: 'Remote-Instanzen',
      empty: 'Aktuell gewährt dir keine StreamDing-Instanz Remote-Zugriff.',
      remoteInstance: 'Remote-StreamDing-Instanz',
      lastSeen: 'Zuletzt gesehen: {date}',
      loadError: 'Instanzen konnten nicht geladen werden.',
    },
    instances: {
      title: 'Instanzen',
      subtitle: 'StreamDing-Installationen, auf die du aktuell Remote-Zugriff hast.',
      available: 'Verfügbare Instanzen',
      empty: 'Aktuell gewährt dir keine StreamDing-Instanz Remote-Zugriff.',
      info: 'Instanzen werden über die lokale StreamDing-Integration gekoppelt. Moderator-Zugriffe werden von StreamDing synchronisiert und nicht in diesem Panel verwaltet.',
      lastSeen: 'Zuletzt gesehen: {date}',
      loadError: 'Instanzen konnten nicht geladen werden.',
      remove: 'Instanz entfernen',
      removeTitle: 'Instanz entfernen',
      removeConfirm: '{name} entfernen? Dadurch wird die Instanz dauerhaft entkoppelt und ihr Cloud-Status gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.',
      removeError: 'Instanz konnte nicht entfernt werden.',
    },
    instance: {
      subtitle: 'Remote-Steuerung dieser StreamDing-Instanz.',
      unavailable: 'Diese Instanz ist für deinen Account nicht mehr verfügbar.',
      connection: 'Verbindung',
      remoteStreamDing: 'Remote-StreamDing',
      lastSeen: 'Zuletzt gesehen: {date}',
      macros: 'Makros',
      remoteActions: 'Remote-Aktionen',
      interactions: 'Interaktionen',
      currentQueue: 'Aktuelle Warteschlange',
      noMacros: 'Dieser StreamDing stellt keine Remote-Makros bereit.',
      status: 'Status',
      queuedInteraction: 'Interaktion in Warteschlange',
      loadError: 'Remote-Status konnte nicht geladen werden.',
      runError: 'Makro konnte nicht ausgeführt werden.',
      liveState: 'Live-Status',
      websocket: 'Benutzer-WebSocket',
      sections: 'Dashboard-Bereiche',
      cachedDashboard: 'Zwischengespeicherter Remote-Status',
      shuffle: 'Zufällig',
      loop: 'Wiederholen',
      emptySection: 'Für diesen Bereich sind aktuell keine Daten verfügbar.',
      previewUnavailable: 'Aktuell ist keine Yolobox-Vorschau verfügbar.',
      actionError: 'Remote-Aktion fehlgeschlagen.',
      snapshotVersion: 'Snapshot-Version',
      connections: 'Verbindungen',
      noTrack: 'Kein Titel wird abgespielt',
      volume: 'Lautstärke',
      playlistTracks: '{count} Titel in der Playlist',
      songRequests: 'Songrequests',
      queue: 'Warteschlange',
      active: 'Aktiv',
      inactive: 'Inaktiv',
      entries: 'Teilnehmer',
      command: 'Befehl',
      noGiveaway: 'Aktuell läuft kein Gewinnspiel.',
      intervalSeconds: 'Alle {count} Sekunden',
      nextTriggerIn: 'Nächste Ausführung in {time}',
      visibleMacros: 'Sichtbare Makros',
      selectMacros: 'Makros auswählen',
      searchMacros: 'Makros suchen',
      selectAll: 'Alle auswählen',
      clearSelection: 'Auswahl leeren',
      macrosSelected: '{count} Makros ausgewählt',
      chooseMacros: 'Wähle die Makros aus, die auf dieser Karte angezeigt werden sollen.',
      obsConnection: 'OBS-Verbindung',
      localOnly: 'Nur lokal',
      noRotatingScenes: 'Es sind keine rotierenden Szenen konfiguriert.',
      outputs: 'Ausgänge',
      noOutput: 'Kein Ausgang verknüpft',
      noScenes: 'Für diese OBS-Verbindung sind keine Szenen verfügbar.',
      noInteractions: 'Aktuell sind keine Interaktionen in der Warteschlange.',
      interactionDuration: 'Dauer: {duration}',
      interactionEta: 'ETA: {duration}',
      interactionPleaseWait: 'Bitte warten…',
      interactionAlerts: '{count} Alert(s)',
      interactionCancel: 'Interaktion abbrechen',
      interactionQueued: 'Wartend',
      interactionActive: 'Aktiv',
      interactionFinished: 'Abgeschlossen',
      interactionCancelled: 'Abgebrochen',
      interactionFailed: 'Fehlgeschlagen',
      interactionCommand: 'Befehl',
      interactionEvent: 'Event',
      interactionChannelPoint: 'Kanalpunkt',
      interactionOther: 'Interaktion',
      customizeDashboard: 'Dashboard anpassen',
      customizeDashboardHint: 'Wähle sichtbare Bereiche und ihre Reihenfolge für diese Instanz.',
      editDashboard: 'Dashboard bearbeiten',
      finishEditing: 'Fertig',
      addCard: 'Karte hinzufügen',
      removeCard: 'Karte entfernen',
      moveCard: 'Karte verschieben',
      dragCardsHint: 'Ziehe Karten, um sie neu anzuordnen. Mit × kannst du Karten entfernen.',
      noDashboardCards: 'Keine Dashboard-Karten',
      noDashboardCardsHint: 'Füge eine Karte hinzu, um dieses Instanz-Dashboard aufzubauen.',
      resetDashboard: 'Layout zurücksetzen',
    },
    sections: {
      music: 'Musik', giveaway: 'Gewinnspiel', interactions: 'Interaktionen', auto_macros: 'Auto-Makros', macros: 'Makros', channel_points: 'Kanalpunkte', rotating_scene: 'Rotierende Szene', audio: 'Audio', obs: 'OBS', yolobox: 'Yolobox',
    },
    pairing: {
      title: 'StreamDing koppeln',
      description: 'Ein StreamDing möchte mit deinem Cloud-Account verbunden werden. Gib diese PIN im lokalen StreamDing-Panel ein, um die Kopplung abzuschließen.',
      instance: 'Instanz',
      account: 'Twitch-Account',
      pin: 'Kopplungs-PIN',
      waiting: 'Warte darauf, dass StreamDing die PIN bestätigt…',
      completed: 'StreamDing wurde erfolgreich gekoppelt.',
      expired: 'Die StreamDing-Kopplungsanfrage ist abgelaufen.',
      failed: 'Die StreamDing-Kopplung ist fehlgeschlagen.',
    },

    settings: {
      title: 'Einstellungen',
      subtitle: 'Verwalte deine persönlichen Einstellungen für das Remote-Admin-Panel.',
      languageTitle: 'Sprache',
      languageDescription: 'Wähle die Sprache des Remote-Admin-Panels. Die Einstellung wird in deinem Account gespeichert.',
      languageLabel: 'Panel-Sprache',
      languageEnglish: 'Englisch',
      languageGerman: 'Deutsch',
      saved: 'Einstellungen gespeichert.',
      loadError: 'Benutzereinstellungen konnten nicht geladen werden.',
      saveError: 'Benutzereinstellungen konnten nicht gespeichert werden.',
    },
    errors: {
      backend: 'Verbindung zum Remote-Admin-Backend konnte nicht hergestellt werden.',
    },
  },
}

const locale = ref<SupportedLocale>('en')

function normalizeLocale(value: unknown): SupportedLocale | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase().replace('_', '-')
  if (normalized === 'de' || normalized.startsWith('de-')) return 'de'
  if (normalized === 'en' || normalized.startsWith('en-')) return 'en'
  return null
}

export function browserLocale(): SupportedLocale {
  if (typeof navigator === 'undefined') return 'en'
  const candidates = [...(navigator.languages ?? []), navigator.language]
  for (const candidate of candidates) {
    const supported = normalizeLocale(candidate)
    if (supported) return supported
  }
  return 'en'
}

export function languageFromUser(user: any): SupportedLocale | null {
  return normalizeLocale(
    user?.settings?.language ??
    user?.user_settings?.language ??
    user?.language,
  )
}

export function setLocale(value: unknown) {
  locale.value = normalizeLocale(value) ?? 'en'
  if (typeof document !== 'undefined') document.documentElement.lang = locale.value
}

export function applyPreferredLocale(user?: any) {
  setLocale(languageFromUser(user) ?? browserLocale())
}

function lookup(path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object') return undefined
    return (current as Record<string, unknown>)[key]
  }, messages[locale.value])
}

export function t(path: string, params: Record<string, string | number> = {}): string {
  const translated = lookup(path)
  let value = typeof translated === 'string' ? translated : path
  for (const [key, replacement] of Object.entries(params)) {
    value = value.replaceAll(`{${key}}`, String(replacement))
  }
  return value
}

export function formatDateTime(value: string | number | Date): string {
  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(value))
}

export function useI18n() {
  return {
    locale: readonly(locale),
    t,
    formatDateTime,
  }
}

applyPreferredLocale()
