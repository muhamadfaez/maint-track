import { ApiResponse } from "../../shared/types"

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method || 'GET').toUpperCase()
  const headers = new Headers(init?.headers)
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    if (!headers.has('X-MTrack-Queueable')) headers.set('X-MTrack-Queueable', 'true')
    if (!headers.has('X-MTrack-Operation-Id')) {
      headers.set('X-MTrack-Operation-Id', crypto.randomUUID())
    }
  }

  let res: Response
  try {
    res = await fetch(path, { ...init, method, headers })
  } catch (error) {
    if (!navigator.onLine) {
      throw new Error('You are offline. Reopen MTrack once online to finish this request.')
    }
    throw error
  }
  const json = (await res.json()) as ApiResponse<T>
  if (!res.ok || !json.success || json.data === undefined) throw new Error(json.error || 'Request failed')

  const data = json.data as T & { queued?: boolean; operationId?: string }
  if (data && typeof data === 'object' && data.queued) {
    window.dispatchEvent(new CustomEvent('mtrack:mutation-queued', { detail: data }))
  }

  return json.data
}
