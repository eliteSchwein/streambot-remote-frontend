// Boot progress (notify_bootup_stage) of a local Streambot backend.

export type BootupState = {
  stage?: string
  ready?: boolean
  step?: number
  total?: number
}

export function isBooting(bootup: BootupState | null | undefined): boolean {
  return Boolean(bootup) && bootup?.ready === false
}

export function bootupPercent(bootup: BootupState | null | undefined): number {
  const step = Math.max(0, Number(bootup?.step ?? 0))
  const total = Math.max(0, Number(bootup?.total ?? 0))
  return total > 0 ? Math.min(100, (100 / total) * step) : 0
}

/** Translated stage name, falling back to a readable version of the id. */
export function bootupStageLabel(t: (key: string) => string, bootup: BootupState | null | undefined): string {
  const stage = String(bootup?.stage ?? 'unknown').trim() || 'unknown'
  const key = `instance.bootup.stages.${stage}`
  const label = String(t(key))
  if (label && label !== key) return label
  return stage.replace(/[_-]+/g, ' ').replace(/^\w/, c => c.toUpperCase())
}
