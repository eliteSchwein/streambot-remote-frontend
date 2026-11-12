// Helpers to connect OBS scene items with the OBS audio input data.
// Scene items carry the input UUID as `sourceUuid`/`uuid`, audio entries use
// `inputUuid`, so both can be matched directly.

export type ObsAudioInput = {
  uuid: string
  name: string
  kind: string
  volume: number
  volumeMul: number
  muted: boolean
  balance: number | null
  step: number
}

export function normalizeObsAudioInput(value: any, key = ''): ObsAudioInput {
  const step = Number(value?.steps_range ?? value?.step_range ?? 1)
  return {
    uuid: String(value?.inputUuid ?? value?.uuid ?? key),
    name: String(value?.inputName ?? value?.name ?? key),
    kind: String(value?.inputKind ?? ''),
    volume: Number(value?.volume?.inputVolumeDb ?? value?.inputVolumeDb ?? value?.volumeDb ?? -100),
    volumeMul: Number(value?.volume?.inputVolumeMul ?? value?.inputVolumeMul),
    muted: Boolean(value?.inputMuted ?? value?.muted),
    balance: value?.inputAudioBalance == null && value?.balance == null
      ? null
      : Number(value?.inputAudioBalance ?? value?.balance),
    step: Number.isFinite(step) && step > 0 ? step : 1,
  }
}

/** Raw audio entries of a connection, each tagged with its normalized uuid. */
export function getAudioDevices(audio: any): any[] {
  // Removed inputs arrive as `null` in cloud deltas; skip them.
  return Object.entries(audio ?? {}).filter(([, value]) => value && typeof value === 'object').map(([key, value]: any) => ({
    ...value,
    inputUuid: String(value?.inputUuid ?? value?.uuid ?? key),
    inputName: String(value?.inputName ?? value?.name ?? key),
  }))
}

export function findAudioDevice(devices: any[], source: any): any | undefined {
  if (!source || source.isGroup) return undefined

  const uuid = String(source.sourceUuid ?? source.inputUuid ?? source.uuid ?? '')
  if (uuid) {
    const byUuid = devices.find(device => device.inputUuid === uuid)
    if (byUuid) return byUuid
  }

  const name = String(source.sourceName ?? source.inputName ?? source.name ?? '')
  return name ? devices.find(device => device.inputName === name) : undefined
}

/**
 * Audio inputs that are not part of any scene, e.g. OBS's global
 * "Desktop Audio" / "Mic/Aux" devices.
 */
export function getGlobalAudioDevices(devices: any[], scenes: any): any[] {
  const uuids = new Set<string>()
  const names = new Set<string>()

  const visitItem = (item: any) => {
    if (!item) return
    const uuid = item.sourceUuid ?? item.inputUuid ?? item.uuid
    const name = item.sourceName ?? item.inputName ?? item.name
    if (uuid) uuids.add(String(uuid))
    if (name) names.add(String(name))
    if (Array.isArray(item.children)) item.children.forEach(visitItem)
  }
  const visitScene = (scene: any) => {
    const items = scene?.items ?? scene?.sources ?? scene?.sceneItems
    if (Array.isArray(items)) items.forEach(visitItem)
    if (Array.isArray(scene?.scenes)) scene.scenes.forEach(visitScene)
  }
  if (Array.isArray(scenes)) scenes.forEach(visitScene)

  return devices
    .filter(device => !uuids.has(device.inputUuid) && !names.has(device.inputName))
    .sort((a, b) => a.inputName.localeCompare(b.inputName))
}
