const isLocalFrontend = () => {
  if (typeof window === 'undefined') return false
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
}

export function backendHttpOrigin(): string {
  if (typeof window === 'undefined') return ''
  return isLocalFrontend() ? 'http://localhost:8080' : window.location.origin
}

export function backendWsOrigin(): string {
  if (typeof window === 'undefined') return ''
  if (isLocalFrontend()) return 'ws://localhost:8080'

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}`
}

export function backendUrl(path: string): string {
  if (!path.startsWith('/')) path = `/${path}`
  return `${backendHttpOrigin()}${path}`
}

export function backendWsUrl(path: string): string {
  if (!path.startsWith('/')) path = `/${path}`
  return `${backendWsOrigin()}${path}`
}
